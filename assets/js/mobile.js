// Responsive navigation and modal focus handling. Persistence remains in saveData.
(() => {
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('main-container');
    const toggle = document.getElementById('sidebarToggle');
    const backdrop = document.getElementById('sidebarBackdrop');
    const syncStatus = document.getElementById('syncStatus');
    function updateSyncStatus() {
        const full = syncStatus.textContent;
        const badge = document.getElementById('syncSummary');
        const error = /できません|失敗/.test(full);
        badge.textContent = error ? '同期エラー' : full.includes('同期済み') ? '同期済み' : full.includes('同期中') ? '同期中' : full.includes('端末内') ? '端末内' : '準備中';
        badge.dataset.state = error ? 'error' : full.includes('同期済み') ? 'synced' : full.includes('同期中') ? 'pending' : 'local';
        badge.title = full;
        badge.setAttribute('aria-label', full);
        if (error) document.getElementById('accountDetails').open = true;
    }
    new MutationObserver(updateSyncStatus)
        .observe(syncStatus, { childList: true, subtree: true, characterData: true });
    const mobile = matchMedia('(max-width: 767px)');
    const focusable = root => [...root.querySelectorAll('button, input, textarea, select, summary, a[href], [tabindex="0"]')]
        .filter(el => !el.disabled && el.getClientRects().length && !el.closest('[inert]'));
    let drawerOpen = !mobile.matches;
    window.setSidebarOpen = (open, focus = true) => {
        drawerOpen = open;
        sidebar.classList.toggle('closed', !open);
        sidebar.inert = !open;
        sidebar.setAttribute('aria-hidden', String(!open));
        toggle.setAttribute('aria-expanded', String(open));
        backdrop.hidden = !mobile.matches || !open;
        main.inert = mobile.matches && open;
        if (focus) {
            if (mobile.matches && open) (focusable(sidebar)[0] || sidebar).focus();
            else toggle.focus();
        }
    };
    window.toggleSidebar = () => window.setSidebarOpen(sidebar.classList.contains('closed'));
    toggle.addEventListener('click', window.toggleSidebar);
    // Vertical scrolling remains native; only a clear horizontal left swipe closes the drawer.
    let swipe = null;
    sidebar.addEventListener('pointerdown', event => {
        swipe = null;
        if (!mobile.matches || !drawerOpen || !event.isPrimary || event.pointerType !== 'touch'
            || event.target.closest('input, textarea, select, [contenteditable]')) return;
        swipe = { id: event.pointerId, x: event.clientX, y: event.clientY };
    });
    sidebar.addEventListener('pointercancel', () => { swipe = null; });
    sidebar.addEventListener('pointerup', event => {
        const start = swipe; swipe = null;
        if (!start || start.id !== event.pointerId) return;
        const left = start.x - event.clientX;
        const vertical = Math.abs(start.y - event.clientY);
        if (left >= 64 && left > vertical * 2) {
            // Let the touch sequence release pointer capture before hiding its target.
            requestAnimationFrame(() => window.setSidebarOpen(false));
        }
    });
    document.getElementById('sidebarClose').addEventListener('click', () => window.setSidebarOpen(false));
    backdrop.addEventListener('click', () => window.setSidebarOpen(false));
    mobile.addEventListener('change', () => {
        window.setSidebarOpen(!mobile.matches, false);
        if (mobile.matches) window.setSearchExpanded(true);
    });
    document.addEventListener('DOMContentLoaded', () => window.setSearchExpanded(true));
    window.setSidebarOpen(drawerOpen, false);

    document.getElementById('clearSearch').addEventListener('click', () => {
        const input = document.getElementById('searchInput');
        input.value = ''; window.handleSearch(''); input.focus();
    });
    const modal = document.getElementById('modal-container');
    let modalTrigger, lastActivation;
    document.addEventListener('click', event => {
        if (modal.classList.contains('hidden')) lastActivation = event.target.closest('button, [tabindex="0"]');
    }, true);
    new MutationObserver(() => {
        if (modal.classList.contains('hidden')) {
            if (modalTrigger?.isConnected) modalTrigger.focus();
            modalTrigger = null;
            return;
        }
        if (modalTrigger) return;
        modalTrigger = lastActivation || document.activeElement;
        const content = [...modal.children].find(node => !node.classList.contains('hidden'));
        modal.setAttribute('aria-label', content?.querySelector('h3')?.textContent || '確認');
        (focusable(content || modal)[0] || modal).focus();
    }).observe(modal, { attributes: true, attributeFilter: ['class'] });
    modal.addEventListener('click', event => { if (event.target === modal) window.closeModal(); });
    document.addEventListener('keydown', event => {
        const inModal = !modal.classList.contains('hidden');
        if (event.key === 'Escape') {
            if (inModal) window.closeModal();
            else if (drawerOpen) window.setSidebarOpen(false);
        }
        const root = inModal ? modal : mobile.matches && drawerOpen ? sidebar : null;
        if (event.key !== 'Tab' || !root) return;
        const elements = focusable(root);
        const first = elements[0], last = elements.at(-1);
        if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) {
            event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) {
            event.preventDefault(); first?.focus();
        }
    });

})();
