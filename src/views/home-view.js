/**
 * Home View Manager
 * Renders subjects grid, recent chapters list, and handles subject creation.
 */

import { learningDB } from '../services/storage/learning-db.js';

export class HomeViewManager {
  constructor(dom, state, router, openChapterCallback, showToastCallback) {
    this.dom = dom;
    this.state = state;
    this.router = router;
    this.openChapterCallback = openChapterCallback;
    this.showToastCallback = showToastCallback;
  }

  async loadHomeData() {
    await this.renderSubjectsGrid();
    await this.renderRecentChapters();
  }

  async renderSubjectsGrid() {
    const subjects = await learningDB.getAllSubjects();
    this.dom.subjectsGrid.innerHTML = '';

    for (const sub of subjects) {
      const chapters = await learningDB.getChaptersBySubject(sub.id);
      const card = document.createElement('div');
      card.className = 'subject-card';
      card.dataset.id = sub.id;

      card.innerHTML = `
        <div class="subject-icon-wrapper" style="background: var(--accent-${sub.theme || 'purple'}-soft);">
          ${sub.icon}
        </div>
        <div class="subject-name">${sub.name}</div>
        <div class="subject-chapter-count">${chapters.length} ${chapters.length === 1 ? 'Chapter' : 'Chapters'}</div>
      `;

      card.addEventListener('click', () => this.openSubjectDetail(sub));
      this.dom.subjectsGrid.appendChild(card);
    }
  }

  async renderRecentChapters() {
    const allChapters = await learningDB.getAllChapters();
    this.dom.chaptersListRecent.innerHTML = '';

    if (allChapters.length === 0) {
      this.dom.chaptersListRecent.innerHTML = `
        <div style="text-align:center; padding: 24px; color: var(--text-muted);">
          No chapters saved yet. Tap <strong>Scan Book</strong> to create your first textbook page!
        </div>
      `;
      return;
    }

    allChapters.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const recent = allChapters.slice(0, 5);

    for (const chap of recent) {
      const card = document.createElement('div');
      card.className = 'chapter-card';

      card.innerHTML = `
        <div class="chapter-info">
          <h4>${chap.title}</h4>
          <p>${chap.pageCount || 1} Pages • Saved Recently</p>
        </div>
        <div class="chapter-play-badge">▶</div>
      `;

      card.addEventListener('click', () => this.openChapterCallback(chap.id));
      this.dom.chaptersListRecent.appendChild(card);
    }
  }

  async openSubjectDetail(subject) {
    this.state.selectedSubjectId = subject.id;
    this.dom.subjectDetailName.textContent = subject.name;

    const chapters = await learningDB.getChaptersBySubject(subject.id);
    this.dom.chaptersListSubject.innerHTML = '';

    if (chapters.length === 0) {
      this.dom.chaptersListSubject.innerHTML = `
        <div style="text-align:center; padding: 24px; color: var(--text-muted);">
          No chapters in ${subject.name} yet. Tap Scan Book above to add one!
        </div>
      `;
    } else {
      chapters.forEach(chap => {
        const card = document.createElement('div');
        card.className = 'chapter-card';
        card.innerHTML = `
          <div class="chapter-info">
            <h4>${chap.title}</h4>
            <p>${chap.pageCount || 1} Pages</p>
          </div>
          <div class="chapter-play-badge">▶</div>
        `;
        card.addEventListener('click', () => this.openChapterCallback(chap.id));
        this.dom.chaptersListSubject.appendChild(card);
      });
    }

    this.router.navigateTo('view-subject', subject.name);
  }

  async handleCreateSubject() {
    const name = this.dom.inputSubjectName.value.trim();
    if (!name) {
      alert('Please enter a subject name.');
      return;
    }

    const icon = this.dom.selectSubjectIcon.value || '📖';
    const theme = this.dom.selectSubjectTheme.value || 'purple';
    const newSub = {
      id: `sub_${Date.now()}`,
      name,
      icon,
      theme
    };

    await learningDB.saveSubject(newSub);
    this.dom.modalAddSubject.classList.remove('active');
    this.dom.inputSubjectName.value = '';
    this.showToastCallback('New Subject added! 🎉');
    await this.renderSubjectsGrid();
  }
}
