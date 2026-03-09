'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Wifi, Loader2, Save, Funnel, Plus, Pencil, Tag, Settings, RefreshCw, Unplug, LogOut, Shield, Users, Check, X, Lock } from 'lucide-react';
import type { FunnelStage, LabelPreset } from '../types';

type QRAccessUser = {
  userId: string;
  name: string;
  email: string;
  role: string;
  qrWhatsappEnabled: boolean;
  hasOwnBridge: boolean;
  bridgeUrl: string;
};

export interface SettingsTabProps {
  bridgeUrlInput: string;
  setBridgeUrlInput: (v: string) => void;
  bridgeSecretInput: string;
  setBridgeSecretInput: (v: string) => void;
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
}

export function SettingsTab({
  bridgeUrlInput, setBridgeUrlInput,
  bridgeSecretInput, setBridgeSecretInput,
  savingBridge, saveBridgeConfig,
  funnelStages, labelPresets, openEditModal,
  handleReconnect, handleDisconnect, handleLogout,
  setShowExtensionModal, setShowInstallGuide,
  isSuperAdmin, currentUserId, crmFetch,
}: SettingsTabProps) {
  // ── QR Access Management State (super admin only) ──
  const [qrAccessUsers, setQrAccessUsers] = useState<QRAccessUser[]>([]);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [togglingUser, setTogglingUser] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);

  // Load QR access users when super admin opens settings
  useEffect(() => {
    if (!isSuperAdmin || !crmFetch) return;
    let cancelled = false;
    const loadAccessList = async () => {
      setLoadingAccess(true);
      try {
        const res = await crmFetch('/api/admin/crm/whatsapp/qr-access', { silent: true });
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
  }, [isSuperAdmin, crmFetch]);

  // Toggle QR access for a user
  const toggleUserAccess = useCallback(async (targetUserId: string, enabled: boolean) => {
    if (!crmFetch || togglingUser) return;
    setTogglingUser(targetUserId);
    setAccessError(null);
    try {
      await crmFetch('/api/admin/crm/whatsapp/qr-access', {
        method: 'PUT',
        body: { targetUserId, qrWhatsappEnabled: enabled },
      });
      setQrAccessUsers(prev =>
        prev.map(u => u.userId === targetUserId ? { ...u, qrWhatsappEnabled: enabled } : u)
      );
    } catch (e: any) {
      setAccessError(e?.message || 'Failed to update access');
    } finally {
      setTogglingUser(null);
    }
  }, [crmFetch, togglingUser]);
  return (
    <div className="max-w-4xl mx-auto mt-6 px-6 pb-8 space-y-6">

      {/* ── Bridge Configuration ── */}
      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
            <Wifi className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Bridge Configuration</h3>
            <p className="text-xs text-gray-500">Your unique WhatsApp bridge connection — auto-configured on first setup</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {/* Auto-configured indicator */}
          {bridgeUrlInput && bridgeSecretInput && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <Check className="w-4 h-4 text-green-600" />
              <p className="text-xs text-green-700"><strong>Auto-configured</strong> — Your bridge has a unique secret key. No other user shares this configuration.</p>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Bridge URL</label>
              <input
                type="url"
                placeholder="https://your-bridge.up.railway.app"
                value={bridgeUrlInput}
                onChange={e => setBridgeUrlInput(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
              <p className="text-[10px] text-gray-400 mt-1">Auto-filled with the default bridge — change only if you have your own instance</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Bridge Secret <span className="text-green-600 font-normal">(unique)</span></label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Auto-generated unique secret"
                  value={bridgeSecretInput}
                  onChange={e => setBridgeSecretInput(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none pr-16"
                />
                {bridgeSecretInput && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">Unique</span>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Auto-generated per user — guaranteed unique across all accounts</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={saveBridgeConfig}
              disabled={savingBridge || !bridgeUrlInput.trim()}
              className="px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 transition"
            >
              {savingBridge ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {savingBridge ? 'Saving...' : 'Save & Connect'}
            </button>
            <p className="text-xs text-gray-400">
              <Lock className="w-3 h-3 inline mr-1" />
              Each user has their own unique secret — no data shared between accounts
            </p>
          </div>
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

      {/* ── PC Extension ── */}
      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <span className="text-sm">📥</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">PC Extension</h3>
            <p className="text-xs text-gray-500">Download the desktop extension for advanced features</p>
          </div>
        </div>
        <div className="p-6 flex items-center gap-4">
          <button
            onClick={() => setShowExtensionModal(true)}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2 transition"
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
              <h3 className="text-sm font-bold text-gray-900">QR WhatsApp Access Control</h3>
              <p className="text-xs text-gray-500">Manage which users can access QR WhatsApp (privacy compartment)</p>
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
                  <div className="col-span-3">User</div>
                  <div className="col-span-3">Role</div>
                  <div className="col-span-3">Bridge Status</div>
                  <div className="col-span-3 text-center">QR Access</div>
                </div>
                {/* User rows */}
                {qrAccessUsers
                  .filter(u => u.userId !== currentUserId) // Don't show self (super admin)
                  .map(user => {
                    const isSelf = user.userId === 'admin' || user.userId === 'admincrm';
                    return (
                      <div key={user.userId} className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-gray-50 transition">
                        <div className="col-span-3">
                          <p className="text-sm font-medium text-gray-800 truncate">{user.name}</p>
                          {user.email && <p className="text-[10px] text-gray-400 truncate">{user.email}</p>}
                        </div>
                        <div className="col-span-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            isSelf ? 'bg-purple-100 text-purple-700' :
                            user.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {isSelf ? '👑 Super Admin' : user.role || 'admin'}
                          </span>
                        </div>
                        <div className="col-span-3">
                          {user.hasOwnBridge ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700">
                              <Check className="w-3 h-3" /> Own Bridge
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                              <X className="w-3 h-3" /> Shared Bridge
                            </span>
                          )}
                        </div>
                        <div className="col-span-3 flex justify-center">
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
