'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface BunnyVideoPlayerProps {
  bunnyVideoId: string;
  title: string;
  onComplete?: () => void;
  onProgress?: (progress: number) => void;
}

export default function BunnyVideoPlayer({
  bunnyVideoId,
  title,
  onComplete,
  onProgress,
}: BunnyVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [lastSeekTime, setLastSeekTime] = useState(0);
  const [showSeekWarning, setShowSeekWarning] = useState(false);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    // Load Bunny Stream player
    if (!window.playerjs) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@bunnycdn/stream-player@1/dist/player.js';
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        initializePlayer();
      };
    } else {
      initializePlayer();
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy?.();
      }
    };
  }, [bunnyVideoId]);

  const initializePlayer = () => {
    if (!containerRef.current) return;

    try {
      playerRef.current = new (window as any).playerjs.Player(containerRef.current, {
        token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`, // This should be generated server-side
        videoId: bunnyVideoId,
        autoplay: false,
        controls: false, // Disable default controls to use custom ones
        poster: '',
        width: '100%',
        height: '100%',
      });

      // Custom event handlers
      playerRef.current.addEventListener('play', () => setIsPlaying(true));
      playerRef.current.addEventListener('pause', () => setIsPlaying(false));
      playerRef.current.addEventListener('ended', handleVideoComplete);
      playerRef.current.addEventListener('timeupdate', handleTimeUpdate);
      playerRef.current.addEventListener('durationchange', (e: any) => {
        setDuration(e.duration || 0);
      });

      // Prevent seeking
      playerRef.current.addEventListener('seeking', handleSeekAttempt);
      playerRef.current.addEventListener('seeked', handleSeekAttempt);

      // Prevent right-click download
      containerRef.current.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
      });

      // Prevent keyboard shortcuts for seeking
      containerRef.current.addEventListener('keydown', (e) => {
        const forbiddenKeys = ['ArrowLeft', 'ArrowRight', 'j', 'l', 'f', 'c', 'm', '>', '<'];
        if (forbiddenKeys.includes(e.key)) {
          e.preventDefault();
        }
      });
    } catch (error) {
      console.error('Error initializing Bunny player:', error);
    }
  };

  const handleSeekAttempt = () => {
    const now = Date.now();
    if (now - lastSeekTime < 500) return; // Prevent spam

    setLastSeekTime(now);
    setShowSeekWarning(true);
    setTimeout(() => setShowSeekWarning(false), 3000);

    // Reset to previous position
    if (playerRef.current && playerRef.current.currentTime !== currentTime) {
      playerRef.current.currentTime = currentTime;
    }
  };

  const handleTimeUpdate = () => {
    if (playerRef.current) {
      const time = playerRef.current.currentTime || 0;
      setCurrentTime(time);

      // Report progress
      if (duration > 0) {
        const progress = (time / duration) * 100;
        onProgress?.(progress);
      }

      // Check if video is almost complete (95%)
      if (duration > 0 && time / duration >= 0.95) {
        handleVideoComplete();
      }
    }
  };

  const handleVideoComplete = () => {
    setIsPlaying(false);
    onComplete?.();
  };

  const togglePlayPause = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pause?.();
      } else {
        playerRef.current.play?.();
      }
    }
  };

  const toggleMute = () => {
    if (playerRef.current) {
      setIsMuted(!isMuted);
      playerRef.current.muted = !isMuted;
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-black rounded-lg overflow-hidden border-2 border-green-500">
      {/* Video Container */}
      <div
        ref={containerRef}
        className="w-full aspect-video bg-black relative group"
        style={{ position: 'relative' }}
      >
        {/* Seek Warning */}
        {showSeekWarning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50 rounded">
            <div className="bg-red-600 text-white px-6 py-3 rounded-lg text-center">
              <p className="font-bold">Video Progress Cannot Be Skipped</p>
              <p className="text-sm mt-1">You must watch the entire video</p>
            </div>
          </div>
        )}

        {/* Custom Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {/* Progress Bar */}
          <div className="w-full mb-3 bg-gray-700 rounded-full h-1 cursor-not-allowed">
            <div
              className="bg-green-500 h-1 rounded-full"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Play/Pause */}
              <button
                onClick={togglePlayPause}
                className="p-2 hover:bg-white/20 rounded transition text-white"
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>

              {/* Volume */}
              <button
                onClick={toggleMute}
                className="p-2 hover:bg-white/20 rounded transition text-white"
              >
                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>

              {/* Time */}
              <span className="text-white text-sm font-medium">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* No Download, No Forward, No Speed Controls */}
            <div className="text-gray-400 text-xs">
              🔒 Restricted
            </div>
          </div>

          {/* Info */}
          <p className="text-white text-sm mt-2">{title}</p>
        </div>
      </div>

      {/* Warning Messages */}
      <div className="bg-gray-900 border-t border-green-500 p-4">
        <div className="flex items-start gap-3">
          <div className="text-yellow-400 text-sm font-bold">⚠️ Important:</div>
          <div className="text-gray-300 text-sm">
            <p>• Download disabled - Stream only</p>
            <p>• Cannot skip forward or backward</p>
            <p>• Must watch entire video to proceed</p>
            <p>• No sharing or external links</p>
          </div>
        </div>
      </div>
    </div>
  );
}
