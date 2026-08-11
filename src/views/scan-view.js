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
      this.state.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      const videoFeed = this.dom.videoCameraFeed || document.getElementById('videoCameraFeed');
      const modal = this.dom.modalCameraStream || document.getElementById('modalCameraStream');
      const btnClose = document.getElementById('btnCloseCameraModal');

      if (videoFeed) {
        videoFeed.srcObject = this.state.cameraStream;
      }
      if (modal) {
        modal.classList.add('active');
        modal.onclick = (e) => {
          if (e.target.id === 'modalCameraStream') this.stopCameraStream();
        };
      }
      if (btnClose) {
        btnClose.onclick = (e) => {
          if (e) { e.preventDefault(); e.stopPropagation(); }
          this.stopCameraStream();
        };
      }
    } catch (err) {
      alert('Unable to access camera stream: ' + err.message);
    }
  }

  stopCameraStream() {
    if (this.state.cameraStream) {
      this.state.cameraStream.getTracks().forEach(track => track.stop());
      this.state.cameraStream = null;
    }
    const videoFeed = this.dom.videoCameraFeed || document.getElementById('videoCameraFeed');
    if (videoFeed) {
      videoFeed.srcObject = null;
    }
    const modal = this.dom.modalCameraStream || document.getElementById('modalCameraStream');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  snapFrameFromCamera() {
    const videoFeed = this.dom.videoCameraFeed || document.getElementById('videoCameraFeed');
    if (!videoFeed) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoFeed.videoWidth || 1280;
    canvas.height = videoFeed.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoFeed, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      const capturedFile = new File([blob], `snap_${Date.now()}.jpg`, { type: 'image/jpeg' });
      this.handleFileSelection([capturedFile]);
      this.stopCameraStream();
    }, 'image/jpeg', 0.9);
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
