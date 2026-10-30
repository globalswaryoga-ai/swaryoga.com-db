'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  Sparkles,
  Clock,
  Upload,
  FileText,
  Copy,
} from 'lucide-react';

interface MinuteSection {
  minuteRange: string;
  sectionTitle: string;
  sentences: Array<{
    id: string;
    start: string;
    end: string;
    text: string;
  }>;
}

interface Module5Props {
  token?: string | null;
  initialVideoUrl?: string | null;
  initialVideoTitle?: string | null;
  onSendToGrammarChecker?: (text: string) => void;
  onSendToTranslator?: (text: string) => void;
  onSendToVideoStudio?: (timelineData: any) => void;
}

function sendMediaForAnalysis(
  form: FormData,
  token: string | null | undefined,
  onUploadProgress: (percent: number) => void,
  onUploadComplete: () => void,
) {
  return new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/e-learning/video-to-text-emotion');
    xhr.timeout = 240_000;
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) onUploadProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    xhr.upload.onload = onUploadComplete;
    xhr.onload = () => {
      let result: any;
      try { result = JSON.parse(xhr.responseText); } catch {
        const route = xhr.responseURL ? new URL(xhr.responseURL).pathname : '/api/admin/e-learning/video-to-text-emotion';
        reject(new Error(`Media API returned a non-JSON page (HTTP ${xhr.status}, ${route}). Restart the Next.js dev server and retry.`));
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) reject(new Error(result.error || `Media analysis failed (HTTP ${xhr.status}).`));
      else resolve(result);
    };
    xhr.onerror = () => reject(new Error('Network connection failed while analyzing the media.'));
    xhr.ontimeout = () => {
      const error = new Error('Transcription took longer than 4 minutes and was stopped. Try a shorter/compressed file; the transcript has not been saved.');
      error.name = 'TimeoutError';
      reject(error);
    };
    xhr.onabort = () => reject(new Error('Media analysis was cancelled.'));
    xhr.send(form);
  });
}

