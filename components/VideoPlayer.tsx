'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Maximize, Minimize } from 'lucide-react';

type PlayerMode = 'hls' | 'mp4' | 'bunny-embed' | 'youtube';

function detectMode(videoUrl: string, videoSource?: string, youtubeVideoId?: string, bunnyVideoId?: string, bunnyLibraryId?: string): PlayerMode {
  if (videoSource === 'youtube' || youtubeVideoId) return 'youtube';
  if (bunnyVideoId && bunnyLibraryId) return 'bunny-embed';
  if (videoUrl.includes('.m3u8')) return 'hls';
  if (videoUrl.includes('.mp4')) return 'mp4';
  if (videoUrl.includes('b-cdn.net') && !videoUrl.includes('.mp4')) return 'hls';
  return 'mp4';
}

interface VideoPlayerProps {
  videoUrl: string;
  videoId: string;
  videoSource?: string;
  youtubeVideoId?: string;
  bunnyVideoId?: string;
  bunnyLibraryId?: string;
  title?: string;
  communityId?: string;
}

export default function VideoPlayer({
  videoUrl,
  videoId,
  videoSource,
  youtubeVideoId,
  bunnyVideoId,
  bunnyLibraryId,
  title,
  communityId,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState('');
  const [videoToken, setVideoToken] = useState<string>('');
  const [watchLimitMsg, setWatchLimitMsg] = useState('');

  const mode = detectMode(videoUrl, videoSource, youtubeVideoId, bunnyVideoId, bunnyLibraryId);

  // HLS / MP4 player init
  useEffect(() => {
    if (mode !== 'hls' && mode !== 'mp4') return;
    if (!videoRef.current) return;

    const video = videoRef.current;
    setError('');

    if (mode === 'hls') {
      if (Hls.isSupported()) {
        const hls = new Hls({ debug: false, enableWorker: true });
        hls.loadSource(videoUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch((err) => {
            if (err.name !== 'NotAllowedError') console.error('Autoplay error:', err);
          });
        });
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) setError('Video failed to load. Please try again.');
        });
        return () => hls.destroy();
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = videoUrl;
        video.play().catch((err) => {
          if (err.name !== 'NotAllowedError') console.error('Play error:', err);
        });
      } else {
        setError('Your browser does not support HLS video.');
      }
    } else {
      video.src = videoUrl;
      video.play().catch((err) => {
        if (err.name !== 'NotAllowedError') console.error('Play error:', err);
      });
    }
  }, [videoUrl, mode]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Community watch-time tracking: per-session + yearly quota enforcement.
  // Only runs when this player is shown inside a community page (communityId set).
  useEffect(() => {
    if (!communityId || !videoId) return;

    let communityUserId: string | null = null;
    try {
      const raw = localStorage.getItem('community_user');
      const u = raw ? JSON.parse(raw) : null;
      communityUserId = u?.userId || u?._id || null;
    } catch {}
    if (!communityUserId) return;

    const userId = communityUserId;
    let watchLogId: string | null = null;
    let lastTick = Date.now();
    let cancelled = false;

    const startSession = async () => {
      try {
        const res = await fetch(`/api/community/${communityId}/videos/${videoId}/watch?userId=${encodeURIComponent(userId)}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          if (data.suspended) setWatchLimitMsg(data.reason || 'Video access suspended');
          return;
        }
        watchLogId = data.watchLogId;
        lastTick = Date.now();
      } catch {}
    };
    startSession();

    const sendHeartbeat = (finalCall = false) => {
      if (!watchLogId) return;
      const now = Date.now();
      const elapsed = Math.round((now - lastTick) / 1000);
      if (elapsed <= 0) return;

      let videoPosition: number | undefined;
      let totalSecondsVal: number | undefined;
      let completed = false;
      if ((mode === 'hls' || mode === 'mp4') && videoRef.current) {
        const v = videoRef.current;
        if (v.paused && !finalCall) return; // don't count paused time for native players
        videoPosition = Math.floor(v.currentTime);
        totalSecondsVal = Math.floor(v.duration) || undefined;
        if (totalSecondsVal && videoPosition / totalSecondsVal >= 0.9) completed = true;
      } else if (document.visibilityState !== 'visible' && !finalCall) {
        // iframe players (YouTube/Bunny): only count time while the tab is visible
        return;
      }

      lastTick = now;
      fetch(`/api/community/${communityId}/videos/${videoId}/watch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, watchLogId, watchedSeconds: elapsed, videoPosition, totalSeconds: totalSecondsVal, completed,
        }),
        keepalive: finalCall,
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.suspended) setWatchLimitMsg(data.reason || 'Video access suspended');
        })
        .catch(() => {});
    };

    const interval = setInterval(() => sendHeartbeat(false), 30000);
    const handlePageHide = () => sendHeartbeat(true);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      cancelled = true;
      clearInterval(interval);
      sendHeartbeat(true);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
    };
  }, [communityId, videoId, mode]);

  // Pause native playback once the watch-time limit is hit
  useEffect(() => {
    if (watchLimitMsg && videoRef.current) {
      videoRef.current.pause();
    }
  }, [watchLimitMsg]);

  // Fetch token for YouTube videos.
  // IMPORTANT: prefer the community tempToken (correct community identity).
  // Only fall back to the general site token for admins, since a leftover
  // e-commerce login token has the wrong identity for the community gate.
  useEffect(() => {
    if (videoSource !== 'youtube' || !communityId) return;

    const generalToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const run = async () => {
      // 1) Try to mint a community tempToken using the member's community identity
      try {
        const communityUserStr = typeof window !== 'undefined' ? localStorage.getItem('community_user') : null;
        const communityUser = communityUserStr ? JSON.parse(communityUserStr) : null;

        if (communityUser) {
          const res = await fetch('/api/community/auth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              communityId,
              userId: communityUser?.userId || communityUser?.id || communityUser?.mobile || '',
              userEmail: communityUser?.email || '',
              userName: communityUser?.name || communityUser?.firstName || '',
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.token) {
              setVideoToken(data.token);
              return;
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch community video token:', err);
      }

      // 2) Fall back to the general site token (covers admins, who bypass the gate)
      if (generalToken) setVideoToken(generalToken);
    };

    run();
  }, [videoSource, communityId]);

  // Bunny embed player URL (autoplay disabled - browsers require user interaction)
  const bunnyEmbedUrl = bunnyVideoId && bunnyLibraryId
    ? `https://iframe.mediadelivery.net/embed/${bunnyLibraryId}/${bunnyVideoId}?preload=true&responsive=true`
    : null;

  // YouTube proxy embed
  const youtubeEmbedUrl = videoSource === 'youtube' && videoId && videoToken
    ? `/api/community/videos/embed?v=${videoId}&token=${encodeURIComponent(videoToken)}`
    : null;

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Bunny iframe embed player */}
      {mode === 'bunny-embed' && bunnyEmbedUrl && (
        <iframe
          src={bunnyEmbedUrl}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          style={{ border: 'none' }}
        />
      )}

      {/* YouTube proxy */}
      {mode === 'youtube' && (
        <>
          {!youtubeEmbedUrl ? (
            <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
              Loading video...
            </div>
          ) : (
            <>
              <iframe
                src={youtubeEmbedUrl}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; encrypted-media; gyroscope; fullscreen"
                allowFullScreen
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-presentation"
                style={{ border: 'none' }}
              />
              <button
                onClick={toggleFullscreen}
                className="absolute bottom-2 right-2 z-20 w-9 h-8 flex items-center justify-center bg-black/80 hover:bg-white/20 text-white rounded transition"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </>
          )}
        </>
      )}

      {/* HLS / MP4 native player */}
      {(mode === 'hls' || mode === 'mp4') && (
        <>
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center text-white text-sm px-4 text-center">
              {error}
            </div>
          ) : (
            <video
              ref={videoRef}
              className="w-full h-full"
              controls
              playsInline
              onContextMenu={(e) => e.preventDefault()}
            />
          )}
          <button
            onClick={toggleFullscreen}
            className="absolute bottom-12 right-3 z-20 bg-black/70 hover:bg-white/20 text-white p-1.5 rounded transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </>
      )}

      {/* Watch-time limit reached overlay */}
      {watchLimitMsg && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/90 text-center px-6">
          <div>
            <p className="text-white font-bold text-base mb-1">⏱️ Watch limit reached</p>
            <p className="text-gray-300 text-sm">{watchLimitMsg}</p>
            <p className="text-gray-500 text-xs mt-2">Contact the community admin to restore access.</p>
          </div>
        </div>
      )}
    </div>
  );
}
