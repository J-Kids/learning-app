/**
 * Speech Synthesis Voice Loader & Matcher
 * Finds matching Indian accent voices (en-IN and hi-IN) on Web Speech API.
 */

export class VoiceManager {
  constructor(synth) {
    this.synth = synth;
    this.voices = [];
    this.selectedVoice = null;
    this.loadVoices();
  }

  loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => {
        this.voices = this.synth.getVoices();
      };
    }
  }

  getVoiceForLanguage(langCode) {
    if (!this.voices || this.voices.length === 0) {
      this.voices = this.synth.getVoices();
    }

    const isHindi = (langCode === 'hi');

    if (this.selectedVoice) {
      const selLang = (this.selectedVoice.lang || '').toLowerCase().replace('-', '_');
      const selName = (this.selectedVoice.name || '').toLowerCase();
      if (isHindi && (selLang.includes('hi') || selName.includes('hindi'))) {
        return this.selectedVoice;
      } else if (!isHindi && (selLang.includes('en') || !selLang.includes('hi'))) {
        return this.selectedVoice;
      }
    }

    if (isHindi) {
      const hiInVoice = this.voices.find(v => {
        const lang = (v.lang || '').toLowerCase().replace('-', '_');
        const name = (v.name || '').toLowerCase();
        return lang === 'hi_in' || lang.startsWith('hi_in') || name.includes('hindi india') || name.includes('hi_in');
      });
      if (hiInVoice) return hiInVoice;

      const hiVoice = this.voices.find(v => (v.lang || '').toLowerCase().startsWith('hi') || (v.name || '').toLowerCase().includes('hindi'));
      if (hiVoice) return hiVoice;
    } else {
      const enInVoice = this.voices.find(v => {
        const lang = (v.lang || '').toLowerCase().replace('-', '_');
        const name = (v.name || '').toLowerCase();
        return lang === 'en_in' || lang.startsWith('en_in') || name.includes('english india');
      });
      if (enInVoice) return enInVoice;

      const enVoice = this.voices.find(v => (v.lang || '').toLowerCase().startsWith('en'));
      if (enVoice) return enVoice;
    }
    return null;
  }

  setSelectedVoiceByName(voiceName) {
    const found = this.voices.find(v => v.name === voiceName);
    if (found) {
      this.selectedVoice = found;
    }
  }
}
