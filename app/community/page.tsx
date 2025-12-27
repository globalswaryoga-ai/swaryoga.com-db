'use client';

import React, { useState } from 'react';
import { Heart, MessageCircle, Send, Users, Settings, Search, ChevronDown, FileText, Image as ImageIcon, Video, MoreVertical } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

// Types
interface Community {
  id: string;
  name: string;
  type: 'general' | 'enrolled';
  icon: string;
  members: number;
  description: string;
}

interface Message {
  id: string;
  author: string;
  avatar: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'document' | 'poll';
  media?: string;
  timestamp: string;
  reactions: Reaction[];
  isAdmin?: boolean;
}

interface Reaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

interface Poll {
  question: string;
  options: { text: string; votes: number }[];
  totalVotes: number;
}

// Communities Data
const COMMUNITIES: Community[] = [
  { id: 'general', name: 'General Community', type: 'general', icon: '🌍', members: 1542, description: 'Open to all members' },
  { id: 'swar-yoga', name: 'Swar Yoga', type: 'enrolled', icon: '🎵', members: 324, description: 'For Swar Yoga workshop participants' },
  { id: 'aham-bramhasmi', name: 'Aham Bramhasmi', type: 'enrolled', icon: '✨', members: 287, description: 'Aham Bramhasmi community' },
  { id: 'astavakra', name: 'Astavakra', type: 'enrolled', icon: '🧘', members: 156, description: 'Astavakra teachings community' },
  { id: 'shivoham', name: 'Shivoham', type: 'enrolled', icon: '🔱', members: 198, description: 'Shiva consciousness community' },
  { id: 'i-am-fit', name: 'I am Fit', type: 'enrolled', icon: '💪', members: 423, description: 'Fitness and wellness community' },
  { id: 'children-yoga', name: 'Children Swar Yoga', type: 'enrolled', icon: '👶', members: 289, description: 'For young yoga practitioners' },
  { id: 'youth-yoga', name: 'Youth Swar Yoga', type: 'enrolled', icon: '🚀', members: 512, description: 'Youth empowerment through yoga' },
  { id: 'english-yoga', name: 'English Swar Yoga', type: 'enrolled', icon: '🌐', members: 401, description: 'English language community' },
  { id: 'shankara', name: 'Shankara', type: 'enrolled', icon: '📚', members: 176, description: 'Advaita Vedanta teachings' },
  { id: 'amrut-bhoj', name: 'Amrut Bhoj', type: 'enrolled', icon: '🍯', members: 234, description: 'Nectar of wisdom sharing' },
  { id: 'yogasana', name: 'Yogasana', type: 'enrolled', icon: '🕉️', members: 367, description: 'Physical yoga practice community' },
  { id: 'businessman', name: 'Businessman', type: 'enrolled', icon: '💼', members: 289, description: 'Business and entrepreneurship' },
];

// Sample Messages
const SAMPLE_MESSAGES: Message[] = [
  {
    id: '1',
    author: 'Guru Ji',
    avatar: '🧙',
    content: 'Welcome to our beautiful community! This is a space for growth and connection.',
    type: 'text',
    timestamp: '2 hours ago',
    reactions: [
      { emoji: '❤️', count: 24, hasReacted: false },
      { emoji: '🙌', count: 8, hasReacted: false },
    ],
    isAdmin: true,
  },
  {
    id: '2',
    author: 'Rajesh Kumar',
    avatar: '👨',
    content: 'The breathing techniques I learned have completely transformed my daily routine!',
    type: 'text',
    timestamp: '1 hour ago',
    reactions: [
      { emoji: '✨', count: 12, hasReacted: true },
      { emoji: '🙏', count: 5, hasReacted: false },
    ],
  },
  {
    id: '3',
    author: 'Priya Sharma',
    avatar: '👩',
    content: 'Check out this beautiful sunset yoga session from yesterday',
    type: 'image',
    media: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600',
    timestamp: '45 minutes ago',
    reactions: [
      { emoji: '❤️', count: 156, hasReacted: true },
      { emoji: '✨', count: 89, hasReacted: false },
      { emoji: '🔥', count: 34, hasReacted: false },
    ],
  },
  {
    id: '4',
    author: 'Guru Ji',
    avatar: '🧙',
    content: 'Join us for the live meditation session tonight at 7 PM. Link will be shared soon!',
    type: 'text',
    timestamp: '30 minutes ago',
    reactions: [
      { emoji: '🙌', count: 67, hasReacted: false },
      { emoji: '✨', count: 45, hasReacted: false },
    ],
    isAdmin: true,
  },
  {
    id: '5',
    author: 'Guru Ji',
    avatar: '🧙',
    content: 'What is your favorite yoga practice?',
    type: 'poll',
    timestamp: '15 minutes ago',
    reactions: [
      { emoji: '❤️', count: 234, hasReacted: false },
    ],
    isAdmin: true,
  },
];

const POLL: Poll = {
  question: 'What is your favorite yoga practice?',
  options: [
    { text: 'Asanas (Physical Postures)', votes: 234 },
    { text: 'Pranayama (Breathing)', votes: 189 },
    { text: 'Meditation', votes: 312 },
    { text: 'Chanting', votes: 156 },
  ],
  totalVotes: 891,
};

