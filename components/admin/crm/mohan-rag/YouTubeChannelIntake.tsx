'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Loader2, RefreshCw, ShieldCheck, Video } from 'lucide-react';

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

  const queueForScreening = async () => {
    if (!token || !queueableVideos.length) return;
    const confirmed = window.confirm(
      `Queue ${queueableVideos.length} video(s) for download, transcription, and topic screening? This may use paid transcription and AI services. Transcripts will remain drafts for your review.`
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

  return <div className="space-y-5">
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
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-white p-3 text-xs leading-5 text-slate-700">
          <div className="flex items-center gap-2 font-semibold text-emerald-900"><ShieldCheck className="h-4 w-4" /> Authorized access only</div>
          <p className="mt-1">Public videos are listed when YouTube exposes them. If YOUTUBE_COOKIES_FILE is configured, yt-dlp uses that authorized session for videos it is permitted to view, including eligible member videos. It does not bypass membership or private-video access controls.</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-white p-3 text-xs leading-5 text-slate-700">
          <div className="font-semibold text-amber-900">Unlisted coverage limit</div>
          <p className="mt-1">Unlisted videos normally do not appear in a channel listing. They must be present in a playlist/inventory the authorized account can access; this scan cannot promise every unlisted upload was discovered.</p>
        </div>
      </div>
      {usesAuthorizedCookies !== null && <p className="mt-3 text-xs text-slate-600">Discovery used {usesAuthorizedCookies ? 'the server-configured authorized YouTube session.' : 'public channel access only; no YouTube cookies are configured.'}</p>}
    </section>

    {(notice || error) && <div role={error ? 'alert' : 'status'} className={`rounded-lg border px-4 py-3 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>{error || notice}</div>}

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div><h4 className="text-sm font-semibold text-slate-900">Discovered video inventory</h4><p className="text-xs text-slate-500">{inventory.length} videos saved · duplicate video IDs are merged</p></div>
        <button type="button" onClick={() => void loadInventory()} disabled={loading || !token} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh
        </button>
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
                <td className="px-3 py-3"><span className="rounded-full bg-amber-50 px-2 py-1 text-amber-800">{video.screeningStatus}</span>{video.transcriptLanguage && <div className="mt-1 text-slate-600">Language: {video.transcriptLanguage}</div>}{video.topicMatch && <div className="mt-1 text-slate-600">Topic: {video.topicMatch}</div>}{video.errorMessage && <div className="mt-1 max-w-xs text-rose-700">{video.errorMessage}</div>}{video.screeningStatus === 'screening_failed' && <button type="button" onClick={() => void retryScreening(video.videoId)} disabled={Boolean(retryingVideoId) || !token} className="mt-2 inline-flex items-center gap-1 rounded border border-rose-300 px-2 py-1 font-medium text-rose-800 disabled:opacity-50">{retryingVideoId === video.videoId && <Loader2 className="h-3 w-3 animate-spin" />}{retryingVideoId === video.videoId ? 'Retrying…' : 'Retry topic screen'}</button>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <p className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
        Queued videos are downloaded only by the existing authorized worker. It saves transcript drafts in the general library, detects transcript language, and screens the topic for administrator review. It does not auto-approve, select DNA moments, cut clips, or train a clone. Member-only rows require a configured authorized YouTube session.
      </p>
    </section>
  </div>;
}
