'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react';

interface HLSVideoPlayerProps {
  src: string;
  autoPlay?: boolean;
  muted?: boolean;
  className?: string;
  isLiveStream?: boolean;
  offsetSeconds?: number; // For synchronized playback - seek to this position
  videoRef?: React.RefObject<HTMLVideoElement>;
  onError?: (error: string) => void;
  onLoadedMetadata?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onMinimizeMaximize?: (isMinimized: boolean) => void;
}

export default function HLSVideoPlayer({
  src,
  autoPlay = true,
  muted = true,
  className = 'w-full h-full',
  isLiveStream = false,
  offsetSeconds = 0,
  videoRef: externalVideoRef,
  onError,
  onLoadedMetadata,
  onPlay,
  onPause,
  onMinimizeMaximize,
}: HLSVideoPlayerProps) {
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalVideoRef || internalVideoRef;
  const playerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const hlsRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hide all video controls with aggressive CSS
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* === ABSOLUTE VIDEO CONTROL HIDING === */
      video {
        display: block !important;
        width: 100% !important;
        height: 100% !important;
        outline: none !important;
        border: none !important;
        background: #000 !important;
        cursor: none !important;
      }

      /* WebKit - Hide ALL media controls */
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

      /* Firefox - Hide ALL controls */
      video::-moz-media-controls { display: none !important; visibility: hidden !important; }
      video::-moz-media-controls-panel { display: none !important; }
      video::-moz-media-controls-play-button { display: none !important; }
      video::-moz-media-controls-timeline-container { display: none !important; }
      video::-moz-media-controls-timeline { display: none !important; }
      video::-moz-media-controls-volume-slider-container { display: none !important; }
      video::-moz-media-controls-volume-slider { display: none !important; }
      video::-moz-media-controls-mute-button { display: none !important; }
      video::-moz-media-controls-fullscreen-button { display: none !important; }

      /* No user select */
      video { -webkit-user-select: none; user-select: none; }
    `;
    document.head.appendChild(style);

    // Continuous enforcement
    const enforceNoControls = () => {
      const videos = document.querySelectorAll('video[data-hls-player]');
      videos.forEach((video: any) => {
        video.removeAttribute('controls');
        video.removeAttribute('controlsList');
        video.style.outline = 'none';
        video.style.border = 'none';
        video.style.display = 'block';
        video.style.cursor = 'none';
      });
    };

    enforceNoControls();
    const observer = new MutationObserver(enforceNoControls);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['controls', 'controlsList'] });
    const interval = setInterval(enforceNoControls, 300);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  // Initialize HLS.js for live streaming
  useEffect(() => {
    if (!videoRef.current || !src) return;

    const setupHLS = async () => {
      try {
        const HLS = (await import('hls.js')).default;

        if (!HLS.isSupported()) {
          if (videoRef.current) {
            videoRef.current.src = src;
          }
          return;
        }

        const hls = new HLS({
          debug: false,
          enableWorker: true,
          lowLatencyMode: isLiveStream,
          autoStartLoad: true,
          liveBackBufferLength: isLiveStream ? 8 : undefined,
          maxBufferLength: isLiveStream ? 15 : 30,
          maxMaxBufferLength: isLiveStream ? 30 : 60,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 0.5,
        });

        hlsRef.current = hls;
        hls.attachMedia(videoRef.current);

        hls.on(HLS.Events.MANIFEST_PARSED, () => {
          console.log(`✅ HLS ${isLiveStream ? 'live stream' : 'stream'} ready`);

          // Synchronized playback: seek to the current session time
          if (offsetSeconds && offsetSeconds > 0 && videoRef.current) {
            console.log(`🎬 Seeking to ${offsetSeconds}s for synchronized playback`);
            videoRef.current.currentTime = offsetSeconds;
          }

          if (autoPlay && videoRef.current) {
            setTimeout(() => {
              videoRef.current?.play().catch(err => {
                console.warn('Autoplay prevented (may need user interaction):', err.message);
              });
            }, 100);
          }
        });

        hls.on(HLS.Events.ERROR, (event, data) => {
          if (data.fatal) {
            let errorMsg = `Stream error: ${data.type}`;
            if (data.type === HLS.ErrorTypes.NETWORK_ERROR) {
              errorMsg = 'Network error';
            } else if (data.type === HLS.ErrorTypes.MEDIA_ERROR) {
              errorMsg = 'Media error';
            }
            setError(errorMsg);
            onError?.(errorMsg);
          }
        });

        hls.loadSource(src);
      } catch (err: any) {
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
  }, [src, autoPlay, isLiveStream, onError]);

  // Show/hide controls on mouse movement
  useEffect(() => {
    const handleMouseMove = () => {
      if (!isMinimized) {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
      }
    };

    if (playerRef.current) {
      playerRef.current.addEventListener('mousemove', handleMouseMove);
      return () => {
        playerRef.current?.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [isMinimized]);

  const toggleMinimize = () => {
    const newState = !isMinimized;
    setIsMinimized(newState);
    onMinimizeMaximize?.(newState);
    setShowControls(true);
  };

  const handleLoadedMetadata = () => {
    console.log('Video loaded');
    onLoadedMetadata?.();
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLVideoElement>) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-black`}>
        <div className="text-center text-red-400">
          <p className="font-semibold mb-2">Stream Error</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={playerRef}
      className={`relative bg-black overflow-hidden ${isMinimized ? 'w-64 h-36 rounded-lg shadow-2xl' : className}`}
    >
      {/* Live indicator */}
      {isLiveStream && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-red-600/80 px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-xs font-bold text-white">LIVE</span>
        </div>
      )}

      {/* Minimize/Maximize button */}
      <div
        className={`absolute z-20 transition-opacity duration-300 ${
          showControls || isMinimized ? 'opacity-100' : 'opacity-0 hover:opacity-100'
        } ${isMinimized ? 'top-2 right-2' : 'bottom-4 right-4'}`}
      >
        <button
          onClick={toggleMinimize}
          className="bg-white/20 hover:bg-white/40 backdrop-blur-sm p-2 rounded-full transition-colors"
          title={isMinimized ? 'Maximize' : 'Minimize'}
        >
          {isMinimized ? (
            <Maximize2 className="w-4 h-4 text-white" />
          ) : (
            <Minimize2 className="w-4 h-4 text-white" />
          )}
        </button>
      </div>

      {/* Video element */}
      <video
        ref={videoRef}
        data-hls-player
        className="w-full h-full bg-black"
        autoPlay={autoPlay}
        muted={muted}
        playsInline
        crossOrigin="anonymous"
        onContextMenu={handleContextMenu}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => onPlay?.()}
        onPause={() => onPause?.()}
        onError={(e) => {
          const errorMsg = (e.currentTarget.error?.message || 'Video error');
          setError(errorMsg);
          onError?.(errorMsg);
        }}
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
    </div>
  );
}
