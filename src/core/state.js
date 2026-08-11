/**
 * Application State Manager
 * Holds transient app state including selected subjects, chapters, pages, and history.
 */

export class AppState {
  constructor() {
    this.currentView = 'view-home';
    this.viewHistory = [];
    this.selectedSubjectId = null;
    this.selectedChapterId = null;
    this.currentChapterPages = [];
    this.currentPageIndex = 0;
    this.currentLanguage = 'en'; // 'en' or 'hi'
    
    // Scan mode: 'full' (Full Chapter) or 'temp' (1 Page Temporary Scan)
    this.scanMode = 'full';
    this.uploadedImages = [];
    this.temporaryPagesData = null;
    
    // Camera stream reference
    this.cameraStream = null;
  }
}
