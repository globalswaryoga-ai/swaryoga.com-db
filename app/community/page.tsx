'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, Share2, Search, Plus, LogOut, Users, Globe, Loader, Home, AlertCircle, ExternalLink, Menu, X, ChevronDown, ChevronRight } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { COMMUNITY_DESIGNS, CommunityDesign, COMMUNITY_GROUPS, getGroupedCommunities } from '@/lib/communityColorSystem';

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
  category?: string;
}

const COMMUNITIES: Community[] = COMMUNITY_DESIGNS.map(design => ({
  id: design.id,
  name: design.name,
  description: design.description,
  members: design.members || 0,
  isPublic: design.isPublic || false,
  design,
  category: design.category
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
  const [userMemberships, setUserMemberships] = useState<string[]>([]); // Communities user is a member of
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joiningCommunity, setJoiningCommunity] = useState<any>(null);
  const [joinFormData, setJoinFormData] = useState({ name: '', email: '', mobile: '', country: 'India' });
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
  
  // Workshop Check Modal - shows when clicking on non-global communities
  const [showWorkshopCheckModal, setShowWorkshopCheckModal] = useState(false);
  const [pendingCommunity, setPendingCommunity] = useState<any>(null);
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

  // Mobile sidebar state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Expanded groups state for dropdown
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'common': true, // Common is expanded by default
    'health': false,
    'married-life': false,
    'youth': false,
    'children': false,
    'yogasana': false,
  });

  // Rating stats state
  const [ratingStats, setRatingStats] = useState<{
    avgRating: number;
    totalCount: number;
    fiveStars: number;
    fourStars: number;
    threeStars: number;
    twoStars: number;
    oneStars: number;
  } | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);

  // Toggle group expansion
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Get grouped communities
  const groupedCommunities = getGroupedCommunities();

  // Close sidebar when route changes
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [selectedCommunity]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileSidebarOpen]);

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

  // Fetch user memberships when auth is checked
  useEffect(() => {
    if (authChecked) {
      fetchUserMemberships();
    }
  }, [authChecked, user]);

  useEffect(() => {
    if (joinParam) {
      const community = communities.find(c => c.id === joinParam);
      if (community) {
        setSelectedCommunity(community.id);
        // Invite links (?join=<id>) always show direct Join modal
        // so admin can share links that let paid members join directly
        setJoiningCommunity(community);
        setShowJoinModal(true);
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
        // Ensure _id is set from userId for like/comment functionality
        setUser({ 
          ...communityUser, 
          _id: communityUser._id || communityUser.userId 
        });
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

  // Fetch user's community memberships
  const fetchUserMemberships = async () => {
    const communityUserStr = localStorage.getItem('community_user');
    if (communityUserStr) {
      try {
        const communityUser = JSON.parse(communityUserStr);
        // Check membership for each community
        const response = await fetch(`/api/community/membership/check?mobile=${encodeURIComponent(communityUser.mobile)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.memberships) {
            setUserMemberships(data.memberships);
          }
        }
      } catch (error) {
        console.error('Error fetching memberships:', error);
      }
    }
  };

  // Handle community click - show workshop check for non-global/non-member communities
  const handleCommunityClick = (community: any) => {
    // If it's global community, just switch
    if (community.id === 'global') {
      setSelectedCommunity(community.id);
      return;
    }
    
    // If user is a member of this community, just switch
    if (userMemberships.includes(community.id)) {
      setSelectedCommunity(community.id);
      return;
    }
    
    // Otherwise, show the workshop check modal
    setPendingCommunity(community);
    setShowWorkshopCheckModal(true);
  };

  // Proceed to request access after workshop confirmation
  const proceedToRequestAccess = () => {
    setShowWorkshopCheckModal(false);
    if (pendingCommunity) {
      setSelectedCommunity(pendingCommunity.id);
      setRequestingCommunity(pendingCommunity);
      setShowRequestModal(true);
    }
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

  // Fetch rating stats on mount
  useEffect(() => {
    async function fetchRatingStats() {
      try {
        const res = await fetch('/api/community/experiences?limit=1');
        const data = await res.json();
        if (data.success && data.stats) {
          setRatingStats(data.stats);
        }
      } catch (error) {
        console.error('Error fetching rating stats:', error);
      }
    }
    fetchRatingStats();
  }, []);

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
    if (!joinFormData.name || !joinFormData.email || !joinFormData.mobile || !joinFormData.country) {
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
          country: joinFormData.country,
          countryCode: joinFormData.country === 'India' ? '+91' : joinFormData.country === 'Nepal' ? '+977' : '+91',
          communityId: joiningCommunity.id,
          communityName: joiningCommunity.name,
          // If joining via invite link (?join=), mark as invited for auto-approval
          viaInviteLink: !!joinParam,
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
      
      // Store JWT token for like/comment functionality
      if (result?.data?.token) {
        localStorage.setItem('token', result.data.token);
      }
      
      localStorage.setItem('community_user', JSON.stringify({
        name: joinFormData.name,
        email: joinFormData.email,
        mobile: joinFormData.mobile,
        userId: serverUserId || JSON.parse(localStorage.getItem('community_user') || 'null')?.userId,
        _id: serverUserId, // Also store as _id for compatibility
      }));
      setUser({ name: joinFormData.name, email: joinFormData.email, _id: serverUserId });
      
      // Add the community to user memberships so UI updates immediately
      if (joiningCommunity?.id && !userMemberships.includes(joiningCommunity.id)) {
        setUserMemberships(prev => [...prev, joiningCommunity.id]);
      }
      
      setShowJoinModal(false);
      setJoinFormData({ name: '', email: '', mobile: '', country: 'India' });
      
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
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-md active:scale-95 transition-all duration-200"
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 active:scale-95" title="Home">
              <Home size={20} className="sm:w-6 sm:h-6 text-green-600" />
            </Link>
            <Link href="/" className="text-lg sm:text-2xl font-bold tracking-tight text-gray-900 hover:opacity-75 transition-opacity">
              Swar Yoga <span className="hidden sm:inline">🧘</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {user ? (
              <>
                <div className="text-right hidden sm:block">
                  <p className="font-semibold text-gray-900 text-sm">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <div className="sm:hidden w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all duration-200 text-sm font-bold shadow-md active:scale-95"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <div className="text-xs sm:text-sm text-gray-500 font-medium">Not joined</div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white z-50 transform transition-transform duration-300 ease-out lg:hidden shadow-2xl ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-green-500 to-emerald-600">
            <h2 className="text-lg font-bold text-white">Communities</h2>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-colors active:scale-95"
            >
              <X size={20} />
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* User Profile Card - Mobile */}
            {user ? (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold shadow-md">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-semibold text-sm truncate">{user.name}</p>
                    <p className="text-green-600 text-xs font-medium">✓ Member</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-4 shadow-sm">
                <p className="text-blue-900 text-sm font-bold mb-2">👋 Join the Community</p>
                <p className="text-blue-700 text-xs">Connect with fellow yoga practitioners</p>
              </div>
            )}

            {/* Communities List - Mobile - Grouped */}
            <div className="space-y-3">
              {groupedCommunities.map(({ group, communities: groupCommunities }) => (
                <div key={group.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <group.icon size={18} className="text-gray-600" />
                      <span className="font-semibold text-gray-800 text-sm">{group.name}</span>
                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">{groupCommunities.length}</span>
                    </div>
                    {expandedGroups[group.id] ? (
                      <ChevronDown size={18} className="text-gray-500" />
                    ) : (
                      <ChevronRight size={18} className="text-gray-500" />
                    )}
                  </button>
                  
                  {/* Group Communities */}
                  {expandedGroups[group.id] && (
                    <div className="p-2 space-y-1 bg-white">
                      {groupCommunities.map(design => {
                        const community = communities.find(c => c.id === design.id);
                        if (!community) return null;
                        const isMember = userMemberships.includes(community.id) || community.id === 'global';
                        return (
                          <button
                            key={community.id}
                            onClick={() => {
                              handleCommunityClick(community);
                              setMobileSidebarOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 active:scale-[0.98] ${
                              selectedCommunity === community.id
                                ? `bg-gradient-to-r ${community.design.color.dark} text-white font-semibold shadow-md`
                                : isMember 
                                  ? `${community.design.color.light} text-gray-700 hover:shadow-sm`
                                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <community.design.icon size={16} className={selectedCommunity === community.id ? 'text-white' : community.design.color.main} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <p className="text-xs font-semibold truncate">{community.name}</p>
                                  {!isMember && <span className="text-[8px] bg-orange-100 text-orange-600 px-1 rounded">🔒</span>}
                                </div>
                                <p className="text-[10px] opacity-75">{community.members} members</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Stats Card - Mobile */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-3">📊 Stats</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white rounded-xl p-2">
                  <p className="text-lg font-bold text-green-600">{posts.length}</p>
                  <p className="text-[10px] text-gray-500">Posts</p>
                </div>
                <div className="bg-white rounded-xl p-2">
                  <p className="text-lg font-bold text-green-600">{communityStats.global || 0}</p>
                  <p className="text-[10px] text-gray-500">Members</p>
                </div>
                <div className="bg-white rounded-xl p-2">
                  <p className="text-lg font-bold text-green-600">{communities.length}</p>
                  <p className="text-[10px] text-gray-500">Groups</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="grid lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Desktop Sidebar - Hidden on mobile */}
          <div className="hidden lg:block lg:col-span-1">
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

            {/* Communities Section - Desktop Grouped */}
            <div className="bg-white border border-green-200 rounded-2xl p-6 mb-8 shadow-sm hover:shadow-md transition-all duration-300">
              <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-3">
                <Users size={20} className="text-green-600" />
                Communities
              </h3>
              <div className="space-y-3">
                {groupedCommunities.map(({ group, communities: groupCommunities }) => (
                  <div key={group.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    {/* Group Header */}
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <group.icon size={18} className="text-gray-600" />
                        <span className="font-semibold text-gray-800 text-sm">{group.name}</span>
                        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">{groupCommunities.length}</span>
                      </div>
                      {expandedGroups[group.id] ? (
                        <ChevronDown size={18} className="text-gray-500" />
                      ) : (
                        <ChevronRight size={18} className="text-gray-500" />
                      )}
                    </button>
                    
                    {/* Group Communities */}
                    {expandedGroups[group.id] && (
                      <div className="p-2 space-y-1 bg-white">
                        {groupCommunities.map(design => {
                          const community = communities.find(c => c.id === design.id);
                          if (!community) return null;
                          const isMember = userMemberships.includes(community.id) || community.id === 'global';
                          return (
                            <div key={community.id} className="space-y-2">
                              <button
                                onClick={() => handleCommunityClick(community)}
                                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.98] ${
                                  selectedCommunity === community.id
                                    ? `bg-gradient-to-r ${community.design.color.dark} text-white font-semibold shadow-md`
                                    : isMember
                                      ? `${community.design.color.light} text-gray-700 hover:shadow-sm`
                                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-dashed border-gray-300'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <community.design.icon size={16} className={selectedCommunity === community.id ? 'text-white' : community.design.color.main} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                      <p className="text-xs font-semibold truncate">{community.name}</p>
                                      {!isMember && <span className="text-[8px] bg-orange-100 text-orange-600 px-1 rounded">🔒</span>}
                                    </div>
                                    <p className="text-[10px] opacity-75">{community.members} members</p>
                                  </div>
                                </div>
                              </button>
                              {/* Show action buttons when community is selected and user is not a member */}
                              {selectedCommunity === community.id && !isMember && (
                                <div className="space-y-2 pl-2">
                                  <button
                                    onClick={() => {
                                      setRequestingCommunity(community);
                                      setShowRequestModal(true);
                                    }}
                                    className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all duration-200 active:scale-[0.98] shadow-md"
                                  >
                                    📋 Request to Join
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
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
            <div className={`bg-gradient-to-br ${currentCommunity?.design.color.gradient} rounded-2xl p-6 sm:p-10 mb-6 sm:mb-10 text-white shadow-xl transition-all duration-300 relative overflow-hidden`}>
              {/* Background accent */}
              <div className="absolute top-0 right-0 w-48 sm:w-96 h-48 sm:h-96 bg-white/10 rounded-full -mr-24 sm:-mr-48 -mt-24 sm:-mt-48 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-36 sm:w-72 h-36 sm:h-72 bg-white/5 rounded-full -ml-18 sm:-ml-36 -mb-18 sm:-mb-36 blur-3xl"></div>
              
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
                <div>
                  <div className="text-4xl sm:text-6xl mb-3 sm:mb-4 drop-shadow-lg flex items-center">
                    {currentCommunity?.design.icon && <currentCommunity.design.icon size={48} className="sm:w-16 sm:h-16 text-white" />}
                  </div>
                  <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold mb-2 drop-shadow-lg">{currentCommunity?.name}</h1>
                  <p className="text-sm sm:text-lg opacity-95 drop-shadow-md">{currentCommunity?.description}</p>
                  <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm font-semibold">
                    <span>👥 {currentCommunity?.members} members</span>
                    {currentCommunity?.isPublic && <span className="bg-white/30 px-3 sm:px-4 py-1 rounded-full">🌐 Public</span>}
                    
                    {/* Star Rating Display */}
                    {ratingStats && ratingStats.totalCount > 0 && (
                      <button 
                        onClick={() => setShowRatingModal(true)}
                        className="bg-white/30 px-3 sm:px-4 py-1 rounded-full flex items-center gap-1 hover:bg-white/40 transition-all cursor-pointer"
                      >
                        <span className="text-yellow-300">⭐</span>
                        <span>{ratingStats.avgRating?.toFixed(1)}</span>
                        <span className="opacity-75">({ratingStats.totalCount})</span>
                      </button>
                    )}
                    
                    {/* Show membership status */}
                    {currentCommunity && userMemberships.includes(currentCommunity.id) && (
                      <span className="bg-green-500/40 px-3 sm:px-4 py-1 rounded-full flex items-center gap-1">
                        ✓ Member
                      </span>
                    )}
                    {currentCommunity && !userMemberships.includes(currentCommunity.id) && currentCommunity.id !== 'global' && (
                      <span className="bg-orange-500/40 px-3 sm:px-4 py-1 rounded-full flex items-center gap-1">
                        🔒 Locked
                      </span>
                    )}
                  </div>
                </div>
                {/* Show join/request buttons based on membership */}
                {currentCommunity && !userMemberships.includes(currentCommunity.id) && currentCommunity.id !== 'global' && (
                  <div className="flex gap-2 sm:gap-3 flex-row sm:flex-col">
                    <button
                      onClick={() => {
                        setRequestingCommunity(currentCommunity);
                        setShowRequestModal(true);
                      }}
                      className="flex-1 sm:flex-none px-4 sm:px-8 py-3 sm:py-4 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-all active:scale-95 shadow-lg text-sm sm:text-lg"
                    >
                      📋 Request to Join
                    </button>
                  </div>
                )}
                {/* Show action buttons for members */}
                {currentCommunity && (userMemberships.includes(currentCommunity.id) || currentCommunity.id === 'global') && (
                  <div className="flex gap-2 sm:gap-3 flex-row sm:flex-col">
                    <Link
                      href="/community/submit"
                      className="flex-1 sm:flex-none px-4 sm:px-8 py-3 sm:py-4 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-all active:scale-95 shadow-lg text-sm sm:text-lg flex items-center justify-center gap-2"
                    >
                      ✨ Share Your Story
                    </Link>
                    {currentCommunity.id === 'global' && !user && (
                      <button
                        onClick={() => {
                          setJoiningCommunity(currentCommunity);
                          setShowJoinModal(true);
                        }}
                        className="flex-1 sm:flex-none px-4 sm:px-8 py-3 sm:py-4 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-all active:scale-95 shadow-lg text-sm sm:text-lg"
                      >
                        + Join Community
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Search and Filters */}
            <div className="mb-6 sm:mb-8 space-y-3 sm:space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-3 text-green-600" size={20} />
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500 shadow-sm transition-all duration-200 text-sm sm:text-base"
                />
              </div>

              {/* Categories - Horizontal scroll on mobile */}
              <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => {
                      // Route to dedicated pages for each category
                      if (category.id === 'recordings') {
                        router.push('/community/recordings');
                      } else if (category.id === 'experiences') {
                        router.push('/community/experiences');
                      } else if (category.id === 'questions') {
                        router.push('/community/questions');
                      } else if (category.id === 'tips') {
                        router.push('/community/tips');
                      } else if (category.id === 'transformations') {
                        router.push('/community/transformations');
                      } else {
                        setSelectedCategory(category.id);
                        setViewMode('posts');
                      }
                    }}
                    className={`shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 active:scale-95 shadow-sm whitespace-nowrap ${
                      selectedCategory === category.id && viewMode === 'posts'
                        ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md'
                        : 'bg-white text-gray-700 border border-gray-200 hover:border-green-500 hover:bg-green-50'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
                
                {/* Videos Tab - Only show for non-global communities and members */}
                {selectedCommunity !== 'global' && (
                  <button
                    onClick={() => setViewMode('videos')}
                    className={`shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 active:scale-95 shadow-sm flex items-center gap-2 whitespace-nowrap ${
                      viewMode === 'videos'
                        ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md'
                        : 'bg-white text-gray-700 border border-gray-200 hover:border-purple-500 hover:bg-purple-50'
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
                          {video.videoSource === 'youtube' && video.embedUrl ? (
                            // YouTube embed via secure proxy (video ID never reaches client)
                            <div className="relative w-full h-full" onContextMenu={(e) => e.preventDefault()}>
                              <iframe
                                src={video.embedUrl}
                                className="w-full h-full"
                                frameBorder="0"
                                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                                referrerPolicy="no-referrer"
                                sandbox="allow-scripts allow-same-origin allow-presentation"
                                title={video.title}
                              />
                            </div>
                          ) : video.url ? (
                            <video 
                              controls 
                              className="w-full h-full"
                              poster={video.thumbnailUrl}
                              controlsList="nodownload nofullscreen noremoteplayback"
                              disablePictureInPicture
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
                          {/* Source badge */}
                          {video.videoSource === 'youtube' && (
                            <div className="absolute bottom-3 left-3 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                              ▶ YouTube
                            </div>
                          )}
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
                          onClick={async (e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const shareUrl = `${window.location.origin}/community/post/${post._id}`;
                            const shareText = post.content.substring(0, 100);
                            
                            if (navigator.share) {
                              try {
                                await navigator.share({
                                  title: 'Swar Yoga Community',
                                  text: shareText,
                                  url: shareUrl
                                });
                              } catch (err) {
                                // User cancelled or share failed
                              }
                            } else {
                              // Fallback: Copy to clipboard
                              try {
                                await navigator.clipboard.writeText(`${shareText}...\n\n${shareUrl}`);
                                alert('✅ Link copied to clipboard!');
                              } catch (err) {
                                // Manual fallback
                                prompt('Copy this link:', shareUrl);
                              }
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

      {/* Rating Breakdown Modal */}
      {showRatingModal && ratingStats && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowRatingModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-500 to-yellow-500 p-6 text-white text-center">
              <div className="text-5xl mb-2">⭐</div>
              <h2 className="text-3xl font-bold">{ratingStats.avgRating?.toFixed(1)}</h2>
              <p className="text-sm opacity-90">{ratingStats.totalCount} total ratings</p>
            </div>

            {/* Rating Breakdown */}
            <div className="p-6 space-y-3">
              {[
                { stars: 5, count: ratingStats.fiveStars, label: '5 Star' },
                { stars: 4, count: ratingStats.fourStars, label: '4 Star' },
                { stars: 3, count: ratingStats.threeStars, label: '3 Star' },
                { stars: 2, count: ratingStats.twoStars, label: '2 Star' },
                { stars: 1, count: ratingStats.oneStars, label: '1 Star' },
              ].map(({ stars, count, label }) => {
                const percentage = ratingStats.totalCount > 0 ? (count / ratingStats.totalCount) * 100 : 0;
                return (
                  <div key={stars} className="flex items-center gap-3">
                    <span className="w-16 text-sm font-medium text-gray-700">{label}</span>
                    <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-8 text-sm font-bold text-gray-900">{count}</span>
                  </div>
                );
              })}
            </div>

            {/* Close Button */}
            <div className="px-6 pb-6">
              <button
                onClick={() => setShowRatingModal(false)}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-gray-700 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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

              <div>
                <label className="block text-sm font-bold text-white mb-2">🌍 Country</label>
                <select
                  value={joinFormData.country}
                  onChange={(e) => setJoinFormData({...joinFormData, country: e.target.value})}
                  className="w-full px-4 py-3 bg-white text-black border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-white shadow-sm"
                >
                  <option value="India">🇮🇳 India</option>
                  <option value="Nepal">🇳🇵 Nepal</option>
                  <option value="USA">🇺🇸 USA</option>
                  <option value="UK">🇬🇧 UK</option>
                  <option value="Canada">🇨🇦 Canada</option>
                  <option value="Australia">🇦🇺 Australia</option>
                  <option value="UAE">🇦🇪 UAE</option>
                  <option value="Singapore">🇸🇬 Singapore</option>
                  <option value="Germany">🇩🇪 Germany</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinFormData({ name: '', email: '', mobile: '', country: 'India' });
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

      {/* Workshop Check Modal - Shows when clicking on non-global communities */}
      {showWorkshopCheckModal && pendingCommunity && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-orange-400 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className={`bg-gradient-to-r ${pendingCommunity.design.color.gradient} p-6 text-white text-left`}>
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-4 rounded-2xl shadow-inner">
                  <pendingCommunity.design.icon size={32} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{pendingCommunity.name}</h2>
                  <p className="text-sm opacity-90">Exclusive Community Access</p>
                </div>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 space-y-5">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <h3 className="font-bold text-orange-800 mb-1">Workshop Completion Required</h3>
                    <p className="text-sm text-orange-700">
                      This community is for members who have completed the <strong>{pendingCommunity.name}</strong> workshop.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                  <span>❓</span> Have you completed this workshop?
                </h4>
                <p className="text-sm text-blue-700">
                  If yes, you can request to join this community. Our team will verify your workshop completion and approve your membership.
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                  <span>✨</span> Benefits of joining
                </h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Access to exclusive workshop recordings</li>
                  <li>• Connect with fellow participants</li>
                  <li>• Get updates and follow-up content</li>
                  <li>• Direct support from instructors</li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-4 bg-gray-50 flex gap-3">
              <button
                onClick={() => {
                  setShowWorkshopCheckModal(false);
                  setPendingCommunity(null);
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={proceedToRequestAccess}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg"
              >
                ✓ Yes, Request Access
              </button>
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
          <div className="bg-white border-2 border-emerald-500 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <MessageCircle size={24} />
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tighter leading-none mb-1">Comments</h3>
                  <p className="text-[10px] uppercase font-bold opacity-75 tracking-tighter">
                    {Array.isArray(activePostForComment.comments) ? activePostForComment.comments.length : 0} Comments
                  </p>
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
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Original Post Preview */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Original Post</p>
                <p className="text-sm text-slate-600 font-medium line-clamp-3 italic">"{activePostForComment.content}"</p>
              </div>
              
              {/* Existing Comments */}
              {Array.isArray(activePostForComment.comments) && activePostForComment.comments.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">All Comments</p>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {activePostForComment.comments.map((comment: any, index: number) => (
                      <div key={index} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {(comment.userId || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{comment.userName || comment.userId || 'Member'}</p>
                            <p className="text-[10px] text-slate-400">
                              {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString('en-IN', { 
                                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                              }) : 'Just now'}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-slate-700">{comment.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* No Comments Yet */}
              {(!Array.isArray(activePostForComment.comments) || activePostForComment.comments.length === 0) && (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm font-medium">No comments yet. Be the first to comment!</p>
                </div>
              )}
              
              {/* Add Comment Section */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Add Your Comment</label>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="w-full h-24 px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition-all font-medium text-sm resize-none"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowCommentModal(false);
                      setCommentText('');
                      setActivePostForComment(null);
                    }}
                    className="flex-1 py-3 font-bold text-xs uppercase tracking-wide text-slate-400 hover:text-slate-600 transition-colors border border-slate-200 rounded-xl"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleAddComment}
                    disabled={commentLoading || !commentText.trim()}
                    className="flex-1 py-3 px-4 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-wide shadow-lg shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-50 transition-all active:scale-95"
                  >
                    {commentLoading ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
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
