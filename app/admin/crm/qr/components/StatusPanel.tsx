'use client';

import React, { useState, useRef } from 'react';
import { X, RefreshCw, Eye, ArrowLeft, ChevronLeft, ChevronRight, Loader2, Image as ImageIcon, Send, Calendar } from 'lucide-react';
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
  /** Posts a status. `imageUrl`, when given, posts an image status with the
   *  text as its caption — the bridge's /post-status supports both. */
  onPostStatus?: (text: string, imageUrl?: string) => Promise<number | void>;
  /** Uploads a local file and resolves to a public URL the bridge can fetch. */
  onUploadMedia?: (file: File) => Promise<string>;
  /** Queues a status for later. Fires server-side, so it does not depend on
   *  this browser staying open. */
  onScheduleStatus?: (input: { text: string; imageUrl?: string; scheduledAt: string; repeatDays: number[] }) => Promise<void>;
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
  onUploadMedia,
  onScheduleStatus,
}: StatusPanelProps) {
  const [composeText, setComposeText] = useState('');
  const [posting, setPosting] = useState(false);
  const [postResult, setPostResult] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const composeRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /** Wraps the selection in WhatsApp's markers, matching the extension's B/I/S. */
  const wrapSelection = (marker: string) => {
    const el = composeRef.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const next = composeText.slice(0, a) + marker + composeText.slice(a, b) + marker + composeText.slice(b);
    setComposeText(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + marker.length, b + marker.length);
    });
  };

  const insertEmoji = (emoji: string) => {
    const el = composeRef.current;
    const at = el ? el.selectionStart : composeText.length;
    setComposeText(composeText.slice(0, at) + emoji + composeText.slice(at));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(at + emoji.length, at + emoji.length); });
  };

  const handleUpload = async (file: File) => {
    if (!onUploadMedia) return;
    setUploading(true);
    setPostResult('');
    try {
      setMediaUrl(await onUploadMedia(file));
    } catch (e: any) {
      setPostResult(`❌ ${e?.message || 'Upload failed'}`);
    } finally {
      setUploading(false);
    }
  };

  const handlePost = async () => {
    // An image status can carry an empty caption, so text alone is not required
    // once media is attached.
    if ((!composeText.trim() && !mediaUrl.trim()) || posting) return;

    if (when === 'later') {
      if (!onScheduleStatus) return;
      if (!scheduledAt) { setPostResult('❌ Pick a date and time'); return; }
      setPosting(true);
      setPostResult('');
      try {
        await onScheduleStatus({
          text: composeText.trim(),
          imageUrl: mediaUrl.trim() || undefined,
          scheduledAt: new Date(scheduledAt).toISOString(),
          repeatDays,
        });
        setComposeText('');
        setMediaUrl('');
        setScheduledAt('');
        setRepeatDays([]);
        setWhen('now');
        setPostResult('✅ Status scheduled');
        setTimeout(() => setPostResult(''), 4000);
      } catch (e: any) {
        setPostResult(`❌ ${e?.message || 'Failed to schedule status'}`);
      } finally {
        setPosting(false);
      }
      return;
    }

    if (!onPostStatus) return;
    setPosting(true);
    setPostResult('');
    try {
      const audience = await onPostStatus(composeText.trim(), mediaUrl.trim() || undefined);
      setComposeText('');
      setMediaUrl('');
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
            {/* Formatting + emoji, matching the extension's status composer */}
            <div className="flex items-center gap-1 mb-1.5 flex-wrap">
              {([['B', '*', 'font-bold'], ['I', '_', 'italic'], ['S', '~', 'line-through']] as const).map(
                ([label, marker, cls]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => wrapSelection(marker)}
                    className={`w-7 h-7 rounded border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100 transition ${cls}`}
                    title={`${label} (${marker}text${marker})`}
                  >
                    {label}
                  </button>
                )
              )}
              <span className="w-px h-5 bg-gray-300 mx-1" />
              {['😊', '🙏', '✅', '📌', '🔥', '🎉', '📞', '📍', '💰', '🎯', '⭐', '💪'].map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => insertEmoji(e)}
                  className="w-7 h-7 rounded border border-gray-300 bg-white text-sm hover:bg-gray-100 transition"
                >
                  {e}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-500 mb-1.5">Format: *bold* · _italic_ · ~strike~</p>

            <textarea
              ref={composeRef}
              rows={3}
              value={composeText}
              onChange={(e) => setComposeText(e.target.value)}
              placeholder="What's on your mind?"
              maxLength={700}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            />

            {/* Image / video: paste a URL, or upload and we hand the bridge the CDN link */}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="Image / video URL (optional)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              />
              {onUploadMedia && (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="px-2.5 py-2 rounded-lg border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition whitespace-nowrap"
                  >
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Upload'}
                  </button>
                </>
              )}
              {mediaUrl && (
                <button
                  type="button"
                  onClick={() => setMediaUrl('')}
                  className="px-2 py-2 rounded-lg border border-gray-300 bg-white text-xs text-gray-500 hover:bg-gray-100"
                  title="Remove media"
                >
                  ×
                </button>
              )}
            </div>

            {/* When: post now, or hand it to the server-side scheduler */}
            {onScheduleStatus && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-4 text-xs">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" checked={when === 'now'} onChange={() => setWhen('now')} className="accent-green-600" />
                    Post now
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" checked={when === 'later'} onChange={() => setWhen('later')} className="accent-green-600" />
                    Schedule
                  </label>
                </div>

                {when === 'later' && (
                  <>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={e => setScheduledAt(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[11px] text-gray-600 mr-1">Repeat:</span>
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setRepeatDays(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                          className={`px-2 py-1 rounded text-[11px] font-medium border transition ${
                            repeatDays.includes(i)
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-500">
                      {repeatDays.length
                        ? 'Repeats on the selected days at that time.'
                        : 'One-off post.'}{' '}
                      Runs on the server — you do not need to keep this page open.
                    </p>
                  </>
                )}
              </div>
            )}

            <div className="flex items-center justify-end mt-2">
              <button
                onClick={handlePost}
                disabled={posting || uploading || (!composeText.trim() && !mediaUrl.trim()) || (when === 'later' && !scheduledAt)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:bg-gray-300 transition"
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : when === 'later' ? <Calendar className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                {when === 'later' ? 'Schedule Status' : 'Post Status'}
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
