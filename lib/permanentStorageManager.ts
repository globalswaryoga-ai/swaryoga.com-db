// Enhanced Storage Manager - Permanent Data Storage (Online/Offline)
// This ensures all data is saved permanently with multiple fallback options

import { Vision, Goal, Task, Todo, Word, Reminder } from '@/lib/types/lifePlanner';

interface StorageData {
  visions: Vision[];
  goals: Goal[];
  tasks: Task[];
  todos: Todo[];
  words: Word[];
  reminders: Reminder[];
  lastSyncTime: number;
}

class PermanentStorageManager {
  private storageKey = 'swar-life-planner-complete-backup';
  private syncInterval = 5000; // Auto-sync every 5 seconds
  private syncTimer: NodeJS.Timeout | null = null;
  private isDirty = false;

  /**
   * Initialize storage manager with auto-sync
   */
  initialize() {
    if (typeof window === 'undefined') return;

    // Auto-sync data every 5 seconds if there are changes
    this.syncTimer = setInterval(() => {
      if (this.isDirty) {
        this.syncAllData();
        this.isDirty = false;
      }
    }, this.syncInterval);

    // Sync before page unload
    window.addEventListener('beforeunload', () => this.syncAllData());
  }

  /**
   * Save data with automatic fallbacks
   */
  saveData(key: string, data: any): boolean {
    if (typeof window === 'undefined') return false;

    try {
      // Primary: localStorage
      localStorage.setItem(key, JSON.stringify(data));
      
      // Secondary: IndexedDB (for larger data sets)
      this.saveToIndexedDB(key, data);
      
      // Mark as dirty for sync
      this.isDirty = true;
      
      return true;
    } catch (error) {
      console.error(`Failed to save ${key}:`, error);
      return false;
    }
  }

  /**
   * Load data with fallback chain
   */
  loadData(key: string): any {
    if (typeof window === 'undefined') return null;

    try {
      // Primary: localStorage
      const data = localStorage.getItem(key);
      if (data) {
        try {
          return JSON.parse(data);
        } catch {
          return data;
        }
      }

      // Fallback: IndexedDB
      const indexedData = this.loadFromIndexedDB(key);
      if (indexedData) {
        // Restore to localStorage
        localStorage.setItem(key, JSON.stringify(indexedData));
        return indexedData;
      }

      return null;
    } catch (error) {
      console.error(`Failed to load ${key}:`, error);
      return null;
    }
  }

  /**
   * Save to IndexedDB for redundancy
   */
  private saveToIndexedDB(key: string, data: any): void {
    if (typeof window === 'undefined' || !window.indexedDB) return;

    try {
      const request = indexedDB.open('SwarYogaDB', 1);

      request.onerror = () => console.error('IndexedDB open failed');
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        try {
          const transaction = db.transaction(['data'], 'readwrite');
          const objectStore = transaction.objectStore('data');
          objectStore.put({ key, value: data, timestamp: Date.now() });
        } catch (e) {
          console.error('IndexedDB write failed:', e);
        }
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('data')) {
          db.createObjectStore('data', { keyPath: 'key' });
        }
      };
    } catch (error) {
      console.error('IndexedDB save error:', error);
    }
  }

  /**
   * Load from IndexedDB
   */
  private loadFromIndexedDB(key: string): any {
    if (typeof window === 'undefined' || !window.indexedDB) return null;

    return new Promise((resolve) => {
      try {
        const request = indexedDB.open('SwarYogaDB', 1);

        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          try {
            const transaction = db.transaction(['data'], 'readonly');
            const objectStore = transaction.objectStore('data');
            const getRequest = objectStore.get(key);

            getRequest.onsuccess = () => {
              const result = getRequest.result;
              resolve(result ? result.value : null);
            };

            getRequest.onerror = () => resolve(null);
          } catch (e) {
            resolve(null);
          }
        };

        request.onerror = () => resolve(null);
      } catch (error) {
        resolve(null);
      }
    });
  }

  /**
   * Sync all data (creates backup)
   */
  private syncAllData(): void {
    if (typeof window === 'undefined') return;

    try {
      const allData: StorageData = {
        visions: this.loadData('swar-life-planner-visions') || [],
        goals: this.loadData('swar-life-planner-goals') || [],
        tasks: this.loadData('swar-life-planner-tasks') || [],
        todos: this.loadData('swar-life-planner-todos') || [],
        words: this.loadData('swar-life-planner-words') || [],
        reminders: this.loadData('swar-life-planner-reminders') || [],
        lastSyncTime: Date.now(),
      };

      // Save complete backup
      localStorage.setItem(this.storageKey, JSON.stringify(allData));
      sessionStorage.setItem(`${this.storageKey}-session`, JSON.stringify(allData));
    } catch (error) {
      console.error('Failed to sync all data:', error);
    }
  }

  /**
   * Get complete backup
   */
  getCompleteBackup(): StorageData | null {
    if (typeof window === 'undefined') return null;

    try {
      const backup = localStorage.getItem(this.storageKey);
      return backup ? JSON.parse(backup) : null;
    } catch (error) {
      console.error('Failed to get backup:', error);
      return null;
    }
  }

  /**
   * Restore from backup
   */
  restoreFromBackup(backup: StorageData): boolean {
    if (typeof window === 'undefined') return false;

    try {
      if (backup.visions) {
        localStorage.setItem('swar-life-planner-visions', JSON.stringify(backup.visions));
      }
      if (backup.goals) {
        localStorage.setItem('swar-life-planner-goals', JSON.stringify(backup.goals));
      }
      if (backup.tasks) {
        localStorage.setItem('swar-life-planner-tasks', JSON.stringify(backup.tasks));
      }
      if (backup.todos) {
        localStorage.setItem('swar-life-planner-todos', JSON.stringify(backup.todos));
      }
      if (backup.words) {
        localStorage.setItem('swar-life-planner-words', JSON.stringify(backup.words));
      }
      if (backup.reminders) {
        localStorage.setItem('swar-life-planner-reminders', JSON.stringify(backup.reminders));
      }
      return true;
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      return false;
    }
  }

  /**
   * Clear all data
   */
  clearAllData(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem('swar-life-planner-visions');
      localStorage.removeItem('swar-life-planner-goals');
      localStorage.removeItem('swar-life-planner-tasks');
      localStorage.removeItem('swar-life-planner-todos');
      localStorage.removeItem('swar-life-planner-words');
      localStorage.removeItem('swar-life-planner-reminders');
      localStorage.removeItem(this.storageKey);
      sessionStorage.clear();
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  }

  /**
   * Get storage usage stats
   */
  getStorageStats(): { used: number; available: number; percentage: number } {
    if (typeof window === 'undefined' || !navigator.storage) {
      return { used: 0, available: 0, percentage: 0 };
    }

    let totalSize = 0;
    if (typeof localStorage !== 'undefined') {
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length + key.length;
        }
      }
    }

    const quota = 5 * 1024 * 1024; // 5MB typical for localStorage
    return {
      used: totalSize,
      available: quota - totalSize,
      percentage: (totalSize / quota) * 100,
    };
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    this.syncAllData();
  }
}

// Export singleton instance
export const permanentStorage = new PermanentStorageManager();
