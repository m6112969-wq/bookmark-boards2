import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

let browser, server, origin;
before(async () => {
    const config = JSON.parse(await readFile(new URL('../firebase.json', import.meta.url)));
    const csp = config.hosting.headers.find(rule=>rule.source === '/').headers.find(header=>header.key === 'Content-Security-Policy').value;
    server = createServer(async (req, res) => {
        try {
            const path = new URL(req.url, 'http://local').pathname;
            if (path === '/' || path === '/index.html') res.setHeader('Content-Security-Policy', csp);
            if (path.includes('..')) throw new Error('Invalid path');
            const data = await readFile(new URL('../' + (path === '/' ? 'index.html' : path.slice(1)), import.meta.url));
            res.setHeader('Content-Type', path.endsWith('.js') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : 'text/html');
            res.end(data);
        } catch { res.writeHead(404).end(); }
    }).listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    origin = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
});
after(async () => { await browser?.close(); await new Promise(resolve => server?.close(resolve)); });

async function pageSetup(cloud = false, width = 390) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: width < 768, isMobile: width < 768 });
    await context.route('**/*', async route => {
        if (route.request().url().startsWith(origin)) return route.continue();
        return route.abort();
    });
    await context.route('**/firebase-config.js', route => route.fulfill({ contentType: 'text/javascript', body: cloud ? 'export const firebaseConfig = { projectId: "test" };' : 'export const firebaseConfig = null;' }));
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    return { context, page };
}
const data = title => ({ activeBoardId: 'b', boards: [{ id: 'b', name: title, posts: [] }], folders: [] });

test('local-only mode starts without Firebase SDK and persists edits after reload', async () => {
    const { context, page } = await pageSetup();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    await page.waitForFunction(() => window.appState?.appData.boards.length);
    await page.evaluate(value => window.saveData(value), data('端末のボード'));
    await page.reload();
    await page.waitForFunction(() => document.getElementById('activeBoardTitle').textContent === '端末のボード');
    assert.match(await page.locator('#syncStatus').textContent(), /端末内/);
    assert.deepEqual(errors, []);
    await context.close();
});

