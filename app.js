/**
 * Kids Learning App - Main Application Logic & View Controller
 */

class KidsLearningApp {
  constructor() {
    // Current Active State
    this.currentView = 'home';
    this.viewHistory = [];
    this.selectedSubjectId = null;
    this.selectedChapterId = null;
    this.currentChapterPages = [];
    this.currentPageIndex = 0;
    this.currentLanguage = 'en'; // 'en' or 'hi'
    
    // Multi-Image Upload & Scan Mode State
    this.selectedUploadFiles = [];
    this.scanMode = 'full'; // 'full' (Full Chapter) or 'temp' (Temporary 1 Page)
    this.temporaryPagesData = null; // Stores in-memory pages for temporary scan

    // DOM Elements Cache
    this.dom = {};
  }

  async init() {
    this.cacheDomElements();
    this.bindEvents();

    // Initialize Database
    try {
      await window.learningDB.init();
      await this.loadSubjects();
    } catch (err) {
      console.error('Failed to init DB:', err);
      this.showToast('Database initialisation error');
    }

    // Default View
    this.navigateTo('home');
  }

  cacheDomElements() {
    this.dom = {
      // Views
      viewHome: document.getElementById('view-home'),
      viewSubject: document.getElementById('view-subject'),
      viewScan: document.getElementById('view-scan'),
      viewChapter: document.getElementById('view-chapter'),
      
      // Header & Nav
      btnHeaderScan: document.getElementById('btnHeaderScan'),
      navBackBar: document.getElementById('navBackBar'),
      btnNavBack: document.getElementById('btnNavBack'),
      navBreadcrumb: document.getElementById('navBreadcrumb'),
      
      // Home & Subjects
      quickScanBanner: document.getElementById('quickScanBanner'),
      subjectsGrid: document.getElementById('subjectsGrid'),
      btnAddSubjectModal: document.getElementById('btnAddSubjectModal'),
      
      // Subject View
      subjectDetailTitle: document.getElementById('subjectDetailTitle'),
      chaptersList: document.getElementById('chaptersList'),
      btnAddChapterModal: document.getElementById('btnAddChapterModal'),

      // Upload & Scan View & Options
      scanModeOptions: document.getElementById('scanModeOptions'),
      btnModeFullChapter: document.getElementById('btnModeFullChapter'),
      btnModeTempPage: document.getElementById('btnModeTempPage'),
      radioModeFull: document.getElementById('radioModeFull'),
      radioModeTemp: document.getElementById('radioModeTemp'),
      fullChapterFields: document.getElementById('fullChapterFields'),
      tempScanNotice: document.getElementById('tempScanNotice'),
      dropzoneTitleText: document.getElementById('dropzoneTitleText'),
      dropzoneSubText: document.getElementById('dropzoneSubText'),
      uploadDropzone: document.getElementById('uploadDropzone'),
      fileInputMulti: document.getElementById('fileInputMulti'),
      btnChoosePhotos: document.getElementById('btnChoosePhotos'),
      btnPasteClipboard: document.getElementById('btnPasteClipboard'),
      imagePreviewsGrid: document.getElementById('imagePreviewsGrid'),
      selectScanSubject: document.getElementById('selectScanSubject'),
      inputScanChapterTitle: document.getElementById('inputScanChapterTitle'),
      btnStartOcr: document.getElementById('btnStartOcr'),
      ocrProgressBox: document.getElementById('ocrProgressBox'),
      ocrProgressStatus: document.getElementById('ocrProgressStatus'),
      ocrProgressPercent: document.getElementById('ocrProgressPercent'),
      ocrProgressBarFill: document.getElementById('ocrProgressBarFill'),

      // Chapter Reader View
      tempScanHeaderBanner: document.getElementById('tempScanHeaderBanner'),
      btnSaveTempToChapter: document.getElementById('btnSaveTempToChapter'),
      readerChapterTitle: document.getElementById('readerChapterTitle'),
      readerSubjectBadge: document.getElementById('readerSubjectBadge'),
      btnLangEn: document.getElementById('btnLangEn'),
      btnLangHi: document.getElementById('btnLangHi'),
      readerPageIndicator: document.getElementById('readerPageIndicator'),
      btnViewOriginalImage: document.getElementById('btnViewOriginalImage'),
      textContentBox: document.getElementById('textContentBox'),

      // Audio Player Dock
      audioPlayerDock: document.getElementById('audioPlayerDock'),
      btnPlayMain: document.getElementById('btnPlayMain'),
      audioAccentLabel: document.getElementById('audioAccentLabel'),
      speedBtns: document.querySelectorAll('.speed-btn'),
      selectVoicePicker: document.getElementById('selectVoicePicker'),

      // Modal Add Subject
      modalAddSubject: document.getElementById('modalAddSubject'),
      btnCloseSubjectModal: document.getElementById('btnCloseSubjectModal'),
      inputSubjectName: document.getElementById('inputSubjectName'),
      selectSubjectIcon: document.getElementById('selectSubjectIcon'),
      selectSubjectTheme: document.getElementById('selectSubjectTheme'),
      btnSaveSubject: document.getElementById('btnSaveSubject'),

      // Modal Save Temporary Scan
      modalSaveTemp: document.getElementById('modalSaveTemp'),
      btnCloseSaveTempModal: document.getElementById('btnCloseSaveTempModal'),
      selectSaveTempSubject: document.getElementById('selectSaveTempSubject'),
      inputSaveTempTitle: document.getElementById('inputSaveTempTitle'),
      btnConfirmSaveTemp: document.getElementById('btnConfirmSaveTemp'),

      // Toast
      toastMsg: document.getElementById('toastMsg')
    };
  }

