/**
 * Chapter Reader View Manager
 * Handles sentence tokenization, word tap pronunciation, language tab switching, and page editing.
 */

import { ttsPlayer } from '../services/tts/tts-engine.js';
import { prepareSentences } from '../services/tts/speech-formatter.js';
import { learningDB } from '../services/storage/learning-db.js';
import { translationEngine } from '../services/translator.js';
import { openModal, closeModal } from './navigation.js';

export class ReaderViewManager {
  constructor(dom, state, router, showToastCallback) {
    this.dom = dom;
    this.state = state;
    this.router = router;
    this.showToastCallback = showToastCallback;
  }

  openReaderForPages(pages, chapterTitle, isTemporary = false) {
    this.state.currentChapterPages = pages;
    this.state.currentPageIndex = 0;
    this.state.currentLanguage = 'en';

    this.dom.readerChapterTitle.textContent = chapterTitle;
    this.dom.btnLangEn.classList.add('active');
    this.dom.btnLangHi.classList.remove('active');

    if (isTemporary) {
      this.dom.tempScanHeaderBanner.style.display = 'flex';
      this.state.temporaryPagesData = pages;
    } else {
      this.dom.tempScanHeaderBanner.style.display = 'none';
      this.state.temporaryPagesData = null;
    }

    this.renderCurrentReaderPage();
    this.router.navigateTo('view-chapter', chapterTitle);
  }

  renderCurrentReaderPage() {
    if (this.state.currentChapterPages.length === 0) return;

    const page = this.state.currentChapterPages[this.state.currentPageIndex];
    const isHindi = (this.state.currentLanguage === 'hi');
    const textToDisplay = isHindi ? (page.textHi || 'No Hindi translation available.') : (page.textEn || 'No text extracted.');

    this.dom.readerPageIndicator.textContent = `Page ${this.state.currentPageIndex + 1} of ${this.state.currentChapterPages.length}`;
    this.dom.textContentBox.innerHTML = '';

    const engineBadge = page.engineUsed || '✨ AI Vision Scan';
    const badgeBar = document.createElement('div');
    badgeBar.style.cssText = 'display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-bottom: 10px; opacity: 0.8;';
    badgeBar.innerHTML = `
      <span class="engine-badge" style="background: #F1F5F9; padding: 2px 8px; border-radius: 99px; font-weight: 700;">${engineBadge}</span>
      <span style="color: var(--text-muted);">Class 2 Reader</span>
    `;
    this.dom.textContentBox.appendChild(badgeBar);

    // Split on newlines first to preserve the line structure from the textbook image.
    const lines = textToDisplay.split('\n');

    // Build a flat list of all sentences with their original sentence index for audio playback.
    let globalSentenceIdx = 0;
    lines.forEach((lineText, lineIdx) => {
      const trimmedLine = lineText.trim();
      if (!trimmedLine) return;

      const sentences = prepareSentences(trimmedLine);
      const lineSentences = sentences.length > 0 ? sentences : [trimmedLine];

      lineSentences.forEach((sent) => {
        const sentenceSpan = document.createElement('span');
        sentenceSpan.className = 'sentence-item';
        const capturedIdx = globalSentenceIdx;

        const words = sent.split(/(\s+)/);
        words.forEach(token => {
          if (token.trim().length > 0) {
            const wordSpan = document.createElement('span');
            wordSpan.className = 'word-item';
            wordSpan.textContent = token;

            wordSpan.addEventListener('click', (e) => {
              e.stopPropagation();
              document.querySelectorAll('.word-item').forEach(w => w.classList.remove('active-word'));
              wordSpan.classList.add('active-word');
              ttsPlayer.speakSingleWord(token, this.state.currentLanguage);
            });
            sentenceSpan.appendChild(wordSpan);
          } else {
            sentenceSpan.appendChild(document.createTextNode(token));
          }
        });

        sentenceSpan.addEventListener('click', (e) => {
          if (e.target.classList.contains('word-item')) return;
          if (window.app && window.app.startAudioPlayback) {
            window.app.startAudioPlayback(capturedIdx);
          }
        });

        this.dom.textContentBox.appendChild(sentenceSpan);
        this.dom.textContentBox.appendChild(document.createTextNode(' '));
        globalSentenceIdx++;
      });

      // After each image line, insert a line break (except after the last line)
      if (lineIdx < lines.length - 1) {
        this.dom.textContentBox.appendChild(document.createElement('br'));
      }
    });
  }

  switchReaderLanguage(lang) {
    this.state.currentLanguage = lang;
    ttsPlayer.stop();

    if (lang === 'hi') {
      this.dom.btnLangHi.classList.add('active');
      this.dom.btnLangEn.classList.remove('active');
    } else {
      this.dom.btnLangEn.classList.add('active');
      this.dom.btnLangHi.classList.remove('active');
    }

    if (window.app && window.app.updatePlayButtonState) {
      window.app.updatePlayButtonState(false);
    }
    this.renderCurrentReaderPage();
  }

  openEditTextModal() {
    if (this.state.currentChapterPages.length === 0) return;
    const page = this.state.currentChapterPages[this.state.currentPageIndex];
    this.dom.inputPageTextEdit.value = page.textEn || '';
    openModal(this.dom.modalEditText);
  }

  async handleSavePageTextEdit() {
    if (this.state.currentChapterPages.length === 0) return;
    const newEnText = this.dom.inputPageTextEdit.value.trim();
    const page = this.state.currentChapterPages[this.state.currentPageIndex];

    page.textEn = newEnText;
    page.textHi = await translationEngine.translateToHindi(newEnText);

    if (page.id) {
      await learningDB.savePage(page);
    }

    closeModal(this.dom.modalEditText);
    this.renderCurrentReaderPage();
    this.showToastCallback('Page text updated! ✨');
  }
}
