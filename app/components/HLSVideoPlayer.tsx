'use client';

import { useEffect, useRef, useState } from 'react';

interface HLSVideoPlayerProps {
  src: string;
  autoPlay?: boolean;
  muted?: boolean;
  className?: string;
  onError?: (error: string) => void;
  onLoadedMetadata?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
}

export default function HLSVideoPlayer({
  src,
  autoPlay = true,
  muted = true,
  className = 'w-full h-full',
  onError,
  onLoadedMetadata,
  onPlay,
  onPause,
}: HLSVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const hlsRef = useRef<any>(null);

  // Hide all video controls with aggressive CSS
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* === COMPREHENSIVE VIDEO CONTROL HIDING === */

      /* Base video element */
      video {
        display: block !important;
        width: 100% !important;
        height: 100% !important;
        outline: none !important;
        border: none !important;
        background: #000 !important;
        cursor: none !important;
      }

      /* WebKit browsers (Chrome, Safari, Edge) */
      video::-webkit-media-controls {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        pointer-events: none !important;
      }
      video::-webkit-media-controls-enclosure { display: none !important; }
      video::-webkit-media-controls-panel { display: none !important; }
      video::-webkit-media-controls-play-button { display: none !important; }
      video::-webkit-media-controls-timeline-container { display: none !important; }
      video::-webkit-media-controls-current-time-display { display: none !important; }
      video::-webkit-media-controls-time-remaining-display { display: none !important; }
      video::-webkit-media-controls-timeline { display: none !important; }
      video::-webkit-media-controls-volume-slider-container { display: none !important; }
      video::-webkit-media-controls-volume-slider { display: none !important; }
      video::-webkit-media-controls-mute-button { display: none !important; }
      video::-webkit-media-controls-fullscreen-button { display: none !important; }
      video::-webkit-media-controls-download-button { display: none !important; }
      video::-webkit-media-controls-toggle-closed-captions-button { display: none !important; }
      video::-webkit-media-controls-seek-backward-button { display: none !important; }
      video::-webkit-media-controls-seek-forward-button { display: none !important; }
      video::-webkit-media-controls-media-button { display: none !important; }

      /* Firefox */
      video::-moz-media-controls {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
      }
      video::-moz-media-controls-panel { display: none !important; }
      video::-moz-media-controls-play-button { display: none !important; }
      video::-moz-media-controls-timeline-container { display: none !important; }
      video::-moz-media-controls-timeline { display: none !important; }
      video::-moz-media-controls-volume-slider-container { display: none !important; }
      video::-moz-media-controls-volume-slider { display: none !important; }
      video::-moz-media-controls-mute-button { display: none !important; }
      video::-moz-media-controls-fullscreen-button { display: none !important; }

      /* Context menu */
      video { -webkit-user-select: none; user-select: none; }
    `;
    document.head.appendChild(style);

    // Enforce no controls via JavaScript
    const enforceNoControls = () => {
      const videos = document.querySelectorAll('video[data-hls-player]');
      videos.forEach((video: any) => {
        video.removeAttribute('controls');
        video.removeAttribute('controlsList');
        video.style.outline = 'none';
        video.style.border = 'none';
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.display = 'block';
        video.style.cursor = 'none';
      });
    };

    enforceNoControls();
    const observer = new MutationObserver(enforceNoControls);
    observer.observe(document.body, { childList: true, subtree: true });
    const interval = setInterval(enforceNoControls, 500);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  // Initialize HLS.js
  useEffect(() => {
    if (!videoRef.current || !src) return;

    const setupHLS = async () => {
      try {
        // Dynamic import for HLS.js
        const HLS = (await import('hls.js')).default;

        if (!HLS.isSupported()) {
          // Fallback to native streaming
          if (videoRef.current) {
            videoRef.current.src = src;
          }
          return;
        }

        const hls = new HLS({
          debug: false,
          enableWorker: true,
          lowLatencyMode: true,
          autoStartLoad: true,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 0.5,
          loader: HLS.DefaultConfig.loader,
        });

        hlsRef.current = hls;

        hls.attachMedia(videoRef.current);

        hls.on(HLS.Events.MANIFEST_PARSED, () => {
          console.log('✅ HLS manifest parsed, starting playback...');
          if (autoPlay && videoRef.current) {
            videoRef.current.play().catch(err => {
              console.warn('Autoplay prevented:', err);
            });
          }
        });

        hls.on(HLS.Events.ERROR, (event, data) => {
          if (data.fatal) {
            let errorMsg = `HLS fatal error: ${data.type}`;
            if (data.type === HLS.ErrorTypes.NETWORK_ERROR) {
              errorMsg = 'Network error loading stream';
            } else if (data.type === HLS.ErrorTypes.MEDIA_ERROR) {
              errorMsg = 'Media error playing stream';
            }
            setError(errorMsg);
            onError?.(errorMsg);
          }
        });

        hls.loadSource(src);
      } catch (err: any) {
        console.error('Failed to load HLS.js:', err);
        // Fallback to native video element
        if (videoRef.current) {
          videoRef.current.src = src;
        }
      }
    };

    setupHLS();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, autoPlay, onError]);

  // Handle video events
  const handleLoadedMetadata = () => {
    console.log('Video metadata loaded');
    onLoadedMetadata?.();
  };

  const handlePlay = () => {
    onPlay?.();
  };

  const handlePause = () => {
    onPause?.();
  };

  const handleError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    const errorMsg = video.error?.message || 'Unknown video error';
    setError(errorMsg);
    onError?.(errorMsg);
    console.error('Video error:', errorMsg);
  };

  // Prevent context menu and interactions
  const handleContextMenu = (e: React.MouseEvent<HTMLVideoElement>) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-black`}>
        <div className="text-center text-red-400">
          <p className="text-lg font-semibold mb-2">Unable to play video</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      data-hls-player
      className={className}
      autoPlay={autoPlay}
      muted={muted}
      playsInline
      crossOrigin="anonymous"
      onContextMenu={handleContextMenu}
      onLoadedMetadata={handleLoadedMetadata}
      onPlay={handlePlay}
      onPause={handlePause}
      onError={handleError}
      onKeyDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDoubleClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onMouseUp={(e) => {
        if (e.button === 2) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        cursor: 'none',
        backgroundColor: '#000',
      } as React.CSSProperties}
    />
  );
}
