/**
 * Kids Learning App - MyMemory Translation Engine
 * Free API translation service: English -> user-selected target language.
 */

export const SUPPORTED_LANGUAGES = [
  { code: 'hi', name: 'Hindi', nativeLabel: 'हिं', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', nativeLabel: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeLabel: 'मराठी', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeLabel: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeLabel: 'తెలుగు', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeLabel: 'বাংলা', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeLabel: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', nativeLabel: 'ES', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeLabel: 'FR', flag: '🇫🇷' }
];

export function getLanguageInfo(code) {
  return SUPPORTED_LANGUAGES.find(l => l.code === code) || SUPPORTED_LANGUAGES[0];
}

class TranslationEngine {
  constructor() {
    this.cache = new Map();
    this.targetLanguage = localStorage.getItem('target_language') || 'hi';
  }

  getTargetLanguage() {
    return this.targetLanguage;
  }

  setTargetLanguage(code) {
    if (!SUPPORTED_LANGUAGES.some(l => l.code === code)) return;
    this.targetLanguage = code;
    localStorage.setItem('target_language', code);
  }

  async translateText(englishText, targetLangCode = this.targetLanguage) {
    if (!englishText || !englishText.trim()) return '';

    const cleanText = englishText.trim();
    const cacheKey = `${targetLangCode}:${cleanText}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=en|${targetLangCode}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const translated = data?.responseData?.translatedText || cleanText;

      this.cache.set(cacheKey, translated);
      return translated;
    } catch (error) {
      console.warn('Translation failed, returning fallback:', error);
      return targetLangCode === 'hi' ? this.fallbackTranslate(cleanText) : cleanText;
    }
  }

  fallbackTranslate(text) {
    const dictionary = {
      'The Magic Garden': 'जादुई बगीचा',
      'Garden': 'बगीचा',
      'Flowers': 'फूल',
      'Sun': 'सूरज',
      'Rain': 'बारिश',
      'Birds': 'पक्षी',
      'Children': 'बच्चे',
      'Watering cans': 'पानी देने के बर्तन',
      'Spelling 1 to 20': '1 से 20 तक गिनती',
      'One': 'एक', 'Two': 'दो', 'Three': 'तीन', 'Four': 'चार', 'Five': 'पाँच',
      'Six': 'छह', 'Seven': 'सात', 'Eight': 'आठ', 'Nine': 'नौ', 'Ten': 'दस',
      'Eleven': 'ग्यारह', 'Twelve': 'बारह', 'Thirteen': 'तेरह', 'Fourteen': 'चौदह', 'Fifteen': 'पंद्रह',
      'Sixteen': 'सोलह', 'Seventeen': 'सत्रह', 'Eighteen': 'अठारह', 'Nineteen': 'उन्नीस', 'Twenty': 'बीस'
    };

    let result = text;
    Object.keys(dictionary).forEach(key => {
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      result = result.replace(regex, dictionary[key]);
    });

    return result;
  }
}

export const translationEngine = new TranslationEngine();
window.translationEngine = translationEngine;
