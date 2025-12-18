'use client';

import React, { useState, useRef, useEffect } from 'react';

interface SessionPlayerProps {
  sessionId: string;
  videoUrl: string;
  title: string;
  duration: number; // in minutes
  token: string;
}

export default function SessionPlayer({
  sessionId,
  videoUrl,
  title,
  duration,
  token,
}: SessionPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeout = useRef<NodeJS.Timeout>();
  const [percentageWatched, setPercentageWatched] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const totalDurationSeconds = duration * 60;

  // Auto-hide controls on mouse move
  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  // Handle time update
  const handleTimeUpdate = () => {
    if (videoRef.current && !isSeeking) {
      const current = videoRef.current.currentTime;
      setCurrentTime(current);
      const percentage = (current / totalDurationSeconds) * 100;
      setPercentageWatched(percentage);

      // Auto-save progress every 10 seconds
      if (Math.floor(current) % 10 === 0) {
        saveProgress(current);
      }
    }
  };

  // Handle seeking
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    setIsSeeking(false);
  };

  // Save progress to database
  async function saveProgress(watchedSeconds: number) {
    if (isSaving) return;

    try {
      setIsSaving(true);
      const response = await fetch(`/api/sessions/${sessionId}/view`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          watched_duration: Math.floor(watchedSeconds),
          last_position: Math.floor(watchedSeconds),
        }),
      });

      if (!response.ok) throw new Error('Failed to save progress');

      const { is_completed, percentage_watched } = await response.json();
      setIsCompleted(is_completed);
      setPercentageWatched(percentage_watched);
    } catch (error) {
      console.error('Error saving progress:', error);
    } finally {
      setIsSaving(false);
    }
  }

  // Handle video end
  const handleVideoEnd = async () => {
    setIsPlaying(false);
    saveProgress(totalDurationSeconds);
    setIsCompleted(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement && videoRef.current) {
      videoRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div
      className="relative bg-black rounded-lg overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (isPlaying) setShowControls(false);
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleVideoEnd}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            videoRef.current.currentTime = currentTime;
          }
        }}
      />

      {/* Completion Badge */}
      {isCompleted && (
        <div className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
          ✅ Completed
        </div>
      )}

      {/* Progress Saving Indicator */}
      {isSaving && (
        <div className="absolute top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
          💾 Saving...
        </div>
      )}

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-transparent to-transparent p-4 transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress Bar */}
        <input
          type="range"
          min="0"
          max={totalDurationSeconds}
          value={currentTime}
          onChange={handleSeek}
          onMouseDown={() => setIsSeeking(true)}
          onTouchStart={() => setIsSeeking(true)}
          onMouseUp={() => setIsSeeking(false)}
          onTouchEnd={() => setIsSeeking(false)}
          className="w-full h-1 bg-gray-600 rounded cursor-pointer appearance-none"
          style={{
            background: `linear-gradient(to right, rgb(234, 88, 12) 0%, rgb(234, 88, 12) ${percentageWatched}%, rgb(75, 85, 99) ${percentageWatched}%, rgb(75, 85, 99) 100%)`,
          }}
        />

        {/* Controls Bar */}
        <div className="flex items-center justify-between mt-4">
          {/* Left Side - Play & Time */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (videoRef.current) {
                  if (isPlaying) {
                    videoRef.current.pause();
                  } else {
                    videoRef.current.play();
                  }
                }
              }}
              className="text-white hover:text-yoga-300 transition-colors text-2xl"
            >
              {isPlaying ? '⏸️' : '▶️'}
            </button>

            {/* Volume Control */}
            <button className="text-white hover:text-yoga-300 transition-colors">🔊</button>

            {/* Time Display */}
            <div className="text-white text-sm font-mono">
              {formatTime(currentTime)} / {formatTime(totalDurationSeconds)}
            </div>
          </div>

          {/* Right Side - Settings & Fullscreen */}
          <div className="flex items-center gap-4">
            {/* Percentage Watched */}
            <div className="text-white text-sm">
              {Math.round(percentageWatched)}% watched
            </div>

            {/* Settings */}
            <button className="text-white hover:text-yoga-300 transition-colors">⚙️</button>

            {/* Fullscreen */}
            <button
              onClick={handleFullscreen}
              className="text-white hover:text-yoga-300 transition-colors text-xl"
            >
              {isFullscreen ? '⛔' : '⛶'}
            </button>
          </div>
        </div>
      </div>

      {/* Title Overlay on Hover */}
      {showControls && (
        <div className="absolute top-4 left-4 text-white font-bold text-lg line-clamp-2 max-w-md">
          {title}
        </div>
      )}
    </div>
  );
}