  bindEvents() {
    // Nav Back Button
    this.dom.btnNavBack.addEventListener('click', () => this.navigateBack());
    
    // Header Scan Button & Quick Banner
    this.dom.btnHeaderScan.addEventListener('click', () => this.openScanView());
    this.dom.quickScanBanner.addEventListener('click', () => this.openScanView());

    // Modal Add Subject
    this.dom.btnAddSubjectModal.addEventListener('click', () => {
      this.dom.modalAddSubject.classList.add('active');
    });
    this.dom.btnCloseSubjectModal.addEventListener('click', () => {
      this.dom.modalAddSubject.classList.remove('active');
    });
    this.dom.btnSaveSubject.addEventListener('click', () => this.handleCreateSubject());

    // Upload & Scan Events & Mode Selector
    if (this.dom.btnModeFullChapter) {
      this.dom.btnModeFullChapter.addEventListener('click', () => this.setScanMode('full'));
    }
    if (this.dom.btnModeTempPage) {
      this.dom.btnModeTempPage.addEventListener('click', () => this.setScanMode('temp'));
    }

    if (this.dom.btnSaveTempToChapter) {
      this.dom.btnSaveTempToChapter.addEventListener('click', () => this.openSaveTempModal());
    }
    if (this.dom.btnCloseSaveTempModal) {
      this.dom.btnCloseSaveTempModal.addEventListener('click', () => {
        this.dom.modalSaveTemp.classList.remove('active');
      });
    }
    if (this.dom.btnConfirmSaveTemp) {
      this.dom.btnConfirmSaveTemp.addEventListener('click', () => this.handleSaveTempToDatabase());
    }

    this.dom.uploadDropzone.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON' && !e.target.classList.contains('btn-pill')) {
        this.dom.fileInputMulti.click();
      }
    });

    if (this.dom.btnChoosePhotos) {
      this.dom.btnChoosePhotos.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dom.fileInputMulti.click();
      });
    }

    if (this.dom.btnPasteClipboard) {
      this.dom.btnPasteClipboard.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.handleClipboardPaste();
      });
    }

    // Global Paste Event (Ctrl+V anywhere in app)
    window.addEventListener('paste', (e) => this.handleGlobalPasteEvent(e));

    this.dom.fileInputMulti.addEventListener('change', (e) => this.handleFileSelection(e.target.files));

    // Drag & Drop
    ['dragenter', 'dragover'].forEach(eventName => {
      this.dom.uploadDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        this.dom.uploadDropzone.classList.add('dragover');
      }, false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
      this.dom.uploadDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        this.dom.uploadDropzone.classList.remove('dragover');
      }, false);
    });
    this.dom.uploadDropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files) {
        this.handleFileSelection(dt.files);
      }
    });

    // Start OCR Button
    this.dom.btnStartOcr.addEventListener('click', () => this.handleStartBatchOcr());

    // Reader View - Language Tabs
    this.dom.btnLangEn.addEventListener('click', () => this.switchReaderLanguage('en'));
    this.dom.btnLangHi.addEventListener('click', () => this.switchReaderLanguage('hi'));

    // Audio Player Controls
    this.dom.btnPlayMain.addEventListener('click', () => this.toggleAudioPlayback());

    this.dom.speedBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.dom.speedBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const speed = parseFloat(btn.dataset.speed || 0.7);
        window.ttsPlayer.setRate(speed);
        this.showToast(`Reading speed: ${speed}x`);
      });
    });

    if (this.dom.selectVoicePicker) {
      this.dom.selectVoicePicker.addEventListener('change', (e) => {
        const selectedName = e.target.value;
        window.ttsPlayer.setSelectedVoiceByName(selectedName);
        this.showToast(`Voice changed: ${selectedName.split('-')[0]}`);
      });
    }

    this.populateVoiceDropdown();
  }

  populateVoiceDropdown() {
    if (!this.dom.selectVoicePicker) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;

    this.dom.selectVoicePicker.innerHTML = '';

    // Group voices: Indian voices first, then others
    const indianVoices = voices.filter(v => {
      const name = v.name.toLowerCase();
      const lang = v.lang.toLowerCase();
      return (
        lang.includes('in') ||
        lang.includes('hi') ||
        name.includes('india') ||
        name.includes('heera') ||
        name.includes('ravi') ||
        name.includes('neerja') ||
        name.includes('prabhat')
      );
    });

    const otherVoices = voices.filter(v => !indianVoices.includes(v));

    const createGroup = (label, voiceList) => {
      if (voiceList.length === 0) return;
      const group = document.createElement('optgroup');
      group.label = label;
      voiceList.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.name;
        opt.textContent = `${v.name} (${v.lang})`;
        group.appendChild(opt);
      });
      this.dom.selectVoicePicker.appendChild(group);
    };

    createGroup('🇮🇳 Recommended Indian Accent Voices', indianVoices);
    createGroup('🌐 Other System Voices', otherVoices);

    // Auto-select first Indian voice if available
    if (indianVoices.length > 0) {
      this.dom.selectVoicePicker.value = indianVoices[0].name;
      window.ttsPlayer.setSelectedVoiceByName(indianVoices[0].name);
    }
  }

  // --- NAVIGATION CONTROLLER ---
  navigateTo(viewName, breadcrumbText = '') {
    if (this.currentView !== viewName) {
      this.viewHistory.push({ view: this.currentView, breadcrumb: this.dom.navBreadcrumb.textContent });
    }

    this.currentView = viewName;

    // Hide all view sections
    [this.dom.viewHome, this.dom.viewSubject, this.dom.viewScan, this.dom.viewChapter].forEach(el => {
      el.classList.remove('active');
    });

    // Stop audio on view change
    window.ttsPlayer.stop();
    this.updatePlayButtonState(false);

    if (viewName === 'home') {
      this.dom.viewHome.classList.add('active');
      this.dom.navBackBar.style.display = 'none';
    } else if (viewName === 'subject') {
      this.dom.viewSubject.classList.add('active');
      this.dom.navBackBar.style.display = 'flex';
      this.dom.navBreadcrumb.textContent = breadcrumbText || 'Subject';
    } else if (viewName === 'scan') {
      this.dom.viewScan.classList.add('active');
      this.dom.navBackBar.style.display = 'flex';
      this.dom.navBreadcrumb.textContent = 'Upload & Scan';
    } else if (viewName === 'chapter') {
      this.dom.viewChapter.classList.add('active');
      this.dom.navBackBar.style.display = 'flex';
      this.dom.navBreadcrumb.textContent = breadcrumbText || 'Reader';
    }
  }

  navigateBack() {
    if (this.viewHistory.length > 0) {
      const prev = this.viewHistory.pop();
      this.currentView = prev.view;

      [this.dom.viewHome, this.dom.viewSubject, this.dom.viewScan, this.dom.viewChapter].forEach(el => {
        el.classList.remove('active');
      });
      window.ttsPlayer.stop();
      this.updatePlayButtonState(false);

      if (prev.view === 'home') {
        this.dom.viewHome.classList.add('active');
        this.dom.navBackBar.style.display = 'none';
        this.loadSubjects();
      } else if (prev.view === 'subject') {
        this.dom.viewSubject.classList.add('active');
        this.dom.navBackBar.style.display = 'flex';
        this.dom.navBreadcrumb.textContent = prev.breadcrumb;
      }
    } else {
      this.navigateTo('home');
    }
  }

  // --- SUBJECTS CONTROLLER ---
  async loadSubjects() {
    const subjects = await window.learningDB.getAllSubjects();
    this.renderSubjectsGrid(subjects);
    this.populateScanSubjectSelect(subjects);
  }

  renderSubjectsGrid(subjects) {
    this.dom.subjectsGrid.innerHTML = '';
    subjects.forEach(sub => {
      const card = document.createElement('div');
      card.className = `subject-card card-theme-${sub.theme || 'purple'}`;
      card.innerHTML = `
        <div class="subject-icon-wrap">${sub.icon || '📖'}</div>
        <div class="subject-name">${sub.name}</div>
        <div class="subject-meta">Tap to view chapters</div>
      `;
      card.addEventListener('click', () => this.openSubjectDetail(sub));
      this.dom.subjectsGrid.appendChild(card);
    });
  }

  async handleCreateSubject() {
    const name = this.dom.inputSubjectName.value.trim();
    if (!name) {
      this.showToast('Please enter a subject name');
      return;
    }

    const newSub = {
      id: `sub_${Date.now()}`,
      name: name,
      icon: this.dom.selectSubjectIcon.value,
      theme: this.dom.selectSubjectTheme.value,
      createdAt: Date.now()
    };

    await window.learningDB.saveSubject(newSub);
    this.dom.inputSubjectName.value = '';
    this.dom.modalAddSubject.classList.remove('active');
    this.showToast(`Subject "${name}" created!`);
    await this.loadSubjects();
  }

  // --- CHAPTERS CONTROLLER ---
  async openSubjectDetail(subject) {
    this.selectedSubjectId = subject.id;
    this.dom.subjectDetailTitle.innerHTML = `<span>${subject.icon || '📖'}</span> ${subject.name}`;
    this.navigateTo('subject', subject.name);
    await this.loadSubjectChapters(subject.id);
  }

  async loadSubjectChapters(subjectId) {
    const chapters = await window.learningDB.getChaptersBySubject(subjectId);
    this.renderChaptersList(chapters);
  }

  renderChaptersList(chapters) {
    this.dom.chaptersList.innerHTML = '';
    if (chapters.length === 0) {
      this.dom.chaptersList.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
          <span style="font-size: 36px; display: block; margin-bottom: 8px;">📚</span>
          <p style="font-family: var(--font-heading); font-size: 16px;">No chapters yet</p>
          <p style="font-size: 13px;">Tap "+ New Pages" to upload textbook photos</p>
        </div>
      `;
      return;
    }

    chapters.forEach((chap, idx) => {
      const card = document.createElement('div');
      card.className = 'chapter-item-card';
      card.innerHTML = `
        <div class="chapter-left">
          <div class="chapter-badge">${idx + 1}</div>
          <div class="chapter-info">
            <h4>${chap.title}</h4>
            <p>Chapter • ${new Date(chap.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <button class="btn-delete-small" title="Delete Chapter">🗑️</button>
      `;

      card.querySelector('.chapter-left').addEventListener('click', () => this.openChapterReader(chap));
      card.querySelector('.btn-delete-small').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`Delete "${chap.title}"?`)) {
          await window.learningDB.deleteChapter(chap.id);
          this.showToast('Chapter deleted');
          this.loadSubjectChapters(this.selectedSubjectId);
        }
      });

      this.dom.chaptersList.appendChild(card);
    });
  }

  // --- MULTI-IMAGE UPLOAD & OCR SCANNER ---
  async openScanView() {
    const subjects = await window.learningDB.getAllSubjects();
    this.populateScanSubjectSelect(subjects);
    this.selectedUploadFiles = [];
    this.renderImagePreviews();
    this.setScanMode(this.scanMode || 'full');
    this.dom.ocrProgressBox.style.display = 'none';
    this.navigateTo('scan', 'Upload Pages');
  }

  setScanMode(mode) {
    this.scanMode = mode;
    if (mode === 'full') {
      this.dom.btnModeFullChapter.classList.add('active');
      this.dom.btnModeTempPage.classList.remove('active');
      this.dom.radioModeFull.checked = true;
      this.dom.radioModeTemp.checked = false;
      this.dom.fullChapterFields.style.display = 'block';
      this.dom.tempScanNotice.style.display = 'none';
      this.dom.dropzoneTitleText.textContent = 'Tap to Upload Chapter Photo(s)';
      this.dom.dropzoneSubText.textContent = 'Select files, drag & drop, or paste image from clipboard (Ctrl+V)';
      this.dom.btnStartOcr.innerHTML = '<span>✨ Extract Text & Save Full Chapter</span>';
    } else {
      this.dom.btnModeTempPage.classList.add('active');
      this.dom.btnModeFullChapter.classList.remove('active');
      this.dom.radioModeTemp.checked = true;
      this.dom.radioModeFull.checked = false;
      this.dom.fullChapterFields.style.display = 'none';
      this.dom.tempScanNotice.style.display = 'flex';
      this.dom.dropzoneTitleText.textContent = 'Tap to Upload 1 Photo for Quick Scan';
      this.dom.dropzoneSubText.textContent = 'Select 1 photo or paste image for temporary read aloud';
      this.dom.btnStartOcr.innerHTML = '<span>⚡ Quick Scan 1 Page & Read</span>';
    }
  }

  populateScanSubjectSelect(subjects) {
    this.dom.selectScanSubject.innerHTML = '';
    subjects.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.icon} ${s.name}`;
      if (this.selectedSubjectId && s.id === this.selectedSubjectId) {
        opt.selected = true;
      }
      this.dom.selectScanSubject.appendChild(opt);
    });
  }

  handleFileSelection(files) {
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        this.selectedUploadFiles.push(file);
      }
    }
    this.renderImagePreviews();
  }

  async handleClipboardPaste() {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();
        let foundImage = false;
        for (const item of clipboardItems) {
          const imageType = item.types.find(t => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const file = new File([blob], `pasted_image_${Date.now()}.png`, { type: imageType });
            this.selectedUploadFiles.push(file);
            foundImage = true;
          }
        }
        if (foundImage) {
          if (this.currentView !== 'scan') {
            await this.openScanView();
          } else {
            this.renderImagePreviews();
          }
          this.showToast('Image pasted from clipboard! 📋');
          return;
        }
      }
    } catch (err) {
      console.warn('Clipboard API read warning:', err);
    }
    this.showToast('Press Ctrl+V to paste your clipboard image!');
  }

  handleGlobalPasteEvent(e) {
    if (!e.clipboardData || !e.clipboardData.items) return;
    const items = e.clipboardData.items;
    let pasted = false;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          const file = new File([blob], `pasted_image_${Date.now()}_${i}.png`, { type: blob.type });
          this.selectedUploadFiles.push(file);
          pasted = true;
        }
      }
    }

    if (pasted) {
      if (this.currentView !== 'scan') {
        this.openScanView();
      } else {
        this.renderImagePreviews();
      }
      this.showToast('Image pasted from clipboard! 📋');
    }
  }

  renderImagePreviews() {
    this.dom.imagePreviewsGrid.innerHTML = '';
    this.selectedUploadFiles.forEach((file, index) => {
      const card = document.createElement('div');
      card.className = 'preview-thumb-card';
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn-remove-thumb';
      removeBtn.innerHTML = '✕';
      removeBtn.addEventListener('click', () => {
        this.selectedUploadFiles.splice(index, 1);
        this.renderImagePreviews();
      });

      card.appendChild(img);
      card.appendChild(removeBtn);
      this.dom.imagePreviewsGrid.appendChild(card);
    });
  }

  async handleStartBatchOcr() {
    if (this.selectedUploadFiles.length === 0) {
      // Create a sample textbook page for zero-friction instant testing & demo
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 400, 300);
      ctx.fillStyle = '#7C3AED';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('Class 2 Story Page', 110, 150);
      
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const sampleFile = new File([blob], 'sample_page.png', { type: 'image/png' });
      this.selectedUploadFiles.push(sampleFile);
    }

    let filesToProcess = this.selectedUploadFiles;
    if (this.scanMode === 'temp') {
      filesToProcess = [this.selectedUploadFiles[0]];
    }

    this.dom.btnStartOcr.disabled = true;
    this.dom.ocrProgressBox.style.display = 'block';

    // 1. Run OCR batch extraction
    const ocrResults = await window.ocrEngine.processImagesBatch(
      filesToProcess,
      (progressData) => {
        this.dom.ocrProgressStatus.textContent = progressData.status;
        this.dom.ocrProgressPercent.textContent = `${progressData.progress}%`;
        this.dom.ocrProgressBarFill.style.width = `${progressData.progress}%`;
      }
    );

    this.dom.ocrProgressStatus.textContent = 'Translating into Hindi...';

    if (this.scanMode === 'full') {
      // Option 1: Full Chapter Scan - Save permanently into DB
      const subjectId = this.dom.selectScanSubject.value;
      const chapterTitle = this.dom.inputScanChapterTitle.value.trim() || `Chapter ${Date.now().toString().slice(-4)}`;

      const chapterId = `chap_${Date.now()}`;
      const chapter = {
        id: chapterId,
        subjectId: subjectId,
        title: chapterTitle,
        createdAt: Date.now()
      };
      await window.learningDB.saveChapter(chapter);

      for (let i = 0; i < ocrResults.length; i++) {
        const res = ocrResults[i];
        const translatedHi = await window.translationEngine.translateToHindi(res.text);

        const page = {
          id: `page_${chapterId}_${i + 1}`,
          chapterId: chapterId,
          pageIndex: i + 1,
          textEn: res.text,
          textHi: translatedHi,
          createdAt: Date.now()
        };
        await window.learningDB.savePage(page);
      }

      this.dom.btnStartOcr.disabled = false;
      this.showToast('Full Chapter scanned & saved successfully! 🎉');
      this.openChapterReader(chapter);

    } else {
      // Option 2: Temporary Scan for 1 Page - Do NOT save to DB
      const tempPages = [];
      for (let i = 0; i < ocrResults.length; i++) {
        const res = ocrResults[i];
        const translatedHi = await window.translationEngine.translateToHindi(res.text);
        tempPages.push({
          id: `temp_page_${i + 1}`,
          chapterId: 'temp_chap',
          pageIndex: i + 1,
          textEn: res.text,
          textHi: translatedHi,
          createdAt: Date.now()
        });
      }

      const tempChapter = {
        id: 'temp_chap',
        subjectId: null,
        title: '⚡ Temporary 1-Page Scan',
        isTemporary: true
      };

      this.temporaryPagesData = tempPages;
      this.dom.btnStartOcr.disabled = false;
      this.showToast('Temporary 1-page scan ready! ⚡');
      this.openTemporaryChapterReader(tempChapter, tempPages);
    }
  }


  // --- CHAPTER READER & SENTENCE HIGHLIGHTING ---
  async openChapterReader(chapter) {
    this.selectedChapterId = chapter.id;
    this.dom.readerChapterTitle.textContent = chapter.title;

    const sub = await window.learningDB.getSubject(chapter.subjectId);
    this.dom.readerSubjectBadge.textContent = sub ? sub.name : 'Subject';

    if (this.dom.tempScanHeaderBanner) {
      this.dom.tempScanHeaderBanner.style.display = 'none';
    }

    this.currentChapterPages = await window.learningDB.getPagesByChapter(chapter.id);
    this.currentPageIndex = 0;
    this.currentLanguage = 'en';

    this.dom.btnLangEn.classList.add('active');
    this.dom.btnLangHi.classList.remove('active');

    this.navigateTo('chapter', chapter.title);
    this.renderCurrentReaderPage();
  }

  openTemporaryChapterReader(tempChapter, pages) {
    this.selectedChapterId = 'temp_chap';
    this.dom.readerChapterTitle.textContent = tempChapter.title;
    this.dom.readerSubjectBadge.textContent = 'Temporary Page';

    if (this.dom.tempScanHeaderBanner) {
      this.dom.tempScanHeaderBanner.style.display = 'flex';
    }

    this.currentChapterPages = pages;
    this.currentPageIndex = 0;
    this.currentLanguage = 'en';

    this.dom.btnLangEn.classList.add('active');
    this.dom.btnLangHi.classList.remove('active');

    this.navigateTo('chapter', 'Temporary Scan');
    this.renderCurrentReaderPage();
  }

  async openSaveTempModal() {
    const subjects = await window.learningDB.getAllSubjects();
    this.dom.selectSaveTempSubject.innerHTML = '';
    subjects.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.icon} ${s.name}`;
      this.dom.selectSaveTempSubject.appendChild(opt);
    });
    this.dom.inputSaveTempTitle.value = '';
    this.dom.modalSaveTemp.classList.add('active');
  }

  async handleSaveTempToDatabase() {
    if (!this.temporaryPagesData || this.temporaryPagesData.length === 0) {
      this.showToast('No temporary page data to save.');
      return;
    }

    const subjectId = this.dom.selectSaveTempSubject.value;
    const chapterTitle = this.dom.inputSaveTempTitle.value.trim() || `Scanned Page ${new Date().toLocaleDateString()}`;

    const chapterId = `chap_${Date.now()}`;
    const chapter = {
      id: chapterId,
      subjectId: subjectId,
      title: chapterTitle,
      createdAt: Date.now()
    };
    await window.learningDB.saveChapter(chapter);

    for (let i = 0; i < this.temporaryPagesData.length; i++) {
      const tempPage = this.temporaryPagesData[i];
      const page = {
        id: `page_${chapterId}_${i + 1}`,
        chapterId: chapterId,
        pageIndex: i + 1,
        textEn: tempPage.textEn,
        textHi: tempPage.textHi,
        createdAt: Date.now()
      };
      await window.learningDB.savePage(page);
    }

    this.dom.modalSaveTemp.classList.remove('active');
    if (this.dom.tempScanHeaderBanner) {
      this.dom.tempScanHeaderBanner.style.display = 'none';
    }

    const sub = await window.learningDB.getSubject(subjectId);
    this.dom.readerSubjectBadge.textContent = sub ? sub.name : 'Subject';
    this.dom.readerChapterTitle.textContent = chapterTitle;
    this.selectedChapterId = chapterId;
    this.showToast(`Saved to ${sub ? sub.name : 'Subject'}! 🎉`);
  }

  switchReaderLanguage(lang) {
    this.currentLanguage = lang;
    if (lang === 'en') {
      this.dom.btnLangEn.classList.add('active');
      this.dom.btnLangHi.classList.remove('active');
      this.dom.audioAccentLabel.textContent = 'Indian English (en-IN)';
    } else {
      this.dom.btnLangHi.classList.add('active');
      this.dom.btnLangEn.classList.remove('active');
      this.dom.audioAccentLabel.textContent = 'Indian Hindi (hi-IN)';
    }

    window.ttsPlayer.stop();
    this.updatePlayButtonState(false);
    this.renderCurrentReaderPage();
  }

  renderCurrentReaderPage() {
    if (this.currentChapterPages.length === 0) {
      this.dom.textContentBox.innerHTML = '<p>No page content found.</p>';
      return;
    }

    const page = this.currentChapterPages[this.currentPageIndex];
    this.dom.readerPageIndicator.textContent = `Page ${this.currentPageIndex + 1} of ${this.currentChapterPages.length}`;

    const textToDisplay = this.currentLanguage === 'hi' ? page.textHi : page.textEn;
    const sentences = window.ttsPlayer.prepareSentences(textToDisplay);

    this.dom.textContentBox.innerHTML = '';
    sentences.forEach((sentence, idx) => {
      const span = document.createElement('span');
      span.className = 'sentence-item';
      span.dataset.index = idx;
      span.textContent = sentence + ' ';
      
      // Tap sentence to read from that exact sentence!
      span.addEventListener('click', () => {
        window.ttsPlayer.stop();
        window.ttsPlayer.currentSentenceIndex = idx;
        this.startAudioPlayback();
      });

      this.dom.textContentBox.appendChild(span);
    });
  }

  // --- AUDIO PLAYBACK CONTROLLER ---
  toggleAudioPlayback() {
    if (window.ttsPlayer.isPlaying) {
      if (window.ttsPlayer.isPaused) {
        window.ttsPlayer.resume();
        this.updatePlayButtonState(true);
      } else {
        window.ttsPlayer.pause();
        this.updatePlayButtonState(false);
      }
    } else {
      this.startAudioPlayback();
    }
  }

  startAudioPlayback() {
    if (this.currentChapterPages.length === 0) return;
    const page = this.currentChapterPages[this.currentPageIndex];
    const textToRead = this.currentLanguage === 'hi' ? page.textHi : page.textEn;

    this.updatePlayButtonState(true);

    window.ttsPlayer.speakText(
      textToRead,
      this.currentLanguage,
      // Highlight sentence callback
      (activeSentenceIdx) => {
        const sentenceSpans = this.dom.textContentBox.querySelectorAll('.sentence-item');
        sentenceSpans.forEach((span, i) => {
          if (i === activeSentenceIdx) {
            span.classList.add('active-reading');
            span.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } else {
            span.classList.remove('active-reading');
          }
        });
      },
      // End callback
      () => {
        this.updatePlayButtonState(false);
      }
    );
  }

  updatePlayButtonState(isPlaying) {
    if (isPlaying) {
      this.dom.btnPlayMain.innerHTML = '⏸';
      this.dom.btnPlayMain.title = 'Pause Reading';
    } else {
      this.dom.btnPlayMain.innerHTML = '▶';
      this.dom.btnPlayMain.title = 'Play Reading';
    }
  }

  showToast(message) {
    this.dom.toastMsg.textContent = message;
    this.dom.toastMsg.classList.add('show');
    setTimeout(() => {
      this.dom.toastMsg.classList.remove('show');
    }, 2800);
  }
}

// Global App Initialization
document.addEventListener('DOMContentLoaded', () => {
  window.app = new KidsLearningApp();
  window.app.init();
});
