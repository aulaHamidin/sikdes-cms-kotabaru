(function () {
    'use strict';

    var sidebar = document.getElementById('app-sidebar');
    var sidebarOpen = document.getElementById('sidebar-open');
    var sidebarClose = document.getElementById('sidebar-close');
    var backdrop = document.getElementById('drawer-backdrop');
    var filterDrawer = document.getElementById('filter-drawer');
    var filterTrigger = document.getElementById('filter-trigger');
    var filterClose = document.getElementById('filter-close');
    var filterApply = document.getElementById('filter-apply');
    var modal = document.getElementById('confirm-modal');
    var modalTrigger = document.getElementById('modal-trigger');
    var toast = document.getElementById('success-toast');
    var toastTrigger = document.getElementById('toast-trigger');
    var toastClose = document.getElementById('toast-close');
    var loadingTrigger = document.getElementById('loading-trigger');
    var activePanel = null;
    var returnFocus = null;
    var toastTimer = null;
    var focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex=-1])';

    function focusableElements(container) {
        return Array.prototype.slice.call(container.querySelectorAll(focusableSelector)).filter(function (element) {
            return element.offsetParent !== null;
        });
    }

    function lockPanel(panel, trigger) {
        activePanel = panel;
        returnFocus = trigger || document.activeElement;
        document.body.style.overflow = 'hidden';
        var items = focusableElements(panel);
        if (items.length) {
            items[0].focus();
        }
    }

    function unlockPanel() {
        activePanel = null;
        document.body.style.overflow = '';
        if (returnFocus && typeof returnFocus.focus === 'function') {
            returnFocus.focus();
        }
        returnFocus = null;
    }

    function openSidebar() {
        sidebar.classList.add('open');
        backdrop.hidden = false;
        sidebarOpen.setAttribute('aria-expanded', 'true');
        lockPanel(sidebar, sidebarOpen);
    }

    function closeSidebar() {
        if (!sidebar.classList.contains('open')) {
            return;
        }
        sidebar.classList.remove('open');
        backdrop.hidden = true;
        sidebarOpen.setAttribute('aria-expanded', 'false');
        unlockPanel();
    }

    function openFilter() {
        filterDrawer.hidden = false;
        backdrop.hidden = false;
        filterTrigger.setAttribute('aria-expanded', 'true');
        lockPanel(filterDrawer, filterTrigger);
    }

    function closeFilter() {
        if (filterDrawer.hidden) {
            return;
        }
        filterDrawer.hidden = true;
        backdrop.hidden = true;
        filterTrigger.setAttribute('aria-expanded', 'false');
        unlockPanel();
    }

    function openModal(trigger) {
        modal.hidden = false;
        lockPanel(modal.querySelector('.modal-card'), trigger);
    }

    function closeModal() {
        if (modal.hidden) {
            return;
        }
        modal.hidden = true;
        unlockPanel();
    }

    function showToast() {
        window.clearTimeout(toastTimer);
        toast.hidden = false;
        toastTimer = window.setTimeout(function () {
            toast.hidden = true;
        }, 5000);
    }

    function hideToast() {
        window.clearTimeout(toastTimer);
        toast.hidden = true;
    }

    sidebarOpen.addEventListener('click', openSidebar);
    sidebarClose.addEventListener('click', closeSidebar);
    filterTrigger.addEventListener('click', openFilter);
    filterClose.addEventListener('click', closeFilter);
    filterApply.addEventListener('click', function () {
        closeFilter();
        showToast();
    });
    backdrop.addEventListener('click', function () {
        closeSidebar();
        closeFilter();
    });
    modalTrigger.addEventListener('click', function () { openModal(modalTrigger); });
    document.querySelectorAll('[data-open-modal]').forEach(function (trigger) {
        trigger.addEventListener('click', function () { openModal(trigger); });
    });
    document.querySelectorAll('[data-close-modal]').forEach(function (trigger) {
        trigger.addEventListener('click', closeModal);
    });
    toastTrigger.addEventListener('click', showToast);
    document.querySelectorAll('[data-show-toast]').forEach(function (trigger) {
        trigger.addEventListener('click', showToast);
    });
    toastClose.addEventListener('click', hideToast);

    loadingTrigger.addEventListener('click', function () {
        var original = loadingTrigger.textContent;
        loadingTrigger.disabled = true;
        loadingTrigger.classList.add('loading');
        loadingTrigger.textContent = 'Memproses…';
        window.setTimeout(function () {
            loadingTrigger.disabled = false;
            loadingTrigger.classList.remove('loading');
            loadingTrigger.textContent = original;
        }, 1600);
    });

    document.querySelectorAll('tr[data-href]').forEach(function (row) {
        function navigate(event) {
            if (event.target.closest('button, a, input, select')) {
                return;
            }
            window.location.hash = row.getAttribute('data-href').slice(1);
        }
        row.addEventListener('click', navigate);
        row.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigate(event);
            }
        });
    });

    document.querySelectorAll('.side-nav a').forEach(function (link) {
        link.addEventListener('click', function () {
            document.querySelectorAll('.side-nav a').forEach(function (item) {
                item.classList.remove('active');
                item.removeAttribute('aria-current');
            });
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
            closeSidebar();
        });
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            closeModal();
            closeSidebar();
            closeFilter();
            return;
        }
        if (event.key !== 'Tab' || !activePanel) {
            return;
        }
        var items = focusableElements(activePanel);
        if (!items.length) {
            return;
        }
        var first = items[0];
        var last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });
}());
