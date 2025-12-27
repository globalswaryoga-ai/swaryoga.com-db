'use client';

import React, { useState } from 'react';
import { Send, Search, Menu, Bell, Phone, Video, Info, Users, Settings, Lock, Unlock, X, Plus, CheckCircle } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

interface Community {
  id: string;
  name: string;
  type: 'open' | 'enroll';
  icon: string;
  members: number;
  description: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unread?: number;
  isJoined?: boolean;
}

interface Message {
  id: string;
  author: string;
  avatar: string;
  content: string;
  timestamp: string;
  isSent?: boolean;
}

const OPEN_COMMUNITIES: Community[] = [
  { 
    id: 'general', 
    name: 'General Community', 
    type: 'open', 
    icon: '🌍', 
    members: 1542, 
    description: 'Open for all members',
    lastMessage: 'Welcome to our community!',
    lastMessageTime: '2 min ago',
    unread: 0,
    isJoined: true
  },
];

const ENROLL_COMMUNITIES: Community[] = [
  { id: 'swar-yoga', name: 'Swar Yoga', type: 'enroll', icon: '🎵', members: 324, description: 'Join for yoga practices', lastMessage: 'New session tomorrow...', lastMessageTime: '5 min ago', unread: 2, isJoined: false },
  { id: 'aham-bramhasmi', name: 'Aham Bramhasmi', type: 'enroll', icon: '✨', members: 287, description: 'Spiritual growth', lastMessage: 'Amazing insights shared', lastMessageTime: '1 hour ago', unread: 0, isJoined: false },
  { id: 'astavakra', name: 'Astavakra', type: 'enroll', icon: '🧘', members: 156, description: 'Teachings community', lastMessage: 'Wisdom sharing...', lastMessageTime: '3 hours ago', unread: 1, isJoined: false },
  { id: 'shivoham', name: 'Shivoham', type: 'enroll', icon: '🔱', members: 198, description: 'Shiva consciousness', lastMessage: 'Meditation practice', lastMessageTime: '1 day ago', unread: 0, isJoined: false },
  { id: 'i-am-fit', name: 'I am Fit', type: 'enroll', icon: '💪', members: 423, description: 'Fitness & wellness', lastMessage: 'Workout routine...', lastMessageTime: '2 days ago', unread: 0, isJoined: false },
  { id: 'children-yoga', name: 'Children Swar Yoga', type: 'enroll', icon: '👶', members: 289, description: 'Young practitioners', lastMessage: 'Fun activities', lastMessageTime: '1 day ago', unread: 0, isJoined: false },
  { id: 'youth-yoga', name: 'Youth Swar Yoga', type: 'enroll', icon: '🚀', members: 512, description: 'Youth empowerment', lastMessage: 'New updates', lastMessageTime: '4 hours ago', unread: 3, isJoined: true },
  { id: 'english-yoga', name: 'English Swar Yoga', type: 'enroll', icon: '🌐', members: 401, description: 'English language', lastMessage: 'Discussion ongoing', lastMessageTime: '2 hours ago', unread: 0, isJoined: false },
  { id: 'shankara', name: 'Shankara', type: 'enroll', icon: '📚', members: 176, description: 'Vedanta teachings', lastMessage: 'Philosophical insights', lastMessageTime: '5 hours ago', unread: 0, isJoined: false },
  { id: 'amrut-bhoj', name: 'Amrut Bhoj', type: 'enroll', icon: '🍯', members: 234, description: 'Wisdom sharing', lastMessage: 'Nectar of knowledge', lastMessageTime: '3 days ago', unread: 0, isJoined: false },
  { id: 'yogasana', name: 'Yogasana', type: 'enroll', icon: '🕉️', members: 367, description: 'Physical practice', lastMessage: 'Asana guide...', lastMessageTime: '6 hours ago', unread: 0, isJoined: false },
  { id: 'businessman', name: 'Businessman', type: 'enroll', icon: '💼', members: 289, description: 'Business & growth', lastMessage: 'Business tips', lastMessageTime: '1 hour ago', unread: 1, isJoined: false },
];

