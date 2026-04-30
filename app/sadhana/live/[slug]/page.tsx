'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { ChevronDown, ChevronUp, LogOut, Maximize2, Minimize2, Play } from 'lucide-react';

// Hide all player controls - ONLY show minimize/maximize buttons
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    /* Hide ALL video controls */
    video::-webkit-media-controls { display: none !important; }
    video::-webkit-media-controls-enclosure { display: none !important; }
    video::-webkit-media-controls-panel { display: none !important; }
    video::-moz-media-controls { display: none !important; }

    /* Hide iframe/Bunny player controls */
    .bunny-player { width: 100% !important; height: 100% !important; }
    iframe[src*="bunny"], iframe[src*="cdn"] {
      width: 100% !important;
      height: 100% !important;
    }

    /* Fullscreen video container */
    .video-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 50;
    }
  `;
  style.setAttribute('data-hide-video-controls', 'true');
  document.head.appendChild(style);

  // Hide all video controls
  const observer = new MutationObserver(() => {
    document.querySelectorAll('video').forEach(video => {
      video.removeAttribute('controls');
      video.style.outline = 'none';
    });
    // Hide iframe controls
    document.querySelectorAll('iframe').forEach(iframe => {
      const src = iframe.src || '';
      if (src.includes('bunny') || src.includes('cdn')) {
        iframe.style.width = '100%';
        iframe.style.height = '100%';
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

interface Participant { name: string; joinedAt: string; }
interface ChatMsg { id: string; name: string; message: string; createdAt: string; }
interface Program { slug: string; name: string; description?: string; timezone: string; scheduleTime: string; }
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
  const [showSidebar, setShowSidebar] = useState(false);
  const [fullscreenMode, setFullscreenMode] = useState(true);
  const [announcement, setAnnouncement] = useState('');
  const [playerMode, setPlayerMode] = useState<'player' | 'hls'>('player');
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [videoStarted, setVideoStarted] = useState(false);
  const sidRef = useRef<string>('');
  const chatEnd = useRef<HTMLDivElement>(null);
  const urlSetRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Mobile viewport optimization
    if (typeof window !== 'undefined') {
      document.documentElement.style.height = '100%';
      document.body.style.height = '100%';
      document.body.style.overflow = 'hidden';
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
    if (session?.status === 'live' && !videoStarted) {
      setVideoStarted(true);
    }
  }, [session?.status, videoStarted]);

  // Announcements endpoint disabled (not implemented)
  // useEffect(() => {
  //   const loadAnnouncement = async () => {
  //     try {
  //       const res = await fetch('/api/admin/sadhana-announcements');
  //       const data = await res.json();
  //       if (data.success) setAnnouncement(data.announcement);
  //     } catch (err) { console.warn('Failed to load announcement:', err); }
  //   };
  //   loadAnnouncement();
  // }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    localStorage.setItem('sadhana_live_name', name);
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
          body: JSON.stringify({ sessionId: sidRef.current }),
        });
        if (res.status === 404) { setProgramNotFound(true); return; }
        const data = await res.json();
        if (data.success) {
          setProgram(data.program);
          setTodayVideo(data.todayVideo);
          setUpcoming(data.upcomingVideos || []);
          setParticipants(data.participants || []);
          setCount(data.count || 0);
          setSession(data.session || null);
          setPlayerMode(data.playerMode || 'player');
          setPlayerUrl(data.playerUrl || null);
          // Only set playableUrl once when first going live
          if (data.session?.status === 'live' && data.playableVideoUrl && !urlSetRef.current) {
            setPlayableUrl(data.playableVideoUrl);
            urlSetRef.current = true;
          } else if (data.session?.status !== 'live') {
            // Reset ref when session is no longer live
            urlSetRef.current = false;
            if (data.session?.status !== 'live') setPlayableUrl(null);
          }
          setChat(data.chat || []);
          if (data.serverTime) setServerTime(new Date(data.serverTime));
        }
      } catch (err) { console.warn('Poll error:', err); }
    };
    poll();
    const t = setInterval(poll, 3000);
    return () => clearInterval(t);
  }, [joined, slug]);

  useEffect(() => {
    const i = setInterval(() => setNowTick(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat.length]);

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
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-6 sm:p-8 max-w-md w-full border border-white/20">
          <div className="text-center mb-6 sm:mb-8">
            <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">🧘</div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Sadhana Live</h1>
            <p className="text-sm sm:text-base text-purple-200">Join the community session</p>
          </div>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-white mb-2 text-xs sm:text-sm">Your Name</label>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name" required autoFocus
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg bg-white/20 text-white placeholder-purple-200 border border-white/30 focus:outline-none focus:border-white text-sm sm:text-base"
              />
            </div>
            <button type="submit" className="w-full bg-gradient-to-r from-pink-500 to-violet-500 text-white font-semibold py-2.5 sm:py-3 rounded-lg hover:opacity-90 transition text-sm sm:text-base">
              Join Live Session 🙏
            </button>
          </form>
        </div>
      </div>
    );
  }

  const drift = serverTime.getTime() - (nowTick.getTime() - 1000);
  const synced = new Date(nowTick.getTime() + drift);

  let sessionView: React.ReactNode = null;

  if (!session || session.status === 'waiting') {
    sessionView = (
      <div className="w-full h-full flex items-center justify-center p-4 sm:p-8">
        <div className="text-center max-w-md">
          <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">⏳</div>
          <p className="text-base sm:text-xl text-purple-100 mb-4">
            {todayVideo ? 'Session starts later today' : 'No session scheduled for today'}
          </p>

          {session?.nextSessionUtc && program && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-purple-900/40 border border-purple-500/50 rounded-lg">
              <p className="text-xs sm:text-sm text-purple-300 mb-2">Next Session</p>
              <p className="text-base sm:text-lg font-bold text-white">
                {fmtTime(session.nextSessionUtc, program.timezone)}
              </p>
            </div>
          )}

          {program?.scheduleTime && (
            <div className="space-y-2">
              <p className="text-xs sm:text-sm text-purple-300">Today's Sessions</p>
              <div className="flex flex-wrap gap-1 sm:gap-2 justify-center">
                {Array.isArray(program.scheduleTime) ? (
                  program.scheduleTime.map((time: string, idx: number) => (
                    <span key={idx} className="bg-pink-600 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold">
                      {time}
                    </span>
                  ))
                ) : (
                  <span className="bg-pink-600 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold">
                    {program.scheduleTime}
                  </span>
                )}
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
  } else if (session.status === 'live') {
    if (playerMode === 'hls' && playerUrl) {
      sessionView = (
        <HLSPlayer url={playerUrl} videoRef={videoRef} offsetSeconds={session.videoOffsetSeconds} />
      );
    } else {
      const isValidUrl = playableUrl && playableUrl.startsWith('http');
      const addParams = (url: string, ...params: string[]) => {
        const sep = url.includes('?') ? '&' : '?';
        return url + sep + params.join('&');
      };
      const playerUrlWithParams = isValidUrl ? addParams(playableUrl, 'autoplay=true') : '';
      sessionView = isValidUrl ? (
        <div className="relative w-full h-full overflow-hidden bg-black">
          <iframe
            src={playerUrlWithParams}
            className="w-full h-full"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            sandbox="allow-scripts allow-same-origin allow-presentation"
            loading="eager"
            style={{ border: 'none' }}
            title="Video player"
          />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <p className="text-purple-200">Loading video...</p>
        </div>
      );
    }
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
        </div>
      </div>
    );
  }

  const isLive = session?.status === 'live';

  const isLiveVideo = session?.status === 'live' && (playerMode === 'hls' || (playerMode !== 'hls' && playableUrl));

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
                <span className="truncate">{isLive ? 'LIVE' : (session?.status?.toUpperCase() || 'ONLINE')} • {count}</span>
              </div>
              <button
                onClick={toggleFullscreen}
                className="bg-purple-600 hover:bg-purple-500 p-1.5 sm:p-2 rounded-lg transition flex-shrink-0"
                title={fullscreenMode ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {fullscreenMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                onClick={handleLeave}
                className="bg-red-600 hover:bg-red-500 p-1.5 sm:p-2 rounded-lg transition flex items-center gap-1 flex-shrink-0"
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
                {showSidebar && (
                  <button
                    onClick={() => setShowSidebar(false)}
                    className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white p-2 rounded-lg transition text-xs font-semibold"
                    title="Hide sidebar for fullscreen video"
                  >
                    ⛔ Hide
                  </button>
                )}
              </div>

            {showSidebar && !fullscreenMode && <div className="hidden md:flex flex-col space-y-3 sm:space-y-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-lg sm:rounded-xl p-3 sm:p-4 border border-white/20">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm sm:text-base">👥 Participants ({count})</h2>
                <button
                  onClick={() => setShowParticipants(!showParticipants)}
                  className="text-gray-300 hover:text-white hover:bg-white/10 p-1 rounded transition"
                  title={showParticipants ? 'Hide' : 'Show'}
                >
                  {showParticipants ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>
              {showParticipants && (
                <div className="space-y-1 max-h-40 sm:max-h-48 overflow-y-auto">
                  {participants.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 sm:px-3 py-2 bg-white/5 rounded-lg text-xs sm:text-sm">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {p.name[0]?.toUpperCase() || '?'}
                      </div>
                      <span className="truncate">{p.name}</span>
                    </div>
                  ))}
                  {participants.length === 0 && (
                    <p className="text-purple-200 text-xs sm:text-sm text-center py-4">No participants yet</p>
                  )}
                </div>
              )}
            </div>

            {upcoming.length > 0 && (
              <div className="bg-white/10 backdrop-blur-lg rounded-lg sm:rounded-xl p-3 sm:p-4 border border-white/20">
                <h2 className="font-semibold text-sm sm:text-base mb-3">📅 Upcoming</h2>
                <div className="space-y-1">
                  {upcoming.slice(0, 4).map((v, i) => (
                    <div key={i} className="px-2 sm:px-3 py-2 bg-white/5 rounded-lg text-xs sm:text-sm">
                      <div className="text-purple-200 text-[11px] sm:text-xs">{fmtDate(v.date)}</div>
                      {v.title && <div className="text-white text-xs sm:text-sm">{v.title}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {session?.status !== 'ended' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-lg sm:rounded-xl p-3 sm:p-4 border border-white/20 flex flex-col h-64 sm:h-80 md:h-96">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-sm sm:text-base">💬 Live Chat</h2>
                  <button
                    onClick={() => setShowChat(!showChat)}
                    className="text-gray-300 hover:text-white hover:bg-white/10 p-1 rounded transition"
                    title={showChat ? 'Hide' : 'Show'}
                  >
                    {showChat ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
                {showChat && (
                  <>
                    <div className="flex-1 overflow-y-auto space-y-2 mb-3 min-h-0">
                      {chat.map((msg) => (
                        <div key={msg.id} className="text-xs sm:text-sm">
                          <span className="font-semibold text-pink-300">{msg.name}:</span>{' '}
                          <span className="text-white break-words">{msg.message}</span>
                        </div>
                      ))}
                      {chat.length === 0 && (
                        <p className="text-purple-200 text-xs sm:text-sm text-center py-4">Be the first to say Namaste 🙏</p>
                      )}
                      <div ref={chatEnd} />
                    </div>
                    <form onSubmit={sendChat} className="flex gap-1 sm:gap-2 mt-2">
                      <input
                        type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Message..." maxLength={300}
                        className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-white/20 rounded text-xs sm:text-sm placeholder-purple-200 border border-white/30 focus:outline-none focus:border-white"
                      />
                      <button type="submit" className="px-2 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-pink-500 to-violet-500 rounded font-semibold text-xs sm:text-sm hover:opacity-90">Send</button>
                    </form>
                  </>
                )}
              </div>
            )}
            </div>
            }

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
                  <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm">👥 Participants ({count})</h3>
                      <button
                        onClick={() => setShowParticipants(!showParticipants)}
                        className="text-gray-300 hover:text-white p-1 rounded transition"
                      >
                        {showParticipants ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                    {showParticipants && (
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {participants.map((p, i) => (
                          <div key={i} className="flex items-center gap-2 px-2 py-2 bg-white/5 rounded text-xs">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {p.name[0]?.toUpperCase() || '?'}
                            </div>
                            <span className="truncate">{p.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {upcoming.length > 0 && (
                    <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
                      <h3 className="font-semibold text-sm mb-2">📅 Upcoming</h3>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {upcoming.slice(0, 3).map((v, i) => (
                          <div key={i} className="px-2 py-1.5 bg-white/5 rounded text-xs">
                            <div className="text-purple-200 text-[10px]">{fmtDate(v.date)}</div>
                            {v.title && <div className="text-white text-xs">{v.title}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {session?.status !== 'ended' && (
                    <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20 flex flex-col max-h-64">
                      <h3 className="font-semibold text-sm mb-2">💬 Chat</h3>
                      <div className="flex-1 overflow-y-auto space-y-2 mb-2 min-h-0">
                        {chat.slice(-10).map((msg) => (
                          <div key={msg.id} className="text-xs">
                            <span className="font-semibold text-pink-300">{msg.name}:</span> <span className="text-white break-words">{msg.message}</span>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={sendChat} className="flex gap-1 mt-2">
                        <input
                          type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Say Namaste..." maxLength={300}
                          className="flex-1 px-2 py-1.5 bg-white/20 rounded text-xs placeholder-purple-300 border border-white/30 focus:outline-none focus:border-white"
                        />
                        <button type="submit" className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-violet-500 rounded font-semibold text-xs hover:opacity-90">Send</button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {!showSidebar && (
            <button
              onClick={() => setShowSidebar(true)}
              className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 md:hidden bg-gradient-to-r from-pink-500 to-violet-500 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-semibold hover:opacity-90 transition z-40 text-sm sm:text-base"
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

  const seekPerformed = useRef(false);

  useEffect(() => {
    if (!videoRef.current || !url) return;

    const isValidHlsUrl = url && (url.endsWith('.m3u8') || url.includes('playlist'));
    if (!isValidHlsUrl) {
      setError('Invalid HLS URL');
      return;
    }

    const video = videoRef.current;
    seekPerformed.current = false;

    const handleSeeking = (e: Event) => {
      console.log('Seeking attempt blocked');
      e.preventDefault();
    };
    const handleRateChange = (e: Event) => {
      console.log('Speed change blocked');
      if (video.playbackRate !== 1) video.playbackRate = 1;
    };
    const handleCanPlay = () => {
      if (!video.paused) return;
      video.play().catch((err) => {
        console.warn('HLS autoplay attempt failed:', err);
      });
    };

    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = url;
    video.load();
    video.addEventListener('seeking', handleSeeking);
    video.addEventListener('ratechange', handleRateChange);
    video.addEventListener('canplay', handleCanPlay);

    console.log('Native HLS setup, url:', url, 'offset:', offsetSeconds);

    const playPromise = video.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.catch((err) => {
        console.warn('Video.play() failed on init:', err);
      });
    }

    return () => {
      video.removeEventListener('seeking', handleSeeking);
      video.removeEventListener('ratechange', handleRateChange);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [url, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url || seekPerformed.current) return;
    if (offsetSeconds > 0) {
      const handleLoadedMetadata = () => {
        if (!seekPerformed.current) {
          video.currentTime = offsetSeconds;
          seekPerformed.current = true;
        }
      };
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }
  }, [offsetSeconds, url, videoRef]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      className="w-full h-full bg-black"
      autoPlay
      playsInline
      crossOrigin="anonymous"
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); return false; }}
      onKeyDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onMouseUp={(e) => { if (e.button === 2) { e.preventDefault(); e.stopPropagation(); } }}
      onLoadedMetadata={() => {
        console.log('Video metadata loaded, duration:', videoRef.current?.duration, 'offset:', offsetSeconds);
      }}
      onError={(e) => {
        console.error('Video error:', (e.target as HTMLVideoElement).error?.message);
        setError('Failed to load video');
      }}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}
    />
  );
}
