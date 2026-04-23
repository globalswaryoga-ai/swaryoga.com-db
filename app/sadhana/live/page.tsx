'use client';

import { useEffect, useRef, useState } from 'react';

interface Participant {
  name: string;
  joinedAt: string;
}

interface ChatMsg {
  id: string;
  name: string;
  message: string;
  createdAt: string;
}

interface Schedule {
  id: string;
  name: string;
  videoUrl: string;
  videoDuration: number;
}

function generateSessionId() {
  return 'sess_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function getStoredName() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('sadhana_live_name') || '';
}

function getStoredSessionId() {
  if (typeof window === 'undefined') return '';
  let id = sessionStorage.getItem('sadhana_live_session');
  if (!id) {
    id = generateSessionId();
    sessionStorage.setItem('sadhana_live_session', id);
  }
  return id;
}

export default function SadhanaLivePage() {
  const [name, setName] = useState('');
  const [joined, setJoined] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [count, setCount] = useState(0);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const sessionIdRef = useRef<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setName(getStoredName());
    sessionIdRef.current = getStoredSessionId();
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    localStorage.setItem('sadhana_live_name', name);

    await fetch('/api/sadhana/live/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionIdRef.current,
        name: name.trim(),
      }),
    });

    setJoined(true);
  };

  // Poll state every 3 seconds once joined
  useEffect(() => {
    if (!joined) return;

    const poll = async () => {
      try {
        const res = await fetch('/api/sadhana/live/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            scheduleId: schedule?.id,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setParticipants(data.participants || []);
          setCount(data.count || 0);
          if (data.schedule) setSchedule(data.schedule);
          setChat(data.chat || []);
        }
      } catch (err) {
        console.warn('Poll error:', err);
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.length]);

  const sendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    await fetch('/api/sadhana/live/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        message: chatInput.trim(),
        scheduleId: schedule?.id,
      }),
    });
    setChatInput('');
  };

  // Gate: join screen
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
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-purple-200 border border-white/30 focus:outline-none focus:border-white"
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-pink-500 to-violet-500 text-white font-semibold py-3 rounded-lg hover:opacity-90 transition"
            >
              Join Live Session 🙏
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black text-white">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🧘</div>
            <div>
              <h1 className="text-xl font-bold">
                {schedule?.name || 'Sadhana Live'}
              </h1>
              <p className="text-sm text-purple-200">Community Session</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-red-500 px-4 py-2 rounded-full">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            <span className="font-semibold">LIVE • {count} watching</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Video */}
          <div className="lg:col-span-2 bg-black rounded-xl overflow-hidden aspect-video">
            {schedule?.videoUrl ? (
              <iframe
                src={schedule.videoUrl}
                className="w-full h-full"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-purple-200">
                <div className="text-center">
                  <div className="text-6xl mb-4">⏳</div>
                  <p>Waiting for session to start...</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Participants */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                👥 Participants ({count})
              </h2>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {participants.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg text-sm"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-xs font-bold">
                      {p.name[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="truncate">{p.name}</span>
                  </div>
                ))}
                {participants.length === 0 && (
                  <p className="text-purple-200 text-sm text-center py-4">
                    No participants yet
                  </p>
                )}
              </div>
            </div>

            {/* Chat */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 flex flex-col h-96">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                💬 Live Chat
              </h2>
              <div className="flex-1 overflow-y-auto space-y-2 mb-3">
                {chat.map((msg) => (
                  <div key={msg.id} className="text-sm">
                    <span className="font-semibold text-pink-300">{msg.name}:</span>{' '}
                    <span className="text-white">{msg.message}</span>
                  </div>
                ))}
                {chat.length === 0 && (
                  <p className="text-purple-200 text-sm text-center py-4">
                    Be the first to say Namaste 🙏
                  </p>
                )}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={sendChat} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  maxLength={300}
                  className="flex-1 px-3 py-2 bg-white/20 rounded-lg text-sm placeholder-purple-200 border border-white/30 focus:outline-none focus:border-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 to-violet-500 rounded-lg font-semibold text-sm hover:opacity-90"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-purple-200 text-xs">
          Swar Yoga • Sadhana Live • Namaste 🙏
        </div>
      </div>
    </div>
  );
}
