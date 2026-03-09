'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Download, X, Shield, CheckCircle, Loader2, AlertTriangle, HardDrive } from 'lucide-react';

const BACKUP_INTERVAL_DAYS = 7;
const STORAGE_KEY = 'crm_last_backup_reminder';
const DISMISSED_KEY = 'crm_backup_dismissed_at';

export default function BackupReminder() {
  const [show, setShow] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const lastDismissed = localStorage.getItem(DISMISSED_KEY);
    const lastBackup = localStorage.getItem(STORAGE_KEY);

    const now = Date.now();
    const intervalMs = BACKUP_INTERVAL_DAYS * 24 * 60 * 60 * 1000;

    // Show if never backed up, or if 7 days have passed since last dismiss/backup
    const lastAction = Math.max(
      lastDismissed ? parseInt(lastDismissed, 10) : 0,
      lastBackup ? parseInt(lastBackup, 10) : 0
    );

    if (!lastAction || now - lastAction >= intervalMs) {
      // Small delay so it doesn't flash on load
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setShow(false);
  };

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    setError('');
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const res = await fetch('/api/admin/crm/export-data', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || 'Failed to export data');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `crm-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      localStorage.setItem(STORAGE_KEY, String(Date.now()));
      setDownloaded(true);

      // Auto-close after 3 seconds
      setTimeout(() => setShow(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white relative">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-xl">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold">Weekly Data Backup</h2>
          </div>
          <p className="text-blue-100 text-sm">
            It&apos;s been 7 days — time to download your CRM data and keep it safe!
          </p>
        </div>

        {/* Body */}
        <div className="p-6">
          {downloaded ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Backup Downloaded!</h3>
              <p className="text-sm text-gray-500 mt-1">
                Save this file in a safe folder on your computer.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                  <HardDrive className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">What&apos;s included</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Leads, messages, templates, broadcasts, sales, settings — all your CRM data in one file.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Why backup?</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Regular backups protect you from accidental data loss. Keep backups in a safe folder.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 transition"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Preparing backup...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Download My Data
                  </>
                )}
              </button>
            </>
          )}

          <button
            onClick={handleDismiss}
            className="w-full mt-3 text-center text-sm text-gray-400 hover:text-gray-600 transition"
          >
            {downloaded ? 'Close' : 'Remind me later'}
          </button>
        </div>
      </div>
    </div>
  );
}
