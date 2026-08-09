/**
 * Kids Learning App - IndexedDB Database Storage Engine
 * Handles Subject -> Chapter -> Page data structure
 */

const DB_NAME = 'KidsLearningAppDB';
const DB_VERSION = 1;

class LearningDB {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Subjects store
        if (!db.objectStoreNames.contains('subjects')) {
          const subjectStore = db.createObjectStore('subjects', { keyPath: 'id' });
          subjectStore.createIndex('name', 'name', { unique: false });
        }

        // Chapters store
        if (!db.objectStoreNames.contains('chapters')) {
          const chapterStore = db.createObjectStore('chapters', { keyPath: 'id' });
          chapterStore.createIndex('subjectId', 'subjectId', { unique: false });
          chapterStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Pages store
        if (!db.objectStoreNames.contains('pages')) {
          const pageStore = db.createObjectStore('pages', { keyPath: 'id' });
          pageStore.createIndex('chapterId', 'chapterId', { unique: false });
        }
      };

      request.onsuccess = async (event) => {
        this.db = event.target.result;
        await this.seedDefaultSubjects();
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB Error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async seedDefaultSubjects() {
    const existing = await this.getAllSubjects();
    if (existing.length === 0) {
      const defaultSubjects = [
        { id: 'sub_english', name: 'English', icon: '📖', theme: 'purple', createdAt: Date.now() },
        { id: 'sub_evs', name: 'EVS / Science', icon: '🌱', theme: 'green', createdAt: Date.now() + 1 },
        { id: 'sub_hindi', name: 'Hindi', icon: '🎨', theme: 'pink', createdAt: Date.now() + 2 },
        { id: 'sub_math', name: 'Mathematics', icon: '🔢', theme: 'yellow', createdAt: Date.now() + 3 },
        { id: 'sub_social', name: 'Social Studies', icon: '🌍', theme: 'blue', createdAt: Date.now() + 4 }
      ];
      for (const sub of defaultSubjects) {
        await this.saveSubject(sub);
      }
    }
  }

  // --- SUBJECT OPERATIONS ---
  async getAllSubjects() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('subjects', 'readonly');
      const store = tx.objectStore('subjects');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getSubject(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('subjects', 'readonly');
      const store = tx.objectStore('subjects');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async saveSubject(subject) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('subjects', 'readwrite');
      const store = tx.objectStore('subjects');
      const req = store.put(subject);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // --- CHAPTER OPERATIONS ---
  async getChaptersBySubject(subjectId) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('chapters', 'readonly');
      const store = tx.objectStore('chapters');
      const index = store.index('subjectId');
      const req = index.getAll(subjectId);
      req.onsuccess = () => {
        const chapters = req.result || [];
        chapters.sort((a, b) => (a.chapterNo || 0) - (b.chapterNo || 0));
        resolve(chapters);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getChapter(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('chapters', 'readonly');
      const store = tx.objectStore('chapters');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async saveChapter(chapter) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('chapters', 'readwrite');
      const store = tx.objectStore('chapters');
      const req = store.put(chapter);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteChapter(chapterId) {
    return new Promise(async (resolve, reject) => {
      // Delete chapter pages first
      const pages = await this.getPagesByChapter(chapterId);
      const txPages = this.db.transaction('pages', 'readwrite');
      const pageStore = txPages.objectStore('pages');
      for (const page of pages) {
        pageStore.delete(page.id);
      }

      // Delete chapter record
      const txChapter = this.db.transaction('chapters', 'readwrite');
      const chapterStore = txChapter.objectStore('chapters');
      const req = chapterStore.delete(chapterId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  // --- PAGE OPERATIONS ---
  async getPagesByChapter(chapterId) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('pages', 'readonly');
      const store = tx.objectStore('pages');
      const index = store.index('chapterId');
      const req = index.getAll(chapterId);
      req.onsuccess = () => {
        const pages = req.result || [];
        pages.sort((a, b) => (a.pageIndex || 0) - (b.pageIndex || 0));
        resolve(pages);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async savePage(page) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('pages', 'readwrite');
      const store = tx.objectStore('pages');
      const req = store.put(page);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
}

// Global DB Singleton
window.learningDB = new LearningDB();
