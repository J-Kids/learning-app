/**
 * Translation Language Settings Section
 * Lets the user choose which language new scans get translated into.
 */

import { translationEngine, SUPPORTED_LANGUAGES } from '../../services/translator.js';

export class LanguageSettings {
  constructor(dom, showToastCallback) {
    this.dom = dom;
    this.showToastCallback = showToastCallback;
    this.populateOptions();

    this.dom.selectTargetLanguage?.addEventListener('change', (e) => {
      translationEngine.setTargetLanguage(e.target.value);
      this.showToastCallback(`New scans will translate into ${e.target.options[e.target.selectedIndex].text}`);
    });
  }

  populateOptions() {
    const select = this.dom.selectTargetLanguage;
    if (!select) return;

    select.innerHTML = '';
    SUPPORTED_LANGUAGES.forEach(lang => {
      const opt = document.createElement('option');
      opt.value = lang.code;
      opt.textContent = `${lang.flag} ${lang.name}`;
      select.appendChild(opt);
    });

    select.value = translationEngine.getTargetLanguage();
  }

  refreshOnOpen() {
    if (this.dom.selectTargetLanguage) {
      this.dom.selectTargetLanguage.value = translationEngine.getTargetLanguage();
    }
  }
}
