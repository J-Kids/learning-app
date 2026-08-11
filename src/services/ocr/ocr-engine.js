/**
 * Offline Tesseract OCR Engine
 * Runs 100% offline local Tesseract worker using local WASM cores and eng.traineddata.
 */

import { preprocessImageForOcr } from './image-preprocessor.js';
import { cleanExtractedText } from './text-cleaner.js';
import { geminiEngine } from '../gemini/gemini-engine.js';
import { translationEngine } from '../translator.js';

class OcrEngine {
  constructor() {
    this.worker = null;
    this.isReady = false;
  }

  async initWorker(progressCallback) {
    if (this.isReady && this.worker) return;

    if (typeof Tesseract !== 'undefined') {
      try {
        console.log('[OCR] Initializing 100% offline Tesseract worker...');
        if (progressCallback) progressCallback({ status: 'Initializing Offline OCR Engine...', progress: 10 });

        // Use local WASM core & local traineddata language files (100% offline from lib/tesseract)
        this.worker = await Tesseract.createWorker('eng', 1, {
          workerPath: './lib/tesseract/worker.min.js',
          corePath: './lib/tesseract/tesseract-core-simd-lstm.wasm.js',
          langPath: './lib/tesseract',
          gzip: false,
          logger: m => {
            if (m.status === 'loading tesseract core' || m.status === 'initializing api') {
              console.log(`[OCR] ${m.status}: ${Math.round((m.progress || 0) * 100)}%`);
            }
          }
        });

        this.isReady = true;
        console.log('[OCR] Offline Tesseract worker ready.');
        if (progressCallback) progressCallback({ status: 'Offline OCR Ready', progress: 20 });
      } catch (err) {
        console.warn('[OCR] Primary SIMD WASM worker init failed, trying non-SIMD core fallback:', err);
        try {
          this.worker = await Tesseract.createWorker('eng', 1, {
            workerPath: './lib/tesseract/worker.min.js',
            corePath: './lib/tesseract/tesseract-core-lstm.wasm.js',
            langPath: './lib/tesseract',
            gzip: false
          });
          this.isReady = true;
          console.log('[OCR] Offline non-SIMD Tesseract worker ready.');
          if (progressCallback) progressCallback({ status: 'Offline OCR Ready', progress: 20 });
        } catch (fallbackErr) {
          console.error('[OCR] Offline Tesseract worker init failed completely:', fallbackErr);
          this.isReady = false;
        }
      }
    }
  }

  async processSingleImage(imageSrc, progressCallback) {
    // 1. Try Gemini Vision AI first if API key is configured
    if (geminiEngine.isConfigured()) {
      try {
        if (progressCallback) progressCallback({ status: 'Scanning with AI Vision Studio...', progress: 30 });
        const aiResult = await geminiEngine.scanTextbookImage(imageSrc);
        return {
          title: aiResult.title || 'Scanned Page',
          textEn: cleanExtractedText(aiResult.textEn),
          textHi: aiResult.textHi || await translationEngine.translateToHindi(aiResult.textEn),
          engineUsed: `✨ AI Vision (${aiResult.modelUsed || 'Gemini'})`
        };
      } catch (aiErr) {
        console.warn('[OCR] Gemini AI Vision failed or unconfigured, falling back to Local OCR:', aiErr.message);
      }
    }

    // 2. Fallback to 100% Offline Local Tesseract OCR
    await this.initWorker(progressCallback);

    if (!this.worker) {
      throw new Error('Local OCR engine failed to load.');
    }

    if (progressCallback) progressCallback({ status: 'Preprocessing Image Canvas...', progress: 40 });

    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = typeof imageSrc === 'string' ? imageSrc : URL.createObjectURL(imageSrc);
    });

    const processedDataUrl = preprocessImageForOcr(img);

    if (progressCallback) progressCallback({ status: 'Extracting Text (Local OCR)...', progress: 60 });

    const result = await this.worker.recognize(processedDataUrl);
    const rawExtractedText = result?.data?.text || '';
    const cleanedEnglishText = cleanExtractedText(rawExtractedText);

    if (progressCallback) progressCallback({ status: 'Translating to Hindi...', progress: 85 });

    const hindiText = await translationEngine.translateToHindi(cleanedEnglishText);

    return {
      title: 'Scanned Page',
      textEn: cleanedEnglishText || 'No clear text recognized. Please try scanning again.',
      textHi: hindiText,
      engineUsed: '⚡ Local Offline OCR'
    };
  }
}

export const ocrEngine = new OcrEngine();
window.ocrEngine = ocrEngine;
