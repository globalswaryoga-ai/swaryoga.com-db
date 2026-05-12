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
  autoPlay = false,
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

  // Enable video controls with proper styling
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Video player styling */
      video {
        display: block !important;
        width: 100% !important;
        height: 100% !important;
        background: #000 !important;
      }

      /* Show and style WebKit media controls */
      video::-webkit-media-controls {
        display: flex !important;
        visibility: visible !important;
        pointer-events: auto !important;
      }

      video::-webkit-media-controls-panel {
        display: flex !important;
        visibility: visible !important;
      }

      /* Show all control buttons */
      video::-webkit-media-controls-play-button { display: block !important; }
      video::-webkit-media-controls-timeline-container { display: block !important; }
      video::-webkit-media-controls-current-time-display { display: inline !important; }
      video::-webkit-media-controls-time-remaining-display { display: inline !important; }
      video::-webkit-media-controls-timeline { display: block !important; }
      video::-webkit-media-controls-volume-slider-container { display: flex !important; }
      video::-webkit-media-controls-volume-slider { display: block !important; }
      video::-webkit-media-controls-mute-button { display: block !important; }
      video::-webkit-media-controls-fullscreen-button { display: block !important; }
      video::-webkit-media-controls-download-button { display: block !important; }
      video::-webkit-media-controls-seek-backward-button { display: block !important; }
      video::-webkit-media-controls-seek-forward-button { display: block !important; }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  // Initialize HLS.js with permanent unmute enforcement
  useEffect(() => {
    if (!videoRef.current || !src) return;

    const video = videoRef.current;
    let seekPerformed = false;

    // Permanent unmute enforcement (critical for free videos)
    video.muted = false;
    video.volume = 1;
    video.autoplay = autoPlay;
    video.playsInline = true;
    video.preload = 'auto';

    // Prevent user from controlling playback
    const handleRateChange = () => { if (video.playbackRate !== 1) video.playbackRate = 1; };
    const handleCanPlay = () => {
      if (video.paused && autoPlay) {
        video.play().catch((err) => {
          if (err.name !== 'NotAllowedError') console.error('Play error:', err);
        });
      }
    };
    const handleVolumeChange = () => { if (video.muted || video.volume !== 1) { video.muted = false; video.volume = 1; } };
    const handlePause = () => {
      if (autoPlay) {
        video.play().catch((err) => {
          if (err.name !== 'NotAllowedError') console.error('Play error:', err);
        });
      }
    };

    video.addEventListener('ratechange', handleRateChange);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('pause', handlePause);

    const setupHLS = async () => {
      try {
        // Only attempt autoplay if muted (browser policy: autoplay with sound requires user interaction)
        if (autoPlay && !video.muted) {
          video.muted = true;
          console.warn('Autoplay requires muted video - enforcing muted mode for browser autoplay policy');
        }

        const HLS = (await import('hls.js')).default;

        if (!HLS.isSupported()) {
          video.src = src;
          return;
        }

        const hls = new HLS({
          enableWorker: true,
          lowLatencyMode: isLiveStream,
          backBufferLength: isLiveStream ? 8 : 30,
          maxBufferLength: isLiveStream ? 15 : 30,
          maxBufferSize: 60 * 1000 * 1000,
          maxMaxBufferLength: isLiveStream ? 30 : 60,
          fragLoadingTimeOut: 20000,
          fragLoadingMaxRetry: 6,
          levelLoadingTimeOut: 10000,
          levelLoadingMaxRetry: 4,
          manifestLoadingTimeOut: 10000,
          manifestLoadingMaxRetry: 1,
        });

        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(HLS.Events.MANIFEST_PARSED, () => {
          console.log(`✅ HLS ${isLiveStream ? 'live stream' : 'stream'} ready`);

          // Synchronized playback: seek to the current session time
          if (offsetSeconds && offsetSeconds > 0 && !seekPerformed) {
            console.log(`🎬 Seeking to ${offsetSeconds}s for synchronized playback`);
            video.currentTime = offsetSeconds;
            seekPerformed = true;
          }

          if (autoPlay) {
            video.play().catch(err => {
              console.warn('Autoplay prevented:', err.message);
            });
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
      } catch (err: any) {
        video.src = src;
      }
    };

    setupHLS();

    return () => {
      video.removeEventListener('ratechange', handleRateChange);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('pause', handlePause);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, autoPlay, isLiveStream, offsetSeconds, onError]);

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
        controls
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
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          backgroundColor: '#000',
        } as React.CSSProperties}
      />

    </div>
  );
}
