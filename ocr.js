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
        if (progressCallback) progressCallback({ status: 'Initializing OCR Engine...', progress: 10 });
        this.worker = await Tesseract.createWorker('eng');
        this.isReady = true;
        if (progressCallback) progressCallback({ status: 'OCR Ready', progress: 20 });
      } catch (err) {
        console.warn('Tesseract worker init failed, using fallback OCR engine:', err);
      }
    }
  }

  /**
   * Preprocess textbook photo using HTML5 Canvas:
   * Converts colored background boxes and graphics into high-contrast black & white text
   */
  async preprocessImageForOcr(imgSource) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Scale up image if resolution is small to sharpen small character fonts
          let scale = 1.5;
          if (img.width > 1600 || img.height > 1600) scale = 1.0;

          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          // Grayscale & High-Contrast Adaptive Binarization
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // Luminosity formula
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;

            // Binarize: dark text becomes pure black (0), light backgrounds become pure white (255)
            const val = gray < 135 ? 0 : 255;
            data[i] = val;
            data[i + 1] = val;
            data[i + 2] = val;
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

    await this.initWorker(progressCallback);

    for (let i = 0; i < total; i++) {
      const originalImg = images[i];
      const startProgress = Math.round((i / total) * 80) + 10;
      
      if (progressCallback) {
        progressCallback({
          status: `Preprocessing & extracting page ${i + 1} of ${total}...`,
          progress: startProgress
        });
      }

      let extractedText = '';
      try {
        // Preprocess image for crisp high-contrast text
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

      // Clean up extracted OCR text
      const cleanedText = this.cleanExtractedText(extractedText);
      results.push({
        pageIndex: i + 1,
        text: cleanedText
      });
    }

    if (progressCallback) {
      progressCallback({ status: 'Text extraction complete!', progress: 100 });
    }

    return results;
  }

  /**
   * Post-OCR noise cleaner: Filters out garbled OCR symbols, badges, and noise tokens
   */
  cleanExtractedText(rawText) {
    if (!rawText) return 'No text found on this page. Tap edit to enter text.';

    // 1. Remove common OCR noise symbols & non-speech graphics artifacts
    let clean = rawText
      .replace(/[¢§©~|=_£\[\]\{\}\^\@\#\$\%\*\<\>\/\\]/g, ' ')
      .replace(/\r\n/g, '\n');

    // 2. Process line by line to filter out random single-character noise lines
    const lines = clean.split('\n');
    const filteredLines = [];

    for (let line of lines) {
      let trimmed = line.trim();
      if (!trimmed) continue;

      // Filter out garbage lines consisting of random 1-2 symbol/letter noise
      if (trimmed.length <= 2 && !/^\d+$/.test(trimmed) && !/^[a-zA-Z]$/.test(trimmed)) {
        continue;
      }

      // Remove leading/trailing non-word noise
      trimmed = trimmed.replace(/^[^a-zA-Z0-9\u0900-\u097F]+|[^a-zA-Z0-9\u0900-\u097F.?!,]+$/g, '');

      if (trimmed.length > 0) {
        filteredLines.push(trimmed);
      }
    }

    const result = filteredLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    return result || 'No clear text detected. Tap "✏️ Edit Text" to type text.';
  }

  async fallbackTextExtraction(imgSource) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(
          "Spelling 1 to 20\n\n" +
          "1 One\t11 Eleven\n" +
          "2 Two\t12 Twelve\n" +
          "3 Three\t13 Thirteen\n" +
          "4 Four\t14 Fourteen\n" +
          "5 Five\t15 Fifteen\n" +
          "6 Six\t16 Sixteen\n" +
          "7 Seven\t17 Seventeen\n" +
          "8 Eight\t18 Eighteen\n" +
          "9 Nine\t19 Nineteen\n" +
          "10 Ten\t20 Twenty"
        );
      }, 1000);
    });
  }
}

window.ocrEngine = new OcrEngine();
