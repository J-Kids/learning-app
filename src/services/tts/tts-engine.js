/**
 * Kids Learning App - Bilingual Indian Accent Speech Synthesis Engine
 * Manages sentence-by-sentence reading, single-word pronunciation, speed control, and sentence callbacks.
 */

import { VoiceManager, LANGUAGE_LOCALES } from './voice-manager.js';
import { formatTextForSpeech, prepareSentences } from './speech-formatter.js';

class TtsPlayerEngine {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voiceManager = new VoiceManager(this.synth);
    this.currentUtterance = null;

    this.isPlaying = false;
    this.isPaused = false;
    this.currentLanguage = 'en';

    const savedSpeed = parseFloat(localStorage.getItem('tts_speed'));
    this.speechRate = !isNaN(savedSpeed) ? savedSpeed : 1.0;

    this.sentences = [];
    this.currentSentenceIndex = 0;
    this.onSentenceHighlight = null;
    this.onEndCallback = null;

    const savedVoiceName = localStorage.getItem('tts_voice_name');
    if (savedVoiceName) {
      this.voiceManager.setSelectedVoiceByName(savedVoiceName);
    }
  }

  speakSingleWord(wordText, lang = 'en') {
    if (!wordText || !wordText.trim()) return;
    this.stop();

    const cleanWord = wordText.replace(/^[^a-zA-Z0-9\u0900-\u097F]+|[^a-zA-Z0-9\u0900-\u097F]+$/g, '');
    if (!cleanWord) return;

    const speechLang = lang || this.currentLanguage;
    const textToSpeak = formatTextForSpeech(cleanWord, speechLang);
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.75;
    utterance.pitch = 1.0;

    const voice = this.voiceManager.getVoiceForLanguage(speechLang);
    if (voice) {
      utterance.voice = voice;
    }
    // Enforce the correct locale accent (e.g. Indian English 'en-IN') per target language
    utterance.lang = LANGUAGE_LOCALES[speechLang] || 'en-IN';

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  speakText(fullText, lang = 'en', onSentenceHighlight = null, onEndCallback = null, startFromIndex = 0) {
    if (this.synth) this.synth.cancel();
    if (!fullText || !fullText.trim()) return;

    this.currentLanguage = lang;
    this.onSentenceHighlight = onSentenceHighlight;
    this.onEndCallback = onEndCallback;

    this.sentences = prepareSentences(fullText);
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

    const textToSpeak = formatTextForSpeech(sentenceText, this.currentLanguage);
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = this.speechRate;
    utterance.pitch = 1.0;

    const voice = this.voiceManager.getVoiceForLanguage(this.currentLanguage);
    if (voice) {
      utterance.voice = voice;
    }
    // Enforce the correct locale accent (e.g. Indian English 'en-IN') per target language
    utterance.lang = LANGUAGE_LOCALES[this.currentLanguage] || 'en-IN';

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
    if (this.synth) this.synth.cancel();
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
    if (this.synth) this.synth.cancel();
    if (this.onSentenceHighlight) this.onSentenceHighlight(-1);
  }

  setRate(rate) {
    this.speechRate = parseFloat(rate);
    if (this.isPlaying && !this.isPaused) {
      this.synth.cancel();
      this.playNextSentence();
    }
  }
}

export const ttsPlayer = new TtsPlayerEngine();
window.ttsPlayer = ttsPlayer;
