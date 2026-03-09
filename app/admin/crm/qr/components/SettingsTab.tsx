'use client';

import React from 'react';
import { Wifi, Loader2, Save, Funnel, Plus, Pencil, Tag, Settings, RefreshCw, Unplug, LogOut } from 'lucide-react';
import type { FunnelStage, LabelPreset } from '../types';

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
}

export function SettingsTab({
  bridgeUrlInput, setBridgeUrlInput,
  bridgeSecretInput, setBridgeSecretInput,
  savingBridge, saveBridgeConfig,
  funnelStages, labelPresets, openEditModal,
  handleReconnect, handleDisconnect, handleLogout,
  setShowExtensionModal, setShowInstallGuide,
}: SettingsTabProps) {
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
            <p className="text-xs text-gray-500">Connect to a custom WhatsApp bridge instance, or use the default shared bridge</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
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
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Bridge Secret</label>
              <input
                type="password"
                placeholder="your-bridge-secret"
                value={bridgeSecretInput}
                onChange={e => setBridgeSecretInput(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
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
            <p className="text-xs text-gray-400">Leave empty to use the default shared bridge</p>
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
    </div>
  );
}
