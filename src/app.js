/**
 * Kids Learning App - Main Application Orchestrator & Bootstrap Entry Point
 */

import { getDomElements } from './core/dom.js';
import { AppState } from './core/state.js';
import { logger } from './utils/logger.js';
import { learningDB } from './services/storage/learning-db.js';
import { NavigationRouter, openModal, closeModal } from './views/navigation.js';
import { HomeViewManager } from './views/home-view.js';
import { ScanViewManager } from './views/scan-view.js';
import { ReaderViewManager } from './views/reader-view.js';
import { AudioController } from './controllers/audio-controller.js';
import { SettingsController } from './controllers/settings-controller.js';

export class KidsLearningApp {
  constructor() {
    this.dom = getDomElements();
    this.state = new AppState();

    this.router = new NavigationRouter(this.dom, this.state);
    this.audioCtrl = new AudioController(this.dom, this.state, (msg) => this.showToast(msg));
    this.settingsCtrl = new SettingsController(this.dom, (msg) => this.showToast(msg));

    this.readerView = new ReaderViewManager(this.dom, this.state, this.router, (msg) => this.showToast(msg));
    this.scanView = new ScanViewManager(
      this.dom,
      this.state,
      this.router,
      (pages, title, isTemp) => this.readerView.openReaderForPages(pages, title, isTemp),
      (msg) => this.showToast(msg)
    );
    this.homeView = new HomeViewManager(
      this.dom,
      this.state,
      this.router,
      (chapId) => this.openChapterById(chapId),
      (msg) => this.showToast(msg)
    );

    this.init();
  }

  async init() {
    logger.initUi();
    this.bindEvents();
    await learningDB.initDB();
    await this.homeView.loadHomeData();
  }

  bindEvents() {
    // Navigation & Header
    this.dom.btnNavBack.addEventListener('click', () => this.router.navigateBack());
    this.dom.btnHeaderScan.addEventListener('click', () => this.openScanView());
    this.dom.quickScanBanner.addEventListener('click', () => this.openScanView());

    // AI Settings Modal
    this.dom.btnHeaderAiSettings?.addEventListener('click', () => this.settingsCtrl.openAiSettingsModal());
    this.dom.btnCloseAiSettings?.addEventListener('click', () => closeModal(this.dom.modalAiSettings));
    this.dom.btnSaveAiKey?.addEventListener('click', () => this.settingsCtrl.handleSaveAiKey());
    this.dom.btnClearAiKey?.addEventListener('click', () => this.settingsCtrl.handleClearAiKey());
    this.dom.btnTestAiKey?.addEventListener('click', () => this.settingsCtrl.handleTestAiKey());

    // Add Subject Modal
    this.dom.btnAddSubjectModal?.addEventListener('click', () => openModal(this.dom.modalAddSubject));
    this.dom.btnCloseSubjectModal?.addEventListener('click', () => closeModal(this.dom.modalAddSubject));
    this.dom.btnSaveSubject?.addEventListener('click', () => this.homeView.handleCreateSubject());

    // Scan Mode & Upload Events
    this.dom.btnModeFullChapter?.addEventListener('click', () => this.scanView.setScanMode('full'));
    this.dom.btnModeTempPage?.addEventListener('click', () => this.scanView.setScanMode('temp'));

    this.dom.btnCameraSnap?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dom.fileInputCamera?.click();
    });
    this.dom.btnLiveScanner?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.scanView.openCameraView();
    });
    this.dom.fileInputCamera?.addEventListener('change', (e) => this.scanView.handleFileSelection(e.target.files));
    (this.dom.btnCloseCameraModal || document.getElementById('btnCloseCameraModal'))?.addEventListener('click', () => this.scanView.stopCameraStream());
    (this.dom.btnSnapCameraStream || document.getElementById('btnSnapCameraStream'))?.addEventListener('click', () => this.scanView.snapFrameFromCamera());

    this.dom.uploadDropzone?.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON' && !e.target.classList.contains('btn-pill')) {
        this.dom.fileInputMulti.click();
      }
    });
    this.dom.btnChoosePhotos?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dom.fileInputMulti.click();
    });
    this.dom.fileInputMulti?.addEventListener('change', (e) => this.scanView.handleFileSelection(e.target.files));

    this.dom.btnStartOcr?.addEventListener('click', () => this.scanView.handleStartBatchOcr());

    // Reader View Events
    this.dom.btnLangEn?.addEventListener('click', () => this.readerView.switchReaderLanguage('en'));
    this.dom.btnLangHi?.addEventListener('click', () => this.readerView.switchReaderLanguage('hi'));
    this.dom.btnEditTextContent?.addEventListener('click', () => this.readerView.openEditTextModal());
    this.dom.btnCloseEditTextModal?.addEventListener('click', () => this.dom.modalEditText.classList.remove('active'));
    this.dom.btnSavePageTextEdit?.addEventListener('click', () => this.readerView.handleSavePageTextEdit());

    // Audio Controls
    this.dom.btnPlayMain?.addEventListener('click', () => this.audioCtrl.toggleAudioPlayback());
    this.dom.btnSpeedDec?.addEventListener('click', () => {
      const nextSpeed = Math.max(0.1, Math.round((this.audioCtrl.currentSpeed - 0.1) * 10) / 10);
      this.audioCtrl.changeSpeechSpeed(nextSpeed);
    });
    this.dom.btnSpeedInc?.addEventListener('click', () => {
      const nextSpeed = Math.min(2.0, Math.round((this.audioCtrl.currentSpeed + 0.1) * 10) / 10);
      this.audioCtrl.changeSpeechSpeed(nextSpeed);
    });
  }

  async openScanView() {
    await this.scanView.populateScanSubjectDropdown();
    this.router.navigateTo('view-scan', 'Scan Book');
  }

  async openChapterById(chapterId) {
    const chapters = await learningDB.getAllChapters();
    const chap = chapters.find(c => c.id === chapterId);
    if (!chap) return;

    const pages = await learningDB.getPagesByChapter(chapterId);
    this.readerView.openReaderForPages(pages, chap.title, false);
  }

  startAudioPlayback(startIndex = 0) {
    this.audioCtrl.startAudioPlayback(startIndex);
  }

  updatePlayButtonState(isPlaying) {
    this.audioCtrl.updatePlayButtonState(isPlaying);
  }

  showToast(message) {
    this.dom.toastMsg.textContent = message;
    this.dom.toastMsg.classList.add('show');
    setTimeout(() => {
      this.dom.toastMsg.classList.remove('show');
    }, 2800);
  }
}

// Global PWA Initialization
document.addEventListener('DOMContentLoaded', () => {
  window.app = new KidsLearningApp();
});
