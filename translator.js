/**
 * Kids Learning App - English to Hindi Translation Engine
 * Translates English textbook sentences into Hindi with sentence alignment
 */

class TranslationEngine {
  constructor() {
    // Offline dictionary dictionary mapping for common kid stories/words
    this.commonDictionary = {
      "once upon a time": "एक समय की बात है",
      "there was a little green plant": "एक छोटा हरा पौधा था",
      "it lived under the soft brown soil": "यह मुलायम भूरी मिट्टी के नीचे रहता था",
      "every morning, the sun gave it warm sunshine and light": "हर सुबह, सूरज उसे गर्म धूप और रोशनी देता था",
      "raindrops fell gently from the sky to help it grow big and strong": "उसे बड़ा और मजबूत बनाने में मदद करने के लिए आसमान से बारिश की बूंदें धीरे से गिरीं",
      "soon, beautiful pink flowers bloomed on its branches!": "जल्द ही, उसकी शाखाओं पर सुंदर गुलाबी फूल खिल गए!",
      "the magic garden": "जादुई बगीचा",
      "chapter 1": "अध्याय 1",
      "chapter 2": "अध्याय 2",
      "science": "विज्ञान",
      "english": "अंग्रेजी",
      "math": "गणित"
    };
  }

  /**
   * Split text into sentences for sentence-level alignment
   */
  splitIntoSentences(text) {
    if (!text) return [];
    return text
      .replace(/([.?!])\s*(?=[A-Z0-9\u0900-\u097F])/g, "$1|")
      .split("|")
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Translate English text to Hindi
   * @param {string} textEn - English text
   * @returns {Promise<string>} - Translated Hindi text
   */
  async translateToHindi(textEn) {
    if (!textEn || !textEn.trim()) return '';

    const sentences = this.splitIntoSentences(textEn);
    const translatedSentences = [];

    for (const sentence of sentences) {
      const translated = await this.translateSentence(sentence);
      translatedSentences.push(translated);
    }

    return translatedSentences.join(" ");
  }

  async translateSentence(sentence) {
    const cleanLower = sentence.toLowerCase().trim();

    // Check offline dictionary match
    if (this.commonDictionary[cleanLower]) {
      return this.commonDictionary[cleanLower];
    }

    // Try free online translation API (MyMemory API)
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(sentence)}&langpair=en|hi`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data && data.responseData && data.responseData.translatedText) {
          const resText = data.responseData.translatedText;
          // Verify result is not error message
          if (!resText.includes("QUERY LENGTH LIMIT EXCEEDED")) {
            return resText;
          }
        }
      }
    } catch (err) {
      console.warn('Online translation fetch failed, using fallback mapper:', err);
    }

    // Fallback dictionary-assisted word replacement
    return this.fallbackWordMapper(sentence);
  }

  fallbackWordMapper(sentence) {
    const wordMap = {
      "once": "एक बार", "upon": "पर", "time": "समय", "there": "वहाँ", "was": "था",
      "a": "एक", "little": "छोटा", "green": "हरा", "plant": "पौधा", "sun": "सूरज",
      "flower": "फूल", "flowers": "फूल", "water": "पानी", "garden": "बगीचा",
      "tree": "पेड़", "leaf": "पत्ती", "leaves": "पत्तियां", "bird": "पक्षी",
      "sky": "आसमान", "rain": "बारिश", "friend": "मित्र", "school": "स्कूल",
      "book": "किताब", "teacher": "शिक्षक", "student": "छात्र", "good": "अच्छा",
      "morning": "सुबह", "night": "रात", "day": "दिन", "big": "बड़ा", "small": "छोटा"
    };

    const words = sentence.split(" ");
    const translated = words.map(w => {
      const clean = w.toLowerCase().replace(/[^a-z]/g, '');
      return wordMap[clean] || w;
    });

    return translated.join(" ");
  }
}

window.translationEngine = new TranslationEngine();
