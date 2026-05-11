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
}

export default function VideoPlayer({
  videoUrl,
  videoId,
  videoSource,
  youtubeVideoId,
  bunnyVideoId,
  bunnyLibraryId,
  title,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState('');

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

  // Bunny embed player URL (autoplay disabled - browsers require user interaction)
  const bunnyEmbedUrl = bunnyVideoId && bunnyLibraryId
    ? `https://iframe.mediadelivery.net/embed/${bunnyLibraryId}/${bunnyVideoId}?preload=true&responsive=true`
    : null;

  // YouTube proxy embed
  const youtubeEmbedUrl = videoSource === 'youtube' && videoId
    ? `/api/community/videos/embed?v=${videoId}&token=${typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''}`
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
      {mode === 'youtube' && youtubeEmbedUrl && (
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
              controlsList="nodownload noremoteplayback"
              disablePictureInPicture
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
    </div>
  );
}
