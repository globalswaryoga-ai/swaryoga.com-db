'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Share2, Search, Plus, LogOut, Users, Globe, Loader, Home } from 'lucide-react';

interface Post {
  _id: string;
  title: string;
  content: string;
  author: string;
  authorAvatar?: string;
  likes: number;
  comments: number;
  createdAt: string;
  category?: string;
  image?: string;
}

interface Community {
  id: string;
  name: string;
  icon: string;
  description: string;
  members: number;
  isPublic: boolean;
  gradient: string;
}

const COMMUNITIES: Community[] = [
  { 
    id: 'global', 
    name: 'Global Community', 
    icon: '🌍', 
    description: 'Open to everyone - share your yoga journey with the world',
    members: 8000,
    isPublic: true,
    gradient: 'from-blue-500 to-cyan-500'
  },
  { id: 'swar-yoga', name: 'Swar Yoga', icon: '🎵', description: 'Swar Yoga practitioners', members: 0, isPublic: false, gradient: 'from-purple-500 to-pink-500' },
  { id: 'aham-bramhasmi', name: 'Aham Bramhasmi', icon: '✨', description: 'Self-realization journey', members: 0, isPublic: false, gradient: 'from-amber-500 to-orange-500' },
  { id: 'astavakra', name: 'Astavakra', icon: '🧘', description: 'Advanced yoga training', members: 0, isPublic: false, gradient: 'from-rose-500 to-red-500' },
  { id: 'shivoham', name: 'Shivoham', icon: '🔱', description: 'Shiva consciousness', members: 0, isPublic: false, gradient: 'from-slate-500 to-gray-600' },
  { id: 'i-am-fit', name: 'I am Fit', icon: '💪', description: 'Fitness and wellness', members: 0, isPublic: false, gradient: 'from-lime-500 to-green-500' },
];

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCommunity, setSelectedCommunity] = useState('global');
  const [user, setUser] = useState<any>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joiningCommunity, setJoiningCommunity] = useState<any>(null);
  const [joinFormData, setJoinFormData] = useState({ name: '', email: '', mobile: '' });
  const [joiningLoading, setJoiningLoading] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestingCommunity, setRequestingCommunity] = useState<any>(null);
  const [requestFormData, setRequestFormData] = useState({ name: '', email: '', mobile: '', workshopsCompleted: false, message: '' });
  const [requestLoading, setRequestLoading] = useState(false);

  const categories = [
    { id: 'all', label: '✨ All Posts' },
    { id: 'experience', label: '🙏 Experiences' },
    { id: 'tips', label: '💡 Tips & Tricks' },
    { id: 'transformation', label: '🦋 Transformations' },
    { id: 'questions', label: '❓ Questions' },
  ];

  useEffect(() => {
    checkUserAuth();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory]);

  const checkUserAuth = async () => {
    // First, check if user data is stored in localStorage (from community join)
    const communityUserStr = localStorage.getItem('community_user');
    if (communityUserStr) {
      try {
        const communityUser = JSON.parse(communityUserStr);
        setUser(communityUser);
        return;
      } catch (error) {
        console.error('Error parsing community user:', error);
      }
    }

    // Then check for auth token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await fetch('/api/auth/profile', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data.data);
        } else {
          // Token is invalid, clear it
          localStorage.removeItem('token');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        localStorage.removeItem('token');
      }
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/community/posts?category=' + selectedCategory);
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCommunity = async () => {
    if (!joinFormData.name || !joinFormData.email || !joinFormData.mobile) {
      alert('Please fill all fields');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(joinFormData.email)) {
      alert('Invalid email format');
      return;
    }

    const cleanMobile = joinFormData.mobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      alert('Mobile number must be at least 10 digits');
      return;
    }

    try {
      setJoiningLoading(true);
      const userId = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
      
      const response = await fetch('/api/community/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: joinFormData.name,
          email: joinFormData.email,
          mobile: joinFormData.mobile,
          countryCode: '+91',
          userId,
          communityId: joiningCommunity.id,
          communityName: joiningCommunity.name,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert('❌ ' + (error.error || 'Failed to join community'));
        return;
      }

      const result = await response.json();
      alert('✅ ' + (result.message || 'Successfully joined!'));
      localStorage.setItem('community_user', JSON.stringify({
        name: joinFormData.name,
        email: joinFormData.email,
        userId,
      }));
      setUser({ name: joinFormData.name, email: joinFormData.email });
      setShowJoinModal(false);
      setJoinFormData({ name: '', email: '', mobile: '' });
    } catch (error) {
      alert('❌ Error joining community');
      console.error(error);
    } finally {
      setJoiningLoading(false);
    }
  };

  const handleRequestAccess = async () => {
    if (!requestFormData.name || !requestFormData.email || !requestFormData.mobile) {
      alert('Please fill all required fields');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestFormData.email)) {
      alert('Invalid email format');
      return;
    }

    const cleanMobile = requestFormData.mobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      alert('Mobile number must be at least 10 digits');
      return;
    }

    try {
      setRequestLoading(true);
      const userId = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
      
      const response = await fetch('/api/community/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: requestFormData.name,
          email: requestFormData.email,
          mobile: requestFormData.mobile,
          userId,
          communityId: requestingCommunity.id,
          communityName: requestingCommunity.name,
          workshopsCompleted: requestFormData.workshopsCompleted,
          message: requestFormData.message,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert('❌ ' + (error.error || 'Failed to submit request'));
        return;
      }

      alert('✅ Request submitted successfully! Admin will review and get back to you soon.');
      setShowRequestModal(false);
      setRequestFormData({ name: '', email: '', mobile: '', workshopsCompleted: false, message: '' });
    } catch (error) {
      alert('❌ Error submitting request');
      console.error(error);
    } finally {
      setRequestLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('community_user');
    setUser(null);
    alert('✅ Logged out successfully');
  };

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentCommunity = COMMUNITIES.find(c => c.id === selectedCommunity);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-slate-800/95 to-purple-800/95 backdrop-blur-md border-b border-purple-500/20">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors" title="Home">
              <Home size={24} className="text-blue-400" />
            </Link>
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Swar Yoga 🧘
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="text-sm text-purple-200">
                  <p className="font-semibold text-white">{user.name}</p>
                  <p className="text-xs">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors text-sm"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </>
            ) : (
              <div className="text-sm text-purple-300">Not joined yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* User Profile Card */}
            {user ? (
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4 mb-6 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{user.name}</p>
                    <p className="text-green-300 text-xs">✓ Member</p>
                  </div>
                </div>
                <p className="text-green-200 text-xs">{user.email}</p>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl p-4 mb-6 backdrop-blur-sm">
                <p className="text-blue-200 text-sm font-semibold mb-3">👋 Join the Community</p>
                <p className="text-blue-300 text-xs">Connect with fellow yoga practitioners and share your journey</p>
              </div>
            )}

            {/* Communities Section */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Users size={20} className="text-purple-400" />
                Communities
              </h3>
              <div className="space-y-2">
                {COMMUNITIES.map(community => (
                  <button
                    key={community.id}
                    onClick={() => setSelectedCommunity(community.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all transform hover:scale-105 ${
                      selectedCommunity === community.id
                        ? `bg-gradient-to-r ${community.gradient} text-white shadow-lg font-semibold`
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{community.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{community.name}</p>
                        <p className="text-xs opacity-75">{community.members} members</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl p-6 backdrop-blur-sm">
              <h3 className="text-sm font-bold text-white mb-4">📊 Community Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 text-sm">Total Posts</span>
                  <span className="text-xl font-bold text-blue-400">{posts.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 text-sm">Active Members</span>
                  <span className="text-xl font-bold text-green-400">8,000+</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 text-sm">Communities</span>
                  <span className="text-xl font-bold text-purple-400">{COMMUNITIES.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Community Header */}
            <div className={`bg-gradient-to-r ${currentCommunity?.gradient} rounded-2xl p-8 mb-8 text-white shadow-2xl`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-6xl mb-3">{currentCommunity?.icon}</div>
                  <h1 className="text-4xl sm:text-5xl font-bold mb-2">{currentCommunity?.name}</h1>
                  <p className="text-lg opacity-90">{currentCommunity?.description}</p>
                  <div className="mt-4 flex items-center gap-6 text-sm">
                    <span>👥 {currentCommunity?.members} members</span>
                    {currentCommunity?.isPublic && <span className="bg-white/30 px-3 py-1 rounded-full">🌐 Public</span>}
                  </div>
                </div>
                {!user && (
                  currentCommunity?.isPublic ? (
                    <button
                      onClick={() => {
                        setJoiningCommunity(currentCommunity);
                        setShowJoinModal(true);
                      }}
                      className="px-8 py-4 bg-white text-purple-600 rounded-xl font-bold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
                    >
                      + Join Now
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setRequestingCommunity(currentCommunity);
                        setShowRequestModal(true);
                      }}
                      className="px-8 py-4 bg-amber-400 text-amber-900 rounded-xl font-bold hover:bg-amber-300 transition-all transform hover:scale-105 shadow-lg"
                    >
                      📋 Request Access
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Search and Filters */}
            <div className="mb-8 space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-3 text-purple-400" size={20} />
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-800 text-white border border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-slate-500"
                />
              </div>

              {/* Categories */}
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all transform hover:scale-105 ${
                      selectedCategory === category.id
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                        : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-purple-500'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Posts List */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-center">
                  <Loader className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-4" />
                  <p className="text-slate-400">Loading posts...</p>
                </div>
              </div>
            ) : filteredPosts.length > 0 ? (
              <div className="space-y-6">
                {filteredPosts.map((post) => (
                  <Link key={post._id} href={`/community/post/${post._id}`}>
                    <div className="bg-gradient-to-r from-slate-800 to-slate-700 border border-purple-500/20 rounded-xl hover:border-purple-500/50 hover:shadow-2xl transition-all transform hover:scale-102 p-6 cursor-pointer group">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg group-hover:shadow-lg transition-all">
                            {post.author.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-purple-500 group-hover:bg-clip-text transition-all">
                              {post.title}
                            </h3>
                            <p className="text-sm text-slate-400">
                              {post.author} • {new Date(post.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {post.category && (
                          <span className="px-3 py-1 bg-purple-500/30 text-purple-200 rounded-full text-xs font-semibold whitespace-nowrap">
                            {post.category}
                          </span>
                        )}
                      </div>

                      {post.image && (
                        <img src={post.image} alt={post.title} className="w-full h-48 object-cover rounded-lg mb-4 group-hover:shadow-lg transition-all" />
                      )}

                      <p className="text-slate-300 line-clamp-2 mb-4">{post.content}</p>

                      {/* Engagement Stats */}
                      <div className="flex gap-6 text-sm text-slate-400">
                        <button className="flex items-center gap-2 hover:text-pink-400 transition-colors">
                          <Heart className="w-4 h-4" />
                          <span>{post.likes}</span>
                        </button>
                        <button className="flex items-center gap-2 hover:text-blue-400 transition-colors">
                          <MessageCircle className="w-4 h-4" />
                          <span>{post.comments}</span>
                        </button>
                        <button className="flex items-center gap-2 hover:text-green-400 transition-colors">
                          <Share2 className="w-4 h-4" />
                          <span>Share</span>
                        </button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 bg-slate-800/50 rounded-xl border border-purple-500/20">
                <MessageCircle size={48} className="text-slate-600 mb-4" />
                <p className="text-slate-400 text-center">
                  No posts yet. {user ? 'Be the first to share your yoga journey!' : 'Join the community to see posts!'}
                </p>
                {user && (
                  <Link
                    href="/community/post"
                    className="mt-4 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all"
                  >
                    Create First Post
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Join Community Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-green-900 to-emerald-900 border border-green-500/40 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="text-5xl">{joiningCommunity?.icon}</div>
                <div>
                  <h2 className="text-2xl font-bold">Join {joiningCommunity?.name}</h2>
                  <p className="text-sm opacity-90">Connect with the community</p>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-8 space-y-4">
              <div>
                <label className="block text-sm font-bold text-green-200 mb-2">👤 Full Name</label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={joinFormData.name}
                  onChange={(e) => setJoinFormData({...joinFormData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-white text-black border border-green-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-green-200 mb-2">📧 Email Address</label>
                <input
                  type="email"
                  placeholder="your.email@example.com"
                  value={joinFormData.email}
                  onChange={(e) => setJoinFormData({...joinFormData, email: e.target.value})}
                  className="w-full px-4 py-3 bg-white text-black border border-green-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-green-200 mb-2">📱 WhatsApp Number</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={joinFormData.mobile}
                  onChange={(e) => setJoinFormData({...joinFormData, mobile: e.target.value})}
                  className="w-full px-4 py-3 bg-white text-black border border-green-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinFormData({ name: '', email: '', mobile: '' });
                  }}
                  className="flex-1 px-4 py-3 bg-green-900/50 hover:bg-green-900 text-green-200 border border-green-500/30 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleJoinCommunity}
                  disabled={joiningLoading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {joiningLoading ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Joining...
                    </>
                  ) : (
                    '✨ Join Now'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Access Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-green-900 to-emerald-900 border border-green-500/40 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="text-5xl">{requestingCommunity?.icon}</div>
                <div>
                  <h2 className="text-2xl font-bold">Request Access</h2>
                  <p className="text-sm opacity-90">{requestingCommunity?.name}</p>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-8 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Info Box */}
              <div className="bg-green-500/20 border border-green-500/40 rounded-lg p-4 mb-4">
                <p className="text-green-200 text-sm">
                  ℹ️ This is a private community. Your request will be reviewed by our admin team.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-green-200 mb-2">👤 Full Name</label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={requestFormData.name}
                  onChange={(e) => setRequestFormData({...requestFormData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-white text-black border border-green-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-green-200 mb-2">📧 Email Address</label>
                <input
                  type="email"
                  placeholder="your.email@example.com"
                  value={requestFormData.email}
                  onChange={(e) => setRequestFormData({...requestFormData, email: e.target.value})}
                  className="w-full px-4 py-3 bg-white text-black border border-green-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-green-200 mb-2">📱 WhatsApp Number</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={requestFormData.mobile}
                  onChange={(e) => setRequestFormData({...requestFormData, mobile: e.target.value})}
                  className="w-full px-4 py-3 bg-white text-black border border-green-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500"
                />
              </div>

              <div className="flex items-center gap-3 bg-green-900/50 p-4 rounded-lg border border-green-500/30">
                <input
                  type="checkbox"
                  id="workshops"
                  checked={requestFormData.workshopsCompleted}
                  onChange={(e) => setRequestFormData({...requestFormData, workshopsCompleted: e.target.checked})}
                  className="w-4 h-4 cursor-pointer accent-green-500"
                />
                <label htmlFor="workshops" className="text-sm text-green-200 cursor-pointer flex-1">
                  ✅ I have completed the required workshops
                </label>
              </div>

              <div>
                <label className="block text-sm font-bold text-green-200 mb-2">💬 Message (Optional)</label>
                <textarea
                  placeholder="Tell us about your yoga journey and why you want to join this community..."
                  value={requestFormData.message}
                  onChange={(e) => setRequestFormData({...requestFormData, message: e.target.value})}
                  className="w-full px-4 py-3 bg-white text-black border border-green-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none placeholder-gray-500"
                  rows={4}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowRequestModal(false);
                    setRequestFormData({ name: '', email: '', mobile: '', workshopsCompleted: false, message: '' });
                  }}
                  className="flex-1 px-4 py-3 bg-green-900/50 hover:bg-green-900 text-green-200 border border-green-500/30 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestAccess}
                  disabled={requestLoading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {requestLoading ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    '📤 Submit Request'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
