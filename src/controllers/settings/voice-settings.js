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

    this.populateOptions();
    ttsPlayer.voiceManager.onVoicesReady = () => this.populateOptions();

    this.dom.selectVoiceAccent?.addEventListener('change', (e) => {
      const name = e.target.value;
      if (name) {
        ttsPlayer.voiceManager.setSelectedVoiceByName(name);
        localStorage.setItem('tts_voice_name', name);
      } else {
        localStorage.removeItem('tts_voice_name');
        ttsPlayer.voiceManager.selectedVoice = null;
      }
      this.updateHint(name);
      this.showToastCallback('Voice accent updated! 🔊');
    });
  }

  populateOptions() {
    const select = this.dom.selectVoiceAccent;
    if (!select) return;

    const voices = ttsPlayer.voiceManager.voices;
    select.innerHTML = '';

    const autoOpt = document.createElement('option');
    autoOpt.value = '';
    autoOpt.textContent = '✨ Auto (best available accent)';
    select.appendChild(autoOpt);

    if (!voices || voices.length === 0) {
      const loadingOpt = document.createElement('option');
      loadingOpt.disabled = true;
      loadingOpt.textContent = 'Loading voices…';
      select.appendChild(loadingOpt);
      return;
    }

    voices.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.name;
      opt.textContent = `${v.name} (${v.lang})`;
      select.appendChild(opt);
    });

    const savedName = localStorage.getItem('tts_voice_name');
    select.value = savedName && voices.some(v => v.name === savedName) ? savedName : '';
    this.updateHint(select.value);
  }

  updateHint(voiceName) {
    if (this.dom.voiceAccentHint) {
      this.dom.voiceAccentHint.textContent = voiceName
        ? `Using "${voiceName}" for all reading.`
        : 'Auto-picks the best Indian-accent voice available on your device.';
    }

    if (this.dom.audioAccentLabel) {
      const voice = ttsPlayer.voiceManager.voices?.find(v => v.name === voiceName);
      const prefix = (voice?.lang || 'en').toLowerCase().slice(0, 2);
      const langMatch = SUPPORTED_LANGUAGES.find(l => l.code === prefix);
      this.dom.audioAccentLabel.textContent = langMatch ? langMatch.flag : '🇮🇳';
    }
  }

  refreshOnOpen() {
    this.populateOptions();
  }
}
