/**
 * Kids Learning App - Gemini Vision AI Engine
 * Handles AI Vision OCR, textbook layout parsing, and English-to-Hindi translation.
 * Includes automatic model discovery, multi-model 404 fallback, payload optimization, and rate-limit handling.
 */

class GeminiVisionEngine {
  constructor() {
    this.apiKey = localStorage.getItem('gemini_api_key') || '';
    // Rate limit tracking: enforce min 5s gap between requests to stay under 15 RPM
    this._lastRequestTime = 0;
    this._minGapMs = 5000;
    // If 429 received, block until retryAfter timestamp
    this._retryAfter = 0;
    this._cachedAvailableModels = null;
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
    this._retryAfter = 0;
    this._cachedAvailableModels = null;
  }

  hasApiKey() {
    return Boolean(this.getApiKey());
  }

  isRateLimited() {
    return Date.now() < this._retryAfter;
  }

  getRateLimitSecondsLeft() {
    return Math.ceil((this._retryAfter - Date.now()) / 1000);
  }

  /**
   * Query Google AI Studio API for models supported by this API key
   */
  async listAvailableModels(key) {
    if (!key) return [];
    if (this._cachedAvailableModels) return this._cachedAvailableModels;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
      const response = await fetch(url);
      if (!response.ok) return [];

      const data = await response.json();
      const models = (data.models || [])
        .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
        .map(m => m.name.replace(/^models\//, ''));

      console.log('[Gemini] Active models for API key:', models);
      this._cachedAvailableModels = models;
      return models;
    } catch (err) {
      console.warn('[Gemini] Could not fetch models list:', err);
      return [];
    }
  }

  /**
   * Determine candidate models list for generation.
   * Strictly filters out Pro/Ultra models and non-vision TTS/audio models.
   */
  async getCandidateModels(key) {
    const fetched = await this.listAvailableModels(key);

    const preferredFlashVisionModels = [
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash-8b',
      'gemini-2.0-flash-lite',
      'gemini-2.0-flash',
      'gemini-2.0-flash-exp'
    ];

    if (fetched && fetched.length > 0) {
      // STRICTLY keep Vision Flash models (exclude tts, audio, pro, ultra, embedding, imagen)
      const validVisionModels = fetched.filter(m => {
        const lower = m.toLowerCase();
        return (
          lower.includes('flash') &&
          !lower.includes('tts') &&
          !lower.includes('audio') &&
          !lower.includes('pro') &&
          !lower.includes('ultra') &&
          !lower.includes('embedding') &&
          !lower.includes('imagen')
        );
      });

      const candidates = [];
      for (const pref of preferredFlashVisionModels) {
        if (validVisionModels.includes(pref)) candidates.push(pref);
      }
      for (const f of validVisionModels) {
        if (!candidates.includes(f)) candidates.push(f);
      }
      if (candidates.length > 0) return candidates;
    }

    return preferredFlashVisionModels;
  }

  /**
   * Test API key connection and verify working model
   */
  async testConnection(customKey = null) {
    const key = customKey || this.getApiKey();
    if (!key) throw new Error('No API key saved');
    if (!navigator.onLine) throw new Error('Device is offline');

    const candidateModels = await this.getCandidateModels(key);
    let lastError = null;

    for (const model of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Reply with: OK' }] }],
            generationConfig: { maxOutputTokens: 5 }
          })
        });

        if (resp.status === 404 || resp.status === 400) {
          console.warn(`[Gemini Test] Model ${model} returned ${resp.status}, trying next...`);
          continue;
        }

        if (!resp.ok) {
          const errText = await resp.text();
          if (resp.status === 429 && errText.includes('limit: 0')) {
            console.warn(`[Gemini Test] Model ${model} has limit: 0 on free tier, trying next...`);
            continue;
          }
          let msg = `HTTP ${resp.status}`;
          try {
            const errJson = JSON.parse(errText);
            msg = errJson?.error?.message || msg;
          } catch (_) {}
          throw new Error(msg);
        }

        return { success: true, model };
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('No compatible Gemini Vision Flash model found for this key');
  }

  /**
   * Convert image source (File, Blob, DataURL) to optimized Base64 (max 1280px, ~250KB)
   */
  async imageToBase64(imgSource) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      const processImg = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width || 1200;
          let height = img.height || 1200;

          // Downscale large camera photos to max 1280px for fast 250KB API payload
          const MAX_DIM = 1280;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const parts = dataUrl.split(',');
          resolve({ mimeType: 'image/jpeg', data: parts[1] });
        } catch (err) {
          reject(err);
        }
      };

      img.onload = processImg;
      img.onerror = () => {
        // Direct FileReader fallback if Image load fails
        if (imgSource instanceof File || imgSource instanceof Blob) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const parts = reader.result.split(',');
            const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
            resolve({ mimeType: mime, data: parts[1] });
          };
          reader.onerror = reject;
          reader.readAsDataURL(imgSource);
        } else {
          reject(new Error('Failed to load image for AI processing'));
        }
      };

      if (typeof imgSource === 'string') {
        if (imgSource.startsWith('data:')) {
          const parts = imgSource.split(',');
          const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
          resolve({ mimeType: mime, data: parts[1] });
          return;
        }
        img.src = imgSource;
      } else if (imgSource instanceof File || imgSource instanceof Blob) {
        img.src = URL.createObjectURL(imgSource);
      } else {
        reject(new Error('Invalid image source'));
      }
    });
  }

  /**
   * Robust JSON parser for AI responses
   */
  parseAiResponse(rawText) {
    if (!rawText) return { title: 'Scanned Page', textEn: '', textHi: '' };

    // 1. Try direct JSON parse after removing markdown code blocks
    const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed.textEn || parsed.textHi) return parsed;
    } catch (_) {}

    // 2. Try regex extraction of JSON object {...}
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (parsed.textEn || parsed.textHi) return parsed;
      } catch (_) {}
    }

    // 3. Fallback: treat entire response as textEn if model returned non-JSON text
    return {
      title: 'Scanned Page',
      textEn: rawText.replace(/^[\s\S]*?(?=[A-Za-z0-9\u0900-\u097F])/s, '').trim(),
      textHi: ''
    };
  }

  /**
   * Scan textbook page photo using Gemini Vision API.
   * Auto-selects working model and handles 404 fallback & rate-limiting.
   */
  async scanPageWithGemini(imgSource) {
    const key = this.getApiKey();
    if (!key) throw new Error('NO_API_KEY');
    if (!navigator.onLine) throw new Error('OFFLINE');

    if (this.isRateLimited()) {
      const secs = this.getRateLimitSecondsLeft();
      throw new Error(`QUOTA_429: Rate limited. Please wait ${secs}s before scanning again.`);
    }

    const now = Date.now();
    const gap = now - this._lastRequestTime;
    if (gap < this._minGapMs && this._lastRequestTime > 0) {
      const wait = this._minGapMs - gap;
      console.log(`[Gemini] Throttling: waiting ${wait}ms before request`);
      await new Promise(r => setTimeout(r, wait));
    }
    this._lastRequestTime = Date.now();

    const { mimeType, data } = await this.imageToBase64(imgSource);

    const promptText = `
You are an expert elementary school teacher assistant for Class 2 kids learning English and Hindi.
Analyze this scanned textbook page photo carefully.

Tasks:
1. Extract ALL readable English text, number charts (e.g. "Spelling 1 to 20", "1 One", "2 Two"... "20 Twenty"), story paragraphs, or flashcard words.
2. If it is a number table or spelling chart, list numbers sequentially line-by-line (e.g. "1 One", "2 Two"... "20 Twenty").
3. Translate the extracted English text into simple, natural, encouraging Indian Hindi suitable for Class 2 kids.

Return ONLY a JSON object formatted as follows:
{
  "title": "Short title for this page or chapter",
  "textEn": "Extracted English text cleanly formatted with line breaks",
  "textHi": "Simple Indian Hindi translation for Class 2 kids"
}
`;

    const candidateModels = await this.getCandidateModels(key);
    let lastError = null;

    for (const model of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const requestBody = {
        contents: [
          {
            parts: [
              { text: promptText },
              { inlineData: { mimeType, data } }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1
        }
      };

      try {
        console.log(`[Gemini] Scanning page with model: ${model}...`);
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (response.status === 404) {
          console.warn(`[Gemini] Model ${model} returned 404 NOT_FOUND. Trying next model...`);
          continue;
        }

        if (response.status === 400) {
          console.warn(`[Gemini] Model ${model} returned 400 (unsupported modality/argument). Trying next model...`);
          continue;
        }

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[Gemini] API error on model ${model}:`, errText);

          if (response.status === 429) {
            // Ignore limit: 0 error (means non-free model), try next Flash model
            if (errText.includes('limit: 0')) {
              console.warn(`[Gemini] Model ${model} has limit: 0 on free tier. Trying next model...`);
              continue;
            }

            let retrySecs = 60;
            let retryMsg = 'Rate limit hit';
            try {
              const errJson = JSON.parse(errText);
              const retryInfo = errJson?.error?.details?.find(d => d.retryDelay);
              if (retryInfo?.retryDelay) {
                retrySecs = parseInt(retryInfo.retryDelay) + 5;
                retryMsg = `Rate limited — wait ${retrySecs}s`;
              }
            } catch (_) {}
            this._retryAfter = Date.now() + (retrySecs * 1000);
            throw new Error(`QUOTA_429: ${retryMsg}`);
          }

          throw new Error(`Gemini API error ${response.status}`);
        }

        const resData = await response.json();
        const rawContent = resData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawContent) throw new Error('Empty response from Gemini AI');

        const parsed = this.parseAiResponse(rawContent);
        return {
          title: parsed.title || 'Scanned Page',
          textEn: parsed.textEn || '',
          textHi: parsed.textHi || '',
          isAiPowered: true,
          model
        };
      } catch (err) {
        if (err.message.startsWith('QUOTA_429')) throw err;
        lastError = err;
      }
    }

    throw lastError || new Error('No working Gemini AI model found for this key.');
  }
}

window.geminiEngine = new GeminiVisionEngine();
