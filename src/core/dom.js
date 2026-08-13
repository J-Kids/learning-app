/**
 * DOM Element Reference Cache
 * Caches all static UI element references across the application.
 */

export function getDomElements() {
  return {
    // Navigation
    btnNavBack: document.getElementById('btnNavBack'),
    navBackBar: document.getElementById('navBackBar'),
    navBreadcrumb: document.getElementById('navBreadcrumb'),

    // App Header Buttons
    btnHeaderScan: document.getElementById('btnHeaderScan'),
    quickScanBanner: document.getElementById('quickScanBanner'),

    // Views
    viewHome: document.getElementById('view-home'),
    viewSubject: document.getElementById('view-subject'),
    viewScan: document.getElementById('view-scan'),
    viewChapter: document.getElementById('view-chapter'),

    // Home View
    subjectsGrid: document.getElementById('subjectsGrid'),
    chaptersListRecent: document.getElementById('chaptersListRecent'),
    btnAddSubjectModal: document.getElementById('btnAddSubjectModal'),

    // Subject Detail View
    subjectDetailName: document.getElementById('subjectDetailName'),
    chaptersListSubject: document.getElementById('chaptersListSubject'),

    // Scan View
    scanModeRadioGroup: document.getElementsByName('scanMode'),
    btnModeFullChapter: document.getElementById('btnModeFullChapter'),
    btnModeTempPage: document.getElementById('btnModeTempPage'),
    radioModeFull: document.getElementById('radioModeFull'),
    radioModeTemp: document.getElementById('radioModeTemp'),
    fullChapterFields: document.getElementById('fullChapterFields'),
    tempScanNotice: document.getElementById('tempScanNotice'),
    selectScanSubject: document.getElementById('selectScanSubject'),
    inputScanChapterTitle: document.getElementById('inputScanChapterTitle'),
    uploadDropzone: document.getElementById('uploadDropzone'),
    dropzoneTitleText: document.getElementById('dropzoneTitleText'),
    dropzoneSubText: document.getElementById('dropzoneSubText'),
    btnCameraSnap: document.getElementById('btnCameraSnap'),
    btnLiveScanner: document.getElementById('btnLiveScanner'),
    btnChoosePhotos: document.getElementById('btnChoosePhotos'),
    fileInputCamera: document.getElementById('fileInputCamera'),
    fileInputMulti: document.getElementById('fileInputMulti'),
    imagePreviewsGrid: document.getElementById('imagePreviewsGrid'),
    ocrProgressBox: document.getElementById('ocrProgressBox'),
    ocrProgressStatus: document.getElementById('ocrProgressStatus'),
    ocrProgressPercent: document.getElementById('ocrProgressPercent'),
    ocrProgressBarFill: document.getElementById('ocrProgressBarFill'),
    btnStartOcr: document.getElementById('btnStartOcr'),

    // Chapter Reader View
    readerChapterTitle: document.getElementById('readerChapterTitle'),
    readerSubjectBadge: document.getElementById('readerSubjectBadge'),
    readerPageIndicator: document.getElementById('readerPageIndicator'),
    textContentBox: document.getElementById('textContentBox'),
    btnLangEn: document.getElementById('btnLangEn'),
    btnLangHi: document.getElementById('btnLangHi'),
    btnEditTextContent: document.getElementById('btnEditTextContent'),
    btnViewOriginalImage: document.getElementById('btnViewOriginalImage'),
    tempScanHeaderBanner: document.getElementById('tempScanHeaderBanner'),
    btnSaveTempToChapter: document.getElementById('btnSaveTempToChapter'),

    // Audio Player Dock
    audioPlayerDock: document.getElementById('audioPlayerDock'),
    btnPlayMain: document.getElementById('btnPlayMain'),
    audioAccentLabel: document.getElementById('audioAccentLabel'),
    btnSpeedDec: document.getElementById('btnSpeedDec'),
    btnSpeedInc: document.getElementById('btnSpeedInc'),
    speedValueDisplay: document.getElementById('speedValueDisplay'),

    // Modals
    modalAddSubject: document.getElementById('modalAddSubject'),
    btnCloseSubjectModal: document.getElementById('btnCloseSubjectModal'),
    inputSubjectName: document.getElementById('inputSubjectName'),
    selectSubjectIcon: document.getElementById('selectSubjectIcon'),
    selectSubjectTheme: document.getElementById('selectSubjectTheme'),
    btnSaveSubject: document.getElementById('btnSaveSubject'),

    modalSaveTemp: document.getElementById('modalSaveTemp'),
    btnCloseSaveTempModal: document.getElementById('btnCloseSaveTempModal'),
    selectSaveTempSubject: document.getElementById('selectSaveTempSubject'),
    inputSaveTempTitle: document.getElementById('inputSaveTempTitle'),
    btnConfirmSaveTemp: document.getElementById('btnConfirmSaveTemp'),

    modalEditText: document.getElementById('modalEditText'),
    btnCloseEditTextModal: document.getElementById('btnCloseEditTextModal'),
    inputPageTextEdit: document.getElementById('inputPageTextEdit'),
    editTextLabel: document.getElementById('editTextLabel'),
    btnSavePageTextEdit: document.getElementById('btnSavePageTextEdit'),

    modalCameraStream: document.getElementById('modalCameraStream'),
    btnCloseCameraModal: document.getElementById('btnCloseCameraModal'),
    videoCameraFeed: document.getElementById('videoCameraFeed'),
    btnSnapCameraStream: document.getElementById('btnSnapCameraStream'),
    cameraStageTitle: document.getElementById('cameraStageTitle'),
    cameraLiveStage: document.getElementById('cameraLiveStage'),
    cameraCropStage: document.getElementById('cameraCropStage'),
    cropCanvasWrap: document.getElementById('cropCanvasWrap'),
    cropImage: document.getElementById('cropImage'),
    cropBox: document.getElementById('cropBox'),
    btnRetakePhoto: document.getElementById('btnRetakePhoto'),
    btnConfirmCrop: document.getElementById('btnConfirmCrop'),

    modalSettingsPanel: document.getElementById('modalSettingsPanel'),
    btnHeaderAiSettings: document.getElementById('btnHeaderAiSettings'),
    btnCloseAiSettings: document.getElementById('btnCloseAiSettings'),
    inputGeminiApiKey: document.getElementById('inputGeminiApiKey'),
    btnEnableAi: document.getElementById('btnEnableAi'),
    btnClearAiKey: document.getElementById('btnClearAiKey'),
    aiStatusDot: document.getElementById('aiStatusDot'),
    aiStatusText: document.getElementById('aiStatusText'),

    // Settings Panel - Menu & Stage Navigation
    settingsMenuStage: document.getElementById('settingsMenuStage'),
    stageAiVision: document.getElementById('stageAiVision'),
    stageLanguage: document.getElementById('stageLanguage'),
    stageVoice: document.getElementById('stageVoice'),
    stageOffline: document.getElementById('stageOffline'),
    menuSubtitleAiVision: document.getElementById('menuSubtitleAiVision'),
    menuSubtitleLanguage: document.getElementById('menuSubtitleLanguage'),
    menuSubtitleVoice: document.getElementById('menuSubtitleVoice'),
    menuSubtitleOffline: document.getElementById('menuSubtitleOffline'),

    // Settings Panel - Translation Language
    sourceLanguageOptionsList: document.getElementById('sourceLanguageOptionsList'),
    targetLanguageOptionsList: document.getElementById('targetLanguageOptionsList'),
    languageDirectionHint: document.getElementById('languageDirectionHint'),

    // Settings Panel - Voice Accent
    rangeSpeechRate: document.getElementById('rangeSpeechRate'),
    speechRateValue: document.getElementById('speechRateValue'),
    btnTestVoiceSample: document.getElementById('btnTestVoiceSample'),
    voiceOptionsList: document.getElementById('voiceOptionsList'),
    voiceAccentHint: document.getElementById('voiceAccentHint'),

    // Settings Panel - Offline Engine & Debug Logs
    checkPreferOffline: document.getElementById('checkPreferOffline'),
    languagePackList: document.getElementById('languagePackList'),
    btnOpenDebugLogs: document.getElementById('btnOpenDebugLogs'),

    toastMsg: document.getElementById('toastMsg')
  };
}
