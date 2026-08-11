/**
 * Kids Learning App - MyMemory Translation Engine
 * Free API translation service: English -> Hindi.
 */

class TranslationEngine {
  constructor() {
    this.cache = new Map();
  }

  async translateToHindi(englishText) {
    if (!englishText || !englishText.trim()) return '';

    const cleanText = englishText.trim();
    if (this.cache.has(cleanText)) {
      return this.cache.get(cleanText);
    }

    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=en|hi`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const hindiResult = data?.responseData?.translatedText || cleanText;

      this.cache.set(cleanText, hindiResult);
      return hindiResult;
    } catch (error) {
      console.warn('Translation failed, returning fallback:', error);
      return this.fallbackTranslate(cleanText);
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
