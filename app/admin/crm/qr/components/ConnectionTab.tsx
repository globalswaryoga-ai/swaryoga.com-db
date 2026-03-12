'use client';

import React from 'react';
import { QrCode, Wifi, WifiOff, RefreshCw, Loader2, CheckCircle2, Phone, MessageSquare, Settings, Unplug, LogOut, Info, Radio, Users, Eye, ChevronRight } from 'lucide-react';
import type { BridgeStatus, ChatItem } from '../types';
import { getAvatarColor, formatUptime } from '../utils';

export interface ConnectionTabProps {
  isConnected: boolean;
  connState: string;
  qrData: string | null;
  status: BridgeStatus | null;
  chats: ChatItem[];
  loadingStatuses: boolean;
  statusData: any[];
  handleReconnect: () => void;
  handleDisconnect: () => void;
  handleLogout: () => void;
  setTab: (tab: 'connection' | 'inbox' | 'settings') => void;
  setShowGroupCreate: (v: boolean) => void;
  setShowStatusPanel: (v: boolean) => void;
  setSelectedStatusUser: (u: any) => void;
  setCurrentStatusIndex: (i: number) => void;
  fetchStatuses: () => void;
  fetchChats: () => void;
}

export function ConnectionTab({
  isConnected, connState, qrData, status, chats,
  loadingStatuses, statusData,
  handleReconnect, handleDisconnect, handleLogout,
  setTab, setShowGroupCreate, setShowStatusPanel,
  setSelectedStatusUser, setCurrentStatusIndex,
  fetchStatuses, fetchChats,
}: ConnectionTabProps) {
  return (
    <div className="max-w-5xl mx-auto mt-6 px-6 pb-8 space-y-6">

      {/* ── QR Scan Section (when disconnected with QR) ── */}
      {!isConnected && qrData && (
        <div className="bg-white rounded-2xl shadow-lg border overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Scan QR Code to Connect
            </h2>
            <p className="text-green-100 text-sm mt-1">Link your WhatsApp account to start managing chats</p>
          </div>
          <div className="grid md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x">
            {/* QR Code */}
            <div className="flex flex-col items-center justify-center p-8">
              <div className="p-4 bg-white rounded-2xl border-2 border-green-100 shadow-inner">
                <img src={qrData} alt="QR Code" className="w-64 h-64" />
              </div>
              <div className="flex items-center gap-3 mt-4">
                <p className="text-xs text-gray-400">Auto-refreshes every ~20 seconds</p>
                <button
                  onClick={() => { handleReconnect(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition"
                  title="Refresh QR"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>
            </div>
            {/* Steps */}
            <div className="p-8 flex flex-col justify-center">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">How to connect:</h3>
              <div className="space-y-4">
                {[
                  { step: '1', title: 'Open WhatsApp', desc: 'on your phone' },
                  { step: '2', title: 'Go to Settings', desc: '→ Linked Devices' },
                  { step: '3', title: 'Tap "Link a Device"', desc: 'and point your camera at this QR code' },
                ].map(s => (
                  <div key={s.step} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{s.step}</div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{s.title}</p>
                      <p className="text-xs text-gray-500">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">Make sure your phone has an active internet connection while scanning</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Disconnected (No QR available) ── */}
      {connState === 'disconnected' && !qrData && (
        <div className="bg-white rounded-2xl shadow-lg border p-10 text-center max-w-lg mx-auto">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
            <WifiOff className="w-10 h-10 text-red-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">WhatsApp Not Connected</h2>
          <p className="text-sm text-gray-500 mb-6">
            The bridge service may not be running, or your session has expired.
          </p>
          <button
            onClick={handleReconnect}
            className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-semibold text-sm inline-flex items-center gap-2 shadow-md shadow-green-200"
          >
            <RefreshCw className="w-4 h-4" />
            Try Reconnect
          </button>
          <div className="mt-8 p-4 bg-gray-50 rounded-xl text-left text-xs text-gray-500">
            <p className="font-semibold text-gray-700 mb-2">Troubleshooting:</p>
            <ul className="list-disc ml-4 space-y-1.5">
              <li>Make sure the Baileys bridge service is running</li>
              <li>Check <code className="bg-gray-200 px-1 rounded">WHATSAPP_BRIDGE_HTTP_URL</code> env var</li>
              <li>Go to <button onClick={() => setTab('settings')} className="text-green-600 hover:underline font-medium">Settings</button> to configure a custom bridge URL</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── Connected Dashboard ── */}
      {isConnected && (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Connected Status Card */}
          <div className="md:col-span-2 bg-white rounded-2xl shadow-md border overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">WhatsApp Connected</h2>
                  {status?.phone && (
                    <p className="bg-white/90 text-green-700 px-2 py-0.5 rounded-md text-sm font-bold flex items-center gap-1.5 mt-1 shadow-sm">
                      <Phone className="w-4 h-4 stroke-[2.5]" />
                      {status.phone.name || status.phone.id}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-bold text-gray-900">{chats.length}</p>
                  <p className="text-xs text-gray-500">Total Chats</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-bold text-green-600">{chats.filter(c => c.unreadCount > 0).length}</p>
                  <p className="text-xs text-gray-500">Unread</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-bold text-gray-900">{status?.uptime ? formatUptime(status.uptime) : '—'}</p>
                  <p className="text-xs text-gray-500">Uptime</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setTab('inbox'); fetchChats(); }}
                  className="flex-1 px-5 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-green-100"
                >
                  <MessageSquare className="w-4 h-4" /> Open Inbox
                </button>
                <button onClick={handleReconnect} className="p-3 rounded-xl hover:bg-gray-100 border transition" title="Reconnect"><RefreshCw className="w-4 h-4 text-gray-500" /></button>
                <button onClick={handleDisconnect} className="p-3 rounded-xl hover:bg-orange-50 border border-orange-200 transition" title="Disconnect"><Unplug className="w-4 h-4 text-orange-500" /></button>
                <button onClick={handleLogout} className="p-3 rounded-xl hover:bg-red-50 border border-red-200 transition" title="Logout"><LogOut className="w-4 h-4 text-red-500" /></button>
              </div>
            </div>
          </div>

          {/* Bridge Info Card */}
          <div className="bg-white rounded-2xl shadow-md border p-5">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-4">
              <Wifi className="w-4 h-4 text-green-600" />
              Bridge Status
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Connection', value: connState, color: 'text-green-600' },
                { label: 'Retry Count', value: String(status?.retryCount ?? '0'), color: 'text-gray-900' },
                { label: 'Uptime', value: status?.uptime ? formatUptime(status.uptime) : '—', color: 'text-gray-900' },
                { label: 'QR Available', value: qrData ? 'Yes' : 'No', color: 'text-gray-900' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-500">{item.label}</span>
                  <span className={`text-xs font-semibold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setTab('settings')} className="w-full mt-4 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg border transition flex items-center justify-center gap-1.5">
              <Settings className="w-3 h-3" /> Bridge Settings
            </button>
          </div>
        </div>
      )}

      {/* ── Recent Status Updates (when connected) ── */}
      {isConnected && (
        <div className="mt-6 bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-green-600" />
              Recent Status Updates
            </h3>
            <button
              onClick={fetchStatuses}
              className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${loadingStatuses ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          {loadingStatuses ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-green-500 mr-2" />
              <span className="text-sm text-gray-500">Loading statuses...</span>
            </div>
          ) : statusData.length === 0 ? (
            <div className="py-6 text-center">
              <Eye className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No recent status updates</p>
              <p className="text-[10px] text-gray-400 mt-1">Statuses from contacts will appear here as they are posted</p>
            </div>
          ) : (
            <div className="space-y-2">
              {statusData.slice(0, 8).map((user: any) => (
                <button
                  key={user.senderJid}
                  onClick={() => { setShowStatusPanel(true); setSelectedStatusUser(user); setCurrentStatusIndex(0); }}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg text-left transition"
                >
                  <div className="relative">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold ${getAvatarColor(user.senderPhone)} ring-2 ring-green-500 ring-offset-1`}>
                      {user.senderPhone.slice(-2)}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 flex items-center justify-center">
                      <span className="text-white text-[7px] font-bold">{user.statuses.length}</span>
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{user.senderName}</p>
                    <p className="text-[10px] text-gray-500">
                      {user.statuses.length} status{user.statuses.length > 1 ? 'es' : ''} · {new Date(user.statuses[0].timestamp * 1000).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                </button>
              ))}
              {statusData.length > 8 && (
                <button
                  onClick={() => { setShowStatusPanel(true); fetchStatuses(); }}
                  className="w-full text-center text-xs text-green-600 hover:text-green-700 py-2"
                >
                  View all {statusData.length} status updates →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Bridge Info (when disconnected — show below QR or disconnect card) ── */}
      {!isConnected && (
        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-3">
            <Wifi className="w-4 h-4 text-gray-500" />
            Bridge Status
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Connection', value: connState },
              { label: 'Retry Count', value: String(status?.retryCount ?? '0') },
              { label: 'Uptime', value: status?.uptime ? formatUptime(status.uptime) : '—' },
              { label: 'QR Available', value: qrData ? 'Yes' : 'No' },
            ].map(item => (
              <div key={item.label} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">{item.label}</p>
                <p className="text-sm font-semibold text-gray-800 mt-1">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
