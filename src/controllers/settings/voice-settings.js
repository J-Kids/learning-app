/**
 * Voice Accent Settings Section
 * Lets the user manually pick a TTS voice instead of relying on auto-detection.
 */

import { ttsPlayer } from '../../services/tts/tts-engine.js';
import { SUPPORTED_LANGUAGES } from '../../services/translator.js';

export class VoiceSettings {
  constructor(dom, showToastCallback) {
    this.dom = dom;
    this.showToastCallback = showToastCallback;

    this.render();
    ttsPlayer.voiceManager.onVoicesReady = () => this.render();
  }

  render() {
    const list = this.dom.voiceOptionsList;
    if (!list) return;

    const voices = ttsPlayer.voiceManager.voices;
    const activeName = ttsPlayer.voiceManager.selectedVoice?.name || '';
    list.innerHTML = '';

    const autoRow = document.createElement('button');
    autoRow.className = 'settings-option-row' + (activeName ? '' : ' selected');
    autoRow.innerHTML = `
      <span class="settings-option-flag">✨</span>
      <span class="settings-option-label">Auto (best available accent)</span>
      <span class="settings-option-check">✓</span>
    `;
    autoRow.addEventListener('click', () => this.selectVoice(''));
    list.appendChild(autoRow);

    if (!voices || voices.length === 0) {
      const loadingRow = document.createElement('div');
      loadingRow.className = 'settings-section-hint';
      loadingRow.style.padding = '8px 4px';
      loadingRow.textContent = 'Loading available voices…';
      list.appendChild(loadingRow);
      return;
    }

    voices.forEach(v => {
      const row = document.createElement('button');
      row.className = 'settings-option-row' + (v.name === activeName ? ' selected' : '');
      row.innerHTML = `
        <span class="settings-option-flag">${this.flagFor(v.lang)}</span>
        <span class="settings-option-label">${v.name} (${v.lang})</span>
        <span class="settings-option-check">✓</span>
      `;
      row.addEventListener('click', () => this.selectVoice(v.name));
      list.appendChild(row);
    });

    this.updateMenuSubtitle(activeName);
  }

  flagFor(lang) {
    const prefix = (lang || '').toLowerCase().slice(0, 2);
    const match = SUPPORTED_LANGUAGES.find(l => l.code === prefix);
    return match ? match.flag : '🇮🇳';
  }

  selectVoice(name) {
    if (name) {
      ttsPlayer.voiceManager.setSelectedVoiceByName(name);
      localStorage.setItem('tts_voice_name', name);
    } else {
      localStorage.removeItem('tts_voice_name');
      ttsPlayer.voiceManager.selectedVoice = null;
    }
    this.render();
    this.showToastCallback('Voice accent updated! 🔊');
  }

  updateMenuSubtitle(activeName) {
    if (this.dom.menuSubtitleVoice) {
      this.dom.menuSubtitleVoice.textContent = activeName || 'Auto';
    }
    if (this.dom.audioAccentLabel) {
      const voice = ttsPlayer.voiceManager.voices?.find(v => v.name === activeName);
      this.dom.audioAccentLabel.textContent = voice ? this.flagFor(voice.lang) : '🇮🇳';
    }
  }

  refreshOnOpen() {
    this.render();
  }
}
