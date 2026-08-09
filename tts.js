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

    // If user explicitly picked a voice from dropdown
    if (this.selectedVoice) {
      if (langCode === 'hi' && (this.selectedVoice.lang.includes('hi') || this.selectedVoice.name.toLowerCase().includes('hindi'))) {
        return this.selectedVoice;
      } else if (langCode === 'en' && (this.selectedVoice.lang.includes('en') || !this.selectedVoice.lang.includes('hi'))) {
        return this.selectedVoice;
      }
    }

    if (langCode === 'hi') {
      // Find Hindi voice
      const hiVoice = this.voices.find(v => 
        v.lang === 'hi-IN' || v.lang === 'hi_IN' || v.lang.startsWith('hi') || v.name.toLowerCase().includes('hindi')
      );
      if (hiVoice) return hiVoice;
    } else {
      // Find Indian Accent English voice (Search for en-IN or India in name)
      const enInVoices = this.voices.filter(v => 
        v.lang === 'en-IN' || v.lang === 'en_IN' || v.name.toLowerCase().includes('india') || v.name.toLowerCase().includes('heera') || v.name.toLowerCase().includes('ravi')
      );

      if (enInVoices.length > 0) {
        // Return first matching Indian English voice
        return enInVoices[0];
      }
      
      // Fallback to any English voice
      const enVoice = this.voices.find(v => v.lang.startsWith('en'));
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
   * Start reading sentences with sentence highlighting
   */
  speakText(fullText, lang = 'en', onSentenceHighlight = null, onEndCallback = null) {
    this.stop();

    if (!fullText || !fullText.trim()) return;

    this.currentLanguage = lang;
    this.onSentenceHighlight = onSentenceHighlight;
    this.onEndCallback = onEndCallback;

    this.sentences = this.prepareSentences(fullText);
    this.currentSentenceIndex = 0;
    this.isPlaying = true;
    this.isPaused = false;

    this.playNextSentence();
  }

  playNextSentence() {
    if (!this.isPlaying || this.currentSentenceIndex >= this.sentences.length) {
      this.isPlaying = false;
      this.isPaused = false;
      if (this.onSentenceHighlight) this.onSentenceHighlight(-1);
      if (this.onEndCallback) this.onEndCallback();
      return;
    }

    const sentenceText = this.sentences[this.currentSentenceIndex];

    if (this.onSentenceHighlight) {
      this.onSentenceHighlight(this.currentSentenceIndex);
    }

    const utterance = new SpeechSynthesisUtterance(sentenceText);
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
    if (this.synth.speaking && !this.synth.paused) {
      this.synth.pause();
      this.isPaused = true;
    }
  }

  resume() {
    if (this.synth.paused) {
      this.synth.resume();
      this.isPaused = false;
    } else if (!this.isPlaying && this.sentences.length > 0) {
      this.isPlaying = true;
      this.playNextSentence();
    }
  }

  stop() {
    this.isPlaying = false;
    this.isPaused = false;
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
