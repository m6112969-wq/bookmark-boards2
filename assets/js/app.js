        const TAG_COLORS = [
            { bg: 'rgba(99, 102, 241, 0.15)', text: '#a5b4fc', border: 'rgba(99, 102, 241, 0.25)' }, 
            { bg: 'rgba(16, 185, 129, 0.15)', text: '#6ee7b7', border: 'rgba(16, 185, 129, 0.25)' }, 
            { bg: 'rgba(245, 158, 11, 0.15)', text: '#fcd34d', border: 'rgba(245, 158, 11, 0.25)' }, 
            { bg: 'rgba(239, 68, 68, 0.15)', text: '#fca5a5', border: 'rgba(239, 68, 68, 0.25)' },   
            { bg: 'rgba(14, 165, 233, 0.15)', text: '#7dd3fc', border: 'rgba(14, 165, 233, 0.25)' }
        ];

        const ICONS = {
            trash: `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>`,
            edit: `<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>`,
            export: `<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>`,
            chevronDown: `<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M19 9l-7 7-7-7" /></svg>`,
            chevronRight: `<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M9 5l7 7-7 7" /></svg>`,
            tag: `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>`,
            external: `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>`,
            maximize: `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3m8 0h3a2 2 0 002-2v-3" /></svg>`
        };

        function getTagStyle(tagName) {
            let hash = 0; for (let i = 0; i < tagName.length; i++) hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
            const color = TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]; return `background: ${color.bg}; color: ${color.text}; border-color: ${color.border};`;
        }

        function escapeHtml(value) {
            return String(value ?? '').replace(/[&<>"']/g, (char) => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[char]));
        }

        function showToast(msg) {
            const t = document.getElementById('toast'); t.textContent = msg; t.style.opacity = '1'; t.style.transform = 'translate(-50%, -10px)';
            setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translate(-50%, 0)'; }, 2000);
        }

        function openConfirmModal(message, action) {
            const container = document.getElementById('modal-container');
            container.classList.remove('hidden'); container.classList.add('flex');
            document.querySelectorAll('#modal-container > div').forEach(el => el.classList.add('hidden'));
            const modal = document.getElementById('confirm-modal');
            document.getElementById('confirmMessage').textContent = message;
            modal.classList.remove('hidden');
            window.appState.pendingAction = action;
            document.getElementById('executeConfirmBtn').onclick = () => {
                if(window.appState.pendingAction) window.appState.pendingAction();
                closeModal();
            };
        }

        function closeModal() { 
            const c = document.getElementById('modal-container');
            c.classList.add('hidden'); c.classList.remove('flex');
            document.querySelectorAll('#modal-container > div').forEach(el => el.classList.add('hidden')); 
            document.querySelectorAll('#modal-container input').forEach(el => el.value = ''); 
            window.appState.pendingAction = null;
            window.appState.exportingBoardId = null;
        }

        function openNewBoardModal() { const c = document.getElementById('modal-container'); c.classList.remove('hidden'); c.classList.add('flex'); document.querySelectorAll('#modal-container > div').forEach(el => el.classList.add('hidden')); document.getElementById('new-board-modal').classList.remove('hidden'); document.getElementById('newBoardName').focus(); }
        function openNewFolderModal() { const c = document.getElementById('modal-container'); c.classList.remove('hidden'); c.classList.add('flex'); document.querySelectorAll('#modal-container > div').forEach(el => el.classList.add('hidden')); document.getElementById('new-folder-modal').classList.remove('hidden'); document.getElementById('newFolderName').focus(); }
        function openRenameModal(id, currentName, isBoard, e) {
            if(e) e.stopPropagation(); const c = document.getElementById('modal-container'); c.classList.remove('hidden'); c.classList.add('flex');
            document.querySelectorAll('#modal-container > div').forEach(el => el.classList.add('hidden')); const modal = document.getElementById('rename-modal'); const input = document.getElementById('renameInput'); input.value = currentName; modal.classList.remove('hidden'); input.focus();
            document.getElementById('confirmRenameBtn').onclick = async () => {
                const name = input.value.trim(); if(!name) return; const data = JSON.parse(JSON.stringify(window.appState.appData));
                if(isBoard) { const b = data.boards.find(b => String(b.id) === String(id)); if(b) b.name = name; } else { const f = data.folders.find(f => String(f.id) === String(id)); if(f) f.name = name; }
                await window.saveData(data); closeModal(); showToast("変更しました");
            };
        }
        function openHelpModal() { const c = document.getElementById('modal-container'); c.classList.remove('hidden'); c.classList.add('flex'); document.querySelectorAll('#modal-container > div').forEach(el => el.classList.add('hidden')); document.getElementById('help-modal').classList.remove('hidden'); }

        function openExportBoardModal(id, e) {
            if(e) e.stopPropagation();
            const board = window.appState.appData.boards.find(b => String(b.id) === String(id));
            if(!board) return;
            window.appState.exportingBoardId = id;
            const c = document.getElementById('modal-container');
            c.classList.remove('hidden'); c.classList.add('flex');
            document.querySelectorAll('#modal-container > div').forEach(el => el.classList.add('hidden'));
            const modal = document.getElementById('export-board-modal');
            const input = document.getElementById('exportFileName');
            input.value = `board_${board.name.replace(/[\s\W]/g, '_')}`;
            modal.classList.remove('hidden');
            input.focus();
        }

        function confirmExportBoard() {
            const id = window.appState.exportingBoardId;
            const filename = document.getElementById('exportFileName').value.trim() || 'board_export';
            const board = window.appState.appData.boards.find(b => String(b.id) === String(id));
            if(!board) return;
            const exportData = { type: 'single_board', version: '1.0', data: board };
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            const link = document.createElement('a');
            link.setAttribute('href', dataUri);
            link.setAttribute('download', `${filename}.json`);
            link.click();
            closeModal();
            showToast('ボードを書き出しました');
        }

        async function confirmCreateBoard() {
            const name = document.getElementById('newBoardName').value.trim(); if (!name) return;
            const newId = Date.now().toString(); const data = JSON.parse(JSON.stringify(window.appState.appData));
            data.boards.push({ id: newId, name: name, posts: [], folderId: null }); data.activeBoardId = newId;
            await window.saveData(data); closeModal(); showToast("ボード作成完了");
        }
        async function confirmCreateFolder() {
            const name = document.getElementById('newFolderName').value.trim(); if (!name) return;
            const newId = 'folder-' + Date.now().toString(); const data = JSON.parse(JSON.stringify(window.appState.appData));
            data.folders.push({ id: newId, name: name, expanded: true });
            await window.saveData(data); closeModal(); showToast("フォルダ作成完了");
        }

        function selectBoard(id) {
            const boardId = String(id); const data = JSON.parse(JSON.stringify(window.appState.appData));
            data.activeBoardId = boardId; window.appState.searchQuery = ""; window.appState.selectedTags = [];
            const input = document.getElementById('searchInput'); if (input) input.value = "";
            window.saveData(data); if (window.innerWidth < 768) window.setSidebarOpen(false);
        }
        const searchText = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase('ja');
        function handleSearch(val) { window.appState.searchQuery = searchText(val.trim()); renderActiveBoard(); }
        function clearTagFilters() {
            window.appState.selectedTags = [];
            if (window.appState.isFilterExpanded) updateFilterTagsUI();
            renderActiveBoard();
        }

        function selectTagFilter(tag) {
            const tags = window.appState.selectedTags;
            const idx = tags.indexOf(tag);
            if (idx === -1) tags.push(tag);
            else tags.splice(idx, 1);
            window.appState.selectedTags = tags;
            if (window.appState.isFilterExpanded) updateFilterTagsUI();
            renderActiveBoard();
        }
        // Search stays visible. The icon only places the cursor in the field.
        function setSearchExpanded(_expanded, focus = false) {
            const input = document.getElementById('searchInput');
            window.appState.isSearchExpanded = true;
            document.getElementById('searchContainer').classList.add('search-expanded');
            input.classList.remove('w-0', 'w-64', 'opacity-0', 'opacity-100', 'px-3');
            if (focus) input.focus();
        }
        window.setSearchExpanded = setSearchExpanded;
        function toggleSearch() { setSearchExpanded(true, true); }
        function toggleFilter() {
            const list = document.getElementById('tagFilterList'); const btn = document.getElementById('filterToggleBtn'); window.appState.isFilterExpanded = !window.appState.isFilterExpanded;
            btn.setAttribute('aria-expanded', String(window.appState.isFilterExpanded));
            if (window.appState.isFilterExpanded) { list.classList.add('expanded'); btn.classList.add('bg-indigo-500/10', 'text-indigo-400'); updateFilterTagsUI(); }
            else { list.classList.remove('expanded'); btn.classList.remove('bg-indigo-500/10', 'text-indigo-400'); }
        }

        function handleDragStartPost(id, e) {
            window.appState.draggedPostId = id; window.appState.draggedBoardId = null;
            e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'move';
            document.body.classList.add('dragging-active'); e.currentTarget.classList.add('dragging');
        }
        function handleDragStartBoard(id, e) {
            window.appState.draggedBoardId = id; window.appState.draggedPostId = null;
            e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'move';
            e.currentTarget.classList.add('dragging');
        }
        function handleDragEnd(e) {
            document.body.classList.remove('dragging-active'); e.currentTarget.classList.remove('dragging');
            document.querySelectorAll('.bookmark-card, .sidebar-item').forEach(el => el.classList.remove('drag-over'));
        }
        function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; e.currentTarget.classList.add('drag-over'); }
        function handleDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }

        async function handleDropPostOnPost(targetPostId, e) {
            e.preventDefault(); const draggedId = window.appState.draggedPostId;
            if (!draggedId || draggedId === targetPostId) return;
            const data = JSON.parse(JSON.stringify(window.appState.appData));
            const board = data.boards.find(b => String(b.id) === String(data.activeBoardId));
            if (!board) return;
            const fromIdx = board.posts.findIndex(p => p.id === draggedId);
            const toIdx = board.posts.findIndex(p => p.id === targetPostId);
            if (fromIdx !== -1 && toIdx !== -1) { const [moved] = board.posts.splice(fromIdx, 1); board.posts.splice(toIdx, 0, moved); await window.saveData(data); }
        }

        async function handleDropOnSidebarItem(itemId, isBoard, e) {
            e.preventDefault(); const data = JSON.parse(JSON.stringify(window.appState.appData));
            if (window.appState.draggedPostId && isBoard) {
                const src = data.boards.find(b => String(b.id) === String(data.activeBoardId));
                const tgt = data.boards.find(b => String(b.id) === String(itemId));
                if (!src || !tgt || src.id === tgt.id) return;
                const orig = src.posts.find(p => p.id === window.appState.draggedPostId);
                if (orig && !tgt.posts.some(p => p.url === orig.url)) {
                    tgt.posts.unshift({ ...orig, id: Date.now().toString() + Math.random().toString(36).substr(2, 5) });
                    await window.saveData(data); showToast(`${tgt.name} に複製しました`);
                }
            } else if (window.appState.draggedBoardId && isBoard) {
                const fromIdx = data.boards.findIndex(b => String(b.id) === String(window.appState.draggedBoardId));
                const toIdx = data.boards.findIndex(b => String(b.id) === String(itemId));
                if (fromIdx !== -1 && toIdx !== -1) { const [moved] = data.boards.splice(fromIdx, 1); moved.folderId = data.boards[toIdx > fromIdx ? toIdx : toIdx]?.folderId || null; data.boards.splice(toIdx, 0, moved); await window.saveData(data); }
            } else if (window.appState.draggedBoardId && !isBoard) {
                const board = data.boards.find(b => String(b.id) === String(window.appState.draggedBoardId));
                if (board) { board.folderId = itemId; await window.saveData(data); }
            }
        }

        function renderSidebar() {
            const list = document.getElementById('boardList'); if (!list) return; list.innerHTML = '';
            const data = window.appState.appData;
            const renderItem = (item, isBoard) => {
                const isActive = isBoard && String(item.id) === String(data.activeBoardId);
                const div = document.createElement('div');
                div.className = `sidebar-item group ${isActive ? 'active-board' : ''}`;
                div.setAttribute('role', 'group');
                div.setAttribute('aria-label', `${isBoard ? 'ボード' : 'フォルダ'}：${item.name}`);
                if (isBoard) {
                    div.setAttribute('draggable', 'true'); div.ondragstart = (e) => handleDragStartBoard(item.id, e);
                    div.onclick = () => selectBoard(item.id);
                } else { div.onclick = (e) => toggleFolder(item.id, e); }
                div.ondragover = handleDragOver; div.ondragleave = handleDragLeave;
                div.ondrop = (e) => { e.currentTarget.classList.remove('drag-over'); handleDropOnSidebarItem(item.id, isBoard, e); };
                div.ondragend = handleDragEnd;
                let icon = isBoard 
                    ? `<span class="mr-2" style="opacity:0.4"><svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M8 9h8m-8 6h8" /></svg></span>` 
                    : `<span class="mr-2" style="color:var(--text-muted)">${item.expanded ? ICONS.chevronDown : ICONS.chevronRight}</span>`;
                
                let actions = `<div class="sidebar-item-actions flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all" style="color:var(--text-secondary)">`;
                if(isBoard) {
                    actions += `<button data-item-action="export" class="p-1.5 rounded-md transition-colors hover:text-amber-400 hover:bg-amber-400/10" title="ボードを書き出す" aria-label="ボードを書き出す">${ICONS.export}</button>`;
                }
                actions += `<button data-item-action="rename" class="p-1.5 rounded-md transition-colors hover:text-blue-400 hover:bg-blue-400/10" aria-label="名前を変更">${ICONS.edit}</button><button data-item-action="delete" class="p-1.5 rounded-md transition-colors hover:text-red-400 hover:bg-red-400/10" aria-label="削除">${ICONS.trash}</button></div>`;
                
                div.innerHTML = `<button type="button" class="sidebar-select truncate flex items-center min-w-0" aria-label="${isBoard ? 'ボード' : 'フォルダ'}：${escapeHtml(item.name)}">${icon}<span class="text-xs font-semibold truncate">${escapeHtml(item.name)}</span></button>${actions}`;
                const itemActions = {
                    export: event => openExportBoardModal(item.id, event),
                    rename: event => openRenameModal(item.id, item.name, isBoard, event),
                    delete: event => (isBoard ? deleteBoard : deleteFolder)(item.id, event)
                };
                div.querySelectorAll('[data-item-action]').forEach(button => {
                    button.addEventListener('click', itemActions[button.dataset.itemAction]);
                });
                return div;
            };
            data.folders.forEach(f => {
                list.appendChild(renderItem(f, false));
                if (f.expanded) {
                    const sub = document.createElement('div'); sub.className = "folder-indent space-y-0.5 mb-3 mt-0.5";
                    data.boards.filter(b => String(b.folderId) === String(f.id)).forEach(b => sub.appendChild(renderItem(b, true))); list.appendChild(sub);
                }
            });
            const roots = data.boards.filter(b => !b.folderId);
            if (roots.length > 0) {
                const d = document.createElement('div'); d.className = "sidebar-section-label mt-6 mb-2 px-1";
                d.textContent = "未分類"; list.appendChild(d); roots.forEach(b => list.appendChild(renderItem(b, true)));
            }
        }

        function playYouTube(postId, youtubeId) {
            const media = document.getElementById(`youtube-media-${postId}`);
            if (!media || media.querySelector('iframe') || !/^[A-Za-z0-9_-]{11}$/.test(youtubeId)) return;

            const card = media.closest('.bookmark-card');
            if (card) card.classList.add('is-active');

            const thumbnail = media.querySelector('.youtube-thumb-wrap');
            if (!thumbnail) return;

            thumbnail.outerHTML = `
                <iframe
                    class="youtube-embed"
                    src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?autoplay=1&rel=0"
                    title="YouTube video player" referrerpolicy="strict-origin-when-cross-origin"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                    allowfullscreen="true"
                    webkitallowfullscreen="true"
                    mozallowfullscreen="true"
                ></iframe>`;
        }

        function requestElementFullscreen(el) {
            const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
            if (!fn) return Promise.reject(new Error('Fullscreen is not supported'));
            return fn.call(el);
        }

        function openYouTubeFullscreen(postId, youtubeId, e) {
            if (e) e.stopPropagation();
            playYouTube(postId, youtubeId);

            const media = document.getElementById(`youtube-media-${postId}`);
            if (!media) return;

            Promise.resolve(requestElementFullscreen(media)).catch(() => {
                showToast("このブラウザでは全画面表示を開始できませんでした");
            });
        }

        async function addPost() {
            const input = document.getElementById('urlInput');
            if (!input.value.trim()) return;
            const bookmark = BoardSecurity.parseBookmarkURL(input.value);
            if (!bookmark) return showToast('X・YouTubeのURLを入力してください');
            const data = JSON.parse(JSON.stringify(window.appState.appData));
            const board = data.boards.find(b => String(b.id) === String(data.activeBoardId));
            if (!board) return showToast('ボードを選択してください');
            if (board.posts.some(post => post.url === bookmark.url)) return showToast('追加済みです');
            window.appState.searchQuery = ''; window.appState.selectedTags = [];
            document.getElementById('searchInput').value = '';
            board.posts.unshift({ ...bookmark, id: crypto.randomUUID(), memo: '', tags: [bookmark.type === 'youtube' ? 'youtube' : 'x'] });
            await window.saveData(data); input.value = ''; showToast('追加しました');
        }

        async function addNoteCard() {
            const data = JSON.parse(JSON.stringify(window.appState.appData));
            const board = data.boards.find(b => String(b.id) === String(data.activeBoardId)); if (!board) return showToast("ボード選択して");
            window.appState.searchQuery = ""; window.appState.selectedTags = [];
            const searchInput = document.getElementById('searchInput'); if (searchInput) searchInput.value = "";
            const newNote = { type: 'note', id: Date.now().toString() + Math.random().toString(36).substr(2, 5), title: "", body: "", tags: [] };
            board.posts.unshift(newNote);
            await window.saveData(data);
            showToast("テキストカードを追加しました");
            setTimeout(() => {
                const titleEl = document.getElementById('note-title-' + newNote.id);
                if (titleEl) titleEl.focus();
            }, 150);
        }

        function removePost(id) {
            const board = window.appState.appData.boards.find(b => String(b.id) === String(window.appState.appData.activeBoardId));
            const post = board && board.posts.find(p => p.id === id);
            const msg = post && post.type === 'note' ? "このテキストカードを削除しますか？" : "このポストを削除しますか？";
            openConfirmModal(msg, async () => {
                const data = JSON.parse(JSON.stringify(window.appState.appData));
                const board = data.boards.find(b => String(b.id) === String(window.appState.appData.activeBoardId));
                if (board) { board.posts = board.posts.filter(p => p.id !== id); await window.saveData(data); showToast("削除しました"); }
            });
        }
        async function deleteBoard(id, e) {
            if(e) e.stopPropagation(); if (window.appState.appData.boards.length <= 1) return showToast("最低1つ必要");
            openConfirmModal("このボードを削除しますか？", async () => {
                const data = JSON.parse(JSON.stringify(window.appState.appData));
                data.boards = data.boards.filter(b => String(b.id) !== String(id));
                if (String(data.activeBoardId) === String(id)) data.activeBoardId = data.boards[0]?.id || null;
                await window.saveData(data);
            });
        }
        async function deleteFolder(id, e) {
            if(e) e.stopPropagation();
            openConfirmModal("このフォルダを削除しますか？", async () => {
                const data = JSON.parse(JSON.stringify(window.appState.appData));
                data.folders = data.folders.filter(f => String(f.id) !== String(id));
                data.boards.forEach(b => { if (String(b.folderId) === String(id)) b.folderId = null; });
                await window.saveData(data);
            });
        }
        function toggleFolder(id, e) { if(e) e.stopPropagation(); const d = JSON.parse(JSON.stringify(window.appState.appData)); const f = d.folders.find(f => String(f.id) === String(id)); if(f){f.expanded = !f.expanded; window.saveData(d);} }
        async function updatePostField(id, f, v) { const d = JSON.parse(JSON.stringify(window.appState.appData)); const board = d.boards.find(b => String(b.id) === String(d.activeBoardId)); const p = board?.posts.find(p => p.id === id); if (p) { p[f] = v; await window.saveData(d, true); } }
        async function addTag(id, t) {
            t = t.trim(); if (!t) return; const d = JSON.parse(JSON.stringify(window.appState.appData)); const board = d.boards.find(b => String(b.id) === String(d.activeBoardId)); const p = board?.posts.find(p => p.id === id);
            if (p) { if (!p.tags) p.tags = []; if (!p.tags.includes(t)) { p.tags.push(t); await window.saveData(d, true); renderTags(id, p.tags); updateSuggestedTags(id); if (window.appState.isFilterExpanded) updateFilterTagsUI(); } }
        }
        async function removeTag(id, t) {
            const d = JSON.parse(JSON.stringify(window.appState.appData)); const board = d.boards.find(b => String(b.id) === String(d.activeBoardId)); const p = board?.posts.find(p => p.id === id);
            if (p && p.tags) { p.tags = p.tags.filter(tg => tg !== t); await window.saveData(d, true); renderTags(id, p.tags); updateSuggestedTags(id); if (window.appState.isFilterExpanded) updateFilterTagsUI(); }
        }
        function tagButton(label, className, tag, action) {
            const button = document.createElement('button');
            button.type = 'button'; button.textContent = label; button.className = className;
            button.style.cssText = getTagStyle(tag);
            button.addEventListener('click', action);
            return button;
        }
        function renderTags(id, tags) {
            const el = document.getElementById(`tags-display-${id}`);
            if (!el) return;
            el.replaceChildren(...(tags || []).map(tag => {
                const pill = document.createElement('span'); pill.className = 'tag-pill shadow-sm';
                pill.style.cssText = getTagStyle(tag); pill.append(document.createTextNode('#' + tag));
                const remove = tagButton('×', 'tag-remove', tag, () => removeTag(id, tag));
                remove.setAttribute('aria-label', tag + ' タグを削除'); pill.append(remove);
                return pill;
            }));
        }
        function updateSuggestedTags(id) {
            const board = window.appState.appData.boards.find(board => String(board.id) === String(window.appState.appData.activeBoardId));
            const post = board?.posts.find(post => post.id === id);
            const el = document.getElementById(`tags-suggested-${id}`);
            if (!post || !el) return;
            const tags = [...new Set(board.posts.flatMap(post => post.tags || []))].filter(tag => !(post.tags || []).includes(tag));
            el.classList.toggle('hidden', !tags.length);
            el.replaceChildren(...tags.map(tag => tagButton('+ ' + tag, 'tag-suggest shadow-inner', tag, () => addTag(id, tag))));
        }
        function updateFilterTagsUI() {
            const board = window.appState.appData.boards.find(board => String(board.id) === String(window.appState.appData.activeBoardId));
            const el = document.getElementById('tagFilterList');
            if (!board || !el) return;
            const tags = [...new Set(board.posts.flatMap(post => post.tags || []))].sort();
            el.replaceChildren();
            if (!tags.length) { const label = document.createElement('span'); label.className = 'text-xs px-2'; label.textContent = 'タグがありません'; el.append(label); return; }
            tags.forEach(tag => {
                const active = window.appState.selectedTags.includes(tag);
                const count = board.posts.filter(post => (post.tags || []).includes(tag)).length;
                const button = tagButton(`${tag} ${count}`, `tag-pill transition-all ${active ? 'shadow-lg brightness-110 ring-1 ring-indigo-500/50' : 'opacity-60 hover:opacity-100'}`, tag, () => selectTagFilter(tag));
                button.setAttribute('aria-pressed', String(active));
                el.append(button);
            });
            if (window.appState.selectedTags.length) {
                const clear = document.createElement('button'); clear.type = 'button'; clear.className = 'tag-pill';
                clear.textContent = '× クリア'; clear.addEventListener('click', clearTagFilters); el.append(clear);
            }
        }

        function buildCard(p) {
            if (!p.type) p.type = 'tweet'; // 旧データ後方互換
            const postIdHtml = escapeHtml(p.id);
            const youtubeIdHtml = escapeHtml(p.youtubeId || '');
            const tweetIdHtml = escapeHtml(p.tweetId || '');
            const card = document.createElement('div');
            card.className = 'bookmark-card group shadow-lg cursor-grab active:cursor-grabbing';
            card.setAttribute('data-id', p.id);
            card.setAttribute('draggable', String(!matchMedia('(pointer: coarse)').matches));
            card.ondragstart = (e) => handleDragStartPost(p.id, e);
            card.ondragend = handleDragEnd;
            card.ondragover = handleDragOver;
            card.ondragleave = (e) => { e.currentTarget.classList.remove('drag-over'); e.currentTarget.classList.remove('is-active'); };
            card.ondrop = (e) => handleDropPostOnPost(p.id, e);
            card.onmouseleave = () => card.classList.remove('is-active');
            card.onclick = (e) => {
                if (e.target.closest('button, textarea, input, a, summary, .card-info-panel, .youtube-wrapper')) return;
                const panel = card.querySelector('.card-info-panel');
                if (panel) panel.open = !panel.open;
            };

            const tagSection = `
                <hr class="note-divider">
                <div class="note-card-tags-section">
                    <div id="tags-display-${postIdHtml}" class="flex flex-wrap gap-1.5"></div>
                    <div id="tags-suggested-${postIdHtml}" class="flex flex-wrap gap-1.5"></div>
                    <div class="tag-input-wrap"><span style="color:var(--text-muted)">${ICONS.tag}</span><input type="text" placeholder="タグを追加" class="tag-text-input"></div>
                </div>`;

            if (p.type === 'note') {
                // ── テキストカード ──
                card.innerHTML = `
                    <div class="note-card-body">
                        <div class="flex justify-between items-start">
                            <span class="note-card-badge">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                メモ
                            </span>
                            <button data-card-action="delete" class="card-delete-btn flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all" style="padding:6px" aria-label="カードを削除">${ICONS.trash}</button>
                        </div>
                        <textarea id="note-title-${postIdHtml}" class="note-title-input" placeholder="タイトル..." rows="1"
                        >${escapeHtml(p.title || '')}</textarea>
                        <textarea id="note-body-${postIdHtml}" class="note-body-input" placeholder="本文を入力..."
                        >${escapeHtml(p.body || '')}</textarea>
                        ${tagSection}
                    </div>`;
            } else if (p.type === 'youtube') {
                // ── YouTubeカード ──
                card.innerHTML = `
                    <div id="youtube-media-${postIdHtml}" class="relative w-full youtube-wrapper overflow-hidden">
                        <div class="drop-shield" data-card-action="play"></div>
                        <div class="media-actions">
                            <button type="button" data-card-action="fullscreen" class="media-action-btn" aria-label="全画面で再生">${ICONS.maximize}</button>
                            <button data-card-action="delete" class="card-delete-btn flex items-center justify-center" aria-label="カードを削除">${ICONS.trash}</button>
                        </div>
                        <button type="button" class="youtube-thumb-wrap block" data-card-action="play" aria-label="埋め込みでYouTubeを再生">
                            <img
                                src="https://i.ytimg.com/vi/${youtubeIdHtml}/hqdefault.jpg"
                                alt="YouTube thumbnail"
                            >
                            <span class="youtube-play-badge" aria-hidden="true">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                            </span>

                        </button>
                    </div>
                    <details class="card-info-panel"><div class="card-info-inner"><div class="flex flex-col gap-4">
                        <div class="flex justify-between items-center px-1">
                            <label class="field-label">メモ</label>
                            <a href="${escapeHtml(p.url)}" target="_blank" rel="noopener noreferrer" class="text-[10px] flex items-center gap-1 font-bold" style="color:#f87171">
                                YouTubeで見る ${ICONS.external}
                            </a>
                        </div>
                        <textarea placeholder="メモ..." class="memo-textarea">${escapeHtml(p.memo || "")}</textarea>
                        <div><label class="field-label">タグ</label>
                            <div id="tags-display-${postIdHtml}" class="flex flex-wrap gap-1.5 mb-2.5"></div>
                            <div id="tags-suggested-${postIdHtml}" class="flex flex-wrap gap-1.5 mb-3"></div>
                            <div class="tag-input-wrap"><span style="color:var(--text-muted)">${ICONS.tag}</span><input type="text" placeholder="タグを追加" class="tag-text-input"></div>
                        </div>
                    </div></div></details>`;
            } else {
                // ── Tweetカード ──
                card.innerHTML = `
                    <div class="relative w-full min-h-[100px] tweet-wrapper overflow-hidden">
                        <div class="drop-shield"></div>
                        <div class="tweet-delete-actions absolute top-3 right-3 z-50 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                            <button data-card-action="delete" class="card-delete-btn flex items-center justify-center" aria-label="カードを削除">${ICONS.trash}</button>
                        </div>
                        <div class="p-1" id="tweet-${postIdHtml}"><div class="skeleton-placeholder m-2"></div></div>
                    </div>
                    <details class="card-info-panel"><div class="card-info-inner"><div class="flex flex-col gap-4">
                        <div class="flex justify-between items-center px-1">
                            <label class="field-label">メモ</label>
                            <a href="https://x.com/i/status/${tweetIdHtml}" target="_blank" rel="noopener noreferrer" class="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-bold">
                                Xで見る ${ICONS.external}
                            </a>
                        </div>
                        <textarea placeholder="メモ..." class="memo-textarea">${escapeHtml(p.memo || "")}</textarea>
                        <div><label class="field-label">タグ</label>
                            <div id="tags-display-${postIdHtml}" class="flex flex-wrap gap-1.5 mb-2.5"></div>
                            <div id="tags-suggested-${postIdHtml}" class="flex flex-wrap gap-1.5 mb-3"></div>
                            <div class="tag-input-wrap"><span style="color:var(--text-muted)">${ICONS.tag}</span><input type="text" placeholder="タグを追加" class="tag-text-input"></div>
                        </div>
                    </div></div></details>`;
            }
            const panel = card.querySelector('details.card-info-panel');
            if (panel) {
                const summary = document.createElement('summary');
                summary.className = 'card-panel-toggle';
                summary.innerHTML = '<span>メモ・タグ</span><span class="panel-open-label" aria-hidden="true">⌄</span><span class="panel-close-label" aria-hidden="true">⌃</span>';
                panel.prepend(summary);
                const close = document.createElement('button');
                close.type = 'button';
                close.className = 'btn-ghost card-panel-close';
                close.textContent = '閉じる';
                close.setAttribute('aria-label', 'パネルを閉じる');
                function closePanel() {
                    if (panel.contains(document.activeElement)) document.activeElement.blur();
                    panel.open = false;
                    summary.focus({ preventScroll: true });
                }
                close.addEventListener('click', closePanel);
                panel.querySelector('.card-info-inner').appendChild(close);
                panel.addEventListener('keydown', event => {
                    if (event.key !== 'Escape') return;
                    event.preventDefault(); event.stopPropagation(); closePanel();
                });
                if (p.type === 'tweet') panel.addEventListener('toggle', () => card.classList.toggle('is-active', panel.open));
            }
            const actions = { delete: () => removePost(p.id), play: () => playYouTube(p.id, p.youtubeId), fullscreen: event => openYouTubeFullscreen(p.id, p.youtubeId, event) };
            card.querySelectorAll('[data-card-action]').forEach(control => control.addEventListener('click', actions[control.dataset.cardAction]));
            const thumbnail = card.querySelector('.youtube-thumb-wrap img');
            if (thumbnail) thumbnail.addEventListener('error', () => {
                if (thumbnail.dataset.fallback) { thumbnail.hidden = true; return; }
                thumbnail.dataset.fallback = 'true';
                thumbnail.src = `https://i.ytimg.com/vi/${encodeURIComponent(p.youtubeId)}/mqdefault.jpg`;
            });
            card.querySelectorAll('textarea, .tag-text-input').forEach(field => {
                field.addEventListener('focus', () => { window.appState.isEditing = true; });
                field.addEventListener('blur', () => {
                    window.appState.isEditing = false;
                    if (field.matches('textarea')) {
                        const key = field.classList.contains('note-title-input') ? 'title' : field.classList.contains('note-body-input') ? 'body' : 'memo';
                        updatePostField(p.id, key, field.value);
                    }
                });
                if (field.matches('textarea')) field.addEventListener('input', () => autoResizeTextarea(field));
                else field.addEventListener('keydown', event => {
                    if (event.key !== 'Enter' || event.isComposing) return;
                    event.preventDefault(); addTag(p.id, field.value); field.value = '';
                });
            });
            card.querySelectorAll('.note-title-input, .note-body-input, .memo-textarea').forEach(field => {
                field.setAttribute('aria-label', field.classList.contains('note-title-input') ? 'メモのタイトル' : field.classList.contains('note-body-input') ? 'メモの本文' : 'ブックマークのメモ');
            });
            return card;
        }

        function autoResizeTextarea(el) {
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
        }

        function getColumnCount() {
            const w = document.getElementById('gallery').offsetWidth;
            if (w >= 1500) return 4;
            if (w >= 1150) return 3;
            if (w >= 680)  return 2;
            return 1;
        }

        function renderActiveBoard() {
            const board = window.appState.appData.boards.find(b => String(b.id) === String(window.appState.appData.activeBoardId));
            const container = document.getElementById('gallery'); if (!container) return; if (!board) { document.getElementById('activeBoardTitle').textContent = "ボードを選択してください"; container.innerHTML = ''; return; }
            document.getElementById('activeBoardTitle').textContent = board.name;
            document.getElementById('activeBoardTitle').title = board.name;
            let posts = board.posts;
            if (window.appState.searchQuery) posts = posts.filter(p =>
                searchText(p.memo).includes(window.appState.searchQuery) ||
                searchText(p.title).includes(window.appState.searchQuery) ||
                searchText(p.body).includes(window.appState.searchQuery)
            );
            if (window.appState.selectedTags.length) posts = posts.filter(p => window.appState.selectedTags.every(t => (p.tags||[]).includes(t)));
            if (window.appState.isFilterExpanded) updateFilterTagsUI();

            const count = document.getElementById('boardCount');
            count.textContent = posts.length === board.posts.length ? String(posts.length) : `${posts.length} / ${board.posts.length}`;
            count.setAttribute('aria-label', `${posts.length}件 / 全${board.posts.length}件`);
            document.getElementById('clearSearch').hidden = !document.getElementById('searchInput').value;
            const filter = document.getElementById('filterToggleBtn');
            filter.classList.toggle('has-filters', window.appState.selectedTags.length > 0);
            const empty = document.getElementById('emptyState');
            empty.classList.toggle('hidden', posts.length > 0);
            empty.querySelector('p').textContent = board.posts.length ? '見つかりません' : 'カードがありません';
            const emptyAction = document.getElementById('emptyAction');
            emptyAction.textContent = board.posts.length ? '絞り込みを解除' : 'メモを追加';
            emptyAction.onclick = board.posts.length ? () => {
                document.getElementById('searchInput').value = '';
                window.appState.searchQuery = '';
                clearTagFilters();
            } : addNoteCard;
            const newIds = JSON.stringify([board.id, ...posts.map(post => post.id)]);
            const needsCards = container.dataset.cardIds !== newIds;
            const colCount = getColumnCount();
            const needsColumns = container.children.length !== (posts.length ? colCount : 0);
            if (needsCards || (needsColumns && !window.appState.isEditing)) {
                const existing = new Map([...container.querySelectorAll('.bookmark-card')].map(card => [card.dataset.id, card]));
                const cols = posts.length ? Array.from({ length: colCount }, () => {
                    const col = document.createElement('div'); col.className = 'board-col'; return col;
                }) : [];
                posts.forEach((post, index) => {
                    const card = existing.get(String(post.id)) || buildCard(post);
                    cols[index % colCount].appendChild(card);
                    if (post.type === 'tweet' && !existing.has(String(post.id))) {
                        const tc = card.querySelector('[id^="tweet-"]');
                        const check = setInterval(() => {
                            if (window.twttr?.widgets) {
                                clearInterval(check);
                                window.twttr.widgets.createTweet(post.tweetId, tc, { theme: 'dark', lang: 'ja', dnt: true, conversation: 'none', cards: 'visible', width: 'auto' }).then(() => tc.querySelector('.skeleton-placeholder')?.remove());
                            }
                        }, 100);
                        setTimeout(() => clearInterval(check), 8000);
                    }
                });
                container.replaceChildren(...cols);
                container.dataset.cardIds = newIds;
            }
            // Update synchronized fields without replacing focused inputs or embedded players.
            const currentCards = new Map([...container.querySelectorAll('.bookmark-card')].map(card => [card.dataset.id, card]));
            posts.forEach(post => {
                const card = currentCards.get(String(post.id));
                if (!card) return;
                for (const [selector, field] of [['.note-title-input', 'title'], ['.note-body-input', 'body'], ['.memo-textarea', 'memo']]) {
                    const input = card.querySelector(selector);
                    if (input && input !== document.activeElement) { input.value = post[field] || ''; autoResizeTextarea(input); }
                }
                renderTags(post.id, post.tags);
                updateSuggestedTags(post.id);
            });
        }

        // Keyboard height changes must not rebuild cards or discard text edits.
        const galleryObserver = new ResizeObserver(() => {
            if (window.appState && !window.appState.isEditing) renderActiveBoard();
        });
        galleryObserver.observe(document.getElementById('gallery'));
        document.addEventListener('focusout', () => setTimeout(() => {
            if (!window.appState?.isEditing) renderActiveBoard();
        }, 0));

        window.exportData = () => { const d = JSON.stringify(window.appState.appData, null, 2); const u = 'data:application/json;charset=utf-8,'+ encodeURIComponent(d); const l = document.createElement('a'); l.setAttribute('href', u); l.setAttribute('download', 'backup.json'); l.click(); showToast('出力完了'); };
        window.importData = () => document.getElementById('importFile').click();
        
        document.getElementById('importFile').addEventListener('change', e => {
            const f = e.target.files[0]; if (!f) return;
            e.target.value = '';
            if (f.size > BoardSecurity.MAX_IMPORT_BYTES) return showToast('ファイルは1MiBまでです');
            const r = new FileReader();
            r.onload = async ev => {
                try {
                    const d = JSON.parse(ev.target.result);
                    const data = JSON.parse(JSON.stringify(window.appState.appData));
                    if (d.type === 'single_board') {
                        const fileName = f.name.replace(/\.[^/.]+$/, "");
                        const newBoard = { ...d.data, id: crypto.randomUUID(), folderId: null, name: fileName, posts: (d.data.posts || []).map(post => ({ ...post, id: crypto.randomUUID() })) };
                        data.boards.push(newBoard);
                        data.activeBoardId = newBoard.id;
                        await window.saveData(data);
                        showToast('ボードを取り込みました');
                    } else if (d.boards) {
                        await window.saveData(window.normalizeAppData ? window.normalizeAppData(d) : d);
                        showToast('データを復元しました');
                    } else { showToast('無効な形式'); }
                } catch (err) { showToast(err.message || 'データを確認してください'); }
            };
            r.readAsText(f);
        });

        window.toggleSearch = toggleSearch; window.toggleFilter = toggleFilter; window.openNewBoardModal = openNewBoardModal; window.openNewFolderModal = openNewFolderModal; window.closeModal = closeModal; window.confirmCreateBoard = confirmCreateBoard; window.confirmCreateFolder = confirmCreateFolder; window.deleteBoard = deleteBoard; window.deleteFolder = deleteFolder; window.addPost = addPost; window.removePost = removePost; window.updatePostField = updatePostField; window.handleSearch = handleSearch; window.selectTagFilter = selectTagFilter; window.addTag = addTag; window.removeTag = removeTag; window.openHelpModal = openHelpModal; window.openRenameModal = openRenameModal; window.selectBoard = selectBoard; window.toggleFolder = toggleFolder; window.openExportBoardModal = openExportBoardModal; window.confirmExportBoard = confirmExportBoard; window.addNoteCard = addNoteCard; window.autoResizeTextarea = autoResizeTextarea; window.clearTagFilters = clearTagFilters;
        window.playYouTube = playYouTube;
        window.openYouTubeFullscreen = openYouTubeFullscreen;

        function submitOnEnter(id, action) {
            document.getElementById(id).addEventListener('keydown', event => {
                if (event.key !== 'Enter' || event.isComposing) return;
                event.preventDefault();
                action();
            });
        }
        submitOnEnter('urlInput', addPost);
        submitOnEnter('newBoardName', confirmCreateBoard);
        submitOnEnter('newFolderName', confirmCreateFolder);

        const pageActions = { openNewFolderModal, openNewBoardModal, exportData: window.exportData, importData: window.importData,
            addPost, addNoteCard, toggleSearch, toggleFilter, openHelpModal, closeModal, confirmCreateBoard, confirmCreateFolder, confirmExportBoard };
        document.querySelectorAll('[data-action]').forEach(button => {
            const action = pageActions[button.dataset.action];
            if (action) button.addEventListener('click', () => { Promise.resolve(action()).catch(() => showToast('保存できません。データを確認してください')); });
        });
        const searchInput = document.getElementById('searchInput');
        let composingSearch = false;
        searchInput.addEventListener('compositionstart', () => { composingSearch = true; });
        searchInput.addEventListener('compositionend', () => { composingSearch = false; handleSearch(searchInput.value); });
        searchInput.addEventListener('input', event => {
            document.getElementById('clearSearch').hidden = !searchInput.value;
            if (!composingSearch && !event.isComposing) handleSearch(searchInput.value);
        });
        searchInput.addEventListener('keydown', event => {
            if (event.key !== 'Escape') return;
            event.stopPropagation();
            if (event.isComposing || composingSearch) return;
            event.preventDefault();
            if (searchInput.value) { searchInput.value = ''; handleSearch(''); }
            else searchInput.blur();
        });