// Reaction Component
const ReactionBar: React.FC<{ reactions: Reaction[]; onReact: (emoji: string) => void }> = ({ reactions, onReact }) => (
  <div className="flex flex-wrap gap-2 mt-3">
    {reactions.map((reaction) => (
      <button
        key={reaction.emoji}
        className={`px-2 py-1 rounded-full text-xs font-semibold transition-all ${
          reaction.hasReacted
            ? 'bg-blue-100 text-blue-700 border border-blue-300'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
        }`}
        onClick={() => onReact(reaction.emoji)}
      >
        {reaction.emoji} {reaction.count}
      </button>
    ))}
    <button
      onClick={() => onReact('add')}
      className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 transition-all"
    >
      + Add
    </button>
  </div>
);

// Message Bubble Component
const MessageBubble: React.FC<{ message: Message; isOwn: boolean }> = ({ message, isOwn }) => (
  <div className={`flex gap-3 mb-4 ${isOwn ? 'justify-end' : ''}`}>
    {!isOwn && <div className="text-2xl flex-shrink-0">{message.avatar}</div>}
    <div className={`flex-1 ${isOwn ? 'items-end' : ''}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="font-semibold text-gray-900">{message.author}</span>
        {message.isAdmin && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">ADMIN</span>}
        <span className="text-xs text-gray-500">{message.timestamp}</span>
      </div>
      
      {message.type === 'text' && (
        <div className={`px-4 py-2 rounded-lg max-w-md ${
          isOwn
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}>
          {message.content}
        </div>
      )}

      {message.type === 'image' && (
        <div className="max-w-sm rounded-lg overflow-hidden shadow-md mb-2">
          <img src={message.media} alt="Shared image" className="w-full h-auto" />
        </div>
      )}

      {message.type === 'poll' && (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-4 rounded-lg max-w-md border border-purple-200 mb-2">
          <p className="font-semibold text-gray-900 mb-3">{POLL.question}</p>
          {POLL.options.map((option, idx) => (
            <div key={idx} className="mb-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-700">{option.text}</span>
                <span className="text-xs font-bold text-gray-600">{option.votes}</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all"
                  style={{ width: `${(option.votes / POLL.totalVotes) * 100}%` }}
                />
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-600 mt-2">{POLL.totalVotes} votes</p>
        </div>
      )}

      {message.type !== 'poll' && (
        <ReactionBar 
          reactions={message.reactions}
          onReact={(emoji) => console.log(`Reacted with ${emoji}`)}
        />
      )}
    </div>
    {isOwn && <div className="text-2xl flex-shrink-0">{message.avatar}</div>}
  </div>
);

export default function CommunityPage() {
  const [selectedCommunity, setSelectedCommunity] = useState<string>('general');
  const [searchCommunity, setSearchCommunity] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [showMediaOptions, setShowMediaOptions] = useState(false);

  const currentCommunity = COMMUNITIES.find(c => c.id === selectedCommunity);
  const isGeneralCommunity = currentCommunity?.type === 'general';
  const isEnrolled = currentCommunity?.type === 'enrolled';

  const filteredCommunities = COMMUNITIES.filter(c =>
    c.name.toLowerCase().includes(searchCommunity.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      <Navigation />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Community Hub</h1>
          <p className="text-lg text-white/90 max-w-2xl">Connect, share, and grow together with our beautiful yoga community</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Communities List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden sticky top-4">
              {/* Search */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search communities..."
                    value={searchCommunity}
                    onChange={(e) => setSearchCommunity(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Communities */}
              <div className="overflow-y-auto max-h-[600px] custom-scrollbar">
                {filteredCommunities.map((community) => (
                  <button
                    key={community.id}
                    onClick={() => setSelectedCommunity(community.id)}
                    className={`w-full text-left px-4 py-3 border-l-4 transition-all ${
                      selectedCommunity === community.id
                        ? 'bg-blue-50 border-l-blue-600 border-r-0'
                        : 'bg-white border-l-transparent hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{community.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate text-sm">{community.name}</p>
                        <p className="text-xs text-gray-500">{community.members} members</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col h-[700px]">
              {/* Header */}
              {currentCommunity && (
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{currentCommunity.icon}</span>
                    <div>
                      <h2 className="text-xl font-bold">{currentCommunity.name}</h2>
                      <p className="text-sm text-white/80">{currentCommunity.members} members online</p>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                    <Settings size={20} />
                  </button>
                </div>
              )}

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {SAMPLE_MESSAGES.map((message) => (
                  <MessageBubble key={message.id} message={message} isOwn={message.author === 'You'} />
                ))}
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 p-4 bg-gray-50">
                {isGeneralCommunity ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-700 font-semibold">👁️ General Community</p>
                    <p className="text-xs text-blue-600 mt-1">This is a public community. Only admins can post. You can react and engage with content.</p>
                  </div>
                ) : isEnrolled ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder="Share your message..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                      <button className="absolute right-3 top-3 text-blue-600 hover:text-blue-700 transition-colors">
                        <Send size={18} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">You can share text messages with this community</p>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-green-600 font-semibold">👥 Active Members</p>
                <p className="text-2xl font-bold text-green-700 mt-1">{currentCommunity?.members}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-600 font-semibold">💬 Messages Today</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">247</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-600 font-semibold">✨ Engagement</p>
                <p className="text-2xl font-bold text-purple-700 mt-1">92%</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-12 bg-gradient-to-r from-indigo-600 to-pink-600 rounded-xl p-8 text-white text-center">
          <h2 className="text-3xl font-bold mb-2">Join the Conversation</h2>
          <p className="text-lg text-white/90 mb-6">Connect with thousands of yoga enthusiasts and transform your practice</p>
          <button className="px-8 py-3 bg-white text-indigo-600 rounded-lg font-bold hover:bg-gray-100 transition-colors">
            Explore All Communities
          </button>
        </div>
      </div>

      <Footer />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
