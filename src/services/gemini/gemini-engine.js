/**
 * Gemini Vision AI Engine
 * Orchestrates API key management, model selection, prompt construction, and image scanning.
 */

import { imageToBase64 } from './image-utils.js';
import { discoverVisionModels } from './model-discovery.js';
import { parseAiResponse } from './response-parser.js';

class GeminiVisionEngine {
  constructor() {
    this.apiKey = localStorage.getItem('gemini_api_key') || '';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    this.lastUsedModel = '';
  }

  setApiKey(key) {
    this.apiKey = key ? key.trim() : '';
    if (this.apiKey) {
      localStorage.setItem('gemini_api_key', this.apiKey);
    } else {
      localStorage.removeItem('gemini_api_key');
    }
  }

  getApiKey() {
    return this.apiKey;
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.length > 10);
  }

  async scanTextbookImage(imageSource) {
    if (!this.isConfigured()) {
      throw new Error('Gemini API Key is not set. Please set your key in AI Settings.');
    }

    const imagePayload = await imageToBase64(imageSource);
    const discoveredModels = await discoverVisionModels(this.apiKey);

    const promptText = `
You are an expert OCR and translation assistant for primary school children (Class 2).
Analyze this textbook page image and perform the following tasks:
1. Extract ALL printed text on the page accurately into English ("textEn").
2. Translate the full extracted text into simple, easy-to-understand Hindi suitable for a Class 2 kid ("textHi").
3. Suggest a short 2-4 word Chapter Title for this page ("title").

Return ONLY valid JSON matching this exact structure:
{
  "title": "Page Title Here",
  "textEn": "Full extracted English text here...",
  "textHi": "पूरा हिंदी अनुवाद यहाँ..."
}
`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: imagePayload.mimeType,
                data: imagePayload.data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048
      }
    };

    let lastError = null;
    for (const modelName of discoveredModels) {
      const endpoint = `${this.baseUrl}/${modelName}:generateContent?key=${this.apiKey}`;
      console.log(`[Gemini] Attempting vision scan with model: ${modelName}`);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (response.status === 404 || response.status === 400) {
          const errData = await response.json().catch(() => ({}));
          console.warn(`[Gemini] Model ${modelName} returned ${response.status}:`, errData);
          lastError = new Error(errData?.error?.message || `Model ${modelName} not available (${response.status})`);
          continue;
        }

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `API error ${response.status}`);
        }

        const data = await response.json();
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!candidateText) {
          throw new Error('Gemini API returned an empty response.');
        }

        this.lastUsedModel = modelName;
        console.log(`[Gemini] Vision scan successful using model: ${modelName}`);

        const parsed = parseAiResponse(candidateText);
        return {
          ...parsed,
          modelUsed: modelName
        };
      } catch (err) {
        lastError = err;
        console.warn(`[Gemini] Model ${modelName} failed:`, err.message);
      }
    }

    throw lastError || new Error('All Gemini models failed to process the image.');
  }

  async testConnection(apiKey) {
    const keyToTest = apiKey || this.apiKey;
    if (!keyToTest) throw new Error('No API Key provided');

    const discoveredModels = await discoverVisionModels(keyToTest);
    const modelToTest = discoveredModels[0] || 'gemini-1.5-flash';
    const endpoint = `${this.baseUrl}/${modelToTest}:generateContent?key=${keyToTest}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Hello' }] }]
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${res.status}`);
    }
    return true;
  }
}

export const geminiEngine = new GeminiVisionEngine();
window.geminiEngine = geminiEngine;
