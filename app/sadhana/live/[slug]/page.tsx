'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { ChevronDown, ChevronUp, LogOut, Maximize2, Minimize2, Play, Volume2 } from 'lucide-react';

// Video styling and controls hiding
if (typeof document !== 'undefined') {
  const styleId = 'sadhana-video-no-controls';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      video {
        display: block !important;
        width: 100% !important;
        height: 100% !important;
        outline: none !important;
        border: none !important;
        background: #000 !important;
        --webkit-audio-session: playback !important;
      }
      video::-webkit-media-controls { display: none !important; visibility: hidden !important; height: 0 !important; width: 0 !important; pointer-events: none !important; }
      video::-webkit-media-controls-enclosure { display: none !important; }
      video::-webkit-media-controls-panel { display: none !important; }
      video::-webkit-media-controls-play-button { display: none !important; }
      video::-webkit-media-controls-timeline { display: none !important; }
      video::-moz-media-controls { display: none !important; visibility: hidden !important; height: 0 !important; }
      video { user-select: none !important; -webkit-user-select: none !important; }
    `;
    document.head.appendChild(style);
  }

  const enforceNoControls = () => {
    document.querySelectorAll('video').forEach((video: any) => {
      video.removeAttribute('controls');
      video.removeAttribute('controlsList');
      video.style.outline = 'none';
      video.style.border = 'none';
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.display = 'block';
    });
  };

  enforceNoControls();
  if (typeof window !== 'undefined') {
    const observer = new MutationObserver(enforceNoControls);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
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
  const [fullscreenMode, setFullscreenMode] = useState(false);
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
    }
  }, []);

  useEffect(() => {
    const onFullScreenChange = () => {
      setFullscreenMode(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullScreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setFullscreenMode(false);
      } else {
        await containerRef.current.requestFullscreen();
        setFullscreenMode(true);
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err);
      setFullscreenMode((prev) => !prev);
    }
  };

  useEffect(() => { setName(storedName()); sidRef.current = storedSid(slug); }, [slug]);

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

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    localStorage.setItem('sadhana_live_name', name.trim());
    await fetch(`/api/sadhana/live/${slug}/join`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sidRef.current, name: name.trim() }),
    });
    setJoined(true);
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

  const sendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    await fetch(`/api/sadhana/live/${slug}/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, message: chatInput.trim() }),
    });
    setChatInput('');
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
      : [];

    sessionView = (
      <div className="w-full h-full flex items-center justify-center p-4 sm:p-8">
        <div className="text-center max-w-md">
          <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">⏳</div>
          <p className="text-base sm:text-xl text-purple-100 mb-2 font-medium">
            {todayVideo ? 'Session starts later today' : 'No session scheduled for today'}
          </p>
          {todayVideo?.title && (
            <p className="text-xs sm:text-sm text-purple-300 mb-4">
              Today's Practice: <span className="font-semibold text-white">{todayVideo.title}</span>
            </p>
          )}

          {session?.nextSessionUtc && program && (
            <div className="mb-4 sm:mb-6 p-4 bg-purple-900/40 border border-purple-500/50 rounded-xl">
              <p className="text-xs text-purple-300 uppercase tracking-wider mb-1">Next Live Broadcast</p>
              <p className="text-lg sm:text-xl font-bold text-white">
                {fmtTime(session.nextSessionUtc, program.timezone)}
              </p>
            </div>
          )}

          {scheduleList.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-xs sm:text-sm text-purple-300">Daily Sessions (IST)</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {scheduleList.map((time: string, idx: number) => (
                  <span key={idx} className="bg-pink-600 text-white px-3 py-1 rounded-full text-xs sm:text-sm font-semibold shadow">
                    {time}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    );
  } else if (session.status === 'countdown') {
    const ms = new Date(session.sessionStartUtc!).getTime() - nowTick.getTime();
    sessionView = (
      <div className="w-full h-full flex items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-purple-800 to-indigo-900">
        <div className="text-center">
          <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">🧘</div>
          <p className="text-lg sm:text-2xl text-white mb-2">Session starting in</p>
          <div className="text-5xl sm:text-7xl font-bold text-white my-3 sm:my-4">{fmtCountdown(ms)}</div>
          <p className="text-xs sm:text-base text-purple-200">🤖 Swar Sadhana Bot will play video automatically</p>
          {todayVideo?.title && (
            <p className="text-purple-300 text-xs sm:text-sm mt-3">Today: {todayVideo.title}</p>
          )}
        </div>
      </div>
    );
  } else if (session.status === 'ended') {
    sessionView = (
      <div className="w-full h-full flex items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-indigo-900 to-purple-900">
        <div className="text-center">
          <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">🙏</div>
          <p className="text-xl sm:text-2xl text-white mb-2">Session Complete</p>
          <p className="text-sm sm:text-base text-purple-200 mb-4">Thank you for practicing with us</p>
          {upcoming[0] && (
            <p className="text-purple-300 text-xs sm:text-sm">Next: {fmtDate(upcoming[0].date)} {upcoming[0].title && `- ${upcoming[0].title}`}</p>
          )}
          <div className="mt-4">
            <button
              onClick={() => setPreviewMode(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-purple-200 hover:text-white rounded text-xs transition cursor-pointer"
            >
              <Play size={14} /> Replay Video
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isLiveVideo = session?.status === 'live' && (playerMode === 'hls' || playableUrl);

  return (
    <div ref={containerRef} className={`${fullscreenMode ? 'fixed inset-0 z-50' : 'min-h-screen'} bg-gradient-to-br from-purple-900 via-indigo-900 to-black text-white`}>
      {!fullscreenMode && (
        <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-3 sm:mb-4 bg-white/10 backdrop-blur-lg rounded-lg sm:rounded-xl p-2 sm:p-4 border border-white/20">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="text-2xl sm:text-3xl flex-shrink-0">🧘</div>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-lg md:text-xl font-bold truncate">{program?.name || 'Sadhana Live'}</h1>
                <p className="text-xs sm:text-sm text-purple-200 truncate">
                  {todayVideo?.title ? `Today: ${todayVideo.title}` : 'Community Program'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-semibold ${isLive ? 'bg-red-500' : 'bg-purple-600'}`}>
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse flex-shrink-0"></span>
                <span className="truncate">{isLive ? (previewMode ? 'PREVIEW' : 'LIVE') : (session?.status?.toUpperCase() || 'ONLINE')} • {count}</span>
              </div>
              <button
                onClick={toggleFullscreen}
                className="bg-purple-600 hover:bg-purple-500 p-1.5 sm:p-2 rounded-lg transition flex-shrink-0 cursor-pointer"
                title={fullscreenMode ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {fullscreenMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                onClick={handleLeave}
                className="bg-red-600 hover:bg-red-500 p-1.5 sm:p-2 rounded-lg transition flex items-center gap-1 flex-shrink-0 cursor-pointer"
                title="Leave session"
              >
                <LogOut size={16} /> <span className="text-xs sm:text-sm hidden sm:inline">Leave</span>
              </button>
            </div>
          </div>

          <div>
            <div className={`grid grid-cols-1 ${showSidebar && !fullscreenMode ? 'md:grid-cols-4' : 'md:grid-cols-1'} gap-2 sm:gap-4`}>
              <div className={`${showSidebar && !fullscreenMode ? 'md:col-span-3' : 'md:col-span-1'} bg-black rounded-lg sm:rounded-xl overflow-hidden aspect-video relative`}>
                {sessionView}
                {previewMode && (
                  <div className="absolute top-3 left-3 z-30 bg-amber-500 text-black px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 shadow-lg">
                    <span>👁️ Preview Mode</span>
                    <button
                      onClick={() => setPreviewMode(false)}
                      className="ml-2 underline text-xs font-semibold hover:opacity-80 cursor-pointer bg-black/20 px-1.5 py-0.5 rounded"
                    >
                      Exit Preview
                    </button>
                  </div>
                )}
                {showSidebar && (
                  <button
                    onClick={() => setShowSidebar(false)}
                    className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white p-2 rounded-lg transition text-xs font-semibold z-20 cursor-pointer"
                    title="Hide sidebar for fullscreen video"
                  >
                    ⛔ Hide
                  </button>
                )}
              </div>

            {showSidebar && !fullscreenMode && (
              <div className="hidden md:flex flex-col space-y-3 max-h-[calc(100vh-120px)] overflow-y-auto pr-1">
                {/* 1. Participants */}
                <div className="bg-white/10 backdrop-blur-lg rounded-lg sm:rounded-xl p-3 sm:p-3.5 border border-white/20 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                      <span>👥</span> Participants <span className="text-purple-300 font-normal">({count})</span>
                    </h2>
                    <button
                      onClick={() => setShowParticipants(!showParticipants)}
                      className="text-gray-300 hover:text-white hover:bg-white/10 p-1 rounded transition cursor-pointer"
                      title={showParticipants ? 'Hide' : 'Show'}
                    >
                      {showParticipants ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                  {showParticipants && (
                    <div className="mt-2 space-y-1 max-h-28 overflow-y-auto pr-1">
                      {participants.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 px-2 py-1.5 bg-white/5 rounded-lg text-xs">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                            {p.name[0]?.toUpperCase() || '?'}
                          </div>
                          <span className="truncate">{p.name}</span>
                        </div>
                      ))}
                      {participants.length === 0 && (
                        <p className="text-purple-200 text-xs text-center py-2">No participants yet</p>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Live Chat (UPPER SIDE for easy access during live session) */}
                {session?.status !== 'ended' && (
                  <div className="bg-white/10 backdrop-blur-lg rounded-lg sm:rounded-xl p-3 sm:p-3.5 border border-white/20 flex flex-col h-[340px] md:h-[380px] flex-shrink-0 shadow-lg">
                    <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/10 flex-shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <h2 className="font-semibold text-xs sm:text-sm">💬 Live Chat</h2>
                      </div>
                      <button
                        onClick={() => setShowChat(!showChat)}
                        className="text-gray-300 hover:text-white hover:bg-white/10 p-1 rounded transition cursor-pointer"
                        title={showChat ? 'Hide' : 'Show'}
                      >
                        {showChat ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                    {showChat && (
                      <>
                        <div 
                          ref={chatMessagesRef}
                          className="flex-1 overflow-y-auto space-y-2 mb-2 pr-1 min-h-0"
                        >
                          {chat.map((msg) => (
                            <div key={msg.id} className="text-xs">
                              <span className="font-semibold text-pink-300">{msg.name}:</span>{' '}
                              <span className="text-white break-words">{msg.message}</span>
                            </div>
                          ))}
                          {chat.length === 0 && (
                            <p className="text-purple-200 text-xs text-center py-6">Be the first to say Namaste 🙏</p>
                          )}
                          <div ref={chatEnd} />
                        </div>
                        <form onSubmit={sendChat} className="flex gap-1.5 pt-2 border-t border-white/10 flex-shrink-0">
                          <input
                            type="text" 
                            value={chatInput} 
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Type a message..." 
                            maxLength={300}
                            className="flex-1 px-2.5 py-1.5 bg-white/20 rounded-lg text-xs placeholder-purple-200 border border-white/30 focus:outline-none focus:border-pink-400"
                          />
                          <button 
                            type="submit" 
                            className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-violet-500 rounded-lg font-semibold text-xs hover:opacity-90 transition cursor-pointer flex-shrink-0 shadow-sm"
                          >
                            Send
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                )}

                {/* 3. Upcoming Schedule (KEPT IN BOTTOM) */}
                {upcoming.length > 0 && (
                  <div className="bg-white/10 backdrop-blur-lg rounded-lg sm:rounded-xl p-3 sm:p-3.5 border border-white/20 flex-shrink-0">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                        <span>📅</span> Upcoming Schedule <span className="text-purple-300 font-normal">({upcoming.length})</span>
                      </h2>
                      <button
                        onClick={() => setShowUpcoming(!showUpcoming)}
                        className="text-gray-300 hover:text-white hover:bg-white/10 p-1 rounded transition cursor-pointer"
                        title={showUpcoming ? 'Hide' : 'Show'}
                      >
                        {showUpcoming ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                    {showUpcoming && (
                      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                        {upcoming.slice(0, 4).map((v, i) => (
                          <div key={i} className="px-2.5 py-1.5 bg-white/5 rounded-lg text-xs">
                            <div className="text-purple-300 text-[10px] font-medium">{fmtDate(v.date)}</div>
                            {v.title && <div className="text-white text-xs truncate">{v.title}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {showSidebar && !fullscreenMode && (
              <div className="fixed inset-0 md:hidden bg-black/50 z-40" onClick={() => setShowSidebar(false)}></div>
            )}

            {showSidebar && !fullscreenMode && (
              <div className="fixed bottom-0 left-0 right-0 md:hidden bg-gradient-to-br from-purple-900 via-indigo-900 to-black rounded-t-xl border-t border-white/20 z-50 max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between p-3 border-b border-white/10">
                  <h2 className="font-semibold text-white">📱 Session Info</h2>
                  <button onClick={() => setShowSidebar(false)} className="text-gray-300 hover:text-white">✕</button>
                </div>
                <div className="p-3 space-y-3">
                  {/* 1. Mobile Participants */}
                  <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-xs sm:text-sm flex items-center gap-1">👥 Participants ({count})</h3>
                      <button
                        onClick={() => setShowParticipants(!showParticipants)}
                        className="text-gray-300 hover:text-white p-1 rounded transition cursor-pointer"
                      >
                        {showParticipants ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                    {showParticipants && (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {participants.map((p, i) => (
                          <div key={i} className="flex items-center gap-2 px-2 py-1.5 bg-white/5 rounded text-xs">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                              {p.name[0]?.toUpperCase() || '?'}
                            </div>
                            <span className="truncate">{p.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 2. Mobile Live Chat (UPPER SIDE) */}
                  {session?.status !== 'ended' && (
                    <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20 flex flex-col h-64">
                      <h3 className="font-semibold text-xs sm:text-sm mb-2 pb-1 border-b border-white/10">💬 Live Chat</h3>
                      <div ref={mobileChatMessagesRef} className="flex-1 overflow-y-auto space-y-2 mb-2 min-h-0 pr-1">
                        {chat.map((msg) => (
                          <div key={msg.id} className="text-xs">
                            <span className="font-semibold text-pink-300">{msg.name}:</span> <span className="text-white break-words">{msg.message}</span>
                          </div>
                        ))}
                        {chat.length === 0 && (
                          <p className="text-purple-200 text-xs text-center py-4">Be the first to say Namaste 🙏</p>
                        )}
                      </div>
                      <form onSubmit={sendChat} className="flex gap-1.5 pt-1.5 border-t border-white/10">
                        <input
                          type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Say Namaste..." maxLength={300}
                          className="flex-1 px-2.5 py-1.5 bg-white/20 rounded text-xs placeholder-purple-300 border border-white/30 focus:outline-none focus:border-white"
                        />
                        <button type="submit" className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-violet-500 rounded font-semibold text-xs hover:opacity-90">Send</button>
                      </form>
                    </div>
                  )}

                  {/* 3. Mobile Upcoming Schedule (BOTTOM) */}
                  {upcoming.length > 0 && (
                    <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-xs sm:text-sm">📅 Upcoming Schedule</h3>
                        <button
                          onClick={() => setShowUpcoming(!showUpcoming)}
                          className="text-gray-300 hover:text-white p-1 rounded transition cursor-pointer"
                        >
                          {showUpcoming ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                      {showUpcoming && (
                        <div className="space-y-1 max-h-28 overflow-y-auto">
                          {upcoming.slice(0, 3).map((v, i) => (
                            <div key={i} className="px-2 py-1.5 bg-white/5 rounded text-xs">
                              <div className="text-purple-200 text-[10px]">{fmtDate(v.date)}</div>
                              {v.title && <div className="text-white text-xs truncate">{v.title}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {!showSidebar && (
            <button
              onClick={() => setShowSidebar(true)}
              className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 bg-gradient-to-r from-pink-500 to-violet-500 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-semibold hover:opacity-90 transition z-40 text-sm sm:text-base shadow-xl border border-white/20"
              title="Show sidebar"
            >
              💬 Chat & Info
            </button>
          )}

          {announcement && (
            <div className="mt-3 sm:mt-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-900 rounded-lg overflow-hidden border border-purple-500/30">
              <div className="py-2 px-2 sm:px-4">
                <div className="animate-marquee whitespace-nowrap text-white text-xs sm:text-sm font-medium">
                  📢 {announcement} • 📢 {announcement} •
                </div>
              </div>
            </div>
          )}

          <div className="mt-3 sm:mt-4 text-center text-purple-200 text-[10px] sm:text-xs">Swar Yoga • Sadhana Live • Namaste 🙏</div>
        </div>
      </div>
    )}

      {fullscreenMode && (
        <div className="w-full h-full flex flex-col">
          <div className="flex-1 relative">
            {sessionView}
            <div className="absolute top-2 right-2 z-50">
              <button
                onClick={toggleFullscreen}
                className="bg-purple-600 hover:bg-purple-500 text-white p-2 rounded font-semibold text-sm"
                title="Exit fullscreen"
              >
                {fullscreenMode ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface HLSPlayerProps {
  url: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  offsetSeconds: number;
}

function HLSPlayer({ url, videoRef, offsetSeconds }: HLSPlayerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const seekPerformed = useRef(false);
  const hlsRef = useRef<any>(null);

  const unmuteAudio = () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.volume = 1;
      setIsMuted(false);
      videoRef.current.play().catch(() => {});
    }
  };

  useEffect(() => {
    if (!videoRef.current || !url) return;

    const isValidHlsUrl = url.endsWith('.m3u8') || url.includes('playlist') || url.includes('b-cdn.net');
    if (!isValidHlsUrl) { setError('Invalid stream URL'); return; }

    const video = videoRef.current;
    seekPerformed.current = false;

    const handleRateChange = () => { if (video.playbackRate !== 1) video.playbackRate = 1; };
    const handleCanPlay = () => {
      if (video.paused) {
        video.play().catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {});
        });
      }
    };

    video.autoplay = true;
    video.playsInline = true;
    video.preload = 'auto';

    video.addEventListener('ratechange', handleRateChange);
    video.addEventListener('canplay', handleCanPlay);

    // Destroy previous hls instance
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
            video.play().catch((err) => {
              console.warn('[HLS] Autoplay with sound blocked, trying muted:', err);
              video.muted = true;
              setIsMuted(true);
              video.play().catch((e) => console.error('[HLS] Muted play failed:', e));
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
                  setError('Stream error — please refresh');
                  break;
              }
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Safari native HLS
          video.src = url;
          video.load();
          video.play().catch((err) => {
            console.warn('[Safari HLS] Autoplay blocked, trying muted:', err);
            video.muted = true;
            setIsMuted(true);
            video.play().catch(() => {});
          });
        } else {
          setError('Video playback not supported on this browser');
        }
      } catch (err) {
        console.error('[HLS] Setup error:', err);
        setError('Failed to load video player');
      }
    };

    setup();

    return () => {
      video.removeEventListener('ratechange', handleRateChange);
      video.removeEventListener('canplay', handleCanPlay);
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [url, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url || seekPerformed.current || offsetSeconds <= 0) return;
    const handleLoadedMetadata = () => {
      if (!seekPerformed.current) {
        video.currentTime = offsetSeconds;
        seekPerformed.current = true;
      }
    };
    if (video.readyState >= 1) {
      video.currentTime = offsetSeconds;
      seekPerformed.current = true;
    } else {
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    }
  }, [offsetSeconds, url, videoRef]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black p-4 text-center">
        <div>
          <p className="text-red-400 mb-2 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#000' }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        crossOrigin="anonymous"
        style={{ display: 'block', width: '100%', height: '100%', backgroundColor: '#000', outline: 'none', border: 'none' } as React.CSSProperties}
      />

      {isMuted && (
        <button
          onClick={unmuteAudio}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-pink-600 to-violet-600 text-white px-5 py-2.5 rounded-full font-bold shadow-2xl flex items-center gap-2 animate-bounce cursor-pointer border border-white/30 text-xs sm:text-sm hover:opacity-95"
        >
          <Volume2 size={18} /> Tap to Unmute Audio 🔊
        </button>
      )}

      {/* Transparent overlay blocks right-click / unwanted seeking while allowing tap-to-unmute */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 10,
          backgroundColor: 'transparent',
        }}
        onClick={() => {
          if (isMuted) unmuteAudio();
        }}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