test('two signed-in devices sync; conflicts and failed writes preserve drafts; logout isolates local data', async () => {
    let remote = null, denied = false;
    const clients = [];
    const snapshot = value => `({ exists: () => ${!!value}, data: () => ${JSON.stringify(value)}, metadata: { fromCache: false } })`;
    const sdk = {
        'firebase-app.js': 'export const initializeApp = x => x;',
        'firebase-auth.js': `export const getAuth = () => ({}); export const getRedirectResult = async () => null;
            export const onAuthStateChanged = (auth, fn) => { window.authListener = fn; fn({uid:'owner',email:'owner@example.test'}); };
            export class GoogleAuthProvider {};
            export const signInWithRedirect = async () => {};
            export const signOut = async () => window.authListener(null);`,
        'firebase-firestore.js': `export const getFirestore = () => ({}); export const doc = (...args) => args;
            const snap = value => ({ exists: () => value !== null, data: () => value, metadata: {fromCache:false} });
            export const onSnapshot = (ref, options, fn) => { window.receiveSnapshot = value => fn(snap(value)); window.__read().then(window.receiveSnapshot); return () => { window.receiveSnapshot = () => {}; }; };
            export const getDocFromServer = async () => snap(await window.__read());
            export const runTransaction = async (db, fn) => {
                for (let i=0; i<5; i++) {
                    let value, previous;
                    await fn({get: async () => {previous = await window.__read(); return snap(previous);}, set: (ref, next) => {value=next;}});
                    if (await window.__commit(previous?.revision || 0, value)) return;
                }
                throw new Error('retry exhausted');
            };`
    };
    for (let i = 0; i < 2; i++) {
        const client = await pageSetup(true);
        const { page, context } = client;
        await context.route('https://www.gstatic.com/firebasejs/**', route => route.fulfill({ contentType: 'text/javascript', body: sdk[route.request().url().split('/').at(-1)] }));
        await page.exposeFunction('__read', () => remote);
        await page.exposeFunction('__commit', (expected, next) => {
            if (denied) throw new Error('permission-denied');
            if ((remote?.revision || 0) !== expected) return false;
            remote = next;
            setTimeout(() => { for (const c of clients) c.page.evaluate(value => window.receiveSnapshot?.(value), remote).catch(() => {}); }, 15);
            return true;
        });
        await page.addInitScript(() => localStorage.setItem('x_board_local_data_v4', JSON.stringify({ activeBoardId: 'local', boards: [{id:'local',name:'ローカル専用',posts:[]}], folders: [] })));
        clients.push(client);
        await page.goto(origin);
        await page.waitForFunction(() => document.getElementById('syncStatus').textContent.includes('同期済み'));
    }
    const [a, b] = clients.map(c => c.page);
    assert.equal(remote, null, 'local data must never upload automatically');
    await a.evaluate(value => window.saveData(value), data('端末Aの変更'));
    assert.equal(await a.evaluate(()=>localStorage.getItem('bookmark-boards-draft-owner')),null);
    await b.waitForFunction(() => window.appState.appData.boards[0].name === '端末Aの変更');
    await b.evaluate(() => { window.appState.isEditing = true; });
    await a.evaluate(value => window.saveData(value), data('端末Aの次の変更'));
    await new Promise(resolve => setTimeout(resolve, 100));
    const error = await b.evaluate(async value => { try { await window.saveData(value); } catch (e) { return e.code; } }, data('端末Bの競合する変更'));
    assert.equal(error, 'sync/conflict');
    assert.equal(remote.data.boards[0].name, '端末Aの次の変更');
    assert.match(await b.evaluate(() => localStorage.getItem('bookmark-boards-draft-owner')), /端末Bの競合する変更/);
    await b.locator('#sidebarToggle').click();
    await b.locator('#reloadCloud').click();
    await b.waitForFunction(() => window.appState.appData.boards[0].name === '端末Aの次の変更');
    await b.evaluate(value => window.saveData(value), data('競合解決後'));
    await a.waitForFunction(() => window.appState.appData.boards[0].name === '競合解決後');
    await a.evaluate(async () => {
        const first = structuredClone(window.appState.appData); first.boards[0].name = '連続1';
        const second = structuredClone(first); second.boards[0].name = '連続2';
        await Promise.all([window.saveData(first), window.saveData(second)]);
    });
    assert.equal(remote.data.boards[0].name, '連続2');
    denied = true;
    await a.evaluate(async value => { try { await window.saveData(value); } catch {} }, data('未送信'));
    assert.match(await a.locator('#syncStatus').textContent(), /同期できません/);
    assert.equal(await a.locator('#syncSummary').textContent(), '同期エラー');
    assert.match(await a.locator('#syncSummary').getAttribute('title'), /同期できません/);
    assert.match(await a.evaluate(() => localStorage.getItem('bookmark-boards-draft-owner')), /未送信/);
    assert.equal(remote.data.boards[0].name, '連続2');
    await a.locator('#sidebarToggle').click();
    a.once('dialog', dialog=>dialog.accept());
    await a.locator('#signOut').click();
    await a.waitForFunction(() => !window.appState.user);
    assert.equal(await a.evaluate(() => window.appState.appData.boards[0].name), 'ローカル専用');
    assert.equal(await a.locator('#backupDraft').isHidden(), true);
    assert.equal(await a.evaluate(()=>localStorage.getItem('bookmark-boards-draft-owner')),null);
    for (const c of clients) await c.context.close();
});


