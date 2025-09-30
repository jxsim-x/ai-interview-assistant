// IndexedDB wrapper for resume file storage
const DB_NAME = 'InterviewAssistantDB';
const STORE_NAME = 'resumes';
const DB_VERSION = 1;

class ResumeStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return; // Already initialized

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('❌ [STORAGE] IndexedDB failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ [STORAGE] IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          console.log('📦 [STORAGE] Created resumes object store');
        }
      };
    });
  }

  async saveResume(id: string, file: File): Promise<string> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const resumeData = {
        id,
        file, // Store the actual File object
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        savedAt: new Date().toISOString()
      };

      const request = store.put(resumeData);

      request.onsuccess = () => {
        console.log('✅ [STORAGE] Resume saved to IndexedDB:', id, file.name);
        resolve(id);
      };

      request.onerror = () => {
        console.error('❌ [STORAGE] Failed to save resume:', request.error);
        reject(request.error);
      };
    });
  }

  async getResume(id: string): Promise<File | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const data = request.result;
        if (data && data.file) {
          console.log('✅ [STORAGE] Resume retrieved from IndexedDB:', id);
          resolve(data.file);
        } else {
          console.warn('⚠️ [STORAGE] Resume not found in IndexedDB:', id);
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('❌ [STORAGE] Failed to get resume:', request.error);
        reject(request.error);
      };
    });
  }

  async deleteResume(id: string): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('✅ [STORAGE] Resume deleted from IndexedDB:', id);
        resolve();
      };

      request.onerror = () => {
        console.error('❌ [STORAGE] Failed to delete resume:', request.error);
        reject(request.error);
      };
    });
  }

  async clearAll(): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('✅ [STORAGE] All resumes cleared from IndexedDB');
        resolve();
      };

      request.onerror = () => {
        console.error('❌ [STORAGE] Failed to clear resumes:', request.error);
        reject(request.error);
      };
    });
  }
}

export const resumeStorage = new ResumeStorage();
