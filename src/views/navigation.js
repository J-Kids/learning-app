/**
 * Navigation Router & View History Stack
 */

export class NavigationRouter {
  constructor(dom, state, onNavigateCallback) {
    this.dom = dom;
    this.state = state;
    this.onNavigateCallback = onNavigateCallback;
  }

  navigateTo(viewName, breadcrumbText = '') {
    if (this.state.currentView !== viewName) {
      this.state.viewHistory.push({
        view: this.state.currentView,
        breadcrumb: this.dom.navBreadcrumb.textContent
      });
    }

    this.state.currentView = viewName;

    // Toggle active view CSS
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    const targetSection = document.getElementById(viewName);
    if (targetSection) targetSection.classList.add('active');

    // Update navigation back bar visibility
    if (viewName === 'view-home') {
      this.dom.navBackBar.style.display = 'none';
      this.state.viewHistory = [];
    } else {
      this.dom.navBackBar.style.display = 'flex';
      this.dom.navBreadcrumb.textContent = breadcrumbText || 'Back';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (this.onNavigateCallback) {
      this.onNavigateCallback(viewName);
    }
  }

  navigateBack() {
    if (this.state.viewHistory.length === 0) {
      this.navigateTo('view-home');
      return;
    }

    const previous = this.state.viewHistory.pop();
    this.state.currentView = previous.view;

    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    const targetSection = document.getElementById(previous.view);
    if (targetSection) targetSection.classList.add('active');

    if (previous.view === 'view-home') {
      this.dom.navBackBar.style.display = 'none';
    } else {
      this.dom.navBackBar.style.display = 'flex';
      this.dom.navBreadcrumb.textContent = previous.breadcrumb || 'Back';
    }
  }
}

/**
 * Universal Modal Helper with Mobile Hardware Back Button Intercept
 */
export function openModal(modalElement) {
  if (!modalElement) return;
  modalElement.classList.add('active');

  if (!modalElement.dataset.historyPushed) {
    modalElement.dataset.historyPushed = 'true';
    history.pushState({ modalId: modalElement.id }, '');
  }

  const popListener = () => {
    if (modalElement.classList.contains('active')) {
      closeModal(modalElement, false);
    }
  };

  modalElement._popListener = popListener;
  window.addEventListener('popstate', popListener, { once: true });

  modalElement.onclick = (e) => {
    if (e.target === modalElement) {
      closeModal(modalElement, true);
    }
  };
}

export function closeModal(modalElement, triggerHistoryBack = true) {
  if (!modalElement) return;

  if (modalElement._popListener) {
    window.removeEventListener('popstate', modalElement._popListener);
    modalElement._popListener = null;
  }

  if (modalElement.dataset.historyPushed === 'true') {
    delete modalElement.dataset.historyPushed;
    if (triggerHistoryBack && history.state?.modalId === modalElement.id) {
      history.back();
    }
  }

  modalElement.classList.remove('active');
}
