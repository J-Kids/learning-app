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
