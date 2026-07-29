'use client';

import React, { useState, useEffect } from 'react';
import { CloudUpload, CheckCircle2, Clock, AlertTriangle, Loader2, RotateCcw } from 'lucide-react';
import GoogleOAuthSetupGuide from './GoogleOAuthSetupGuide';

interface BackupStatus {
  backupEnabled: boolean;
  googleDriveConnected: boolean;
  retentionDays: number;
  lastBackupAt: string | null;
  lastBackupStatus: string;
  backupHistory: any[];
  totalBackups: number;
}

interface BackupPanelProps {
  token: string | null;
}

export default function BackupPanel({ token }: BackupPanelProps) {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGoogleSetup, setShowGoogleSetup] = useState(false);

  // Fetch backup status on mount
  useEffect(() => {
    if (!token) return;
    fetchBackupStatus();
  }, [token]);

  const fetchBackupStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/crm/qr/backup/status', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch backup status');
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (e: any) {
      setError(e.message);
      console.error('[BackupPanel] Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleManualBackup = async () => {
    if (!token) {
      setError('Not authenticated');
      return;
    }

    try {
      setBackingUp(true);
      const response = await fetch('/api/admin/crm/qr/backup/trigger', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'backup' }),
      });

      if (!response.ok) throw new Error('Backup failed');
      const data = await response.json();

      setError(null);
      // Refresh status after backup
      setTimeout(fetchBackupStatus, 1000);

      alert(
        `✅ Backup complete!\n\nChats: ${data.itemsCount.chats}\nMessages: ${data.itemsCount.messages}\nContacts: ${data.itemsCount.contacts}`
      );
    } catch (e: any) {
      setError(e.message);
      alert('❌ Backup failed: ' + e.message);
    } finally {
      setBackingUp(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <p className="text-sm text-blue-700">Loading backup status...</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="p-6 bg-red-50 rounded-lg border border-red-200">
        <p className="text-sm text-red-700">Failed to load backup status</p>
      </div>
    );
  }

  const lastBackup = status.lastBackupAt ? new Date(status.lastBackupAt) : null;
  const daysSinceBackup = lastBackup
    ? Math.floor((Date.now() - lastBackup.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">WhatsApp Chat Backup</h3>
            <p className="text-xs text-gray-500 mt-1">
              Automatic backup of all chats, messages, and contacts
            </p>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            status.googleDriveConnected
              ? 'bg-green-100 text-green-700 ring-1 ring-green-300'
              : 'bg-gray-100 text-gray-700 ring-1 ring-gray-300'
          }`}>
            {status.googleDriveConnected ? '✓ Connected' : '○ Not Connected'}
          </div>
        </div>

        {/* Last Backup Info */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-2 bg-white rounded border border-gray-200">
            <p className="text-[10px] uppercase text-gray-500">Last Backup</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">
              {lastBackup
                ? lastBackup.toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Never'}
            </p>
          </div>
          <div className="p-2 bg-white rounded border border-gray-200">
            <p className="text-[10px] uppercase text-gray-500">Total Backups</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{status.totalBackups}</p>
          </div>
          <div className="p-2 bg-white rounded border border-gray-200">
            <p className="text-[10px] uppercase text-gray-500">Retention</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">
              {Math.floor(status.retentionDays / 365)}y
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleManualBackup}
          disabled={backingUp}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {backingUp ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Backing up...
            </>
          ) : (
            <>
              <RotateCcw className="w-4 h-4" />
              Backup Now
            </>
          )}
        </button>
      </div>

      {/* Status Messages */}
      {status.lastBackupStatus === 'completed' && lastBackup && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-green-700">
            <p className="font-semibold">Backup successful</p>
            <p className="text-xs mt-0.5">
              {daysSinceBackup === 0
                ? 'Backed up today'
                : daysSinceBackup === 1
                  ? 'Backed up yesterday'
                  : `Last backup ${daysSinceBackup} days ago`}
            </p>
          </div>
        </div>
      )}

      {!status.googleDriveConnected && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-700 flex-1">
            <p className="font-semibold">Connect Google Drive</p>
            <p className="text-xs mt-0.5">
              Enable Google Drive integration to auto-backup your data to your personal Google Drive
            </p>
            <button
              onClick={() => setShowGoogleSetup(true)}
              className="mt-2 text-xs font-semibold px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition"
            >
              Connect Google Drive
            </button>
          </div>
        </div>
      )}

      {/* Google OAuth Setup Modal */}
      <GoogleOAuthSetupGuide
        isOpen={showGoogleSetup}
        onClose={() => setShowGoogleSetup(false)}
        token={token}
        onSetupComplete={() => {
          setShowGoogleSetup(false);
          fetchBackupStatus();
        }}
      />

      {/* Backup History */}
      {status.backupHistory.length > 0 && (
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Backup History</h4>
          <div className="space-y-2">
            {status.backupHistory.slice(0, 5).map((backup, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  {backup.status === 'completed' && (
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                  )}
                  {backup.status === 'failed' && (
                    <AlertTriangle className="w-3 h-3 text-red-600" />
                  )}
                  {backup.status === 'pending' && (
                    <Clock className="w-3 h-3 text-gray-400" />
                  )}
                  <span className="text-gray-700">
                    {new Date(backup.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <span className="text-gray-500">
                  {backup.itemsCount.chats} chats
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
