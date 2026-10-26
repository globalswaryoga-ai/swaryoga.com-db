'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { ChevronDown, ChevronUp, LogOut, Maximize2, Minimize2, Play, Volume2, ArrowLeft, MessageSquare, X, Send, Users, Calendar, Sparkles, RotateCw } from 'lucide-react';

// Video styling
if (typeof document !== 'undefined') {
  const styleId = 'sadhana-video-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      video.sadhana-video {
        display: block !important;
        width: 100% !important;
        height: 100% !important;
        outline: none !important;
        border: none !important;
        background: #000 !important;
      }
    `;
    document.head.appendChild(style);
  }
}

interface Participant { name: string; joinedAt: string; }
interface ChatMsg { id: string; name: string; message: string; createdAt: string; }
interface Program {
  slug: string;
  name: string;
  description?: string;
  timezone: string;
  scheduleTime: string | string[];
  timeSlots?: string[];
  videoDuration?: number;
}
interface TodayVideo { date: string; title: string; videoUrl: string; }
interface UpcomingVideo { date: string; title: string; }
interface SessionInfo {
  status: 'waiting' | 'countdown' | 'live' | 'ended';
  sessionStartUtc: string | null;
  sessionEndUtc: string | null;
  nextSessionUtc: string | null;
  videoOffsetSeconds: number;
  countdownMinutes: number;
  videoDurationMinutes: number;
}

function genSessionId() { return 'sess_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
function storedName() { return typeof window === 'undefined' ? '' : localStorage.getItem('sadhana_live_name') || ''; }
function storedSid(slug: string) {
  if (typeof window === 'undefined') return '';
  const key = `sadhana_live_session_${slug}`;
  let id = sessionStorage.getItem(key);
  if (!id) { id = genSessionId(); sessionStorage.setItem(key, id); }
  return id;
}
function fmtCountdown(ms: number) {
  if (ms <= 0) return '00:00';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
function fmtTime(iso: string, tz: string) {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch { return iso; }
}
function fmtDate(yyyymmdd: string) {
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function ProgramLivePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [name, setName] = useState('');
  const [joined, setJoined] = useState(false);
  const [programNotFound, setProgramNotFound] = useState(false);
  const [program, setProgram] = useState<Program | null>(null);
  const [todayVideo, setTodayVideo] = useState<TodayVideo | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingVideo[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [count, setCount] = useState(0);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [playableUrl, setPlayableUrl] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [serverTime, setServerTime] = useState<Date>(new Date());
  const [nowTick, setNowTick] = useState<Date>(new Date());
  const [showParticipants, setShowParticipants] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [showUpcoming, setShowUpcoming] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const [forceRotated, setForceRotated] = useState(false);
  const [isDeviceLandscape, setIsDeviceLandscape] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [playerMode, setPlayerMode] = useState<'player' | 'hls'>('player');
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [videoStarted, setVideoStarted] = useState(false);
  const sidRef = useRef<string>('');
  const chatEnd = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const mobileChatMessagesRef = useRef<HTMLDivElement>(null);
  const urlSetRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Viewport optimization - ensure natural scrolling when needed
    if (typeof window !== 'undefined') {
      document.documentElement.style.height = '100%';
      document.body.style.minHeight = '100%';
      document.body.style.overflow = 'auto';

      const checkOrientation = () => {
        // 1. Modern Screen Orientation API
        const screenType = window.screen?.orientation?.type || '';
        const isScreenLandscape = screenType.includes('landscape');

        // 2. Legacy window.orientation (degrees: 90 or -90)
        const isAngleLandscape =
          typeof window.orientation === 'number' &&
          (Math.abs(window.orientation) === 90 || Math.abs(window.orientation) === 270);

        // 3. Viewport width > height on mobile/tablets (up to 1280px)
        const w = window.innerWidth;
        const h = window.innerHeight;
        const isAspectLandscape = w > h && w <= 1280;

        const isLandscape = isScreenLandscape || isAngleLandscape || isAspectLandscape;
        setIsDeviceLandscape(isLandscape);
      };

      checkOrientation();
      window.addEventListener('resize', checkOrientation);
      window.addEventListener('orientationchange', checkOrientation);
      if (window.screen?.orientation) {
        window.screen.orientation.addEventListener('change', checkOrientation);
      }

      // 4. Hardware accelerometer tilt detection (works even if phone auto-rotate is locked)
      let lastTilt = 0;
      const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
        const { gamma, beta } = event;
        if (gamma === null || beta === null) return;

        // Sideways tilt detection (>55 deg horizontal tilt, <55 deg vertical pitch)
        const isSideways = Math.abs(gamma) > 55 && Math.abs(beta) < 55;
        const isUpright = Math.abs(gamma) < 25 && Math.abs(beta) > 35;

        const now = Date.now();
        if (now - lastTilt < 600) return; // debounce

        if (isSideways && !forceRotated) {
          lastTilt = now;
          setForceRotated(true);
        } else if (isUpright && forceRotated) {
          lastTilt = now;
          setForceRotated(false);
        }
      };

      try {
        window.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true });
      } catch {}

      return () => {
        window.removeEventListener('resize', checkOrientation);
        window.removeEventListener('orientationchange', checkOrientation);
        if (window.screen?.orientation) {
          window.screen.orientation.removeEventListener('change', checkOrientation);
        }
        try {
          window.removeEventListener('deviceorientation', handleDeviceOrientation);
        } catch {}
      };
    }
  }, [forceRotated]);

  useEffect(() => {
    const onFullScreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setFullscreenMode(isFs);
      if (!isFs && (screen.orientation as any)?.unlock) {
        (screen.orientation as any).unlock();
      }
    };
    document.addEventListener('fullscreenchange', onFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullScreenChange);
  }, []);

  const toggleRotateLandscape = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).SwarYoga?.toggleOrientation) {
        (window as any).SwarYoga.toggleOrientation();
      }

      if (!forceRotated && !isDeviceLandscape) {
        if ((screen.orientation as any)?.lock) {
          await (screen.orientation as any).lock('landscape').catch(() => {});
        }
        setForceRotated(true);
      } else {
        if ((screen.orientation as any)?.unlock) {
          (screen.orientation as any).unlock();
        }
        setForceRotated(false);
      }
    } catch {
      setForceRotated((prev) => !prev);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (document.fullscreenElement || fullscreenMode) {
        if (document.fullscreenElement) {
          await document.exitFullscreen().catch(() => {});
        }
        if ((screen.orientation as any)?.unlock) {
          (screen.orientation as any).unlock();
        }
        setFullscreenMode(false);
        setForceRotated(false);
      } else {
        await containerRef.current.requestFullscreen().catch(() => {});
        if ((screen.orientation as any)?.lock) {
          await (screen.orientation as any).lock('landscape').catch(() => {});
        }
        setFullscreenMode(true);
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed, falling back to rotate:', err);
      toggleRotateLandscape();
    }
  };

  useEffect(() => {
    const stored = storedName();
    if (stored) {
      setName(stored);
      setJoined(true);
    }
    sidRef.current = storedSid(slug);
  }, [slug]);

  useEffect(() => {
    if ((session?.status === 'live' || previewMode) && !videoStarted) {
      setVideoStarted(true);
    }
  }, [session?.status, previewMode, videoStarted]);

  const applyStateData = (data: any) => {
    if (data.program) setProgram(data.program);
    if (data.todayVideo) setTodayVideo(data.todayVideo);
    if (data.upcomingVideos) setUpcoming(data.upcomingVideos || []);
    if (data.participants) setParticipants(data.participants || []);
    if (typeof data.count === 'number') setCount(data.count);
    if (data.session) setSession(data.session);
    if (data.playerMode) setPlayerMode(data.playerMode || 'player');
    if (data.playerUrl) setPlayerUrl(data.playerUrl);
    if (data.playableVideoUrl) setPlayableUrl(data.playableVideoUrl);
    if (data.chat) setChat(data.chat || []);
    if (data.serverTime) setServerTime(new Date(data.serverTime));
  };

  // Initial fetch on mount before joining (fetches program info, timings, and live status)
  useEffect(() => {
    let mounted = true;
    const fetchInitial = async () => {
      try {
        const res = await fetch(`/api/sadhana/live/${slug}/state`, { method: 'GET' });
        if (res.status === 404) {
          if (mounted) setProgramNotFound(true);
          return;
        }
        const data = await res.json();
        if (data.success && mounted) {
          applyStateData(data);
        }
      } catch (err) {
        console.warn('Initial sadhana state fetch error:', err);
      }
    };
    fetchInitial();
    return () => { mounted = false; };
  }, [slug]);

  const handleJoin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) return;
    const cleanName = name.trim();
    localStorage.setItem('sadhana_live_name', cleanName);
    if (!sidRef.current) {
      sidRef.current = storedSid(slug);
    }
    // Instantaneous UI transition (0ms - zero delay)
    setJoined(true);

    // Non-blocking background analytics registration
    fetch(`/api/sadhana/live/${slug}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sidRef.current, name: cleanName }),
    }).catch(() => {});
  };

  useEffect(() => {
    if (!joined) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/sadhana/live/${slug}/state`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sidRef.current, preview: previewMode }),
        });
        if (res.status === 404) { setProgramNotFound(true); return; }
        const data = await res.json();
        if (data.success) {
          applyStateData(data);
        }
      } catch (err) { console.warn('Poll error:', err); }
    };
    poll();
    const t = setInterval(poll, 3000);
    return () => clearInterval(t);
  }, [joined, slug, previewMode]);

  useEffect(() => {
    const i = setInterval(() => setNowTick(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
    if (mobileChatMessagesRef.current) {
      mobileChatMessagesRef.current.scrollTop = mobileChatMessagesRef.current.scrollHeight;
    }
  }, [chat.length]);

  const sendChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;
    const msgToSend = chatInput.trim();
    setChatInput('');
    await fetch(`/api/sadhana/live/${slug}/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() || 'Practitioner', message: msgToSend }),
    }).catch(() => {});
  };

  const handleQuickSend = async (quickMsg: string) => {
    await fetch(`/api/sadhana/live/${slug}/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() || 'Practitioner', message: quickMsg }),
    }).catch(() => {});
  };

  const handleLeave = () => {
    if (confirm('Leave the session?')) {
      setJoined(false);
      setName('');
      localStorage.removeItem('sadhana_live_name');
    }
  };

  if (programNotFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black flex items-center justify-center p-2 sm:p-4">
        <div className="text-center text-white max-w-sm w-full">
          <div className="text-5xl sm:text-6xl mb-4 sm:mb-6">🤔</div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4">Program Not Found</h1>
          <p className="text-xs sm:text-sm md:text-base text-purple-200">The program "{slug}" doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  if (!joined) {
    const isLiveNow = session?.status === 'live';
    const isCountdown = session?.status === 'countdown';
    const scheduleList = program?.scheduleTime
      ? (Array.isArray(program.scheduleTime) ? program.scheduleTime : [program.scheduleTime])
      : [];

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 sm:p-8 max-w-md w-full border border-white/20 shadow-2xl">
          <div className="flex items-center justify-start mb-4">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  if (window.history.length > 1) {
                    window.history.back();
                  } else {
                    window.location.href = '/';
                  }
                }
              }}
              className="flex items-center space-x-1.5 py-1.5 px-3 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white font-bold text-xs"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4 text-white stroke-[2.5]" />
              <span>Back</span>
            </button>
          </div>
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🧘</div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1.5">{program?.name || 'Sadhana Live'}</h1>
            {program?.description && (
              <p className="text-xs sm:text-sm text-purple-300 mb-3">{program.description}</p>
            )}

            {isLiveNow ? (
              <div className="inline-flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold animate-pulse shadow-md">
                <span className="w-2 h-2 rounded-full bg-white"></span>
                LIVE NOW
              </div>
            ) : isCountdown ? (
              <div className="inline-flex items-center gap-1.5 bg-amber-500 text-black px-3 py-1 rounded-full text-xs font-semibold shadow-md">
                ⏳ Starting in {session?.countdownMinutes || 5} min
              </div>
            ) : session?.nextSessionUtc ? (
              <div className="inline-flex items-center gap-1.5 bg-purple-800/80 text-purple-200 px-3 py-1 rounded-full text-xs">
                <span>🕒 Next:</span>
                <span className="font-semibold text-white">{fmtTime(session.nextSessionUtc, program?.timezone || 'Asia/Kolkata')}</span>
              </div>
            ) : null}
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-white mb-2 text-xs sm:text-sm font-medium">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
                autoFocus
                className="w-full px-4 py-2.5 rounded-lg bg-white/20 text-white placeholder-purple-200 border border-white/30 focus:outline-none focus:border-pink-500 text-sm sm:text-base"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-pink-500 to-violet-500 text-white font-bold py-3 rounded-lg hover:opacity-90 transition text-sm sm:text-base shadow-lg cursor-pointer"
            >
              {isLiveNow ? 'Join Live Practice Now 🔴' : 'Join Sadhana Room 🙏'}
            </button>
          </form>

          {scheduleList.length > 0 && (
            <div className="mt-6 pt-4 border-t border-white/10 text-center">
              <p className="text-xs text-purple-300 mb-2 font-medium">Daily Sessions (IST)</p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {scheduleList.map((time, idx) => (
                  <span key={idx} className="bg-white/10 text-purple-200 px-3 py-0.5 rounded-full text-xs">
                    {time}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const drift = serverTime.getTime() - (nowTick.getTime() - 1000);
  const synced = new Date(nowTick.getTime() + drift);

  let sessionView: React.ReactNode = null;
  const isLive = session?.status === 'live' || previewMode;

  if (isLive) {
    const activeStreamUrl = playerUrl || playableUrl || todayVideo?.videoUrl || '';
    const isHlsStream = playerMode === 'hls' ||
                        activeStreamUrl.includes('.m3u8') ||
                        activeStreamUrl.includes('b-cdn.net') ||
                        activeStreamUrl.includes('playlist');

    if (isHlsStream && activeStreamUrl) {
      sessionView = (
        <HLSPlayer
          url={activeStreamUrl}
          videoRef={videoRef as any}
          offsetSeconds={previewMode ? 0 : (session?.videoOffsetSeconds || 0)}
          onToggleFullscreen={toggleFullscreen}
          isFullscreen={fullscreenMode}
        />
      );
    } else if (activeStreamUrl) {
      sessionView = (
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#000' }}>
          <iframe
            src={activeStreamUrl}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            sandbox="allow-scripts allow-same-origin allow-presentation"
            loading="eager"
            title="Video player"
          />
        </div>
      );
    } else {
      sessionView = (
        <div className="w-full h-full flex items-center justify-center p-8 bg-black">
          <p className="text-purple-200 animate-pulse">Preparing live session video...</p>
        </div>
      );
    }
  } else if (!session || session.status === 'waiting') {
    const scheduleList = program?.scheduleTime
      ? (Array.isArray(program.scheduleTime) ? program.scheduleTime : [program.scheduleTime])
      : (program?.timeSlots || ['07:00', '19:00']);

    sessionView = (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 text-center bg-gradient-to-b from-slate-950 via-[#0e0720] to-black relative select-none overflow-hidden">
        {/* Subtle glowing sacred geometry backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(147,51,234,0.22)_0%,_transparent_70%)] pointer-events-none" />

        <div className="relative z-10 max-w-sm sm:max-w-md w-full mx-auto flex flex-col items-center">
          {/* 3D Floating Meditation Lotus Icon */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-purple-600/40 via-pink-500/20 to-indigo-500/40 border border-purple-400/40 shadow-[0_8px_30px_rgba(147,51,234,0.45),inset_0_1px_1px_rgba(255,255,255,0.3)] flex items-center justify-center text-3xl sm:text-4xl mb-2 sm:mb-3">
            🧘
          </div>

          <h2 className="text-base sm:text-xl font-bold text-white tracking-wide leading-tight mb-1">
            {todayVideo?.title || program?.name || 'Hindi Swar YOGa L-1 Sadhana'}
          </h2>
          <p className="text-xs text-purple-300/90 mb-3">
            {todayVideo ? 'Session Ready • Starting Soon' : 'Daily Community Practice Session'}
          </p>

          {/* 3D Glass Broadcast Card */}
          {session?.nextSessionUtc && program && (
            <div className="w-full mb-3 px-4 py-3 rounded-2xl bg-gradient-to-b from-purple-900/50 via-purple-950/70 to-black/90 border border-purple-500/40 shadow-[0_12px_25px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.25)] backdrop-blur-md">
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-purple-300 uppercase tracking-widest font-semibold mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Next Live Broadcast</span>
              </div>
              <p className="text-base sm:text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-pink-200">
                {fmtTime(session.nextSessionUtc, program.timezone)}
              </p>
            </div>
          )}

          {/* Daily Slots */}
          {scheduleList.length > 0 && (
            <div className="flex items-center justify-center gap-1.5 mb-2.5 flex-wrap">
              <span className="text-[10px] text-purple-300 uppercase font-medium">Daily Sessions (IST):</span>
              {scheduleList.map((time: string, idx: number) => (
                <span
                  key={idx}
                  className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-pink-600/80 to-purple-600/80 text-white text-[11px] font-bold shadow-md border border-pink-400/30"
                >
                  {time}
                </span>
              ))}
            </div>
          )}

          <p className="text-[11px] text-purple-300/80 flex items-center gap-1">
            <span>Please wait for the scheduled broadcast time</span>
            <span>🙏</span>
          </p>
        </div>
      </div>
    );
  } else if (session.status === 'countdown') {
    const ms = new Date(session.sessionStartUtc!).getTime() - nowTick.getTime();
    sessionView = (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 text-center bg-gradient-to-b from-slate-950 via-[#120726] to-black relative select-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(236,72,153,0.25)_0%,_transparent_70%)] pointer-events-none" />
        <div className="relative z-10 max-w-sm sm:max-w-md w-full mx-auto flex flex-col items-center">
          <div className="text-4xl sm:text-5xl mb-2 animate-bounce">🧘</div>
          <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-pink-300 mb-2">
            Session Starting In
          </p>
          <div className="px-6 py-3 rounded-2xl bg-black/80 border border-pink-500/40 shadow-[0_12px_30px_rgba(236,72,153,0.35),inset_0_1px_1px_rgba(255,255,255,0.2)]">
            <span className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-pink-100 to-purple-200 font-mono tracking-tight">
              {fmtCountdown(ms)}
            </span>
          </div>
          <p className="text-xs text-purple-200 flex items-center gap-1.5 mt-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>🤖 Swar Bot will play video automatically</span>
          </p>
          {todayVideo?.title && (
            <p className="text-purple-300 text-xs mt-2">Today: {todayVideo.title}</p>
          )}
        </div>
      </div>
    );
  } else if (session.status === 'ended') {
    sessionView = (
      <div className="w-full h-full flex items-center justify-center p-4 sm:p-8 bg-gradient-to-b from-slate-950 via-purple-950/60 to-black">
        <div className="text-center max-w-md">
          <div className="text-5xl sm:text-6xl mb-3">🙏</div>
          <p className="text-xl sm:text-2xl text-white font-bold mb-1">Session Complete</p>
          <p className="text-sm text-purple-200 mb-4">Thank you for practicing with us</p>
          {upcoming[0] && (
            <p className="text-purple-300 text-xs sm:text-sm">
              Next Practice: {fmtDate(upcoming[0].date)} {upcoming[0].title && `• ${upcoming[0].title}`}
            </p>
          )}
        </div>
      </div>
    );
  }

  const displayChat = (chat || []).filter((msg, idx, arr) => {
    if (idx === 0) return true;
    if (msg.name === arr[idx - 1].name && msg.message === arr[idx - 1].message) return false;
    return true;
  });

  const isCinemaMode = fullscreenMode || forceRotated || isDeviceLandscape;

  return (
    <div ref={containerRef} className={`${isCinemaMode ? 'fixed inset-0 z-50' : 'min-h-screen'} bg-black text-white flex flex-col`}>

      {/* ── CINEMA FULLSCREEN / ROTATED LANDSCAPE (SINGLE INSTANCE PREVENTS DUPLICATE AUDIO/VIDEO) ── */}
      {isCinemaMode && (
        <div
          className="fixed inset-0 z-[100000] bg-black flex items-center justify-center overflow-hidden"
          style={
            forceRotated && !isDeviceLandscape
              ? {
                  width: '100vh',
                  height: '100vw',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%) rotate(90deg)',
                  transformOrigin: 'center center',
                }
              : {
                  width: '100vw',
                  height: '100vh',
                  top: 0,
                  left: 0,
                }
          }
        >
          <div className="relative w-full h-full bg-black flex items-center justify-center">
            {sessionView}

            {/* Top Floating Info Pill */}
            <div className="absolute top-3 left-3 z-[100001] flex items-center gap-2 pointer-events-auto">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-xs font-bold text-white shadow-xl">
                <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-purple-400'}`} />
                <span>{isLive ? 'LIVE' : 'SADHANA'} • {count}</span>
              </div>
            </div>

            {/* Top Floating Controls */}
            <div className="absolute top-3 right-3 z-[100001] flex items-center gap-2 pointer-events-auto">
              <button
                type="button"
                onClick={() => setIsChatOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold text-xs border border-purple-400/40 shadow-xl cursor-pointer"
              >
                <MessageSquare size={13} />
                <span>Chat ({displayChat.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (fullscreenMode) toggleFullscreen();
                  else if (forceRotated) setForceRotated(false);
                  else if (isDeviceLandscape) {
                    setIsDeviceLandscape(false);
                    setForceRotated(false);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/85 hover:bg-black active:scale-95 text-white font-bold text-xs border border-white/30 shadow-xl cursor-pointer"
              >
                <Minimize2 size={13} className="text-amber-400" />
                <span>Exit Full</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── NORMAL MODE ── */}
      {!isCinemaMode && (
        <>
          {/* Header Bar */}
          <div
            data-app-header="true"
            className="flex items-center justify-between gap-2 px-3 py-2.5 bg-black/95 backdrop-blur-md border-b border-white/10 sticky top-0 z-30 shadow-md"
          >
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    if (window.history.length > 1) window.history.back();
                    else window.location.href = '/';
                  }
                }}
                className="flex items-center gap-1 py-1.5 px-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition text-white font-medium text-xs flex-shrink-0 border border-white/10 cursor-pointer"
                aria-label="Back"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Back</span>
              </button>
              <span className="text-xl flex-shrink-0">🧘</span>
              <div className="min-w-0">
                <h1 className="text-xs sm:text-sm font-bold text-white truncate leading-tight">
                  {program?.name || 'Sadhana Live'}
                </h1>
                <p className="text-[10px] text-purple-300 truncate">
                  {isLive ? 'Live Session' : session?.status === 'countdown' ? 'Starting Soon' : 'Community Sadhana'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {/* Live Status Pill */}
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                isLive
                  ? 'bg-red-500/20 text-red-300 border-red-500/40'
                  : 'bg-purple-900/40 text-purple-200 border-purple-500/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-red-400 animate-ping' : 'bg-purple-400'}`} />
                <span>{isLive ? (previewMode ? 'PREVIEW' : 'LIVE') : (session?.status?.toUpperCase() || 'ONLINE')}</span>
              </div>

              {/* Rotate Button */}
              <button
                type="button"
                onClick={toggleRotateLandscape}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-700/80 to-pink-700/80 hover:opacity-95 active:scale-95 transition text-white font-medium text-xs border border-purple-400/40 cursor-pointer shadow-sm"
                title="Rotate Screen to Landscape"
              >
                <RotateCw size={12} className="text-amber-300" />
                <span className="hidden sm:inline">Rotate</span>
              </button>

              {/* Fullscreen Button */}
              <button
                onClick={toggleFullscreen}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition text-white font-medium text-xs border border-white/10 cursor-pointer"
                title="Fullscreen"
              >
                <Maximize2 size={13} />
                <span className="hidden md:inline">Full</span>
              </button>

              {/* Leave Button */}
              <button
                onClick={handleLeave}
                className="p-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 active:scale-95 transition text-white text-xs cursor-pointer border border-red-400/30"
                title="Leave Session"
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>

          {/* ── 3D VIDEO THEATER STAGE ─────────────────────────── */}
          <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 pt-2 sm:pt-4">
            <div className="relative group">
              {/* Outer 3D Neon Backlight Ambient Glow */}
              <div className="absolute -inset-1 sm:-inset-2 bg-gradient-to-r from-purple-600/30 via-pink-600/20 to-indigo-600/30 rounded-2xl sm:rounded-3xl blur-xl opacity-75 -z-10 pointer-events-none" />

              {/* 3D Chamfered Outer Bezel with Metallic & Shadow Depth */}
              <div className="relative rounded-2xl sm:rounded-3xl p-[2.5px] sm:p-[3.5px] bg-gradient-to-b from-purple-400/50 via-purple-900/30 to-black shadow-[0_20px_50px_-10px_rgba(0,0,0,0.95),0_0_30px_rgba(147,51,234,0.3),inset_0_1px_1px_rgba(255,255,255,0.35)] transition-all">
                {/* Inner Screen Bezel with Cinema 16:9 Aspect Ratio */}
                <div
                  className="relative w-full rounded-[13px] sm:rounded-[21px] overflow-hidden bg-black shadow-inner"
                  style={{ aspectRatio: '16/9' }}
                >
                  {/* Top Edge Specular Reflection */}
                  <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-purple-200/50 to-transparent z-20 pointer-events-none" />

                  {sessionView}

                  {/* Floating Video Corner Rotate Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRotateLandscape();
                    }}
                    className="absolute bottom-2.5 right-2.5 z-30 bg-black/80 hover:bg-black/95 active:scale-90 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-white/20 shadow-2xl cursor-pointer transition-all backdrop-blur-md"
                    title="Rotate to Fullscreen Landscape"
                  >
                    <RotateCw size={13} className="text-amber-400" />
                    <span>Rotate</span>
                  </button>

                  {previewMode && (
                    <div className="absolute top-2 left-2 z-30 bg-amber-500 text-black px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1.5 shadow">
                      <span>👁️ Preview</span>
                      <button onClick={() => setPreviewMode(false)} className="underline text-[10px] cursor-pointer">Exit</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── CLEAN UI BELOW VIDEO (CHATS ARE HIDDEN BEHIND BUTTON) ─ */}
          <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 py-3 space-y-3 flex-1">
            {/* Meta & Main Actions Card */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 backdrop-blur-md shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-white truncate">
                    {program?.name || 'Sadhana Live'} 🙏
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-semibold border border-purple-500/30">
                    Live
                  </span>
                </div>
                <p className="text-xs text-purple-300/90 mt-0.5 truncate">
                  {todayVideo?.title || 'Daily Community Practice Session'}
                </p>
              </div>

              {/* Action Buttons: 💬 Open Chat & 👥 Attendees */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* 💬 OPEN CHAT BUTTON */}
                <button
                  type="button"
                  onClick={() => setIsChatOpen(true)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-pink-500 active:scale-95 transition-all text-white font-bold text-xs sm:text-sm shadow-[0_4px_16px_rgba(168,85,247,0.45)] border border-white/20 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-white" />
                  <span>Open Live Chat</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-white/25 text-[10px] font-bold">
                    {displayChat.length}
                  </span>
                </button>

                {/* Practitioners button */}
                <button
                  type="button"
                  onClick={() => setShowParticipantsModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 transition text-white text-xs font-semibold border border-white/10 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-purple-300" />
                  <span>{count} Yogis Online</span>
                </button>
              </div>
            </div>

            {/* Announcement if any */}
            {announcement && (
              <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-500/30 text-xs text-purple-200">
                📢 {announcement}
              </div>
            )}

            {/* Upcoming Schedule */}
            {upcoming.length > 0 && (
              <div className="p-3 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-pink-400" />
                    <span>Upcoming Sadhana Sessions</span>
                  </h3>
                  <span className="text-[10px] text-purple-300">{upcoming.length} sessions scheduled</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {upcoming.slice(0, 4).map((v, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-left">
                      <div className="text-[10px] font-semibold text-pink-300">{fmtDate(v.date)}</div>
                      <div className="text-xs text-white truncate font-medium mt-0.5">{v.title || 'Daily Practice'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── LIVE CHAT DRAWER / MODAL ───────────────────────── */}
          {isChatOpen && (
            <div className="fixed inset-0 z-[10000] flex flex-col justify-end lg:justify-center lg:items-center bg-black/75 backdrop-blur-md transition-all">
              {/* Backdrop Click Dismiss */}
              <div className="absolute inset-0" onClick={() => setIsChatOpen(false)} />

              {/* Chat Drawer Content */}
              <div className="relative z-10 w-full lg:max-w-md h-[82vh] lg:h-[620px] flex flex-col rounded-t-3xl lg:rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-purple-500/40 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-sm shadow">
                      💬
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white leading-tight">Live Chat</h3>
                      <p className="text-[10px] text-purple-300 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>{count} practitioners connected</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsChatOpen(false)}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition cursor-pointer"
                    aria-label="Close Chat"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick Greetings / Reactions Bar */}
                <div className="flex items-center gap-1.5 px-3 py-2 bg-black/40 border-b border-white/5 overflow-x-auto">
                  {['🙏 Namaste', 'Hari Om 🕉️', 'Swar Yoga 🧘', 'Shanti 🕊️', '❤️ Blessings'].map((quick, qIdx) => (
                    <button
                      key={qIdx}
                      type="button"
                      onClick={() => handleQuickSend(quick)}
                      className="flex-shrink-0 px-2.5 py-1 rounded-full bg-white/10 hover:bg-pink-600/40 active:scale-95 transition text-[11px] font-medium text-purple-100 border border-white/10 cursor-pointer"
                    >
                      {quick}
                    </button>
                  ))}
                </div>

                {/* Chat Messages */}
                <div ref={chatMessagesRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
                  {displayChat.map((msg) => {
                    const isMe = msg.name === name;
                    const isBot = msg.name.includes('Bot');
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`text-[10px] font-bold ${isBot ? 'text-amber-300' : isMe ? 'text-pink-300' : 'text-purple-300'}`}>
                            {msg.name}
                          </span>
                          {msg.createdAt && (
                            <span className="text-[9px] text-white/40">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <div className={`px-3 py-1.5 rounded-2xl text-xs max-w-[85%] break-words ${
                          isMe
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-tr-none shadow'
                            : isBot
                            ? 'bg-purple-950/70 text-purple-100 border border-purple-500/30 rounded-tl-none'
                            : 'bg-white/10 text-white rounded-tl-none border border-white/10'
                        }`}>
                          {msg.message}
                        </div>
                      </div>
                    );
                  })}
                  {displayChat.length === 0 && (
                    <div className="text-center py-12 text-purple-300 text-xs">
                      <p className="text-3xl mb-1">🧘</p>
                      <p className="font-semibold text-white">Live Sadhana Chat</p>
                      <p className="text-[11px] text-purple-400 mt-1">Tap a quick greeting or type your message below 🙏</p>
                    </div>
                  )}
                  <div ref={chatEnd} />
                </div>

                {/* Message Input Form */}
                <form onSubmit={sendChat} className="p-3 bg-black/60 border-t border-white/10 flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message or Namaste 🙏..."
                    maxLength={300}
                    className="flex-1 px-3 py-2.5 bg-white/10 rounded-xl text-xs sm:text-sm placeholder-purple-300 border border-white/20 focus:outline-none focus:border-pink-400 transition text-white"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 disabled:opacity-40 rounded-xl font-bold text-xs text-white transition flex items-center gap-1 cursor-pointer flex-shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ── PRACTITIONERS MODAL ────────────────────────────── */}
          {showParticipantsModal && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
              <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-purple-500/40 p-4 shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span>Practitioners Online ({count})</span>
                  </h3>
                  <button
                    onClick={() => setShowParticipantsModal(false)}
                    className="p-1 rounded-lg bg-white/10 text-white hover:bg-white/20"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1.5 py-3">
                  {participants.map((p, i) => (
                    <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-xs text-white">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-[10px] font-bold">
                        {p.name[0]?.toUpperCase() || '?'}
                      </div>
                      <span className="font-medium truncate">{p.name}</span>
                    </div>
                  ))}
                  {participants.length === 0 && (
                    <p className="text-xs text-purple-300 text-center py-4">No practitioners connected yet</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="py-3 text-center text-purple-400 text-[10px]">Swar Yoga • Sadhana Live • Namaste 🙏</div>
        </>
      )}
    </div>
  );
}

interface HLSPlayerProps {
  url: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  offsetSeconds: number;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

function HLSPlayer({ url, videoRef, offsetSeconds, onToggleFullscreen, isFullscreen }: HLSPlayerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const seekPerformed = useRef(false);
  const hlsRef = useRef<any>(null);

  const handlePlayOrUnmute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = 1;
    video.play()
      .then(() => {
        setIsPaused(false);
        setIsMuted(false);
      })
      .catch(() => {
        // Fallback: play muted if unmuted playback is restricted
        video.muted = true;
        video.play()
          .then(() => {
            setIsPaused(false);
            setIsMuted(true);
          })
          .catch((e) => {
            console.error('[HLS] Play failed:', e);
            setIsPaused(true);
          });
      });
  };

  const offsetRef = useRef(offsetSeconds);
  useEffect(() => {
    offsetRef.current = offsetSeconds;
  }, [offsetSeconds]);

  // Sync to offsetSeconds without destroying the player
  useEffect(() => {
    const video = videoRef.current;
    if (!video || offsetSeconds <= 0) return;
    if (!seekPerformed.current) {
      if (video.readyState >= 1) {
        video.currentTime = offsetSeconds;
        seekPerformed.current = true;
      }
    } else {
      // Catch up only if drift is over 15 seconds
      if (Math.abs(video.currentTime - offsetSeconds) > 15) {
        video.currentTime = offsetSeconds;
      }
    }
  }, [offsetSeconds, videoRef]);

  useEffect(() => {
    if (!videoRef.current || !url) return;

    const isValidHlsUrl = url.endsWith('.m3u8') || url.includes('playlist') || url.includes('b-cdn.net');
    if (!isValidHlsUrl) { setError('Invalid stream URL'); return; }

    const video = videoRef.current;
    seekPerformed.current = false;

    const onPlay = () => setIsPaused(false);
    const onPause = () => setIsPaused(true);
    const onVolumeChange = () => setIsMuted(video.muted || video.volume === 0);

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('volumechange', onVolumeChange);

    // Initial attributes for maximum browser autoplay compatibility
    video.autoplay = true;
    video.playsInline = true;
    video.preload = 'auto';

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    const setup = async () => {
      try {
        const Hls = (await import('hls.js')).default;
        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 60,
            maxBufferLength: 30,
            maxBufferSize: 60 * 1000 * 1000,
            fragLoadingTimeOut: 20000,
            fragLoadingMaxRetry: 6,
            levelLoadingTimeOut: 10000,
            levelLoadingMaxRetry: 4,
            manifestLoadingTimeOut: 10000,
            manifestLoadingMaxRetry: 2,
            startLevel: -1,
          });
          hlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (offsetRef.current > 0 && !seekPerformed.current) {
              video.currentTime = offsetRef.current;
              seekPerformed.current = true;
            }
            video.play().catch((err) => {
              console.warn('[HLS] Unmuted play blocked by browser, trying muted:', err);
              video.muted = true;
              setIsMuted(true);
              video.play().catch(() => {
                setIsPaused(true);
              });
            });
          });

          hls.on(Hls.Events.ERROR, (_: any, data: any) => {
            if (data.fatal) {
              console.error('[HLS] Fatal error:', data);
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  hls.recoverMediaError();
                  break;
                default:
                  hls.destroy();
                  setError('Stream temporarily interrupted — click to retry');
                  break;
              }
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Native Safari / iOS HLS
          video.src = url;
          video.load();
          if (offsetRef.current > 0 && !seekPerformed.current) {
            video.currentTime = offsetRef.current;
            seekPerformed.current = true;
          }
          video.play().catch(() => {
            video.muted = true;
            setIsMuted(true);
            video.play().catch(() => {
              setIsPaused(true);
            });
          });
        } else {
          setError('Video playback is not supported on this browser');
        }
      } catch (err) {
        console.error('[HLS] Setup error:', err);
        setError('Failed to load video player');
      }
    };

    setup();

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('volumechange', onVolumeChange);
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [url, videoRef]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black p-4 text-center">
        <div>
          <p className="text-red-400 mb-2 font-medium">{error}</p>
          <button
            onClick={() => { setError(null); seekPerformed.current = false; }}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-semibold shadow cursor-pointer"
          >
            Retry Playback
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#000' }}
      className="cursor-pointer group"
      onClick={handlePlayOrUnmute}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        crossOrigin="anonymous"
        className="sadhana-video"
        style={{ display: 'block', width: '100%', height: '100%', backgroundColor: '#000', outline: 'none', border: 'none' }}
      />

      {/* Tap to Play Overlay when Autoplay was blocked */}
      {isPaused && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-r from-pink-500 to-violet-600 flex items-center justify-center shadow-2xl mb-4 transform hover:scale-110 transition-transform animate-pulse">
            <Play size={40} className="ml-1 fill-white text-white" />
          </div>
          <span className="text-lg sm:text-xl font-bold text-white drop-shadow">Tap to Start Sadhana 🔴</span>
          <span className="text-xs sm:text-sm text-purple-200 mt-1">Audio & Video will play live</span>
        </div>
      )}

      {/* Tap to Unmute Audio Banner if audio was muted for autoplay */}
      {!isPaused && isMuted && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePlayOrUnmute();
          }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-pink-600 to-violet-600 text-white px-5 py-2.5 rounded-full font-bold shadow-2xl flex items-center gap-2 animate-bounce cursor-pointer border border-white/30 text-xs sm:text-sm hover:opacity-95"
        >
          <Volume2 size={18} /> Tap to Unmute Audio 🔊
        </button>
      )}

      {/* Floating Full Screen Button */}
      {onToggleFullscreen && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFullscreen();
          }}
          className="absolute bottom-3 right-3 z-30 bg-black/80 hover:bg-black/95 active:scale-95 text-white px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 border border-white/20 shadow-2xl cursor-pointer transition-all"
          title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          <span>{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</span>
        </button>
      )}
    </div>
  );
}