const SAMPLE_MESSAGES: Message[] = [
  { id: '1', author: 'Guru Ji', avatar: '🧙', content: 'Welcome to our beautiful community! 🙏', timestamp: '2:30 PM', isSent: false },
  { id: '2', author: 'Rajesh Kumar', avatar: '👨', content: 'Thank you for creating this wonderful space!', timestamp: '2:45 PM', isSent: false },
  { id: '3', author: 'You', avatar: '😊', content: 'Happy to be here!', timestamp: '3:00 PM', isSent: true },
  { id: '4', author: 'Priya Sharma', avatar: '👩', content: 'The energy here is amazing ✨', timestamp: '3:15 PM', isSent: false },
];

export default function CommunityPage() {
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(OPEN_COMMUNITIES[0]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [messageInput, setMessageInput] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCommunity, setJoinCommunity] = useState<Community | null>(null);
  const [joinForm, setJoinForm] = useState({ name: '', email: '', mobile: '' });
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState(false);

  const handleJoinClick = (community: Community) => {
    setJoinCommunity(community);
    setShowJoinModal(true);
    setJoinSuccess(false);
    setJoinError('');
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinLoading(true);
    setJoinError('');

    try {
      const response = await fetch('/api/community/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: joinForm.name,
          email: joinForm.email,
          mobile: joinForm.mobile,
          communityId: joinCommunity?.id,
          communityName: joinCommunity?.name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setJoinError(data.error || 'Failed to join');
        setJoinLoading(false);
        return;
      }

      setJoinSuccess(true);
      setJoinForm({ name: '', email: '', mobile: '' });
      setTimeout(() => {
        setShowJoinModal(false);
        setJoinSuccess(false);
      }, 2000);
    } catch (err) {
      setJoinError('Network error');
      setJoinLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />

      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-80' : 'w-0'} bg-white border-r border-gray-200 overflow-y-auto transition-all duration-300 flex flex-col`}>
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white sticky top-0 z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Messages</h2>
              <button className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <Bell size={20} />
              </button>
            </div>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-3 text-white/60" />
              <input
                type="text"
                placeholder="Search communities..."
                className="w-full pl-10 pr-4 py-2 bg-white/20 text-white placeholder-white/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 border border-white/20"
              />
            </div>
          </div>

          {/* Open Communities */}
          <div className="flex-1 overflow-y-auto">
            {/* Public Section */}
            <div>
              <div className="px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <Unlock size={16} className="text-green-600" />
                  <h3 className="text-xs font-bold text-gray-500 uppercase">OPEN FOR ALL</h3>
                </div>
              </div>
              {OPEN_COMMUNITIES.map((community) => (
                <button
                  key={community.id}
                  onClick={() => setSelectedCommunity(community)}
                  className={`w-full px-4 py-3 text-left border-l-4 transition-all ${
                    selectedCommunity?.id === community.id
                      ? 'bg-blue-50 border-l-blue-600'
                      : 'bg-white border-l-transparent hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-1">{community.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{community.name}</p>
                      <p className="text-xs text-gray-500 truncate">{community.lastMessage}</p>
                      <p className="text-xs text-gray-400 mt-1">{community.lastMessageTime}</p>
                    </div>
                    {community.unread ? (
                      <div className="bg-green-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                        {community.unread}
                      </div>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>

            {/* Enrolled Communities Section */}
            <div>
              <div className="px-4 pt-6 pb-2">
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-orange-600" />
                  <h3 className="text-xs font-bold text-gray-500 uppercase">ENROLL & JOIN</h3>
                </div>
              </div>
              {ENROLL_COMMUNITIES.map((community) => (
                <button
                  key={community.id}
                  onClick={() => setSelectedCommunity(community)}
                  className={`w-full px-4 py-3 text-left border-l-4 transition-all ${
                    selectedCommunity?.id === community.id
                      ? 'bg-blue-50 border-l-blue-600'
                      : 'bg-white border-l-transparent hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-1">{community.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{community.name}</p>
                      <p className="text-xs text-gray-500 truncate">{community.lastMessage}</p>
                      <p className="text-xs text-gray-400 mt-1">{community.lastMessageTime}</p>
                    </div>
                    {community.unread ? (
                      <div className="bg-green-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                        {community.unread}
                      </div>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {selectedCommunity ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  {!sidebarOpen && (
                    <button
                      onClick={() => setSidebarOpen(true)}
                      className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Menu size={24} />
                    </button>
                  )}
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <span className="text-3xl">{selectedCommunity.icon}</span>
                      {selectedCommunity.name}
                    </h1>
                    <p className="text-sm text-gray-500">
                      {selectedCommunity.members.toLocaleString()} members • {selectedCommunity.description}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Phone size={20} className="text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Video size={20} className="text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Info size={20} className="text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col justify-end">
                {SAMPLE_MESSAGES.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.isSent ? 'justify-end' : 'justify-start'}`}
                  >
                    {!message.isSent && <span className="text-2xl">{message.avatar}</span>}
                    <div className={`max-w-sm ${message.isSent ? 'items-end' : 'items-start'}`}>
                      {!message.isSent && (
                        <p className="text-xs font-semibold text-gray-700 mb-1">{message.author}</p>
                      )}
                      <div
                        className={`px-4 py-2 rounded-lg ${
                          message.isSent
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-gray-200 text-gray-900 rounded-bl-none'
                        }`}
                      >
                        <p>{message.content}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 px-2">{message.timestamp}</p>
                    </div>
                    {message.isSent && <span className="text-2xl">{message.avatar}</span>}
                  </div>
                ))}
              </div>

              {/* Input Area */}
              <div className="bg-white border-t border-gray-200 p-4">
                {selectedCommunity.type === 'open' || selectedCommunity.isJoined ? (
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && messageInput.trim()) {
                          setMessageInput('');
                        }
                      }}
                      placeholder="Write a message..."
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                      <Send size={20} />
                    </button>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg border border-orange-200 text-center">
                    <p className="text-gray-700 font-semibold mb-3">
                      👋 Join this community to start messaging
                    </p>
                    <button
                      onClick={() => handleJoinClick(selectedCommunity)}
                      className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                    >
                      Join Community
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle size={64} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">Select a community to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Join Modal */}
      {showJoinModal && joinCommunity && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {!joinSuccess ? (
              <>
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{joinCommunity.icon}</span>
                    <div>
                      <h3 className="font-bold text-lg">{joinCommunity.name}</h3>
                      <p className="text-sm text-white/80">{joinCommunity.members} members</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowJoinModal(false)}
                    className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleJoinSubmit} className="p-6 space-y-4">
                  <p className="text-gray-600 text-sm">Join this beautiful community with us</p>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                    <input
                      type="text"
                      value={joinForm.name}
                      onChange={(e) => setJoinForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Your name"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={joinForm.email}
                      onChange={(e) => setJoinForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Mobile Number *</label>
                    <input
                      type="tel"
                      value={joinForm.mobile}
                      onChange={(e) => setJoinForm(prev => ({ ...prev, mobile: e.target.value }))}
                      placeholder="10 digits"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {joinError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                      {joinError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={joinLoading}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {joinLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Joining...
                      </>
                    ) : (
                      'Join Community'
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="p-6 flex flex-col items-center justify-center min-h-[300px]">
                <div className="bg-green-100 rounded-full p-4 mb-4">
                  <CheckCircle size={48} className="text-green-600" />
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">Welcome! 🎉</h4>
                <p className="text-sm text-gray-600 text-center">
                  You're now part of {joinCommunity.name} community
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
