import { firebaseConfig } from './firebase-config.js';

const LOCAL_KEY = 'x_board_local_data_v4';
const SDK = 'https://www.gstatic.com/firebasejs/13.1.0/';
const ensureTypeTags = data => BoardSecurity.normalizeData(data);

window.normalizeAppData = ensureTypeTags;
window.appState = {
    user: null,
    isCloud: false,
    searchQuery: "",
    selectedTags: [],  // 複数タグフィルター
    selectedPostIds: [],
    isSearchExpanded: false,
    isFilterExpanded: false,
    isEditing: false,
    draggedPostId: null,
    draggedBoardId: null,
    pendingAction: null, // 確認モーダル用の保留アクション
    exportingBoardId: null, // 書き出し用
    appData: {
        activeBoardId: null,
        boards: [],
        folders: []
    }
};


const clone = data => JSON.parse(JSON.stringify(data));
const emptyData = () => {
    const id = Date.now().toString();
    return { activeBoardId: id, boards: [{ id, name: 'デフォルト', posts: [], folderId: null }], folders: [] };
};
function readLocal() {
    const saved = localStorage.getItem(LOCAL_KEY);
    if (!saved) return emptyData();
    const data = JSON.parse(saved);
    if (!data || !Array.isArray(data.boards)) throw new Error('バックアップの形式を確認してください');
    return ensureTypeTags(data);
}
let auth, db, authSDK, storeSDK, unsubscribe;
let revision = 0, ready = false, blocked = false, pending = 0, queue = Promise.resolve();
let generation = 0, deferredSnapshot = null;
function applyDeferred() {
    if (!deferredSnapshot || pending || blocked || window.appState.isEditing) return;
    const snapshot = deferredSnapshot;
    deferredSnapshot = null;
    if ((snapshot.exists() ? snapshot.data().revision : 0) > revision) accept(snapshot);
}
const el = id => document.getElementById(id);
function status(message) { el('syncStatus').textContent = message; }
function lock(locked) {
    document.querySelectorAll('[data-edit-area]').forEach(node => { node.inert = locked; });
}
function render() {
    window.appState.selectedPostIds = [];
    window.appState.isEditing = false;
    window.renderSidebar();
    window.renderActiveBoard();
}
function backupKey() { return `bookmark-boards-draft-${window.appState.user.uid}`; }
function fail(error) {
    blocked = true;
    lock(true);
    status(`同期できません。端末のバックアップを保存してから再読込してください。(${error.code || error.message})`);
    el('reloadCloud').hidden = false;
}
function accept(snapshot) {
    const payload = snapshot.exists() ? snapshot.data() : null;
    revision = payload?.revision || 0;
    window.appState.appData = payload ? ensureTypeTags(clone(payload.data)) : emptyData();
    ready = true;
    blocked = false;
    lock(false);
    render();
    el('reloadCloud').hidden = true;
    el('uploadLocal').hidden = false;
    status(`同期済み：${window.appState.user.email || 'Googleアカウント'}`);
}
function cloudRef() {
    return storeSDK.doc(db, 'users', window.appState.user.uid, 'settings', 'appData');
}

window.saveData = async (newData, silent = false) => {
    newData = ensureTypeTags(clone(newData));
    if (window.appState.isCloud && (!ready || blocked)) throw new Error('同期を再開してから編集してください');
    window.appState.appData = newData;
    if (!window.appState.isCloud) {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(newData));
        if (!silent) render();
        return;
    }
    // Keep the latest draft separately from the local-only data, including failed saves.
    const draftKey = backupKey();
    const draft = JSON.stringify(newData);
    try { localStorage.setItem(draftKey, draft); }
    catch (error) { fail(error); throw error; }
    const ref = cloudRef();
    const session = generation;
    pending++;
    status('同期中…');
    const operation = queue.then(async () => {
        if (blocked || session !== generation) throw new Error('同期を再読込してください');
        const expected = revision;
        await storeSDK.runTransaction(db, async transaction => {
            const current = await transaction.get(ref);
            const remoteRevision = current.exists() ? current.data().revision : 0;
            if (remoteRevision !== expected) {
                const error = new Error('別の端末で変更されています');
                error.code = 'sync/conflict';
                throw error;
            }
            transaction.set(ref, { revision: expected + 1, data: newData });
        });
        revision = expected + 1;
        if (localStorage.getItem(draftKey) === draft) localStorage.removeItem(draftKey);
    });
    queue = operation.catch(() => {});
    try {
        await operation;
        if (!silent) render();
    } catch (error) {
        fail(error);
        throw error;
    } finally {
        pending--;
        if (!pending && !blocked) { status('同期済み'); applyDeferred(); }
    }
};

