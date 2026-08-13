/**
 * Scan & Upload View Manager
 * Handles scan mode switching, file selections, camera stream modal, upload previews, and batch OCR.
 */

import { learningDB } from '../services/storage/learning-db.js';
import { ocrEngine } from '../services/ocr/ocr-engine.js';
import { CameraController } from '../services/camera/camera-controller.js';
import { ImageCropper } from '../services/camera/image-cropper.js';
import { canvasToFile } from '../utils/canvas-file.js';
import { translationEngine } from '../services/translator.js';

export class ScanViewManager {
  constructor(dom, state, router, openReaderForPagesCallback, showToastCallback) {
    this.dom = dom;
    this.state = state;
    this.router = router;
    this.openReaderForPagesCallback = openReaderForPagesCallback;
    this.showToastCallback = showToastCallback;

    this.camera = new CameraController(dom.videoCameraFeed);
    this.cropper = new ImageCropper({
      wrapEl: dom.cropCanvasWrap,
      imageEl: dom.cropImage,
      boxEl: dom.cropBox
    });
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
      await this.camera.start();
      this.resetToLiveStage();
      this.dom.modalCameraStream?.classList.add('active');

      // Push history state so physical back button on mobile closes camera instead of exiting app
      if (!this._isCameraHistoryPushed) {
        history.pushState({ modal: 'cameraStream' }, '');
        this._isCameraHistoryPushed = true;
      }

      this._popStateListener = () => {
        if (this.dom.modalCameraStream?.classList.contains('active')) {
          this.stopCameraStream(false);
        }
      };
      window.addEventListener('popstate', this._popStateListener, { once: true });

    } catch (err) {
      this.showToastCallback?.('Unable to access camera: ' + err.message);
      console.error('[Camera] getUserMedia failed:', err);
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

    this.camera.stop();
    this.dom.modalCameraStream?.classList.remove('active');
    this.resetToLiveStage();
    this.cropper.reset();
  }

  resetToLiveStage() {
    if (this.dom.cameraCropStage) this.dom.cameraCropStage.style.display = 'none';
    if (this.dom.cameraLiveStage) this.dom.cameraLiveStage.style.display = 'block';
    if (this.dom.cameraStageTitle) this.dom.cameraStageTitle.textContent = '📷 Live Camera Scanner';
  }

  snapFrameFromCamera() {
    try {
      const canvas = this.camera.captureFrame();
      if (!canvas) return;
      this.showCropStage(canvas);
    } catch (err) {
      console.error('[Camera] Snap failed:', err);
      this.showToastCallback?.('Camera capture failed: ' + err.message);
    }
  }

  // ---- Crop stage ----

  async showCropStage(canvas) {
    if (this.dom.cameraLiveStage) this.dom.cameraLiveStage.style.display = 'none';
    if (this.dom.cameraCropStage) this.dom.cameraCropStage.style.display = 'block';
    if (this.dom.cameraStageTitle) this.dom.cameraStageTitle.textContent = '✂️ Crop Page';

    await this.cropper.load(canvas);
  }

  retakePhoto() {
    this.cropper.reset();
    this.resetToLiveStage();
  }

  async confirmCrop() {
    const croppedCanvas = this.cropper.getCroppedCanvas();
    if (!croppedCanvas) return;

    const file = await canvasToFile(croppedCanvas);
    this.handleFileSelection([file]);
    this.stopCameraStream();
  }

  async handleStartBatchOcr() {
    if (this.state.uploadedImages.length === 0) return;

    this.dom.ocrProgressBox.style.display = 'block';
    this.dom.btnStartOcr.disabled = true;

    const totalImages = this.state.uploadedImages.length;
    const scannedPages = [];

    try {
      const sourceLangCode = translationEngine.getSourceLanguage();
      const targetLangCode = translationEngine.getTargetLanguage();
      const preferOffline = localStorage.getItem('prefer_offline_ocr') === 'true';

      for (let i = 0; i < totalImages; i++) {
        const file = this.state.uploadedImages[i];
        const pageNum = i + 1;

        const result = await ocrEngine.processSingleImage(file, (info) => {
          this.dom.ocrProgressStatus.textContent = `Page ${pageNum}/${totalImages}: ${info.status}`;
          const currentPercent = Math.round(((i + (info.progress || 0) / 100) / totalImages) * 100);
          this.dom.ocrProgressPercent.textContent = `${currentPercent}%`;
          this.dom.ocrProgressBarFill.style.width = `${currentPercent}%`;
        }, { sourceLangCode, targetLangCode, preferOffline });

        scannedPages.push({
          pageIndex: i,
          title: result.title || `Page ${pageNum}`,
          textEn: result.textEn,
          textHi: result.textHi,
          sourceLangCode: result.sourceLangCode || sourceLangCode,
          translatedLangCode: result.translatedLangCode || targetLangCode,
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
            sourceLangCode: p.sourceLangCode,
            translatedLangCode: p.translatedLangCode,
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
