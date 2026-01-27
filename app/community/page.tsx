'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, Share2, Search, Plus, LogOut, Users, Globe, Loader, Home, AlertCircle, ExternalLink } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { COMMUNITY_DESIGNS, CommunityDesign } from '@/lib/communityColorSystem';

interface Post {
  _id: string;
  userId: string;
  content: string;
  title?: string;
  images?: string[];
  videos?: string[];
  documents?: string[];
  likes?: number | any[];
  comments?: number | any[];
  createdAt: string;
  category?: string;
  status?: 'published' | 'draft' | 'scheduled';
  communityId?: string;
}

// Map CommunityDesign to legacy Community interface for compatibility
interface Community {
  id: string;
  name: string;
  description: string;
  members: number;
  isPublic: boolean;
  design: CommunityDesign;
}

const COMMUNITIES: Community[] = COMMUNITY_DESIGNS.map(design => ({
  id: design.id,
  name: design.name,
  description: design.description,
  members: design.members || 0,
  isPublic: design.isPublic || false,
  design
}));

function CommunityPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
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
  const [postsError, setPostsError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [authChecked, setAuthChecked] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // View Mode: 'posts' or 'videos'
  const [viewMode, setViewMode] = useState<'posts' | 'videos'>('posts');
  
  // Videos State
  const [videos, setVideos] = useState<any[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosError, setVideosError] = useState('');

  // Comment Modal States
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [activePostForComment, setActivePostForComment] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const categories = [
    { id: 'all', label: '📋 All Posts' },
    { id: 'experiences', label: '✨ Experiences' },
    { id: 'tips', label: '💡 Tips & Tricks' },
    { id: 'transformations', label: '🦋 Transformations' },
    { id: 'questions', label: '❓ Questions' },
    { id: 'recordings', label: '🎬 Recordings' },
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
        setAuthChecked(true);
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
    setAuthChecked(true);
  };

  // Helper to get proxied URL for S3 images
  const getSignedImageUrl = useCallback(async (imageUrl: string): Promise<string> => {
    // If it's already a proxied URL or data URL, return as-is
    if (imageUrl.startsWith('/api/s3/image') || imageUrl.startsWith('data:')) {
      return imageUrl;
    }

    // Check cache first
    if (signedUrls[imageUrl]) {
      return signedUrls[imageUrl];
    }

    // Extract key from URL or use as key
    let key = imageUrl;
    if (imageUrl.includes('amazonaws.com')) {
      try {
        const url = new URL(imageUrl);
        key = url.pathname.slice(1); // Remove leading /
      } catch {
        // Use as-is if not a valid URL
      }
    }

    // Use the proxy endpoint instead of signed URL
    const proxyUrl = `/api/s3/image?key=${encodeURIComponent(key)}`;
    setSignedUrls(prev => ({ ...prev, [imageUrl]: proxyUrl }));
    return proxyUrl;
  }, [signedUrls]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setPostsError('');
    try {
      const response = await fetch('/api/community/posts?category=' + selectedCategory, {
        cache: 'no-store',
      });
      
      if (response.status === 429) {
        // Rate limited - retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        setPostsError('Too many requests. Retrying...');
        setTimeout(() => {
          setRetryCount(r => r + 1);
        }, delay);
        setPosts([]);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setPosts(Array.isArray(data.posts) ? data.posts : []);
        setRetryCount(0);
      } else {
        console.error('Failed to fetch posts:', response.status);
        setPostsError(`Failed to load posts (Error: ${response.status})`);
        setPosts([]);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPostsError('Failed to load posts. Please try again.');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, retryCount]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Fetch community videos (only for members)
  const fetchVideos = useCallback(async () => {
    if (!user || selectedCommunity === 'global') {
      setVideos([]);
      return;
    }
    
    setVideosLoading(true);
    setVideosError('');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setVideosError('Please login to view videos');
        return;
      }
      
      const response = await fetch(`/api/community/${selectedCommunity}/videos`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.status === 403) {
        setVideosError('Join this community to access exclusive videos');
        setVideos([]);
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos || []);
      } else {
        setVideosError('Failed to load videos');
        setVideos([]);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      setVideosError('Failed to load videos');
      setVideos([]);
    } finally {
      setVideosLoading(false);
    }
  }, [selectedCommunity, user]);

  // Fetch videos when switching to videos tab or changing community
  useEffect(() => {
    if (viewMode === 'videos') {
      fetchVideos();
    }
  }, [viewMode, selectedCommunity, fetchVideos]);

  // Pre-fetch signed URLs for all post images
  useEffect(() => {
    const fetchSignedUrls = async () => {
      for (const post of posts) {
        if (post.images && post.images.length > 0) {
          for (const imageUrl of post.images) {
            if (!signedUrls[imageUrl] && !imageUrl.includes('X-Amz-Signature')) {
              await getSignedImageUrl(imageUrl);
            }
          }
        }
      }
    };
    if (posts.length > 0) {
      fetchSignedUrls();
    }
  }, [posts, signedUrls, getSignedImageUrl]);

  const handleAddComment = async () => {
    if (!activePostForComment || !commentText.trim()) return;
    setCommentLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/signin';
        return;
      }
      const response = await fetch('/api/community/post/comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          postId: activePostForComment._id,
          text: commentText
        }),
      });
      if (response.ok) {
        setCommentText('');
        setShowCommentModal(false);
        fetchPosts(); // Refresh list
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setCommentLoading(false);
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

  // Format WhatsApp-style text (bold, italic, strikethrough)
  const formatWhatsAppText = (text: string) => {
    if (!text) return '';
    
    // Replace *bold* with <strong>
    let formatted = text.replace(/\*(.*?)\*/g, '<strong class="font-bold text-gray-900">$1</strong>');
    
    // Replace _italic_ with <em>
    formatted = formatted.replace(/_(.*?)_/g, '<em class="italic">$1</em>');
    
    // Replace ~strikethrough~ with <del>
    formatted = formatted.replace(/~(.*?)~/g, '<del class="line-through">$1</del>');
    
    // Replace ```code``` with <code>
    formatted = formatted.replace(/```(.*?)```/g, '<code class="bg-gray-100 px-2 py-1 rounded text-sm font-mono">$1</code>');
    
    // Convert newlines to <br>
    formatted = formatted.replace(/\n/g, '<br />');
    
    return formatted;
  };

  // Get the body content - strips header/footer if they exist in metadata
  const getPostBodyContent = (post: Post) => {
    let content = post.content || '';
    const metadata = (post as any).metadata;
    
    // If we have original body in metadata, use that instead
    if (metadata?.originalBody) {
      return metadata.originalBody;
    }
    
    // Otherwise strip the header and footer from the full content
    if (metadata?.originalHeader) {
      // Remove the header line (with asterisks for bold)
      content = content.replace(new RegExp(`^\\*${escapeRegex(metadata.originalHeader)}\\*\\n?`, 'i'), '');
    }
    if (metadata?.originalFooter) {
      // Remove the footer line (with underscores for italic)
      content = content.replace(new RegExp(`\\n?_${escapeRegex(metadata.originalFooter)}_$`, 'i'), '');
    }
    
    return content.trim();
  };

  // Helper to escape regex special chars
  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('community_user');
    setUser(null);
    alert('✅ Logged out successfully');
  };

  const filteredPosts = posts.filter((post) =>
    (post.content || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentCommunity = communities.find((c) => c.id === selectedCommunity);

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
                          ? `bg-gradient-to-r ${community.design.color.dark} text-white font-semibold shadow-md hover:shadow-lg`
                          : `${community.design.color.light} text-gray-700 border hover:border-opacity-100 hover:bg-opacity-100 transition-colors`
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <community.design.icon size={20} className={selectedCommunity === community.id ? 'text-white' : community.design.color.main} />
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
            <div className={`bg-gradient-to-br ${currentCommunity?.design.color.gradient} rounded-2xl p-10 mb-10 text-white shadow-2xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden`}>
              {/* Background accent */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full -ml-36 -mb-36 blur-3xl"></div>
              
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <div className="text-6xl mb-4 drop-shadow-lg flex items-center">
                    {currentCommunity?.design.icon && <currentCommunity.design.icon size={64} className="text-white" />}
                  </div>
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
                          className="px-8 py-4 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl text-lg"
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

            {/* Search and Filters */}
            <div className="mb-8 space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-3 text-green-600" size={20} />
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
                    onClick={() => {
                      if (category.id === 'recordings') {
                        router.push('/community/recordings');
                      } else {
                        setSelectedCategory(category.id);
                        setViewMode('posts');
                      }
                    }}
                    className={`px-5 py-2 rounded-full text-sm font-bold transition-all duration-200 transform hover:scale-105 shadow-sm ${
                      selectedCategory === category.id && viewMode === 'posts'
                        ? 'bg-gradient-to-r from-green-700 to-green-800 text-white shadow-md hover:shadow-lg'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-green-600 hover:bg-green-50'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
                
                {/* Videos Tab - Only show for non-global communities and members */}
                {selectedCommunity !== 'global' && (
                  <button
                    onClick={() => setViewMode('videos')}
                    className={`px-5 py-2 rounded-full text-sm font-bold transition-all duration-200 transform hover:scale-105 shadow-sm flex items-center gap-2 ${
                      viewMode === 'videos'
                        ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md hover:shadow-lg'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-purple-600 hover:bg-purple-50'
                    }`}
                  >
                    🎥 Videos
                  </button>
                )}
              </div>
            </div>

            {/* Videos Section */}
            {viewMode === 'videos' ? (
              <div className="space-y-6">
                {!user ? (
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-8 text-center">
                    <div className="text-5xl mb-4">🔒</div>
                    <h3 className="text-xl font-bold text-purple-900 mb-2">Members Only</h3>
                    <p className="text-purple-700 mb-4">Join this community to access exclusive videos</p>
                    <button
                      onClick={() => {
                        const community = communities.find(c => c.id === selectedCommunity);
                        if (community) {
                          if (community.isPublic) {
                            setJoiningCommunity(community);
                            setShowJoinModal(true);
                          } else {
                            setRequestingCommunity(community);
                            setShowRequestModal(true);
                          }
                        }
                      }}
                      className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all"
                    >
                      Join Community
                    </button>
                  </div>
                ) : videosLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="text-center">
                      <Loader className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">Loading videos...</p>
                    </div>
                  </div>
                ) : videosError ? (
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-8 text-center">
                    <div className="text-5xl mb-4">🎬</div>
                    <p className="text-purple-700">{videosError}</p>
                  </div>
                ) : videos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {videos.map((video) => (
                      <div key={video._id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
                        {/* Video Player */}
                        <div className="relative aspect-video bg-gray-900">
                          {video.url ? (
                            <video 
                              controls 
                              className="w-full h-full"
                              poster={video.thumbnailUrl}
                              controlsList="nodownload"
                              onContextMenu={(e) => e.preventDefault()}
                            >
                              <source src={video.url} type="video/mp4" />
                              Your browser does not support the video tag.
                            </video>
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">
                              <span>Video unavailable</span>
                            </div>
                          )}
                          {/* Non-shareable badge */}
                          <div className="absolute top-3 right-3 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-bold">
                            🔒 Members Only
                          </div>
                        </div>
                        {/* Video Info */}
                        <div className="p-4">
                          <h4 className="text-lg font-bold text-gray-900 mb-1">{video.title}</h4>
                          {video.description && (
                            <p className="text-gray-600 text-sm line-clamp-2">{video.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                            <span>👤 {video.uploadedBy}</span>
                            <span>📅 {new Date(video.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-8 text-center">
                    <div className="text-5xl mb-4">🎥</div>
                    <h3 className="text-xl font-bold text-purple-900 mb-2">No Videos Yet</h3>
                    <p className="text-purple-700">Videos will be added by community admins</p>
                  </div>
                )}
              </div>
            ) : (
              /* Posts Section */
              <>
            {/* Access Control: Show members-only message for non-global communities when not logged in */}
            {selectedCommunity !== 'global' && !user ? (
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-2xl p-10 text-center">
                <div className="text-6xl mb-4">🔒</div>
                <h3 className="text-2xl font-bold text-purple-900 mb-3">Members Only Community</h3>
                <p className="text-purple-700 mb-6 max-w-md mx-auto">
                  This community is exclusive to members. Join to access posts, videos, and connect with other members.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {currentCommunity?.isPublic ? (
                    <button
                      onClick={() => {
                        setJoiningCommunity(currentCommunity);
                        setShowJoinModal(true);
                      }}
                      className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 shadow-lg"
                    >
                      ✨ Join Now - It&apos;s Free!
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setRequestingCommunity(currentCommunity);
                        setShowRequestModal(true);
                      }}
                      className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-bold hover:from-purple-700 hover:to-purple-800 transition-all transform hover:scale-105 shadow-lg"
                    >
                      📋 Request Membership
                    </button>
                  )}
                  <Link
                    href="/community?join=global"
                    className="px-8 py-4 bg-white text-purple-700 border-2 border-purple-300 rounded-xl font-bold hover:bg-purple-50 transition-all"
                  >
                    🌐 View Global Community
                  </Link>
                </div>
              </div>
            ) : loading ? (
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
                    <div className="bg-white border-2 border-gray-100 rounded-[2rem] hover:border-emerald-400 hover:shadow-2xl hover:shadow-emerald-100/50 transition-all duration-500 transform hover:-translate-y-2 overflow-hidden cursor-pointer group shadow-lg p-6 sm:p-8 mb-6">
                      
                      {/* WhatsApp Format 1: Header (Heading) */}
                      <div className="mb-4">
                        {(post as any).metadata?.originalHeader ? (
                           <h3 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight tracking-tight group-hover:text-emerald-600 transition-colors duration-300">
                             {(post as any).metadata.originalHeader}
                           </h3>
                        ) : post.title && (
                          <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight mb-2 tracking-tight group-hover:text-emerald-600 transition-colors duration-300">
                            {post.title}
                          </h3>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      {/* WhatsApp Format 2: Image */}
                      {post.images && post.images.length > 0 && (() => {
                        const imageUrl = signedUrls[post.images[0]] || (post.images[0].includes('X-Amz-Signature') ? post.images[0] : null);
                        return imageUrl ? (
                          <div className="relative w-full aspect-video sm:aspect-[16/9] bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden rounded-2xl mb-6 border border-gray-100 shadow-inner group-hover:shadow-lg transition-shadow duration-300">
                            <img 
                              src={imageUrl} 
                              alt="" 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                              onError={(e) => { 
                                const img = e.target as HTMLImageElement;
                                const container = img.parentElement;
                                if (container) {
                                  container.style.display = 'none';
                                }
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            {post.images.length > 1 && (
                              <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide border border-white/20">
                                +{post.images.length - 1} More
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="relative w-full aspect-video sm:aspect-[16/9] bg-gradient-to-br from-emerald-50 to-teal-50 overflow-hidden rounded-2xl mb-6 border border-gray-100 flex items-center justify-center">
                            <div className="text-emerald-400 animate-pulse text-sm">Loading image...</div>
                          </div>
                        );
                      })()}

                      {/* WhatsApp Format 3: Body (Text) - With Formatting */}
                      <div className="mb-6">
                        <div 
                          className="text-gray-600 text-base sm:text-lg leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: formatWhatsAppText(getPostBodyContent(post)) }}
                        />
                      </div>

                      {/* WhatsApp Format 4: Footer - By Mohan Sir */}
                      <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border-l-4 border-emerald-500">
                        <p className="text-emerald-700 italic text-sm sm:text-base">
                          By - Mohan Sir
                        </p>
                      </div>

                      {/* WhatsApp Format 5: Blue Button */}
                      {(post as any).metadata?.buttons && Array.isArray((post as any).metadata.buttons) && (post as any).metadata.buttons.length > 0 && (
                        <div className="flex flex-wrap gap-3 mb-6">
                          {(post as any).metadata.buttons.map((btn: any, idx: number) => (
                            <button 
                              key={idx}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if(btn.url) window.open(btn.url, '_blank');
                              }}
                              className="flex-1 min-w-[180px] py-3 px-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-bold text-sm uppercase tracking-wide shadow-lg shadow-blue-200/50 transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-95 text-center flex items-center justify-center gap-2"
                            >
                              {btn.label || btn.text} <ExternalLink className="w-4 h-4" />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Engagement Stats - Always at bottom */}
                      <div className="flex gap-6 text-sm font-semibold border-t border-gray-100 pt-5 mt-2">
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const token = localStorage.getItem('token');
                            if (!token) return window.location.href = '/signin';
                            try {
                              const res = await fetch('/api/community/post/like', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                body: JSON.stringify({ postId: post._id }),
                              });
                              if (res.ok) {
                                const json = await res.json();
                                setPosts(prev => prev.map(p => p._id === post._id ? { 
                                  ...p, 
                                  likes: Array.isArray(p.likes) 
                                    ? (json.data.likedByMe 
                                        ? (p.likes.includes(user._id) ? p.likes : [...p.likes, user._id])
                                        : p.likes.filter((id: string) => id !== user._id))
                                    : [user._id]
                                } : p));
                              }
                            } catch (err) {}
                          }}
                          className="flex items-center gap-2 text-gray-400 hover:text-red-500 transition-all hover:scale-105">
                          <span className={`text-lg ${Array.isArray(post.likes) && user && post.likes.includes(user._id) ? 'text-red-500' : ''}`}>
                            {Array.isArray(post.likes) && user && post.likes.includes(user._id) ? '❤️' : '🤍'}
                          </span>
                          <span className={`${Array.isArray(post.likes) && user && post.likes.includes(user._id) ? 'text-red-600' : 'text-gray-500'}`}>
                            {Array.isArray(post.likes) ? post.likes.length : 0}
                          </span>
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setActivePostForComment(post);
                            setShowCommentModal(true);
                          }}
                          className="flex items-center gap-2 text-gray-400 hover:text-emerald-500 transition-all hover:scale-105">
                          <MessageCircle className="w-5 h-5" />
                          <span className="text-gray-500">{Array.isArray(post.comments) ? post.comments.length : (typeof post.comments === 'number' ? post.comments : 0)}</span>
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (navigator.share) {
                              navigator.share({
                                title: 'Swar Yoga Community',
                                text: post.content.substring(0, 100),
                                url: `${window.location.origin}/community/post/${post._id}`
                              });
                            }
                          }}
                          className="flex items-center gap-2 text-gray-400 hover:text-emerald-600 transition-all hover:scale-105 ml-auto">
                          <Share2 className="w-5 h-5" />
                          <span className="text-gray-500">Share</span>
                        </button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : postsError ? (
              <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-red-200 shadow-sm">
                <AlertCircle size={48} className="text-red-400 mb-4" />
                <p className="text-red-600 text-center font-medium mb-6">{postsError}</p>
                <button
                  onClick={() => {
                    setRetryCount(0);
                    fetchPosts();
                  }}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold"
                >
                  Retry
                </button>
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* Join Community Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-green-900 to-emerald-900 border border-green-500/40 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white text-left">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-4 rounded-2xl shadow-inner text-3xl">
                  ✨
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Join {joiningCommunity?.name}</h2>
                  <p className="text-sm font-medium opacity-90">Connect with the community</p>
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
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white text-left">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-4 rounded-2xl shadow-inner text-3xl">
                  📋
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Request Access</h2>
                  <p className="text-sm font-medium opacity-90">{requestingCommunity?.name}</p>
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

      {/* Comment Modal */}
      {showCommentModal && activePostForComment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white border-2 border-emerald-500 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageCircle size={24} />
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tighter leading-none mb-1">Add Comment</h3>
                  <p className="text-[10px] uppercase font-bold opacity-75 tracking-tighter">Community Discussion</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowCommentModal(false);
                  setCommentText('');
                  setActivePostForComment(null);
                }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                title="Close"
              >
                <Plus className="rotate-45" size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Replying to</p>
                <p className="text-sm text-slate-600 font-medium line-clamp-2 italic">"{activePostForComment.content}"</p>
              </div>
              
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Your Message</label>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="w-full h-32 px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-500 focus:bg-white transition-all font-medium text-sm resize-none"
                  autoFocus
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowCommentModal(false);
                    setCommentText('');
                    setActivePostForComment(null);
                  }}
                  className="flex-1 py-4 font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddComment}
                  disabled={commentLoading || !commentText.trim()}
                  className="flex-1 py-4 px-6 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-50 transition-all active:scale-95"
                >
                  {commentLoading ? 'Posting...' : 'Submit Comment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Off Modal */}
      {showChatOffModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-blue-400 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transition-all animate-in fade-in zoom-in duration-300">
            <div className="bg-blue-500 p-8 text-white relative">
              <div className="absolute top-4 right-4 text-white/50 animate-pulse">
                <AlertCircle className="w-12 h-12" />
              </div>
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
