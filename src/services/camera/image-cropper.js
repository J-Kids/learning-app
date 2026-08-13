/**
 * Interactive Crop Box
 * Displays a captured canvas in an <img> and lets the user drag/resize a crop
 * rectangle over it (mouse + touch via Pointer Events), then extracts the
 * cropped region as a new canvas.
 */

export class ImageCropper {
  constructor({ wrapEl, imageEl, boxEl }) {
    this.wrapEl = wrapEl;
    this.imageEl = imageEl;
    this.boxEl = boxEl;
    this.sourceCanvas = null;
    this.cropRect = null;
    this.cropBounds = null;
    this._handlersBound = false;
  }

  load(sourceCanvas) {
    this.sourceCanvas = sourceCanvas;
    return new Promise((resolve) => {
      this.imageEl.onload = () => {
        this.initBox();
        resolve();
      };
      this.imageEl.src = sourceCanvas.toDataURL('image/jpeg', 0.92);
    });
  }

  initBox() {
    const wrapRect = this.wrapEl.getBoundingClientRect();
    const imgRect = this.imageEl.getBoundingClientRect();

    this.cropBounds = {
      left: imgRect.left - wrapRect.left,
      top: imgRect.top - wrapRect.top,
      width: imgRect.width,
      height: imgRect.height
    };

    // Default crop box covers the full captured image; user can shrink it if they want.
    this.cropRect = { ...this.cropBounds };
    this.render();
    this.bindHandlers();
  }

  render() {
    if (!this.cropRect) return;
    this.boxEl.style.left = `${this.cropRect.left}px`;
    this.boxEl.style.top = `${this.cropRect.top}px`;
    this.boxEl.style.width = `${this.cropRect.width}px`;
    this.boxEl.style.height = `${this.cropRect.height}px`;
  }

  bindHandlers() {
    if (this._handlersBound) return;
    this._handlersBound = true;

    this.boxEl.addEventListener('pointerdown', (e) => {
      if (e.target.classList.contains('crop-handle')) return;
      e.preventDefault();
      this.startDrag(e, 'move');
    });

    this.boxEl.querySelectorAll('.crop-handle').forEach(handle => {
      handle.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.startDrag(e, handle.dataset.handle);
      });
    });
  }

  startDrag(startEvent, mode) {
    const startX = startEvent.clientX;
    const startY = startEvent.clientY;
    const startRect = { ...this.cropRect };
    const bounds = this.cropBounds;
    const minSize = 60;

    const onMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      let { left, top, width, height } = startRect;

      if (mode === 'move') {
        left = Math.max(bounds.left, Math.min(startRect.left + dx, bounds.left + bounds.width - width));
        top = Math.max(bounds.top, Math.min(startRect.top + dy, bounds.top + bounds.height - height));
      } else {
        if (mode.includes('w')) {
          const newLeft = Math.max(bounds.left, Math.min(startRect.left + dx, startRect.left + startRect.width - minSize));
          width = startRect.width - (newLeft - startRect.left);
          left = newLeft;
        }
        if (mode.includes('e')) {
          width = Math.max(minSize, Math.min(startRect.width + dx, bounds.left + bounds.width - startRect.left));
        }
        if (mode.includes('n')) {
          const newTop = Math.max(bounds.top, Math.min(startRect.top + dy, startRect.top + startRect.height - minSize));
          height = startRect.height - (newTop - startRect.top);
          top = newTop;
        }
        if (mode.includes('s')) {
          height = Math.max(minSize, Math.min(startRect.height + dy, bounds.top + bounds.height - startRect.top));
        }
      }

      this.cropRect = { left, top, width, height };
      this.render();
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  }

  getCroppedCanvas() {
    const { cropRect: rect, cropBounds: bounds, sourceCanvas } = this;
    if (!rect || !bounds || !sourceCanvas) return null;

    const scaleX = sourceCanvas.width / bounds.width;
    const scaleY = sourceCanvas.height / bounds.height;

    const sx = (rect.left - bounds.left) * scaleX;
    const sy = (rect.top - bounds.top) * scaleY;
    const sw = rect.width * scaleX;
    const sh = rect.height * scaleY;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = Math.max(1, Math.round(sw));
    outCanvas.height = Math.max(1, Math.round(sh));
    outCanvas.getContext('2d').drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, outCanvas.width, outCanvas.height);
    return outCanvas;
  }

  reset() {
    this.sourceCanvas = null;
    this.cropRect = null;
    this.cropBounds = null;
  }
}