const mobileData = {
    activeBoardId: 'a', folders: [],
    boards: [
        { id: 'a', name: '長い名前のボードでもスマホで表示が崩れないことを確認する', posts: [
            {id:'note1',type:'note',title:'最初のメモ',body:'編集中の内容',tags:['旅行']},
            {id:'note2',type:'note',title:'次のメモ',body:'二枚目',tags:[]},
            {id:'video',type:'youtube',youtubeId:'dQw4w9WgXcQ',url:'https://youtu.be/dQw4w9WgXcQ',memo:'動画のメモ',tags:['youtube']}
        ] },
        { id: 'b', name: '複製先', posts: [] }
    ]
};
async function seed(page) {
    await page.goto(origin);
    await page.waitForFunction(() => window.appState?.appData.boards.length);
    await page.evaluate(value => window.saveData(value), mobileData);
}
for (const width of [320, 390, 768, 1280]) {
    test(`layout fits ${width}px and mobile navigation can be opened and dismissed`, async () => {
        const {context, page} = await pageSetup(false, width);
        await seed(page);
        if (width === 390 || width === 1280) await page.screenshot({path:`/tmp/bookmark-layout-${width}.png`,fullPage:true});
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        if (width < 768) {
            assert.equal(await page.locator('#sidebar').getAttribute('inert'), '');
            await page.locator('#sidebarToggle').click();
            assert.equal(await page.locator('#sidebarToggle').getAttribute('aria-expanded'), 'true');
            await page.getByRole('button', {name:'新規ボード',exact:true}).click();
            await page.locator('#newBoardName').fill('スマホから作成');
            await page.locator('#newBoardName').press('Enter');
            await page.waitForFunction(() => window.appState.appData.boards.some(b => b.name === 'スマホから作成'));
            await page.locator('#modal-container').waitFor({state:'hidden'});
            await page.keyboard.press('Escape');
            await page.waitForFunction(() => document.getElementById('sidebar').classList.contains('closed'));
            assert.equal(await page.locator('#sidebarToggle').evaluate(el => el === document.activeElement), true);
            await page.locator('#sidebarToggle').click();
            await page.locator('#sidebarBackdrop').click({position:{x:width-8,y:500}});
            await page.locator('#sidebarToggle').click();
            await page.getByRole('button',{name:'ボード：'+mobileData.boards[0].name,exact:true}).click();
            await page.locator('#searchToggle').click();
            await page.locator('#searchInput').fill('見つからない検索');
            await page.waitForTimeout(350);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
            assert.match(await page.locator('#emptyState').textContent(), /見つかりません/);
            const inputSize = await page.locator('#urlInput').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
            assert.ok(inputSize >= 16);
            for (const selector of ['#sidebarToggle','#filterToggleBtn','.save-btn','.add-note-btn']) {
                const bounds = await page.locator(selector).boundingBox();
                assert.ok(bounds.height >= 44, selector + ' needs a usable touch height');
            }
        }
        await context.close();
    });
}

test('touch editing survives keyboard and rotation without extra card buttons', async () => {
    const {context,page} = await pageSetup(false,390);
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await seed(page);
    assert.equal(await page.getByRole('button',{name:'移動・複製',exact:true}).count(),0);
    assert.equal(await page.getByRole('button',{name:'入力完了',exact:true}).count(),0);
    await page.locator('#note-body-note1').fill('スマホで入力した内容');
    await page.setViewportSize({width:390,height:430});
    await page.waitForTimeout(180);
    assert.equal(await page.locator('#note-body-note1').inputValue(),'スマホで入力した内容');
    assert.equal(await page.locator('#note-body-note1').evaluate(el=>el===document.activeElement),true);
    await page.setViewportSize({width:900,height:430});
    await page.waitForTimeout(180);
    assert.equal(await page.locator('#note-body-note1').inputValue(),'スマホで入力した内容');
    await page.locator('#activeBoardTitle').click();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('x_board_local_data_v4')).boards[0].posts[0].body==='スマホで入力した内容');
    await page.reload();
    await page.waitForFunction(()=>window.appState?.appData.boards.length===2);
    assert.equal(await page.locator('#note-body-note1').inputValue(),'スマホで入力した内容');
    assert.deepEqual(errors,[]);
    await context.close();
});

for (const width of [320, 390, 1280]) {
    test(`sidebar close button works repeatedly at ${width}px`, async () => {
        const {context,page} = await pageSetup(false,width);
        await seed(page);
        const open = () => page.locator('#sidebarToggle').getAttribute('aria-expanded');
        const press = locator => width < 768 ? locator.tap() : locator.click();
        // Desktop starts open; mobile starts closed.
        if (await open() === 'true') await press(page.locator('#sidebarClose'));
        for (let attempt=0;attempt<3;attempt++) {
            await press(page.locator('#sidebarToggle'));
            assert.equal(await open(),'true');
            await press(page.locator('#sidebarClose'));
            assert.equal(await open(),'false');
            assert.equal(await page.locator('#sidebar').evaluate(el=>el.inert),true);
            assert.equal(await page.locator('#main-container').evaluate(el=>el.inert),false);
            await page.getByRole('button',{name:'メモを追加',exact:true}).click();
            await page.waitForFunction(n=>window.appState.appData.boards[0].posts.length===n,4+attempt);
        }
        await context.close();
    });
}