export default function Module5VideoToTextEmotion({
  token,
  initialVideoUrl,
  initialVideoTitle,
  onSendToGrammarChecker,
  onSendToTranslator,
  onSendToVideoStudio,
}: Module5Props) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState(initialVideoUrl || '');
  const [sourceLanguage, setSourceLanguage] = useState('hi');
  const [videoTitle, setVideoTitle] = useState<string | null>(initialVideoTitle || null);
  const [savedAvatars, setSavedAvatars] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [detectedLang, setDetectedLang] = useState('Detected after transcription');
  const [sections, setSections] = useState<MinuteSection[] | null>(null);
  const [plainTranscript, setPlainTranscript] = useState('');
  const [annotatedTranscript, setAnnotatedTranscript] = useState('');
  const [analysisError, setAnalysisError] = useState('');
  const [analysisWarning, setAnalysisWarning] = useState('');
  const [analysisStage, setAnalysisStage] = useState<'uploading' | 'processing' | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeMinuteTab, setActiveMinuteTab] = useState(0);
  const [includeEmotionsInText, setIncludeEmotionsInText] = useState(true);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialVideoUrl) {
      setSourceUrl(initialVideoUrl);
      if (initialVideoTitle) setVideoTitle(initialVideoTitle);
    }
  }, [initialVideoUrl, initialVideoTitle]);

  useEffect(() => {
    fetch('/api/avatar/studio-hub?type=video_avatars')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.items) setSavedAvatars(d.items);
      })
      .catch(() => {});
  }, []);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setVideoTitle(file.name);
      setSourceUrl('');
      setSections(null);
      setPlainTranscript('');
      setAnnotatedTranscript('');
    }
  };

  const handleRunAnalysis = async () => {
    if (!videoFile && !sourceUrl.trim()) return;
    setIsProcessing(true);
    setAnalysisError('');
    setAnalysisWarning('');
    setAnalysisStage(videoFile ? 'uploading' : 'processing');
    setUploadProgress(0);
    setProgressText(videoFile ? 'Uploading your media to the analysis server...' : 'Sending the URL to the analysis server...');
    try {
      const form = new FormData();
      form.set('language', sourceLanguage);
      if (videoFile) form.set('file', videoFile);
      else form.set('url', sourceUrl.trim());
      const result = await sendMediaForAnalysis(
        form,
        token,
        percent => setUploadProgress(percent),
        () => { setAnalysisStage('processing'); setProgressText('Upload complete. Extracting audio and requesting Whisper timestamps...'); },
      );
      const grouped = new Map<number, MinuteSection['sentences']>();
      for (const [index, segment] of (result.segments || []).entries()) {
        const minute = Math.floor(Number(segment.start) / 60);
        const rows = grouped.get(minute) || [];
        const stamp = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
        rows.push({ id: `segment-${index}`, start: stamp(Number(segment.start)), end: stamp(Number(segment.end)), text: String(segment.text || '') });
        grouped.set(minute, rows);
      }
      const minuteSections = [...grouped.entries()].sort(([a], [b]) => a - b).map(([minute, sentences]) => ({
        minuteRange: `${String(minute).padStart(2, '0')}:00 - ${String(minute + 1).padStart(2, '0')}:00`,
        sectionTitle: `Minute ${minute + 1}`,
        sentences,
      }));
      setSections(minuteSections);
      setPlainTranscript(String(result.plainTranscript || ''));
      setAnnotatedTranscript(String(result.annotatedTimeline || result.plainTranscript || ''));
      setVideoTitle(result.title || videoFile?.name || sourceUrl);
      const languageNames: Record<string, string> = { hi: 'Hindi', en: 'English', mr: 'Marathi', kn: 'Kannada', ne: 'Nepali' };
      setDetectedLang(result.language ? `Detected language: ${languageNames[result.language] || result.language}` : 'Language detected by Whisper');
      setProgressText(result.correctionApplied
        ? 'Hindi-aware transcript cleanup, timestamps, and avatar suggestions are ready.'
        : 'Timestamped transcript is ready. Raw Whisper wording was kept because cleanup was unavailable.');
      setAnalysisWarning([result.correctionWarning, result.cueWarning].filter(Boolean).join(' '));
      setActiveMinuteTab(0);
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'TimeoutError';
      setAnalysisError(timedOut
        ? 'Transcription took longer than 4 minutes and was stopped. Try a shorter/compressed file; the transcript has not been saved.'
        : error instanceof Error ? error.message : 'Media transcription failed.');
    } finally { setIsProcessing(false); setAnalysisStage(null); }
  };

  const getAllText = (withEmotions = includeEmotionsInText) => {
    return withEmotions ? annotatedTranscript : plainTranscript;
  };

  const handleCopyText = (withEmotions: boolean) => {
    const txt = getAllText(withEmotions);
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-rose-200 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-violet-600 flex items-center justify-center text-white font-black shadow-lg">
            <Video size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Module 5: Video to Text & Emotion Suggestions
              </h2>
              <span className="text-[10px] bg-violet-50 text-violet-800 border border-violet-200 px-2 py-0.5 rounded-full font-bold">
                Whisper timestamps • Emotion & face suggestions
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Upload a media file or paste a YouTube/Bunny URL. Expression cues are AI suggestions inferred from transcript wording, not visual face detection.
            </p>
          </div>
        </div>
      </div>

      {/* Upload & Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-5 space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleVideoSelect}
            accept="video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp4,audio/wav,.mp4,.webm,.mov,.mp3,.m4a,.wav"
            className="hidden"
          />
          <section className="rounded-2xl border border-sky-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-900"><Upload size={18} className="text-sky-700"/><h3 className="font-semibold">Upload a media file</h3></div>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full rounded-xl border-2 border-dashed border-sky-200 bg-sky-50 px-4 py-6 text-sm font-semibold text-sky-900 hover:bg-sky-100">{videoFile ? `${videoFile.name} · ${(videoFile.size / 1024 / 1024).toFixed(1)} MB` : 'Choose MP4, WebM, MOV, MP3, M4A, or WAV'}</button>
            <p className="text-xs text-slate-500">Maximum upload: 150 MB. Longer audio is compressed before transcription.</p>
            <label className="block text-xs font-semibold text-slate-700">Spoken language<select value={sourceLanguage} onChange={event => setSourceLanguage(event.target.value)} className="mt-1.5 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900"><option value="hi">Hindi</option><option value="mr">Marathi</option><option value="en">English</option><option value="auto">Auto-detect</option></select></label>
            <label className="block text-xs font-semibold text-slate-700">Or analyze a YouTube or Bunny URL<input value={sourceUrl} onChange={event => { setSourceUrl(event.target.value); setVideoFile(null); setVideoUrl(null); setSections(null); }} className="mt-1.5 w-full rounded-lg border border-violet-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900" placeholder="https://youtu.be/... or https://...b-cdn.net/lesson.mp4" /></label>
            {videoUrl && <video src={videoUrl} controls className="w-full rounded-xl border border-slate-200 bg-slate-950" />}
            {savedAvatars.length > 0 && (
              <div className="space-y-2"><span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><Video size={13} className="text-rose-500"/>Stored video sources</span>
                <div className="space-y-1.5">{savedAvatars.map((avatar) => <button key={avatar.id} type="button" onClick={() => { setSourceUrl(avatar.originalVideoUrl); setVideoFile(null); setVideoUrl(null); setVideoTitle(avatar.name); setSections(null); }} className="w-full rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-left text-xs font-semibold text-slate-800 hover:border-rose-300">{avatar.name} · Use source</button>)}</div>
              </div>
            )}
            {analysisError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{analysisError}</p>}
            {analysisWarning && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">{analysisWarning}</p>}
            <button type="button" disabled={isProcessing || (!videoFile && !sourceUrl.trim())} onClick={handleRunAnalysis} className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50">{isProcessing ? 'Transcribing media…' : 'Generate real transcript & cues'}</button>
          </section>

          {isProcessing && (
            <div className="rounded-2xl border border-rose-200 bg-white p-4 shadow-sm space-y-2" role="status" aria-live="polite">
              <div className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-slate-800">{analysisStage === 'uploading' ? 'Uploading media' : 'Analyzing media'}</span>{analysisStage === 'uploading' && <span className="text-xs font-bold tabular-nums text-sky-800">{uploadProgress}%</span>}</div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={analysisStage === 'uploading' ? 'Media upload progress' : 'Media analysis running'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={analysisStage === 'uploading' ? uploadProgress : undefined} aria-valuetext={analysisStage === 'uploading' ? `${uploadProgress}% uploaded` : 'Server is transcribing and preparing cue suggestions'}>
                {analysisStage === 'uploading'
                  ? <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-[width] duration-200" style={{ width: `${uploadProgress}%` }} />
                  : <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-violet-500 via-rose-500 to-amber-400" style={{ animation: 'ragProgressSlide 1.4s ease-in-out infinite' }} />}
              </div>
              <p className="text-xs leading-5 text-slate-600">{progressText}</p>
              {analysisStage === 'processing' && <p className="text-[11px] text-slate-500">The bar shows activity, not a completion percentage. This stage has a 4-minute limit.</p>}
            </div>
          )}
        </div>

        {/* Right: Results / Minute-Wise Sections */}
        <div className="md:col-span-7 space-y-4">
          {sections ? (
            <>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock size={16} className="text-rose-400" />
                    <span>Minute-Wise Transcript Timeline</span>
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-emerald-700 font-semibold">{detectedLang}</span>
                    <span className="text-slate-600">•</span>
                    <label className="text-[11px] text-rose-300 font-medium flex items-center gap-1.5 cursor-pointer bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-800/40">
                      <input
                        type="checkbox"
                        checked={includeEmotionsInText}
                        onChange={(e) => setIncludeEmotionsInText(e.target.checked)}
                        className="rounded accent-rose-500 cursor-pointer"
                      />
                      <span>Show transcript {includeEmotionsInText ? 'with' : 'without'} emotion and face tags</span>
                    </label>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleCopyText(includeEmotionsInText)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <Copy size={12} />
                    <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                  </button>

                  {onSendToGrammarChecker && (
                    <button
                      onClick={() => onSendToGrammarChecker(getAllText(includeEmotionsInText))}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1 shadow"
                    >
                      <FileText size={13} />
                      <span>Grammar Check ➔</span>
                    </button>
                  )}

                  {onSendToTranslator && (
                    <button
                      onClick={() => onSendToTranslator(getAllText(includeEmotionsInText))}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1 shadow"
                    >
                      <Sparkles size={13} />
                      <span>Translate (20 Langs) ➔</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Minute Section Selector Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {sections.map((sec, idx) => {
                  const active = activeMinuteTab === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveMinuteTab(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                        active
                          ? 'bg-rose-500 text-white shadow-md'
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {sec.minuteRange}
                    </button>
                  );
                })}
              </div>

              {/* Sentences in current minute */}
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {sections[activeMinuteTab]?.sentences.map((sentence) => (
                  <div
                    key={sentence.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono text-slate-600 font-bold bg-white px-2 py-0.5 rounded">
                        {sentence.start} - {sentence.end}
                      </span>
                    </div>

                    <p className="text-slate-800 text-xs sm:text-sm leading-relaxed font-sans">
                      {sentence.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <section className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{includeEmotionsInText ? 'Transcript with avatar suggestions' : 'Plain timestamped transcript'}</h3><p className="mt-1 text-xs text-slate-600">Emotion and face tags are suggestions inferred from words. They are not observed facial movements.</p></div><span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-800">{videoTitle || 'Analyzed media'}</span></div>
              <pre className="mt-4 max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 p-4 font-sans text-sm leading-7 text-slate-800">{getAllText()}</pre>
            </section>
            </>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
              <Clock size={40} className="mx-auto text-slate-400" />
              <h4 className="text-sm font-bold text-slate-800">No media analyzed yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Choose a local media file or paste a YouTube/Bunny URL. Real speech transcription and timestamps appear here after processing.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
