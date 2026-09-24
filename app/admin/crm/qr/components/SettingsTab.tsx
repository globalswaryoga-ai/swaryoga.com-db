'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Wifi, Loader2, Save, Funnel, Plus, Pencil, Tag, Settings, RefreshCw, Unplug, LogOut, Shield, Users, Check, X, Lock, Eye, EyeOff, Copy, ClipboardCheck, Key, HardDrive, Download, CloudUpload, AlertTriangle } from 'lucide-react';
import type { FunnelStage, LabelPreset } from '../types';
import BackupPanel from './BackupPanel';
import QuickLinksPanel from './QuickLinksPanel';

type QRAccessUser = {
  userId: string;
  name: string;
  email: string;
  role: string;
  qrWhatsappEnabled: boolean;
  hasOwnBridge: boolean;
  bridgeUrl: string;
  bridgeSecret: string;
  extensionEnabled: boolean;
};

export interface SettingsTabProps {
  bridgeUrlInput: string;
  setBridgeUrlInput: (v: string) => void;
  bridgeSecretInput: string;
  setBridgeSecretInput: (v: string) => void;
  token: string | null;
  savingBridge: boolean;
  saveBridgeConfig: () => void;
  funnelStages: FunnelStage[];
  labelPresets: LabelPreset[];
  openEditModal: (type: 'funnel' | 'label', mode: 'add' | 'edit', item?: FunnelStage | LabelPreset) => void;
  handleReconnect: () => void;
  handleDisconnect: () => void;
  handleLogout: () => void;
  setShowExtensionModal: (v: boolean) => void;
  setShowInstallGuide: (v: boolean) => void;
  // Multi-tenant / compartment props
  isSuperAdmin?: boolean;
  currentUserId?: string;
  crmFetch?: (url: string, opts?: any) => Promise<any>;
  // Sender display name
  senderDisplayName?: string;
  setSenderDisplayName?: (v: string) => void;
}

