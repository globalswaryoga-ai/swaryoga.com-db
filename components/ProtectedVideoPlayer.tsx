'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useDeviceControl } from '@/hooks/useDeviceControl';
import SecurityWarningPopup from '@/components/SecurityWarningPopup';

interface ProtectedVideoPlayerProps {
  videoId: string;
  videoUrl: string;
  communityId?: string;
  title?: string;
  onError?: (error: string) => void;
}

export default function ProtectedVideoPlayer({
  videoId,
  videoUrl,
  communityId,
  title,
  onError,
}: ProtectedVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConcurrentError, setShowConcurrentError] = useState<string | null>(null);
  
  const {
    deviceInfo,
    violation,
    registerDevice,
    startStream,
    sendHeartbeat,
    endStream,
    clearViolation,
  } = useDeviceControl();

  // Register device on mount
  useEffect(() => {
    if (deviceInfo) {
      registerDevice();
    }
  }, [deviceInfo, registerDevice]);

  // Handle video play
  const handlePlay = useCallback(async () => {
    if (!deviceInfo) {
      setError('Device not initialized');
      return;
    }

    const result = await startStream(videoId, communityId);
    
    if (!result.allowed) {
      setShowConcurrentError(result.error || 'Video is playing on another device');
      if (videoRef.current) {
        videoRef.current.pause();
      }
      onError?.(result.error || 'Concurrent stream error');
      return;
    }

    setIsPlaying(true);
    setShowConcurrentError(null);

    // Start heartbeat
    heartbeatRef.current = setInterval(() => {
      sendHeartbeat();
    }, 30000); // Every 30 seconds
  }, [deviceInfo, videoId, communityId, startStream, sendHeartbeat, onError]);

  // Handle video pause/end
  const handleStop = useCallback(async () => {
    setIsPlaying(false);
    
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }

    await endStream();
  }, [endStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      if (isPlaying) {
        endStream();
      }
    };
  }, [isPlaying, endStream]);

  // Handle window close/navigate away
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isPlaying) {
        // Use navigator.sendBeacon for reliable delivery
        const token = localStorage.getItem('token');
        if (token && deviceInfo) {
          navigator.sendBeacon(
            '/api/devices/stream',
            JSON.stringify({
              action: 'end',
              deviceId: deviceInfo.deviceId,
              token,
            })
          );
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isPlaying, deviceInfo]);

  const handleChangePassword = () => {
    window.location.href = '/profile/security';
  };

  return (
    <div className="relative">
      {/* Video Player */}
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        className="w-full rounded-lg"
        onPlay={handlePlay}
        onPause={handleStop}
        onEnded={handleStop}
        onError={() => setError('Failed to load video')}
      >
        Your browser does not support the video tag.
      </video>

      {/* Title */}
      {title && (
        <h3 className="mt-2 font-medium text-gray-800">{title}</h3>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Concurrent Stream Error */}
      {showConcurrentError && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="text-3xl">🚫</span>
              <h2 className="text-lg font-bold text-gray-800">Stream Limit Reached</h2>
            </div>
            <p className="mb-4 text-gray-600">{showConcurrentError}</p>
            <p className="mb-4 text-sm text-gray-500">
              Only 1 device can stream video at a time. Please stop playback on the other
              device first.
            </p>
            <button
              onClick={() => setShowConcurrentError(null)}
              className="w-full rounded-lg bg-blue-500 py-2 text-white hover:bg-blue-600"
            >
              OK, Got It
            </button>
          </div>
        </div>
      )}

      {/* Security Warning Popup */}
      {violation && (
        <SecurityWarningPopup
          violation={{
            violationId: violation.violationId,
            violationType: violation.violationType,
            message: violation.message || 'Suspicious activity detected',
            device1: violation.device1,
            device2: violation.device2,
          }}
          onAcknowledge={clearViolation}
          onChangePassword={handleChangePassword}
          onClose={clearViolation}
        />
      )}
    </div>
  );
}
