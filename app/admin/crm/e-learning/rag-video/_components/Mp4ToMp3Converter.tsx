"use client";

import { useState, useEffect } from 'react';
import { Download, FileAudio, FileVideo, Loader2, X, Link as LinkIcon, Upload, CheckCircle2, Sparkles } from 'lucide-react';
import { compressAudioForWhisper, getClientFFmpeg } from '@/lib/clientAudioCompressor';

interface Mp4ToMp3ConverterProps {
  onConverted?: (file: File) => void;
  isOpenExternal?: boolean;
  onCloseExternal?: () => void;
}

export default function Mp4ToMp3Converter({ onConverted, isOpenExternal, onCloseExternal }: Mp4ToMp3ConverterProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isOpenExternal !== undefined ? isOpenExternal : internalOpen;
  const setIsOpen = (open: boolean) => {
    if (onCloseExternal && !open) onCloseExternal();
    setInternalOpen(open);
  };

  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [convertedFile, setConvertedFile] = useState<File | null>(null);
  const [originalFileSizeMB, setOriginalFileSizeMB] = useState<number | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState('');

  // Pre-load FFmpeg when modal opens so conversion starts instantaneously
  useEffect(() => {
    if (isOpen) {
      getClientFFmpeg().catch((err) => console.warn('Preloading FFmpeg:', err));
    }
  }, [isOpen]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file, file.name);
  };

  const handleUrlSubmit = async () => {
    if (!videoUrl) return;
    setFileName('downloaded_audio');
    setDownloadUrl(null);
    setConvertedFile(null);
    setProgress(0);
    setIsLoading(true);
    setStatusMessage('Downloading media from URL...');

    try {
      const res = await fetch(`/api/admin/e-learning/ai-video/url-to-mp3?url=${encodeURIComponent(videoUrl)}`);
      if (!res.ok) {
        throw new Error('Failed to fetch media from URL');
      }

      const blob = await res.blob();
      setOriginalFileSizeMB(blob.size / (1024 * 1024));

      // If the API returned an audio stream directly, still compress to 16kHz mono 32kbps so it's guaranteed < 24MB
      await processFile(new File([blob], 'url_media.mp4', { type: blob.type }), 'url_media.mp4');
    } catch (error: any) {
      console.error('Error fetching URL', error);
      alert('Failed to process URL: ' + (error?.message || 'Check URL and try again'));
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  const processFile = async (file: File, name: string) => {
    setFileName(name);
    setOriginalFileSizeMB(file.size / (1024 * 1024));
    setDownloadUrl(null);
    setConvertedFile(null);
    setProgress(0);
    setIsLoading(true);
    setStatusMessage('Compressing audio to speech MP3 (16kHz mono)...');

    try {
      const resultFile = await compressAudioForWhisper(file, name, (pct) => {
        setProgress(pct);
      });

      const url = URL.createObjectURL(resultFile);
      setDownloadUrl(url);
      setConvertedFile(resultFile);
    } catch (error: any) {
      console.error('Error converting file', error);
      alert('An error occurred during conversion: ' + (error?.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  const handleApplyToJob = () => {
    if (convertedFile && onConverted) {
      onConverted(convertedFile);
      setIsOpen(false);
    }
  };

  return (
    <>
      {!isOpenExternal && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-semibold shadow-lg transition-transform hover:scale-105 text-sm"
        >
          <FileAudio className="w-4 h-4" />
          Open MP4 to MP3 Converter
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 text-white w-full max-w-2xl shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-green-500/20 rounded-xl text-green-400">
                <FileAudio className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-green-400">Audio & Video to Speech MP3 (Whisper-Ready)</h2>
                <p className="text-xs text-gray-400">
                  Compresses any large MP4/MP3/WAV/M4A directly in your browser down to ~12MB (16kHz mono speech).
                </p>
              </div>
            </div>

            {/* Tab Selector */}
            <div className="flex gap-2 mb-6 p-1 bg-gray-800/50 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'upload' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" /> Upload Local Audio / Video
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('url')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'url' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" /> Bunny / YouTube URL
              </button>
            </div>

            <div className="space-y-6">
              {activeTab === 'upload' && !isLoading && !downloadUrl && (
                <div className="border-2 border-dashed border-gray-700 rounded-2xl p-8 text-center hover:bg-gray-800/50 transition-colors cursor-pointer relative group">
                  <input
                    type="file"
                    accept="audio/*,video/mp4,video/quicktime,video/webm,video/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FileVideo className="w-10 h-10 mx-auto text-green-500 mb-3 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-semibold text-white">Click or drag audio/video file here to compress</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Supports MP3, WAV, M4A, AAC, MP4, MOV. Shrinks full-hour recordings under 24MB.
                  </p>
                </div>
              )}

              {activeTab === 'url' && !isLoading && !downloadUrl && (
                <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
                  <label className="block text-xs font-medium text-gray-300 mb-2">Paste Video or Audio URL</label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://video.bunnycdn.com/... or https://youtube.com/..."
                      className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-green-500"
                    />
                    <button
                      type="button"
                      onClick={handleUrlSubmit}
                      disabled={!videoUrl}
                      className="px-5 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-colors"
                    >
                      Process
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2">Downloads audio stream and compresses it to speech MP3.</p>
                </div>
              )}

              {isLoading && (
                <div className="bg-gray-800/50 rounded-xl p-6 text-center border border-gray-700">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-400 mb-3" />
                  <p className="text-sm font-semibold text-white">{statusMessage || 'Processing audio...'}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {progress > 0 ? `Compression Progress: ${progress}%` : 'Transcoding to 16kHz mono speech MP3...'}
                  </p>
                  {progress > 0 && (
                    <div className="w-full bg-gray-700 rounded-full h-2 mt-4 overflow-hidden">
                      <div className="bg-green-500 h-2 transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                  )}
                </div>
              )}

              {downloadUrl && convertedFile && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      <div>
                        <p className="text-sm font-bold text-green-400">Conversion Successful!</p>
                        <p className="text-xs text-gray-300 font-mono mt-0.5">{convertedFile.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      {originalFileSizeMB !== null && (
                        <span className="px-2 py-1 rounded bg-gray-800 text-gray-400 line-through">
                          {originalFileSizeMB.toFixed(1)}MB
                        </span>
                      )}
                      <span className="px-2 py-1 rounded bg-green-500/20 text-green-300">
                        {(convertedFile.size / (1024 * 1024)).toFixed(1)}MB (Whisper Ready)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2 flex-wrap">
                    {onConverted && (
                      <button
                        type="button"
                        onClick={handleApplyToJob}
                        className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg hover:scale-105"
                      >
                        <Sparkles className="w-4 h-4" />
                        Use in Job Form (Direct)
                      </button>
                    )}
                    <a
                      href={downloadUrl}
                      download={convertedFile.name}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download MP3
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setDownloadUrl(null);
                        setConvertedFile(null);
                        setFileName(null);
                      }}
                      className="px-3 py-2.5 text-gray-400 hover:text-white text-xs"
                    >
                      Convert Another
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
