/**
 * Canvas Preprocessor for Textbook OCR
 * Enhances contrast, binarizes text, and removes paper tint & badge box noise.
 */

export function preprocessImageForOcr(imageElement) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = imageElement.naturalWidth || imageElement.width || 800;
  canvas.height = imageElement.naturalHeight || imageElement.height || 600;

  ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Grayscale & Adaptive luminance thresholding
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    // Filter solid black badge boxes and background tint
    if (gray < 145) {
      data[i] = 0;       // Black text
      data[i + 1] = 0;
      data[i + 2] = 0;
    } else {
      data[i] = 255;     // Clean white background
      data[i + 1] = 255;
      data[i + 2] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}
