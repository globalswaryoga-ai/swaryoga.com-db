'use client';

import { useEffect, useRef, useState } from 'react';
import { Maximize, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import { toggleFullscreenAndRotate, setupFullscreenRotateListener } from '@/lib/videoFullscreenRotate';

interface HLSVideoPlayerProps {
  src: string;
  autoPlay?: boolean;
  muted?: boolean;
  className?: string;
  isLiveStream?: boolean;
  offsetSeconds?: number;
  videoRef?: React.RefObject<HTMLVideoElement>;
  onError?: (error: string) => void;
  onLoadedMetadata?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onMinimizeMaximize?: (isMinimized: boolean) => void;
}

export default function HLSVideoPlayer({
  src,
  autoPlay = false,
  muted = false,
  className = 'w-full h-full',
  isLiveStream = false,
  offsetSeconds = 0,
  videoRef: externalVideoRef,
  onError,
  onLoadedMetadata,
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate,
  onMinimizeMaximize,
}: HLSVideoPlayerProps) {
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalVideoRef || internalVideoRef;
  const playerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const hlsRef = useRef<any>(null);
  const loadedSrcRef = useRef<string>('');
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Store all callbacks in refs so changing their references never triggers re-initialization
  const callbacksRef = useRef({
    onError,
    onLoadedMetadata,
    onPlay,
    onPause,
    onEnded,
    onTimeUpdate,
    onMinimizeMaximize,
  });

  useEffect(() => {
    callbacksRef.current = {
      onError,
      onLoadedMetadata,
      onPlay,
      onPause,
      onEnded,
      onTimeUpdate,
      onMinimizeMaximize,
    };
  });

  // Handle muted attribute dynamically without tearing down playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
  }, [muted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // CRITICAL: If this exact src is already loaded on this video element, DO NOT RE-INITIALIZE!
    // This stops the infinite re-render / on-off crackling loop when the parent component updates time.
    if (loadedSrcRef.current === src) {
      return;
    }
    loadedSrcRef.current = src;

    let seekPerformed = false;
    setError(null);
    setIsLoading(true);

    video.autoplay = autoPlay;
    video.muted = muted;
    video.playsInline = true;
    video.preload = 'auto';

    let destroyed = false;

    const setupHLS = async () => {
      try {
        const HLS = (await import('hls.js')).default;

        if (destroyed) return;

        // Clean up any existing HLS instance before loading new src
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }

        if (HLS.isSupported()) {
          const hls = new HLS({
            enableWorker: true,
            lowLatencyMode: isLiveStream,
            backBufferLength: isLiveStream ? 8 : 60,
            maxBufferLength: isLiveStream ? 15 : 60,
            maxMaxBufferLength: isLiveStream ? 30 : 120,
            maxBufferSize: 60 * 1000 * 1000,
            fragLoadingTimeOut: 20000,
            fragLoadingMaxRetry: 6,
            levelLoadingTimeOut: 15000,
            levelLoadingMaxRetry: 4,
            manifestLoadingTimeOut: 15000,
            manifestLoadingMaxRetry: 3,
            startLevel: -1, // Auto quality
          });

          hlsRef.current = hls;

          hls.on(HLS.Events.MANIFEST_PARSED, () => {
            if (destroyed) return;
            setIsLoading(false);

            if (offsetSeconds > 0 && !seekPerformed) {
              video.currentTime = offsetSeconds;
              seekPerformed = true;
            }

            if (autoPlay) {
              video.play().catch(() => {});
            }
          });

          hls.on(HLS.Events.ERROR, (_event: any, data: any) => {
            if (destroyed) return;
            if (data.fatal) {
              switch (data.type) {
                case HLS.ErrorTypes.NETWORK_ERROR:
                  console.warn('[HLS] Network error, recovering...');
                  hls.startLoad();
                  break;
                case HLS.ErrorTypes.MEDIA_ERROR:
                  console.warn('[HLS] Media error, recovering...');
                  hls.recoverMediaError();
                  break;
                default:
                  console.error('[HLS] Fatal unrecoverable error:', data);
                  setIsLoading(false);
                  setError('Video stream error. Click Retry to reload.');
                  callbacksRef.current.onError?.('Fatal stream error');
                  hls.destroy();
                  hlsRef.current = null;
                  break;
              }
            }
          });

          hls.loadSource(src);
          hls.attachMedia(video);
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS fallback (e.g. mobile Safari)
          video.src = src;

          const onMeta = () => {
            if (destroyed) return;
            setIsLoading(false);
            if (offsetSeconds > 0 && !seekPerformed) {
              video.currentTime = offsetSeconds;
              seekPerformed = true;
            }
            if (autoPlay) {
              video.play().catch(() => {});
            }
          };

          video.addEventListener('loadedmetadata', onMeta, { once: true });
        } else {
          video.src = src;
          setIsLoading(false);
        }
      } catch (err: any) {
        if (!destroyed) {
          console.error('[HLS] setup error:', err);
          setIsLoading(false);
          video.src = src;
        }
      }
    };

    setupHLS();

    return () => {
      destroyed = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      loadedSrcRef.current = '';
    };
  }, [src, isLiveStream]); // ONLY depends on src and isLiveStream

  useEffect(() => {
    return setupFullscreenRotateListener();
  }, []);

  // Show/hide controls overlay on mouse movement
  useEffect(() => {
    const handleMouseMove = () => {
      if (!isMinimized) {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
      }
    };

    const container = playerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      return () => {
        container.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [isMinimized]);

  const toggleMinimize = () => {
    const newState = !isMinimized;
    setIsMinimized(newState);
    callbacksRef.current.onMinimizeMaximize?.(newState);
    setShowControls(true);
  };

  const handleLoadedMetadata = () => {
    setIsLoading(false);
    callbacksRef.current.onLoadedMetadata?.();
  };

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    loadedSrcRef.current = '';
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (videoRef.current) {
      const v = videoRef.current;
      v.load();
      v.play().catch(() => {});
    }
  };

  if (error) {
    return (
      <div className={`${className} flex flex-col items-center justify-center bg-black p-6 text-center`}>
        <div className="max-w-md bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-2xl">
          <p className="text-red-400 font-semibold mb-2">Video Stream Notice</p>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Retry Video
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={playerRef}
      className={`relative bg-black overflow-hidden flex items-center justify-center ${
        isMinimized ? 'w-64 h-36 rounded-lg shadow-2xl' : className
      }`}
    >
      {/* Live indicator */}
      {isLiveStream && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-red-600/80 px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-xs font-bold text-white">LIVE</span>
        </div>
      )}

      {/* Quick Rotate / Fullscreen Button */}
      <button
        type="button"
        onClick={() => toggleFullscreenAndRotate(playerRef.current || videoRef.current)}
        className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-sm transition-all active:scale-95 cursor-pointer shadow-md"
        title="Rotate Full Screen"
      >
        <Maximize className="w-4 h-4" />
      </button>

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 pointer-events-none">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Minimize/Maximize button (for live/floating mode) */}
      {isLiveStream && (
        <div
          className={`absolute z-20 transition-opacity duration-300 ${
            showControls || isMinimized ? 'opacity-100' : 'opacity-0 hover:opacity-100'
          } ${isMinimized ? 'top-2 right-2' : 'bottom-4 right-4'}`}
        >
          <button
            onClick={toggleMinimize}
            className="bg-white/20 hover:bg-white/40 backdrop-blur-sm p-2 rounded-full transition-colors cursor-pointer"
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4 text-white" />
            ) : (
              <Minimize2 className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
      )}

      {/* Video element with native controls */}
      <video
        ref={videoRef}
        data-hls-player
        className="w-full h-full bg-black block"
        controls
        playsInline
        crossOrigin="anonymous"
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => {
          setIsLoading(false);
          callbacksRef.current.onPlay?.();
        }}
        onPause={() => callbacksRef.current.onPause?.()}
        onEnded={() => callbacksRef.current.onEnded?.()}
        onTimeUpdate={(e) => {
          const ct = e.currentTarget.currentTime;
          const dur = e.currentTarget.duration;
          callbacksRef.current.onTimeUpdate?.(ct, dur);
        }}
        onError={(e) => {
          const errorMsg = e.currentTarget.error?.message || 'Video stream error';
          console.warn('[HLSVideoPlayer] video error:', errorMsg);
        }}
        style={{
          width: '100%',
          height: '100%',
          maxHeight: '82vh',
          backgroundColor: '#000',
        }}
      />
    </div>
  );
}
