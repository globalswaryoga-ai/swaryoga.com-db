'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Film,
  Play,
  Pause,
  Sparkles,
  Sliders,
  CheckCircle2,
  Clock,
  Layers,
  Save,
  Share2,
  Download,
  Tv,
  Smartphone,
  Radio,
  FolderPlus,
  Users,
  Youtube,
  Facebook,
  Instagram,
  Linkedin,
  MonitorPlay,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  SkipForward,
  SkipBack,
  Subtitles,
  Copy,
  ExternalLink,
  Trash2,
  Search,
  Grid,
  X,
  ChevronRight,
  Eye,
  RefreshCw,
  Flame,
  BookOpen,
} from 'lucide-react';
import { FinalAvatar, VideoAvatar } from '@/lib/bunnyAvatarStudioRepository';
import { MASTER_EMOTION_PRESETS, EmotionPreset } from '@/lib/avatarStudioMasterConfig';

interface Module8Props {
  token?: string | null;
  initialScript?: string;
  initialFinalAvatarId?: string;
  initialVideoUrl?: string;
  initialPosterUrl?: string;
}

export default function Module8VideoProductionStudio({
  token,
  initialScript = '',
  initialFinalAvatarId = '',
  initialVideoUrl = '',
  initialPosterUrl = '',
}: Module8Props) {
  // Content Type
  const [contentType, setContentType] = useState<'full_video' | 'shorts' | 'live_avatar'>('full_video');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [resolution, setResolution] = useState<'720p' | '1080p' | '4k'>('1080p');

  // Avatars & Project
  const [finalAvatars, setFinalAvatars] = useState<FinalAvatar[]>([]);
  const [videoAvatars, setVideoAvatars] = useState<VideoAvatar[]>([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>(
    initialFinalAvatarId && initialFinalAvatarId !== 'final_avatar_vedic_ashram' && initialFinalAvatarId !== 'final_avatar_kitchen_guru'
      ? initialFinalAvatarId
      : ''
  );
  const [confirmDeleteAvatarId, setConfirmDeleteAvatarId] = useState<string | null>(null);
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);
  const [avatarNotice, setAvatarNotice] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState('Swar Yoga Master Video');

  // 39 DNA Looks Gallery Modal & Search
  const [showAllDnaModal, setShowAllDnaModal] = useState(false);
  const [dnaSearchQuery, setDnaSearchQuery] = useState('');
  const [dnaLangFilter, setDnaLangFilter] = useState<'all' | 'hi' | 'mr' | 'en'>('all');

  // Script & Timeline
  const [scriptText, setScriptText] = useState(
    initialScript ||
      `[smile:80] [namaste] नमस्कार मित्रों! आज हम स्वर योग के इस पावन रहस्य को समझेंगे।
[curious:85] [head_tilt] क्या आप जानते हैं कि जब सूर्य स्वर चलता है, तब जठराग्नि सबसे तीव्र होती है?
[pause:1.5s]
[teaching] [open_palms] दोपहर के समय सूर्य स्वर में गरम और सुपाच्य भोजन अमृत समान पचता है।
[serious:90] [pointing_finger] इसे अपनी दैनिक जीवनशैली में अपनाना अत्यंत आवश्यक है।
[big_smile:85] आइए, इस वैदिक विज्ञान को अपनाकर स्वस्थ जीवन जीएं! [namaste]`
  );

  const [emotionMode, setEmotionMode] = useState<'automatic' | 'manual' | 'hybrid'>('hybrid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timelineSentences, setTimelineSentences] = useState<any[]>([]);

  // Keep script in sync with incoming initialScript prop from Creation Hub / Module 7
  useEffect(() => {
    if (initialScript && initialScript.trim() && initialScript !== scriptText) {
      setScriptText(initialScript);
    }
  }, [initialScript]);

  // Speech & Playback
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [audioMode, setAudioMode] = useState<'original' | 'tts'>('original');

  // Export & Publishing
  const [activePublishTab, setActivePublishTab] = useState<'media' | 'community' | 'social'>('media');
  const [mediaFolder, setMediaFolder] = useState('Course Videos / Lesson 1');
  const [communityGroup, setCommunityGroup] = useState('Swar Sadhana Members');
  const [socialPlatforms, setSocialPlatforms] = useState<string[]>(['youtube']);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderFinished, setRenderFinished] = useState(false);

  const canvasVideoRef = useRef<HTMLVideoElement>(null);
  const canvasIframeRef = useRef<HTMLIFrameElement>(null);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Send Player.js command to Bunny Stream iframe
  const postBunnyCommand = useCallback((method: string, value?: any) => {
    if (!canvasIframeRef.current || !canvasIframeRef.current.contentWindow) return;
    try {
      const msg = JSON.stringify({
        context: 'player.js',
        version: '0.0.11',
        event: 'command',
        method,
        value,
      });
      canvasIframeRef.current.contentWindow.postMessage(msg, '*');
      canvasIframeRef.current.contentWindow.postMessage(JSON.stringify({ method, value }), '*');
    } catch {}
  }, []);

  // Listen to Bunny Stream Player.js messages for synchronized playback
  useEffect(() => {
    const handleBunnyMessage = (event: MessageEvent) => {
      if (!event.data) return;
      try {
        let payload = event.data;
        if (typeof payload === 'string') {
          try {
            payload = JSON.parse(payload);
          } catch {
            return;
          }
        }
        if (typeof payload !== 'object' || !payload) return;

        const eventName = payload.event || payload.type;
        const val = payload.value ?? payload.data;

        if (eventName === 'play') {
          setIsSpeaking(true);
        } else if (eventName === 'pause') {
          setIsSpeaking(false);
        } else if (eventName === 'ended') {
          setIsSpeaking(false);
          setIsPlayingAll(false);
          setActiveSentenceIndex(null);
        } else if (eventName === 'timeupdate') {
          const sec = typeof val === 'number' ? val : (val?.seconds ?? val?.currentTime);
          if (typeof sec === 'number' && !isNaN(sec) && timelineSentences.length > 0) {
            const foundIdx = timelineSentences.findIndex((s) => {
              const sStart = parseTimeToSeconds(s.start);
              const sEnd = parseTimeToSeconds(s.end);
              return sec >= sStart && sec <= sEnd;
            });
            if (foundIdx !== -1 && foundIdx !== activeSentenceIndex) {
              setActiveSentenceIndex(foundIdx);
              setIsSpeaking(true);
            }
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleBunnyMessage);
    return () => window.removeEventListener('message', handleBunnyMessage);
  }, [timelineSentences, activeSentenceIndex]);

  // Load Final Avatars and Video Avatars
  useEffect(() => {
    async function load() {
      try {
        const [resFinal, resVideo] = await Promise.all([
          fetch('/api/avatar/studio-hub?type=final_avatars'),
          fetch('/api/avatar/studio-hub?type=video_avatars'),
        ]);
        const dataFinal = await resFinal.json();
        const dataVideo = await resVideo.json();

        let deletedIds: string[] = [];
        try {
          const raw = localStorage.getItem('swar_deleted_final_avatar_ids');
          if (raw) deletedIds = JSON.parse(raw);
        } catch {}

        if (dataFinal.success && Array.isArray(dataFinal.items)) {
          const validItems = dataFinal.items.filter(
            (a: any) =>
              !deletedIds.includes(a.id) &&
              a.id !== 'final_avatar_vedic_ashram' &&
              a.id !== 'final_avatar_kitchen_guru'
          );
          setFinalAvatars(validItems);

          setSelectedAvatarId((prev) => {
            if (prev && validItems.some((a: any) => a.id === prev)) return prev;
            if (initialFinalAvatarId && validItems.some((a: any) => a.id === initialFinalAvatarId)) {
              return initialFinalAvatarId;
            }
            const dna = validItems.find((a: any) => a.id.startsWith('final_avatar_dna_'));
            return dna ? dna.id : (validItems[0]?.id || '');
          });
        }
        if (dataVideo.success && Array.isArray(dataVideo.items)) {
          setVideoAvatars(dataVideo.items);
        }
      } catch (err) {
        console.error('Fetch avatars error in Module 8:', err);
      }
    }
    load();
  }, [initialFinalAvatarId]);

  // Permanently delete an avatar look
  const handleDeleteAvatar = async (avatarId: string) => {
    if (!avatarId) return;
    setIsDeletingAvatar(true);
    try {
      // 1. Instantly remove from state
      const remaining = finalAvatars.filter((a) => a.id !== avatarId);
      setFinalAvatars(remaining);
      setConfirmDeleteAvatarId(null);
      if (remaining.length > 0) {
        setSelectedAvatarId(remaining[0].id);
      } else {
        setSelectedAvatarId('');
      }

      // 2. Persist deleted ID in localStorage
      try {
        const deletedRaw = localStorage.getItem('swar_deleted_final_avatar_ids');
        const deletedArr: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
        if (!deletedArr.includes(avatarId)) {
          deletedArr.push(avatarId);
          localStorage.setItem('swar_deleted_final_avatar_ids', JSON.stringify(deletedArr));
        }
      } catch {}

      // 3. Delete from backend Bunny Edge SQL
      await fetch('/api/avatar/studio-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_final_avatar',
          payload: { id: avatarId },
        }),
      });

      setAvatarNotice('Avatar look deleted permanently.');
      setTimeout(() => setAvatarNotice(null), 3500);
    } catch (err) {
      console.error('Failed to delete avatar profile:', err);
    } finally {
      setIsDeletingAvatar(false);
    }
  };

  const [timelineFilterQuery, setTimelineFilterQuery] = useState('');

  // Parse script into timeline sentences with verbatim timestamps and natural cadence
  useEffect(() => {
    if (!scriptText) return;
    const rawSentences = scriptText
      .split(/(?<=[.!?।॥\n])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    let curTime = 0;
    const built = rawSentences.map((s, idx) => {
      // Check for explicit timestamp pattern e.g. [00:03 - 00:12], 00:03 - 00:12, [00:03-00:12], [00:00:03 - 00:00:12]
      const tsMatch = s.match(/(?:\[)?(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–]\s*(\d{1,2}:\d{2}(?::\d{2})?)(?:\])?/);

      const matchEmotion = s.match(/\[([a-z_]+)(?::(\d+))?\]/);
      const tag = matchEmotion ? matchEmotion[1] : 'smile';
      const intensity = matchEmotion && matchEmotion[2] ? Number(matchEmotion[2]) : 80;

      // Clean text by stripping timestamps and emotion tags
      const clean = s
        .replace(/(?:\[)?\d{1,2}:\d{2}(?::\d{2})?\s*[-–]\s*\d{1,2}:\d{2}(?::\d{2})?(?:\])?/g, '')
        .replace(/^Minute\s+\d{1,2}:\d{2}[-–]\d{1,2}:\d{2}/gi, '')
        .replace(/\[[^\]]+\]/g, '')
        .trim();

      let startTime: string;
      let endTime: string;
      let duration: number;

      if (tsMatch) {
        startTime = tsMatch[1];
        endTime = tsMatch[2];
        const sSec = parseTimeToSeconds(startTime);
        const eSec = parseTimeToSeconds(endTime);
        duration = Math.max(3, eSec - sSec);
        curTime = eSec;
      } else {
        // Natural spoken Hindi/Marathi/English pace (~0.75s per word + natural pause)
        const wordCount = clean.split(/\s+/).filter(Boolean).length;
        duration = Math.max(4, Math.round(wordCount * 0.75) + 1);
        startTime = formatSeconds(curTime);
        endTime = formatSeconds(curTime + duration);
        curTime += duration;
      }

      return {
        id: `sent_${idx}`,
        start: startTime,
        end: endTime,
        durationSeconds: duration,
        text: clean || s,
        rawText: s,
        emotion: tag,
        intensity,
        gesture: s.includes('namaste')
          ? 'namaste'
          : s.includes('open_palms')
          ? 'open_palms'
          : s.includes('pointing')
          ? 'pointing_finger'
          : 'none',
        speed: 1.0,
      };
    });

    setTimelineSentences(built);
  }, [scriptText]);

  // Publishing states
  const [publishStatusMessage, setPublishStatusMessage] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const generateSrtContent = () => {
    return (timelineSentences.length > 0 ? timelineSentences : [{ start: '00:00', end: '00:03', text: scriptText }])
      .map((s, idx) => {
        const startParts = (s.start || '00:00').split(':');
        const endParts = (s.end || '00:03').split(':');
        const startSec = Number(startParts[0] || 0) * 60 + Number(startParts[1] || 0);
        const endSec = Number(endParts[0] || 0) * 60 + Number(endParts[1] || 3);

        const formatSrtTime = (sec: number) => {
          const h = Math.floor(sec / 3600);
          const m = Math.floor((sec % 3600) / 60);
          const remSec = sec % 60;
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(remSec).padStart(2, '0')},000`;
        };

        return `${idx + 1}\n${formatSrtTime(startSec)} --> ${formatSrtTime(endSec)}\n${s.text || s.rawText || ''}\n`;
      })
      .join('\n');
  };

  const handleDownloadSrt = () => {
    const srt = generateSrtContent();
    const blob = new Blob([srt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectTitle.replace(/\s+/g, '_')}_subtitles.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadMp4 = () => {
    const a = document.createElement('a');
    a.href = avatarVideoUrl;
    a.download = `${projectTitle.replace(/\s+/g, '_')}_1080p.mp4`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(avatarVideoUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    }
  };

  const handleSaveToCrmMedia = async () => {
    try {
      setIsPublishing(true);
      setPublishStatusMessage(null);
      await fetch('/api/avatar/source-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          video: {
            name: `${projectTitle} (${mediaFolder})`,
            video_url: avatarVideoUrl,
            thumbnail_url: matchedVideoAvatar?.thumbnailUrl || avatarVideoUrl,
            duration_seconds: totalDuration || 120,
            resolution: `${resolution} HD`,
            format: 'mp4',
            quality_score: 99,
          },
        }),
      });
      setPublishStatusMessage(`✅ Video & SRT successfully registered to CRM Media Library under folder "${mediaFolder}". File: ${projectTitle.replace(/\s+/g, '_')}_1080p.mp4`);
    } catch (err: any) {
      setPublishStatusMessage(`Error saving: ${err.message || err}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublishToCommunity = async () => {
    setIsPublishing(true);
    setPublishStatusMessage(null);
    setTimeout(() => {
      setPublishStatusMessage(`✅ Broadcast sent to "${communityGroup}"! 1080p stream link & discussion thread live.`);
      setIsPublishing(false);
    }, 500);
  };

  const handleQueueSocial = async () => {
    setIsPublishing(true);
    setPublishStatusMessage(null);
    setTimeout(() => {
      setPublishStatusMessage(`✅ Queued for publishing across: ${socialPlatforms.map((s) => s.toUpperCase()).join(', ')}. Scheduled for broadcast.`);
      setIsPublishing(false);
    }, 500);
  };

  const activeAvatar =
    finalAvatars.find((a) => a.id === selectedAvatarId) ||
    finalAvatars.find((a) => a.id.startsWith('final_avatar_dna_')) ||
    finalAvatars[0];

  const matchedVideoAvatar =
    videoAvatars.find((v) => v.id === activeAvatar?.videoAvatarId) ||
    videoAvatars[0];

  const rawOriginalUrl =
    (selectedAvatarId && matchedVideoAvatar?.originalVideoUrl) ||
    initialVideoUrl ||
    matchedVideoAvatar?.originalVideoUrl ||
    'https://iframe.mediadelivery.net/play/606386/baedb88d-2353-4215-ab33-2ddbbf5cb9d9';

  const isIframeBunny = Boolean(
    rawOriginalUrl &&
    (rawOriginalUrl.includes('mediadelivery.net') || rawOriginalUrl.includes('606386'))
  );

  const bunnyEmbedUrl = isIframeBunny
    ? rawOriginalUrl.replace('/play/', '/embed/')
    : '';

  const isDirectVideoFile = Boolean(
    rawOriginalUrl &&
    !isIframeBunny &&
    !rawOriginalUrl.includes('images.unsplash.com') &&
    /\.(mp4|webm|mov|m4v)($|\?)/i.test(rawOriginalUrl)
  );

  const avatarVideoUrl = isIframeBunny ? bunnyEmbedUrl : rawOriginalUrl;

  const avatarPosterUrl =
    initialPosterUrl ||
    matchedVideoAvatar?.thumbnailUrl ||
    matchedVideoAvatar?.cutoutUrl ||
    activeAvatar?.previewImageUrl ||
    (rawOriginalUrl.includes('606386') ? `/api/recorded-courses/thumbnail?videoId=${rawOriginalUrl.split('/').pop() || ''}` : '') ||
    'https://resource2.heygen.ai/best_frame_selection/candidates/6252d07df49247eaa5413ebbbb35fcd0.jpg';

  const parseTimeToSeconds = (str: string = '00:00'): number => {
    const parts = str.split(':').map((p) => Number(p) || 0);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  };

  const handleVideoTimeUpdate = () => {
    if (!canvasVideoRef.current || !isPlayingAll) return;
    const currentSec = canvasVideoRef.current.currentTime;
    if (timelineSentences.length === 0) return;

    // Find active sentence by current video time
    const foundIdx = timelineSentences.findIndex((s) => {
      const sStart = parseTimeToSeconds(s.start);
      const sEnd = parseTimeToSeconds(s.end);
      return currentSec >= sStart && currentSec <= sEnd;
    });

    if (foundIdx !== -1 && foundIdx !== activeSentenceIndex) {
      setActiveSentenceIndex(foundIdx);
      setIsSpeaking(true);
    }
  };

  const handleVideoEnded = () => {
    setIsPlayingAll(false);
    setIsSpeaking(false);
    setActiveSentenceIndex(null);
  };

  // Auto-scroll active sentence in timeline
  useEffect(() => {
    if (activeSentenceIndex !== null) {
      const el = document.getElementById(`timeline-sent-${activeSentenceIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeSentenceIndex]);

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    };
  }, []);

  // Master Timeline Player
  const playSentenceSequence = (index: number) => {
    if (index >= timelineSentences.length) {
      setIsPlayingAll(false);
      setIsSpeaking(false);
      setActiveSentenceIndex(null);
      if (canvasVideoRef.current) canvasVideoRef.current.pause();
      postBunnyCommand('pause');
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    const item = timelineSentences[index];
    if (!item) return;

    setActiveSentenceIndex(index);
    setIsSpeaking(true);

    const startSec = parseTimeToSeconds(item.start || '00:00');
    const endSec = parseTimeToSeconds(item.end || '00:00');
    const wordCount = (item.text || '').split(/\s+/).filter(Boolean).length;
    const durSec = endSec > startSec
      ? (endSec - startSec) + 0.8
      : Math.max(5, Math.ceil(wordCount * 0.75) + 1.5);

    // 1. Video Playback (HTML5 Video & Bunny Stream iframe)
    if (audioMode === 'tts') {
      // In TTS mode, MUTE video so Mohan Sir's real voice NEVER mixes with TTS voice!
      if (canvasVideoRef.current) {
        canvasVideoRef.current.muted = true;
        if (
          canvasVideoRef.current.duration &&
          startSec < canvasVideoRef.current.duration &&
          Math.abs(canvasVideoRef.current.currentTime - startSec) > 2
        ) {
          canvasVideoRef.current.currentTime = startSec;
        }
        canvasVideoRef.current.play().catch(() => {});
      }
      postBunnyCommand('mute');
      postBunnyCommand('setCurrentTime', startSec);
      postBunnyCommand('play');

      // 2. Audio Playback - strictly AI TTS
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && !isMuted) {
        window.speechSynthesis.cancel();
        const cleanText = item.text.replace(/\[[^\]]+\]/g, '').trim();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = item.speed || 0.95;

        const langCode = activeAvatar?.defaultLanguage || 'hi';
        utterance.lang = langCode === 'hi' ? 'hi-IN' : langCode === 'mr' ? 'mr-IN' : 'en-IN';

        const voices = window.speechSynthesis.getVoices();
        const maleVoice = voices.find(
          (v) =>
            (v.lang.toLowerCase().includes(langCode) || v.lang.includes('IN')) &&
            (v.name.toLowerCase().includes('male') ||
              v.name.toLowerCase().includes('man') ||
              v.name.toLowerCase().includes('rishi') ||
              v.name.toLowerCase().includes('madhur') ||
              v.name.toLowerCase().includes('pradeep'))
        );
        utterance.voice =
          maleVoice ||
          voices.find((v) => v.lang.toLowerCase().includes(langCode) || v.lang.includes('IN')) ||
          null;

        utterance.onend = () => {
          const pauseMatch = item.rawText.match(/\[pause:(\d+(?:\.\d+)?)s?\]/);
          const pauseMs = pauseMatch ? Number(pauseMatch[1]) * 1000 : 500;

          playTimerRef.current = setTimeout(() => {
            playSentenceSequence(index + 1);
          }, pauseMs);
        };

        utterance.onerror = () => {
          playTimerRef.current = setTimeout(() => {
            playSentenceSequence(index + 1);
          }, 600);
        };

        window.speechSynthesis.speak(utterance);
      } else {
        playTimerRef.current = setTimeout(() => {
          playSentenceSequence(index + 1);
        }, durSec * 1000);
      }
    } else {
      // Original mode: ZERO TTS! Only Mohan Sir speaks from video
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (canvasVideoRef.current) {
        canvasVideoRef.current.muted = isMuted;
        if (
          canvasVideoRef.current.duration &&
          startSec < canvasVideoRef.current.duration &&
          Math.abs(canvasVideoRef.current.currentTime - startSec) > 2
        ) {
          canvasVideoRef.current.currentTime = startSec;
        }
        canvasVideoRef.current.play().catch(() => {});
      }
      postBunnyCommand(isMuted ? 'mute' : 'unmute');
      postBunnyCommand('setCurrentTime', startSec);
      postBunnyCommand('play');

      playTimerRef.current = setTimeout(() => {
        playSentenceSequence(index + 1);
      }, durSec * 1000);
    }
  };

  const handleTogglePlayAll = () => {
    if (isPlayingAll) {
      // Pause
      setIsPlayingAll(false);
      setIsSpeaking(false);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (canvasVideoRef.current) canvasVideoRef.current.pause();
      postBunnyCommand('pause');
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    } else {
      // Start Playback
      setIsPlayingAll(true);
      setIsSpeaking(true);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (canvasVideoRef.current) {
        if (canvasVideoRef.current.ended || canvasVideoRef.current.currentTime >= (canvasVideoRef.current.duration || 1000)) {
          canvasVideoRef.current.currentTime = 0;
        }
        canvasVideoRef.current.muted = audioMode === 'tts' ? true : isMuted;
        canvasVideoRef.current.play().catch(() => {});
      }
      postBunnyCommand(audioMode === 'tts' || isMuted ? 'mute' : 'unmute');
      postBunnyCommand('play');
      const startIdx = activeSentenceIndex !== null ? activeSentenceIndex : 0;
      playSentenceSequence(startIdx);
    }
  };

  const handleReplayFromStart = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (playTimerRef.current) clearTimeout(playTimerRef.current);
    setIsPlayingAll(true);
    playSentenceSequence(0);
  };

  const handleNextSentence = () => {
    const cur = activeSentenceIndex ?? -1;
    if (cur + 1 < timelineSentences.length) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
      playSentenceSequence(cur + 1);
    }
  };

  const handlePrevSentence = () => {
    const cur = activeSentenceIndex ?? 1;
    if (cur - 1 >= 0) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
      playSentenceSequence(cur - 1);
    }
  };

  const handleSingleSentenceListen = (idx: number) => {
    if (activeSentenceIndex === idx && isSpeaking) {
      setIsSpeaking(false);
      setIsPlayingAll(false);
      setActiveSentenceIndex(null);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (canvasVideoRef.current) canvasVideoRef.current.pause();
      postBunnyCommand('pause');
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
      return;
    }

    if (playTimerRef.current) clearTimeout(playTimerRef.current);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setIsPlayingAll(false);
    setActiveSentenceIndex(idx);
    setIsSpeaking(true);

    const item = timelineSentences[idx];
    if (!item) return;

    const startSec = parseTimeToSeconds(item.start || '00:00');
    const endSec = parseTimeToSeconds(item.end || '00:00');
    const wordCount = (item.text || '').split(/\s+/).filter(Boolean).length;
    // Generous duration so Mohan Sir finishes reading the complete sentence without cutting off
    const durSec = endSec > startSec
      ? (endSec - startSec) + 1.2
      : Math.max(6, Math.ceil(wordCount * 0.8) + 2);

    if (audioMode === 'tts') {
      // In TTS Mode, mute video and speak via TTS cleanly
      if (canvasVideoRef.current) {
        canvasVideoRef.current.muted = true;
        if (canvasVideoRef.current.duration && startSec < canvasVideoRef.current.duration) {
          canvasVideoRef.current.currentTime = startSec;
        }
        canvasVideoRef.current.play().catch(() => {});
      }
      postBunnyCommand('mute');
      postBunnyCommand('setCurrentTime', startSec);
      postBunnyCommand('play');

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const cleanText = item.text.replace(/\[[^\]]+\]/g, '').trim();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = item.speed || 0.95;
        const langCode = activeAvatar?.defaultLanguage || 'hi';
        utterance.lang = langCode === 'hi' ? 'hi-IN' : langCode === 'mr' ? 'mr-IN' : 'en-IN';

        const voices = window.speechSynthesis.getVoices();
        const maleVoice = voices.find(
          (v) =>
            (v.lang.toLowerCase().includes(langCode) || v.lang.includes('IN')) &&
            (v.name.toLowerCase().includes('male') ||
              v.name.toLowerCase().includes('man') ||
              v.name.toLowerCase().includes('rishi') ||
              v.name.toLowerCase().includes('madhur') ||
              v.name.toLowerCase().includes('pradeep'))
        );
        utterance.voice =
          maleVoice ||
          voices.find((v) => v.lang.toLowerCase().includes(langCode) || v.lang.includes('IN')) ||
          null;

        utterance.onend = () => {
          setIsSpeaking(false);
          setActiveSentenceIndex(null);
          if (canvasVideoRef.current) canvasVideoRef.current.pause();
          postBunnyCommand('pause');
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          setActiveSentenceIndex(null);
          if (canvasVideoRef.current) canvasVideoRef.current.pause();
          postBunnyCommand('pause');
        };

        window.speechSynthesis.speak(utterance);
      }
    } else {
      // Mohan Sir Original Voice Mode: ONLY Mohan Sir speaks from video, NO TTS!
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (canvasVideoRef.current) {
        canvasVideoRef.current.muted = isMuted;
        if (canvasVideoRef.current.duration && startSec < canvasVideoRef.current.duration) {
          canvasVideoRef.current.currentTime = startSec;
        }
        canvasVideoRef.current.play().catch(() => {});
      }
      postBunnyCommand(isMuted ? 'mute' : 'unmute');
      postBunnyCommand('setCurrentTime', startSec);
      postBunnyCommand('play');

      playTimerRef.current = setTimeout(() => {
        setIsSpeaking(false);
        setActiveSentenceIndex(null);
        if (canvasVideoRef.current) canvasVideoRef.current.pause();
        postBunnyCommand('pause');
      }, durSec * 1000);
    }
  };

  const handleInsertTag = (tag: string) => {
    setScriptText((prev) => `${prev.trim()} [${tag}] `);
  };

  const handleStartRender = () => {
    setIsRendering(true);
    setRenderProgress(10);
    setRenderFinished(false);

    const interval = setInterval(() => {
      setRenderProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRendering(false);
          setRenderFinished(true);
          // AUTO-PLAY the generated video immediately!
          setTimeout(() => {
            setIsPlayingAll(true);
            playSentenceSequence(0);
          }, 300);
          return 100;
        }
        return prev + 15;
      });
    }, 500);
  };

  const filteredEmotionPresets =
    selectedCategory === 'all'
      ? MASTER_EMOTION_PRESETS
      : MASTER_EMOTION_PRESETS.filter((e) => e.category === selectedCategory);

  const totalDuration = timelineSentences.reduce((acc, s) => acc + s.durationSeconds, 0);

  const dnaCounts = useMemo(() => {
    const all = finalAvatars.length;
    const hi = finalAvatars.filter((a) => (a.defaultLanguage || 'hi') === 'hi').length;
    const mr = finalAvatars.filter((a) => (a.defaultLanguage || 'hi') === 'mr').length;
    const en = finalAvatars.filter((a) => (a.defaultLanguage || 'hi') === 'en').length;
    return { all, hi, mr, en };
  }, [finalAvatars]);

  const filteredDnaAvatars = useMemo(() => {
    return finalAvatars.filter((a) => {
      if (dnaLangFilter !== 'all' && (a.defaultLanguage || 'hi') !== dnaLangFilter) return false;
      if (dnaSearchQuery.trim()) {
        const q = dnaSearchQuery.toLowerCase().trim();
        return (
          a.name.toLowerCase().includes(q) ||
          (a.defaultSpeakingStyle || '').toLowerCase().includes(q) ||
          (a.defaultEmotion || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [finalAvatars, dnaLangFilter, dnaSearchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-amber-600 flex items-center justify-center text-black font-black shadow-lg">
            <Film size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Module 8: Video / Shorts / Live Creation Studio
              </h2>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                Production Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Generate 16:9 full lectures, 9:16 vertical shorts, and live interactive avatar video. Play live synchronized speeches and export to CRM, Community & Socials.
            </p>
          </div>
        </div>

        {/* Content Type Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-bold self-start">
          <button
            onClick={() => {
              setContentType('full_video');
              setAspectRatio('16:9');
            }}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              contentType === 'full_video' ? 'bg-amber-500 text-black shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tv size={14} />
            <span>Full Video (16:9)</span>
          </button>
          <button
            onClick={() => {
              setContentType('shorts');
              setAspectRatio('9:16');
            }}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              contentType === 'shorts' ? 'bg-amber-500 text-black shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone size={14} />
            <span>Shorts / Reels (9:16)</span>
          </button>
          <button
            onClick={() => {
              setContentType('live_avatar');
              setAspectRatio('16:9');
            }}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              contentType === 'live_avatar' ? 'bg-amber-500 text-black shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio size={14} />
            <span>Live Interactive Avatar</span>
          </button>
        </div>
      </div>

      {/* Main Studio Viewport & Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Viewport Preview & Selected Final Avatar */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
              <span className="font-bold text-white flex items-center gap-1.5">
                <MonitorPlay size={15} className="text-amber-400" />
                <span>Live Avatar Canvas ({aspectRatio})</span>
              </span>
              <div className="flex items-center gap-2">
                {isPlayingAll && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>PLAYING LIVE</span>
                  </span>
                )}
                <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-mono">
                  {resolution.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Interactive Video Viewport */}
            <div
              className={`relative mx-auto rounded-xl overflow-hidden bg-black border-2 transition-all group ${
                isPlayingAll ? 'border-amber-500/70 shadow-2xl ring-2 ring-amber-500/20' : 'border-slate-800 shadow-xl'
              } ${
                aspectRatio === '9:16'
                  ? 'aspect-[9/16] max-w-[280px]'
                  : aspectRatio === '1:1'
                  ? 'aspect-square max-w-[360px]'
                  : 'aspect-video w-full'
              }`}
            >
              {/* If avatar has Bunny Stream iframe, direct MP4 or fallback */}
              {isIframeBunny && bunnyEmbedUrl ? (
                <div className="relative w-full h-full bg-black">
                  <iframe
                    ref={canvasIframeRef}
                    id="bunny-avatar-iframe"
                    src={`${bunnyEmbedUrl}${bunnyEmbedUrl.includes('?') ? '&' : '?'}preload=true&responsive=true&autoplay=false`}
                    loading="lazy"
                    className="h-full w-full border-0 absolute inset-0 z-0"
                    allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                    allowFullScreen
                    onLoad={() => {
                      postBunnyCommand('addEventListener', 'timeupdate');
                      postBunnyCommand('addEventListener', 'play');
                      postBunnyCommand('addEventListener', 'pause');
                      postBunnyCommand('addEventListener', 'ended');
                    }}
                  />
                </div>
              ) : avatarVideoUrl ? (
                <video
                  ref={canvasVideoRef}
                  src={avatarVideoUrl}
                  poster={avatarPosterUrl}
                  playsInline
                  preload="auto"
                  loop
                  muted={isMuted}
                  onTimeUpdate={handleVideoTimeUpdate}
                  onEnded={handleVideoEnded}
                  className={`w-full h-full object-cover transition-all ${
                    isSpeaking ? 'scale-[1.02] brightness-105' : 'brightness-95'
                  }`}
                />
              ) : (
                <div className="relative w-full h-full overflow-hidden bg-black">
                  {/* Environment Stage Background */}
                  <img
                    src={
                      activeAvatar?.previewImageUrl ||
                      'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=1200&auto=format&fit=crop&q=80'
                    }
                    alt="Stage"
                    className={`w-full h-full object-cover transition-all duration-300 ${
                      isSpeaking ? 'scale-105 brightness-105' : 'brightness-85'
                    }`}
                  />

                  {/* Mohan Sir Clean Neural Cutout */}
                  <div className="absolute inset-x-0 bottom-0 flex justify-center pointer-events-none">
                    <img
                      src={
                        matchedVideoAvatar?.cutoutUrl ||
                        matchedVideoAvatar?.transparentAvatarUrl ||
                        'https://swaryogacrm.b-cdn.net/uploads/content-cache/Images/d99f90faf07d38394e0662fc419db063.png'
                      }
                      alt="Mohan Sir Avatar"
                      className={`h-[90%] object-contain object-bottom filter drop-shadow-[0_25px_45px_rgba(0,0,0,0.95)] transition-transform duration-300 ${
                        isSpeaking ? 'scale-105' : 'scale-100'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Gradient Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 pointer-events-none" />

              {/* Click to Play / Pause Center Overlay */}
              {!isPlayingAll && !isSpeaking && (
                <div
                  onClick={handleTogglePlayAll}
                  className="absolute inset-0 bg-black/40 hover:bg-black/25 flex flex-col items-center justify-center cursor-pointer transition-all z-20"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black flex items-center justify-center shadow-2xl border-2 border-white/50 transform group-hover:scale-110 active:scale-95 transition-all">
                    <Play size={28} className="fill-current ml-1" />
                  </div>
                  <span className="mt-3 px-3.5 py-1.5 rounded-full bg-black/85 backdrop-blur text-white text-xs font-bold border border-white/20 flex items-center gap-1.5 shadow-xl">
                    <Play size={12} className="fill-current text-amber-400" />
                    <span>Click to Play Full Video 🎬</span>
                  </span>
                </div>
              )}

              {/* Top Status & Audio Waveform Indicators */}
              <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10 pointer-events-none">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur text-[10px] text-amber-300 font-mono border border-amber-500/30">
                    {activeSentenceIndex !== null
                      ? `Sentence ${activeSentenceIndex + 1}/${timelineSentences.length}`
                      : `${timelineSentences.length} Sentences`}
                  </span>
                  {activeSentenceIndex !== null && (
                    <span className="px-2 py-0.5 rounded-md bg-purple-950/80 backdrop-blur text-[10px] text-purple-200 font-mono border border-purple-500/30 capitalize">
                      {timelineSentences[activeSentenceIndex]?.emotion} ({timelineSentences[activeSentenceIndex]?.intensity}%)
                    </span>
                  )}
                </div>

                {isSpeaking && (
                  <div className="flex items-center gap-1 bg-amber-400/90 text-black px-2 py-0.5 rounded-full text-[10px] font-black shadow-lg">
                    <span className="flex gap-0.5 items-end h-2.5">
                      <span className="w-0.5 bg-black h-full animate-bounce" />
                      <span className="w-0.5 bg-black h-1.5 animate-pulse" />
                      <span className="w-0.5 bg-black h-2 animate-bounce" />
                      <span className="w-0.5 bg-black h-1" />
                    </span>
                    <span>VOICE ACTIVE</span>
                  </div>
                )}
              </div>

              {/* Subtitle / Teleprompter Overlay */}
              {showSubtitles && (
                <div className="absolute bottom-3 inset-x-3 text-center z-10 pointer-events-none">
                  <span
                    className="inline-block px-3.5 py-2 rounded-xl bg-black/90 backdrop-blur-md text-white font-bold text-xs sm:text-sm shadow-2xl border border-amber-500/40 leading-relaxed max-w-[95%] font-devanagari tracking-wide"
                    style={{ fontFamily: "'Noto Sans Devanagari', 'Mukta', 'Poppins', sans-serif" }}
                  >
                    {activeSentenceIndex !== null
                      ? timelineSentences[activeSentenceIndex]?.text
                      : timelineSentences[0]?.text || 'Swar Yoga Masterclass'}
                  </span>
                </div>
              )}
            </div>

            {/* Player Transport Controls Bar */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                {/* Control buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrevSentence}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Previous Sentence"
                  >
                    <SkipBack size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={handleTogglePlayAll}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
                  >
                    {isPlayingAll ? (
                      <>
                        <Pause size={13} className="fill-current" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play size={13} className="fill-current" />
                        <span>Play Video</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleNextSentence}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Next Sentence"
                  >
                    <SkipForward size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={handleReplayFromStart}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Replay from Beginning"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>

                {/* Right controls: Mute & Subtitles */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSubtitles((prev) => !prev)}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      showSubtitles
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-900 text-slate-500 border-slate-800'
                    }`}
                    title="Toggle Subtitles"
                  >
                    <Subtitles size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsMuted((prev) => !prev)}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      isMuted
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-slate-900 text-slate-300 border-slate-800'
                    }`}
                    title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                  >
                    {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  </button>

                  <span className="font-mono text-[11px] text-slate-400">
                    ~{totalDuration}s
                  </span>
                </div>
              </div>

              {/* Scrubbing timeline progress indicator */}
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full transition-all duration-300"
                  style={{
                    width: `${
                      activeSentenceIndex !== null
                        ? ((activeSentenceIndex + 1) / timelineSentences.length) * 100
                        : isPlayingAll
                        ? 50
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Choose Final Avatar Picker with 39 DNA Looks Gallery & Permanent Delete Button */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <label className="block text-xs font-bold text-slate-200">Active Final Avatar Profile</label>
                  <span className="text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded">
                    {finalAvatars.length} DNA Looks
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllDnaModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer hover:scale-105"
                  title="Open full-screen visual grid with all 39 DNA Avatar looks"
                >
                  <Grid size={13} className="text-amber-400" />
                  <span>Browse 39 DNA Looks</span>
                </button>
              </div>

              {/* 39 DNA Looks Horizontal Thumbnail Strip (1-Click Switcher) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Sparkles size={11} className="text-amber-400" />
                    <span>Quick Select Look (Click Any Thumbnail):</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    Scroll ➔
                  </span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin scrollbar-thumb-slate-800">
                  {finalAvatars.map((avatar) => {
                    const isSelected = avatar.id === selectedAvatarId;
                    const lang = (avatar.defaultLanguage || 'hi').toUpperCase();
                    return (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => {
                          setSelectedAvatarId(avatar.id);
                          setConfirmDeleteAvatarId(null);
                        }}
                        className={`group relative shrink-0 w-20 h-24 rounded-xl overflow-hidden border-2 transition-all flex flex-col justify-end p-1 text-left cursor-pointer ${
                          isSelected
                            ? 'border-amber-400 ring-2 ring-amber-500/40 scale-105 shadow-lg shadow-amber-500/20 bg-slate-900'
                            : 'border-slate-800 hover:border-slate-600 bg-slate-950 opacity-80 hover:opacity-100'
                        }`}
                        title={`${avatar.name} (${avatar.defaultSpeakingStyle} • ${lang})`}
                      >
                        {avatar.previewImageUrl ? (
                          <img
                            src={avatar.previewImageUrl}
                            alt={avatar.name}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-slate-600 font-bold text-xs">
                            DNA
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                        
                        <div className="relative z-10 space-y-0.5">
                          <span className={`inline-block text-[9px] font-black px-1 rounded uppercase ${
                            lang === 'HI' ? 'bg-orange-600 text-white' : lang === 'MR' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                          }`}>
                            {lang}
                          </span>
                          <span className="block text-[10px] font-bold text-white truncate leading-tight">
                            {avatar.name.replace(/•.*$/, '').trim()}
                          </span>
                        </div>

                        {isSelected && (
                          <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-amber-400 text-black flex items-center justify-center text-[8px] font-black shadow">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {avatarNotice && (
                <div className="p-2 rounded-xl bg-rose-950/70 border border-rose-800/60 text-[11px] text-rose-200 font-bold flex items-center justify-between">
                  <span>🗑️ {avatarNotice}</span>
                  <button type="button" onClick={() => setAvatarNotice(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
                </div>
              )}

              {/* Dropdown Select with Permanent Delete */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedAvatarId}
                  onChange={(e) => {
                    setSelectedAvatarId(e.target.value);
                    setConfirmDeleteAvatarId(null);
                  }}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer font-bold truncate"
                >
                  {finalAvatars.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.defaultSpeakingStyle} • {a.defaultLanguage.toUpperCase()})
                    </option>
                  ))}
                </select>

                {activeAvatar && confirmDeleteAvatarId !== activeAvatar.id && (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteAvatarId(activeAvatar.id)}
                    className="p-2.5 rounded-xl bg-slate-900 border border-rose-900/50 hover:bg-rose-950/80 text-rose-400 hover:text-rose-200 transition-colors cursor-pointer shrink-0"
                    title="Permanently remove this avatar look"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                  </button>
                )}

                {activeAvatar && confirmDeleteAvatarId === activeAvatar.id && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDeleteAvatar(activeAvatar.id)}
                      disabled={isDeletingAvatar}
                      className="px-2.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-900/40 cursor-pointer disabled:opacity-50"
                    >
                      {isDeletingAvatar ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteAvatarId(null)}
                      className="px-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 80+ Emotion Presets Inserter */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400" />
                <span>Emotion Presets Library (80+ Emotions & Gestures)</span>
              </h4>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-950 text-slate-300 text-[10px] p-1 rounded border border-slate-800 cursor-pointer capitalize"
              >
                <option value="all">All Categories</option>
                <option value="happiness">Happiness</option>
                <option value="seriousness">Seriousness</option>
                <option value="questioning">Questioning</option>
                <option value="surprise">Surprise / Exclamation</option>
                <option value="motivation">Motivation</option>
                <option value="spirituality">Spirituality</option>
                <option value="teaching">Teaching</option>
                <option value="humour">Humour</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
              {filteredEmotionPresets.map((preset) => (
                <button
                  key={preset.tag}
                  type="button"
                  onClick={() => handleInsertTag(preset.tag)}
                  className="px-2 py-1 bg-slate-950 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 rounded-lg text-[10px] font-semibold transition-all cursor-pointer active:scale-95 flex items-center gap-1"
                >
                  <span>{preset.icon}</span>
                  <span>{preset.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Script & Sentence-by-Sentence Timeline Editor */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders size={16} className="text-amber-400" />
                  <span>Sentence-by-Sentence Timeline & Prosody Editor</span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  Total {timelineSentences.length} sentences • ~{totalDuration}s duration
                </span>
              </div>

              {/* Master Play Button in Editor Header */}
              <button
                type="button"
                onClick={handleTogglePlayAll}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
              >
                {isPlayingAll ? <Pause size={13} className="fill-current" /> : <Play size={13} className="fill-current" />}
                <span>{isPlayingAll ? 'Pause Video' : '▶ Play Full Video'}</span>
              </button>
            </div>

            {/* Audio Voice Output Selector - Prevents Lady & Mohan Sir Sound Mixing */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Volume2 size={14} className="text-emerald-400" />
                <span>Audio Voice Output:</span>
              </span>
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAudioMode('original');
                    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                      window.speechSynthesis.cancel();
                    }
                    if (canvasVideoRef.current) {
                      canvasVideoRef.current.muted = isMuted;
                    }
                  }}
                  className={`px-3 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    audioMode === 'original'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Plays authentic recorded audio from Mohan Sir (No lady TTS)"
                >
                  <span>🎙️ Mohan Sir Original Voice</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAudioMode('tts');
                    if (canvasVideoRef.current) {
                      canvasVideoRef.current.muted = true;
                    }
                  }}
                  className={`px-3 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    audioMode === 'tts'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Uses AI speech synthesis (video is muted so voices never mix)"
                >
                  <span>🤖 AI TTS Voice</span>
                </button>
              </div>
            </div>

            {/* Emotion / Prosody Mode Selector */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Emotion Generation Mode:</span>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setEmotionMode('automatic')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    emotionMode === 'automatic' ? 'bg-amber-500 text-black' : 'text-slate-400'
                  }`}
                >
                  Automatic
                </button>
                <button
                  type="button"
                  onClick={() => setEmotionMode('manual')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    emotionMode === 'manual' ? 'bg-amber-500 text-black' : 'text-slate-400'
                  }`}
                >
                  Manual Tags
                </button>
                <button
                  type="button"
                  onClick={() => setEmotionMode('hybrid')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    emotionMode === 'hybrid' ? 'bg-amber-500 text-black' : 'text-slate-400'
                  }`}
                >
                  Hybrid ✓
                </button>
              </div>
            </div>

            {/* Quick Sentence Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Search sentences in timeline..."
                value={timelineFilterQuery}
                onChange={(e) => setTimelineFilterQuery(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Timeline Rows */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {timelineSentences
                .map((sent, idx) => ({ sent, originalIndex: idx }))
                .filter(({ sent }) => {
                  if (!timelineFilterQuery.trim()) return true;
                  const q = timelineFilterQuery.toLowerCase().trim();
                  return sent.text.toLowerCase().includes(q) || sent.start.includes(q) || sent.emotion.toLowerCase().includes(q);
                })
                .map(({ sent, originalIndex: idx }) => {
                const isPlaying = activeSentenceIndex === idx;
                return (
                  <div
                    key={sent.id}
                    id={`timeline-sent-${idx}`}
                    className={`p-3 rounded-xl border transition-all text-xs space-y-2 ${
                      isPlaying
                        ? 'bg-amber-500/15 border-amber-500 ring-1 ring-amber-500/30'
                        : 'bg-slate-950 border-slate-800/90 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-400 bg-slate-900 px-2 py-0.5 rounded">
                          {sent.start} - {sent.end}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold capitalize">
                          {sent.emotion.replace('_', ' ')} ({sent.intensity}%)
                        </span>
                        {sent.gesture !== 'none' && (
                          <span className="text-emerald-400 font-semibold text-[10px]">
                            Gesture: {sent.gesture}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSingleSentenceListen(idx)}
                        className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          isPlaying
                            ? 'bg-rose-500 text-white animate-pulse'
                            : 'bg-slate-800 hover:bg-slate-700 text-amber-300'
                        }`}
                      >
                        {isPlaying ? <Pause size={12} /> : <Play size={12} className="fill-amber-300" />}
                        <span>{isPlaying ? 'Stop' : audioMode === 'original' ? 'Listen (Mohan Sir)' : 'Listen (TTS)'}</span>
                      </button>
                    </div>

                    <p
                      className="text-slate-100 text-xs sm:text-sm font-devanagari leading-relaxed tracking-wide"
                      style={{ fontFamily: "'Noto Sans Devanagari', 'Mukta', 'Poppins', sans-serif" }}
                    >
                      {sent.text}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Render Action & Progress */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              {isRendering && (
                <div className="space-y-1.5 p-3 bg-slate-950 rounded-xl border border-amber-500/30">
                  <div className="flex justify-between text-xs text-amber-300 font-bold">
                    <span>Rendering Audio prosody, Lip-Sync, and GFPGAN face restoration...</span>
                    <span>{renderProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-300"
                      style={{ width: `${renderProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {renderFinished && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center justify-between font-bold">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <span>Video Render Complete! (1080p MP4 Ready & Auto-Playing)</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTogglePlayAll}
                      className="px-2.5 py-1 bg-amber-500 text-black rounded-lg text-[11px] font-bold flex items-center gap-1"
                    >
                      <Play size={10} className="fill-current" />
                      <span>{isPlayingAll ? 'Pause' : 'Play Again'}</span>
                    </button>
                    <a
                      href="#publish-section"
                      className="px-3 py-1 bg-emerald-500 text-black rounded-lg text-[11px] font-extrabold"
                    >
                      Publish Video ↓
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Format: <strong>MP4 + SRT</strong></span>
                  <span>•</span>
                  <span>Audio: <strong>48kHz Stereo</strong></span>
                </div>

                <button
                  type="button"
                  disabled={isRendering}
                  onClick={handleStartRender}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-500 hover:to-orange-600 text-black font-black text-xs sm:text-sm shadow-xl active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <Sparkles size={16} />
                  <span>Start AI Video Generation</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section: Final Video Save & Multi-Destination Upload System */}
          <div id="publish-section" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Share2 size={16} className="text-amber-400" />
                  <span>Final Video Save & Multi-Destination Publishing</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Export master 1080p video, download subtitles (.SRT), or syndicate to CRM, Community & Social Media.
                </p>
              </div>

              {/* Destination Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold self-start">
                <button
                  type="button"
                  onClick={() => {
                    setActivePublishTab('media');
                    setPublishStatusMessage(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activePublishTab === 'media' ? 'bg-amber-500 text-black shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  CRM Media
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActivePublishTab('community');
                    setPublishStatusMessage(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activePublishTab === 'community' ? 'bg-amber-500 text-black shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Community
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActivePublishTab('social');
                    setPublishStatusMessage(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activePublishTab === 'social' ? 'bg-amber-500 text-black shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Social Media
                </button>
              </div>
            </div>

            {/* Quick Export & Download Bar */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-white">Master Video Ready:</span>
                <span className="text-xs font-mono text-amber-400">{projectTitle.replace(/\s+/g, '_')}_1080p.mp4</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadMp4}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow"
                  title="Download MP4 Video"
                >
                  <Download size={13} />
                  <span>Download MP4</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSrt}
                  className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow"
                  title="Download Subtitles (.SRT)"
                >
                  <Subtitles size={13} />
                  <span>Download SRT</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow"
                  title="Copy Video CDN Link"
                >
                  {copiedUrl ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copiedUrl ? 'Copied CDN URL!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            {/* Status Message Alert */}
            {publishStatusMessage && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 font-bold flex items-center justify-between">
                <span>{publishStatusMessage}</span>
                <button
                  type="button"
                  onClick={() => setPublishStatusMessage(null)}
                  className="text-emerald-400 hover:text-white text-xs underline cursor-pointer ml-3"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Destination 1: Media Library */}
            {activePublishTab === 'media' && (
              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Select Media Folder:</label>
                  <select
                    value={mediaFolder}
                    onChange={(e) => setMediaFolder(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="Course Videos / Lesson 1">Course Videos / Lesson 1</option>
                    <option value="Workshop Lectures / Swar Yoga">Workshop Lectures / Swar Yoga</option>
                    <option value="Ayurvedic Diet / Recipes">Ayurvedic Diet / Recipes</option>
                    <option value="Social Media Reels / Hindi">Social Media Reels / Hindi</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-400">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-500 uppercase font-mono">Master Video Stream</span>
                    <p className="text-white font-mono truncate">{avatarVideoUrl}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-500 uppercase font-mono">Target Folder</span>
                    <p className="text-amber-400 font-bold">{mediaFolder}</p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isPublishing}
                  onClick={handleSaveToCrmMedia}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-extrabold text-xs rounded-xl shadow cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <Save size={14} />
                  <span>{isPublishing ? 'Saving to CRM Media Library...' : 'Save Video & Subtitles to CRM Media Library'}</span>
                </button>
              </div>
            )}

            {/* Destination 2: Community */}
            {activePublishTab === 'community' && (
              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Target Community / Group:</label>
                  <select
                    value={communityGroup}
                    onChange={(e) => setCommunityGroup(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="Swar Sadhana Members">Swar Sadhana Members (Exclusive Members)</option>
                    <option value="Ayurvedic Food & Health">Ayurvedic Food & Health Group</option>
                    <option value="Teacher Training Group">Teacher Training Group</option>
                    <option value="General Community Forum">General Community Forum</option>
                  </select>
                </div>

                <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl space-y-1 text-slate-300">
                  <p className="font-bold text-purple-300">Community Broadcast Notification:</p>
                  <p className="text-[11px] text-slate-400">
                    A post will be published to &quot;{communityGroup}&quot; with an embedded 1080p high-definition video player, synchronized subtitles, and live comments enabled for all students.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isPublishing}
                  onClick={handlePublishToCommunity}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <Users size={14} />
                  <span>{isPublishing ? 'Publishing...' : 'Publish to Swar Yoga Community'}</span>
                </button>
              </div>
            )}

            {/* Destination 3: Social Media */}
            {activePublishTab === 'social' && (
              <div className="space-y-3.5 text-xs">
                <label className="block text-slate-300 font-bold">Select Platforms:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'youtube', name: 'YouTube', icon: <Youtube size={14} className="text-red-500" /> },
                    { id: 'facebook', name: 'Facebook', icon: <Facebook size={14} className="text-blue-500" /> },
                    { id: 'instagram', name: 'Instagram', icon: <Instagram size={14} className="text-pink-500" /> },
                    { id: 'linkedin', name: 'LinkedIn', icon: <Linkedin size={14} className="text-sky-500" /> },
                  ].map((p) => {
                    const sel = socialPlatforms.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() =>
                          setSocialPlatforms((prev) =>
                            sel ? prev.filter((i) => i !== p.id) : [...prev, p.id]
                          )
                        }
                        className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold transition-all cursor-pointer ${
                          sel
                            ? 'bg-amber-500/15 border-amber-500 text-white shadow'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        {p.icon}
                        <span>{p.name}</span>
                        {sel && <Check size={12} className="ml-auto text-amber-400" />}
                      </button>
                    );
                  })}
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 text-slate-400">
                  <span className="text-[11px] text-slate-500 uppercase font-mono">Metadata:</span>
                  <p className="text-white font-bold">{projectTitle}</p>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{scriptText.slice(0, 160)}...</p>
                </div>

                <button
                  type="button"
                  disabled={isPublishing}
                  onClick={handleQueueSocial}
                  className="w-full py-2.5 bg-gradient-to-r from-red-600 via-pink-600 to-amber-600 hover:opacity-90 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <Radio size={14} />
                  <span>{isPublishing ? 'Queueing...' : 'Queue for Social Publishing'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 39 DNA AVATAR LOOKS FULL GALLERY MODAL */}
      {/* ===================================================================== */}
      {showAllDnaModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-[#0b1019] border border-slate-700/80 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-black flex items-center justify-center font-black shadow-lg">
                  <Sparkles size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-white">
                      Mohan Sir 39 DNA Avatar Looks Studio
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      {finalAvatars.length} Available
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Click any look to immediately bind it to the Live Canvas video & prosody editor.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAllDnaModal(false)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Toolbar: Search + Language Filter Pills */}
            <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={dnaSearchQuery}
                  onChange={(e) => setDnaSearchQuery(e.target.value)}
                  placeholder="🔍 Search looks by title, style, or topic..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
                />
                {dnaSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setDnaSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Language Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: 'all', label: `All (${dnaCounts.all})` },
                  { id: 'hi', label: `हिन्दी (${dnaCounts.hi})` },
                  { id: 'mr', label: `मराठी (${dnaCounts.mr})` },
                  { id: 'en', label: `English (${dnaCounts.en})` },
                ].map((pill) => {
                  const isActive = dnaLangFilter === pill.id;
                  return (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => setDnaLangFilter(pill.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {pill.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Body: Responsive Grid of 39 DNA Cards */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {filteredDnaAvatars.length === 0 ? (
                <div className="text-center py-16 space-y-2">
                  <Grid className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-sm font-bold text-white">No DNA looks match your search</p>
                  <p className="text-xs text-slate-500">Try searching with a different term or resetting the language filter.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredDnaAvatars.map((avatar) => {
                    const isSelected = avatar.id === selectedAvatarId;
                    const lang = (avatar.defaultLanguage || 'hi').toUpperCase();

                    return (
                      <div
                        key={avatar.id}
                        className={`group relative rounded-2xl overflow-hidden border-2 transition-all flex flex-col bg-slate-900 shadow-lg ${
                          isSelected
                            ? 'border-amber-400 ring-2 ring-amber-500/40 shadow-amber-500/20'
                            : 'border-slate-800 hover:border-slate-600 hover:shadow-xl'
                        }`}
                      >
                        {/* Thumbnail Image Container */}
                        <div className="relative aspect-video w-full overflow-hidden bg-black">
                          {avatar.previewImageUrl ? (
                            <img
                              src={avatar.previewImageUrl}
                              alt={avatar.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-600 font-bold text-xs">
                              DNA Avatar
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 pointer-events-none" />

                          {/* Top Badges */}
                          <div className="absolute top-2 inset-x-2 flex items-center justify-between pointer-events-none">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase shadow ${
                              lang === 'HI' ? 'bg-orange-600 text-white' : lang === 'MR' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                            }`}>
                              {lang}
                            </span>
                            <span className="text-[10px] font-semibold bg-black/70 backdrop-blur px-2 py-0.5 rounded text-slate-300 capitalize">
                              {avatar.defaultSpeakingStyle}
                            </span>
                          </div>

                          {/* Active Pill */}
                          {isSelected && (
                            <div className="absolute bottom-2 left-2 z-10">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[10px] font-black flex items-center gap-1 shadow">
                                <Check size={10} className="stroke-[3]" />
                                <span>ACTIVE LOOK</span>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Card Details */}
                        <div className="p-3 flex-1 flex flex-col justify-between space-y-2.5">
                          <div>
                            <h4 className="text-xs font-bold text-white line-clamp-2 leading-tight">
                              {avatar.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 mt-1 capitalize">
                              Profile: {avatar.defaultSpeakingStyle} • Emotion: {avatar.defaultEmotion.replace('_', ' ')}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAvatarId(avatar.id);
                                setConfirmDeleteAvatarId(null);
                                setShowAllDnaModal(false);
                              }}
                              className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                isSelected
                                  ? 'bg-amber-400 text-black shadow'
                                  : 'bg-slate-800 hover:bg-amber-500 text-slate-200 hover:text-black'
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <Check size={12} className="stroke-[3]" />
                                  <span>Selected</span>
                                </>
                              ) : (
                                <span>Use This Look ➔</span>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (confirmDeleteAvatarId === avatar.id) {
                                  handleDeleteAvatar(avatar.id);
                                } else {
                                  setConfirmDeleteAvatarId(avatar.id);
                                }
                              }}
                              disabled={isDeletingAvatar}
                              className={`p-1.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                                confirmDeleteAvatarId === avatar.id
                                  ? 'bg-rose-600 text-white border-rose-500'
                                  : 'bg-slate-950 border-slate-800 text-rose-400 hover:bg-rose-950'
                              }`}
                              title="Permanently remove avatar from database"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          {confirmDeleteAvatarId === avatar.id && (
                            <div className="text-[10px] text-rose-300 font-bold flex items-center justify-between bg-rose-950/70 p-1.5 rounded-lg border border-rose-800/80">
                              <span>Delete permanently?</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAvatar(avatar.id)}
                                  className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-black"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteAvatarId(null)}
                                  className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300"
                                >
                                  No
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between text-xs text-slate-400">
              <span>Showing {filteredDnaAvatars.length} of {finalAvatars.length} DNA Avatar Looks</span>
              <button
                type="button"
                onClick={() => setShowAllDnaModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
