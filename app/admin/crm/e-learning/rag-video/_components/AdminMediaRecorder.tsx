'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, Mic, Upload, Video, Square, Play, Pause, RotateCcw, 
  CheckCircle, Sparkles, Loader2, Volume2, AlertCircle, Save, 
  FlipHorizontal, ArrowRight, ShieldCheck, Film, RefreshCw, Lock
} from 'lucide-react';

interface AdminMediaRecorderProps {
  token: string | null;
  onMediaReady?: (data: { url: string; type: 'video' | 'audio'; name: string; duration?: number }) => void;
  onSavedPreset?: (preset: any) => void;
}

export default function AdminMediaRecorder({ token, onMediaReady, onSavedPreset }: AdminMediaRecorderProps) {
  const [mode, setMode] = useState<'video' | 'audio' | 'file'>('video');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Upload & Preset states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [presetName, setPresetName] = useState('');
  const [presetType, setPresetType] = useState<'video_clip' | 'voice_sample' | 'face_photo'>('video_clip');
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);

  // Refs
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop all active streams
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [stopStream, previewUrl]);

  // Start Camera Stream with progressive fallback
  const startCameraStream = useCallback(async () => {
    stopStream();
    setErrorMessage('');
    setIsPermissionDenied(false);

    let stream: MediaStream | null = null;
    let lastError: any = null;

    // Attempt 1: Ideal 1080p video + audio
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (e1: any) {
      lastError = e1;
      // Attempt 2: Flexible standard video + audio without resolution constraints
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode },
          audio: true,
        });
      } catch (e2: any) {
        lastError = e2;
        // Attempt 3: Flexible video-only in case mic is in-use or denied
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
        } catch (e3: any) {
          lastError = e3;
        }
      }
    }

    if (stream) {
      streamRef.current = stream;
      setIsPermissionDenied(false);
      setErrorMessage('');
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play().catch(() => {});
      }
    } else {
      console.warn('Camera access error:', lastError);
      setIsPermissionDenied(true);
      setErrorMessage(
        lastError?.name === 'NotAllowedError' || lastError?.name === 'PermissionDeniedError'
          ? 'Camera/Mic permission denied. Please allow camera and microphone access in browser settings.'
          : `Failed to access camera: ${lastError?.message || 'Unknown device error'}`
      );
    }
  }, [facingMode, stopStream]);

  // Start Audio Stream with Visualizer
  const startAudioStream = useCallback(async () => {
    stopStream();
    setErrorMessage('');
    setIsPermissionDenied(false);

    let stream: MediaStream | null = null;
    let lastError: any = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (e1: any) {
      lastError = e1;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e2: any) {
        lastError = e2;
      }
    }

    if (stream) {
      streamRef.current = stream;
      setIsPermissionDenied(false);
      setErrorMessage('');

      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 64;

        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;

        const drawWaveform = () => {
          if (!canvasRef.current || !analyserRef.current) return;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          const bufferLength = analyserRef.current.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyserRef.current.getByteFrequencyData(dataArray);

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const barWidth = (canvas.width / bufferLength) * 2;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height;
            const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
            gradient.addColorStop(0, '#9333ea');
            gradient.addColorStop(1, '#10b981');

            ctx.fillStyle = gradient;
            ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
            x += barWidth;
          }

          animationFrameRef.current = requestAnimationFrame(drawWaveform);
        };

        drawWaveform();
      } catch (audioErr) {
        console.warn('Audio visualization warning:', audioErr);
      }
    } else {
      console.warn('Mic access error:', lastError);
      setIsPermissionDenied(true);
      setErrorMessage(
        lastError?.name === 'NotAllowedError' || lastError?.name === 'PermissionDeniedError'
          ? 'Microphone permission denied. Please allow microphone access in browser settings.'
          : `Failed to access microphone: ${lastError?.message || 'Device error'}`
      );
    }
  }, [stopStream]);

  // Switch modes
  useEffect(() => {
    if (!recordedBlob) {
      if (mode === 'video') {
        startCameraStream();
        setPresetType('video_clip');
      } else if (mode === 'audio') {
        startAudioStream();
        setPresetType('voice_sample');
      } else {
        stopStream();
      }
    }
  }, [mode, startCameraStream, startAudioStream, stopStream, recordedBlob]);

  // Toggle Camera (Front / Back)
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Start Recording with 3s countdown
  const handleStartRecording = () => {
    setErrorMessage('');
    setCountdown(3);
    const countInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countInterval);
          executeStartRecording();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const executeStartRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];

    // Select optimal mime type
    let mimeType = mode === 'video' ? 'video/webm;codecs=vp9,opus' : 'audio/webm;codecs=opus';
    if (mode === 'video') {
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/mp4';
    } else {
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'audio/mp4';
    }

    try {
      const recorder = new MediaRecorder(streamRef.current, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(finalBlob);
        const url = URL.createObjectURL(finalBlob);
        setPreviewUrl(url);
        stopStream();
      };

      recorder.start(1000); // 1s slice
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (e: any) {
      setErrorMessage(`Failed to start recording: ${e.message}`);
    }
  };

  // Stop Recording
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // Retake Recording
  const handleRetake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setRecordedBlob(null);
    setPreviewUrl(null);
    setUploadedUrl(null);
    setSaveSuccess(false);
    setRecordingTime(0);
    if (mode === 'video') startCameraStream();
    if (mode === 'audio') startAudioStream();
  };

  // Format Seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Upload to Bunny Storage CDN
  const handleUploadToBunny = async (): Promise<string | null> => {
    if (!recordedBlob || !token) {
      setErrorMessage('No recording to upload or unauthorized.');
      return null;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage('');

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      const ext = mode === 'video' ? 'webm' : 'webm';
      const file = new File([recordedBlob], `swar_studio_${Date.now()}.${ext}`, { type: recordedBlob.type });
      formData.append('file', file);

      xhr.open('POST', '/api/bunny/upload-material');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percent);
        }
      };

      xhr.onload = () => {
        setIsUploading(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const resp = JSON.parse(xhr.responseText);
            if (resp.url) {
              setUploadedUrl(resp.url);
              resolve(resp.url);
              return;
            }
          } catch (e) {}
        }
        setErrorMessage('Failed to upload recording to Bunny CDN.');
        resolve(null);
      };

      xhr.onerror = () => {
        setIsUploading(false);
        setErrorMessage('Network error during upload to Bunny CDN.');
        resolve(null);
      };

      xhr.send(formData);
    });
  };

  // Save Preset to Bunny Database
  const handleSavePreset = async () => {
    if (!token) return;
    setIsSavingPreset(true);
    setErrorMessage('');

    try {
      let finalUrl = uploadedUrl;
      if (!finalUrl) {
        finalUrl = await handleUploadToBunny();
        if (!finalUrl) {
          setIsSavingPreset(false);
          return;
        }
      }

      const res = await fetch('/api/admin/e-learning/ai-video/avatars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: presetName.trim() || `Studio ${mode === 'video' ? 'Avatar' : 'Voice'} (${new Date().toLocaleDateString()})`,
          avatarType: presetType,
          mediaUrl: finalUrl,
          language: 'hi',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save preset.');
      }

      setSaveSuccess(true);
      if (onSavedPreset) onSavedPreset(data.data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving avatar preset.');
    } finally {
      setIsSavingPreset(false);
    }
  };

  // Use Directly for RAG Video Generation
  const handleUseForRAG = async () => {
    let finalUrl = uploadedUrl;
    if (!finalUrl) {
      finalUrl = await handleUploadToBunny();
      if (!finalUrl) return;
    }

    if (onMediaReady) {
      onMediaReady({
        url: finalUrl,
        type: mode === 'video' ? 'video' : 'audio',
        name: presetName.trim() || `Recording_${Date.now()}`,
        duration: recordingTime,
      });
    }
  };

  // Handle Local File Upload Picker
  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVid = file.type.startsWith('video');
    setMode(isVid ? 'video' : 'audio');
    setRecordedBlob(file);
    setPreviewUrl(URL.createObjectURL(file));
    setPresetType(isVid ? 'video_clip' : 'voice_sample');
    setPresetName(file.name.replace(/\.[^/.]+$/, ''));
  };

  return (
    <div className="bg-gradient-to-b from-gray-900 via-gray-950 to-black border border-purple-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden relative">
      {/* Header & Modes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Sparkles className="w-5 h-5" />
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-wide">
              Admin Live Studio <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Mobile & Web</span>
            </h3>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Record 1080p Full HD video or studio voice samples directly from your phone camera or laptop mic.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        {!recordedBlob && !isRecording && (
          <div className="flex items-center bg-gray-900 border border-gray-800 p-1 rounded-2xl">
            <button
              onClick={() => setMode('video')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                mode === 'video'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Camera Video</span>
            </button>
            <button
              onClick={() => setMode('audio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                mode === 'audio'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice Sample</span>
            </button>
            <label
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                mode === 'file'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload File</span>
              <input type="file" accept="video/*,audio/*" className="hidden" onChange={handleLocalFileSelect} />
            </label>
          </div>
        )}
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Viewport */}
      <div className="relative w-full aspect-video sm:aspect-[16/9] bg-black rounded-2xl overflow-hidden border border-gray-800 shadow-inner flex items-center justify-center">
        {/* Countdown overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 z-30 bg-black/80 flex items-center justify-center">
            <span className="text-7xl font-extrabold text-purple-400 animate-ping">
              {countdown}
            </span>
          </div>
        )}

        {/* Permission Denied or Blocked Overlay */}
        {isPermissionDenied && !previewUrl && (
          <div className="absolute inset-0 z-30 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-3">
              <Camera className="w-7 h-7 text-amber-400" />
            </div>
            <h4 className="text-sm sm:text-base font-bold text-white mb-1">Camera & Microphone Access Required</h4>
            <p className="text-xs text-slate-300 max-w-sm mb-4">
              Your browser blocked camera or microphone access for this website. Follow these 2 quick steps:
            </p>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-left max-w-sm w-full mb-4 space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-300 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                <span>Click the <strong>🔒 Lock icon</strong> (or <strong>🎛️ Tune icon</strong>) next to <code className="text-purple-300">swaryoga.com</code> in your browser address bar.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-300 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                <span>Change <strong>Camera</strong> and <strong>Microphone</strong> from &quot;Block&quot; to <strong>&quot;Allow&quot;</strong>.</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (mode === 'video') startCameraStream();
                  else if (mode === 'audio') startAudioStream();
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Permission</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Video/Audio File</span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,audio/*"
              className="hidden"
              onChange={handleLocalFileSelect}
            />
          </div>
        )}

        {/* 1. Video Recording Mode */}
        {mode === 'video' && !previewUrl && (
          <>
            <video
              ref={videoPreviewRef}
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />
            {/* Flip camera button for mobile */}
            {!isRecording && (
              <button
                onClick={toggleFacingMode}
                className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white backdrop-blur-md transition-transform active:scale-95"
                title="Switch Camera (Front/Back)"
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>
            )}
          </>
        )}

        {/* 2. Audio Recording Mode with Waveform Visualizer */}
        {mode === 'audio' && !previewUrl && (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-950 to-black">
            <div className="relative mb-6">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                isRecording ? 'bg-red-500/20 text-red-400 ring-4 ring-red-500/30 animate-pulse' : 'bg-purple-500/20 text-purple-400'
              }`}>
                <Mic className="w-10 h-10" />
              </div>
            </div>
            {/* Animated Canvas */}
            <canvas ref={canvasRef} width={320} height={60} className="w-64 h-12 rounded-xl mb-2" />
            <p className="text-xs text-gray-400 text-center">
              {isRecording ? 'Listening & recording clear voice sample...' : 'Speak into your microphone to record a voice sample'}
            </p>
          </div>
        )}

        {/* 3. Preview Playback Mode (After recording) */}
        {previewUrl && (
          <div className="w-full h-full flex items-center justify-center bg-black">
            {mode === 'video' ? (
              <video src={previewUrl} controls className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                  <Volume2 className="w-8 h-8" />
                </div>
                <audio src={previewUrl} controls className="w-full max-w-md mb-2" />
                <span className="text-xs text-emerald-400 font-semibold">Recording Ready</span>
              </div>
            )}
          </div>
        )}

        {/* Recording Indicator & Timer */}
        {isRecording && (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-red-500/40">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-bold text-white font-mono">{formatTime(recordingTime)}</span>
          </div>
        )}
      </div>

      {/* Control Buttons Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {/* Left side actions */}
        {!previewUrl ? (
          <div className="flex items-center gap-2">
            {!isRecording ? (
              <button
                onClick={handleStartRecording}
                disabled={countdown !== null}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-red-500/25 flex items-center gap-2 transition-transform active:scale-95"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                <span>Start Recording</span>
              </button>
            ) : (
              <button
                onClick={handleStopRecording}
                className="px-6 py-2.5 rounded-2xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs border border-gray-700 flex items-center gap-2 transition-transform active:scale-95"
              >
                <Square className="w-3.5 h-3.5 fill-red-400 text-red-400" />
                <span>Stop Recording</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleRetake}
              disabled={isUploading || isSavingPreset}
              className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake</span>
            </button>
          </div>
        )}

        {/* Right side: Save Preset & Use for RAG */}
        {previewUrl && (
          <div className="flex flex-1 sm:flex-initial flex-wrap items-center gap-2 justify-end">
            <input
              type="text"
              placeholder="Avatar / Voice Name..."
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="px-3 py-1.5 bg-black border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 w-full sm:w-48"
            />

            <button
              onClick={handleSavePreset}
              disabled={isSavingPreset || isUploading || saveSuccess}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                saveSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20'
              } disabled:opacity-50`}
            >
              {isSavingPreset ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{uploadProgress > 0 && uploadProgress < 100 ? `${uploadProgress}%` : 'Saving...'}</span>
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Saved to Presets</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save as Avatar</span>
                </>
              )}
            </button>

            <button
              onClick={handleUseForRAG}
              disabled={isUploading || isSavingPreset}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition-transform active:scale-95 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading {uploadProgress}%</span>
                </>
              ) : (
                <>
                  <span>Create AI Video Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="w-full bg-gray-800 rounded-full h-1.5 mt-3 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-emerald-500 h-1.5 transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
        </div>
      )}
    </div>
  );
}
