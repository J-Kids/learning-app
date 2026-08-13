/**
 * Offline Engine Settings Section
 * Owns the "always scan offline" toggle and shows offline OCR language-pack
 * status. Only English is bundled today; other languages show as
 * "Coming Soon" - no network downloads happen yet.
 */

import { SUPPORTED_LANGUAGES } from '../../services/translator.js';

export class OfflineEngineSettings {
  constructor(dom, showToastCallback) {
    this.dom = dom;
    this.showToastCallback = showToastCallback;

    this.initToggle();
    this.renderLanguagePacks();
  }

  initToggle() {
    if (!this.dom.checkPreferOffline) return;
    this.dom.checkPreferOffline.checked = localStorage.getItem('prefer_offline_ocr') === 'true';
    this.updateMenuSubtitle();

    this.dom.checkPreferOffline.addEventListener('change', (e) => {
      localStorage.setItem('prefer_offline_ocr', e.target.checked ? 'true' : 'false');
      this.updateMenuSubtitle();
      this.showToastCallback(e.target.checked ? 'Offline scanning preferred ⚡' : 'AI Vision scanning re-enabled ✨');
    });
  }

  renderLanguagePacks() {
    const list = this.dom.languagePackList;
    if (!list) return;
    list.innerHTML = '';

    SUPPORTED_LANGUAGES.forEach(lang => {
      const isEnglish = lang.code === 'en';
      const row = document.createElement('button');
      row.className = 'settings-option-row settings-pack-row' + (isEnglish ? ' settings-pack-row-static' : '');
      row.innerHTML = `
        <span class="settings-option-flag">${lang.flag}</span>
        <span class="settings-option-label">${lang.name}</span>
        <span class="settings-pack-status ${isEnglish ? 'ready' : 'coming-soon'}">${isEnglish ? '✅ Ready' : '📥 Coming Soon'}</span>
      `;
      if (!isEnglish) {
        row.addEventListener('click', () => {
          this.showToastCallback(`Offline ${lang.name} OCR is coming soon! For now, use ✨ AI Vision to scan ${lang.name} pages.`);
        });
      }
      list.appendChild(row);
    });
  }

  updateMenuSubtitle() {
    if (this.dom.menuSubtitleOffline) {
      this.dom.menuSubtitleOffline.textContent = this.dom.checkPreferOffline?.checked ? 'On' : 'Off';
    }
  }

  refreshOnOpen() {
    this.updateMenuSubtitle();
  }
}
