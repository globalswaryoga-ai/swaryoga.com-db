'use client';

import React, { useState } from 'react';
import { X, RefreshCw, Eye, ArrowLeft, ChevronLeft, ChevronRight, Loader2, Image as ImageIcon, Send } from 'lucide-react';
import { getAvatarColor } from '../utils';

interface StatusUser {
  senderJid: string;
  senderPhone: string;
  senderName: string;
  statuses: Array<{
    timestamp: number;
    type: string;
    text?: string;
    hasMedia?: boolean;
    mediaMessageId?: string;
  }>;
}

interface StatusPanelProps {
  showStatusPanel: boolean;
  setShowStatusPanel: (v: boolean) => void;
  statusData: StatusUser[];
  loadingStatuses: boolean;
  fetchStatuses: () => void;
  selectedStatusUser: StatusUser | null;
  setSelectedStatusUser: (u: StatusUser | null) => void;
  currentStatusIndex: number;
  setCurrentStatusIndex: (i: number) => void;
  onPostStatus?: (text: string) => Promise<number | void>;
}

export function StatusPanel({
  showStatusPanel,
  setShowStatusPanel,
  statusData,
  loadingStatuses,
  fetchStatuses,
  selectedStatusUser,
  setSelectedStatusUser,
  currentStatusIndex,
  setCurrentStatusIndex,
  onPostStatus,
}: StatusPanelProps) {
  const [composeText, setComposeText] = useState('');
  const [posting, setPosting] = useState(false);
  const [postResult, setPostResult] = useState('');

  const handlePost = async () => {
    if (!composeText.trim() || posting || !onPostStatus) return;
    setPosting(true);
    setPostResult('');
    try {
      const audience = await onPostStatus(composeText.trim());
      setComposeText('');
      setPostResult(typeof audience === 'number' && audience > 0 ? `✅ Posted to ${audience} contacts` : '✅ Status posted');
      setTimeout(() => setPostResult(''), 4000);
    } catch (e: any) {
      setPostResult(`❌ ${e?.message || 'Failed to post status'}`);
    } finally {
      setPosting(false);
    }
  };

  if (!showStatusPanel) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            <h2 className="text-base font-semibold">Status Updates</h2>
            {statusData.length > 0 && (
              <span className="text-[10px] bg-white bg-opacity-20 px-1.5 py-0.5 rounded-full">{statusData.length} contacts</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchStatuses} className="p-1 rounded hover:bg-white hover:bg-opacity-20" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loadingStatuses ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => { setShowStatusPanel(false); setSelectedStatusUser(null); }} className="p-1 rounded hover:bg-white hover:bg-opacity-20">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Post-your-status composer */}
        {onPostStatus && !selectedStatusUser && (
          <div className="px-4 py-3 border-b bg-green-50/60 flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={composeText}
                onChange={(e) => setComposeText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePost()}
                placeholder="Post a status update (offers, class reminders)…"
                maxLength={700}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              />
              <button
                onClick={handlePost}
                disabled={posting || !composeText.trim()}
                className="p-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 transition"
                title="Post status"
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            {postResult && <p className="text-[11px] mt-1.5 text-gray-600">{postResult}</p>}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loadingStatuses ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-green-500 mb-3" />
              <p className="text-sm text-gray-500">Loading statuses...</p>
            </div>
          ) : selectedStatusUser ? (
            /* Status Viewer */
            <div className="flex flex-col h-full">
              {/* Viewer Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b bg-gray-50">
                <button onClick={() => { setSelectedStatusUser(null); setCurrentStatusIndex(0); }} className="p-1 rounded hover:bg-gray-200">
                  <ArrowLeft className="w-4 h-4 text-gray-600" />
                </button>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${getAvatarColor(selectedStatusUser.senderPhone)}`}>
                  {selectedStatusUser.senderPhone.slice(-2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{selectedStatusUser.senderName}</p>
                  <p className="text-[10px] text-gray-500">{selectedStatusUser.statuses.length} status{selectedStatusUser.statuses.length > 1 ? 'es' : ''}</p>
                </div>
                {selectedStatusUser.statuses.length > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentStatusIndex(Math.max(0, currentStatusIndex - 1))}
                      disabled={currentStatusIndex === 0}
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] text-gray-500">{currentStatusIndex + 1}/{selectedStatusUser.statuses.length}</span>
                    <button
                      onClick={() => setCurrentStatusIndex(Math.min(selectedStatusUser.statuses.length - 1, currentStatusIndex + 1))}
                      disabled={currentStatusIndex >= selectedStatusUser.statuses.length - 1}
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              {/* Status Content */}
              {(() => {
                const status = selectedStatusUser.statuses[currentStatusIndex];
                if (!status) return null;
                return (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-[300px]">
                    {/* Progress dots */}
                    {selectedStatusUser.statuses.length > 1 && (
                      <div className="flex gap-1 mb-4">
                        {selectedStatusUser.statuses.map((_: any, i: number) => (
                          <div
                            key={i}
                            className={`h-0.5 rounded-full transition-all ${i === currentStatusIndex ? 'w-6 bg-green-500' : 'w-3 bg-gray-300'}`}
                          />
                        ))}
                      </div>
                    )}
                    {status.hasMedia ? (
                      <div className="w-full max-w-sm">
                        <img
                          src={`/api/admin/crm/whatsapp/qr-bridge?path=${encodeURIComponent(`/media/${status.mediaMessageId}`)}`}
                          alt="Status"
                          className="w-full rounded-xl shadow-lg object-contain max-h-[400px]"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="hidden text-center py-8">
                          <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-xs text-gray-400">Media not available</p>
                        </div>
                        {status.text && (
                          <p className="text-sm text-gray-700 text-center mt-3">{status.text}</p>
                        )}
                      </div>
                    ) : status.type === 'text' ? (
                      <div className="w-full max-w-sm bg-gradient-to-br from-green-500 to-teal-600 rounded-xl p-8 shadow-lg">
                        <p className="text-white text-lg text-center font-medium leading-relaxed">{status.text}</p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Eye className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">Status type: {status.type}</p>
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400 mt-4">
                      {new Date(status.timestamp * 1000).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                );
              })()}
            </div>
          ) : statusData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Eye className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No recent statuses</p>
              <p className="text-[10px] text-gray-400 mt-1">Statuses from contacts will appear here as they are posted</p>
            </div>
          ) : (
            /* Status List */
            <div className="divide-y">
              {statusData.map((user: any) => (
                <button
                  key={user.senderJid}
                  onClick={() => { setSelectedStatusUser(user); setCurrentStatusIndex(0); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition"
                >
                  <div className="relative">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-semibold ${getAvatarColor(user.senderPhone)} ring-2 ring-green-500 ring-offset-2`}>
                      {user.senderPhone.slice(-2)}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                      <span className="text-white text-[8px] font-bold">{user.statuses.length}</span>
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.senderName}</p>
                    <p className="text-[10px] text-gray-500">
                      {user.statuses.length} status{user.statuses.length > 1 ? 'es' : ''} · {new Date(user.statuses[0].timestamp * 1000).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
