/**
 * Scan & Upload View Manager
 * Handles scan mode switching, file selections, camera stream modal, upload previews, and batch OCR.
 */

import { learningDB } from '../services/storage/learning-db.js';
import { ocrEngine } from '../services/ocr/ocr-engine.js';

export class ScanViewManager {
  constructor(dom, state, router, openReaderForPagesCallback, showToastCallback) {
    this.dom = dom;
    this.state = state;
    this.router = router;
    this.openReaderForPagesCallback = openReaderForPagesCallback;
    this.showToastCallback = showToastCallback;
  }

  async populateScanSubjectDropdown() {
    const subjects = await learningDB.getAllSubjects();
    this.dom.selectScanSubject.innerHTML = '';
    this.dom.selectSaveTempSubject.innerHTML = '';

    subjects.forEach(sub => {
      const opt1 = document.createElement('option');
      opt1.value = sub.id;
      opt1.textContent = `${sub.icon} ${sub.name}`;
      this.dom.selectScanSubject.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = sub.id;
      opt2.textContent = `${sub.icon} ${sub.name}`;
      this.dom.selectSaveTempSubject.appendChild(opt2);
    });

    if (this.state.selectedSubjectId) {
      this.dom.selectScanSubject.value = this.state.selectedSubjectId;
      this.dom.selectSaveTempSubject.value = this.state.selectedSubjectId;
    }
  }

  setScanMode(mode) {
    this.state.scanMode = mode;

    if (mode === 'full') {
      this.dom.radioModeFull.checked = true;
      this.dom.radioModeTemp.checked = false;
      this.dom.btnModeFullChapter.classList.add('selected');
      this.dom.btnModeTempPage.classList.remove('selected');
      this.dom.fullChapterFields.style.display = 'block';
      this.dom.tempScanNotice.style.display = 'none';

      this.dom.dropzoneTitleText.textContent = 'Tap to Snap or Drop Photos';
      this.dom.dropzoneSubText.textContent = 'Upload multiple textbook pages at once';
    } else {
      this.dom.radioModeFull.checked = false;
      this.dom.radioModeTemp.checked = true;
      this.dom.btnModeFullChapter.classList.remove('selected');
      this.dom.btnModeTempPage.classList.add('selected');
      this.dom.fullChapterFields.style.display = 'none';
      this.dom.tempScanNotice.style.display = 'block';

      this.dom.dropzoneTitleText.textContent = 'Tap to Snap 1 Quick Page';
      this.dom.dropzoneSubText.textContent = 'Scan single page to read & learn instantly';

      if (this.state.uploadedImages.length > 1) {
        this.state.uploadedImages = [this.state.uploadedImages[0]];
        this.renderImagePreviews();
      }
    }
  }

  handleFileSelection(files) {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);

    if (this.state.scanMode === 'temp') {
      this.state.uploadedImages = [fileList[0]];
    } else {
      this.state.uploadedImages.push(...fileList);
    }