for (const width of [320, 390]) {
    test(`mobile drawer closes with outside tap or left swipe at ${width}px`, async () => {
        const {context,page} = await pageSetup(false,width);
        await seed(page);
        await page.locator('#sidebarToggle').tap();
        const bounds=await page.locator('#sidebar').boundingBox();
        assert.ok(width-bounds.width>=64,'outside dismissal area must be at least 64px');
        await page.locator('#sidebarBackdrop').tap({position:{x:width-32,y:400}});
        assert.equal(await page.locator('#sidebarToggle').getAttribute('aria-expanded'),'false');
        await page.locator('#sidebarToggle').tap();
        await page.locator('#sidebar').evaluate(el=>Promise.all(el.getAnimations().map(animation=>animation.finished)));
        const cdp=await context.newCDPSession(page);
        async function swipe(from,to) {
            await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from.x,y:from.y}]});
            for(let i=1;i<=6;i++) {
                await page.waitForTimeout(30);
                await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+(to.x-from.x)*i/6,y:from.y+(to.y-from.y)*i/6}]});
            }
            await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
            await page.waitForTimeout(350);
        }
        await swipe({x:180,y:550},{x:170,y:420});
        assert.equal(await page.locator('#sidebarToggle').getAttribute('aria-expanded'),'true','vertical scroll must not dismiss the panel');
        await swipe({x:200,y:500},{x:70,y:495});
        await page.waitForFunction(()=>document.getElementById('sidebar').classList.contains('closed'));
        assert.equal(await page.locator('#sidebarToggle').getAttribute('aria-expanded'),'false');
        assert.equal(await page.locator('#main-container').evaluate(el=>el.inert),false);
        await page.locator('#sidebar').evaluate(el=>Promise.all(el.getAnimations().map(animation=>animation.finished)));
        await page.getByRole('button',{name:'メモを追加',exact:true}).tap();
        await page.waitForFunction(()=>window.appState.appData.boards[0].posts.length===4);
        await cdp.detach();
        await context.close();
    });
}

test('desktop Escape dismisses a nested dialog first and then the sidebar', async()=>{
    const {context,page}=await pageSetup(false,1280);
    await seed(page);
    await page.getByRole('button',{name:'新規ボード',exact:true}).click();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#modal-container').isHidden(),true);
    assert.equal(await page.locator('#sidebarToggle').getAttribute('aria-expanded'),'true');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#sidebarToggle').getAttribute('aria-expanded'),'false');
    await context.close();
});

for (const width of [390,1280]) {
    test(`card memo/tag panel opens and closes without losing edits at ${width}px`, async()=>{
        const {context,page}=await pageSetup(false,width);
        const errors=[];page.on('pageerror',error=>errors.push(error.message));
        await seed(page);
        const card=page.locator('[data-id="video"]');
        const panel=card.locator('details.card-info-panel');
        const summary=panel.locator('summary');
        const memo=panel.locator('.memo-textarea');
        const press=locator=>width<768?locator.tap():locator.click();
        assert.equal(await memo.isVisible(),false,'panel starts collapsed');
        await press(summary);
        assert.equal(await memo.isVisible(),true);
        await memo.fill('閉じても残るメモ');
        await press(panel.getByRole('button',{name:'パネルを閉じる',exact:true}));
        assert.equal(await memo.isVisible(),false);
        await page.waitForFunction(()=>window.appState.appData.boards[0].posts.find(p=>p.id==='video').memo==='閉じても残るメモ');
        // The pointer remains on the card: hover/focus must not force the panel open.
        assert.equal(await panel.evaluate(el=>el.open),false);
        await press(summary);
        assert.equal(await memo.inputValue(),'閉じても残るメモ');
        await press(summary);
        assert.equal(await memo.isVisible(),false);
        await press(summary);
        await memo.focus();
        await memo.fill('Escでも保存');
        await page.keyboard.press('Escape');
        assert.equal(await memo.isVisible(),false);
        await page.reload();
        await page.waitForFunction(()=>window.appState?.appData.boards.length===2);
        await press(summary);
        assert.equal(await memo.inputValue(),'Escでも保存');
        // X cards use the same disclosure, independent of their external embed.
        await page.evaluate(()=>{
            const board=window.appState.appData.boards[0];
            board.posts.push({id:'tweet-panel',type:'tweet',tweetId:'123456789',url:'https://x.com/i/status/123456789',memo:'Xのメモ',tags:['x']});
            window.renderActiveBoard();
        });
        const tweet=page.locator('[data-id="tweet-panel"]');
        await press(tweet.locator('summary'));
        assert.equal(await tweet.locator('.memo-textarea').isVisible(),true);
        await press(tweet.getByRole('button',{name:'パネルを閉じる',exact:true}));
        assert.equal(await tweet.locator('.memo-textarea').isVisible(),false);
        assert.deepEqual(errors,[]);
        await context.close();
    });
}