async function startCloud() {
    const [appSDK, a, s] = await Promise.all([
        import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js')
    ]);
    authSDK = a;
    storeSDK = s;
    const app = appSDK.initializeApp(firebaseConfig);
    auth = a.getAuth(app);
    db = s.getFirestore(app);
    await a.getRedirectResult(auth);
    a.onAuthStateChanged(auth, user => {
        generation++;
        deferredSnapshot = null;
        unsubscribe?.();
        ready = false;
        blocked = false;
        el('uploadLocal').hidden = true;
        el('reloadCloud').hidden = true;
        el('backupDraft').hidden = !user;
        el('signIn').hidden = !!user;
        el('signOut').hidden = !user;
        window.appState.user = user;
        window.appState.isCloud = !!user;
        window.closeModal();
        // Never show another account's boards while authentication is changing.
        window.appState.appData = user ? emptyData() : readLocal();
        render();
        lock(!!user);
        if (!user) { status('端末内に保存中。ログインすると同期できます'); return; }
        status('クラウドから読み込み中…');
        const session = generation;
        unsubscribe = s.onSnapshot(cloudRef(), { includeMetadataChanges: true }, snapshot => {
            if (session !== generation || blocked || snapshot.metadata.fromCache) return;
            // Preserve incoming changes while a save or a text edit is in progress.
            if (pending || window.appState.isEditing) { deferredSnapshot = snapshot; return; }
            try { accept(snapshot); } catch (error) { fail(error); }
        }, error => { if (session === generation) fail(error); });
    });
}

async function initApp() {
    document.addEventListener('focusout', () => setTimeout(applyDeferred, 0));
    el('signIn').addEventListener('click', async () => {
        try {
            // Redirect starts directly from a user gesture and works on narrow mobile browsers.
            await authSDK.signInWithRedirect(auth, new authSDK.GoogleAuthProvider());
        } catch (error) { status(`ログインできません (${error.code || error.message})`); }
    });
    el('signOut').addEventListener('click', async () => {
        if (pending) { status('保存が終わってからログアウトしてください'); return; }
        const key = window.appState.user ? backupKey() : null;
        if (blocked && key && localStorage.getItem(key) && !window.confirm('未送信の編集を破棄してログアウトしますか？')) return;
        try { await authSDK.signOut(auth); if (key) localStorage.removeItem(key); } catch (error) { status(`ログアウトできません (${error.code || error.message})`); }
    });
    el('uploadLocal').addEventListener('click', async () => {
        if (!window.confirm('端末内データでクラウドの全データを置き換えます。先に両方を書き出してバックアップしてください。続けますか？')) return;
        try { await window.saveData(readLocal()); } catch { /* Persistent status explains recovery. */ }
    });
    el('reloadCloud').addEventListener('click', async () => {
        if (pending) return;
        try { accept(await storeSDK.getDocFromServer(cloudRef())); }
        catch (error) { fail(error); }
    });
    el('backupDraft').addEventListener('click', () => {
        const data = localStorage.getItem(backupKey());
        if (!data) { status('このアカウントの未送信バックアップはありません'); return; }
        const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
        const link = document.createElement('a'); link.href = url; link.download = 'bookmark-boards-draft.json'; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    window.addEventListener('unhandledrejection', event => {
        if (blocked) { event.preventDefault(); window.showToast('保存できません。同期状態を確認してください'); }
    });
    window.addEventListener('beforeunload', event => { if (pending) { event.preventDefault(); event.returnValue = ''; } });
    try {
        window.appState.appData = readLocal();
        render();
        if (firebaseConfig) {
            lock(true);
            status('ログイン状態を確認中…');
            await startCloud();
        } else status('端末内に保存中（同期は未設定）');
    } catch (error) {
        lock(true);
        status(`起動できません。設定またはバックアップを確認してください。(${error.code || error.message})`);
    }
}
window.addEventListener('DOMContentLoaded', initApp);
