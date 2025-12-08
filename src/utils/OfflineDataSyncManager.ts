/**
 * Offline-First Data Sync Manager
 * Handles local storage when network is down
 * Auto-syncs to MongoDB when connection restored
 * Implements retry logic and offline queue
 */

export interface OfflineQueueItem {
  id: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE' | 'GET';
  data: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSync: number;
  pendingItems: number;
  failedItems: number;
}

class OfflineDataSyncManager {
  private offlineQueue: OfflineQueueItem[] = [];
  private syncStatus: SyncStatus = {
    isOnline: navigator.onLine,
    lastSync: Date.now(),
    pendingItems: 0,
    failedItems: 0,
  };
  private maxRetries: number = 5;
  private retryInterval: number = 5000; // 5 seconds between retries
  private maxQueueSize: number = 100;
  private syncAttemptTimer: ReturnType<typeof setInterval> | null = null;
  private statusChangeCallbacks: ((status: SyncStatus) => void)[] = [];

  constructor() {
    this.initializeFromLocalStorage();
    this.setupNetworkListeners();
    this.startPeriodicSync();
  }

  /**
   * Initialize offline queue from localStorage
   */
  private initializeFromLocalStorage(): void {
    try {
      const storedQueue = localStorage.getItem('offline_queue');
      if (storedQueue) {
        this.offlineQueue = JSON.parse(storedQueue);
        this.updateSyncStatus();
        console.log(`[OfflineSync] Loaded ${this.offlineQueue.length} items from localStorage`);
      }
    } catch (error) {
      console.error('[OfflineSync] Error loading queue from localStorage:', error);
      this.offlineQueue = [];
    }
  }

  /**
   * Setup network change listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('[OfflineSync] Network restored!');
      this.syncStatus.isOnline = true;
      this.notifyStatusChange();
      this.syncQueueToServer();
    });

    window.addEventListener('offline', () => {
      console.log('[OfflineSync] Network lost!');
      this.syncStatus.isOnline = false;
      this.notifyStatusChange();
    });
  }

  /**
   * Start periodic sync attempts every 10 seconds
   */
  private startPeriodicSync(): void {
    this.syncAttemptTimer = setInterval(() => {
      if (this.syncStatus.isOnline && this.offlineQueue.length > 0) {
        console.log(`[OfflineSync] Attempting sync of ${this.offlineQueue.length} items...`);
        this.syncQueueToServer();
      }
    }, 10000); // 10 seconds
  }

  /**
   * Add request to offline queue
   */
  public queueRequest(
    endpoint: string,
    method: 'POST' | 'PUT' | 'DELETE' | 'GET',
    data?: any
  ): OfflineQueueItem {
    // Check queue size
    if (this.offlineQueue.length >= this.maxQueueSize) {
      console.warn('[OfflineSync] Queue is full, removing oldest item');
      this.offlineQueue.shift();
    }

    const queueItem: OfflineQueueItem = {
      id: `${Date.now()}-${Math.random()}`,
      endpoint,
      method,
      data: data || {},
      timestamp: Date.now(),
      retries: 0,
      maxRetries: this.maxRetries,
    };

    this.offlineQueue.push(queueItem);
    this.saveQueueToLocalStorage();
    this.updateSyncStatus();

    console.log(
      `[OfflineSync] Queued ${method} ${endpoint} (Queue size: ${this.offlineQueue.length})`
    );

    // If online, try to sync immediately
    if (this.syncStatus.isOnline) {
      this.syncQueueToServer();
    }

    return queueItem;
  }

  /**
   * Sync queue to server
   */
  private async syncQueueToServer(): Promise<void> {
    if (this.offlineQueue.length === 0) return;

    const itemsToSync = [...this.offlineQueue];
    const successfulItems: string[] = [];
    const failedItems: string[] = [];

    for (const item of itemsToSync) {
      try {
        // Determine full URL
        const apiBase = 'http://localhost:4000/api';
        const url = `${apiBase}${item.endpoint}`;

        // Get user ID from localStorage
        const userStr = localStorage.getItem('user');
        const userId = userStr ? JSON.parse(userStr).id || JSON.parse(userStr)._id : 'unknown';

        // Make request
        const response = await fetch(url, {
          method: item.method,
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': userId,
          },
          body: item.method !== 'GET' ? JSON.stringify(item.data) : undefined,
        });

        if (response.ok) {
          successfulItems.push(item.id);
          console.log(`[OfflineSync] ✅ Synced ${item.method} ${item.endpoint}`);
        } else {
          item.retries++;
          if (item.retries >= item.maxRetries) {
            failedItems.push(item.id);
            console.error(
              `[OfflineSync] ❌ Failed after ${item.retries} retries: ${item.method} ${item.endpoint}`
            );
          } else {
            console.warn(
              `[OfflineSync] ⚠️ Retry ${item.retries}/${item.maxRetries}: ${item.method} ${item.endpoint}`
            );
          }
        }
      } catch (error) {
        item.retries++;
        if (item.retries >= item.maxRetries) {
          failedItems.push(item.id);
          console.error(`[OfflineSync] ❌ Error (max retries): ${item.endpoint}`, error);
        } else {
          console.warn(
            `[OfflineSync] ⚠️ Error (retry ${item.retries}/${item.maxRetries}): ${item.endpoint}`
          );
        }
      }
    }

    // Remove successful items
    this.offlineQueue = this.offlineQueue.filter((item) => !successfulItems.includes(item.id));

    this.saveQueueToLocalStorage();
    this.updateSyncStatus();
    this.notifyStatusChange();

    if (successfulItems.length > 0) {
      console.log(`[OfflineSync] Successfully synced ${successfulItems.length} items`);
    }
    if (failedItems.length > 0) {
      console.log(`[OfflineSync] ${failedItems.length} items failed and removed`);
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueueToLocalStorage(): void {
    try {
      localStorage.setItem('offline_queue', JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.error('[OfflineSync] Error saving queue to localStorage:', error);
    }
  }

  /**
   * Update sync status
   */
  private updateSyncStatus(): void {
    this.syncStatus = {
      isOnline: navigator.onLine,
      lastSync: Date.now(),
      pendingItems: this.offlineQueue.filter((item) => item.retries < item.maxRetries).length,
      failedItems: this.offlineQueue.filter((item) => item.retries >= item.maxRetries).length,
    };
  }

  /**
   * Notify status change listeners
   */
  private notifyStatusChange(): void {
    this.statusChangeCallbacks.forEach((callback) => callback(this.syncStatus));
  }

  /**
   * Subscribe to sync status changes
   */
  public onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.statusChangeCallbacks.push(callback);
    // Return unsubscribe function
    return () => {
      this.statusChangeCallbacks = this.statusChangeCallbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * Get current sync status
   */
  public getStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Get queue items
   */
  public getQueueItems(): OfflineQueueItem[] {
    return [...this.offlineQueue];
  }

  /**
   * Clear offline queue
   */
  public clearQueue(): void {
    this.offlineQueue = [];
    this.saveQueueToLocalStorage();
    this.updateSyncStatus();
    this.notifyStatusChange();
    console.log('[OfflineSync] Queue cleared');
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    if (this.syncAttemptTimer) {
      clearInterval(this.syncAttemptTimer);
    }
  }
}

// Export singleton instance
export const offlineSync = new OfflineDataSyncManager();

export default OfflineDataSyncManager;
