/**
 * Gemini Vision Image Utilities
 * Converts and downscales image sources (File, Blob, DataURL) to optimized Base64 (max 1280px, ~250KB).
 */

export async function imageToBase64(imgSource) {
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
