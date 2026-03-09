'use client';

import React from 'react';
import { X, Star, Search, Send, Loader2, CheckSquare, Square } from 'lucide-react';
import { QUICK_REPLIES, TEMPLATES } from '../constants';
import { getAvatarColor, getInitials, formatPhoneNumber } from '../utils';
import type { ChatItem } from '../types';

interface StarPopupProps {
  showStarPopup: boolean;
  setShowStarPopup: (v: boolean) => void;
  starTab: 'quick' | 'template' | 'broadcast';
  setStarTab: (v: 'quick' | 'template' | 'broadcast') => void;
  setComposerText: React.Dispatch<React.SetStateAction<string>>;
  broadcastChats: Set<string>;
  setBroadcastChats: React.Dispatch<React.SetStateAction<Set<string>>>;
  broadcastText: string;
  setBroadcastText: (v: string) => void;
  broadcastSending: boolean;
  broadcastSearch: string;
  setBroadcastSearch: (v: string) => void;
  chats: ChatItem[];
  handleBroadcastSend: () => void;
}

export function StarPopup({
  showStarPopup,
  setShowStarPopup,
  starTab,
  setStarTab,
  setComposerText,
  broadcastChats,
  setBroadcastChats,
  broadcastText,
  setBroadcastText,
  broadcastSending,
  broadcastSearch,
  setBroadcastSearch,
  chats,
  handleBroadcastSend,
}: StarPopupProps) {
  if (!showStarPopup) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowStarPopup(false)}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between bg-gradient-to-r from-yellow-500 to-orange-500 rounded-t-xl">
          <div className="flex items-center gap-2 text-white">
            <Star className="w-5 h-5" />
            <h3 className="font-semibold">Quick Actions</h3>
          </div>
          <button onClick={() => setShowStarPopup(false)} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {(['quick', 'template', 'broadcast'] as const).map(t => (
            <button key={t} onClick={() => setStarTab(t)} className={`flex-1 px-4 py-2.5 text-sm font-medium transition ${
              starTab === t ? 'text-yellow-600 border-b-2 border-yellow-500 bg-yellow-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}>
              {t === 'quick' && '⚡ Quick Reply'}
              {t === 'template' && '📋 Templates'}
              {t === 'broadcast' && '📢 Broadcast'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Quick Reply Tab */}
          {starTab === 'quick' && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 mb-3">Click to insert into message box</p>
              {QUICK_REPLIES.map((reply, i) => (
                <button key={i} onClick={() => { setComposerText(prev => prev ? prev + ' ' + reply : reply); setShowStarPopup(false); }} className="w-full text-left px-3 py-2.5 bg-gray-50 hover:bg-green-50 border rounded-lg text-sm text-gray-700 hover:text-green-700 hover:border-green-300 transition">
                  {reply}
                </button>
              ))}
            </div>
          )}

          {/* Template Tab */}
          {starTab === 'template' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 mb-3">Click to load template into message box</p>
              {TEMPLATES.map((tpl, i) => (
                <button key={i} onClick={() => { setComposerText(tpl.text); setShowStarPopup(false); }} className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-indigo-50 border rounded-lg hover:border-indigo-300 transition">
                  <p className="text-sm font-semibold text-gray-800 mb-1">{tpl.name}</p>
                  <p className="text-xs text-gray-500 line-clamp-2">{tpl.text}</p>
                </button>
              ))}
            </div>
          )}

          {/* Broadcast Tab */}
          {starTab === 'broadcast' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Send one message to up to 10 contacts at once</p>
              <textarea
                value={broadcastText}
                onChange={e => setBroadcastText(e.target.value)}
                placeholder="Type your broadcast message..."
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 resize-none"
                rows={3}
              />
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={broadcastSearch}
                  onChange={e => setBroadcastSearch(e.target.value)}
                  placeholder="Search contacts..."
                  className="w-full pl-8 pr-3 py-2 text-xs bg-gray-100 rounded-lg border-0 focus:ring-1 focus:ring-yellow-400 outline-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{broadcastChats.size}/10 selected</span>
                {broadcastChats.size > 0 && (
                  <button onClick={() => setBroadcastChats(new Set())} className="text-xs text-red-500 hover:text-red-700">Clear all</button>
                )}
              </div>
              <div className="max-h-40 overflow-y-auto border rounded-lg divide-y">
                {chats
                  .filter(c => !c.isGroup)
                  .filter(c => {
                    if (!broadcastSearch.trim()) return true;
                    const q = broadcastSearch.toLowerCase();
                    return (c.name || '').toLowerCase().includes(q) || (c.resolvedPhone || c.id).toLowerCase().includes(q);
                  })
                  .slice(0, 50)
                  .map(c => {
                    const checked = broadcastChats.has(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          setBroadcastChats(prev => {
                            const next = new Set(prev);
                            if (next.has(c.id)) { next.delete(c.id); }
                            else if (next.size < 10) { next.add(c.id); }
                            return next;
                          });
                        }}
                        className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 transition ${checked ? 'bg-yellow-50' : ''}`}
                      >
                        {checked ? <CheckSquare className="w-4 h-4 text-yellow-600 flex-shrink-0" /> : <Square className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0 ${getAvatarColor(c.name)}`}>
                          {getInitials(c.name)}
                        </div>
                        <span className="text-xs text-gray-700 truncate">{c.resolvedPhone ? formatPhoneNumber(c.resolvedPhone) : c.name}</span>
                      </div>
                    );
                  })}
              </div>
              <button
                onClick={handleBroadcastSend}
                disabled={broadcastChats.size === 0 || !broadcastText.trim() || broadcastSending}
                className="w-full py-2.5 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {broadcastSending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="w-4 h-4" /> Send to {broadcastChats.size} contacts</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
