'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Loader2, RefreshCw, ShieldCheck, Video, Key, UploadCloud, X, CheckCircle2, AlertTriangle, Play } from 'lucide-react';

type VideoRow = {
  videoId: string;
  videoUrl: string;
  title: string;
  durationSeconds: number | null;
  availability: string;
  language: string;
  uploadDate: string;
  screeningStatus: string;
  transcriptLanguage: string;
  topicMatch: string;
  errorMessage: string | null;
};

function formatDuration(seconds: number | null) {
  if (seconds == null) return 'Duration not listed';
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function YouTubeChannelIntake({ token }: { token: string | null }) {
  const [inventory, setInventory] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [usesAuthorizedCookies, setUsesAuthorizedCookies] = useState(false);
  const [queueing, setQueueing] = useState(false);
  const [retryingVideoId, setRetryingVideoId] = useState('');
  const [requeueingFailed, setRequeueingFailed] = useState(false);

  // Cookies Modal State
  const [cookiesModalOpen, setCookiesModalOpen] = useState(false);
  const [cookieInput, setCookieInput] = useState('');
  const [savingCookies, setSavingCookies] = useState(false);
  const [cookiesMessage, setCookiesMessage] = useState('');

  const loadInventory = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/crm/mohan-rag/youtube-channel', {
        headers: { Authorization: ['Bearer', token].join(' ') },
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load channel inventory.');
      setInventory(Array.isArray(data.inventory) ? data.inventory : []);
      setUsesAuthorizedCookies(Boolean(data.usesAuthorizedCookies));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load channel inventory.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void loadInventory(); }, [loadInventory]);

  const discover = async () => {
    if (!token) return;
    setDiscovering(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/crm/mohan-rag/youtube-channel', {
        method: 'POST',
        headers: { Authorization: ['Bearer', token].join(' ') },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Channel discovery failed.');
      setInventory(Array.isArray(data.inventory) ? data.inventory : []);
      setNotice(data.message || 'Channel discovery completed.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Channel discovery failed.');
    } finally {
      setDiscovering(false);
    }
  };

  const queueableVideos = inventory.filter(video =>
    video.screeningStatus === 'not_screened'
      && (video.availability !== 'subscriber_only' || usesAuthorizedCookies)
  ).slice(0, 500);

  const failedVideos = inventory.filter(video => video.screeningStatus === 'ingestion_failed');

  const queueForScreening = async () => {
    if (!token || !queueableVideos.length) return;
    const confirmed = window.confirm(
      `Queue ${queueableVideos.length} video(s) for download, transcription, and topic screening? Transcripts will remain drafts for your review.`
    );
    if (!confirmed) return;
    setQueueing(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/crm/mohan-rag/youtube-channel', {
        method: 'POST',
        headers: {
          Authorization: ['Bearer', token].join(' '),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'queue', videoIds: queueableVideos.map(video => video.videoId) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not queue discovered videos.');
      setNotice(data.message || 'Videos queued for transcript screening.');
      await loadInventory();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not queue discovered videos.');
    } finally {
      setQueueing(false);
    }
  };

  const handleRequeueFailed = async () => {
    if (!token || !failedVideos.length || requeueingFailed) return;
    setRequeueingFailed(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/crm/mohan-rag/youtube-channel', {
        method: 'POST',
        headers: {
          Authorization: ['Bearer', token].join(' '),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'requeue_failed' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not requeue failed videos.');
      setNotice(data.message || 'Failed videos requeued successfully.');
      await loadInventory();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to requeue videos.');
    } finally {
      setRequeueingFailed(false);
    }
  };

  const retryScreening = async (videoId: string) => {
    if (!token || retryingVideoId) return;
    setRetryingVideoId(videoId);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/crm/mohan-rag/youtube-channel', {
        method: 'POST',
        headers: {
          Authorization: ['Bearer', token].join(' '),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'retry_screening', videoId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Topic screening retry failed.');
      setNotice(data.message || 'Topic screening completed.');
      await loadInventory();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Topic screening retry failed.');
    } finally {
      setRetryingVideoId('');
    }
  };

  const handleSaveCookies = async () => {
    if (!token || !cookieInput.trim()) return;
    setSavingCookies(true);
    setCookiesMessage('');
    try {
      const res = await fetch('/api/admin/crm/mohan-rag/youtube-cookies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cookies: cookieInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save cookies');
      setCookiesMessage('✅ YouTube cookies saved successfully! Authorized session is now active.');
      setUsesAuthorizedCookies(true);
      setTimeout(() => {
        setCookiesModalOpen(false);
        loadInventory();
      }, 1500);
    } catch (err: any) {
      setCookiesMessage(`❌ Error: ${err.message || 'Could not save cookies'}`);
    } finally {
      setSavingCookies(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      if (content) setCookieInput(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-5">
      {/* Session Auth & Cookies Status Card */}
      <div className={`rounded-2xl border p-4 shadow-xs transition ${
        usesAuthorizedCookies
          ? 'border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50 to-white'
          : 'border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50 to-white'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold shadow-xs ${
              usesAuthorizedCookies ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
            }`}>
              {usesAuthorizedCookies ? <ShieldCheck className="h-5 w-5" /> : <Key className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">YouTube Authorized Channel Session</h4>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  usesAuthorizedCookies
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {usesAuthorizedCookies ? '✓ Authorized Session Active' : '⚠️ Public Access Only (No Cookies)'}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-600">
                {usesAuthorizedCookies
                  ? 'The worker is authorized to view and transcribe public, unlisted, and private videos permitted for your YouTube channel.'
                  : 'Without YouTube cookies, private/unlisted videos fail with "Sign in to confirm you’re not a bot". Export cookies.txt from Chrome and activate here.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCookiesModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition active:scale-95 cursor-pointer"
            >
              <Key className="h-3.5 w-3.5 text-amber-400" />
              <span>{usesAuthorizedCookies ? 'Update YouTube Cookies' : '🔑 Configure YouTube Cookies.txt'}</span>
            </button>
            {failedVideos.length > 0 && (
              <button
                type="button"
                onClick={handleRequeueFailed}
                disabled={requeueingFailed}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:from-orange-500 hover:to-amber-600 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {requeueingFailed ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                <span>Retry All {failedVideos.length} Failed Videos</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-emerald-50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-800">Automatic channel intake</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">Discover Swar Yoga YouTube videos</h3>
            <a href="https://www.youtube.com/@Swar-Yoga/videos" target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-sky-800 underline">
              youtube.com/@Swar-Yoga/videos <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Scan the channel automatically. The inventory is stored in Bunny Database and deduplicated by YouTube video ID. No video files are downloaded in this step.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={discover} disabled={discovering || loading || queueing || !token} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
              {discovering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
              {discovering ? 'Scanning channel…' : 'Discover channel videos'}
            </button>
            <button type="button" onClick={() => void queueForScreening()} disabled={discovering || loading || queueing || !token || !queueableVideos.length} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
              {queueing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
              {queueing ? 'Queueing…' : `Queue ${queueableVideos.length} for screening`}
            </button>
          </div>
        </div>
      </section>

      {(notice || error) && <div role={error ? 'alert' : 'status'} className={`rounded-lg border px-4 py-3 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>{error || notice}</div>}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Discovered video inventory</h4>
            <p className="text-xs text-slate-500">{inventory.length} videos saved · {failedVideos.length} currently failed</p>
          </div>
          <div className="flex items-center gap-2">
            {failedVideos.length > 0 && (
              <button
                type="button"
                onClick={handleRequeueFailed}
                disabled={requeueingFailed}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {requeueingFailed ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Requeue {failedVideos.length} Failed
              </button>
            )}
            <button type="button" onClick={() => void loadInventory()} disabled={loading || !token} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh
            </button>
          </div>
        </div>
        {!inventory.length ? <p className="p-6 text-sm text-slate-500">{loading ? 'Loading inventory…' : 'No channel inventory yet. Start discovery to list videos accessible to the configured YouTube session.'}</p> : (
          <div className="max-h-[65vh] overflow-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-600"><tr><th className="px-3 py-2">Video</th><th className="px-3 py-2">Length</th><th className="px-3 py-2">Availability</th><th className="px-3 py-2">yt-dlp language</th><th className="px-3 py-2">Transcript/topic screen</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{inventory.map(video => (
                <tr key={video.videoId} className="align-top">
                  <td className="max-w-[440px] px-3 py-3"><a href={video.videoUrl} target="_blank" rel="noreferrer" className="font-medium text-sky-800 hover:underline">{video.title}</a><div className="mt-1 font-mono text-[10px] text-slate-400">{video.videoId}{video.uploadDate ? ` · ${video.uploadDate}` : ''}</div></td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatDuration(video.durationSeconds)}</td>
                  <td className="px-3 py-3 text-slate-600">{video.availability}</td>
                  <td className="px-3 py-3 text-slate-600">{video.language || 'Not reported'}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-1 font-semibold ${
                      video.screeningStatus === 'completed' || video.screeningStatus === 'transcript_ready'
                        ? 'bg-emerald-100 text-emerald-800'
                        : video.screeningStatus === 'ingestion_failed'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-50 text-amber-800'
                    }`}>{video.screeningStatus}</span>
                    {video.transcriptLanguage && <div className="mt-1 text-slate-600">Language: {video.transcriptLanguage}</div>}
                    {video.topicMatch && <div className="mt-1 text-slate-600">Topic: {video.topicMatch}</div>}
                    {video.errorMessage && (
                      <div className="mt-1 max-w-xs text-[11px] leading-tight text-rose-700 bg-rose-50/80 p-1.5 rounded border border-rose-200">
                        {video.errorMessage.length > 200 ? `${video.errorMessage.slice(0, 200)}...` : video.errorMessage}
                      </div>
                    )}
                    {video.screeningStatus === 'screening_failed' && (
                      <button type="button" onClick={() => void retryScreening(video.videoId)} disabled={Boolean(retryingVideoId) || !token} className="mt-2 inline-flex items-center gap-1 rounded border border-rose-300 px-2 py-1 font-medium text-rose-800 disabled:opacity-50">
                        {retryingVideoId === video.videoId && <Loader2 className="h-3 w-3 animate-spin" />}
                        {retryingVideoId === video.videoId ? 'Retrying…' : 'Retry topic screen'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      {/* Cookies Upload / Config Modal */}
      {cookiesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">Configure YouTube Cookies.txt</h3>
              </div>
              <button
                type="button"
                onClick={() => setCookiesModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-950 space-y-2">
              <p className="font-bold">How to export YouTube cookies in 1 minute:</p>
              <ol className="list-decimal list-inside space-y-1 text-amber-900">
                <li>Install the free Chrome extension: <strong>"Get cookies.txt LOCALLY"</strong>.</li>
                <li>Go to <strong>youtube.com</strong> in Chrome (ensure you are logged in to Swar Yoga channel).</li>
                <li>Click the extension icon and click <strong>"Export"</strong> to download <code className="bg-amber-100 px-1 py-0.5 rounded">youtube.com_cookies.txt</code>.</li>
                <li>Upload that file below or paste its text content.</li>
              </ol>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Paste Netscape Cookies Text OR Select File:</label>
                <input
                  type="file"
                  accept=".txt"
                  onChange={handleFileUpload}
                  className="text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                />
              </div>
              <textarea
                rows={8}
                value={cookieInput}
                onChange={e => setCookieInput(e.target.value)}
                placeholder="# Netscape HTTP Cookie File&#10;# https://curl.se/docs/http-cookies.html&#10;.youtube.com&#9;TRUE&#9;/&#9;TRUE&#9;1789999999&#9;SID&#9;..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] leading-relaxed text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
              />
            </div>

            {cookiesMessage && (
              <p className={`p-2.5 rounded-xl text-xs font-bold ${
                cookiesMessage.startsWith('✅') ? 'bg-emerald-50 text-emerald-900 border border-emerald-300' : 'bg-rose-50 text-rose-900 border border-rose-300'
              }`}>
                {cookiesMessage}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCookiesModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingCookies || !cookieInput.trim()}
                onClick={handleSaveCookies}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md disabled:opacity-50 cursor-pointer"
              >
                {savingCookies ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                <span>{savingCookies ? 'Saving & Activating...' : 'Save & Authorize Session'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