export function SettingsTab({
  bridgeUrlInput, setBridgeUrlInput,
  bridgeSecretInput, setBridgeSecretInput,
  token,
  savingBridge, saveBridgeConfig,
  funnelStages, labelPresets, openEditModal,
  handleReconnect, handleDisconnect, handleLogout,
  setShowExtensionModal, setShowInstallGuide,
  isSuperAdmin, currentUserId, crmFetch,
  senderDisplayName, setSenderDisplayName,
}: SettingsTabProps) {
  // ── QR Access Management State (super admin only) ──
  const [qrAccessUsers, setQrAccessUsers] = useState<QRAccessUser[]>([]);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [togglingUser, setTogglingUser] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null);
  const [showBridgeSecret, setShowBridgeSecret] = useState(false);

  // ── Chat Storage Usage (informational only, no quota/enforcement) ──
  const [storageUsage, setStorageUsage] = useState<{
    bunnyBytes: number; bunnyMessageCount: number; lastArchivedAt: string | null; retentionDays: number;
  } | null>(null);

  // ── Google Drive Backup ──
  const searchParams = useSearchParams();
  const [driveStatus, setDriveStatus] = useState<{
    connected: boolean; googleEmail?: string; needsReconnect?: boolean; lastSyncedAt?: string | null; lastError?: string;
  } | null>(null);
  const [driveConnecting, setDriveConnecting] = useState(false);
  const [driveBackingUp, setDriveBackingUp] = useState(false);
  const [driveDisconnecting, setDriveDisconnecting] = useState(false);
  const [driveBanner, setDriveBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const refreshDriveStatus = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/crm/whatsapp/qr-drive-status', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) setDriveStatus(await res.json());
    } catch {
      // non-fatal
    }
  }, [token]);

  useEffect(() => {
    refreshDriveStatus();
  }, [refreshDriveStatus]);

  // Show a banner after returning from the Google Drive OAuth redirect
  useEffect(() => {
    const driveConnect = searchParams?.get('driveConnect');
    if (driveConnect) {
      if (driveConnect === 'success') {
        const email = searchParams.get('email');
        setDriveBanner({ type: 'success', message: email ? `Connected to Google Drive as ${email}.` : 'Connected to Google Drive.' });
        refreshDriveStatus();
      } else if (driveConnect === 'error') {
        const reason = searchParams.get('reason') || 'unknown_error';
        setDriveBanner({ type: 'error', message: `Couldn't connect Google Drive: ${reason.replace(/_/g, ' ')}` });
      }
    }
  }, [searchParams, refreshDriveStatus]);

  const connectDrive = useCallback(async () => {
    if (!token) return;
    setDriveConnecting(true);
    try {
      const res = await fetch('/api/admin/crm/whatsapp/qr-drive-connect', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data?.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setDriveBanner({ type: 'error', message: data?.error || 'Failed to start Google Drive connection' });
      }
    } catch (e: any) {
      setDriveBanner({ type: 'error', message: e?.message || 'Failed to start Google Drive connection' });
    } finally {
      setDriveConnecting(false);
    }
  }, [token]);

  const disconnectDrive = useCallback(async () => {
    if (!token) return;
    setDriveDisconnecting(true);
    try {
      await fetch('/api/admin/crm/whatsapp/qr-drive-connect/disconnect', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setDriveStatus({ connected: false });
      setDriveBanner(null);
    } finally {
      setDriveDisconnecting(false);
    }
  }, [token]);

  const backupNowToDrive = useCallback(async () => {
    if (!token) return;
    setDriveBackingUp(true);
    setDriveBanner(null);
    try {
      const res = await fetch('/api/admin/crm/whatsapp/qr-drive-backup', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setDriveBanner({ type: 'success', message: `Backed up ${data.totalMessages?.toLocaleString() || 0} messages across ${data.chatsCount || 0} chats to Drive.` });
        refreshDriveStatus();
      } else {
        setDriveBanner({ type: 'error', message: data?.error || 'Backup failed' });
        if (res.status === 409) refreshDriveStatus();
      }
    } catch (e: any) {
      setDriveBanner({ type: 'error', message: e?.message || 'Backup failed' });
    } finally {
      setDriveBackingUp(false);
    }
  }, [token, refreshDriveStatus]);

  // Toggle bridge secret visibility for a user
  const toggleSecretVisibility = (userId: string) => {
    setVisibleSecrets(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  // Copy bridge secret to clipboard
  const copySecret = async (userId: string, secret: string) => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopiedSecret(userId);
      setTimeout(() => setCopiedSecret(null), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = secret;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedSecret(userId);
      setTimeout(() => setCopiedSecret(null), 2000);
    }
  };

  // Load QR access users when super admin opens settings
  useEffect(() => {
    if (!isSuperAdmin) return;
    let cancelled = false;
    const loadAccessList = async () => {
      setLoadingAccess(true);
      try {
        // Use direct fetch instead of crmFetch to avoid auto-logout on errors
        const res = await fetch('/api/admin/crm/whatsapp/qr-access', {
          headers: { 'Authorization': `Bearer ${token}` },
        }).then(r => {
          if (!r.ok) {
            return r.json().catch(() => ({})).then(errData => {
              const serverMessage = errData?.error || errData?.message || '';
              if (r.status === 401) throw new Error(serverMessage || 'Unauthorized — please log in again.');
              if (r.status === 403) throw new Error(serverMessage || 'Forbidden — Super Admin access required.');
              if (r.status === 404) throw new Error(serverMessage || 'QR access endpoint not found.');
              throw new Error(serverMessage || `Request failed: ${r.status}`);
            });
          }
          return r.json().catch(() => null);
        }).catch(e => {
          console.warn('[QR Access] Fetch error:', e);
          return null;
        });
        if (!cancelled && res?.users) {
          setQrAccessUsers(res.users);
        }
      } catch (e: any) {
        console.warn('[QR Access] Failed to load:', e);
        if (!cancelled) setAccessError(e?.message || 'Failed to load user access list');
      } finally {
        if (!cancelled) setLoadingAccess(false);
      }
    };
    loadAccessList();
    return () => { cancelled = true; };
  }, [isSuperAdmin, token]);

  // Load chat storage usage (informational display, no enforcement)
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch('/api/admin/crm/whatsapp/qr-storage-usage', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (!cancelled && data) setStorageUsage(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token]);

  // Toggle QR access for a user
  const toggleUserAccess = useCallback(async (
    targetUserId: string,
    enabled: boolean,
    field: 'qrWhatsappEnabled' | 'extensionEnabled' = 'qrWhatsappEnabled'
  ) => {
    if (togglingUser || !token) return;
    setTogglingUser(targetUserId);
    setAccessError(null);
    try {
      // Use direct fetch instead of crmFetch to avoid auto-logout on errors
      const response = await fetch('/api/admin/crm/whatsapp/qr-access', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetUserId, [field]: enabled }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const serverMessage = errData?.error || errData?.message || '';
        if (response.status === 401) throw new Error(serverMessage || 'Unauthorized — please log in again.');
        if (response.status === 403) throw new Error(serverMessage || 'Forbidden — Super Admin access required.');
        if (response.status === 404) throw new Error(serverMessage || 'QR access endpoint not found.');
        throw new Error(serverMessage || `Failed: ${response.status}`);
      }
      setQrAccessUsers(prev =>
        prev.map(u => u.userId === targetUserId ? { ...u, [field]: enabled } : u)
      );
    } catch (e: any) {
      setAccessError(e?.message || 'Failed to update access');
    } finally {
      setTogglingUser(null);
    }
  }, [token, togglingUser]);
  return (
    <div className="max-w-4xl mx-auto mt-6 px-6 pb-8 space-y-6">

      {/* ── Quick Links Panel ── */}
      <QuickLinksPanel />

      {/* ── Bridge Configuration ── */}
      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
            <Wifi className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Bridge Configuration</h3>
            <p className="text-xs text-gray-500">Auto-configured bridge host with per-user session isolation</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {/* Auto-configured indicator */}
          {bridgeUrlInput && bridgeSecretInput && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <Check className="w-4 h-4 text-green-600" />
              <p className="text-xs text-green-700"><strong>Auto-configured</strong> — The bridge host is shared, but your session isolation and secret are tied to your account.</p>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Bridge URL</label>
              <input
                type="url"
                placeholder="Loading bridge URL..."
                value={bridgeUrlInput}
                readOnly
                className="w-full px-3 py-2.5 border rounded-lg text-sm bg-gray-50 text-gray-600 outline-none cursor-default"
              />
              <p className="text-[10px] text-gray-400 mt-1">Shared bridge host; your tenant isolation is enforced server-side by your account session.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Bridge Secret <span className="text-green-600 font-normal">(unique)</span></label>
              <div className="relative">
                <input
                  type={showBridgeSecret ? 'text' : 'password'}
                  placeholder="Loading secret..."
                  value={bridgeSecretInput}
                  readOnly
                  className="w-full px-3 py-2.5 border rounded-lg text-sm bg-gray-50 text-gray-600 outline-none cursor-default pr-24"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {bridgeSecretInput && (
                    <button
                      type="button"
                      onClick={() => setShowBridgeSecret(v => !v)}
                      className="p-1 rounded hover:bg-gray-100 transition"
                      title={showBridgeSecret ? 'Hide secret' : 'Show secret'}
                    >
                      {showBridgeSecret ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                    </button>
                  )}
                  {bridgeSecretInput && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">Unique</span>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Authenticates this account to the shared bridge — your chats are isolated server-side by your account</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-400">
              <Lock className="w-3 h-3 inline mr-1" />
              Your messages are isolated server-side by your account session — no data is shared between accounts
            </p>
          </div>
        </div>
      </div>

      {/* ── Chat Storage Usage ── */}
      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <HardDrive className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Chat Storage</h3>
            <p className="text-xs text-gray-500">Your WhatsApp chat history, archived to secure cloud storage</p>
          </div>
        </div>
        <div className="p-6 space-y-3">
          {storageUsage ? (
            <>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Archived chat history</span>
                <span className="text-sm font-semibold text-gray-900">
                  {(storageUsage.bunnyBytes / (1024 * 1024)).toFixed(storageUsage.bunnyBytes > 1024 * 1024 * 1024 ? 2 : 1)}
                  {storageUsage.bunnyBytes > 1024 * 1024 * 1024 ? ' GB' : ' MB'}
                  {' '}({storageUsage.bunnyMessageCount.toLocaleString()} messages)
                </span>
              </div>
              <p className="text-[10px] text-gray-400">
                Messages older than a day move here automatically each night; kept for {storageUsage.retentionDays} days ({Math.round(storageUsage.retentionDays / 30)} months), then removed.
                {storageUsage.lastArchivedAt && ` Last updated ${new Date(storageUsage.lastArchivedAt).toLocaleString()}.`}
              </p>
              <a
                href={`/api/admin/crm/whatsapp/qr-chat-export?token=${encodeURIComponent(token || '')}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <Download className="w-3.5 h-3.5" /> Download my chat history
              </a>
            </>
          ) : (
            <p className="text-xs text-gray-400">Loading storage usage…</p>
          )}
        </div>
      </div>

      {/* ── Google Drive Backup ── */}
      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
            <CloudUpload className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Google Drive Backup</h3>
            <p className="text-xs text-gray-500">Mirror your WhatsApp chat history to your own Google Drive</p>
          </div>
        </div>
        <div className="p-6 space-y-3">
          {driveBanner && (
            <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${
              driveBanner.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {driveBanner.type === 'success' ? <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
              <span>{driveBanner.message}</span>
            </div>
          )}

          {!driveStatus ? (
            <p className="text-xs text-gray-400">Loading…</p>
          ) : !driveStatus.connected ? (
            <>
              <p className="text-xs text-gray-500">
                Connect your Google Drive so a copy of your archived chat history lands there too — accessible independently of this app, any time.
              </p>
              <button
                type="button"
                onClick={connectDrive}
                disabled={driveConnecting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-xs font-medium rounded-lg transition"
              >
                {driveConnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudUpload className="w-3.5 h-3.5" />}
                Connect Google Drive
              </button>
              <p className="text-[10px] text-gray-400">
                Google may show an "unverified app" warning during connect — that's expected until this integration completes Google's app review; choose Advanced → Go to app to continue.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-gray-700">Connected as <strong>{driveStatus.googleEmail || 'your Google account'}</strong></span>
                </div>
              </div>
              {driveStatus.needsReconnect && (
                <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>Your Drive connection expired (Google requires reconnecting periodically for this app). Reconnect to resume backups.</span>
                </div>
              )}
              <p className="text-[10px] text-gray-400">
                {driveStatus.lastSyncedAt ? `Last backed up ${new Date(driveStatus.lastSyncedAt).toLocaleString()}. ` : ''}
                Backs up automatically every night alongside the regular archive.
              </p>
              <div className="flex items-center gap-2">
                {driveStatus.needsReconnect ? (
                  <button
                    type="button"
                    onClick={connectDrive}
                    disabled={driveConnecting}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-xs font-medium rounded-lg transition"
                  >
                    {driveConnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Reconnect
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={backupNowToDrive}
                    disabled={driveBackingUp}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-medium rounded-lg transition"
                  >
                    {driveBackingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudUpload className="w-3.5 h-3.5" />}
                    Backup Now
                  </button>
                )}
                <button
                  type="button"
                  onClick={disconnectDrive}
                  disabled={driveDisconnecting}
                  className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 hover:bg-gray-50 disabled:opacity-60 text-gray-600 text-xs font-medium rounded-lg transition"
                >
                  {driveDisconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unplug className="w-3.5 h-3.5" />}
                  Disconnect
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── WhatsApp Chat Backup ── */}
      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
            <CloudUpload className="w-4 h-4 text-cyan-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Chat Backup & Recovery</h3>
            <p className="text-xs text-gray-500">Automatic backup of all chats, contacts, and messages with 1-3 year retention</p>
          </div>
        </div>
        <div className="p-6">
          <BackupPanel token={token} />
        </div>
      </div>

      {/* ── Funnel Stages Management ── */}
      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Funnel className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Funnel Stages</h3>
              <p className="text-xs text-gray-500">Organize chats into funnel stages for your sales pipeline</p>
            </div>
          </div>
          <button
            onClick={() => openEditModal('funnel', 'add')}
            className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add Stage
          </button>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-2">
            {funnelStages.filter(s => s.key !== 'all').map(stage => (
              <button
                key={stage.key}
                onClick={() => openEditModal('funnel', 'edit', stage)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition hover:shadow-sm ${stage.color}`}
              >
                {stage.label}
                <Pencil className="w-3 h-3 opacity-50" />
              </button>
            ))}
          </div>
          {funnelStages.filter(s => s.key !== 'all').length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No custom funnel stages yet. Click &quot;Add Stage&quot; to create one.</p>
          )}
        </div>
      </div>

      {/* ── Sender Display Name ── */}
      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <Settings className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Sender Display Name</h3>
            <p className="text-xs text-gray-500">Shown in bold below every message you send</p>
          </div>
        </div>
        <div className="p-6 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Display Name</label>
            <input
              type="text"
              placeholder="e.g. Swar Yoga, Support Team"
              value={senderDisplayName || ''}
              onChange={(e) => setSenderDisplayName?.(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              maxLength={50}
            />
          </div>
          <p className="text-[11px] text-gray-400">
            This name appears in <strong>bold</strong> next to the timestamp on your sent messages — just like the Meta WhatsApp inbox.
            Leave empty to hide.
          </p>
          {senderDisplayName && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Preview:</p>
              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                <span className="font-bold text-gray-900 text-[11px]">{senderDisplayName}</span>
                <span className="mx-0.5">·</span>
                <span>12:00 pm</span>
                <span className="text-blue-500">✓✓</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Label Presets Management ── */}
      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Tag className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Label Presets</h3>
              <p className="text-xs text-gray-500">Create labels to categorize and tag your chats</p>
            </div>
          </div>
          <button
            onClick={() => openEditModal('label', 'add')}
            className="px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add Label
          </button>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-2">
            {labelPresets.map(label => (
              <button
                key={label.key}
                onClick={() => openEditModal('label', 'edit', label)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition hover:shadow-sm ${label.color}`}
              >
                {label.label}
                <Pencil className="w-3 h-3 opacity-50" />
              </button>
            ))}
          </div>
          {labelPresets.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No label presets yet. Click &quot;Add Label&quot; to create one.</p>
          )}
        </div>
      </div>

      {/* ── Connection Actions ── */}
      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center">
            <Settings className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Connection Actions</h3>
            <p className="text-xs text-gray-500">Manage your WhatsApp connection and session</p>
          </div>
        </div>
        <div className="p-6">
          <div className="grid md:grid-cols-3 gap-4">
            <button
              onClick={handleReconnect}
              className="p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-green-300 hover:bg-green-50 transition text-center group"
            >
              <RefreshCw className="w-6 h-6 text-gray-400 group-hover:text-green-600 mx-auto mb-2 transition" />
              <p className="text-sm font-medium text-gray-700">Reconnect</p>
              <p className="text-[10px] text-gray-400 mt-1">Re-establish connection without losing session</p>
            </button>
            <button
              onClick={handleDisconnect}
              className="p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition text-center group"
            >
              <Unplug className="w-6 h-6 text-gray-400 group-hover:text-orange-600 mx-auto mb-2 transition" />
              <p className="text-sm font-medium text-gray-700">Disconnect</p>
              <p className="text-[10px] text-gray-400 mt-1">Close connection, can reconnect without QR</p>
            </button>
            <button
              onClick={handleLogout}
              className="p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-red-300 hover:bg-red-50 transition text-center group"
            >
              <LogOut className="w-6 h-6 text-gray-400 group-hover:text-red-600 mx-auto mb-2 transition" />
              <p className="text-sm font-medium text-gray-700">Logout</p>
              <p className="text-[10px] text-gray-400 mt-1">Clear session — will need to scan QR again</p>
            </button>
          </div>
        </div>
      </div>

      {/* ── Browser Extension ── */}
      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <span className="text-sm">🧩</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Browser Extension</h3>
            <p className="text-xs text-gray-500">CRM sidebar + AI Fix/Reply on your own personal WhatsApp Web</p>
          </div>
        </div>
        <div className="p-6 flex items-center gap-4">
          <button
            onClick={() => setShowExtensionModal(true)}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2 transition"
          >
            📥 Download Extension
          </button>
          <button
            onClick={() => setShowInstallGuide(true)}
            className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-2 transition"
          >
            📋 Installation Guide
          </button>
        </div>
      </div>

      {/* ── QR WhatsApp Access Management (Super Admin Only) ── */}
      {isSuperAdmin && (
        <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
          <div className="px-6 py-4 border-b bg-gradient-to-r from-red-50 to-orange-50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <Shield className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">QR WhatsApp &amp; Browser Extension Access</h3>
              <p className="text-xs text-gray-500">Manage which users can access the shared QR bridge and/or the browser extension</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {/* Info Banner */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
              <Lock className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                <strong>Privacy Protection:</strong> Users without their own bridge instance need explicit access from you. 
                Without access, they cannot see any WhatsApp chats — preventing cross-user data leaks.
              </p>
            </div>

            {accessError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {accessError}
              </div>
            )}

            {loadingAccess ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Loading users...</span>
              </div>
            ) : qrAccessUsers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No CRM users found</p>
            ) : (
              <div className="divide-y border rounded-xl overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500">
                  <div className="col-span-2">User</div>
                  <div className="col-span-2">Role</div>
                  <div className="col-span-1">Bridge</div>
                  <div className="col-span-3">Bridge Secret</div>
                  <div className="col-span-2 text-center">QR Access</div>
                  <div className="col-span-2 text-center">Extension</div>
                </div>
                {/* User rows */}
                {qrAccessUsers
                  .filter(u => u.userId !== currentUserId) // Don't show self (super admin)
                  .map(user => {
                    const isSelf = user.userId === 'admin' || user.userId === 'admincrm';
                    return (
                      <div key={user.userId} className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-gray-50 transition">
                        <div className="col-span-2">
                          <p className="text-sm font-medium text-gray-800 truncate">{user.name}</p>
                          {user.email && <p className="text-[10px] text-gray-400 truncate">{user.email}</p>}
                        </div>
                        <div className="col-span-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            isSelf ? 'bg-purple-100 text-purple-700' :
                            user.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {isSelf ? '👑 Super Admin' : user.role || 'admin'}
                          </span>
                        </div>
                        <div className="col-span-1">
                          {user.hasOwnBridge ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700">
                              <Check className="w-3 h-3" /> Own
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                              <X className="w-3 h-3" /> Shared
                            </span>
                          )}
                        </div>
                        <div className="col-span-3">
                          {user.bridgeSecret ? (
                            <div className="flex items-center gap-1">
                              <Key className="w-3 h-3 text-amber-500 flex-shrink-0" />
                              <code className="text-[10px] font-mono text-gray-600 truncate max-w-[120px]">
                                {visibleSecrets.has(user.userId) ? user.bridgeSecret : '••••••••••••'}
                              </code>
                              <button
                                onClick={() => toggleSecretVisibility(user.userId)}
                                className="p-0.5 hover:bg-gray-100 rounded transition"
                                title={visibleSecrets.has(user.userId) ? 'Hide secret' : 'Show secret'}
                              >
                                {visibleSecrets.has(user.userId) ? (
                                  <EyeOff className="w-3 h-3 text-gray-400" />
                                ) : (
                                  <Eye className="w-3 h-3 text-gray-400" />
                                )}
                              </button>
                              <button
                                onClick={() => copySecret(user.userId, user.bridgeSecret)}
                                className="p-0.5 hover:bg-gray-100 rounded transition"
                                title="Copy secret"
                              >
                                {copiedSecret === user.userId ? (
                                  <ClipboardCheck className="w-3 h-3 text-green-500" />
                                ) : (
                                  <Copy className="w-3 h-3 text-gray-400" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-300">—</span>
                          )}
                        </div>
                        <div className="col-span-2 flex justify-center">
                          {isSelf ? (
                            <span className="text-[10px] text-purple-500 font-medium">Always On</span>
                          ) : user.hasOwnBridge ? (
                            <span className="text-[10px] text-green-600 font-medium">Own Bridge</span>
                          ) : (
                            <button
                              onClick={() => toggleUserAccess(user.userId, !user.qrWhatsappEnabled)}
                              disabled={togglingUser === user.userId}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                user.qrWhatsappEnabled ? 'bg-green-500' : 'bg-gray-300'
                              } ${togglingUser === user.userId ? 'opacity-50' : ''}`}
                            >
                              {togglingUser === user.userId ? (
                                <Loader2 className="w-3 h-3 animate-spin text-white absolute left-1/2 -translate-x-1/2" />
                              ) : (
                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                                  user.qrWhatsappEnabled ? 'translate-x-4.5' : 'translate-x-1'
                                }`} />
                              )}
                            </button>
                          )}
                        </div>
                        <div className="col-span-2 flex justify-center">
                          {isSelf ? (
                            <span className="text-[10px] text-purple-500 font-medium">Always On</span>
                          ) : (
                            <button
                              onClick={() => toggleUserAccess(user.userId, !user.extensionEnabled, 'extensionEnabled')}
                              disabled={togglingUser === user.userId}
                              title="Browser extension access"
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                user.extensionEnabled ? 'bg-emerald-500' : 'bg-gray-300'
                              } ${togglingUser === user.userId ? 'opacity-50' : ''}`}
                            >
                              {togglingUser === user.userId ? (
                                <Loader2 className="w-3 h-3 animate-spin text-white absolute left-1/2 -translate-x-1/2" />
                              ) : (
                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                                  user.extensionEnabled ? 'translate-x-4.5' : 'translate-x-1'
                                }`} />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            <div className="pt-2 flex items-center gap-2 text-[10px] text-gray-400">
              <Shield className="w-3 h-3" />
              Users with &quot;QR Access&quot; enabled can use the shared bridge. Users with their own bridge always have access.
            </div>
          </div>
        </div>
      )}

      {/* ── Current User Compartment Info ── */}
      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
            <Users className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Your Compartment</h3>
            <p className="text-xs text-gray-500">Your isolated QR WhatsApp data space</p>
          </div>
        </div>
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl border">
              <p className="text-xs text-gray-500 mb-1">User ID</p>
              <p className="text-sm font-mono font-medium text-gray-800">{currentUserId || 'Unknown'}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border">
              <p className="text-xs text-gray-500 mb-1">Access Level</p>
              <p className="text-sm font-medium text-gray-800">
                {isSuperAdmin ? '👑 Super Admin (Full Access)' : bridgeUrlInput ? '🔗 Personal Bridge' : '🔒 Shared Bridge (Enabled)'}
              </p>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-3 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            All your funnel stages, labels, and chat mappings are stored independently in your personal compartment.
          </p>
        </div>
      </div>
    </div>
  );
}