test('compact search shows counts and clears empty results in one tap',async()=>{
    const {context,page}=await pageSetup(false,390);
    await seed(page);
    assert.equal(await page.locator('#boardCount').textContent(),'3');
    assert.equal(await page.locator('#syncSummary').textContent(),'端末内');
    await page.locator('#searchInput').fill('二枚目');
    assert.equal(await page.locator('#boardCount').textContent(),'1 / 3');
    await page.locator('#clearSearch').tap();
    assert.equal(await page.locator('#boardCount').textContent(),'3');
    await page.locator('#searchInput').fill('存在しないメモ');
    await page.getByRole('button',{name:'絞り込みを解除',exact:true}).tap();
    assert.equal(await page.locator('#searchInput').inputValue(),'');
    assert.equal(await page.locator('#boardCount').textContent(),'3');
    await page.locator('#filterToggleBtn').tap();
    await page.locator('#tagFilterList').getByRole('button',{name:/旅行/}).tap();
    assert.equal(await page.locator('#boardCount').textContent(),'1 / 3');
    assert.ok((await page.locator('#filterToggleBtn').getAttribute('class')).includes('has-filters'));
    await context.close();
});

test('CSP blocks injected scripts; hostile text stays text; invalid imports preserve existing data',async()=>{
    const {context,page}=await pageSetup(false,390);
    await seed(page);
    const hostile=`'");window.compromised=true;//<img src=x onerror="window.compromised=true">`;
    await page.evaluate(async name=>{
        const data=structuredClone(window.appState.appData);
        data.boards[0].name=name;data.boards[0].posts[0].title=name;data.boards[0].posts[0].tags=[name];
        await window.saveData(data);
        const script=document.createElement('script');script.textContent='window.compromised=true';document.body.append(script);
    },hostile);
    assert.equal(await page.evaluate(()=>window.compromised),undefined);
    assert.equal(await page.locator('#note-title-note1').inputValue(),hostile);
    await page.locator('[data-id="note1"] .tag-remove').tap();
    assert.equal(await page.evaluate(()=>window.compromised),undefined);
    await page.locator('#sidebarToggle').tap();
    await page.locator('.sidebar-item').first().getByRole('button',{name:'名前を変更',exact:true}).click();
    assert.equal(await page.locator('#renameInput').inputValue(),hostile);
    await page.keyboard.press('Escape');
    const existing=await page.evaluate(()=>JSON.stringify(window.appState.appData));
    const malicious={activeBoardId:'b',folders:[],boards:[{id:'b',name:'unsafe',posts:[{id:'bad',type:'youtube',url:'javascript:alert(1)',youtubeId:'dQw4w9WgXcQ',tags:[]}]}]};
    await page.locator('#importFile').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(malicious))});
    await page.waitForFunction(()=>document.getElementById('toast').textContent.includes('正しいURL'));
    assert.equal(await page.evaluate(()=>JSON.stringify(window.appState.appData)),existing);
    await page.locator('#importFile').setInputFiles({name:'large.json',mimeType:'application/json',buffer:Buffer.alloc(1024*1024+1,32)});
    await page.waitForFunction(()=>document.getElementById('toast').textContent.includes('1MiB'));
    assert.equal(await page.evaluate(()=>JSON.stringify(window.appState.appData)),existing);
    assert.equal(await page.locator('[onclick], [onerror], [oninput], [onblur], [onfocus], [onkeydown]').count(),0);
    await context.close();
});

for (const width of [390,1280]) {
    test(`search remains visible and keeps input focus without a green ring at ${width}px`,async()=>{
        const {context,page}=await pageSetup(false,width);
        await seed(page);
        const input=page.locator('#searchInput');
        assert.equal(await input.isVisible(),true);
        await page.locator('#searchToggle').click();
        await page.mouse.move(5,5);
        assert.equal(await input.evaluate(el=>el===document.activeElement),true);
        assert.equal(await input.isVisible(),true);
        await input.fill('二枚目');
        await page.locator('#searchToggle').click();
        assert.equal(await input.inputValue(),'二枚目');
        assert.equal(await input.isVisible(),true);
        assert.equal(await page.locator('#boardCount').textContent(),'1 / 3');
        const style=await input.evaluate(el=>({outline:getComputedStyle(el).outlineStyle,shadow:getComputedStyle(el).boxShadow}));
        assert.equal(style.outline,'none');assert.equal(style.shadow,'none');
        await page.keyboard.press('Escape');
        assert.equal(await input.inputValue(),'');
        assert.equal(await page.locator('#boardCount').textContent(),'3');
        assert.equal(await input.evaluate(el=>el===document.activeElement),true);
        await input.fill('　 二枚目  ');
        assert.equal(await page.locator('#boardCount').textContent(),'1 / 3');
        await page.locator('#clearSearch').click();
        assert.equal(await input.inputValue(),'');
        assert.equal(await input.evaluate(el=>el===document.activeElement),true);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        await context.close();
    });
}

