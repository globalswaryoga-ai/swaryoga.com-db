// Hook for managing backups and sync
'use client';
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useCallback } from 'react';

export interface BackupInfo {
  id: string;
  type: 'auto' | 'manual';
  time: string;
  timestamp: string;
  dataCount?: {
    visions: number;
    goals: number;
    tasks: number;
    todos: number;
  };
}

export interface SyncStatus {
  synced: boolean;
  lastSyncTime: string | null;
  dataCount: {
    visions: number;
    goals: number;
    tasks: number;
    todos: number;
  };
  recentBackups: BackupInfo[];
}

export const useBackupSync = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  /**
   * Sync data to MongoDB
   */
  const syncToMongoDB = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      // Refresh status
      await getSyncStatus();
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create manual backup
   */
  const createManualBackup = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'backup' }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      // Refresh status
      await getSyncStatus();
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Backup failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get sync status
   */
  const getSyncStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/backup?action=status');
      const data = await response.json();

      if (data.success && data.data) {
        setSyncStatus(data.data);
      }

      return data;
    } catch (err) {
      console.error('Failed to get sync status:', err);
      return null;
    }
  }, []);

  /**
   * Get all backups
   */
  const getBackups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/backup?action=backups');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch backups';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Restore from backup
   */
  const restoreFromBackup = useCallback(async (backupId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', backupId }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      // Refresh status
      await getSyncStatus();
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Restore failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    syncStatus,
    syncToMongoDB,
    createManualBackup,
    getSyncStatus,
    getBackups,
    restoreFromBackup,
  };
};
