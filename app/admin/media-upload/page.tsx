'use client';

/**
 * /admin/media-upload
 * ─────────────────────────────────────────────────────────
 * Mobile-first photo/video uploader for 4 phones.
 * Opens on any browser (no app install needed).
 * Uploads directly to Bunny CDN at:
 *   /phone-media/{device}/{folder}/{YYYY-MM-DD}/{filename}
 * ─────────────────────────────────────────────────────────
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  Upload, Camera, FolderOpen, Plus, X, CheckCircle,
  AlertCircle, Loader2, Smartphone, ChevronDown, Trash2,
  ImageIcon, Film, RefreshCw,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type FileStatus = 'pending' | 'uploading' | 'done' | 'error';

interface FileItem {
  id:       string;
  file:     File;
  preview:  string | null;
  status:   FileStatus;
  progress: number;
  error?:   string;
  bunnyPath?: string;
}

// ─── Folder presets ───────────────────────────────────────────────────────────

const FOLDER_PRESETS = [
  { label: '📸 Marketing & Social Media', value: 'marketing'  },
  { label: '🎪 Events & Workshops',        value: 'events'     },
  { label: '🧘 Sadhana & Content',         value: 'sadhana'    },
  { label: '📋 Course Content',            value: 'courses'    },
  { label: '📁 General Backup',            value: 'general'    },
];

// ─── localStorage helpers ────────────────────────────────────────────────────

const LS_DEVICES = 'media_upload_devices';
const LS_DEVICE  = 'media_upload_current_device';

function loadDevices(): string[] {
  try {
    const raw = localStorage.getItem(LS_DEVICES);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveDevices(d: string[]) {
  localStorage.setItem(LS_DEVICES, JSON.stringify(d));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MediaUploadPage() {
  const token = useAuth();

  // device
  const [devices, setDevices]       = useState<string[]>([]);
  const [device, setDevice]         = useState('');
  const [newDevice, setNewDevice]   = useState('');
  const [showAddDevice, setShowAdd] = useState(false);

  // folder
  const [folder, setFolder]         = useState(FOLDER_PRESETS[0].value);
  const [customFolder, setCustom]   = useState('');
  const [useCustom, setUseCustom]   = useState(false);

  // files
  const [files, setFiles]           = useState<FileItem[]>([]);
  const [uploading, setUploading]   = useState(false);
  const [allDone, setAllDone]       = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved devices on mount
  useEffect(() => {
    const saved = loadDevices();
    setDevices(saved);
    const last = localStorage.getItem(LS_DEVICE) || '';
    setDevice(last && saved.includes(last) ? last : (saved[0] || ''));
  }, []);

  // ── Device management ────────────────────────────────────────────────────

  const addDevice = () => {
    const name = newDevice.trim();
    if (!name || devices.includes(name)) return;
    const updated = [...devices, name];
    setDevices(updated);
    saveDevices(updated);
    setDevice(name);
    localStorage.setItem(LS_DEVICE, name);
    setNewDevice('');
    setShowAdd(false);
  };

  const removeDevice = (d: string) => {
    const updated = devices.filter(x => x !== d);
    setDevices(updated);
    saveDevices(updated);
    if (device === d) {
      const next = updated[0] || '';
      setDevice(next);
      localStorage.setItem(LS_DEVICE, next);
    }
  };

  const selectDevice = (d: string) => {
    setDevice(d);
    localStorage.setItem(LS_DEVICE, d);
  };

  // ── File selection ────────────────────────────────────────────────────────

  const onFilesSelected = useCallback((selected: FileList | null) => {
    if (!selected) return;
    const items: FileItem[] = Array.from(selected).map(f => ({
      id:       Math.random().toString(36).slice(2),
      file:     f,
      preview:  f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
      status:   'pending',
      progress: 0,
    }));
    setFiles(prev => [...prev, ...items]);
    setAllDone(false);
  }, []);

  const removeFile = (id: string) => {
    setFiles(prev => {
      const item = prev.find(f => f.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter(f => f.id !== id);
    });
  };

  const clearAll = () => {
    files.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
    setFiles([]);
    setAllDone(false);
  };

  // ── Upload ────────────────────────────────────────────────────────────────

  const effectiveFolder = useCustom ? (customFolder.trim() || 'general') : folder;
  const effectiveDevice = device.trim() || 'unknown-device';

  const uploadAll = async () => {
    if (!token || uploading) return;
    const pending = files.filter(f => f.status === 'pending' || f.status === 'error');
    if (pending.length === 0) return;

    setUploading(true);

    for (const item of pending) {
      // Mark as uploading
      setFiles(prev => prev.map(f =>
        f.id === item.id ? { ...f, status: 'uploading', progress: 10 } : f
      ));

      try {
        const fd = new FormData();
        fd.append('file',     item.file);
        fd.append('device',   effectiveDevice);
        fd.append('folder',   effectiveFolder);
        fd.append('filename', item.file.name);

        // Use XHR for real upload progress
        const path = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener('progress', e => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 90) + 5;
              setFiles(prev => prev.map(f =>
                f.id === item.id ? { ...f, progress: pct } : f
              ));
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
              try {
                const res = JSON.parse(xhr.responseText);
                resolve(res.path || '');
              } catch { resolve(''); }
            } else {
              try {
                const res = JSON.parse(xhr.responseText);
                reject(new Error(res.error || `HTTP ${xhr.status}`));
              } catch { reject(new Error(`HTTP ${xhr.status}`)); }
            }
          });

          xhr.addEventListener('error', () => reject(new Error('Network error')));

          xhr.open('POST', '/api/admin/media-upload');
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          xhr.send(fd);
        });

        setFiles(prev => prev.map(f =>
          f.id === item.id ? { ...f, status: 'done', progress: 100, bunnyPath: path } : f
        ));
      } catch (err) {
        setFiles(prev => prev.map(f =>
          f.id === item.id
            ? { ...f, status: 'error', progress: 0, error: (err as Error).message }
            : f
        ));
      }
    }

    setUploading(false);
    setAllDone(true);
  };

  // ── Derived stats ─────────────────────────────────────────────────────────

  const pendingCount   = files.filter(f => f.status === 'pending').length;
  const doneCount      = files.filter(f => f.status === 'done').length;
  const errorCount     = files.filter(f => f.status === 'error').length;
  const uploadingCount = files.filter(f => f.status === 'uploading').length;
  const totalSize      = files.reduce((s, f) => s + f.file.size, 0);
  const overallPct     = files.length === 0 ? 0
    : Math.round((doneCount / files.length) * 100);

  // ── Render ────────────────────────────────────────────────────────────────

  if (!token) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0">
          <Upload className="w-4 h-4 text-black" />
        </div>
        <div>
          <h1 className="font-bold text-base leading-tight">Phone Media Upload</h1>
          <p className="text-xs text-gray-400">Bunny CDN · backupmobgo</p>
        </div>
        {doneCount > 0 && (
          <div className="ml-auto text-xs text-green-400 font-medium">
            {doneCount} uploaded
          </div>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* ── Device selector ───────────────────────────────────────────── */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            <Smartphone className="inline w-3.5 h-3.5 mr-1" />
            Your Device
          </label>

          {devices.length === 0 && !showAddDevice ? (
            <button
              onClick={() => setShowAdd(true)}
              className="w-full border-2 border-dashed border-yellow-400/40 rounded-xl py-4 text-yellow-400 text-sm font-medium hover:border-yellow-400 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Your First Device
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {devices.map(d => (
                <button
                  key={d}
                  onClick={() => selectDevice(d)}
                  className={`relative rounded-xl px-3 py-2.5 text-sm font-medium text-left transition-all ${
                    device === d
                      ? 'bg-yellow-400 text-black'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <span className="truncate block">{d}</span>
                  {device !== d && (
                    <button
                      onClick={e => { e.stopPropagation(); removeDevice(d); }}
                      className="absolute top-1 right-1 p-0.5 text-gray-500 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </button>
              ))}
              <button
                onClick={() => setShowAdd(true)}
                className="rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-800 text-gray-400 hover:bg-gray-700 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Device
              </button>
            </div>
          )}

          {/* Add device input */}
          {showAddDevice && (
            <div className="mt-3 flex gap-2">
              <input
                autoFocus
                value={newDevice}
                onChange={e => setNewDevice(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addDevice()}
                placeholder="e.g. OnePlus, iPhone, iPad..."
                className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
              />
              <button
                onClick={addDevice}
                className="bg-yellow-400 text-black px-4 py-2.5 rounded-xl text-sm font-semibold"
              >
                Add
              </button>
              <button
                onClick={() => { setShowAdd(false); setNewDevice(''); }}
                className="bg-gray-700 text-gray-300 px-3 py-2.5 rounded-xl text-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* ── Folder selector ───────────────────────────────────────────── */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            <FolderOpen className="inline w-3.5 h-3.5 mr-1" />
            Save To Folder
          </label>

          <div className="grid grid-cols-1 gap-2">
            {FOLDER_PRESETS.map(p => (
              <button
                key={p.value}
                onClick={() => { setFolder(p.value); setUseCustom(false); }}
                className={`rounded-xl px-4 py-2.5 text-sm text-left font-medium transition-all ${
                  !useCustom && folder === p.value
                    ? 'bg-yellow-400 text-black'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {p.label}
              </button>
            ))}

            {/* Custom folder */}
            <button
              onClick={() => setUseCustom(true)}
              className={`rounded-xl px-4 py-2.5 text-sm text-left font-medium transition-all ${
                useCustom
                  ? 'bg-yellow-400 text-black'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              ✏️ Custom folder name
            </button>
            {useCustom && (
              <input
                autoFocus
                value={customFolder}
                onChange={e => setCustom(e.target.value)}
                placeholder="Type folder name..."
                className="bg-gray-800 border border-yellow-400/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
              />
            )}
          </div>

          {/* Preview path */}
          <p className="mt-2 text-xs text-gray-500 font-mono truncate">
            📂 /phone-media/<span className="text-yellow-400">{effectiveDevice || '…'}</span>/{effectiveFolder}/{new Date().toISOString().split('T')[0]}/
          </p>
        </div>

        {/* ── File picker ───────────────────────────────────────────────── */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={e => onFilesSelected(e.target.files)}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!device}
            className={`w-full rounded-2xl py-8 border-2 border-dashed flex flex-col items-center gap-3 transition-all ${
              device
                ? 'border-yellow-400/40 hover:border-yellow-400 hover:bg-yellow-400/5 active:scale-98'
                : 'border-gray-700 opacity-50 cursor-not-allowed'
            }`}
          >
            <div className="flex gap-3">
              <div className="w-12 h-12 bg-yellow-400/10 rounded-xl flex items-center justify-center">
                <Camera className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="w-12 h-12 bg-blue-400/10 rounded-xl flex items-center justify-center">
                <Film className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <div className="text-center">
              <p className="font-semibold text-white">
                {device ? 'Tap to select Photos & Videos' : 'Select a device first'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Camera roll · Gallery · Files · Max 50 MB per file
              </p>
            </div>
          </button>
        </div>

        {/* ── File list ─────────────────────────────────────────────────── */}
        {files.length > 0 && (
          <div>
            {/* Stats bar */}
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-400">
                <span className="text-white font-semibold">{files.length}</span> file{files.length !== 1 ? 's' : ''}
                {' '}· {(totalSize / 1024 / 1024).toFixed(1)} MB
                {doneCount > 0 && (
                  <span className="text-green-400 ml-2">· {doneCount} done</span>
                )}
                {errorCount > 0 && (
                  <span className="text-red-400 ml-2">· {errorCount} failed</span>
                )}
              </div>
              <button
                onClick={clearAll}
                disabled={uploading}
                className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Clear all
              </button>
            </div>

            {/* Overall progress bar */}
            {(uploading || allDone) && files.length > 0 && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{uploading ? `Uploading ${uploadingCount > 0 ? `file ${doneCount + 1}` : '...'}` : (allDone ? '✅ All done!' : '')}</span>
                  <span>{overallPct}%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                    style={{ width: `${overallPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* File grid */}
            <div className="grid grid-cols-3 gap-2">
              {files.map(item => (
                <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-800 group">
                  {/* Preview */}
                  {item.preview ? (
                    <img
                      src={item.preview}
                      alt={item.file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
                      <Film className="w-6 h-6 text-blue-400" />
                      <span className="text-[10px] text-gray-400 text-center truncate w-full">{item.file.name}</span>
                    </div>
                  )}

                  {/* Overlay status */}
                  <div className={`absolute inset-0 flex flex-col items-center justify-end pb-1 ${
                    item.status !== 'pending' ? 'bg-black/40' : ''
                  }`}>
                    {item.status === 'uploading' && (
                      <div className="w-full px-1.5 mb-1">
                        <div className="h-1 bg-gray-700 rounded-full">
                          <div
                            className="h-full bg-yellow-400 rounded-full transition-all"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {item.status === 'done' && (
                      <CheckCircle className="w-6 h-6 text-green-400 drop-shadow mb-1" />
                    )}
                    {item.status === 'error' && (
                      <div className="text-center px-1">
                        <AlertCircle className="w-5 h-5 text-red-400 mx-auto" />
                        <p className="text-[9px] text-red-300 mt-0.5 truncate">{item.error}</p>
                      </div>
                    )}
                    {item.status === 'uploading' && (
                      <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
                    )}
                  </div>

                  {/* Size label */}
                  <div className="absolute top-1 left-1 bg-black/60 rounded px-1 py-0.5 text-[9px] text-gray-300">
                    {item.file.size > 1024 * 1024
                      ? `${(item.file.size / 1024 / 1024).toFixed(1)}MB`
                      : `${(item.file.size / 1024).toFixed(0)}KB`}
                  </div>

                  {/* Remove button */}
                  {item.status !== 'uploading' && (
                    <button
                      onClick={() => removeFile(item.id)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  )}
                </div>
              ))}

              {/* Add more button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center gap-1 text-gray-600 hover:border-gray-500 hover:text-gray-400 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="text-[10px]">More</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Upload button ─────────────────────────────────────────────── */}
        {files.length > 0 && (
          <div className="space-y-2 pb-8">
            <button
              onClick={uploadAll}
              disabled={uploading || !device || (pendingCount === 0 && errorCount === 0)}
              className={`w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 ${
                uploading || !device || (pendingCount === 0 && errorCount === 0)
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-yellow-400 text-black active:scale-95'
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading… ({doneCount}/{files.length})
                </>
              ) : allDone && errorCount === 0 ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  All {doneCount} files uploaded!
                </>
              ) : errorCount > 0 ? (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Retry {errorCount} failed file{errorCount > 1 ? 's' : ''}
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload {pendingCount} file{pendingCount !== 1 ? 's' : ''} to Bunny
                </>
              )}
            </button>

            {allDone && doneCount > 0 && (
              <p className="text-center text-xs text-gray-500">
                Saved to{' '}
                <span className="font-mono text-yellow-400 text-[11px]">
                  /phone-media/{effectiveDevice}/{effectiveFolder}/
                </span>
              </p>
            )}
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {files.length === 0 && devices.length > 0 && (
          <div className="text-center py-8 text-gray-600 text-sm">
            <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Select photos or videos to upload</p>
          </div>
        )}
      </div>
    </div>
  );
}
