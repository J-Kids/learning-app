/**
 * IndexedDB Database Manager for Kids Learning App
 * Manages Subjects, Chapters, and Scanned Pages.
 */

class LearningDatabaseManager {
  constructor() {
    this.dbName = 'KidsLearningDB';
    this.dbVersion = 1;
    this.db = null;
  }

  async initDB() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('subjects')) {
          db.createObjectStore('subjects', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('chapters')) {
          const chapStore = db.createObjectStore('chapters', { keyPath: 'id' });
          chapStore.createIndex('subjectId', 'subjectId', { unique: false });
        }

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

      request.onerror = (event) => reject(event.target.error);
    });
  }

  async seedDefaultSubjects() {
    const subjects = await this.getAllSubjects();
    if (subjects.length === 0) {
      const defaults = [
        { id: 'sub_english', name: 'English Marigold', icon: '📖', theme: 'purple' },
        { id: 'sub_hindi', name: 'Hindi Rimjhim', icon: '🇮🇳', theme: 'pink' },
        { id: 'sub_math', name: 'Joyful Mathematics', icon: '🔢', theme: 'yellow' },
        { id: 'sub_evs', name: 'Our Environment', icon: '🌱', theme: 'green' }
      ];

      const tx = this.db.transaction('subjects', 'readwrite');
      const store = tx.objectStore('subjects');
      defaults.forEach(sub => store.put(sub));
    }
  }

  async getAllSubjects() {
    await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('subjects', 'readonly');
      const request = tx.objectStore('subjects').getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getSubject(id) {
    await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('subjects', 'readonly');
      const request = tx.objectStore('subjects').get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveSubject(subject) {
    await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('subjects', 'readwrite');
      const request = tx.objectStore('subjects').put(subject);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getChaptersBySubject(subjectId) {
    await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('chapters', 'readonly');
      const index = tx.objectStore('chapters').index('subjectId');
      const request = index.getAll(subjectId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllChapters() {
    await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('chapters', 'readonly');
      const request = tx.objectStore('chapters').getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveChapter(chapter) {
    await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('chapters', 'readwrite');
      const request = tx.objectStore('chapters').put(chapter);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getPagesByChapter(chapterId) {
    await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('pages', 'readonly');
      const index = tx.objectStore('pages').index('chapterId');
      const request = index.getAll(chapterId);
      request.onsuccess = () => {
        const pages = request.result || [];
        pages.sort((a, b) => a.pageIndex - b.pageIndex);
        resolve(pages);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async savePage(page) {
    await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('pages', 'readwrite');
      const request = tx.objectStore('pages').put(page);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const learningDB = new LearningDatabaseManager();
window.learningDB = learningDB;
