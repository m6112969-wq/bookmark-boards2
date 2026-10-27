// Shared validation for URL entry, JSON import, local storage and cloud snapshots.
(() => {
    'use strict';
    const MAX_IMPORT_BYTES = 1024 * 1024;
    const MAX_DATA_BYTES = 750000;
    const invalid = message => { throw new Error(message); };
    const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
    function text(value, limit, fallback = '') {
        if (value === undefined || value === null) return fallback;
        if (typeof value !== 'string' || value.length > limit) invalid('文字数またはデータ形式を確認してください');
        return value;
    }
    function id(value) {
        if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) value = String(value);
        if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) invalid('IDの形式が不正です');
        return value;
    }
    function parseBookmarkURL(value) {
        if (typeof value !== 'string' || value.length > 4096) return null;
        let url;
        try { url = new URL(value.trim()); } catch { return null; }
        if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return null;
        const host = url.hostname.toLowerCase();
        let video;
        if (['youtu.be', 'www.youtu.be'].includes(host)) video = url.pathname.split('/')[1];
        else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
            video = url.pathname === '/watch' ? url.searchParams.get('v') : url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)\/?$/)?.[1];
        }
        if (video && /^[A-Za-z0-9_-]{11}$/.test(video)) return { type: 'youtube', youtubeId: video, url: `https://www.youtube.com/watch?v=${video}` };
        if (['x.com', 'www.x.com', 'mobile.x.com', 'twitter.com', 'www.twitter.com', 'mobile.twitter.com'].includes(host)) {
            const tweetId = url.pathname.match(/^\/(?:[^/]+\/status|i\/(?:web\/)?status)\/(\d{1,25})(?:\/|$)/)?.[1];
            if (tweetId) return { type: 'tweet', tweetId, url: `https://x.com/i/status/${tweetId}` };
        }
        return null;
    }
    function normalizePost(raw) {
        if (!record(raw)) invalid('カードの形式が不正です');
        const type = raw.type || (raw.youtubeId ? 'youtube' : 'tweet');
        if (!['note', 'tweet', 'youtube'].includes(type)) invalid('カードの種類が不正です');
        const tags = raw.tags ?? [];
        if (!Array.isArray(tags) || tags.length > 50) invalid('タグは50個までです');
        const post = { id: id(raw.id), type, tags: [...new Set(tags.map(tag => text(tag, 100)))] };
        if (type === 'note') return { ...post, title: text(raw.title, 2000), body: text(raw.body, 200000) };
        let source = raw.url;
        if (!source) {
            if (type === 'youtube' && /^[A-Za-z0-9_-]{11}$/.test(raw.youtubeId || '')) source = `https://www.youtube.com/watch?v=${raw.youtubeId}`;
            if (type === 'tweet' && /^\d{1,25}$/.test(String(raw.tweetId || ''))) source = `https://x.com/i/status/${raw.tweetId}`;
        }
        const bookmark = parseBookmarkURL(source);
        if (!bookmark || bookmark.type !== type) invalid('XまたはYouTubeの正しいURLを使用してください');
        if (!post.tags.includes(type === 'youtube' ? 'youtube' : 'x')) post.tags.unshift(type === 'youtube' ? 'youtube' : 'x');
        if (post.tags.length > 50) invalid('タグは50個までです');
        return { ...post, ...bookmark, memo: text(raw.memo, 200000) };
    }
    function normalizeData(raw) {
        if (!record(raw) || !Array.isArray(raw.boards) || raw.boards.length > 100) invalid('ボードの形式または件数を確認してください');
        const folders = raw.folders ?? [];
        if (!Array.isArray(folders) || folders.length > 100) invalid('フォルダの形式または件数を確認してください');
        const folderIds = new Set();
        const result = { activeBoardId: null, boards: [], folders: folders.map(folder => {
            if (!record(folder)) invalid('フォルダの形式が不正です');
            const key = id(folder.id);
            if (folderIds.has(key)) invalid('フォルダIDが重複しています');
            folderIds.add(key);
            return { id: key, name: text(folder.name, 200, '無題'), expanded: folder.expanded !== false };
        }) };
        const boardIds = new Set(), postIds = new Set();
        let totalPosts = 0;
        result.boards = raw.boards.map(board => {
            if (!record(board)) invalid('ボードの形式が不正です');
            const key = id(board.id);
            if (boardIds.has(key)) invalid('ボードIDが重複しています');
            boardIds.add(key);
            const posts = board.posts ?? [];
            if (!Array.isArray(posts) || (totalPosts += posts.length) > 2000) invalid('カードは合計2000件までです');
            const normalized = posts.map(post => {
                const next = normalizePost(post);
                if (postIds.has(next.id)) invalid('カードIDが重複しています');
                postIds.add(next.id);
                return next;
            });
            const folderId = board.folderId == null || board.folderId === '' ? null : id(board.folderId);
            return { id: key, name: text(board.name, 200, '無題'), posts: normalized, folderId: folderIds.has(folderId) ? folderId : null };
        });
        const active = raw.activeBoardId == null ? null : id(raw.activeBoardId);
        result.activeBoardId = boardIds.has(active) ? active : result.boards[0]?.id || null;
        if (new TextEncoder().encode(JSON.stringify(result)).length > MAX_DATA_BYTES) invalid('保存データが大きすぎます。バックアップして分割してください');
        return result;
    }
    globalThis.BoardSecurity = Object.freeze({ normalizeData, parseBookmarkURL, MAX_IMPORT_BYTES });
})();
