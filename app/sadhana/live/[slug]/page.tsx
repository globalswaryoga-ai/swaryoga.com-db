'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { ChevronDown, ChevronUp, LogOut, Maximize2, Minimize2, Play } from 'lucide-react';

// Hide Bunny player controls globally
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    /* Hide Bunny player controls */
    .bm-video-controls { display: none !important; }
    .bm-player-controls { display: none !important; }
    .bm-controls { display: none !important; }
    [class*="controls"] { display: none !important; }
    [class*="player-ui"] { display: none !important; }
    /* Block interactions with player chrome */
    iframe[src*="mediadelivery"] ~ * { pointer-events: none !important; }
  `;
  document.head.appendChild(style);
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
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [playerMode, setPlayerMode] = useState<'player' | 'hls'>('player');
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [videoStarted, setVideoStarted] = useState(false);
  const sidRef = useRef<string>('');
  const chatEnd = useRef<HTMLDivElement>(null);
  const urlSetRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);

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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="text-5xl mb-4">🤔</div>
          <h1 className="text-2xl font-bold mb-2">Program Not Found</h1>
          <p className="text-purple-200">The program "{slug}" doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full border border-white/20">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">🧘</div>
            <h1 className="text-3xl font-bold text-white mb-2">Sadhana Live</h1>
            <p className="text-purple-200">Join the community session</p>
          </div>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-white mb-2 text-sm">Your Name</label>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name" required autoFocus
                className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-purple-200 border border-white/30 focus:outline-none focus:border-white"
              />
            </div>
            <button type="submit" className="w-full bg-gradient-to-r from-pink-500 to-violet-500 text-white font-semibold py-3 rounded-lg hover:opacity-90 transition">
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
      <div className="w-full h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl text-purple-100 mb-4">
            {todayVideo ? 'Session starts later today' : 'No session scheduled for today'}
          </p>

          {session?.nextSessionUtc && program && (
            <div className="mb-6 p-4 bg-purple-900/40 border border-purple-500/50 rounded-lg">
              <p className="text-sm text-purple-300 mb-2">Next Session</p>
              <p className="text-lg font-bold text-white">
                {fmtTime(session.nextSessionUtc, program.timezone)}
              </p>
            </div>
          )}

          {program?.scheduleTime && (
            <div className="space-y-2">
              <p className="text-sm text-purple-300">Today's Sessions</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {Array.isArray(program.scheduleTime) ? (
                  program.scheduleTime.map((time: string, idx: number) => (
                    <span key={idx} className="bg-pink-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      {time}
                    </span>
                  ))
                ) : (
                  <span className="bg-pink-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
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
      <div className="w-full h-full flex items-center justify-center p-8 bg-gradient-to-br from-purple-800 to-indigo-900">
        <div className="text-center">
          <div className="text-6xl mb-4">🧘</div>
          <p className="text-2xl text-white mb-2">Session starting in</p>
          <div className="text-7xl font-bold text-white my-4">{fmtCountdown(ms)}</div>
          <p className="text-purple-200">🤖 Swar Sadhana Bot will play video automatically</p>
          {todayVideo?.title && (
            <p className="text-purple-300 text-sm mt-3">Today: {todayVideo.title}</p>
          )}
        </div>
      </div>
    );
  } else if (session.status === 'live') {
    if (playerMode === 'hls' && playerUrl) {
      sessionView = (
        <div className="relative w-full h-full">
          <HLSPlayer url={playerUrl} videoRef={videoRef} offsetSeconds={session.videoOffsetSeconds} />
          <button
            onClick={() => {
              if (videoRef.current?.requestFullscreen) videoRef.current.requestFullscreen();
              else if ((videoRef.current as any)?.webkitRequestFullscreen) (videoRef.current as any).webkitRequestFullscreen();
            }}
            className="absolute top-4 right-4 z-10 bg-black/60 hover:bg-black/80 text-white p-2 rounded transition"
          >
            <Maximize2 size={20} />
          </button>
        </div>
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
            key={`${videoStarted}`}
            src={videoStarted ? playerUrlWithParams : playableUrl}
            className="w-full h-full"
            allow="autoplay; encrypted-media"
            sandbox="allow-scripts allow-same-origin"
            style={{ border: 'none' }}
            autoPlay={videoStarted}
            title="Video player"
          />
          {!videoStarted && (
            <button
              onClick={() => setVideoStarted(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/20 transition z-40"
              title="Start video"
            >
              <div className="flex items-center justify-center w-20 h-20 bg-white/30 rounded-full hover:bg-white/50 transition">
                <Play size={40} fill="white" className="text-white ml-1" />
              </div>
            </button>
          )}
          {videoStarted && (
            <>
              <div className="absolute bottom-0 left-0 right-0 h-16 z-40 bg-black/50" />
              <button
                onClick={() => {
                  const iframe = document.querySelector('iframe') as HTMLIFrameElement | null;
                  if (iframe?.requestFullscreen) iframe.requestFullscreen().catch(() => {});
                  else if ((iframe as any)?.webkitRequestFullscreen) (iframe as any).webkitRequestFullscreen();
                }}
                className="absolute top-4 right-4 z-40 bg-black/60 hover:bg-black/80 text-white p-2 rounded transition"
                title="Fullscreen"
              >
                <Maximize2 size={20} />
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center"><p className="text-purple-200">Loading video...</p></div>
      );
    }
  } else if (session.status === 'ended') {
    sessionView = (
      <div className="w-full h-full flex items-center justify-center p-8 bg-gradient-to-br from-indigo-900 to-purple-900">
        <div className="text-center">
          <div className="text-6xl mb-4">🙏</div>
          <p className="text-2xl text-white mb-2">Session Complete</p>
          <p className="text-purple-200 mb-4">Thank you for practicing with us</p>
          {upcoming[0] && (
            <p className="text-purple-300 text-sm">Next: {fmtDate(upcoming[0].date)} {upcoming[0].title && `- ${upcoming[0].title}`}</p>
          )}
        </div>
      </div>
    );
  }

  const isLive = session?.status === 'live';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black text-white">
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4 bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🧘</div>
            <div>
              <h1 className="text-xl font-bold">{program?.name || 'Sadhana Live'}</h1>
              <p className="text-sm text-purple-200">
                {todayVideo?.title ? `Today: ${todayVideo.title}` : 'Community Program'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${isLive ? 'bg-red-500' : 'bg-purple-600'}`}>
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              <span className="font-semibold">{isLive ? 'LIVE' : (session?.status?.toUpperCase() || 'ONLINE')} • {count}</span>
            </div>
            <button
              onClick={() => setFullscreenMode(!fullscreenMode)}
              className="bg-purple-600 hover:bg-purple-500 p-2 rounded-lg transition"
              title={fullscreenMode ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {fullscreenMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              onClick={handleLeave}
              className="bg-red-600 hover:bg-red-500 p-2 rounded-lg transition flex items-center gap-2"
              title="Leave session"
            >
              <LogOut size={18} /> <span className="text-sm hidden sm:inline">Leave</span>
            </button>
          </div>
        </div>

        <div>
          <div className={`grid grid-cols-1 ${showSidebar && !fullscreenMode ? 'lg:grid-cols-4' : 'lg:grid-cols-1'} gap-4`}>
            <div className={`${showSidebar && !fullscreenMode ? 'lg:col-span-3' : 'lg:col-span-1'} bg-black rounded-xl overflow-hidden aspect-video relative`}>
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

            {showSidebar && !fullscreenMode && <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">👥 Participants ({count})</h2>
                <button
                  onClick={() => setShowParticipants(!showParticipants)}
                  className="text-gray-300 hover:text-white hover:bg-white/10 p-1 rounded transition"
                  title={showParticipants ? 'Hide' : 'Show'}
                >
                  {showParticipants ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                </button>
              </div>
              {showParticipants && (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {participants.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg text-sm">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-xs font-bold">
                        {p.name[0]?.toUpperCase() || '?'}
                      </div>
                      <span className="truncate">{p.name}</span>
                    </div>
                  ))}
                  {participants.length === 0 && (
                    <p className="text-purple-200 text-sm text-center py-4">No participants yet</p>
                  )}
                </div>
              )}
            </div>

            {upcoming.length > 0 && (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
                <h2 className="font-semibold mb-3">📅 Upcoming</h2>
                <div className="space-y-1">
                  {upcoming.slice(0, 4).map((v, i) => (
                    <div key={i} className="px-3 py-2 bg-white/5 rounded-lg text-sm">
                      <div className="text-purple-200 text-xs">{fmtDate(v.date)}</div>
                      {v.title && <div className="text-white">{v.title}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {session?.status !== 'ended' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 flex flex-col h-96">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold">💬 Live Chat</h2>
                  <button
                    onClick={() => setShowChat(!showChat)}
                    className="text-gray-300 hover:text-white hover:bg-white/10 p-1 rounded transition"
                    title={showChat ? 'Hide' : 'Show'}
                  >
                    {showChat ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                  </button>
                </div>
                {showChat && (
                  <>
                    <div className="flex-1 overflow-y-auto space-y-2 mb-3">
                      {chat.map((msg) => (
                        <div key={msg.id} className="text-sm">
                          <span className="font-semibold text-pink-300">{msg.name}:</span>{' '}
                          <span className="text-white">{msg.message}</span>
                        </div>
                      ))}
                      {chat.length === 0 && (
                        <p className="text-purple-200 text-sm text-center py-4">Be the first to say Namaste 🙏</p>
                      )}
                      <div ref={chatEnd} />
                    </div>
                    <form onSubmit={sendChat} className="flex gap-2">
                      <input
                        type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Type a message..." maxLength={300}
                        className="flex-1 px-3 py-2 bg-white/20 rounded-lg text-sm placeholder-purple-200 border border-white/30 focus:outline-none focus:border-white"
                      />
                      <button type="submit" className="px-4 py-2 bg-gradient-to-r from-pink-500 to-violet-500 rounded-lg font-semibold text-sm hover:opacity-90">Send</button>
                    </form>
                  </>
                )}
              </div>
            )}
            </div>}
          </div>

          {!showSidebar && (
            <button
              onClick={() => setShowSidebar(true)}
              className="absolute bottom-20 right-4 bg-gradient-to-r from-pink-500 to-violet-500 text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition z-40"
              title="Show sidebar"
            >
              👁 Show Chat & Participants
            </button>
          )}

          {announcement && (
            <div className="mt-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-900 rounded-lg overflow-hidden border border-purple-500/30">
              <div className="py-2 px-4">
                <div className="animate-marquee whitespace-nowrap text-white text-sm font-medium">
                  📢 {announcement} • 📢 {announcement} •
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-center text-purple-200 text-xs">Swar Yoga • Sadhana Live • Namaste 🙏</div>
      </div>
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

  useEffect(() => {
    if (!videoRef.current || !url) return;

    const isValidHlsUrl = url && (url.endsWith('.m3u8') || url.includes('playlist'));
    if (!isValidHlsUrl) {
      setError('Invalid HLS URL');
      return;
    }

    const video = videoRef.current;

    const handleSeeking = (e: Event) => {
      console.log('Seeking attempt blocked');
      e.preventDefault();
    };
    const handleRateChange = (e: Event) => {
      console.log('Speed change blocked');
      if (video.playbackRate !== 1) video.playbackRate = 1;
    };

    video.addEventListener('seeking', handleSeeking);
    video.addEventListener('ratechange', handleRateChange);

    console.log('Native HLS setup, offset:', offsetSeconds);

    const loadHLS = async () => {
      try {
        console.log('Loading HLS URL:', url);
        const scriptId = 'hls-js-script';
        if (document.getElementById(scriptId)) {
          const HLS = (window as any).HLS;
          console.log('HLS.js already loaded, HLS available:', !!HLS);
          if (HLS && HLS.isSupported()) {
            console.log('Creating new HLS instance');
            const hls = new HLS({ autoStartLoad: true });
            hls.loadSource(url);
            hls.attachMedia(videoRef.current);
            hls.on((window as any).HLS.Events.MANIFEST_PARSED, () => {
              console.log('HLS manifest parsed, applying offset:', offsetSeconds);
              if (videoRef.current && offsetSeconds > 0) {
                videoRef.current.currentTime = offsetSeconds;
              }
              videoRef.current?.play().catch((err) => console.error('Play error:', err));
            });
            hls.on((window as any).HLS.Events.ERROR, (event: any, data: any) => {
              console.error('HLS error:', data);
            });
          } else {
            console.warn('HLS not supported in this browser');
            setError('HLS not supported in this browser');
          }
        } else {
          console.log('Loading HLS.js script from CDN');
          const script = document.createElement('script');
          script.id = scriptId;
          script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js';
          script.onload = () => {
            console.log('HLS.js script loaded');
            const HLS = (window as any).HLS;
            if (HLS && HLS.isSupported() && videoRef.current) {
              console.log('Creating HLS instance after script load');
              const hls = new HLS({ autoStartLoad: true });
              hls.loadSource(url);
              hls.attachMedia(videoRef.current);
              hls.on((window as any).HLS.Events.MANIFEST_PARSED, () => {
                console.log('HLS manifest parsed, applying offset:', offsetSeconds);
                if (videoRef.current && offsetSeconds > 0) {
                  videoRef.current.currentTime = offsetSeconds;
                }
                videoRef.current?.play().catch((err) => console.error('Play error:', err));
              });
              hls.on((window as any).HLS.Events.ERROR, (event: any, data: any) => {
                console.error('HLS error:', data);
              });
            }
          };
          script.onerror = () => {
            console.error('Failed to load HLS.js from CDN');
            setError('Failed to load HLS library');
          };
          document.head.appendChild(script);
        }
      } catch (err) {
        console.error('HLS loading error:', err);
        setError('Error loading HLS: ' + String(err));
      }
    };

    loadHLS();

    return () => {
      video.removeEventListener('seeking', handleSeeking);
      video.removeEventListener('ratechange', handleRateChange);
    };
  }, [url, videoRef, offsetSeconds]);

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
        console.log('Video metadata loaded, duration:', videoRef.current?.duration);
        if (videoRef.current && offsetSeconds > 0) {
          videoRef.current.currentTime = offsetSeconds;
        }
        videoRef.current?.play().catch((err) => console.error('Play failed:', err));
      }}
      onError={(e) => {
        console.error('Video error:', (e.target as HTMLVideoElement).error?.message);
        setError('Failed to load video');
      }}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}
    >
      <source src={url} type="application/x-mpegURL" />
      Your browser does not support HLS video playback.
    </video>
  );
}
