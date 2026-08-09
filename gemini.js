/**
 * Kids Learning App - Gemini 1.5 Flash Vision AI Engine
 * Handles AI Vision OCR, textbook layout parsing, and English-to-Hindi translation.
 * Includes automatic fallback to Tesseract.js when offline or key is missing.
 */

class GeminiVisionEngine {
  constructor() {
    this.apiKey = localStorage.getItem('gemini_api_key') || '';
  }

  getApiKey() {
    return this.apiKey || localStorage.getItem('gemini_api_key') || '';
  }

  setApiKey(key) {
    this.apiKey = (key || '').trim();
    if (this.apiKey) {
      localStorage.setItem('gemini_api_key', this.apiKey);
    } else {
      localStorage.removeItem('gemini_api_key');
    }
  }

  hasApiKey() {
    return Boolean(this.getApiKey());
  }

  /**
   * Convert image source (File, Blob, DataURL) to Base64
   */
  async imageToBase64(imgSource) {
    if (typeof imgSource === 'string' && imgSource.startsWith('data:')) {
      const parts = imgSource.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      return { mimeType: mime, data: parts[1] };
    }

    return new Promise((resolve, reject) => {
      if (imgSource instanceof Blob || imgSource instanceof File) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result;
          const parts = result.split(',');
          const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
          resolve({ mimeType: mime, data: parts[1] });
        };
        reader.onerror = reject;
        reader.readAsDataURL(imgSource);
      } else {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          const parts = dataUrl.split(',');
          resolve({ mimeType: 'image/jpeg', data: parts[1] });
        };
        img.onerror = reject;
        img.src = imgSource;
      }
    });
  }

  /**
   * Scan textbook page photo using Gemini 1.5 Flash Vision API
   */
  async scanPageWithGemini(imgSource) {
    const key = this.getApiKey();
    if (!key) {
      throw new Error('NO_API_KEY');
    }

    if (!navigator.onLine) {
      throw new Error('OFFLINE');
    }

    const { mimeType, data } = await this.imageToBase64(imgSource);

    const promptText = `
You are an expert elementary school teacher assistant for Class 2 kids learning English and Hindi.
Analyze this scanned textbook page photo carefully.

Tasks:
1. Extract ALL readable English text, number charts (e.g. "Spelling 1 to 20", "1 One", "2 Two"... "20 Twenty"), story paragraphs, or flashcard words.
2. If it is a number table or spelling chart, list numbers sequentially line-by-line (e.g. "1 One", "2 Two"... "20 Twenty").
3. Translate the extracted English text into simple, natural, encouraging Indian Hindi suitable for Class 2 kids.

Return ONLY a valid JSON object with no extra Markdown wrapping:
{
  "title": "Short title for this page or chapter",
  "textEn": "Extracted English text cleanly formatted with line breaks",
  "textHi": "Simple Indian Hindi translation for Class 2 kids"
}
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: mimeType,
                data: data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API Error:', errText);
      throw new Error(`Gemini API error ${response.status}`);
    }

    const resData = await response.json();
    const rawContent = resData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawContent) {
      throw new Error('Empty response from Gemini AI');
    }

    const parsed = JSON.parse(rawContent.replace(/```json/g, '').replace(/```/g, '').trim());
    return {
      title: parsed.title || 'Scanned Page',
      textEn: parsed.textEn || '',
      textHi: parsed.textHi || '',
      isAiPowered: true
    };
  }
}

window.geminiEngine = new GeminiVisionEngine();
