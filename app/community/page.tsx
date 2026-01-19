'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Share2, Search, Plus, LogOut, Users, Globe, Loader, Home } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

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

function CommunityPageContent() {
  const searchParams = useSearchParams();
  const joinParam = searchParams.get('join');

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
  const [communityStats, setCommunityStats] = useState<Record<string, number>>({});
  const [chatMessage, setChatMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showChatOffModal, setShowChatOffModal] = useState(false);
  const [communities, setCommunities] = useState(COMMUNITIES);

  const categories = [
    { id: 'all', label: '✨ All Posts' },
    { id: 'experience', label: '🙏 Experiences' },
    { id: 'tips', label: '💡 Tips & Tricks' },
    { id: 'transformation', label: '🦋 Transformations' },
    { id: 'questions', label: '❓ Questions' },
  ];

  useEffect(() => {
    checkUserAuth();
    fetchCommunityStats();
  }, []);

  useEffect(() => {
    if (joinParam) {
      const community = communities.find(c => c.id === joinParam);
      if (community) {
        setSelectedCommunity(community.id);
        if (community.isPublic) {
          setJoiningCommunity(community);
          setShowJoinModal(true);
        } else {
          setRequestingCommunity(community);
          setShowRequestModal(true);
        }
      }
    }
  }, [joinParam, communities]);

  const fetchCommunityStats = async () => {
    try {
      // Force no-cache to always get fresh stats
      const response = await fetch('/api/community/stats', {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Community stats fetched:', data.data);
        setCommunityStats(data.data || {});
        // Update COMMUNITIES with real stats
        const updatedCommunities = COMMUNITIES.map(c => ({
          ...c,
          members: data.data?.[c.id] || 0
        }));
        console.log('📊 Updated communities:', updatedCommunities);
        setCommunities(updatedCommunities);
      } else {
        console.error('❌ Stats fetch failed with status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching community stats:', error);
    }
  };

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

  const fetchPosts = useCallback(async () => {
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
  }, [selectedCategory]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

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
      
      const response = await fetch('/api/community/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: joinFormData.name,
          email: joinFormData.email,
          mobile: joinFormData.mobile,
          countryCode: '+91',
          communityId: joiningCommunity.id,
          communityName: joiningCommunity.name,
        }),
      });

      const result = await response.json();

      if (!response.ok && response.status !== 200) {
        alert('❌ ' + (result.error || 'Failed to join community'));
        return;
      }

      // Success: Handle both new join and rejoin cases
      alert('✅ ' + (result.message || 'Successfully joined!'));

      // If backend warns about duplicate name, show a confirmation popup.
      if (result?.warning?.code === 'NAME_DUPLICATE') {
        // confirm() is simple but effective for now.
        // If user cancels, we do not block the join (because membership is already created).
        // It acts as a warning to double-check details.
        const count = typeof result?.warning?.count === 'number' ? result.warning.count : undefined;
        confirm(`${result?.warning?.message || 'Name already exists.'}${count ? `\n\nFound ${count} users with same name.` : ''}`);
      }

      const serverUserId = result?.data?.userId || result?.data?.member?.userId || result?.data?.leadNumber;
      localStorage.setItem('community_user', JSON.stringify({
        name: joinFormData.name,
        email: joinFormData.email,
        userId: serverUserId || JSON.parse(localStorage.getItem('community_user') || 'null')?.userId,
      }));
      setUser({ name: joinFormData.name, email: joinFormData.email });
      setShowJoinModal(false);
      setJoinFormData({ name: '', email: '', mobile: '' });
      
      // Refresh community stats after joining
      fetchCommunityStats();
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
      
      const response = await fetch('/api/community/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: requestFormData.name,
          email: requestFormData.email,
          mobile: requestFormData.mobile,
          communityId: requestingCommunity.id,
          communityName: requestingCommunity.name,
          workshopsCompleted: requestFormData.workshopsCompleted,
          message: requestFormData.message,
        }),
      });

      const result = await response.json();
      if (!response.ok && response.status !== 200) {
        alert('❌ ' + (result.error || 'Failed to submit request'));
        return;
      }

      // Success: Handle both new request and re-submission cases
      alert('✅ ' + (result.message || 'Request submitted successfully!'));
      setShowRequestModal(false);
      setRequestFormData({ name: '', email: '', mobile: '', workshopsCompleted: false, message: '' });
      
      // Refresh community stats after submitting request
      fetchCommunityStats();
    } catch (error) {
      alert('❌ Error submitting request');
      console.error(error);
    } finally {
      setRequestLoading(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatMessage.trim()) {
      alert('Please type a message');
      return;
    }

    // Check if chat is disabled - show popup
    const isChatEnabled = true; // In future, this can be fetched from admin settings
    if (!isChatEnabled) {
      setShowChatOffModal(true);
      return;
    }

    if (!user) {
      alert('Please join the community first');
      return;
    }

    try {
      setChatLoading(true);
      // For now, just show a success message
      // In future, this would send the message to the server
      alert('✅ Message sent! Your message has been added to the community chat.');
      setChatMessage('');
    } catch (error) {
      alert('❌ Error sending message');
      console.error(error);
    } finally {
      setChatLoading(false);
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

  const currentCommunity = communities.find(c => c.id === selectedCommunity);

  return (
    <div className="min-h-screen bg-white">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-md">
        <div className="container mx-auto px-6 sm:px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200" title="Home">
              <Home size={24} className="text-green-600" />
            </Link>
            <Link href="/" className="text-2xl font-bold tracking-tight text-gray-900 hover:opacity-75 transition-opacity">
              Swar Yoga 🧘
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="text-sm text-gray-600">
                  <p className="font-semibold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg transition-all duration-200 text-sm font-bold shadow-md hover:shadow-lg border border-red-800"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </>
            ) : (
              <div className="text-sm text-gray-500 font-medium">Not joined yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 sm:px-6 py-10">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* User Profile Card */}
            {user ? (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 mb-8 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-gray-900 font-semibold text-sm">{user.name}</p>
                    <p className="text-green-700 text-xs font-medium">✓ Member</p>
                  </div>
                </div>
                <p className="text-gray-600 text-xs">{user.email}</p>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-300 rounded-2xl p-6 mb-8 shadow-sm hover:shadow-md transition-all duration-300">
                <p className="text-blue-900 text-sm font-bold mb-3">👋 Join the Community</p>
                <p className="text-blue-800 text-xs leading-relaxed">Connect with fellow yoga practitioners and share your journey</p>
              </div>
            )}

            {/* Communities Section */}
            <div className="bg-white border border-green-200 rounded-2xl p-6 mb-8 shadow-sm hover:shadow-md transition-all duration-300">
              <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-3">
                <Users size={20} className="text-green-600" />
                Communities
              </h3>
              <div className="space-y-3">
                {communities.map(community => (
                  <div key={community.id} className="space-y-2">
                    <button
                      onClick={() => setSelectedCommunity(community.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-sm ${
                        selectedCommunity === community.id
                          ? `bg-gradient-to-r from-green-700 to-green-800 text-white font-semibold shadow-md hover:shadow-lg`
                          : 'bg-gray-50 text-gray-700 border border-gray-300 hover:border-green-600 hover:bg-green-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{community.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{community.name}</p>
                          <p className="text-xs opacity-75 font-medium">{community.members} members</p>
                        </div>
                      </div>
                    </button>
                    {!user && selectedCommunity === community.id && (
                      <div className="space-y-2">
                        {community.isPublic ? (
                          <>
                            <button
                              onClick={() => {
                                setJoiningCommunity(community);
                                setShowJoinModal(true);
                              }}
                              className="w-full px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg text-sm font-bold transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                            >
                              ✓ Join Now
                            </button>
                            <button
                              onClick={() => {
                                setJoiningCommunity(community);
                                setShowJoinModal(true);
                              }}
                              className="w-full px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-bold transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg border border-blue-900"
                            >
                              🔄 Rejoin
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setRequestingCommunity(community);
                                setShowRequestModal(true);
                              }}
                              className="w-full px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg text-sm font-bold transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                            >
                              📋 Request Access
                            </button>
                            <button
                              onClick={() => {
                                setRequestingCommunity(community);
                                setShowRequestModal(true);
                              }}
                              className="w-full px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-bold transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg border border-blue-900"
                            >
                              🔄 Rejoin Request
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-7 shadow-sm hover:shadow-md transition-all duration-300">
              <h3 className="text-sm font-bold text-gray-900 mb-5 flex items-center gap-2">📊 Community Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-green-100">
                  <span className="text-gray-700 text-sm font-medium">Total Posts</span>
                  <span className="text-2xl font-bold text-green-600">{posts.length}</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-green-100">
                  <span className="text-gray-700 text-sm font-medium">Active Members</span>
                  <span className="text-2xl font-bold text-green-600">{communityStats.global || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 text-sm font-medium">Communities</span>
                  <span className="text-2xl font-bold text-green-600">{communities.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Community Header */}
            <div className={`bg-gradient-to-br ${currentCommunity?.gradient} rounded-2xl p-10 mb-10 text-white shadow-2xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden`}>
              {/* Background accent */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full -ml-36 -mb-36 blur-3xl"></div>
              
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <div className="text-6xl mb-4 drop-shadow-lg">{currentCommunity?.icon}</div>
                  <h1 className="text-4xl sm:text-5xl font-bold mb-2 drop-shadow-lg">{currentCommunity?.name}</h1>
                  <p className="text-lg opacity-95 drop-shadow-md">{currentCommunity?.description}</p>
                  <div className="mt-4 flex items-center gap-6 text-sm font-semibold">
                    <span>👥 {currentCommunity?.members} members</span>
                    {currentCommunity?.isPublic && <span className="bg-white/40 px-4 py-1 rounded-full">🌐 Public</span>}
                  </div>
                </div>
                {!user && (
                  <div className="flex gap-3 flex-col">
                    {currentCommunity?.isPublic ? (
                      <>
                        <button
                          onClick={() => {
                            setJoiningCommunity(currentCommunity);
                            setShowJoinModal(true);
                          }}
                          className="px-8 py-4 bg-white text-green-800 rounded-xl font-bold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl text-lg"
                        >
                          + Join Now
                        </button>
                        <button
                          onClick={() => {
                            setJoiningCommunity(currentCommunity);
                            setShowJoinModal(true);
                          }}
                          className="px-8 py-4 bg-blue-700 text-white rounded-xl font-bold hover:bg-blue-800 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl text-lg border-2 border-blue-900"
                        >
                          🔄 Rejoin
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setRequestingCommunity(currentCommunity);
                            setShowRequestModal(true);
                          }}
                          className="px-8 py-4 bg-red-700 text-white rounded-xl font-bold hover:bg-red-800 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl text-lg"
                        >
                          📋 Request Access
                        </button>
                        <button
                          onClick={() => {
                            setRequestingCommunity(currentCommunity);
                            setShowRequestModal(true);
                          }}
                          className="px-8 py-4 bg-blue-700 text-white rounded-xl font-bold hover:bg-blue-800 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl text-lg border-2 border-blue-900"
                        >
                          🔄 Rejoin Request
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
                        </button>
                        <button
                          onClick={() => {
                            setRequestingCommunity(currentCommunity);
                            setShowRequestModal(true);
                          }}
                          className="px-8 py-4 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-all transform hover:scale-105 shadow-lg border-2 border-blue-300"
                        >
                          🔄 Rejoin Request
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Search and Filters */}
            <div className="mb-8 space-y-4">
              <div className="relative">
                <search className="absolute left-4 top-3 text-green-600" size={20} />
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500 shadow-sm hover:shadow-md transition-all duration-200"
                />
              </div>

              {/* Categories */}
              <div className="flex flex-wrap gap-3">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-5 py-2 rounded-full text-sm font-bold transition-all duration-200 transform hover:scale-105 shadow-sm ${
                      selectedCategory === category.id
                        ? 'bg-gradient-to-r from-green-700 to-green-800 text-white shadow-md hover:shadow-lg'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-green-600 hover:bg-green-50'
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
                  <Loader className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">Loading posts...</p>
                </div>
              </div>
            ) : filteredPosts.length > 0 ? (
              <div className="space-y-6">
                {filteredPosts.map((post) => (
                  <Link key={post._id} href={`/community/post/${post._id}`}>
                    <div className="bg-white border border-gray-200 rounded-2xl hover:border-green-400 hover:shadow-xl transition-all duration-300 transform hover:scale-102 p-6 cursor-pointer group">
                      <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-lg group-hover:shadow-lg transition-all duration-200 shadow-sm">
                            {post.author.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-green-600 transition-colors duration-200 line-clamp-2">
                              {post.title}
                            </h3>
                            <p className="text-sm text-gray-600 font-medium">
                              {post.author} • {new Date(post.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {post.category && (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold whitespace-nowrap border border-green-200">
                            {post.category}
                          </span>
                        )}
                      </div>

                      {post.image && (
                        <img src={post.image} alt={post.title} className="w-full h-48 object-cover rounded-xl mb-4 group-hover:shadow-lg transition-all duration-200" />
                      )}

                      <p className="text-gray-700 line-clamp-2 mb-5 leading-relaxed">{post.content}</p>

                      {/* Engagement Stats */}
                      <div className="flex gap-6 text-sm font-bold">
                        <button className="flex items-center gap-2 text-red-700 hover:text-red-800 hover:bg-red-50 px-3 py-2 rounded-lg transition-all duration-200 font-bold">
                          <Heart className="w-4 h-4" />
                          <span>{post.likes}</span>
                        </button>
                        <button className="flex items-center gap-2 text-blue-700 hover:text-blue-800 hover:bg-blue-50 px-3 py-2 rounded-lg transition-all duration-200 font-bold">
                          <MessageCircle className="w-4 h-4" />
                          <span>{post.comments}</span>
                        </button>
                        <button className="flex items-center gap-2 text-green-700 hover:text-green-800 hover:bg-green-50 px-3 py-2 rounded-lg transition-all duration-200 font-bold">
                          <Share2 className="w-4 h-4" />
                          <span>Share</span>
                        </button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-gray-200 shadow-sm">
                <MessageCircle size={48} className="text-gray-300 mb-4" />
                <p className="text-gray-600 text-center font-medium">
                  No posts yet. {user ? 'Be the first to share your yoga journey!' : 'Join the community to see posts!'}
                </p>
                {user && (
                  <div className="mt-8 w-full max-w-md">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 shadow-sm">
                      <label className="block text-sm font-bold text-gray-900 mb-4">💬 Send a Message</label>
                      <textarea
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        placeholder="Share your thoughts or ask a question..."
                        className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500 resize-none h-24 shadow-sm"
                      />
                      <button
                        onClick={handleSendChat}
                        disabled={chatLoading || !chatMessage.trim()}
                        className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-green-700 to-green-800 text-white rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 font-bold shadow-md hover:shadow-lg text-lg"
                      >
                        {chatLoading ? 'Sending...' : '📨 Send Message'}
                      </button>
                    </div>
                  </div>
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
                <label className="block text-sm font-bold text-white mb-2">👤 Full Name</label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={joinFormData.name}
                  onChange={(e) => setJoinFormData({...joinFormData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-white text-black border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-white placeholder-gray-500 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-white mb-2">📧 Email Address</label>
                <input
                  type="email"
                  placeholder="your.email@example.com"
                  value={joinFormData.email}
                  onChange={(e) => setJoinFormData({...joinFormData, email: e.target.value})}
                  className="w-full px-4 py-3 bg-white text-black border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-white placeholder-gray-500 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-white mb-2">📱 WhatsApp Number</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={joinFormData.mobile}
                  onChange={(e) => setJoinFormData({...joinFormData, mobile: e.target.value})}
                  className="w-full px-4 py-3 bg-white text-black border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-white placeholder-gray-500 shadow-sm"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinFormData({ name: '', email: '', mobile: '' });
                  }}
                  className="flex-1 px-4 py-3 bg-white/20 hover:bg-white/30 text-white border border-white/40 rounded-lg font-bold transition-all duration-200 shadow-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleJoinCommunity}
                  disabled={joiningLoading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-700 to-green-800 hover:from-green-800 hover:to-green-900 text-white rounded-lg font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-green-400 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
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
              <div className="bg-orange-100 border-2 border-orange-400 rounded-lg p-4 mb-4">
                <p className="text-orange-800 text-sm">
                  ℹ️ This is a private community. Your request will be reviewed by our admin team.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">👤 Full Name</label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={requestFormData.name}
                  onChange={(e) => setRequestFormData({...requestFormData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-white text-black border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">📧 Email Address</label>
                <input
                  type="email"
                  placeholder="your.email@example.com"
                  value={requestFormData.email}
                  onChange={(e) => setRequestFormData({...requestFormData, email: e.target.value})}
                  className="w-full px-4 py-3 bg-white text-black border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">📱 WhatsApp Number</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={requestFormData.mobile}
                  onChange={(e) => setRequestFormData({...requestFormData, mobile: e.target.value})}
                  className="w-full px-4 py-3 bg-white text-black border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500"
                />
              </div>

              <div className="flex items-center gap-3 bg-blue-100 p-4 rounded-lg border-2 border-blue-400">
                <input
                  type="checkbox"
                  id="workshops"
                  checked={requestFormData.workshopsCompleted}
                  onChange={(e) => setRequestFormData({...requestFormData, workshopsCompleted: e.target.checked})}
                  className="w-4 h-4 cursor-pointer accent-green-500"
                />
                <label htmlFor="workshops" className="text-sm text-gray-900 cursor-pointer flex-1">
                  ✅ I have completed the required workshops
                </label>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">💬 Message (Optional)</label>
                <textarea
                  placeholder="Tell us about your yoga journey and why you want to join this community..."
                  value={requestFormData.message}
                  onChange={(e) => setRequestFormData({...requestFormData, message: e.target.value})}
                  className="w-full px-4 py-3 bg-white text-black border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none placeholder-gray-500"
                  rows={4}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowRequestModal(false);
                    setRequestFormData({ name: '', email: '', mobile: '', workshopsCompleted: false, message: '' });
                  }}
                  className="flex-1 px-4 py-3 bg-gray-300 hover:bg-gray-400 text-gray-900 border border-gray-500 rounded-lg font-bold transition-all duration-200 shadow-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestAccess}
                  disabled={requestLoading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white rounded-lg font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
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

      {/* Chat Off Modal */}
      {showChatOffModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-blue-400 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <span className="text-3xl">⏳</span>
                Chat is Off
              </h2>
            </div>
            <div className="p-8 text-center space-y-4">
              <p className="text-gray-900 text-lg font-semibold">Community chat is currently unavailable</p>
              <p className="text-gray-600">Our admin team has temporarily disabled community chat for some time. Please check back later to participate in discussions.</p>
              <div className="bg-blue-100 border-2 border-blue-400 rounded-lg p-4 mt-6">
                <p className="text-blue-800 text-sm">✨ We'll be back soon!</p>
              </div>
            </div>
            <div className="px-8 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowChatOffModal(false)}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CommunityPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>}>
      <CommunityPageContent />
    </Suspense>
  );
}
