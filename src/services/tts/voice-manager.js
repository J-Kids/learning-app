/**
 * Speech Synthesis Voice Loader & Matcher
 * Finds matching Indian accent voices (en-IN and hi-IN) on Web Speech API,
 * with generic locale-based matching for the other supported languages.
 */

export const LANGUAGE_LOCALES = {
  en: 'en-IN',
  hi: 'hi-IN',
  kn: 'kn-IN',
  mr: 'mr-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  bn: 'bn-IN',
  gu: 'gu-IN',
  es: 'es-ES',
  fr: 'fr-FR'
};

export class VoiceManager {
  constructor(synth) {
    this.synth = synth;
    this.voices = [];
    this.selectedVoice = null;
    this.pendingVoiceName = null;
    this.onVoicesReady = null;
    this.loadVoices();
  }

  loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => {
        this.voices = this.synth.getVoices();
        if (this.pendingVoiceName) {
          this.setSelectedVoiceByName(this.pendingVoiceName);
        }
        if (this.onVoicesReady) this.onVoicesReady();
      };
    }
  }

  getVoiceForLanguage(langCode) {
    if (!this.voices || this.voices.length === 0) {
      this.voices = this.synth.getVoices();
    }

    const isHindi = (langCode === 'hi');
    const isEnglish = (langCode === 'en' || !langCode);

    if (this.selectedVoice) {
      const selLang = (this.selectedVoice.lang || '').toLowerCase().replace('-', '_');
      const selName = (this.selectedVoice.name || '').toLowerCase();
      if (isHindi && (selLang.includes('hi') || selName.includes('hindi'))) {
        return this.selectedVoice;
      } else if (isEnglish && (selLang.includes('en') || !selLang.includes('hi'))) {
        return this.selectedVoice;
      } else if (!isHindi && !isEnglish && selLang.startsWith(langCode)) {
        return this.selectedVoice;
      }
    }

    if (!isHindi && !isEnglish) {
      // Generic locale-prefix match for the other supported languages (Kannada, Marathi, Tamil,
      // Telugu, Bengali, Gujarati, Spanish, French, ...). Most devices won't have every regional
      // Indian voice pack installed, so this may legitimately find nothing — callers already fall
      // back to a locale-hinted default voice (see LANGUAGE_LOCALES) when this returns null.
      return this.voices.find(v => (v.lang || '').toLowerCase().startsWith(langCode)) || null;
    }

    if (isHindi) {
      const hiInVoice = this.voices.find(v => {
        const lang = (v.lang || '').toLowerCase().replace('-', '_');
        const name = (v.name || '').toLowerCase();
        return (
          lang === 'hi_in' ||
          lang.startsWith('hi_in') ||
          lang.startsWith('hi') ||
          name.includes('hindi') ||
          name.includes('hi_in') ||
          name.includes('kalpana') ||
          name.includes('hemant')
        );
      });
      if (hiInVoice) return hiInVoice;

      const hiVoice = this.voices.find(v => (v.lang || '').toLowerCase().startsWith('hi') || (v.name || '').toLowerCase().includes('hindi'));
      if (hiVoice) return hiVoice;
    } else {
      // Primary Search: Comprehensive Indian English accent voice match across all OS platforms
      const enInVoice = this.voices.find(v => {
        const lang = (v.lang || '').toLowerCase().replace('-', '_');
        const name = (v.name || '').toLowerCase();
        return (
          lang === 'en_in' ||
          lang.startsWith('en_in') ||
          name.includes('english india') ||
          name.includes('english (india)') ||
          name.includes('india') ||
          name.includes('indian') ||
          name.includes('heera') ||
          name.includes('ravi') ||
          name.includes('veena') ||
          name.includes('rishi') ||
          name.includes('sangeeta') ||
          name.includes('neerja') ||
          name.includes('prabhat')
        );
      });
      if (enInVoice) return enInVoice;

      // Secondary Search: Any voice with 'in' in locale tag
      const enInFallback = this.voices.find(v => (v.lang || '').toLowerCase().includes('in'));
      if (enInFallback) return enInFallback;

      // Fallback: English US over generic UK
      const enUsVoice = this.voices.find(v => {
        const lang = (v.lang || '').toLowerCase().replace('-', '_');
        return lang === 'en_us' || lang.startsWith('en_us');
      });
      if (enUsVoice) return enUsVoice;

      // Final fallback
      const enVoice = this.voices.find(v => (v.lang || '').toLowerCase().startsWith('en'));
      if (enVoice) return enVoice;
    }
    return null;
  }

  getAvailableVoicesForLanguage(langCode) {
    if (!this.voices || this.voices.length === 0) {
      this.voices = this.synth.getVoices();
    }
    const prefix = langCode === 'en' ? 'en' : langCode;
    return this.voices.filter(v => (v.lang || '').toLowerCase().startsWith(prefix));
  }

  setSelectedVoiceByName(voiceName) {
    const found = this.voices.find(v => v.name === voiceName);
    if (found) {
      this.selectedVoice = found;
      this.pendingVoiceName = null;
    } else {
      // Voices may not be loaded yet (speechSynthesis.getVoices() is often empty
      // until 'onvoiceschanged' fires) - remember the name and retry then.
      this.pendingVoiceName = voiceName;
    }
  }
}
