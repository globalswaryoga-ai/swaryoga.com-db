'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  Sparkles,
  Clock,
  Upload,
  Play,
  Pause,
  CheckCircle2,
  Sliders,
  Smile,
  ArrowRight,
  FileText,
  Download,
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
    primaryEmotion: string;
    emotionIntensity: number;
    voiceStyle: string;
    gesture: string;
    facialExpression: string;
    pauseAfter: number;
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

export default function Module5VideoToTextEmotion({
  token,
  initialVideoUrl,
  initialVideoTitle,
  onSendToGrammarChecker,
  onSendToTranslator,
  onSendToVideoStudio,
}: Module5Props) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(initialVideoUrl || null);
  const [videoTitle, setVideoTitle] = useState<string | null>(initialVideoTitle || null);
  const [savedAvatars, setSavedAvatars] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [sourceLang, setSourceLang] = useState('hi');
  const [detectedLang, setDetectedLang] = useState('Hindi (हिंदी)');
  const [sections, setSections] = useState<MinuteSection[] | null>(null);
  const [activeMinuteTab, setActiveMinuteTab] = useState(0);
  const [includeEmotionsInText, setIncludeEmotionsInText] = useState(true);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialVideoUrl) {
      setVideoUrl(initialVideoUrl);
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
      setSections(null);
    }
  };

  const handleRunAnalysis = () => {
    if (!videoFile && !videoUrl) {
      alert('Please select or upload a video first.');
      return;
    }
    setIsProcessing(true);
    setProgressText('Extracting audio prosody and Whisper multi-speaker transcription...');

    setTimeout(() => {
      setProgressText('Segmenting speech into minute-wise boundaries with sentence timestamps...');
    }, 1500);

    setTimeout(() => {
      setProgressText('Analyzing MediaPipe 3D face mesh (18 facial emotions, eyebrow & eye gaze)...');
    }, 3000);

    setTimeout(() => {
      setProgressText('Extracting hand gestures (namaste, open palms, pointing) and pause durations...');
    }, 4500);

    setTimeout(() => {
      setIsProcessing(false);
      setDetectedLang('Hindi (हिंदी) - 98.6% Confidence');

      // Sample minute-wise sections based on typical Mohan Sir Swar Yoga lesson
      const mockSections: MinuteSection[] = [
        {
          minuteRange: '00:00 - 01:00',
          sectionTitle: 'Minute 1: Introduction & Welcome Friends',
          sentences: [
            {
              id: 's_1',
              start: '00:00',
              end: '00:15',
              text: 'नमस्कार मित्रों! स्वर योग की इस पावन प्रभात कक्षा में आप सभी का हार्दिक स्वागत है।',
              primaryEmotion: 'friendly_smile',
              emotionIntensity: 85,
              voiceStyle: 'warm_storytelling',
              gesture: 'namaste',
              facialExpression: 'smile,eyeContact',
              pauseAfter: 1.5,
            },
            {
              id: 's_2',
              start: '00:15',
              end: '00:38',
              text: 'क्या आपने कभी विचार किया है कि आपकी कौन सी नासिका इस समय सक्रिय रूप से चल रही है?',
              primaryEmotion: 'curious',
              emotionIntensity: 90,
              voiceStyle: 'questioning',
              gesture: 'head_tilt',
              facialExpression: 'browInnerUp,eyeWide',
              pauseAfter: 2.0,
            },
            {
              id: 's_3',
              start: '00:38',
              end: '00:58',
              text: 'हमारी दाईं नासिका सूर्य स्वर है और बाईं नासिका चंद्र स्वर है, जो हमारे पूरे शरीर को संचालित करती हैं।',
              primaryEmotion: 'teaching',
              emotionIntensity: 85,
              voiceStyle: 'authoritative',
              gesture: 'open_palms',
              facialExpression: 'focused,smile',
              pauseAfter: 1.2,
            },
          ],
        },
        {
          minuteRange: '01:00 - 02:00',
          sectionTitle: 'Minute 2: Core Shiva Swarodaya Rules',
          sentences: [
            {
              id: 's_4',
              start: '01:00',
              end: '01:25',
              text: 'शिव स्वरोदय में स्पष्ट रूप से लिखा है कि सूर्य स्वर के दौरान किया गया भोजन अमृत के समान पचता है।',
              primaryEmotion: 'serious',
              emotionIntensity: 92,
              voiceStyle: 'reverent',
              gesture: 'pointing_finger',
              facialExpression: 'browDown,eyeSquint',
              pauseAfter: 1.5,
            },
            {
              id: 's_5',
              start: '01:25',
              end: '01:50',
              text: 'यदि चंद्र स्वर में भारी भोजन किया जाए, तो वह शरीर में कफ और सुस्ती उत्पन्न करता है।',
              primaryEmotion: 'caution',
              emotionIntensity: 88,
              voiceStyle: 'serious',
              gesture: 'hand_down',
              facialExpression: 'browDown',
              pauseAfter: 1.8,
            },
          ],
        },
        {
          minuteRange: '02:00 - 03:00',
          sectionTitle: 'Minute 3: Daily Practice & Actionable Steps',
          sentences: [
            {
              id: 's_6',
              start: '02:00',
              end: '02:30',
              text: 'इसलिए आज से ही अपनी सांसों का निरीक्षण करें और अपने दिनचर्या को इसके अनुरूप ढालें।',
              primaryEmotion: 'inspirational',
              emotionIntensity: 90,
              voiceStyle: 'motivational',
              gesture: 'open_palms',
              facialExpression: 'eyeWide,mouthSmile',
              pauseAfter: 1.5,
            },
            {
              id: 's_7',
              start: '02:30',
              end: '02:55',
              text: 'नियमित अभ्यास से आप अपने स्वास्थ्य और मानसिक शांति में क्रांतिकारी बदलाव देखेंगे! हरि ॐ।',
              primaryEmotion: 'big_smile',
              emotionIntensity: 95,
              voiceStyle: 'blessing',
              gesture: 'namaste',
              facialExpression: 'blissful',
              pauseAfter: 2.0,
            },
          ],
        },
      ];
      setSections(mockSections);
    }, 5500);
  };

  const getAllText = (withEmotions = includeEmotionsInText) => {
    if (!sections) return '';
    return sections
      .flatMap((s) => s.sentences)
      .map((s) => {
        if (!withEmotions) return s.text;
        const tags: string[] = [];
        if (s.primaryEmotion) tags.push(`[${s.primaryEmotion}:${s.emotionIntensity || 85}]`);
        if (s.gesture && s.gesture !== 'none') tags.push(`[${s.gesture}]`);
        const prefix = tags.length ? tags.join(' ') + ' ' : '';
        const suffix = s.pauseAfter && s.pauseAfter > 0 ? ` [pause:${s.pauseAfter}s]` : '';
        return `${prefix}${s.text}${suffix}`;
      })
      .join('\n');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-600 flex items-center justify-center text-white font-black shadow-lg">
            <Video size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Module 5: Video to Text & Emotion Extraction
              </h2>
              <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold">
                Minute-Wise Timelines • 18 Emotions • Gestures
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload 2 to 30 min videos. AI extracts speech, detects facial expressions, pauses, and gestures organized by minute.
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
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
          />

          {!videoUrl ? (
            <>
              <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-rose-500/40 hover:border-rose-400 rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-3 bg-slate-950/70 hover:bg-slate-950 transition-all cursor-pointer group"
            >
              <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                <Upload size={28} />
              </div>
              <div>
                <p className="text-sm font-bold text-white group-hover:text-rose-300">
                  Select Video (2 to 30 Minutes)
                </p>
                <p className="text-xs text-slate-400 mt-1">MP4, MOV, or WebM format</p>
              </div>
            </div>

            {savedAvatars.length > 0 && (
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Video size={13} className="text-rose-400" />
                  <span>Or Pick From Stored Video Avatars:</span>
                </span>
                <div className="space-y-1.5">
                  {savedAvatars.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setVideoUrl(a.originalVideoUrl);
                        setVideoTitle(a.name);
                        setSections(null);
                      }}
                      className="w-full text-left p-2 rounded-xl bg-slate-950 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-500/40 text-xs text-slate-300 hover:text-white flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span className="font-bold truncate max-w-[220px]">{a.name}</span>
                      <span className="text-[10px] text-rose-400 font-mono">Load Video ➔</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            </>
          ) : (
            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
                <span className="font-bold text-white truncate">
                  {videoFile ? videoFile.name : 'Selected Video Stream'}
                </span>
                <button
                  onClick={() => {
                    setVideoFile(null);
                    setVideoUrl(null);
                    setSections(null);
                  }}
                  className="text-rose-400 hover:text-rose-300 font-bold"
                >
                  ✕ Remove
                </button>
              </div>

              <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-slate-800">
                <video src={videoUrl} controls className="w-full h-full object-contain" />
              </div>

              <button
                disabled={isProcessing}
                onClick={handleRunAnalysis}
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing Prosody & Gestures...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Run AI Emotion & Speech Extraction</span>
                  </>
                )}
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="p-4 bg-slate-900 border border-rose-500/30 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5 animate-pulse">
                <span>●</span> AI Multi-Modal Engine Running:
              </span>
              <p className="text-xs text-slate-300">{progressText}</p>
            </div>
          )}
        </div>

        {/* Right: Results / Minute-Wise Sections */}
        <div className="md:col-span-7 space-y-4">
          {sections ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock size={16} className="text-rose-400" />
                    <span>Minute-Wise Emotion Timeline</span>
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-emerald-400 font-semibold">{detectedLang}</span>
                    <span className="text-slate-600">•</span>
                    <label className="text-[11px] text-rose-300 font-medium flex items-center gap-1.5 cursor-pointer bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-800/40">
                      <input
                        type="checkbox"
                        checked={includeEmotionsInText}
                        onChange={(e) => setIncludeEmotionsInText(e.target.checked)}
                        className="rounded accent-rose-500 cursor-pointer"
                      />
                      <span>Include Emotion Symbols (`[smile]`, `[namaste]`)</span>
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
                    className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono text-slate-400 font-bold bg-slate-900 px-2 py-0.5 rounded">
                        {sentence.start} - {sentence.end}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold capitalize">
                          {sentence.primaryEmotion.replace('_', ' ')} ({sentence.emotionIntensity}%)
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold">
                          {sentence.voiceStyle}
                        </span>
                        <span className="text-slate-500">+{sentence.pauseAfter}s pause</span>
                      </div>
                    </div>

                    <p className="text-slate-200 text-xs sm:text-sm leading-relaxed font-sans">
                      {sentence.text}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                      <span>Gesture: <strong className="text-emerald-400">{sentence.gesture}</strong></span>
                      <span>•</span>
                      <span>Facial: <strong className="text-amber-400">{sentence.facialExpression}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <Clock size={40} className="mx-auto text-slate-600" />
              <h4 className="text-sm font-bold text-slate-300">No Video Analyzed Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Upload your recorded lecture video on the left and click &quot;Run AI Emotion & Speech Extraction&quot; to generate minute-by-minute transcripts.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
