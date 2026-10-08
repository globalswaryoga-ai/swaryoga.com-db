"use client";

import { useState, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Download, FileAudio, FileVideo, Loader2, X, Link as LinkIcon, Upload } from 'lucide-react';

export default function Mp4ToMp3Converter() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  
  const [ffmpeg] = useState(() => new FFmpeg());
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState('');

  const loadFfmpeg = async () => {
    if (ffmpeg.loaded) {
      setIsReady(true);
      return;
    }
    setIsLoading(true);
    try {
      ffmpeg.on('progress', ({ progress }) => {
        setProgress(Math.round(progress * 100));
      });
      // Using jsdelivr as it is much more reliable and bypasses unpkg CORS/timeout issues
      const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      setIsReady(true);
    } catch (error) {
      console.error('Error loading ffmpeg', error);
      alert('Failed to load FFmpeg. Please check your connection or try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-initialize ffmpeg when the popup opens
  useEffect(() => {
    if (isOpen && !isReady && !isLoading) {
      loadFfmpeg();
    }
  }, [isOpen]); // only trigger when isOpen changes

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file, file.name);
  };

  const handleUrlSubmit = async () => {
    if (!videoUrl) return;
    setFileName('downloaded_audio');
    setDownloadUrl(null);
    setProgress(0);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/admin/e-learning/ai-video/url-to-mp3?url=${encodeURIComponent(videoUrl)}`);
      if (!res.ok) {
        throw new Error('Failed to fetch media from URL');
      }
      
      const blob = await res.blob();
      
      // If the API returned an MP3 directly (e.g. from YouTube audio extraction), just use it
      if (blob.type.includes('audio')) {
         const url = URL.createObjectURL(blob);
         setDownloadUrl(url);
         setIsLoading(false);
         return;
      }
      
      // If it returned a video, we process it locally with FFmpeg
      await processFile(new File([blob], 'video.mp4', { type: blob.type }), 'url_video.mp4');
    } catch (error) {
      console.error('Error fetching URL', error);
      alert('Failed to process URL. Make sure it is a direct video link or valid YouTube URL.');
      setIsLoading(false);
    }
  };

  const processFile = async (file: File, name: string) => {
    setFileName(name);
    setDownloadUrl(null);
    setProgress(0);

    if (!isReady) {
      await loadFfmpeg();
    }

    setIsLoading(true);
    try {
      const safeName = 'input.mp4';
      await ffmpeg.writeFile(safeName, await fetchFile(file));
      await ffmpeg.exec(['-i', safeName, '-vn', '-ar', '44100', '-ac', '2', '-b:a', '128k', 'output.mp3']);

      const data = await ffmpeg.readFile('output.mp3');
      const blob = new Blob([data], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
    } catch (error) {
      console.error('Error converting file', error);
      alert('An error occurred during conversion.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold shadow-lg transition-transform hover:scale-105"
      >
        <FileAudio className="w-5 h-5" />
        Open MP4 to MP3 Converter
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 text-white w-full max-w-2xl shadow-2xl relative">
        <button 
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-green-500/20 rounded-xl text-green-400">
            <FileAudio className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-green-500">100% Free MP4 to MP3 Converter</h2>
            <p className="text-sm text-gray-400">Convert local files or download audio from URLs securely.</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 mb-6 p-1 bg-gray-800/50 rounded-xl">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'upload' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" /> Upload Local MP4
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'url' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <LinkIcon className="w-4 h-4" /> YouTube / Bunny URL
          </button>
        </div>

        <div className="space-y-6">
          {activeTab === 'upload' && !isLoading && !downloadUrl && (
            <>
              {isReady && (
                <div className="border-2 border-dashed border-gray-700 rounded-2xl p-8 text-center hover:bg-gray-800/50 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FileVideo className="w-10 h-10 mx-auto text-green-500 mb-3" />
                  <p className="text-lg font-medium text-white">Click or drag MP4 video here to convert</p>
                  <p className="text-sm text-gray-500 mt-1">Converts super fast directly on your device</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'url' && !isLoading && !downloadUrl && (
            <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
              <label className="block text-sm font-medium text-gray-300 mb-2">Paste Video URL</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/... or https://video.bunnycdn.com/..."
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-green-500"
                />
                <button
                  onClick={handleUrlSubmit}
                  disabled={!videoUrl}
                  className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
                >
                  Process
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3">We will securely download the audio stream directly to your device.</p>
            </div>
          )}

          {isLoading && (
            <div className="bg-gray-800/50 rounded-xl p-6 text-center border border-gray-700">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-400 mb-3" />
              <p className="font-medium">{progress > 0 ? `Converting: ${progress}%` : 'Loading Engine & Processing...'}</p>
              {progress > 0 && (
                <div className="w-full bg-gray-700 rounded-full h-2 mt-4 overflow-hidden">
                  <div className="bg-green-500 h-2 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              )}
            </div>
          )}

          {downloadUrl && fileName && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-green-400 font-medium flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" /> Conversion Complete!
                </p>
                <p className="text-sm text-gray-400 mt-1">{fileName.replace(/\.[^/.]+$/, "")}.mp3</p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setDownloadUrl(null);
                    setFileName(null);
                  }}
                  className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  Convert Another
                </button>
                <a
                  href={downloadUrl}
                  download={`${fileName.replace(/\.[^/.]+$/, "")}.mp3`}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors whitespace-nowrap justify-center"
                >
                  <Download className="w-4 h-4" />
                  Download MP3
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CheckCircle(props: any) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
