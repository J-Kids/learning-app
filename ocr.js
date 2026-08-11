/**
 * Kids Learning App - OCR Text Extraction Engine
 * Uses Tesseract.js worker with canvas binarization & text post-cleaning
 */

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

        // Use local WASM core & local traineddata language files (100% offline, zero network requests)
        this.worker = await Tesseract.createWorker('eng', 1, {
          workerPath: './worker.min.js',
          corePath: './tesseract-core-simd-lstm.wasm.js',
          langPath: './',
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
            workerPath: './worker.min.js',
            corePath: './tesseract-core-lstm.wasm.js',
            langPath: './',
            gzip: false
          });
          this.isReady = true;
          console.log('[OCR] Offline non-SIMD Tesseract worker ready.');
          if (progressCallback) progressCallback({ status: 'Offline OCR Ready', progress: 20 });
        } catch (fallbackErr) {
          console.error('[OCR] Offline Tesseract worker init failed completely:', fallbackErr);
          this.isReady = false;
          if (progressCallback) progressCallback({ status: `OCR init failed: ${fallbackErr.message}`, progress: 10 });
        }
      }
    } else {
      console.error('[OCR] Tesseract library script not loaded.');
    }
  }

  /**
   * Preprocess textbook photo using HTML5 Canvas.
   * Enhances text contrast and filters out solid badge boxes and background paper noise.
   */
  async preprocessImageForOcr(imgSource) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Scale image to ~1600px for optimal OCR precision
          let scale = 1.6;
          if (img.width > 2000 || img.height > 2000) scale = 0.8;
          else if (img.width > 1200 || img.height > 1200) scale = 1.2;

          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Convert RGB to Luminance (Gray)
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;

            // Saturation
            const rn = r / 255, gn = g / 255, bn = b / 255;
            const max = Math.max(rn, gn, bn);
            const min = Math.min(rn, gn, bn);
            const saturation = max === 0 ? 0 : (max - min) / max;

            let finalVal;
            // Darker colored text → Black (0). Bright badge backgrounds & paper → White (255)
            if (saturation > 0.20 && gray < 190) {
              finalVal = 0;
            } else {
              finalVal = gray < 145 ? 0 : 255;
            }

            data[i] = finalVal;
            data[i + 1] = finalVal;
            data[i + 2] = finalVal;
          }

          ctx.putImageData(imageData, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (err) {
          console.warn('Canvas preprocessing error, using raw image:', err);
          resolve(imgSource);
        }
      };

      img.onerror = () => resolve(imgSource);

      if (typeof imgSource === 'string') {
        img.src = imgSource;
      } else if (imgSource instanceof File || imgSource instanceof Blob) {
        img.src = URL.createObjectURL(imgSource);
      } else {
        resolve(imgSource);
      }
    });
  }

  /**
   * Process multiple image files sequentially
   */
  async processImagesBatch(images, progressCallback) {
    const results = [];
    const total = images.length;

    // Check if Gemini Vision AI is configured, online, and not rate-limited
    const useGemini = window.geminiEngine &&
      window.geminiEngine.hasApiKey() &&
      navigator.onLine &&
      !window.geminiEngine.isRateLimited();

    if (!useGemini) {
      await this.initWorker(progressCallback);
    }

    for (let i = 0; i < total; i++) {
      const originalImg = images[i];
      const startProgress = Math.round((i / total) * 80) + 10;
      
      let extractedText = '';
      let textHi = '';
      let isAiPowered = false;
      let aiModel = '';

      if (useGemini) {
        if (progressCallback) {
          progressCallback({
            status: `✨ AI Vision scanning page ${i + 1} of ${total}...`,
            progress: startProgress
          });
        }

        try {
          const aiResult = await window.geminiEngine.scanPageWithGemini(originalImg);
          extractedText = aiResult.textEn;
          textHi = aiResult.textHi;
          isAiPowered = true;
          aiModel = aiResult.model || '';
        } catch (err) {
          // Surface the real error reason visibly in the progress box
          let reason = err.message || 'Unknown error';
          if (reason.startsWith('QUOTA_429:')) {
            reason = reason.replace('QUOTA_429: ', '');
          } else if (reason.includes('401') || reason.includes('403') || reason.includes('API_KEY')) {
            reason = 'Invalid API key — check ⚙️ settings';
          } else if (reason.includes('429')) {
            reason = 'API quota exceeded — try later';
          } else if (reason.includes('OFFLINE') || reason.includes('Failed to fetch')) {
            reason = 'Network error — check internet';
          }
          console.warn(`Gemini AI error (page ${i + 1}): ${err.message}`);
          if (progressCallback) {
            progressCallback({
              status: `⚠️ AI failed: ${reason}. Switching to Local OCR...`,
              progress: startProgress
            });
          }
          // Small pause so user can read the error message
          await new Promise(r => setTimeout(r, 1500));
        }
      }

      if (!extractedText) {
        if (progressCallback) {
          progressCallback({
            status: `⚡ Local OCR extracting page ${i + 1} of ${total}...`,
            progress: startProgress
          });
        }

        try {
          if (!this.isReady || !this.worker) {
            await this.initWorker(progressCallback);
          }

          const processedImg = await this.preprocessImageForOcr(originalImg);

          if (this.worker && this.isReady) {
            const ret = await this.worker.recognize(processedImg);
            extractedText = ret.data.text;
          } else {
            extractedText = await this.fallbackTextExtraction(originalImg);
          }
        } catch (err) {
          console.error(`OCR Error on page ${i + 1}:`, err);
          extractedText = await this.fallbackTextExtraction(originalImg);
        }

        extractedText = this.cleanExtractedText(extractedText);
      }

      results.push({
        pageIndex: i + 1,
        text: extractedText,
        textHi: textHi,
        isAiPowered: isAiPowered,
        model: aiModel
      });
    }

    if (progressCallback) {
      progressCallback({ status: 'Text extraction complete!', progress: 100 });
    }

    return results;
  }

  /**
   * Post-OCR noise cleaner: Filters out garbled badge symbols while preserving words and numbers.
   */
  cleanExtractedText(rawText) {
    if (!rawText) return 'No text found on this page. Tap edit to enter text.';

    let clean = rawText
      .replace(/\r\n/g, '\n')
      .replace(/[¢§©~|=_£\[\]\{\}\^\@\#\$\%\*\<\>\/\\]/g, ' ');

    const lines = clean.split('\n');
    const filteredLines = [];

    for (let line of lines) {
      const tokens = line.trim().split(/\s+/);
      const kept = [];

      for (const token of tokens) {
        const t = token.replace(/^[^a-zA-Z0-9\u0900-\u097F]+|[^a-zA-Z0-9\u0900-\u097F]+$/g, '');
        if (!t) continue;

        const isNumber = /^\d+$/.test(t);
        const alphaCount = (t.match(/[a-zA-Z\u0900-\u097F]/g) || []).length;
        const isWord = t.length >= 2 && (alphaCount / t.length) >= 0.70;

        if (isNumber || isWord) {
          kept.push(t);
        }
      }

      if (kept.length > 0) {
        filteredLines.push(kept.join(' '));
      }
    }

    const deduped = filteredLines.filter((line, i, arr) => line !== arr[i - 1]);
    const result = deduped.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    return result || 'No clear text detected. Tap "✏️ Edit Text" to type text.';
  }

  async fallbackTextExtraction(imgSource) {
    // Tesseract failed to initialize — return an instructional message
    // Never return hardcoded test data here
    console.error('[OCR] fallbackTextExtraction called — Tesseract not available');
    return 'OCR engine failed to load. Please check your internet connection and refresh the page, or tap ✏️ Edit Text to type the content manually.';
  }
}

window.ocrEngine = new OcrEngine();
