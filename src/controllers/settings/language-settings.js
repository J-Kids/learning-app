/**
 * Translation Language Settings Section
 * Lets the user choose which language new scans get translated into.
 */

import { translationEngine, SUPPORTED_LANGUAGES, getLanguageInfo } from '../../services/translator.js';

export class LanguageSettings {
  constructor(dom, showToastCallback) {
    this.dom = dom;
    this.showToastCallback = showToastCallback;
    this.render();
  }

  render() {
    const list = this.dom.languageOptionsList;
    if (!list) return;

    const activeCode = translationEngine.getTargetLanguage();
    list.innerHTML = '';

    SUPPORTED_LANGUAGES.forEach(lang => {
      const row = document.createElement('button');
      row.className = 'settings-option-row' + (lang.code === activeCode ? ' selected' : '');
      row.innerHTML = `
        <span class="settings-option-flag">${lang.flag}</span>
        <span class="settings-option-label">${lang.name}</span>
        <span class="settings-option-check">✓</span>
      `;
      row.addEventListener('click', () => {
        translationEngine.setTargetLanguage(lang.code);
        this.render();
        this.updateMenuSubtitle();
        this.showToastCallback(`New scans will translate into ${lang.name}`);
      });
      list.appendChild(row);
    });

    this.updateMenuSubtitle();
  }

  updateMenuSubtitle() {
    if (this.dom.menuSubtitleLanguage) {
      this.dom.menuSubtitleLanguage.textContent = getLanguageInfo(translationEngine.getTargetLanguage()).name;
    }
  }

  refreshOnOpen() {
    this.render();
  }
}