    this.renderImagePreviews();
  }

  renderImagePreviews() {
    this.dom.imagePreviewsGrid.innerHTML = '';

    if (this.state.uploadedImages.length === 0) {
      this.dom.btnStartOcr.disabled = true;
      this.dom.btnStartOcr.innerHTML = '🔍 Start Scanning';
      return;
    }

    this.dom.btnStartOcr.disabled = false;
    this.dom.btnStartOcr.innerHTML = `🔍 Start Scanning (${this.state.uploadedImages.length} ${this.state.uploadedImages.length === 1 ? 'Page' : 'Pages'})`;

    this.state.uploadedImages.forEach((file, index) => {
      const card = document.createElement('div');
      card.className = 'preview-thumb-card';

      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      card.appendChild(img);

      const btnRemove = document.createElement('button');
      btnRemove.className = 'btn-remove-thumb';
      btnRemove.innerHTML = '✕';
      btnRemove.addEventListener('click', (e) => {
        e.stopPropagation();
        this.state.uploadedImages.splice(index, 1);
        this.renderImagePreviews();
      });

      card.appendChild(btnRemove);
      this.dom.imagePreviewsGrid.appendChild(card);
    });
  }

  async openCameraView() {
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: 'environment' } }
        });
      } catch (e1) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
          });
        } catch (e2) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }
      this.state.cameraStream = stream;

      const videoFeed = this.dom.videoCameraFeed || document.getElementById('videoCameraFeed');
      const modal = this.dom.modalCameraStream || document.getElementById('modalCameraStream');

      if (videoFeed) {
        videoFeed.muted = true;
        videoFeed.setAttribute('playsinline', '');
        videoFeed.setAttribute('webkit-playsinline', '');
        videoFeed.srcObject = this.state.cameraStream;
        await videoFeed.play().catch(pErr => console.warn('[Camera] play() warning:', pErr));
      }
      if (modal) {
        modal.classList.add('active');
      }

      // Push history state so physical back button on mobile closes camera instead of exiting app
      if (!this._isCameraHistoryPushed) {
        history.pushState({ modal: 'cameraStream' }, '');
        this._isCameraHistoryPushed = true;
      }

      this._popStateListener = () => {
        const modalEl = this.dom.modalCameraStream || document.getElementById('modalCameraStream');
        if (modalEl && modalEl.classList.contains('active')) {
          this.stopCameraStream(false);
        }
      };
      window.addEventListener('popstate', this._popStateListener, { once: true });

    } catch (err) {
      console.error('[Camera] openCameraView failed:', err);
      alert('Unable to access camera: ' + err.message);
    }
  }

  stopCameraStream(triggerHistoryBack = true) {
    if (this._popStateListener) {
      window.removeEventListener('popstate', this._popStateListener);
      this._popStateListener = null;
    }

    if (this._isCameraHistoryPushed) {
      this._isCameraHistoryPushed = false;
      if (triggerHistoryBack && history.state?.modal === 'cameraStream') {
        history.back();
      }
    }

    if (this.state.cameraStream) {
      this.state.cameraStream.getTracks().forEach(track => track.stop());
      this.state.cameraStream = null;
    }
    const videoFeed = this.dom.videoCameraFeed || document.getElementById('videoCameraFeed');
    if (videoFeed) {
      videoFeed.srcObject = null;
    }

    // Reset crop state so next open starts fresh on the live phase
    this._crop = null;
    this._cropCanvas = null;
    const cropOverlay = document.getElementById('cropHandleOverlay');
    if (cropOverlay) cropOverlay.innerHTML = '';
    const livePhase = document.getElementById('cameraLivePhase');
    const cropPhase = document.getElementById('cameraCropPhase');
    if (livePhase) livePhase.style.display = 'flex';
    if (cropPhase) cropPhase.style.display = 'none';

    const modal = this.dom.modalCameraStream || document.getElementById('modalCameraStream');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  snapFrameFromCamera() {
    const videoFeed = this.dom.videoCameraFeed || document.getElementById('videoCameraFeed');
    if (!videoFeed) return;

    try {
      const canvas = document.getElementById('cropCanvas');
      const width  = videoFeed.videoWidth  > 0 ? videoFeed.videoWidth  : (videoFeed.clientWidth  || 1280);
      const height = videoFeed.videoHeight > 0 ? videoFeed.videoHeight : (videoFeed.clientHeight || 720);
      canvas.width  = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoFeed, 0, 0, width, height);

      // Switch to crop phase
      const livePhase = document.getElementById('cameraLivePhase');
      const cropPhase = document.getElementById('cameraCropPhase');
      if (livePhase) livePhase.style.display = 'none';
      if (cropPhase) cropPhase.style.display = 'flex';

      this._initCropUI(canvas);
    } catch (err) {
      console.error('[Camera] Snap failed:', err);
      alert('Camera capture failed: ' + err.message);
      this.stopCameraStream();
    }
  }

  _initCropUI(canvas) {
    const margin = 0.10;
    this._crop = {
      x: Math.round(canvas.width  * margin),
      y: Math.round(canvas.height * margin),
      w: Math.round(canvas.width  * (1 - margin * 2)),
      h: Math.round(canvas.height * (1 - margin * 2))
    };
    this._cropCanvas = canvas;
    this._buildCropDOM();
    requestAnimationFrame(() => {
      this._updateCropPositions();
    });
  }

  _buildCropDOM() {
    const overlay = document.getElementById('cropHandleOverlay');
    if (!overlay) return;
    overlay.innerHTML = '';

    const rect = document.createElement('div');
    rect.className = 'crop-rect';
    overlay.appendChild(rect);

    const corners = [
      { key: 'tl', fx: 0, fy: 0, cursor: 'nwse-resize' },
      { key: 'tr', fx: 1, fy: 0, cursor: 'nesw-resize' },
      { key: 'bl', fx: 0, fy: 1, cursor: 'nesw-resize' },
      { key: 'br', fx: 1, fy: 1, cursor: 'nwse-resize' }
    ];

    const handleElements = {};

    corners.forEach(({ key, fx, fy, cursor }) => {
      const handle = document.createElement('div');
      handle.className = 'crop-handle';
      handle.dataset.corner = key;
      handle.style.cursor = cursor;
      overlay.appendChild(handle);
      handleElements[key] = handle;

      let startPointer = null;
      let startCrop    = null;

      const onPointerDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        try { handle.setPointerCapture(e.pointerId); } catch {}
        startPointer = { x: e.clientX, y: e.clientY };
        startCrop = { ...this._crop };
      };

      const onPointerMove = (e) => {
        if (!startPointer) return;
        e.preventDefault();

        const scale = this._cropScale || 1;
        const dx = (e.clientX - startPointer.x) / scale;
        const dy = (e.clientY - startPointer.y) / scale;
        const MIN_SIZE = 40;
        const imgW = this._cropCanvas ? this._cropCanvas.width : 1000;
        const imgH = this._cropCanvas ? this._cropCanvas.height : 1000;

        let { x: cx, y: cy, w: cw, h: ch } = startCrop;

        if (fx === 0) { // left
          const newW = Math.max(MIN_SIZE, cw - dx);
          cx = cx + (cw - newW);
          cw = newW;
        } else {        // right
          cw = Math.max(MIN_SIZE, cw + dx);
        }

        if (fy === 0) { // top
          const newH = Math.max(MIN_SIZE, ch - dy);
          cy = cy + (ch - newH);
          ch = newH;
        } else {        // bottom
          ch = Math.max(MIN_SIZE, ch + dy);
        }

        cx = Math.max(0, Math.min(cx, imgW - MIN_SIZE));
        cy = Math.max(0, Math.min(cy, imgH - MIN_SIZE));
        cw = Math.min(cw, imgW - cx);
        ch = Math.min(ch, imgH - cy);

        this._crop = { x: cx, y: cy, w: cw, h: ch };
        this._updateCropPositions();
      };

      const onPointerUp = (e) => {
        if (!startPointer) return;
        try { handle.releasePointerCapture(e.pointerId); } catch {}
        startPointer = null;
      };

      handle.addEventListener('pointerdown', onPointerDown);
      handle.addEventListener('pointermove', onPointerMove);
      handle.addEventListener('pointerup', onPointerUp);
      handle.addEventListener('pointercancel', onPointerUp);
    });

    // Body drag listener on crop rectangle
    let startRectPointer = null;
    let startRectCrop    = null;

    rect.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      try { rect.setPointerCapture(e.pointerId); } catch {}
      startRectPointer = { x: e.clientX, y: e.clientY };
      startRectCrop = { ...this._crop };
    });

    rect.addEventListener('pointermove', (e) => {
      if (!startRectPointer) return;
      e.preventDefault();

      const scale = this._cropScale || 1;
      const dx = (e.clientX - startRectPointer.x) / scale;
      const dy = (e.clientY - startRectPointer.y) / scale;
      const imgW = this._cropCanvas ? this._cropCanvas.width : 1000;
      const imgH = this._cropCanvas ? this._cropCanvas.height : 1000;

      let cx = startRectCrop.x + dx;
      let cy = startRectCrop.y + dy;

      cx = Math.max(0, Math.min(cx, imgW - startRectCrop.w));
      cy = Math.max(0, Math.min(cy, imgH - startRectCrop.h));

      this._crop = { x: cx, y: cy, w: startRectCrop.w, h: startRectCrop.h };
      this._updateCropPositions();
    });

    rect.addEventListener('pointerup', (e) => {
      if (!startRectPointer) return;
      try { rect.releasePointerCapture(e.pointerId); } catch {}
      startRectPointer = null;
    });

    rect.addEventListener('pointercancel', (e) => {
      if (!startRectPointer) return;
      try { rect.releasePointerCapture(e.pointerId); } catch {}
      startRectPointer = null;
    });

    this._cropElements = { rect, handles: handleElements };
  }

  _updateCropPositions() {
    if (!this._cropElements || !this._cropCanvas) return;
    const overlay = document.getElementById('cropHandleOverlay');
    if (!overlay) return;

    const canvas = this._cropCanvas;
    const oRect  = overlay.getBoundingClientRect();
    const cRect  = canvas.getBoundingClientRect();

    const imgW = canvas.width;
    const imgH = canvas.height;
    if (imgW <= 0 || imgH <= 0 || cRect.width <= 0 || cRect.height <= 0) return;

    const imgAspect = imgW / imgH;
    const boxAspect = cRect.width / cRect.height;

    let renderW, renderH, padX, padY;

    if (imgAspect > boxAspect) {
      renderW = cRect.width;
      renderH = cRect.width / imgAspect;
      padX    = 0;
      padY    = (cRect.height - renderH) / 2;
    } else {
      renderH = cRect.height;
      renderW = cRect.height * imgAspect;
      padX    = (cRect.width - renderW) / 2;
      padY    = 0;
    }

    const scale = renderW / imgW;
    this._cropScale = scale;

    const imgLeft = (cRect.left - oRect.left) + padX;
    const imgTop  = (cRect.top  - oRect.top)  + padY;

    const { x, y, w, h } = this._crop;
    const { rect, handles } = this._cropElements;

    if (rect) {
      rect.style.left   = `${imgLeft + x * scale}px`;
      rect.style.top    = `${imgTop  + y * scale}px`;
      rect.style.width  = `${w * scale}px`;
      rect.style.height = `${h * scale}px`;
    }

    const corners = [
      { key: 'tl', fx: 0, fy: 0 },
      { key: 'tr', fx: 1, fy: 0 },
      { key: 'bl', fx: 0, fy: 1 },
      { key: 'br', fx: 1, fy: 1 }
    ];

    corners.forEach(({ key, fx, fy }) => {
      const handle = handles[key];
      if (handle) {
        handle.style.left = `${imgLeft + (x + fx * w) * scale}px`;
        handle.style.top  = `${imgTop  + (y + fy * h) * scale}px`;
      }
    });
  }

  _confirmCrop() {
    const src = this._cropCanvas;
    if (!src) { this.stopCameraStream(); return; }

    let { x, y, w, h } = this._crop;

    x = Math.max(0, Math.min(Math.round(x), src.width - 10));
    y = Math.max(0, Math.min(Math.round(y), src.height - 10));
    w = Math.max(10, Math.min(Math.round(w), src.width - x));
    h = Math.max(10, Math.min(Math.round(h), src.height - y));

    const out = document.createElement('canvas');
    out.width  = w;
    out.height = h;
    out.getContext('2d').drawImage(src, x, y, w, h, 0, 0, w, h);

    out.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `crop_${Date.now()}.jpg`, { type: 'image/jpeg' });
        this.handleFileSelection([file]);
      }
      this.stopCameraStream();
    }, 'image/jpeg', 0.92);
  }

  _retakeFromCrop() {
    document.getElementById('cameraCropPhase').style.display = 'none';
    document.getElementById('cameraLivePhase').style.display = 'flex';
    this._crop = null;
    this._cropCanvas = null;
    const overlay = document.getElementById('cropHandleOverlay');
    if (overlay) overlay.innerHTML = '';
  }

  async fallbackSnapDataUrl(canvas) {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const res  = await fetch(dataUrl);
    const blob = await res.blob();
    const capturedFile = new File([blob], `snap_${Date.now()}.jpg`, { type: 'image/jpeg' });
    this.handleFileSelection([capturedFile]);
  }

  async handleStartBatchOcr() {
    if (this.state.uploadedImages.length === 0) return;

    this.dom.ocrProgressBox.style.display = 'block';
    this.dom.btnStartOcr.disabled = true;

    const totalImages = this.state.uploadedImages.length;
    const scannedPages = [];

    try {
      for (let i = 0; i < totalImages; i++) {
        const file = this.state.uploadedImages[i];
        const pageNum = i + 1;

        const result = await ocrEngine.processSingleImage(file, (info) => {
          this.dom.ocrProgressStatus.textContent = `Page ${pageNum}/${totalImages}: ${info.status}`;
          const currentPercent = Math.round(((i + (info.progress || 0) / 100) / totalImages) * 100);
          this.dom.ocrProgressPercent.textContent = `${currentPercent}%`;
          this.dom.ocrProgressBarFill.style.width = `${currentPercent}%`;
        });

        scannedPages.push({
          pageIndex: i,
          title: result.title || `Page ${pageNum}`,
          textEn: result.textEn,
          textHi: result.textHi,
          engineUsed: result.engineUsed
        });
      }

      this.dom.ocrProgressBox.style.display = 'none';
      this.dom.btnStartOcr.disabled = false;

      if (this.state.scanMode === 'temp') {
        this.openReaderForPagesCallback(scannedPages, 'Temporary Scan Page', true);
      } else {
        const subjectId = this.dom.selectScanSubject.value;
        const chapterTitle = this.dom.inputScanChapterTitle.value.trim() || scannedPages[0].title || 'New Chapter';
        const chapterId = `chap_${Date.now()}`;

        const chapter = {
          id: chapterId,
          subjectId,
          title: chapterTitle,
          pageCount: scannedPages.length,
          createdAt: new Date().toISOString()
        };

        await learningDB.saveChapter(chapter);

        for (const p of scannedPages) {
          await learningDB.savePage({
            id: `page_${Date.now()}_${p.pageIndex}`,
            chapterId,
            pageIndex: p.pageIndex,
            textEn: p.textEn,
            textHi: p.textHi,
            engineUsed: p.engineUsed
          });
        }

        this.showToastCallback('Chapter scanned & saved! 📚');
        this.state.uploadedImages = [];
        this.renderImagePreviews();
        this.openReaderForPagesCallback(scannedPages, chapterTitle, false);
      }
    } catch (err) {
      console.error('[Scan] Batch OCR failed:', err);
      alert('OCR Scanning failed: ' + err.message);
      this.dom.ocrProgressBox.style.display = 'none';
      this.dom.btnStartOcr.disabled = false;
    }
  }
}
