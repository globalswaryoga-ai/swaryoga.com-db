'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';

export default function OBSPlayerPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [status, setStatus] = useState<'waiting' | 'countdown' | 'live' | 'ended'>('waiting');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Convert Bunny player URL to HLS stream URL
  const toHlsUrl = (url: string): string => {
    const match = url.match(/mediadelivery\.net\/play\/(\d+)\/([a-f0-9-]+)/i);
    if (match) return `https://vz-${match[1]}.b-cdn.net/${match[2]}/playlist.m3u8`;
    return url;
  };

  const setupHLS = useCallback(async (src: string) => {
    const video = videoRef.current;
    if (!video || !src) return;

    try {
      const HLS = (await import('hls.js')).default;

      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

      if (HLS.isSupported()) {
        const hls = new HLS({ debug: false, enableWorker: true, lowLatencyMode: true, autoStartLoad: true });
        hlsRef.current = hls;
        hls.attachMedia(video);
        hls.on(HLS.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });
        hls.on(HLS.Events.ERROR, (_, data) => {
          if (data.fatal) setError('Stream error: ' + data.type);
        });
        hls.loadSource(src);
      } else {
        video.src = src;
        video.play().catch(() => {});
      }
    } catch {
      if (videoRef.current) {
        videoRef.current.src = src;
        videoRef.current.play().catch(() => {});
      }
    }
  }, []);

  // Poll session state every 5 seconds
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/sadhana/live/${slug}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'obs-bot' }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const sessionStatus = data.session?.status || 'waiting';
      setStatus(sessionStatus);

      if (sessionStatus === 'live' && data.playableVideoUrl) {
        const hlsUrl = toHlsUrl(data.playableVideoUrl);
        if (hlsUrl !== videoUrl) {
          setVideoUrl(hlsUrl);
          setupHLS(hlsUrl);
        }
      }

      if (sessionStatus === 'countdown' && data.session?.nextSessionUtc) {
        const ms = new Date(data.session.nextSessionUtc).getTime() - Date.now();
        if (ms > 0) {
          const m = Math.floor(ms / 60000);
          const s = Math.floor((ms % 60000) / 1000);
          setCountdown(`${m}:${String(s).padStart(2, '0')}`);
        }
      }
    } catch {}
  }, [slug, videoUrl, setupHLS]);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => {
      clearInterval(interval);
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [fetchState]);

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#000', overflow: 'hidden', position: 'relative' }}>

      {/* Pure video — no controls, no UI */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        crossOrigin="anonymous"
        style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain', backgroundColor: '#000' }}
      />

      {/* Overlay blocks all mouse events so controls never appear */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 10 }} onContextMenu={(e) => e.preventDefault()} />

      {/* Waiting state */}
      {status === 'waiting' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
          <div style={{ textAlign: 'center', color: '#fff', fontFamily: 'sans-serif' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🧘</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>Session not started yet</div>
            <div style={{ fontSize: 14, color: '#888' }}>Waiting for live session...</div>
          </div>
        </div>
      )}

      {/* Countdown state */}
      {status === 'countdown' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
          <div style={{ textAlign: 'center', color: '#fff', fontFamily: 'sans-serif' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🔔</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>Starting in</div>
            <div style={{ fontSize: 72, fontWeight: 'bold', color: '#a78bfa' }}>{countdown}</div>
          </div>
        </div>
      )}

      {/* Ended state */}
      {status === 'ended' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
          <div style={{ textAlign: 'center', color: '#fff', fontFamily: 'sans-serif' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🙏</div>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>Session Complete</div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 30, backgroundColor: '#7f1d1d', color: '#fff', padding: '8px 16px', borderRadius: 8, fontFamily: 'sans-serif', fontSize: 13 }}>
          {error}
        </div>
      )}
    </div>
  );
}
