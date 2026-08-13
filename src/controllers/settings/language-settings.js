/**
 * Translation Language Settings Section
 * Lets the user choose the source language (what's printed on the page) and
 * the target language (what to translate it into) independently.
 */

import { translationEngine, SUPPORTED_LANGUAGES, getLanguageInfo } from '../../services/translator.js';

export class LanguageSettings {
  constructor(dom, showToastCallback) {
    this.dom = dom;
    this.showToastCallback = showToastCallback;
    this.renderSource();
    this.renderTarget();
    this.updateHint();
  }

  renderSource() {
    const list = this.dom.sourceLanguageOptionsList;
    if (!list) return;

    const activeCode = translationEngine.getSourceLanguage();
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
        translationEngine.setSourceLanguage(lang.code);
        this.renderSource();
        this.updateMenuSubtitle();
        this.updateHint();
        this.showToastCallback(`Source language set to ${lang.name}`);
      });
      list.appendChild(row);
    });

    this.updateMenuSubtitle();
  }

  renderTarget() {
    const list = this.dom.targetLanguageOptionsList;
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
        this.renderTarget();
        this.updateMenuSubtitle();
        this.showToastCallback(`New scans will translate into ${lang.name}`);
      });
      list.appendChild(row);
    });

    this.updateMenuSubtitle();
  }

  updateMenuSubtitle() {
    if (!this.dom.menuSubtitleLanguage) return;
    const sourceName = getLanguageInfo(translationEngine.getSourceLanguage()).name;
    const targetName = getLanguageInfo(translationEngine.getTargetLanguage()).name;
    this.dom.menuSubtitleLanguage.textContent = `${sourceName} → ${targetName}`;
  }

  updateHint() {
    if (!this.dom.languageDirectionHint) return;
    const sourceCode = translationEngine.getSourceLanguage();
    const preferOffline = this.dom.checkPreferOffline?.checked;

    if (sourceCode !== 'en' && preferOffline) {
      const sourceName = getLanguageInfo(sourceCode).name;
      this.dom.languageDirectionHint.textContent = `⚠️ ${sourceName} → English needs ✨ AI Vision — Local OCR only reads English text.`;
    } else {
      this.dom.languageDirectionHint.textContent = '';
    }
  }

  refreshOnOpen() {
    this.renderSource();
    this.renderTarget();
    this.updateHint();
  }
}
