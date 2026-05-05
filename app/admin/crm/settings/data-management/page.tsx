'use client';

import React, { useState, useRef } from 'react';
import { Download, Upload, Trash2, AlertTriangle, CheckCircle, Clock, Loader2, FileJson } from 'lucide-react';

interface DeleteConfirmation {
  active: boolean;
  token: string;
  countdown: number;
  isProcessing: boolean;
}

export default function DataManagementPage() {
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>({
    active: false,
    token: '',
    countdown: 10,
    isProcessing: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 1. DOWNLOAD DATA
  // ═══════════════════════════════════════════════════════════════════════════════
  const handleDownloadData = async () => {
    try {
      setDownloadLoading(true);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/crm/tenant/data-export', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Get filename from header
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'tenant_data.json';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch) filename = filenameMatch[1];
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      alert(`Download failed: ${error.message}`);
    } finally {
      setDownloadLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // 2. UPLOAD DATA
  // ═══════════════════════════════════════════════════════════════════════════════
  const handleUploadData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadLoading(true);
      setUploadStatus(null);

      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/crm/tenant/data-import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadStatus({
        type: 'success',
        message: `Data imported successfully! Imported: ${data.summary.leadsImported} leads, ${data.summary.messagesImported} messages`,
      });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      setUploadStatus({
        type: 'error',
        message: `Upload failed: ${error.message}`,
      });
    } finally {
      setUploadLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // 3. DELETE DATA (WITH CONFIRMATION & COUNTDOWN)
  // ═══════════════════════════════════════════════════════════════════════════════
  const handleInitiateDelete = async () => {
    try {
      setDeleteLoading(true);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/crm/tenant/data-delete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate deletion');
      }

      // Show confirmation dialog with countdown
      setDeleteConfirmation({
        active: true,
        token: data.confirmToken,
        countdown: 10,
        isProcessing: false,
      });

      // Start countdown
      let count = 10;
      countdownRef.current = setInterval(() => {
        count--;
        setDeleteConfirmation(prev => ({ ...prev, countdown: count }));

        if (count <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          setDeleteConfirmation(prev => ({ ...prev, active: false }));
        }
      }, 1000);
    } catch (error: any) {
      alert(`Failed to initiate deletion: ${error.message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCancelDelete = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setDeleteConfirmation({
      active: false,
      token: '',
      countdown: 10,
      isProcessing: false,
    });
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleteConfirmation(prev => ({ ...prev, isProcessing: true }));

      // First, auto-download backup
      const token = localStorage.getItem('token');
      const downloadResponse = await fetch('/api/admin/crm/tenant/data-export', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (downloadResponse.ok) {
        const blob = await downloadResponse.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_before_deletion_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      // Then execute deletion
      const deleteResponse = await fetch('/api/admin/crm/tenant/data-delete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          executeDelete: true,
          confirmToken: deleteConfirmation.token,
        }),
      });

      const deleteData = await deleteResponse.json();

      if (!deleteResponse.ok) {
        throw new Error(deleteData.error || 'Deletion failed');
      }

      handleCancelDelete();
      alert(
        `✅ All data deleted successfully!\n\n${deleteData.deletionSummary.totalDeleted} records removed\n\nYour account is now empty and ready for fresh data.`
      );

      // Optionally redirect to dashboard
      // window.location.href = '/admin/crm/dashboard';
    } catch (error: any) {
      alert(`Deletion failed: ${error.message}`);
      setDeleteConfirmation(prev => ({ ...prev, isProcessing: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Data Management</h1>
          <p className="text-lg text-gray-600">
            Download, upload, or delete all your data in one operation
          </p>
        </div>

        {/* CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* 1. DOWNLOAD CARD */}
          <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-blue-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Download className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Download All Data</h2>
            </div>

            <p className="text-gray-600 text-sm mb-6">
              Export all your leads, messages, broadcasts, and settings into a single JSON file.
              Perfect for backup or data transfer.
            </p>

            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <p className="text-xs text-blue-700">
                📦 <strong>Includes:</strong> Leads • Messages • Broadcasts • Templates • Settings
              </p>
            </div>

            <button
              onClick={handleDownloadData}
              disabled={downloadLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
            >
              {downloadLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Download Now
                </>
              )}
            </button>
          </div>

          {/* 2. UPLOAD CARD */}
          <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-green-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <Upload className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Upload Data</h2>
            </div>

            <p className="text-gray-600 text-sm mb-6">
              Import previously exported data to restore or migrate your information.
              Only JSON files from exports are supported.
            </p>

            <div className="bg-green-50 p-4 rounded-lg mb-6">
              <p className="text-xs text-green-700">
                ✅ <strong>Safe:</strong> Your tenant ID is verified before import
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleUploadData}
              disabled={uploadLoading}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadLoading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
            >
              {uploadLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload File
                </>
              )}
            </button>

            {uploadStatus && (
              <div
                className={`mt-4 p-3 rounded-lg text-sm ${
                  uploadStatus.type === 'success'
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-red-100 text-red-700 border border-red-300'
                }`}
              >
                {uploadStatus.message}
              </div>
            )}
          </div>

          {/* 3. DELETE CARD */}
          <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-red-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-3 rounded-lg">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Delete All Data</h2>
            </div>

            <p className="text-gray-600 text-sm mb-6">
              Permanently delete all your data from our systems. This action cannot be undone.
            </p>

            <div className="bg-red-50 p-4 rounded-lg mb-6">
              <p className="text-xs text-red-700">
                ⚠️ <strong>Warning:</strong> Automatic backup will be created before deletion
              </p>
            </div>

            <button
              onClick={handleInitiateDelete}
              disabled={deleteLoading || deleteConfirmation.active}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Preparing...
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5" />
                  Delete All Data
                </>
              )}
            </button>
          </div>
        </div>

        {/* INFO SECTION */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Data Management Information</h3>

          <div className="space-y-4 text-sm text-gray-700">
            <div className="flex gap-3">
              <FileJson className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>File Format:</strong> All exports are in JSON format. Files include your tenant ID,
                export date, and complete data snapshot.
              </div>
            </div>

            <div className="flex gap-3">
              <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Frequency:</strong> You can download data anytime. Regular backups are recommended for
                critical business data.
              </div>
            </div>

            <div className="flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Tenant Isolation:</strong> Your data is completely isolated. Imports are verified to
                ensure data belongs to your tenant.
              </div>
            </div>

            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Deletion is Permanent:</strong> Deleted data cannot be recovered. A backup is
                automatically created before deletion as a safety measure.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmation.active && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8">
            {/* HEADER */}
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Delete All Data?</h3>
            </div>

            {/* WARNING MESSAGE */}
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
              <p className="text-red-800 font-semibold text-center">⚠️ YOUR ALL DATA WILL BE DELETED PERMANENTLY</p>
              <p className="text-red-700 text-sm mt-2 text-center">
                This action cannot be undone. All leads, messages, broadcasts, templates, and settings will be
                permanently removed.
              </p>
            </div>

            {/* COUNTDOWN TIMER */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <span className="text-3xl font-bold text-red-600">{deleteConfirmation.countdown}</span>
              </div>

              <p className="text-gray-600 text-sm">
                Click <strong>"YES DELETE ALL"</strong> within <strong>{deleteConfirmation.countdown} seconds</strong> to
                confirm
              </p>
            </div>

            {/* AUTO-BACKUP INFO */}
            <div className="bg-green-50 border border-green-300 rounded-lg p-3 mb-6">
              <p className="text-green-800 text-sm">
                ✅ <strong>Automatic Backup:</strong> Your data will be downloaded to your PC before deletion.
              </p>
            </div>

            {/* BUTTONS */}
            <div className="flex gap-3">
              <button
                onClick={handleCancelDelete}
                disabled={deleteConfirmation.isProcessing}
                className="flex-1 bg-gray-300 hover:bg-gray-400 disabled:opacity-50 text-gray-900 font-semibold py-3 px-4 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteConfirmation.countdown > 0 || deleteConfirmation.isProcessing}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                {deleteConfirmation.isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    YES DELETE ALL
                  </>
                )}
              </button>
            </div>

            {/* HELP TEXT */}
            <p className="text-xs text-gray-500 text-center mt-4">
              Button will be enabled after countdown completes
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
