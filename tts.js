/**
 * Kids Learning App - Bilingual Indian Accent Speech Synthesis Engine
 * Supports en-IN (English India) & hi-IN (Hindi India)
 * Features voice selection (Male/Female Indian accents), sentence sync & 0.7x slow rate mode
 */

class TtsPlayerEngine {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.selectedVoice = null;
    this.currentUtterance = null;
    
    // Player State
    this.isPlaying = false;
    this.isPaused = false;
    this.currentLanguage = 'en'; // 'en' or 'hi'
    this.speechRate = 0.7; // Default 0.7x slow reading mode for 2nd graders
    
    // Sentence sync
    this.sentences = [];
    this.currentSentenceIndex = 0;
    this.onSentenceHighlight = null; // Callback (sentenceIndex) => void
    this.onEndCallback = null;

    this.initVoices();
  }

  initVoices() {
    if (!this.synth) {
      console.warn('Web Speech Synthesis API not supported in this browser.');
      return;
    }

    const loadVoices = () => {
      this.voices = this.synth.getVoices();
      if (window.app && typeof window.app.populateVoiceDropdown === 'function') {
        window.app.populateVoiceDropdown();
      }
    };

    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  /**
   * Get all voices matching Indian locales or English/Hindi
   */
  getIndianVoices() {
    if (!this.voices || this.voices.length === 0) {
      this.voices = this.synth.getVoices();
    }

    return this.voices.filter(v => {
      const name = v.name.toLowerCase();
      const lang = v.lang.toLowerCase();
      return (
        lang.includes('in') ||
        lang.includes('hi') ||
        name.includes('india') ||
        name.includes('heera') ||
        name.includes('ravi') ||
        name.includes('neerja') ||
        name.includes('prabhat')
      );
    });
  }

  /**
   * Find best matching voice for English or Hindi
   */
  getVoiceForLanguage(langCode) {
    if (!this.voices || this.voices.length === 0) {
      this.voices = this.synth.getVoices();
    }

    const isHindi = (langCode === 'hi');

    // User selected voice check
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
      // Find Hindi India voice (hi_IN / hi-IN / Hindi India)
      const hiInVoice = this.voices.find(v => {
        const lang = (v.lang || '').toLowerCase().replace('-', '_');
        const name = (v.name || '').toLowerCase();
        return lang === 'hi_in' || lang.startsWith('hi_in') || name.includes('hindi india') || name.includes('hi_in');
      });
      if (hiInVoice) return hiInVoice;

      // Fallback to any Hindi voice
      const hiVoice = this.voices.find(v => (v.lang || '').toLowerCase().startsWith('hi') || (v.name || '').toLowerCase().includes('hindi'));
      if (hiVoice) return hiVoice;
    } else {
      // Find English India voice (en_IN / en-IN / English India)
      const enInVoice = this.voices.find(v => {
        const lang = (v.lang || '').toLowerCase().replace('-', '_');
        const name = (v.name || '').toLowerCase();
        return lang === 'en_in' || lang.startsWith('en_in') || name.includes('english india');
      });
      if (enInVoice) return enInVoice;

      // Fallback to any English voice (en-US, en-GB, etc.) — DO NOT match hi-IN Hindi voice!
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

  /**
   * Convert standalone digits 0-20 to English words so numbers are never read as Ek, Do in English mode
   */
  numberToEnglishWord(numStr) {
    const num = parseInt(numStr, 10);
    const words = [
      'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
      'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'
    ];
    if (!isNaN(num) && num >= 0 && num <= 20) {
      return words[num];
    }
    return numStr;
  }

  formatTextForSpeech(text, lang = 'en') {
    if (!text) return '';
    if (lang === 'en') {
      return text.replace(/\b([0-9]|1[0-9]|20)\b/g, (match) => this.numberToEnglishWord(match));
    }
    return text;
  }

  /**
   * Split paragraph text into sentences for sentence-by-sentence reading
   */
  prepareSentences(text) {
    if (!text) return [];
    return text
      .replace(/([.?!।])\s*(?=[A-Z0-9\u0900-\u097F])/g, "$1|")
      .split("|")
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Pronounce a single word immediately on tap
   */
  speakSingleWord(wordText, lang = 'en') {
    if (!wordText || !wordText.trim()) return;
    this.stop(); // Stop ongoing sentence playback
    const cleanWord = wordText.replace(/^[^a-zA-Z0-9\u0900-\u097F]+|[^a-zA-Z0-9\u0900-\u097F]+$/g, '');
    if (!cleanWord) return;

    const speechLang = lang || this.currentLanguage;
    const textToSpeak = this.formatTextForSpeech(cleanWord, speechLang);
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.75; // Slightly slower, clear rate for individual word learning
    utterance.pitch = 1.0;

    const voice = this.getVoiceForLanguage(speechLang);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = (speechLang === 'hi') ? 'hi-IN' : 'en-IN';
    }

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  /**
   * Start reading sentences with sentence highlighting
   */
  speakText(fullText, lang = 'en', onSentenceHighlight = null, onEndCallback = null, startFromIndex = 0) {
    if (this.synth) {
      this.synth.cancel();
    }

    if (!fullText || !fullText.trim()) return;

    this.currentLanguage = lang;
    this.onSentenceHighlight = onSentenceHighlight;
    this.onEndCallback = onEndCallback;

    this.sentences = this.prepareSentences(fullText);
    this.currentSentenceIndex = startFromIndex;
    this.isPlaying = true;
    this.isPaused = false;

    this.playNextSentence();
  }

  playNextSentence() {
    if (!this.isPlaying || this.currentSentenceIndex >= this.sentences.length) {
      this.isPlaying = false;
      this.isPaused = false;
      this.currentSentenceIndex = 0;
      if (this.onSentenceHighlight) this.onSentenceHighlight(-1);
      if (this.onEndCallback) this.onEndCallback();
      return;
    }

    const sentenceText = this.sentences[this.currentSentenceIndex];

    if (this.onSentenceHighlight) {
      this.onSentenceHighlight(this.currentSentenceIndex);
    }

    const textToSpeak = this.formatTextForSpeech(sentenceText, this.currentLanguage);
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = this.speechRate;
    utterance.pitch = 1.0;

    const voice = this.getVoiceForLanguage(this.currentLanguage);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = this.currentLanguage === 'hi' ? 'hi-IN' : 'en-IN';
    }

    utterance.onend = () => {
      if (this.isPlaying && !this.isPaused) {
        this.currentSentenceIndex++;
        setTimeout(() => this.playNextSentence(), 350);
      }
    };

    utterance.onerror = (event) => {
      console.warn('Utterance error:', event);
      if (this.isPlaying) {
        this.currentSentenceIndex++;
        this.playNextSentence();
      }
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  pause() {
    this.isPlaying = false;
    this.isPaused = true;
    if (this.synth) {
      this.synth.cancel(); // Cancel current utterance safely across all browsers
    }
  }

  resume() {
    if (this.sentences && this.sentences.length > 0 && this.currentSentenceIndex < this.sentences.length) {
      this.isPlaying = true;
      this.isPaused = false;
      this.playNextSentence();
    } else {
      this.stop();
    }
  }

  stop() {
    this.isPlaying = false;
    this.isPaused = false;
    this.currentSentenceIndex = 0;
    if (this.synth) {
      this.synth.cancel();
    }
    if (this.onSentenceHighlight) {
      this.onSentenceHighlight(-1);
    }
  }

  setRate(rate) {
    this.speechRate = parseFloat(rate);
    if (this.isPlaying && !this.isPaused) {
      this.synth.cancel();
      this.playNextSentence();
    }
  }
}

window.ttsPlayer = new TtsPlayerEngine();
