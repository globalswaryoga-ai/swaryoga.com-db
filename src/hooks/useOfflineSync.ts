/**
 * React Hook for Offline Data Sync Integration
 * Provides easy access to offline sync manager and status throughout the app
 */

import { useEffect, useState } from 'react';
import { offlineSync } from '../utils/OfflineDataSyncManager';

export interface SyncStatus {
  isOnline: boolean;
  lastSync: number;
  pendingItems: number;
  failedItems: number;
}

export const useOfflineSync = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(offlineSync.getStatus());
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Subscribe to status changes
    const unsubscribe = offlineSync.onStatusChange((newStatus: SyncStatus) => {
      setSyncStatus(newStatus);
    });

    setIsInitialized(true);

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  return {
    syncStatus,
    isOnline: syncStatus.isOnline,
    pendingItems: syncStatus.pendingItems,
    failedItems: syncStatus.failedItems,
    lastSync: syncStatus.lastSync,
    offlineSync,
    isInitialized,
    
    // Utility methods
    clearQueue: () => offlineSync.clearQueue(),
    getQueueItems: () => offlineSync.getQueueItems(),
  };
};

export default offlineSync;