for (const width of [390,1280]) {
test(`Japanese IME composition filters only after commit at ${width}px`,async()=>{
    const {context,page}=await pageSetup(false,width);
    await seed(page);
    await page.locator('#searchInput').focus();
    await page.evaluate(()=>{
        const input=document.getElementById('searchInput');
        input.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));
        input.value='にま';
        input.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true}));
        input.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,isComposing:true}));
    });
    assert.equal(await page.locator('#boardCount').textContent(),'3');
    if(width===1280) assert.equal(await page.locator('#sidebarToggle').getAttribute('aria-expanded'),'true');
    await page.evaluate(()=>{
        const input=document.getElementById('searchInput');
        input.value='二枚目';
        input.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'二枚目'}));
    });
    assert.equal(await page.locator('#boardCount').textContent(),'1 / 3');
    assert.equal(await page.locator('#searchInput').inputValue(),'二枚目');
    assert.equal(await page.locator('#searchInput').evaluate(el=>el===document.activeElement),true);
    await context.close();
});

}

test('switching Google accounts uses separate UID paths and does not show the previous account data',async()=>{
    const {context,page}=await pageSetup(true,390);
    const documents=new Map();
    await page.exposeFunction('__readUser',uid=>documents.get(uid)||null);
    await page.exposeFunction('__writeUser',(uid,value)=>{documents.set(uid,value);});
    const sdk={
        'firebase-app.js':'export const initializeApp=x=>x;',
        'firebase-auth.js':`export const getAuth=()=>({});export const getRedirectResult=async()=>null;
            export const onAuthStateChanged=(auth,fn)=>{window.authListener=fn;fn({uid:'alice',email:'alice@example.test'});};
            export class GoogleAuthProvider{};export const signInWithRedirect=async()=>{};export const signOut=async()=>window.authListener(null);`,
        'firebase-firestore.js':`export const getFirestore=()=>({});export const doc=(db,users,uid)=>({uid});
            const snapshot=value=>({exists:()=>value!==null,data:()=>value,metadata:{fromCache:false}});
            export const onSnapshot=(ref,options,fn)=>{let active=true;window.__readUser(ref.uid).then(value=>{if(active)fn(snapshot(value));});return()=>{active=false;};};
            export const getDocFromServer=async ref=>snapshot(await window.__readUser(ref.uid));
            export const runTransaction=async(db,fn)=>{
                let target,value;await fn({get:async ref=>snapshot(await window.__readUser(ref.uid)),set:(ref,next)=>{target=ref;value=next;}});
                await window.__writeUser(target.uid,value);
            };`
    };
    await context.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({contentType:'text/javascript',body:sdk[route.request().url().split('/').at(-1)]}));
    await page.goto(origin);
    await page.waitForFunction(()=>document.getElementById('syncStatus').textContent.includes('alice@example.test'));
    await page.evaluate(value=>window.saveData(value),data('Aliceのボード'));
    await page.evaluate(()=>window.authListener({uid:'bob',email:'bob@example.test'}));
    await page.waitForFunction(()=>document.getElementById('syncStatus').textContent.includes('bob@example.test'));
    assert.equal(await page.locator('#activeBoardTitle').textContent(),'デフォルト');
    await page.evaluate(value=>window.saveData(value),data('Bobのボード'));
    await page.evaluate(()=>window.authListener({uid:'alice',email:'alice@example.test'}));
    await page.waitForFunction(()=>document.getElementById('activeBoardTitle').textContent==='Aliceのボード');
    assert.equal(documents.get('alice').data.boards[0].name,'Aliceのボード');
    assert.equal(documents.get('bob').data.boards[0].name,'Bobのボード');
    assert.equal(documents.size,2);
    await context.close();
});
