/**
 * Translation Language Settings Section
 * Lets the user choose the source language (what's printed on the page) and
 * the target language (what to translate it into) via a sleek language pair card
 * and searchable dropdown picker.
 */

import { translationEngine, SUPPORTED_LANGUAGES, getLanguageInfo } from '../../services/translator.js';

export class LanguageSettings {
  constructor(dom, showToastCallback) {
    this.dom = dom;
    this.showToastCallback = showToastCallback;
    this.activePicker = null; // 'source' | 'target' | null
    this.searchQuery = '';

    this.bindEvents();
    this.renderSelectors();
    this.updateHint();
  }

  bindEvents() {
    this.dom.btnSourceLangSelector?.addEventListener('click', () => {
      this.togglePicker('source');
    });

    this.dom.btnTargetLangSelector?.addEventListener('click', () => {
      this.togglePicker('target');
    });

    this.dom.btnSwapLanguages?.addEventListener('click', () => {
      this.swapLanguages();
    });

    this.dom.btnLangPickerClose?.addEventListener('click', () => {
      this.closePicker();
    });

    this.dom.langSearchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      if (this.dom.btnLangSearchClear) {
        this.dom.btnLangSearchClear.style.display = this.searchQuery ? 'flex' : 'none';
      }
      this.renderDropdownList();
    });

    this.dom.btnLangSearchClear?.addEventListener('click', () => {
      if (this.dom.langSearchInput) {
        this.dom.langSearchInput.value = '';
        this.searchQuery = '';
        this.dom.btnLangSearchClear.style.display = 'none';
        this.dom.langSearchInput.focus();
      }
      this.renderDropdownList();
    });

    this.dom.langSearchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closePicker();
      }
    });

    // Close picker when clicking outside within settings drawer
    document.addEventListener('click', (e) => {
      if (!this.activePicker) return;
      const isClickInsidePicker = this.dom.langPickerDropdown?.contains(e.target);
      const isClickOnSourceBtn = this.dom.btnSourceLangSelector?.contains(e.target);
      const isClickOnTargetBtn = this.dom.btnTargetLangSelector?.contains(e.target);
      const isClickOnSwapBtn = this.dom.btnSwapLanguages?.contains(e.target);

      if (!isClickInsidePicker && !isClickOnSourceBtn && !isClickOnTargetBtn && !isClickOnSwapBtn) {
        this.closePicker();
      }
    });
  }

  togglePicker(mode) {
    if (this.activePicker === mode) {
      this.closePicker();
    } else {
      this.openPicker(mode);
    }
  }

  openPicker(mode) {
    this.activePicker = mode;

    if (this.dom.langPickerTitle) {
      this.dom.langPickerTitle.textContent = mode === 'source'
        ? '📖 Select Source (On Page)'
        : '🌐 Select Target (Translate Into)';
    }

    if (this.dom.btnSourceLangSelector) {
      this.dom.btnSourceLangSelector.classList.toggle('active', mode === 'source');
    }
    if (this.dom.btnTargetLangSelector) {
      this.dom.btnTargetLangSelector.classList.toggle('active', mode === 'target');
    }

    // Reposition the dropdown inline right after the active row
    const dropdown = this.dom.langPickerDropdown;
    if (dropdown) {
      if (mode === 'source' && this.dom.langSourceRow) {
        this.dom.langSourceRow.insertAdjacentElement('afterend', dropdown);
      } else if (mode === 'target' && this.dom.langTargetRow) {
        this.dom.langTargetRow.insertAdjacentElement('afterend', dropdown);
      }
    }

    // Reset search
    this.searchQuery = '';
    if (this.dom.langSearchInput) {
      this.dom.langSearchInput.value = '';
      this.dom.langSearchInput.placeholder = mode === 'source'
        ? 'Search source language...'
        : 'Search target language...';
    }
    if (this.dom.btnLangSearchClear) {
      this.dom.btnLangSearchClear.style.display = 'none';
    }

    if (dropdown) {
      dropdown.style.display = 'block';
    }

    this.renderDropdownList();

    // Auto-focus search input
    setTimeout(() => {
      this.dom.langSearchInput?.focus();
    }, 50);
  }

  closePicker() {
    this.activePicker = null;
    if (this.dom.langPickerDropdown) {
      this.dom.langPickerDropdown.style.display = 'none';
    }
    this.dom.btnSourceLangSelector?.classList.remove('active');
    this.dom.btnTargetLangSelector?.classList.remove('active');
  }

  renderSelectors() {
    const sourceCode = translationEngine.getSourceLanguage();
    const targetCode = translationEngine.getTargetLanguage();
    const sourceInfo = getLanguageInfo(sourceCode);
    const targetInfo = getLanguageInfo(targetCode);

    if (this.dom.sourceLangFlag) this.dom.sourceLangFlag.textContent = sourceInfo.flag;
    if (this.dom.sourceLangName) this.dom.sourceLangName.textContent = sourceInfo.name;

    if (this.dom.targetLangFlag) this.dom.targetLangFlag.textContent = targetInfo.flag;
    if (this.dom.targetLangName) this.dom.targetLangName.textContent = targetInfo.name;

    this.updateMenuSubtitle();
  }

  renderDropdownList() {
    const list = this.dom.languageDropdownList;
    if (!list) return;

    const activeCode = this.activePicker === 'source'
      ? translationEngine.getSourceLanguage()
      : translationEngine.getTargetLanguage();

    const q = this.searchQuery.trim().toLowerCase();
    const filtered = SUPPORTED_LANGUAGES.filter(lang => {
      if (!q) return true;
      return (
        lang.name.toLowerCase().includes(q) ||
        lang.nativeLabel.toLowerCase().includes(q) ||
        lang.code.toLowerCase().includes(q)
      );
    });

    list.innerHTML = '';

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'lang-empty-state';
      empty.textContent = `No languages found for "${this.searchQuery}"`;
      list.appendChild(empty);
      return;
    }

    filtered.forEach(lang => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'settings-option-row' + (lang.code === activeCode ? ' selected' : '');
      row.innerHTML = `
        <span class="settings-option-flag">${lang.flag}</span>
        <span class="settings-option-label">${lang.name}</span>
        <span class="lang-native-tag">${lang.nativeLabel}</span>
        <span class="settings-option-check">✓</span>
      `;
      row.addEventListener('click', () => {
        if (this.activePicker === 'source') {
          translationEngine.setSourceLanguage(lang.code);
          this.showToastCallback(`Source language set to ${lang.name}`);
        } else {
          translationEngine.setTargetLanguage(lang.code);
          this.showToastCallback(`Translate into ${lang.name}`);
        }
        this.renderSelectors();
        this.closePicker();
        this.updateHint();
      });
      list.appendChild(row);
    });
  }

  swapLanguages() {
    const currentSource = translationEngine.getSourceLanguage();
    const currentTarget = translationEngine.getTargetLanguage();

    translationEngine.setSourceLanguage(currentTarget);
    translationEngine.setTargetLanguage(currentSource);

    this.renderSelectors();
    this.updateHint();

    const newSourceInfo = getLanguageInfo(currentTarget);
    const newTargetInfo = getLanguageInfo(currentSource);
    this.showToastCallback(`Swapped: ${newSourceInfo.name} ⇄ ${newTargetInfo.name}`);

    if (this.activePicker) {
      this.renderDropdownList();
    }
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
    this.closePicker();
    this.renderSelectors();
    this.updateHint();
  }
}
