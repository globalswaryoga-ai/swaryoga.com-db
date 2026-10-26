'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Share2, Search, Plus, LogOut, Users, Globe, Loader, Home, AlertCircle, ExternalLink, Menu, X, ChevronDown, ChevronRight, Smartphone, Monitor, Send, HelpCircle, Phone, PhoneCall, Video, Calendar, Clock, Star, Sparkles } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { COMMUNITY_DESIGNS, CommunityDesign, COMMUNITY_GROUPS, getGroupedCommunities, PRIMARY_COMMUNITIES, COMMUNITY_TOPIC_CATEGORIES } from '@/lib/communityColorSystem';
import { SUPPORTED_LANGUAGES } from '@/lib/languageDetection';

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

  // Public experiences for non-members (max 5)
  const [publicExperiences, setPublicExperiences] = useState<Post[]>([]);

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

  // Community language filter (hindi, english, marathi, gujarati, etc.)
  const [communityLanguage, setCommunityLanguage] = useState<string>('hindi');
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const languageDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedLang = localStorage.getItem('swar_community_lang');
    if (savedLang) {
      setCommunityLanguage(savedLang);
    } else {
      const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone || '' : '';
      const isIndia = tz.includes('Calcutta') || tz.includes('Kolkata') || (typeof navigator !== 'undefined' && navigator.language?.includes('IN'));
      const defLang = isIndia ? 'hindi' : 'english';
      setCommunityLanguage(defLang);
      localStorage.setItem('swar_community_lang', defLang);
    }
  }, []);

  // Close custom language dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
        setLanguageDropdownOpen(false);
      }
    }
    if (languageDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [languageDropdownOpen]);

  // Language availability notice popup state
  const [languageNotice, setLanguageNotice] = useState<{
    show: boolean;
    languageName: string;
    flag: string;
  } | null>(null);

  // 1. Daily Swar Tracker & Streak State (Active only between 8:00 AM and 10:00 AM)
  const [activeSwar, setActiveSwar] = useState<'chandra' | 'surya' | 'sushumna' | null>(null);
  const [swarStreak, setSwarStreak] = useState<number>(3);
  const [swarCheckedInToday, setSwarCheckedInToday] = useState(false);
  const [isSwarWindowOpen, setIsSwarWindowOpen] = useState(false);

  // 7. Referral / Share Swar Yoga Modal State
  const [showReferralModal, setShowReferralModal] = useState(false);

  useEffect(() => {
    // Check if current time is between 8:00 AM and 10:00 AM (8 to 10)
    const checkTimeWindow = () => {
      const now = new Date();
      const currentHour = now.getHours();
      // 8 AM (8:00) to 10 AM (9:59:59)
      const isOpen = currentHour >= 8 && currentHour < 10;
      setIsSwarWindowOpen(isOpen);
    };

    checkTimeWindow();
    const interval = setInterval(checkTimeWindow, 60000);

    const savedSwar = localStorage.getItem('swar_daily_active');
    const savedDate = localStorage.getItem('swar_daily_checkin_date');
    const today = new Date().toISOString().split('T')[0];
    if (savedDate === today && savedSwar) {
      setActiveSwar(savedSwar as any);
      setSwarCheckedInToday(true);
    }
    const savedStreak = parseInt(localStorage.getItem('swar_streak_count') || '3', 10);
    setSwarStreak(savedStreak);

    return () => clearInterval(interval);
  }, []);

  const handleSwarCheckIn = (swar: 'chandra' | 'surya' | 'sushumna') => {
    if (!isSwarWindowOpen) {
      alert('⏰ Daily Swar Check-in is active only between 8:00 AM and 10:00 AM every morning! (दैनिक स्वर चेक-इन सुबह 8 से 10 बजे तक ही मान्य है)');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    setActiveSwar(swar);
    setSwarCheckedInToday(true);
    const newStreak = swarCheckedInToday ? swarStreak : swarStreak + 1;
    setSwarStreak(newStreak);
    localStorage.setItem('swar_daily_active', swar);
    localStorage.setItem('swar_daily_checkin_date', today);
    localStorage.setItem('swar_streak_count', String(newStreak));
  };

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

  // Two Settings: 'website' (rich desktop/tablet layout) vs 'android' (touch-friendly compact app view)
  const [appViewMode, setAppViewMode] = useState<'website' | 'android'>('website');

  // Query / Ask Question modal
  const [showAskModal, setShowAskModal] = useState(false);
  const [askContent, setAskContent] = useState('');
  const [askCategory, setAskCategory] = useState('health');
  const [askLoading, setAskLoading] = useState(false);

  // Request Call with Mohan ji modal
  const [showCallModal, setShowCallModal] = useState(false);
  const [callName, setCallName] = useState('');
  const [callPhone, setCallPhone] = useState('');
  const [callCategory, setCallCategory] = useState('Health');
  const [callDate, setCallDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [callTime, setCallTime] = useState('11:00 AM');
  const [callNote, setCallNote] = useState('');
  const [callLoading, setCallLoading] = useState(false);

  // Zoom 1:1 Video Meet modal
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [zoomName, setZoomName] = useState('');
  const [zoomPhone, setZoomPhone] = useState('');
  const [zoomTopic, setZoomTopic] = useState('Swar Yoga Personal Practice');
  const [zoomDate, setZoomDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [zoomTime, setZoomTime] = useState('11:00 AM');
  const [zoomNote, setZoomNote] = useState('');
  const [zoomLoading, setZoomLoading] = useState(false);

  // Share Experience modal (Symbol: sitting & cheering with both hands up 🙌)
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [expName, setExpName] = useState('');
  const [expPhone, setExpPhone] = useState('');
  const [expSection, setExpSection] = useState('health');
  const [expStars, setExpStars] = useState(5);
  const [expTitle, setExpTitle] = useState('');
  const [expStory, setExpStory] = useState('');
  const [expLoading, setExpLoading] = useState(false);

  // Community Group Chat Modal state
  const [showGroupChatModal, setShowGroupChatModal] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [groupChatLoading, setGroupChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [chatSenderName, setChatSenderName] = useState('');
  const [chatSenderMobile, setChatSenderMobile] = useState('');
  const [activeChatCommunityId, setActiveChatCommunityId] = useState('global');
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-detect device without requiring manual toggle:
    // If mobile screen (< 768px), Android/iOS mobile device, or SwarYogaApp webview, use mobile app view.
    // Otherwise, use full website view.
    const checkDevice = () => {
      if (typeof window === 'undefined') return;
      const isMobileAppParam = searchParams.get('app') === 'true' || searchParams.get('mode') === 'android';
      const isMobileScreen = window.innerWidth < 768;
      const isMobileUA = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|SwarYogaApp/i.test(navigator.userAgent);
      
      if (isMobileAppParam || isMobileScreen || isMobileUA) {
        setAppViewMode('android');
      } else {
        setAppViewMode('website');
      }
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, [searchParams]);

  // 5 Symbolic Categories (Requested by User with exact symbols)
  // 1) Health: 🧘 Meditation symbol
  // 2) Wealth: 💰 Wealth symbol
  // 3) Parenting: 👥 Two people
  // 4) Spiritual: 🪷 Lotus flower symbol
  // 5) Behavioral Change: 💛 Yellow heart
  const categories = [
    { id: 'all', label: '📋 All Posts', emoji: '📋', name: 'All' },
    ...COMMUNITY_TOPIC_CATEGORIES.map(c => ({
      id: c.id,
      label: `${c.emoji} ${c.name}`,
      emoji: c.emoji,
      name: c.name,
      badgeColor: c.badgeColor,
      activeColor: c.activeColor,
    })),
  ];

  useEffect(() => {
    checkUserAuth();
    fetchCommunityStats();
    fetchPublicExperiences();
  }, []);

  // Fetch public experiences (admin-marked, max 5) for non-members
  const fetchPublicExperiences = async () => {
    try {
      const res = await fetch('/api/community/posts?public=true&limit=5', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setPublicExperiences(Array.isArray(data.posts) ? data.posts : []);
      }
    } catch (err) {
      console.error('Error fetching public experiences:', err);
    }
  };

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

  // Handle community click - switch to that community so user can view its page and feed
  const handleCommunityClick = (community: any) => {
    setSelectedCommunity(community.id);
    setMobileSidebarOpen(false);
  };

  // Proceed to request access after workshop confirmation
  // Reuse the Join form (which has country selector) instead of the separate Request form
  const proceedToRequestAccess = () => {
    setShowWorkshopCheckModal(false);
    if (pendingCommunity) {
      setSelectedCommunity(pendingCommunity.id);
      setJoiningCommunity(pendingCommunity);
      setShowJoinModal(true);
    }
  };

  // Helper: show Workshop Check modal first, then Request Access form
  // For non-global communities, always show the workshop completion check first.
  const requestToJoin = (community: any) => {
    if (!community || community.id === 'global') return;
    setPendingCommunity(community);
    setShowWorkshopCheckModal(true);
  };

  // Helper to get image URL (supports Bunny CDN, YouTube thumbnails, data URLs, and direct URLs)
  const getSignedImageUrl = useCallback(async (imageUrl: string): Promise<string> => {
    if (!imageUrl) return '';

    // If it's already a proxied URL or data URL, return as-is
    if (imageUrl.startsWith('/api/s3/image') || imageUrl.startsWith('data:')) {
      return imageUrl;
    }

    // Check cache first
    if (signedUrls[imageUrl]) {
      return signedUrls[imageUrl];
    }

    // If it's a YouTube link, extract thumbnail
    const ytMatch = imageUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch) {
      const ytThumb = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
      setSignedUrls(prev => ({ ...prev, [imageUrl]: ytThumb }));
      return ytThumb;
    }

    // If it's already a full HTTP/HTTPS URL and not an amazonaws bucket URL, use directly
    if ((imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) && !imageUrl.includes('amazonaws.com')) {
      setSignedUrls(prev => ({ ...prev, [imageUrl]: imageUrl }));
      return imageUrl;
    }

    // Extract key from amazonaws URL or relative path
    let key = imageUrl;
    if (imageUrl.includes('amazonaws.com')) {
      try {
        const url = new URL(imageUrl);
        key = url.pathname.slice(1);
      } catch {
        // Use as-is
      }
    }

    // Use Bunny CDN directly for fast delivery
    const cdnUrl = `https://swaryogacrm.b-cdn.net/${key.replace(/^\/+/, '')}`;
    setSignedUrls(prev => ({ ...prev, [imageUrl]: cdnUrl }));
    return cdnUrl;
  }, [signedUrls]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setPostsError('');
    try {
      const params = new URLSearchParams();
      params.set('category', selectedCategory);
      if (selectedCommunity && selectedCommunity !== 'global') {
        params.set('communityId', selectedCommunity);
      }
      const response = await fetch('/api/community/posts?' + params.toString(), {
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
        const rawPosts = Array.isArray(data.posts) ? data.posts : [];
        // Ensure new post always upper side (descending sort order)
        const sorted = rawPosts.sort((a: Post, b: Post) => {
          const dateA = new Date(a.createdAt || (a as any).created_at || (a as any).rawDoc?.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || (b as any).created_at || (b as any).rawDoc?.createdAt || 0).getTime();
          return dateB - dateA;
        });
        setPosts(sorted);
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
  }, [selectedCategory, selectedCommunity, retryCount]);

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

  // Fetch community videos (Free & Member videos)
  const fetchVideos = useCallback(async () => {
    setVideosLoading(true);
    setVideosError('');
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const commId = selectedCommunity || 'global';
      const response = await fetch(`/api/community/${commId}/videos`, {
        headers,
      });
      
      if (response.ok) {
        const data = await response.json();
        setVideos(Array.isArray(data.videos) ? data.videos : []);
      } else {
        setVideos([]);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      setVideos([]);
    } finally {
      setVideosLoading(false);
    }
  }, [selectedCommunity]);

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
      alert('Please type your question or query');
      return;
    }

    if (!user) {
      alert('Please join the community first to post queries');
      return;
    }

    try {
      setChatLoading(true);
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId: selectedCommunity || 'global',
          userId: user.id || user.email || user.name || 'member',
          userName: user.name || 'Community Member',
          content: chatMessage.trim(),
          category: selectedCategory !== 'all' ? selectedCategory : 'health',
          isPublic: true,
        }),
      });

      if (res.ok) {
        setChatMessage('');
        await fetchPosts();
        alert('✅ Query posted to community successfully!');
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to post query');
      }
    } catch (error) {
      console.error('Error sending query:', error);
      alert('❌ Error sending message');
    } finally {
      setChatLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!askContent.trim()) {
      alert('Please enter your question or query');
      return;
    }

    if (!user) {
      alert('Please join the community first to ask questions');
      return;
    }

    try {
      setAskLoading(true);
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId: selectedCommunity || 'global',
          userId: user.id || user.email || user.name || 'member',
          userName: user.name || 'Community Member',
          content: askContent.trim(),
          category: askCategory || 'health',
          isPublic: true,
        }),
      });

      if (res.ok) {
        setAskContent('');
        setShowAskModal(false);
        await fetchPosts();
        alert('✅ Your question/query has been published!');
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('❌ Error creating post');
    } finally {
      setAskLoading(false);
    }
  };

  const handleRequestCall = async () => {
    if (!callName.trim() || !callPhone.trim()) {
      alert('Please provide your name and phone number');
      return;
    }

    try {
      setCallLoading(true);
      const res = await fetch('/api/community/call-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: callName.trim(),
          phone: callPhone.trim(),
          category: callCategory || 'Health',
          preferredTime: `${callDate || 'Date: Today'} at ${callTime || '10:00 AM'}`,
          note: callNote.trim(),
          communityId: selectedCommunity || 'global',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setCallNote('');
        setShowCallModal(false);
        alert('✅ Call request submitted! Mohan ji will connect with you soon.');
      } else {
        alert(data.error || 'Failed to submit call request');
      }
    } catch (err) {
      console.error('Call request error:', err);
      alert('❌ Error submitting call request. You can also call directly.');
    } finally {
      setCallLoading(false);
    }
  };

  const handleRequestZoom = async () => {
    if (!zoomName.trim() || !zoomPhone.trim()) {
      alert('Please provide your name and phone number for Zoom 1:1 meeting');
      return;
    }

    try {
      setZoomLoading(true);
      const res = await fetch('/api/community/call-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: zoomName.trim(),
          phone: zoomPhone.trim(),
          category: `Zoom 1:1 Meet: ${zoomTopic}`,
          preferredTime: `${zoomDate || 'Date: Today'} at ${zoomTime || '11:00 AM'}`,
          note: zoomNote.trim(),
          communityId: selectedCommunity || 'global',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setZoomNote('');
        setShowZoomModal(false);
        alert('✅ Zoom 1:1 video meeting request submitted! Mohan ji will share the Zoom meeting link with you on WhatsApp.');
      } else {
        alert(data.error || 'Failed to submit Zoom request');
      }
    } catch (err) {
      console.error('Zoom request error:', err);
      alert('❌ Error submitting Zoom request. You can also connect directly on WhatsApp.');
    } finally {
      setZoomLoading(false);
    }
  };

  const handleShareExperience = async () => {
    const finalName = expName.trim() || user?.name || '';
    if (!finalName) {
      alert('Please enter your name to share your experience');
      return;
    }
    if (!expStory.trim()) {
      alert('Please share your transformation story or benefits');
      return;
    }

    try {
      setExpLoading(true);
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId: 'global',
          userId: user?._id || user?.id || `member_${Date.now()}`,
          userName: finalName,
          category: expSection,
          content: `${expTitle.trim() ? `*${expTitle.trim()}*\n\n` : ''}${expStory.trim()}\n\n⭐ Experience Rating: ${expStars}.0 / 5.0`,
          isPublic: true,
          metadata: {
            isExperience: true,
            rating: expStars,
            stars: expStars,
            originalHeader: expTitle.trim() || undefined,
            userPhone: expPhone.trim() || undefined,
            targetCommunityIds: ['global', 'swar-yoga-l1', 'swar-yoga-l2', 'swar-yoga-l3', 'multi-workshop'],
          },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setShowExperienceModal(false);
        setExpTitle('');
        setExpStory('');
        alert('🎉 Your experience and benefits have been shared across all community groups!');
        fetchPosts();
      } else {
        alert(data.error || 'Failed to share experience');
      }
    } catch (err) {
      console.error('Share experience error:', err);
      alert('Error sharing experience. Please try again.');
    } finally {
      setExpLoading(false);
    }
  };

  // Group Chat helper methods
  const fetchChatMessages = useCallback(async (commId: string) => {
    try {
      const res = await fetch(`/api/community/chat?communityId=${commId}&limit=80`);
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setChatMessages(data.messages);
      }
    } catch (err) {
      console.error('Error fetching chat messages:', err);
    }
  }, []);

  useEffect(() => {
    if (showGroupChatModal) {
      const targetCommId = activeChatCommunityId || selectedCommunity || 'global';
      setGroupChatLoading(true);
      fetchChatMessages(targetCommId).finally(() => setGroupChatLoading(false));

      const interval = setInterval(() => {
        fetchChatMessages(targetCommId);
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [showGroupChatModal, activeChatCommunityId, selectedCommunity, fetchChatMessages]);

  useEffect(() => {
    if (showGroupChatModal && chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, showGroupChatModal]);

  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || chatSending) return;

    const senderName = chatSenderName.trim() || user?.name || 'Sadhak';
    if (!senderName) {
      alert('Please enter your name to send a message');
      return;
    }

    setChatSending(true);
    try {
      const targetCommId = activeChatCommunityId || selectedCommunity || 'global';
      const res = await fetch('/api/community/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId: targetCommId,
          message: chatInput.trim(),
          userName: senderName,
          userMobile: chatSenderMobile.trim() || user?.phone || user?.mobile || '',
          userId: user?.id || user?._id || '',
          userRole: user?.role === 'admin' ? 'admin' : 'member',
        }),
      });
      const data = await res.json();
      if (data.success && data.message) {
        setChatMessages((prev) => [...prev, data.message]);
        setChatInput('');
      } else {
        alert(data.error || 'Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setChatSending(false);
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
  const currentChatCommunity = communities.find((c) => c.id === activeChatCommunityId) || currentCommunity || communities[0];

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      {/* Strict CSS rule to completely hide floating WhatsApp widget and popup on community */}
      <style dangerouslySetInnerHTML={{ __html: `
        a[href*="wa.me"][class*="fixed"], 
        a[aria-label*="WhatsApp"], 
        a[title*="WhatsApp"][class*="fixed"], 
        .whatsapp-widget { 
          display: none !important; 
        }
      ` }} />

      {/* Top Navigation Bar & Symbolic Categories - 100% Fixed & Non-moveable */}
      <div data-app-header="true" className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-sm">
        <div className="container mx-auto px-2.5 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-1.5 sm:gap-3">
          {/* Left: ☰ Menu and 🏠 Home */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* ☰ Three-line Menu Button for the 5 Main Communities */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-sm active:scale-95 transition-all duration-200 flex items-center gap-1.5"
              aria-label="Open 5 Main Communities menu"
              title="Open Communities Menu"
            >
              <Menu size={18} />
              <span className="hidden sm:inline text-xs font-bold">Communities</span>
            </button>
            <Link href="/" className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 active:scale-95 flex items-center justify-center text-green-600" title="Home">
              <Home size={19} className="sm:w-6 sm:h-6" />
            </Link>
          </div>

          {/* CENTER: Red Video Button ("add- video symbol in red in center, as i will click then - as per my level- i can see my videos, (admin will be added by crm)") */}
          <button
            onClick={() => {
              // Switch to user's enrolled level if available, otherwise current community
              const levelComm = communities.find(c => c.id !== 'global' && userMemberships.includes(c.id));
              if (levelComm) {
                setSelectedCommunity(levelComm.id);
              }
              setViewMode('videos');
              setTimeout(() => {
                window.scrollTo({ top: 260, behavior: 'smooth' });
              }, 100);
            }}
            className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1 sm:py-1.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-700 hover:to-rose-700 text-white rounded-full shadow-md shadow-red-500/30 active:scale-95 transition-all text-xs font-bold cursor-pointer shrink-0 border border-red-300/40"
            title="Watch Videos (as per your level)"
          >
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path fill="#FFFFFF" fillRule="evenodd" clipRule="evenodd" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider">Videos</span>
          </button>

          {/* Right: Desktop Action Buttons + Swar Yoga & Logo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Group Chat Trigger (Desktop) */}
            <button
              onClick={() => {
                if (user?.name && !chatSenderName) setChatSenderName(user.name);
                setActiveChatCommunityId(selectedCommunity || 'global');
                setShowGroupChatModal(true);
              }}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl text-xs sm:text-sm font-bold border border-teal-200/80 active:scale-95 transition-all shrink-0"
              title="Open Community Group Chat"
            >
              <MessageCircle size={15} />
              <span>Group Chat</span>
            </button>
            {/* Ask Question / Query Trigger (Desktop only - mobile uses bottom bar central + Ask button) */}
            <button
              onClick={() => setShowAskModal(true)}
              className="hidden md:flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-bold shadow-md active:scale-95 transition-all shrink-0"
              title="Ask Question or Query"
            >
              <Plus size={15} />
              <span>Ask Query</span>
            </button>

            {/* Request Call Trigger (Desktop only - mobile uses bottom bar Call button) */}
            <button
              onClick={() => setShowCallModal(true)}
              className="hidden md:flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-sm font-bold shadow-md active:scale-95 transition-all shrink-0"
              title="Request a Call with Me"
            >
              <PhoneCall size={15} />
              <span>Request Call</span>
            </button>

            {/* Share Experience Trigger (Desktop) */}
            <button
              onClick={() => {
                if (user?.name && !expName) setExpName(user.name);
                setShowExperienceModal(true);
              }}
              className="hidden lg:flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-95 text-white rounded-xl text-sm font-bold shadow-md active:scale-95 transition-all shrink-0"
              title="Share Your Transformation Experience"
            >
              <span>Share Experience</span>
            </button>

            {/* Swar Yoga text + Logo on Right Side */}
            <Link href="/" className="flex items-center gap-1.5 sm:gap-2.5 hover:opacity-85 transition-opacity" title="Swar Yoga Home">
              <span className="text-base sm:text-2xl font-black tracking-tight text-gray-900">
                Swar Yoga
              </span>
              <picture className="shrink-0 flex items-center">
                <source srcSet="/images/logo-infinity.webp" type="image/webp" />
                <img
                  src="/images/logo-infinity.png"
                  alt="Swar Yoga Logo"
                  className="w-7 h-7 sm:w-9 sm:h-9 object-contain drop-shadow-sm rounded-full"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/logo.png';
                  }}
                />
              </picture>
            </Link>

            {user ? (
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-gray-200">
                <div className="text-right">
                  <p className="font-semibold text-gray-900 text-sm truncate max-w-[120px]">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate max-w-[120px]">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all duration-200 text-xs font-bold shadow-md active:scale-95"
                  title="Logout"
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Header Side: Symbolic Heading Categories (Health, Wealth, Parenting, Spiritual, Behavioral Change) - Non Moveable */}
        <div className="border-t border-gray-100 bg-gray-50/90 py-1.5 sm:py-2">
          <div className="container mx-auto px-2 sm:px-6">
            <div className="grid grid-cols-6 gap-1 sm:gap-2 max-w-3xl mx-auto">
              {categories.map((category) => {
                const isSelected = selectedCategory === category.id && viewMode === 'posts';
                const activeClass = (category as any).activeColor || 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md border-emerald-600';
                const inactiveClass = (category as any).badgeColor || 'bg-white text-gray-700 border border-gray-200 hover:border-emerald-400 hover:bg-emerald-50';
                const shortName = category.id === 'behavioral-change' 
                  ? 'Behavior' 
                  : category.id === 'all' 
                    ? 'All' 
                    : (category as any).name || category.label;
                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setViewMode('posts');
                    }}
                    className={`rounded-xl sm:rounded-2xl font-bold transition-all duration-150 active:scale-95 shadow-sm border 
                      flex flex-col items-center justify-center 
                      py-1 px-0.5 sm:py-2 sm:px-2 w-full gap-0.5 ${
                      isSelected ? activeClass : inactiveClass
                    }`}
                  >
                    <span className="text-lg sm:text-2xl leading-none">{(category as any).emoji}</span>
                    <span className="text-[9px] sm:text-xs font-bold tracking-tight leading-tight text-center truncate max-w-full">
                      {shortName}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Language Selector Bar Below Behavior Strip - Custom Scrollable Dropdown Menu */}
            <div className="mt-2 pt-1.5 border-t border-gray-200/60 max-w-3xl mx-auto flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                <Globe size={14} className="text-emerald-600 shrink-0" />
                <span className="text-[11px] sm:text-xs font-bold">Language (भाषा):</span>
              </div>
              
              {/* Custom Scrollable Dropdown Container */}
              <div className="relative flex-1 max-w-[260px] sm:max-w-xs" ref={languageDropdownRef}>
                {/* Trigger Button */}
                <button
                  type="button"
                  onClick={() => setLanguageDropdownOpen((prev) => !prev)}
                  className="w-full bg-white border border-emerald-300 hover:border-emerald-500 text-emerald-950 font-bold text-xs rounded-xl px-3 py-1.5 shadow-sm flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
                  title="Choose Language (27+ Languages with Scroller)"
                >
                  <span className="truncate flex items-center gap-1.5">
                    {SUPPORTED_LANGUAGES.find((l) => l.code === communityLanguage)?.flag || '🌐'}{' '}
                    {SUPPORTED_LANGUAGES.find((l) => l.code === communityLanguage)?.nativeName || 'हिन्दी'}{' '}
                    <span className="text-gray-400 font-normal">
                      ({SUPPORTED_LANGUAGES.find((l) => l.code === communityLanguage)?.name || 'Hindi'})
                    </span>
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-emerald-700 transition-transform duration-200 shrink-0 ${
                      languageDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Vertical Scrollable Menu */}
                {languageDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-full sm:w-64 max-h-60 overflow-y-auto bg-white rounded-xl shadow-2xl border border-emerald-200 z-[999] py-1 divide-y divide-gray-100/70 scrollbar-thin scrollbar-thumb-emerald-400 scrollbar-track-gray-100">
                    <div className="px-3 py-1 bg-emerald-50 text-[10px] font-bold text-emerald-800 uppercase tracking-wider sticky top-0 z-10 flex items-center justify-between border-b border-emerald-100">
                      <span>Select Language ({SUPPORTED_LANGUAGES.length})</span>
                      <span className="text-[9px] text-emerald-600 font-semibold">Working</span>
                    </div>
                    {SUPPORTED_LANGUAGES.map((lang) => {
                      const isActive = lang.code === communityLanguage;
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => {
                            setCommunityLanguage(lang.code);
                            localStorage.setItem('swar_community_lang', lang.code);
                            setLanguageDropdownOpen(false);

                            // Check if this language has posts; if not, show friendly popup
                            const hasDataForLanguage = posts.some(
                              (p: any) => (p.language || 'hindi').toLowerCase() === lang.code
                            );
                            if (!hasDataForLanguage && lang.code !== 'hindi') {
                              setLanguageNotice({
                                show: true,
                                languageName: `${lang.nativeName} (${lang.name})`,
                                flag: lang.flag,
                              });
                            }
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between transition-colors ${
                            isActive
                              ? 'bg-emerald-600 text-white font-bold'
                              : 'text-gray-800 hover:bg-emerald-50 hover:text-emerald-900'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-sm">{lang.flag}</span>
                            <span>{lang.nativeName}</span>
                            <span className={isActive ? 'text-emerald-100 text-[11px]' : 'text-gray-400 text-[11px]'}>
                              ({lang.name})
                            </span>
                          </span>
                          {isActive && <span className="text-white text-xs">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Small Popup Notice: "Yet this language is not available, soon it will be" */}
            {languageNotice?.show && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl border-2 border-emerald-300 max-w-sm w-full p-5 text-center relative animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 text-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                    {languageNotice.flag}
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">
                    {languageNotice.languageName}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mb-4 leading-relaxed font-medium">
                    Yet this language is not available, soon it will be!
                    <br />
                    <span className="text-[11px] text-gray-500 mt-1 block">
                      (यह भाषा अभी उपलब्ध नहीं है, जल्द ही उपलब्ध होगी।)
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setLanguageNotice(null)}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs sm:text-sm py-2 px-4 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    Got it (समझ गया)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Spacer so page content starts cleanly below the fixed header */}
      <div className="h-[145px] sm:h-[160px] shrink-0" aria-hidden="true" />

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white z-[60] transform transition-transform duration-300 ease-out lg:hidden shadow-2xl ${
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

            {/* ⭐ The 5 Main Communities (Requested) */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-2xl p-3 shadow-sm">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                  <span>⭐</span> Main Communities
                </span>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full">5 Primary</span>
              </div>
              <div className="space-y-1.5">
                {PRIMARY_COMMUNITIES.map((mainComm) => {
                  const isSelected = selectedCommunity === mainComm.id;
                  const community = communities.find(c => c.id === mainComm.id) || (mainComm as any);
                  const isMember = userMemberships.includes(mainComm.id) || mainComm.id === 'global';
                  return (
                    <button
                      key={mainComm.id}
                      onClick={() => {
                        handleCommunityClick(community);
                        setMobileSidebarOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 flex items-center justify-between active:scale-[0.98] ${
                        isSelected
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold shadow-md shadow-emerald-700/20'
                          : 'bg-white text-gray-800 border border-emerald-100 hover:border-emerald-300 hover:bg-emerald-100/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          <mainComm.icon size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{mainComm.name}</p>
                          <p className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                            {communityStats[mainComm.id] || mainComm.members || 0} members
                          </p>
                        </div>
                      </div>
                      {!isMember && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold shrink-0">🔒</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Other Community Groups - Mobile */}
            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 px-1">All Groups</p>
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
              <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 text-center">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Desktop Sidebar - Hidden on mobile */}
          <div className="hidden lg:block lg:col-span-1">
            {/* User Profile Card */}
            {user ? (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4 sm:p-6 mb-8 shadow-sm hover:shadow-md transition-all duration-300">
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
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-300 rounded-2xl p-4 sm:p-6 mb-8 shadow-sm hover:shadow-md transition-all duration-300">
                <p className="text-blue-900 text-sm font-bold mb-3">👋 Join the Community</p>
                <p className="text-blue-800 text-xs leading-relaxed">Connect with fellow yoga practitioners and share your journey</p>
              </div>
            )}

            {/* Communities Section - Desktop Grouped */}
            <div className="bg-white border border-green-200 rounded-2xl p-4 sm:p-6 mb-8 shadow-sm hover:shadow-md transition-all duration-300">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Users size={20} className="text-green-600" />
                Communities
              </h3>

              {/* ⭐ The 5 Main Communities (Requested) */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-2xl p-3 mb-4 shadow-sm">
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <span>⭐</span> Main Communities
                  </span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full">5 Primary</span>
                </div>
                <div className="space-y-1.5">
                  {PRIMARY_COMMUNITIES.map((mainComm) => {
                    const isSelected = selectedCommunity === mainComm.id;
                    const community = communities.find(c => c.id === mainComm.id) || (mainComm as any);
                    const isMember = userMemberships.includes(mainComm.id) || mainComm.id === 'global';
                    return (
                      <button
                        key={mainComm.id}
                        onClick={() => handleCommunityClick(community)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 flex items-center justify-between active:scale-[0.98] ${
                          isSelected
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold shadow-md shadow-emerald-700/20'
                            : 'bg-white text-gray-800 border border-emerald-100 hover:border-emerald-300 hover:bg-emerald-100/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            <mainComm.icon size={15} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{mainComm.name}</p>
                            <p className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                              {communityStats[mainComm.id] || mainComm.members || 0} members
                            </p>
                          </div>
                        </div>
                        {!isMember && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold shrink-0">🔒</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 px-1">Other Groups</p>
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
                                    onClick={() => requestToJoin(community)}
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
            {/* Workshop Name & Community Header (Directly Below Categories Header) */}
            <div className={`bg-gradient-to-br ${currentCommunity?.design.color.gradient} rounded-2xl p-4 sm:p-8 mb-3 sm:mb-8 text-white shadow-md sm:shadow-xl transition-all duration-300 relative overflow-hidden`}>
              {/* Dark overlay for better text contrast */}
              <div className="absolute inset-0 bg-black/20 rounded-2xl"></div>

              {/* Background accent */}
              <div className="absolute top-0 right-0 w-24 sm:w-96 h-24 sm:h-96 bg-white/10 rounded-full -mr-12 sm:-mr-48 -mt-12 sm:-mt-48 blur-2xl sm:blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-20 sm:w-72 h-20 sm:h-72 bg-white/5 rounded-full -ml-10 sm:-ml-36 -mb-10 sm:-mb-36 blur-2xl sm:blur-3xl"></div>

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                <div>
                  <div className="text-xl sm:text-5xl mb-1.5 sm:mb-3 flex items-center drop-shadow-lg">
                    {currentCommunity?.design.icon && <currentCommunity.design.icon size={26} className="sm:w-14 sm:h-14 text-white drop-shadow-md" />}
                  </div>
                  <h1 className="text-lg sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-1.5 drop-shadow-md text-white">{currentCommunity?.name}</h1>
                  <p className="text-xs sm:text-base opacity-95 drop-shadow text-white/90 leading-snug sm:leading-relaxed max-w-2xl">{currentCommunity?.description}</p>
                  <div className="mt-2.5 sm:mt-3 flex flex-wrap items-center gap-1.5 sm:gap-4 text-[11px] sm:text-xs font-semibold drop-shadow">
                    <span className="text-white">👥 {currentCommunity?.members} members</span>
                    {currentCommunity?.isPublic && <span className="bg-white/30 px-2 sm:px-2.5 py-0.5 rounded-full text-white backdrop-blur-sm">🌐 Public</span>}

                    {/* Star Rating Display */}
                    {ratingStats && ratingStats.totalCount > 0 && (
                      <button
                        onClick={() => setShowRatingModal(true)}
                        className="bg-white/30 px-2 sm:px-2.5 py-0.5 rounded-full flex items-center gap-1 hover:bg-white/40 transition-all cursor-pointer text-white backdrop-blur-sm"
                      >
                        <span className="text-yellow-300">⭐</span>
                        <span>{ratingStats.avgRating?.toFixed(1)}</span>
                        <span className="opacity-90">({ratingStats.totalCount})</span>
                      </button>
                    )}

                    {/* Show membership status */}
                    {currentCommunity && userMemberships.includes(currentCommunity.id) && (
                      <span className="bg-green-500/50 px-2 sm:px-2.5 py-0.5 rounded-full flex items-center gap-1 text-white backdrop-blur-sm">
                        ✓ Member
                      </span>
                    )}
                    {currentCommunity && !userMemberships.includes(currentCommunity.id) && currentCommunity.id !== 'global' && (
                      <span className="bg-orange-500/50 px-2 sm:px-2.5 py-0.5 rounded-full flex items-center gap-1 text-white backdrop-blur-sm">
                        🔒 Locked
                      </span>
                    )}
                  </div>
                </div>

                {/* Show join/request buttons based on membership */}
                {currentCommunity && !userMemberships.includes(currentCommunity.id) && currentCommunity.id !== 'global' && (
                  <div className="flex gap-2 sm:gap-3 flex-row sm:flex-col pt-2 sm:pt-0">
                    <button
                      onClick={() => requestToJoin(currentCommunity)}
                      className="flex-1 sm:flex-none px-3.5 sm:px-6 py-2 sm:py-3 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-all active:scale-95 shadow-md text-xs sm:text-base"
                    >
                      📋 Request to Join
                    </button>
                  </div>
                )}
                {/* Show action buttons for members */}
                {currentCommunity && (userMemberships.includes(currentCommunity.id) || currentCommunity.id === 'global') && (
                  <div className="flex gap-2 sm:gap-3 flex-row sm:flex-col pt-2 sm:pt-0">
                    <button
                      onClick={() => {
                        if (user?.name && !expName) setExpName(user.name);
                        setShowExperienceModal(true);
                      }}
                      className="flex-1 sm:flex-none px-3.5 sm:px-6 py-2 sm:py-3 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-all active:scale-95 shadow-md text-xs sm:text-base flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <img
                        src="/images/experience-symbol.png"
                        alt="Experience"
                        className="w-4 h-4 sm:w-5 sm:h-5 object-contain shrink-0"
                      />
                      <span>Share Experience</span>
                    </button>
                    {currentCommunity.id === 'global' && !user && (
                      <button
                        onClick={() => {
                          setJoiningCommunity(currentCommunity);
                          setShowJoinModal(true);
                        }}
                        className="flex-1 sm:flex-none px-3.5 sm:px-6 py-2 sm:py-3 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-all active:scale-95 shadow-md text-xs sm:text-base"
                      >
                        + Join Community
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 🌅 1. Daily Swar Tracker & Morning Practice Streak + 🧘 4. Daily Swar Niyama Guidance */}
            <div className="mb-4 bg-gradient-to-r from-amber-50 via-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-3 sm:p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-emerald-100/80">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🕉️</span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-extrabold text-emerald-950 flex items-center gap-1.5 flex-wrap">
                      <span>Daily Swar Check-in</span>
                      <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                        🔥 {swarStreak} Days Sadhana Streak
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        isSwarWindowOpen 
                          ? 'bg-green-100 text-green-800 border-green-300 animate-pulse' 
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        ⏰ 8:00 AM – 10:00 AM {isSwarWindowOpen ? '(Active Now)' : '(Closed Now)'}
                      </span>
                    </h3>
                    <p className="text-[11px] text-emerald-800/80 font-medium">
                      {isSwarWindowOpen
                        ? 'Which nostril is active right now? (अभी कौन सा स्वर चल रहा है?)'
                        : 'Daily morning check-in opens only between 8:00 AM to 10:00 AM (सुबह 8 से 10 बजे खुलेगा)'}
                    </p>
                  </div>
                </div>

                {/* 1-Tap Swar Checkin Buttons */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleSwarCheckIn('chandra')}
                    disabled={!isSwarWindowOpen}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm ${
                      !isSwarWindowOpen
                        ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                        : activeSwar === 'chandra'
                        ? 'bg-blue-600 text-white ring-2 ring-blue-300 cursor-pointer active:scale-95'
                        : 'bg-white hover:bg-blue-50 text-blue-900 border border-blue-200 cursor-pointer active:scale-95'
                    }`}
                    title={isSwarWindowOpen ? "Chandra Swar (Left Nostril)" : "Opens 8:00 AM to 10:00 AM"}
                  >
                    <span>🌙</span>
                    <span>Ida (Left)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwarCheckIn('surya')}
                    disabled={!isSwarWindowOpen}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm ${
                      !isSwarWindowOpen
                        ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                        : activeSwar === 'surya'
                        ? 'bg-amber-600 text-white ring-2 ring-amber-300 cursor-pointer active:scale-95'
                        : 'bg-white hover:bg-amber-50 text-amber-900 border border-amber-200 cursor-pointer active:scale-95'
                    }`}
                    title={isSwarWindowOpen ? "Surya Swar (Right Nostril)" : "Opens 8:00 AM to 10:00 AM"}
                  >
                    <span>☀️</span>
                    <span>Pingala (Right)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwarCheckIn('sushumna')}
                    disabled={!isSwarWindowOpen}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm ${
                      !isSwarWindowOpen
                        ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                        : activeSwar === 'sushumna'
                        ? 'bg-purple-600 text-white ring-2 ring-purple-300 cursor-pointer active:scale-95'
                        : 'bg-white hover:bg-purple-50 text-purple-900 border border-purple-200 cursor-pointer active:scale-95'
                    }`}
                    title={isSwarWindowOpen ? "Sushumna (Balanced)" : "Opens 8:00 AM to 10:00 AM"}
                  >
                    <span>🧘</span>
                    <span>Both</span>
                  </button>
                </div>
              </div>

              {/* 🧘 4. Daily Swar Niyama & Tithi Guidance Snippet */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-emerald-900 gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-emerald-950">✨ Today's Swar Niyama:</span>
                  <span className="text-emerald-800">
                    {activeSwar === 'surya'
                      ? 'Active Surya Swar: Best for digestion, exercise, bold actions.'
                      : activeSwar === 'chandra'
                      ? 'Calming Chandra Swar: Best for water intake, peaceful study, planning.'
                      : 'Sushumna Flow: Supreme time for deep meditation & chanting.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReferralModal(true)}
                  className="self-end sm:self-auto text-[11px] font-bold text-teal-800 hover:text-teal-950 underline flex items-center gap-1 cursor-pointer"
                >
                  <span>🎁 Invite Family & Friends</span>
                </button>
              </div>
            </div>

            {/* 3. Below Workshop Name: Search posts */}
            <div className="mb-5 sm:mb-6 space-y-3">
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
            </div>

            {/* Videos Section */}
            {viewMode === 'videos' ? (
              <div className="space-y-5">
                {/* Free Videos Header Banner with Join Community Button */}
                <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 rounded-2xl p-4 sm:p-5 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                        <path fill="#FFFFFF" fillRule="evenodd" clipRule="evenodd" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-black text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
                        <span>Free Community Videos</span>
                        <span className="bg-white/25 text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full">Free Access</span>
                      </h3>
                      <p className="text-[11px] sm:text-xs text-white/90">
                        Watch foundational breath awareness and yogic practices. Join to unlock all level recordings!
                      </p>
                    </div>
                  </div>
                  {/* Join Community Button */}
                  <button
                    onClick={() => {
                      const community = currentCommunity || communities[0];
                      if (community.isPublic) {
                        setJoiningCommunity(community);
                        setShowJoinModal(true);
                      } else {
                        requestToJoin(community);
                      }
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-white text-red-700 hover:bg-gray-100 rounded-xl font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>+ Join Community</span>
                  </button>
                </div>

                {videosLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="text-center">
                      <Loader className="w-10 h-10 animate-spin text-red-600 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium text-xs sm:text-sm">Loading community videos...</p>
                    </div>
                  </div>
                ) : videos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                    {videos.map((video) => (
                      <div key={video._id || video.id} className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col">
                        {/* Video Player */}
                        <div className="relative aspect-video bg-gray-900">
                          {video.embedUrl ? (
                            <iframe
                              src={video.embedUrl}
                              className="w-full h-full"
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                              referrerPolicy="strict-origin-when-cross-origin"
                              title={video.title}
                            />
                          ) : video.url ? (
                            <video 
                              controls 
                              className="w-full h-full"
                              poster={video.thumbnailUrl}
                              controlsList="nodownload"
                            >
                              <source src={video.url} type="video/mp4" />
                              Your browser does not support the video tag.
                            </video>
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                              <span>Video player loading...</span>
                            </div>
                          )}
                          {/* Free Video Badge */}
                          <div className="absolute top-2.5 left-2.5 bg-emerald-600/90 text-white px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                            ✓ Free Video
                          </div>
                        </div>

                        {/* Video Info & Join Button */}
                        <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="text-sm sm:text-base font-bold text-gray-900 leading-snug mb-1 line-clamp-2">{video.title}</h4>
                            {video.description && (
                              <p className="text-gray-600 text-xs line-clamp-2 leading-relaxed mb-2">{video.description}</p>
                            )}
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-2">
                            <span className="text-[10px] text-gray-500">📅 {new Date(video.createdAt).toLocaleDateString()}</span>
                            <button
                              onClick={() => {
                                const community = currentCommunity || communities[0];
                                if (community.isPublic) {
                                  setJoiningCommunity(community);
                                  setShowJoinModal(true);
                                } else {
                                  requestToJoin(community);
                                }
                              }}
                              className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>+ Join Community</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-2xl p-6 sm:p-8 text-center space-y-3">
                    <div className="text-4xl">🎥</div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">Videos</h3>
                    <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto">
                      Community videos will appear here as added by admin. Join to receive notifications!
                    </p>
                    <button
                      onClick={() => {
                        const community = currentCommunity || communities[0];
                        if (community.isPublic) {
                          setJoiningCommunity(community);
                          setShowJoinModal(true);
                        } else {
                          requestToJoin(community);
                        }
                      }}
                      className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-md transition-all inline-block"
                    >
                      + Join Community
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Posts Section */
              <>
            {/* Members-only lock for non-global non-member communities */}
            {selectedCommunity !== 'global' && !userMemberships.includes(selectedCommunity) ? (
              <div className="space-y-6">
                {/* Public Experiences - admin-curated, max 5 */}
                {publicExperiences.length > 0 && (
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      ⭐ Member Experiences
                    </h3>
                    <div className="space-y-4">
                      {publicExperiences.map((post) => (
                        <Link key={post._id} href={`/community/post/${post._id}`}>
                          <div className="bg-white border-2 border-emerald-100 rounded-2xl hover:border-emerald-300 hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer group shadow-sm p-5 sm:p-6 mb-4">
                            {/* Header */}
                            <div className="mb-3">
                              {(post as any).metadata?.originalHeader ? (
                                <h4 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">
                                  {(post as any).metadata.originalHeader}
                                </h4>
                              ) : post.title && (
                                <h4 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">
                                  {post.title}
                                </h4>
                              )}
                              <p className="text-xs text-gray-400 mt-1">{new Date(post.createdAt).toLocaleDateString()}</p>
                            </div>
                            {/* Body preview */}
                            <p className="text-gray-600 text-sm line-clamp-3 mb-3">
                              {post.content?.substring(0, 200)}{(post.content?.length || 0) > 200 ? '...' : ''}
                            </p>
                            {/* Read-only stats */}
                            <div className="flex gap-4 text-xs text-gray-400 border-t border-gray-100 pt-3">
                              <span>🤍 {Array.isArray(post.likes) ? post.likes.length : 0}</span>
                              <span>💬 {Array.isArray(post.comments) ? post.comments.length : 0}</span>
                              <span className="ml-auto text-emerald-600 font-medium group-hover:underline">Read more →</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Join prompt */}
                <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-2 border-green-200 rounded-2xl p-8 sm:p-10 text-center shadow-sm">
                  <div className="text-4xl sm:text-5xl mb-3">🧘</div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">Join {currentCommunity?.name}</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto text-sm sm:text-base">
                    Access all posts, videos, and participate in community discussions.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => {
                        if (currentCommunity?.isPublic) {
                          setJoiningCommunity(currentCommunity);
                          setShowJoinModal(true);
                        } else {
                          requestToJoin(currentCommunity);
                        }
                      }}
                      className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 shadow-lg text-sm sm:text-base"
                    >
                      {currentCommunity?.isPublic ? '✨ Join Now' : '📋 Request to Join'}
                    </button>
                    <button
                      onClick={() => router.push('/community/experiences')}
                      className="px-8 py-3 bg-white text-emerald-700 border-2 border-emerald-300 rounded-xl font-bold hover:bg-emerald-50 transition-all text-sm sm:text-base"
                    >
                      ⭐ View All Experiences
                    </button>
                  </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPosts.map((post) => (
                  <Link key={post._id} href={`/community/post/${post._id}`} className="block">
                    <div className="bg-white border border-emerald-100/90 hover:border-emerald-300 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 overflow-hidden cursor-pointer group ring-1 ring-black/5">
                      
                      {/* Image - Full width at top */}
                      {post.images && post.images.length > 0 && (() => {
                        const imageUrl = signedUrls[post.images[0]] || (post.images[0].includes('X-Amz-Signature') ? post.images[0] : null);
                        return imageUrl ? (
                          <div className="relative w-full aspect-[16/9] bg-gray-100 overflow-hidden">
                            <img 
                              src={imageUrl} 
                              alt="" 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              onError={(e) => { 
                                const img = e.target as HTMLImageElement;
                                const container = img.parentElement;
                                if (container) {
                                  container.style.display = 'none';
                                }
                              }}
                            />
                            {post.images.length > 1 && (
                              <div className="absolute bottom-2 right-2 bg-black/60 text-white px-2 py-0.5 rounded text-xs">
                                +{post.images.length - 1}
                              </div>
                            )}
                          </div>
                        ) : null;
                      })()}

                      {/* Content */}
                      <div className="p-3.5 sm:p-4">
                        {/* Date & Experience Stars Row */}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-[10px] text-gray-400">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </p>
                          {(((post as any).rawDoc?.metadata?.rating || (post as any).metadata?.rating) || (post as any).rawDoc?.metadata?.isExperience) && (
                            <div className="flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200/60">
                              <span className="text-amber-500 text-[10px]">★</span>
                              <span className="text-[10px] font-bold text-amber-700">
                                {Number((post as any).rawDoc?.metadata?.rating || (post as any).metadata?.rating || 5).toFixed(1)}
                              </span>
                              <img
                                src="/images/experience-symbol.png"
                                alt="Experience"
                                className="w-3.5 h-3.5 object-contain ml-0.5 shrink-0"
                              />
                              <span className="text-[9px] font-bold text-purple-700">Benefit</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Title */}
                        {((post as any).metadata?.originalHeader || post.title) && (
                          <h3 className="text-sm font-semibold text-gray-900 leading-snug mb-1 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                            {(post as any).metadata?.originalHeader || post.title}
                          </h3>
                        )}

                        {/* Text Preview */}
                        <div 
                          className="text-gray-500 text-xs leading-relaxed line-clamp-2 mb-2"
                          dangerouslySetInnerHTML={{ __html: formatWhatsAppText(getPostBodyContent(post)) }}
                        />

                        {/* Author & Engagement Row with ✨ Verified Answer Badge */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full text-[9px] font-extrabold flex items-center gap-1 shadow-xs">
                              <span>✨</span>
                              <span>Verified Guidance</span>
                            </span>
                            <span className="text-emerald-700 font-bold text-[10px]">By Mohan Sir</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            {/* Like */}
                            {(() => {
                              const likeCount = Array.isArray(post.likes) ? post.likes.length : 0;
                              const isLiked = Array.isArray(post.likes) && user && post.likes.includes(user._id);
                              return (
                                <span className={`flex items-center gap-1 ${isLiked ? 'text-red-500' : ''}`}>
                                  {isLiked ? '❤️' : '🤍'} {likeCount}
                                </span>
                              );
                            })()}
                            {/* Comment */}
                            {(() => {
                              const commentCount = Array.isArray(post.comments) ? post.comments.length : (typeof post.comments === 'number' ? post.comments : 0);
                              return (
                                <span className="flex items-center gap-1">
                                  💬 {commentCount}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
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
            <div className="bg-gradient-to-r from-amber-500 to-yellow-500 p-4 sm:p-6 text-white text-center">
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-3 sm:p-4">
          <div className="bg-gradient-to-br from-green-900 to-emerald-900 border border-green-500/40 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2.5 rounded-xl shadow-inner text-2xl">
                  ✨
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight">Join {joiningCommunity?.name}</h2>
                  <p className="text-xs font-medium opacity-90">Connect with the community</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinFormData({ name: '', email: '', mobile: '', country: 'India' });
                }}
                className="p-1.5 hover:bg-white/20 rounded-full text-white transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-white">
              <div>
                <label className="block text-xs font-bold text-white uppercase tracking-wider mb-1.5">👤 Full Name</label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={joinFormData.name}
                  onChange={(e) => setJoinFormData({...joinFormData, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white text-black border border-green-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-white placeholder-gray-500 text-sm shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white uppercase tracking-wider mb-1.5">📧 Email Address</label>
                <input
                  type="email"
                  placeholder="your.email@example.com"
                  value={joinFormData.email}
                  onChange={(e) => setJoinFormData({...joinFormData, email: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white text-black border border-green-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-white placeholder-gray-500 text-sm shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white uppercase tracking-wider mb-1.5">📱 WhatsApp Number</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={joinFormData.mobile}
                  onChange={(e) => setJoinFormData({...joinFormData, mobile: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white text-black border border-green-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-white placeholder-gray-500 text-sm shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white uppercase tracking-wider mb-1.5">🌍 Country</label>
                <select
                  value={joinFormData.country}
                  onChange={(e) => setJoinFormData({...joinFormData, country: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white text-black border border-green-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-white text-sm shadow-sm"
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
            </div>

            {/* Modal Footer - Fixed at bottom */}
            <div className="p-3.5 sm:p-4 bg-emerald-950/80 border-t border-emerald-800/50 flex gap-2.5 shrink-0">
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinFormData({ name: '', email: '', mobile: '', country: 'India' });
                }}
                className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs sm:text-sm font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinCommunity}
                disabled={joiningLoading}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md active:scale-95"
              >
                {joiningLoading ? (
                  <>
                    <Loader size={15} className="animate-spin" />
                    Joining...
                  </>
                ) : (
                  '✨ Join Now'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workshop Check Modal - Shows when requesting access to non-global communities */}
      {showWorkshopCheckModal && pendingCommunity && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border-2 border-orange-400 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className={`bg-gradient-to-r ${pendingCommunity.design?.color?.gradient || 'from-orange-500 to-amber-600'} p-4 sm:p-5 text-white flex items-center justify-between shrink-0`}>
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2.5 rounded-xl shadow-inner">
                  {pendingCommunity.design?.icon && <pendingCommunity.design.icon size={26} className="text-white" />}
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold">{pendingCommunity.name}</h2>
                  <p className="text-xs opacity-90">Exclusive Community Access</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowWorkshopCheckModal(false);
                  setPendingCommunity(null);
                }}
                className="p-1.5 hover:bg-white/20 rounded-full text-white transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Body - Scrollable */}
            <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3.5">
                <div className="flex items-start gap-3">
                  <span className="text-xl">🎯</span>
                  <div>
                    <h3 className="font-bold text-orange-900 text-sm mb-0.5">Workshop Completion Required</h3>
                    <p className="text-xs text-orange-700 leading-relaxed">
                      This community is for members who have completed the <strong>{pendingCommunity.name}</strong> workshop.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5">
                <h4 className="font-bold text-blue-900 text-xs mb-1 flex items-center gap-1.5">
                  <span>❓</span> Have you completed this workshop?
                </h4>
                <p className="text-xs text-blue-700 leading-relaxed">
                  If yes, you can request to join this community. Our team will verify your workshop completion and approve your membership.
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-3.5">
                <h4 className="font-bold text-green-900 text-xs mb-1 flex items-center gap-1.5">
                  <span>✨</span> Benefits of joining
                </h4>
                <ul className="text-xs text-green-700 space-y-1">
                  <li>• Access to exclusive workshop recordings</li>
                  <li>• Connect with fellow participants</li>
                  <li>• Get updates and follow-up content</li>
                  <li>• Direct support from instructors</li>
                </ul>
              </div>
            </div>

            {/* Modal Footer - Fixed at bottom */}
            <div className="border-t border-gray-200 p-3.5 bg-gray-50 flex gap-2.5 shrink-0">
              <button
                onClick={() => {
                  setShowWorkshopCheckModal(false);
                  setPendingCommunity(null);
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-xs sm:text-sm font-bold hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={proceedToRequestAccess}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-green-700 transition-all shadow-md active:scale-95"
              >
                ✓ Yes, Request Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Access Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border-2 border-emerald-500 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-600 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2.5 rounded-xl shadow-inner text-2xl">
                  📋
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight">Request Access</h2>
                  <p className="text-xs font-medium opacity-90">{requestingCommunity?.name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  setRequestFormData({ name: '', email: '', mobile: '', workshopsCompleted: false, message: '' });
                }}
                className="p-1.5 hover:bg-white/20 rounded-full text-white transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {/* Info Box */}
              <div className="bg-orange-50 border border-orange-300 rounded-xl p-3">
                <p className="text-orange-800 text-xs">
                  ℹ️ This is a private community. Your request will be reviewed by our admin team.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">👤 Full Name</label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={requestFormData.name}
                  onChange={(e) => setRequestFormData({...requestFormData, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white text-black border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">📧 Email Address</label>
                <input
                  type="email"
                  placeholder="your.email@example.com"
                  value={requestFormData.email}
                  onChange={(e) => setRequestFormData({...requestFormData, email: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white text-black border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">📱 WhatsApp Number</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={requestFormData.mobile}
                  onChange={(e) => setRequestFormData({...requestFormData, mobile: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white text-black border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400 text-sm"
                />
              </div>

              <div className="flex items-center gap-2.5 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <input
                  type="checkbox"
                  id="workshops"
                  checked={requestFormData.workshopsCompleted}
                  onChange={(e) => setRequestFormData({...requestFormData, workshopsCompleted: e.target.checked})}
                  className="w-4 h-4 cursor-pointer accent-emerald-600 rounded"
                />
                <label htmlFor="workshops" className="text-xs font-semibold text-emerald-900 cursor-pointer flex-1">
                  ✅ I have completed the required workshops
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">💬 Message (Optional)</label>
                <textarea
                  placeholder="Tell us about your yoga journey..."
                  value={requestFormData.message}
                  onChange={(e) => setRequestFormData({...requestFormData, message: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white text-black border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none placeholder-gray-400 text-sm"
                  rows={3}
                />
              </div>
            </div>

            {/* Modal Footer - Fixed at bottom */}
            <div className="p-3.5 sm:p-4 bg-gray-50 border-t border-gray-200 flex gap-2.5 shrink-0">
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  setRequestFormData({ name: '', email: '', mobile: '', workshopsCompleted: false, message: '' });
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-xs sm:text-sm font-bold hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestAccess}
                disabled={requestLoading}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs sm:text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md active:scale-95"
              >
                {requestLoading ? (
                  <>
                    <Loader size={15} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  '📤 Submit Request'
                )}
              </button>
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

      {/* Ask Question / Query Modal */}
      {showAskModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white border-2 border-emerald-500 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <HelpCircle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Ask Question / Post Query</h3>
                  <p className="text-xs text-white/80">Choose a category and post to the community</p>
                </div>
              </div>
              <button
                onClick={() => setShowAskModal(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                title="Close"
              >
                <Plus className="rotate-45" size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Select Symbolic Category:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {COMMUNITY_TOPIC_CATEGORIES.map((cat) => {
                    const isSelected = askCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setAskCategory(cat.id)}
                        className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/30 font-bold text-emerald-950'
                            : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <span className="text-xl">{cat.emoji}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{cat.name}</p>
                          <p className="text-[10px] text-gray-500">{cat.symbolDescription}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Your Question / Query:
                </label>
                <textarea
                  rows={4}
                  value={askContent}
                  onChange={(e) => setAskContent(e.target.value)}
                  placeholder="Type your question or query here for community members & mentors..."
                  className="w-full p-4 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAskModal(false)}
                  className="flex-1 py-3 px-4 border border-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreatePost}
                  disabled={askLoading || !askContent.trim()}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {askLoading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Posting...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Publish Query</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zoom 1:1 Video Meet Modal */}
      {showZoomModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white border-2 border-blue-500 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 sm:p-6 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-2xl">
                  <Video size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Zoom 1:1 Video Meet</h3>
                  <p className="text-xs text-blue-100">Live 1-on-1 video meeting & consultation with Mohan ji</p>
                </div>
              </div>
              <button
                onClick={() => setShowZoomModal(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                title="Close"
              >
                <Plus className="rotate-45" size={24} />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
              {/* Direct Instant Zoom Room / WhatsApp Join */}
              <div className="bg-blue-50/90 border border-blue-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-blue-900 text-sm">Join Zoom Room Directly</p>
                    <p className="text-xs text-blue-700">Enter the open 1:1 room or get the direct invite link</p>
                  </div>
                  <span className="text-2xl">🎥</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <a
                    href="https://us06web.zoom.us/j/85155446286"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs text-center flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                  >
                    <Video size={14} />
                    <span>Join Zoom Room</span>
                  </a>
                  <a
                    href="https://wa.me/919309986820?text=Namaste%20Mohan%20ji,%20I%20want%20to%20join%20the%201:1%20Zoom%20Video%20Meet.%20Please%20share%20the%20link."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs text-center flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                  >
                    <span>💬 Get Link on WhatsApp</span>
                  </a>
                </div>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink mx-3 text-gray-400 text-xs font-bold uppercase tracking-wider">or schedule a 1:1 video slot</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Your Full Name: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={zoomName}
                  onChange={(e) => setZoomName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  WhatsApp Number: <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={zoomPhone}
                  onChange={(e) => setZoomPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Topic of Video Discussion:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'Health Diagnosis', emoji: '🧘', label: 'Health' },
                    { id: 'Wealth Guidance', emoji: '💰', label: 'Wealth' },
                    { id: 'Parenting Support', emoji: '👥', label: 'Parenting' },
                    { id: 'Spiritual Awakening', emoji: '🪷', label: 'Spiritual' },
                    { id: 'Behavioral Transformation', emoji: '💛', label: 'Behavior' },
                    { id: 'Swar Yoga Personal Practice', emoji: '🌟', label: 'Swar Yoga' },
                  ].map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => setZoomTopic(topic.id)}
                      className={`p-2.5 rounded-xl border text-center flex items-center justify-center gap-1.5 transition-all text-xs font-bold ${
                        zoomTopic === topic.id
                          ? 'border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-500/30'
                          : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <span>{topic.emoji}</span>
                      <span>{topic.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Calendar size={13} className="text-blue-600" />
                      Pick Date:
                    </label>
                    <input
                      type="date"
                      value={zoomDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setZoomDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Clock size={13} className="text-blue-600" />
                      Pick Time (11 AM - 5 PM):
                    </label>
                    <input
                      type="time"
                      min="11:00"
                      max="17:00"
                      value={zoomTime.includes(' ') ? '' : zoomTime}
                      onChange={(e) => setZoomTime(e.target.value)}
                      placeholder="11:00 to 17:00"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Select Time Slot (11 AM - 5 PM):
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 text-xs">
                    {['11:00 AM', '11:30 AM', '12:30 PM', '01:30 PM', '02:30 PM', '03:30 PM', '04:30 PM', '05:00 PM'].map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setZoomTime(slot)}
                        className={`py-2 px-1 rounded-xl border text-center transition-all text-xs font-bold ${
                          zoomTime === slot
                            ? 'border-blue-600 bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20'
                            : 'border-gray-200 bg-gray-50/80 hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  What would you like to discuss? (Optional):
                </label>
                <textarea
                  rows={2}
                  value={zoomNote}
                  onChange={(e) => setZoomNote(e.target.value)}
                  placeholder="Share a short note about your goals or questions..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowZoomModal(false)}
                  className="flex-1 py-3 px-4 border border-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRequestZoom}
                  disabled={zoomLoading || !zoomName.trim() || !zoomPhone.trim()}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {zoomLoading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Scheduling...</span>
                    </>
                  ) : (
                    <>
                      <Video size={15} />
                      <span>Request 1:1 Video Meet</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Call with Mohan ji Modal */}
      {showCallModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white border-2 border-amber-500 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-5 sm:p-6 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-2xl">
                  <PhoneCall size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Request a Call with Me</h3>
                  <p className="text-xs text-amber-100">1-on-1 Swar Yoga guidance with Mohan ji</p>
                </div>
              </div>
              <button
                onClick={() => setShowCallModal(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                title="Close"
              >
                <Plus className="rotate-45" size={24} />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Your Full Name: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={callName}
                  onChange={(e) => setCallName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Mobile / WhatsApp Number: <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={callPhone}
                  onChange={(e) => setCallPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Topic of Discussion:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'Health', emoji: '🧘', label: 'Health' },
                    { id: 'Wealth', emoji: '💰', label: 'Wealth' },
                    { id: 'Parenting', emoji: '👥', label: 'Parenting' },
                    { id: 'Spiritual', emoji: '🪷', label: 'Spiritual' },
                    { id: 'Behavioral Change', emoji: '💛', label: 'Behavior' },
                    { id: 'Swar Yoga Guidance', emoji: '🌟', label: 'Guidance' },
                  ].map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => setCallCategory(topic.id)}
                      className={`p-2.5 rounded-xl border text-center flex items-center justify-center gap-1.5 transition-all text-xs font-bold ${
                        callCategory === topic.id
                          ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/30'
                          : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <span>{topic.emoji}</span>
                      <span>{topic.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Calendar size={13} className="text-amber-600" />
                      Pick Date:
                    </label>
                    <input
                      type="date"
                      value={callDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setCallDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Clock size={13} className="text-amber-600" />
                      Pick Time (11 AM - 5 PM):
                    </label>
                    <input
                      type="time"
                      min="11:00"
                      max="17:00"
                      value={callTime.includes(' ') ? '' : callTime}
                      onChange={(e) => setCallTime(e.target.value)}
                      placeholder="11:00 to 17:00"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Select Time Slot (11 AM - 5 PM):
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 text-xs">
                    {['11:00 AM', '11:30 AM', '12:30 PM', '01:30 PM', '02:30 PM', '03:30 PM', '04:30 PM', '05:00 PM'].map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setCallTime(slot)}
                        className={`py-2 px-1 rounded-xl border text-center transition-all text-xs font-bold ${
                          callTime === slot
                            ? 'border-amber-600 bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/20'
                            : 'border-gray-200 bg-gray-50/80 hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Question / Note (Optional):
                </label>
                <textarea
                  rows={2}
                  value={callNote}
                  onChange={(e) => setCallNote(e.target.value)}
                  placeholder="Share any specific question or challenge you want to discuss on call..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-gray-400"
                />
              </div>

              {/* Direct Instant Call / WhatsApp Options */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <p className="font-bold text-amber-900">Need instant connection?</p>
                  <p className="text-[11px] text-amber-700">Call or message directly on WhatsApp</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <a
                    href="tel:+919309986820"
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold flex items-center gap-1 text-xs transition-colors shadow-sm"
                  >
                    <Phone size={13} />
                    <span>Call</span>
                  </a>
                  <a
                    href="https://wa.me/919309986820?text=Namaste%20Mohan%20ji,%20I%20would%20like%20to%20request%20a%20call%20with%20you%20regarding%20Swar%20Yoga."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1 text-xs transition-colors shadow-sm"
                  >
                    <span>💬 WhatsApp</span>
                  </a>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCallModal(false)}
                  className="flex-1 py-3 px-4 border border-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRequestCall}
                  disabled={callLoading || !callName.trim() || !callPhone.trim()}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {callLoading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <PhoneCall size={15} />
                      <span>Request Call</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Transformation & Experience Modal (Symbol: sitting & cheering with both hands up 🙌) */}
      {showExperienceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[80vh] sm:max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 px-4 py-3 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner shrink-0 p-1">
                  <img
                    src="/images/experience-symbol.png"
                    alt="Experience"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-white tracking-tight leading-tight">Share Your Experience</h3>
                  <p className="text-[10px] sm:text-xs text-white/90 leading-tight">Inspire others with your real benefits from Swar Yoga</p>
                </div>
              </div>
              <button
                onClick={() => setShowExperienceModal(false)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors shrink-0"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body - Smoothly Scrollable with Compact Spacing */}
            <div className="p-3.5 sm:p-4 space-y-2.5 overflow-y-auto flex-1 overscroll-contain">
              {/* Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-0.5">
                    Your Name:
                  </label>
                  <input
                    type="text"
                    value={expName}
                    onChange={(e) => setExpName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-0.5">
                    Mobile / WhatsApp:
                  </label>
                  <input
                    type="tel"
                    value={expPhone}
                    onChange={(e) => setExpPhone(e.target.value)}
                    placeholder="Phone number"
                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Star Rating ("with add starts") */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-0.5 flex items-center justify-between">
                  <span>How was your experience? (Add Stars):</span>
                  <span className="text-amber-600 font-extrabold text-[11px] whitespace-nowrap bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    {expStars}.0 / 5.0 ⭐
                  </span>
                </label>
                <div className="flex items-center gap-1.5 py-1.5 px-2 bg-amber-50/70 border border-amber-200/80 rounded-2xl justify-center overflow-hidden">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setExpStars(star)}
                      className={`w-8 h-8 sm:w-9 sm:h-9 !p-0 !m-0 !min-w-0 !border-none !bg-transparent flex items-center justify-center text-2xl leading-none transition-transform active:scale-125 hover:scale-110 cursor-pointer ${
                        star <= expStars ? 'text-amber-400 drop-shadow-sm' : 'text-gray-300'
                      }`}
                      style={{ padding: 0, margin: 0, minWidth: 'auto', background: 'transparent' }}
                      title={`${star} Star`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Select Benefit Section / Group ("and they can section health, welth, and all") */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-0.5">
                  Select Benefit Section / Category:
                </label>
                <div className="grid grid-cols-5 gap-1 text-xs">
                  {[
                    { id: 'health', emoji: '🧘', label: 'Health' },
                    { id: 'wealth', emoji: '💰', label: 'Wealth' },
                    { id: 'parenting', emoji: '👥', label: 'Parenting' },
                    { id: 'spiritual', emoji: '🪷', label: 'Spiritual' },
                    { id: 'behavioral-change', emoji: '💛', label: 'Behavior' },
                  ].map((sec) => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => setExpSection(sec.id)}
                      className={`!min-w-0 !py-1 !px-0.5 rounded-xl border text-center flex flex-col items-center justify-center gap-0.5 transition-all font-bold ${
                        expSection === sec.id
                          ? 'border-purple-600 bg-purple-600 text-white shadow-md ring-2 ring-purple-500/20'
                          : 'border-gray-200 bg-gray-50/80 hover:bg-gray-100 text-gray-700'
                      }`}
                      style={{ minWidth: 0 }}
                    >
                      <span className="text-sm">{sec.emoji}</span>
                      <span className="text-[9px] leading-tight truncate max-w-full">{sec.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Headline */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-0.5">
                  Experience Title / Key Benefit:
                </label>
                <input
                  type="text"
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  placeholder="e.g. Cured 5-year chronic acidity & stress"
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Story */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-0.5">
                  Your Transformation Story / What Benefits You Saw: <span className="text-purple-600 font-semibold normal-case">(any language)</span>
                </label>
                <textarea
                  rows={2}
                  value={expStory}
                  onChange={(e) => setExpStory(e.target.value)}
                  placeholder="Describe your transformation in any language (English, हिंदी, मराठी, ગુજરાતી, etc.)..."
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400"
                />
              </div>

              {/* All Community Sharing Info Banner */}
              <div className="p-2 bg-gradient-to-r from-purple-50 to-emerald-50 border border-purple-200/70 rounded-xl flex items-center gap-2 text-[10px] text-purple-900">
                <span className="text-sm shrink-0">🌐</span>
                <span className="leading-tight">
                  <strong>Global Community Share:</strong> Automatically shared across <strong>all 5 community groups</strong> under your selected category so all members can see your transformation!
                </span>
              </div>
            </div>

            {/* Modal Bottom Actions (Fixed at bottom of modal card) */}
            <div className="p-3 bg-gray-50/90 border-t border-gray-100 flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowExperienceModal(false)}
                className="flex-1 py-2 px-3 border border-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleShareExperience}
                disabled={expLoading || !expStory.trim()}
                className="flex-1 py-2 px-3 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-95 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-purple-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
              >
                {expLoading ? (
                  <>
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                    <span>Posting...</span>
                  </>
                ) : (
                  <>
                    <img
                      src="/images/experience-symbol.png"
                      alt="Experience"
                      className="w-4 h-4 object-contain shrink-0"
                    />
                    <span>Share Experience</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Community Group Chat Modal ("when we click chat, then people can chat in community, as they are in what group") */}
      {showGroupChatModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-3xl max-w-lg w-full h-[88vh] sm:h-[82vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Chat Header */}
            <div className={`bg-gradient-to-r ${currentChatCommunity?.design?.color?.gradient || 'from-emerald-600 via-teal-600 to-green-600'} p-3.5 sm:p-4 text-white shrink-0 shadow-sm`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner shrink-0 text-white">
                    {currentChatCommunity?.design?.icon ? (
                      <currentChatCommunity.design.icon size={20} />
                    ) : (
                      <Globe size={20} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-sm sm:text-base text-white truncate leading-tight">
                      {currentChatCommunity?.name || 'Community'} Group Chat
                    </h3>
                    <p className="text-[10px] sm:text-xs text-white/90 truncate flex items-center gap-1.5 leading-tight mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse inline-block shrink-0"></span>
                      <span>👥 {currentChatCommunity?.members || 300}+ members • Live Group</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowGroupChatModal(false)}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors shrink-0 ml-2 cursor-pointer"
                  title="Close Chat"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Group Switcher Tabs: Global + any joined communities */}
              <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto no-scrollbar pb-0.5">
                {communities
                  .filter((c) => c.id === 'global' || userMemberships.includes(c.id))
                  .map((c) => {
                    const isActive = (activeChatCommunityId || 'global') === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setActiveChatCommunityId(c.id);
                          setGroupChatLoading(true);
                          fetchChatMessages(c.id).finally(() => setGroupChatLoading(false));
                        }}
                        className={`!px-2.5 !py-1 !min-w-0 rounded-full text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                          isActive
                            ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-white/50'
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                        style={{ padding: '3px 10px', minWidth: 'auto' }}
                      >
                        <span>{c.id === 'global' ? '🌐' : '🧘'}</span>
                        <span className="truncate max-w-[130px]">{c.name}</span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-slate-50/70 overscroll-contain">
              {/* Group Welcome Card */}
              <div className="p-3 bg-white rounded-2xl border border-gray-200/70 text-center shadow-xs">
                <p className="text-xs font-bold text-gray-800">
                  Welcome to {currentChatCommunity?.name} Group Chat!
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Share experiences, discuss practices, ask doubts, and connect with fellow sadhaks in this group.
                </p>
              </div>

              {groupChatLoading && chatMessages.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-gray-400 gap-2">
                  <Loader className="w-5 h-5 animate-spin text-emerald-600" />
                  <span className="text-xs">Loading group messages...</span>
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-xs">
                  💬 No messages yet in this group. Say hello to everyone!
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMe = (chatSenderName && msg.userName.toLowerCase() === chatSenderName.toLowerCase()) ||
                    (user?.name && msg.userName.toLowerCase() === user.name.toLowerCase());
                  const isAdmin = msg.userRole === 'admin' || msg.userName.toLowerCase().includes('mohan');

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5 px-1">
                        <span className="text-[10px] font-bold text-gray-600">
                          {isMe ? 'You' : msg.userName}
                        </span>
                        {isAdmin && (
                          <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none">
                            Teacher / Admin
                          </span>
                        )}
                        <span className="text-[9px] text-gray-400">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-xs ${
                          isMe
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-xs'
                            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatMessagesEndRef} />
            </div>

            {/* Input Bar / Bottom Footer */}
            <div className="p-2.5 sm:p-3 bg-white border-t border-gray-100 shrink-0 space-y-2">
              {/* If sender name is not set yet, ask once */}
              {!chatSenderName && (
                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                  <span className="text-[10px] font-bold text-gray-600 whitespace-nowrap pl-1">Your Name:</span>
                  <input
                    type="text"
                    value={chatSenderName}
                    onChange={(e) => setChatSenderName(e.target.value)}
                    placeholder="Enter your name to chat"
                    className="flex-1 bg-white px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              )}

              <form onSubmit={handleSendChatMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={`Message ${currentChatCommunity?.name || 'group'}...`}
                  className="flex-1 bg-gray-50 hover:bg-gray-100/80 focus:bg-white px-3.5 py-2 text-xs sm:text-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || chatSending}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 disabled:opacity-40 text-white flex items-center justify-center shadow-md active:scale-95 transition-all shrink-0 cursor-pointer"
                  title="Send message"
                  style={{ minWidth: 'auto', padding: 0 }}
                >
                  {chatSending ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send size={16} className="translate-x-0.5" />
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Mobile / Android App Mode Bottom Navigation Bar - All 6 buttons in ONE line (grid-cols-6) with + Ask in center */}
      {appViewMode === 'android' && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-40 h-16 shadow-2xl grid grid-cols-6 items-center px-1 md:hidden">
          {/* 1. Feed */}
          <button
            onClick={() => {
              setViewMode('posts');
              setSelectedCategory('all');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`w-full flex flex-col items-center justify-center py-1 transition-colors ${
              viewMode === 'posts' && selectedCategory === 'all' ? 'text-emerald-600 font-bold' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Home size={18} />
            <span className="text-[9px] mt-1 leading-none font-medium">Feed</span>
          </button>

          {/* 2. Zoom */}
          <button
            onClick={() => setShowZoomModal(true)}
            className="w-full flex flex-col items-center justify-center py-1 text-blue-600 hover:text-blue-700 active:scale-95 transition-colors"
            title="Join Zoom 1:1 Video Meet"
          >
            <Video size={18} />
            <span className="text-[9px] font-bold mt-1 leading-none">Zoom</span>
          </button>

          {/* 3. Call */}
          <button
            onClick={() => setShowCallModal(true)}
            className="w-full flex flex-col items-center justify-center py-1 text-amber-600 hover:text-amber-700 active:scale-95 transition-colors"
            title="Request Call"
          >
            <PhoneCall size={18} />
            <span className="text-[9px] font-bold mt-1 leading-none">Call</span>
          </button>

          {/* 4. CENTER: + Ask Query */}
          <button
            onClick={() => setShowAskModal(true)}
            className="w-full flex flex-col items-center justify-center py-0.5 text-emerald-600 active:scale-95 transition-all"
            title="Ask Query"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/30">
              <Plus size={16} />
            </div>
            <span className="text-[9px] font-bold text-emerald-700 mt-0.5 leading-none">Ask</span>
          </button>

          {/* 5. Chat */}
          <button
            onClick={() => {
              if (user?.name && !chatSenderName) setChatSenderName(user.name);
              setActiveChatCommunityId(selectedCommunity || 'global');
              setShowGroupChatModal(true);
            }}
            className="w-full flex flex-col items-center justify-center py-1 text-teal-600 hover:text-teal-700 active:scale-95 transition-colors"
            title="Community Group Chat"
          >
            <MessageCircle size={18} />
            <span className="text-[9px] font-bold mt-1 leading-none">Chat</span>
          </button>

          {/* 6. Experience (Sitting & cheering with both hands up) */}
          <button
            onClick={() => {
              if (user?.name && !expName) setExpName(user.name);
              setShowExperienceModal(true);
            }}
            className="w-full flex flex-col items-center justify-center py-1 text-purple-600 hover:text-purple-700 active:scale-95 transition-colors"
            title="Share Your Experience / Transformation"
          >
            <img
              src="/images/experience-symbol.png"
              alt="Experience"
              className="w-5 h-5 object-contain shrink-0"
            />
            <span className="text-[9px] font-bold mt-0.5 leading-none">Story</span>
          </button>
        </div>
      )}

      {/* 🎁 7. Referral / "Gift Swar Yoga to Family & Friends" Modal */}
      {showReferralModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-emerald-300 max-w-md w-full p-6 text-center relative animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setShowReferralModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white text-3xl flex items-center justify-center mx-auto mb-3 shadow-md">
              🎁
            </div>

            <h3 className="text-lg font-extrabold text-gray-900 mb-1">
              Gift Swar Yoga to Family & Friends
            </h3>
            <p className="text-xs text-emerald-800 font-semibold mb-3">
              परिवार और मित्रों को दिव्य स्वर योग से जोड़ें
            </p>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 text-left mb-4 space-y-2 text-xs text-gray-700">
              <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                <span>✨</span> What they receive:
              </p>
              <ul className="space-y-1 list-disc list-inside text-[11px] text-gray-600">
                <li>Instant Free Access to Swar Yoga Global Community</li>
                <li>Free Introductory Vedic Swar Wisdom Videos & Breathing Guide</li>
                <li>Invitations to upcoming live sadhana & question sessions</li>
              </ul>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  const shareText = encodeURIComponent(
                    `Namaste! 🙏 I invite you to join the divine Swar Yoga Community with Mohan Sir. Experience authentic breathing wisdom, health, peace, and spiritual growth: https://swaryoga.com/community`
                  );
                  window.open(`https://api.whatsapp.com/send?text=${shareText}`, '_blank');
                }}
                className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold text-xs sm:text-sm py-3 px-4 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>📱</span>
                <span>Share via WhatsApp (व्हाट्सएप पर शेयर करें)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText('https://swaryoga.com/community');
                  alert('✅ Community Link copied to clipboard!');
                }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs py-2 px-4 rounded-xl transition-all active:scale-95 cursor-pointer"
              >
                📋 Copy Invite Link
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
