'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Footer from '@/components/Footer';
import {
  Video,
  Film,
  MessageSquare,
  Radio,
  Globe,
  Play,
  Share2,
  ThumbsUp,
  ThumbsDown,
  CheckCircle,
  Eye,
  Clock,
  Sparkles,
  Search,
  X,
  ExternalLink,
  ChevronDown,
  Layers,
  Calendar,
  Volume2,
  Maximize2,
  Zap,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  Trash2,
  Bookmark,
  Send,
  RotateCcw,
  ListMusic
} from 'lucide-react';
import Image from 'next/image';

const WORKSHOP_LANGUAGES = [
  { code: 'hi', name: 'Hindi (हिंदी)', flag: '🇮🇳' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'mr', name: 'Marathi (मराठी)', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada (ಕನ್ನಡ)', flag: '🇮🇳' },
  { code: 'ne', name: 'Nepali (नेपाली)', flag: '🇳🇵' },
  { code: 'zh', name: 'Mandarin (中文)', flag: '🇨🇳' },
  { code: 'es', name: 'Spanish (Español)', flag: '🇪🇸' },
  { code: 'fr', name: 'French (Français)', flag: '🇫🇷' },
  { code: 'ar', name: 'Arabic (العربية)', flag: '🇸🇦' },
  { code: 'de', name: 'German (Deutsch)', flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese (Português)', flag: '🇧🇷' },
  { code: 'ja', name: 'Japanese (日本語)', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean (한국어)', flag: '🇰🇷' },
  { code: 'ru', name: 'Russian (Русский)', flag: '🇷🇺' },
  { code: 'it', name: 'Italian (Italiano)', flag: '🇮🇹' },
  { code: 'tr', name: 'Turkish (Türkçe)', flag: '🇹🇷' },
  { code: 'nl', name: 'Dutch (Nederlands)', flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish (Svenska)', flag: '🇸🇪' },
  { code: 'th', name: 'Thai (ไทย)', flag: '🇹🇭' },
  { code: 'id', name: 'Indonesian (Bahasa)', flag: '🇮🇩' },
];

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'swar_yoga', label: 'Swar Yoga' },
  { id: 'ayurveda_recipe', label: 'Ayurveda Recipes' },
  { id: 'sadhana', label: 'Morning Sadhana' },
  { id: 'workshop', label: 'Workshops' },
  { id: 'general', label: 'Healing Guidance' },
];

function getYouTubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  if (url.includes('youtube.com/embed/')) {
    if (url.includes('dQw4w9WgXcQ')) {
      return 'https://www.youtube.com/embed/luSaTlBXssM?autoplay=1&rel=0';
    }
    return url.includes('?') ? url : `${url}?autoplay=1&rel=0`;
  }
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  if (match && match[1]) {
    const videoId = match[1] === 'dQw4w9WgXcQ' ? 'luSaTlBXssM' : match[1];
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
  }
  return null;
}

interface TopicDefinition {
  id: string;
  name: string;
  nameHi: string;
  shortName: string;
  icon: string;
  badgeBg: string;
  badgeText: string;
  description: string;
  descriptionHi: string;
  itemIds: string[];
}

const TOPIC_CLUSTERS: TopicDefinition[] = [
  {
    id: 'topic_swar_breath',
    name: 'Swar Breathing & Nostril Science',
    nameHi: 'स्वर नासिका एवं श्वास रहस्य',
    shortName: '🌬️ Swar Breath',
    icon: '🌬️',
    badgeBg: 'bg-sky-500/20 border-sky-400/40 text-sky-200',
    badgeText: 'text-sky-400',
    description: 'Master checking active breath, switching nostrils at will, and Sushumna meditation.',
    descriptionHi: 'सक्रिय स्वर की जांच, इच्छा अनुसार स्वर परिवर्तन एवं सुषुम्ना नाड़ी का गुप्त रहस्य।',
    itemIds: [
      'seed_short_check_swar',
      'seed_short_switch_swar',
      'seed_short_sushumna_danger',
      'seed_short_two_minute_decision'
    ]
  },
  {
    id: 'topic_water_digestion',
    name: 'Water Rules & Ayurvedic Digestion',
    nameHi: 'जल एवं जठराग्नि के अचूक नियम',
    shortName: '💧 Water & Diet',
    icon: '💧',
    badgeBg: 'bg-amber-500/20 border-amber-400/40 text-amber-200',
    badgeText: 'text-amber-400',
    description: 'When to drink water, eating during Surya Swar, and cold water hazards.',
    descriptionHi: 'पानी कब पिएं, भोजन के समय सूर्य स्वर का महत्व और बाईं करवट विश्राम का चमत्कारी नियम।',
    itemIds: [
      'seed_short_drink_water',
      'seed_short_eating_surya',
      'seed_short_cold_water_warning',
      'seed_short_post_meal_sleep'
    ]
  },
  {
    id: 'topic_stress_calm',
    name: 'Instant Stress Relief & Mental Peace',
    nameHi: 'तनाव मुक्ति एवं मानसिक शांति',
    shortName: '🧘 Peace & Sleep',
    icon: '🧘‍♀️',
    badgeBg: 'bg-purple-500/20 border-purple-400/40 text-purple-200',
    badgeText: 'text-purple-400',
    description: 'Emergency 60-second anxiety release, anger halt, and 5-minute deep sleep.',
    descriptionHi: 'तुरंत तनाव व क्रोध पर नियंत्रण, सिरदर्द निवारण और 5 मिनट में गहरी नींद लाने का स्वर नियम।',
    itemIds: [
      'seed_short_instant_stress',
      'seed_short_stop_anger',
      'seed_short_5min_sleep',
      'seed_short_headache_hack'
    ]
  },
  {
    id: 'topic_morning_sadhana',
    name: 'Morning Sadhana & Vitality Secrets',
    nameHi: 'प्रातःकालीन साधना एवं प्राण ऊर्जा',
    shortName: '🌅 Morning Prana',
    icon: '🌅',
    badgeBg: 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200',
    badgeText: 'text-emerald-400',
    description: 'First foot out of bed, Brahma Muhurta synchronization, and all-day success.',
    descriptionHi: 'सुबह आंख खुलते ही पहला नियम, पहला कदम और ब्रह्म मुहूर्त में 10 गुना प्राण ऊर्जा का रहस्य।',
    itemIds: [
      'seed_short_morning_activation',
      'seed_short_first_step',
      'seed_short_brahma_muhurta',
      'seed_short_prana_surge'
    ]
  }
];

interface MediaComment {
  id: string;
  author: string;
  avatar?: string;
  text: string;
  timeAgo: string;
  likes: number;
}

const DEFAULT_COMMENTS: MediaComment[] = [
  {
    id: 'c1',
    author: 'Ramesh Sharma',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    text: 'मोहन सर, यह नियम मैंने आजमाया, तुरंत लाभ मिला। धन्यवाद प्रणाम! 🙏',
    timeAgo: '2 hours ago',
    likes: 42,
  },
  {
    id: 'c2',
    author: 'Ananya Patil',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    text: 'Watching this on repeat every morning before starting my sadhana. Amazing clarity!',
    timeAgo: '5 hours ago',
    likes: 28,
  },
  {
    id: 'c3',
    author: 'Dr. Vikram Joshi',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
    text: 'Ancient Shiva Swarodaya explained with modern biological science. Mohan Sir has made this wisdom accessible to all.',
    timeAgo: '1 day ago',
    likes: 67,
  },
];

interface MediaItem {
  id: string;
  type: 'video' | 'shorts' | 'playlist' | 'post' | 'live';
  title: string;
  description: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  sourceLanguage?: string;
  translations?: Record<string, { title: string; description: string; mediaUrl?: string }>;
  liveStatus?: 'upcoming' | 'live' | 'ended';
  liveScheduledAt?: string;
  category?: string;
  tags?: string[];
  viewsCount?: number;
  likesCount?: number;
  overlayStrip?: {
    enabled?: boolean;
    stripText?: string;
    stripLinkText?: string;
    stripLinkUrl?: string;
    position?: 'top' | 'bottom';
    popupEnabled?: boolean;
    popupSeconds?: number;
    popupTitle?: string;
    popupMessage?: string;
    popupLinkText?: string;
    popupLinkUrl?: string;
  };
  createdAt: string;
}

export default function MediaPage() {
  // Navigation tabs (exact YouTube buttons)
  const [activeTab, setActiveTab] = useState<'videos' | 'shorts' | 'playlists' | 'posts' | 'live'>('videos');
  
  // Selected Language (Default: Hindi)
  const [selectedLang, setSelectedLang] = useState<string>('hi');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  // Category & Search
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchInput, setSearchInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Debounce search input to avoid hitting backend on every keypress
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Topic filter for shorts (Allows browsing all or focusing on one topic)
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string>('all');

  // User's personal saved playlist ("My Playlist" / Repeat Practice)
  const [myPlaylist, setMyPlaylist] = useState<MediaItem[]>([]);
  const [playlistSubTab, setPlaylistSubTab] = useState<'my_playlist' | 'official'>('my_playlist');
  const [playlistToast, setPlaylistToast] = useState<string | null>(null);

  // Filtered My Playlist when search query is active
  const displayedMyPlaylist = useMemo(() => {
    if (!searchQuery.trim()) return myPlaylist;
    const q = searchQuery.toLowerCase();
    return myPlaylist.filter((item) => {
      return (
        item.title.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q))
      );
    });
  }, [myPlaylist, searchQuery]);

  // Comments state for Theater Player
  const [commentInput, setCommentInput] = useState('');
  const [commentsMap, setCommentsMap] = useState<Record<string, MediaComment[]>>({});
  const [isCommentsOpen, setIsCommentsOpen] = useState(true);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [dislikedMap, setDislikedMap] = useState<Record<string, boolean>>({});

  // Data & Loading
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [shortsList, setShortsList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Horizontal scroll ref for the 1st line of Shorts
  const shortsRowRef = useRef<HTMLDivElement>(null);

  const scrollShortsRow = (direction: 'left' | 'right') => {
    if (shortsRowRef.current) {
      const scrollAmount = direction === 'left' ? -360 : 360;
      shortsRowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Active playing video (Theater Mode Modal)
  const [activePlayerItem, setActivePlayerItem] = useState<MediaItem | null>(null);

  // App vs Website separation
  const [isApp, setIsApp] = useState(false);

  // Protected share viral popup & mid-video popup
  const [showSharedAppPopup, setShowSharedAppPopup] = useState(false);
  const [showMidVideoPopup, setShowMidVideoPopup] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const appDetected = Boolean((window as any).SwarYoga) || 
        navigator.userAgent.includes('SwarYogaApp') || 
        searchParams.get('app') === 'true' || 
        searchParams.get('is_app') === 'true';
      setIsApp(appDetected);

      // Check if opened via viral share link
      if (searchParams.get('ref') === 'share') {
        setShowSharedAppPopup(true);
      }

      // Read language from URL (e.g. ?lang=mr or ?language=mr)
      const urlLang = searchParams.get('lang') || searchParams.get('language');
      if (urlLang && WORKSHOP_LANGUAGES.some(l => l.code === urlLang)) {
        setSelectedLang(urlLang);
      }
    }
  }, []);

  // Auto-open video if ?v=[id] is present in URL
  useEffect(() => {
    if (typeof window !== 'undefined' && mediaItems.length > 0 && !activePlayerItem) {
      const searchParams = new URLSearchParams(window.location.search);
      const videoId = searchParams.get('v');
      if (videoId) {
        const found = mediaItems.find((m) => m.id === videoId);
        if (found) {
          setActivePlayerItem(found);
        }
      }
    }
  }, [mediaItems, activePlayerItem]);

  // Mid-video popup timer
  useEffect(() => {
    if (activePlayerItem?.overlayStrip?.popupEnabled) {
      const seconds = activePlayerItem.overlayStrip.popupSeconds || 20;
      const timer = setTimeout(() => {
        setShowMidVideoPopup(true);
      }, seconds * 1000);
      return () => clearTimeout(timer);
    } else {
      setShowMidVideoPopup(false);
    }
  }, [activePlayerItem]);

  // Load saved playlist from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('swaryoga_my_playlist');
        if (stored) {
          setMyPlaylist(JSON.parse(stored));
        }
      } catch (e) {
        console.warn('Failed to load my playlist:', e);
      }
    }
  }, []);

  const showToast = (msg: string) => {
    setPlaylistToast(msg);
    setTimeout(() => {
      setPlaylistToast(null);
    }, 2500);
  };

  const toggleSaveToPlaylist = (item: MediaItem, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setMyPlaylist((prev) => {
      const exists = prev.some((p) => p.id === item.id);
      let updated: MediaItem[];
      if (exists) {
        updated = prev.filter((p) => p.id !== item.id);
        showToast('Removed from My Playlist');
      } else {
        updated = [item, ...prev];
        showToast('✅ Added to My Playlist (+)');
      }
      try {
        localStorage.setItem('swaryoga_my_playlist', JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed to save playlist:', err);
      }
      return updated;
    });
  };

  const removeFromMyPlaylist = (itemId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setMyPlaylist((prev) => {
      const updated = prev.filter((p) => p.id !== itemId);
      try {
        localStorage.setItem('swaryoga_my_playlist', JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed to save playlist:', err);
      }
      showToast('Removed from My Playlist');
      return updated;
    });
  };

  const clearMyPlaylist = () => {
    if (typeof window !== 'undefined' && window.confirm('Are you sure you want to clear your saved playlist? / क्या आप अपनी प्लेलिस्ट खाली करना चाहते हैं?')) {
      setMyPlaylist([]);
      try {
        localStorage.removeItem('swaryoga_my_playlist');
      } catch {}
      showToast('Playlist cleared');
    }
  };

  // Fetch shorts for the top horizontal shelf (always populated for 1st line)
  const fetchShorts = useCallback(async () => {
    try {
      const res = await fetch(`/api/media?type=shorts&limit=50&language=${selectedLang}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await res.json();
      if (data.success && data.data?.items) {
        setShortsList(data.data.items);
      }
    } catch (err) {
      console.warn('Failed to fetch shorts:', err);
    }
  }, [selectedLang]);

  useEffect(() => {
    fetchShorts();
  }, [fetchShorts]);

  // Fetch items from Bunny DB API
  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeTab === 'videos') params.set('type', 'video');
      else if (activeTab === 'shorts') params.set('type', 'shorts');
      else if (activeTab === 'playlists') params.set('type', 'playlist');
      else if (activeTab === 'posts') params.set('type', 'post');
      else if (activeTab === 'live') params.set('type', 'live');

      if (selectedLang) params.set('language', selectedLang);
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      params.set('limit', '50');

      const res = await fetch(`/api/media?${params.toString()}`, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();
      if (data.success && data.data?.items) {
        setMediaItems(data.data.items);
        if (activeTab === 'shorts') {
          setShortsList(data.data.items);
        }
      } else {
        setMediaItems([]);
      }
    } catch (e) {
      console.warn('Failed to fetch media:', e);
      setMediaItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedLang, selectedCategory, searchQuery]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const currentLangObj = useMemo(() => {
    return WORKSHOP_LANGUAGES.find((l) => l.code === selectedLang) || WORKSHOP_LANGUAGES[0];
  }, [selectedLang]);

  // Helper to find which topic a short belongs to
  const getTopicForShort = useCallback((short: MediaItem): TopicDefinition | undefined => {
    // 1. Direct ID match
    const directTopic = TOPIC_CLUSTERS.find(t => t.itemIds.includes(short.id));
    if (directTopic) return directTopic;

    // 2. Semantic matching
    const text = `${short.id} ${short.title} ${short.description || ''} ${JSON.stringify(short.tags || [])} ${short.category}`.toLowerCase();
    if (text.includes('swar') || text.includes('nostril') || text.includes('sushumna') || text.includes('श्वास') || text.includes('स्वर')) {
      return TOPIC_CLUSTERS[0];
    }
    if (text.includes('water') || text.includes('drink') || text.includes('eating') || text.includes('cold') || text.includes('पानी') || text.includes('जल') || text.includes('भोजन')) {
      return TOPIC_CLUSTERS[1];
    }
    if (text.includes('stress') || text.includes('anger') || text.includes('sleep') || text.includes('headache') || text.includes('तनाव') || text.includes('क्रोध') || text.includes('नींद')) {
      return TOPIC_CLUSTERS[2];
    }
    if (text.includes('morning') || text.includes('bed') || text.includes('brahma') || text.includes('prana') || text.includes('सुबह') || text.includes('प्रातः')) {
      return TOPIC_CLUSTERS[3];
    }
    return TOPIC_CLUSTERS[0];
  }, []);

  // TOPIC CLUSTERING ALGORITHM:
  // Groups 3-4 videos of the EXACT same topic together consecutively
  const { clusteredShorts, topicSections } = useMemo(() => {
    const listToCluster = shortsList.length > 0 ? shortsList : mediaItems.filter(m => m.type === 'shorts');
    if (listToCluster.length === 0) {
      return { clusteredShorts: [], topicSections: [] };
    }

    const assignedIds = new Set<string>();
    const sections: { topic: TopicDefinition; shorts: MediaItem[] }[] = [];
    const ordered: MediaItem[] = [];

    // Group according to topic definitions (3-4 videos each)
    TOPIC_CLUSTERS.forEach(topic => {
      const topicShorts = listToCluster.filter(item => {
        if (topic.itemIds.includes(item.id)) return true;
        const text = `${item.id} ${item.title} ${item.description || ''} ${JSON.stringify(item.tags || [])} ${item.category}`.toLowerCase();
        if (topic.id === 'topic_swar_breath' && (text.includes('swar') || text.includes('nostril') || text.includes('sushumna') || text.includes('श्वास') || text.includes('स्वर'))) return true;
        if (topic.id === 'topic_water_digestion' && (text.includes('water') || text.includes('drink') || text.includes('eating') || text.includes('पानी') || text.includes('जल') || text.includes('भोजन') || text.includes('पाचन'))) return true;
        if (topic.id === 'topic_stress_calm' && (text.includes('stress') || text.includes('anger') || text.includes('sleep') || text.includes('headache') || text.includes('तनाव') || text.includes('क्रोध') || text.includes('नींद') || text.includes('शांत'))) return true;
        if (topic.id === 'topic_morning_sadhana' && (text.includes('morning') || text.includes('bed') || text.includes('brahma') || text.includes('prana') || text.includes('प्रातः') || text.includes('सुबह') || text.includes('पैर'))) return true;
        return false;
      }).filter(item => !assignedIds.has(item.id));

      topicShorts.forEach(item => assignedIds.add(item.id));

      if (topicShorts.length > 0) {
        sections.push({ topic, shorts: topicShorts });
        ordered.push(...topicShorts);
      }
    });

    const remaining = listToCluster.filter(item => !assignedIds.has(item.id));
    if (remaining.length > 0) {
      ordered.push(...remaining);
    }

    return { clusteredShorts: ordered, topicSections: sections };
  }, [shortsList, mediaItems]);

  // Filtered shorts for the 1st line shelf according to selected topic chip
  const displayedShortsShelf = useMemo(() => {
    if (selectedTopicFilter === 'all') return clusteredShorts;
    const foundSection = topicSections.find(s => s.topic.id === selectedTopicFilter);
    return foundSection ? foundSection.shorts : clusteredShorts;
  }, [selectedTopicFilter, clusteredShorts, topicSections]);

  // Related shorts in player modal from the SAME topic cluster
  const modalTopicRecommendations = useMemo(() => {
    if (!activePlayerItem) return [];
    const topic = getTopicForShort(activePlayerItem);
    if (!topic) return [];
    return clusteredShorts.filter(s => s.id !== activePlayerItem.id && topic.itemIds.includes(s.id)).slice(0, 4);
  }, [activePlayerItem, clusteredShorts, getTopicForShort]);

  // Active comments for currently open item in player modal
  const currentComments = useMemo(() => {
    if (!activePlayerItem) return [];
    if (commentsMap[activePlayerItem.id]) {
      return commentsMap[activePlayerItem.id];
    }
    return DEFAULT_COMMENTS;
  }, [activePlayerItem, commentsMap]);

  // Load comments from localStorage when item is opened
  useEffect(() => {
    if (activePlayerItem && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`swaryoga_comments_${activePlayerItem.id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          setCommentsMap((prev) => ({ ...prev, [activePlayerItem.id]: parsed }));
        }
      } catch (e) {
        console.warn('Failed to load comments:', e);
      }
    }
  }, [activePlayerItem]);

  const handleAddComment = () => {
    if (!activePlayerItem || !commentInput.trim()) return;
    const newComment: MediaComment = {
      id: `comm_${Date.now()}`,
      author: 'You (Sadhak)',
      text: commentInput.trim(),
      timeAgo: 'Just now',
      likes: 0,
    };
    const updated = [newComment, ...currentComments];
    setCommentsMap((prev) => ({ ...prev, [activePlayerItem.id]: updated }));
    try {
      localStorage.setItem(`swaryoga_comments_${activePlayerItem.id}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save comment:', e);
    }
    setCommentInput('');
    showToast('💬 Comment posted successfully!');
  };

  const handleLikeComment = (commentId: string) => {
    if (!activePlayerItem) return;
    const updated = currentComments.map((c) =>
      c.id === commentId ? { ...c, likes: c.likes + 1 } : c
    );
    setCommentsMap((prev) => ({ ...prev, [activePlayerItem.id]: updated }));
    try {
      localStorage.setItem(`swaryoga_comments_${activePlayerItem.id}`, JSON.stringify(updated));
    } catch {}
  };

  const handleDeleteComment = (commentId: string) => {
    if (!activePlayerItem) return;
    const updated = currentComments.filter((c) => c.id !== commentId);
    setCommentsMap((prev) => ({ ...prev, [activePlayerItem.id]: updated }));
    try {
      localStorage.setItem(`swaryoga_comments_${activePlayerItem.id}`, JSON.stringify(updated));
    } catch {}
    showToast('🗑️ Comment deleted / टिप्पणी हटा दी गई');
  };

  // Format Duration seconds to mm:ss or hh:mm:ss
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '12:45';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format time ago
  const formatTimeAgo = (iso?: string) => {
    if (!iso) return 'Recent';
    const date = new Date(iso);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays} days ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const handleBack = () => {
    if (typeof window !== 'undefined') {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/';
      }
    }
  };

  // Render a Single 9:16 Shorts Card (YouTube Mobile Style with Topic Pill and + Playlist Button)
  const renderShortCard = (short: MediaItem, topicOverride?: TopicDefinition) => {
    const assignedTopic = topicOverride || getTopicForShort(short);
    const isSavedInPlaylist = myPlaylist.some((p) => p.id === short.id);
    return (
      <div
        key={short.id}
        onClick={() => setActivePlayerItem(short)}
        className="group cursor-pointer relative w-[148px] sm:w-[178px] md:w-[195px] aspect-[9/16] shrink-0 snap-start rounded-2xl overflow-hidden bg-slate-900 shadow-md hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 border border-slate-800"
      >
        {/* 9:16 Thumbnail */}
        {short.thumbnailUrl ? (
          <img
            src={short.thumbnailUrl}
            alt={short.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-emerald-950 text-slate-400 p-4 text-center">
            <Zap className="w-10 h-10 text-emerald-400 mb-2 fill-emerald-400" />
            <span className="text-xs font-bold text-white">9:16 Short</span>
          </div>
        )}

        {/* Gradient Overlay for bottom text */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent pointer-events-none" />

        {/* Top Badges Row with + Button */}
        <div className="absolute top-2 inset-x-2 flex items-center justify-between gap-1 z-20">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-md text-[10px] font-bold text-white border border-white/15 shadow-xs pointer-events-none">
            <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span>Shorts</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 bg-black/75 backdrop-blur-md text-[10px] font-bold text-emerald-300 rounded border border-emerald-500/20 font-mono shadow-xs pointer-events-none">
              {formatDuration(short.durationSeconds)}
            </span>

            {/* + Add to My Playlist Button */}
            <button
              type="button"
              onClick={(e) => toggleSaveToPlaylist(short, e)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full backdrop-blur-md border shadow-md transition-all active:scale-90 cursor-pointer ${
                isSavedInPlaylist
                  ? 'bg-emerald-600 text-white border-emerald-400 font-bold text-[10px]'
                  : 'bg-black/80 hover:bg-black text-white hover:text-emerald-300 border-white/30 text-[10px] font-semibold'
              }`}
              title={isSavedInPlaylist ? 'Saved in My Playlist' : 'Add to My Playlist (+)'}
              aria-label="Add to My Playlist"
            >
              {isSavedInPlaylist ? (
                <>
                  <Check className="w-3 h-3 stroke-[3] text-white" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3 stroke-[3] text-white" />
                  <span>Playlist</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Topic Tag Pill (Algorithmic match badge) */}
        {assignedTopic && (
          <div className="absolute top-9 left-2 z-10 pointer-events-none">
            <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold backdrop-blur-md border shadow-xs ${assignedTopic.badgeBg}`}>
              {assignedTopic.shortName}
            </span>
          </div>
        )}

        {/* Play Hover Icon */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
            <Play className="w-6 h-6 fill-white ml-0.5" />
          </div>
        </div>

        {/* Bottom Info: Title & View Count */}
        <div className="absolute bottom-0 inset-x-0 p-2.5 sm:p-3 space-y-1 z-10">
          <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug drop-shadow-md group-hover:text-amber-300 transition-colors">
            {short.title}
          </h4>
          <p className="text-[11px] text-slate-300 font-medium">
            {(short.viewsCount || 245000).toLocaleString()} views
          </p>
        </div>
      </div>
    );
  };

  // 1st Line of Shorts: Scrollable horizontally from left to right & right to left
  const renderHorizontalShortsShelf = (titleText: string, subtitleText?: string) => (
    <div className="space-y-3 bg-gradient-to-b from-slate-50 to-white border border-slate-200/90 rounded-3xl p-3.5 sm:p-5 shadow-xs">
      {/* Shelf Header with Title & Left/Right Scroll Buttons */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
            <Zap className="w-4 h-4 fill-white" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
              {titleText}
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              {subtitleText || 'Scroll left & right to choose • 3-4 videos grouped per topic'}
            </p>
          </div>
        </div>

        {/* Navigation Buttons for Left & Right Scroll */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => scrollShortsRow('left')}
            className="w-8 h-8 rounded-full bg-white border border-slate-300 hover:bg-slate-100 hover:border-slate-400 active:scale-95 text-slate-700 flex items-center justify-center shadow-xs transition-all cursor-pointer"
            title="Scroll Left"
            aria-label="Scroll Left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollShortsRow('right')}
            className="w-8 h-8 rounded-full bg-white border border-slate-300 hover:bg-slate-100 hover:border-slate-400 active:scale-95 text-slate-700 flex items-center justify-center shadow-xs transition-all cursor-pointer"
            title="Scroll Right"
            aria-label="Scroll Right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Topic Filter Chips (Algorithmic Quick Switcher) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 pt-0.5">
        <button
          type="button"
          onClick={() => setSelectedTopicFilter('all')}
          className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            selectedTopicFilter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          All Topics ({clusteredShorts.length})
        </button>
        {TOPIC_CLUSTERS.map((t) => {
          const isSelected = selectedTopicFilter === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedTopicFilter(t.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white hover:bg-emerald-50 text-slate-700 border border-slate-200'
              }`}
            >
              <span>{t.icon}</span>
              <span>{selectedLang === 'hi' ? t.nameHi : t.shortName}</span>
              <span className={`text-[10px] px-1 py-0.2 rounded-full font-bold ${
                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                4
              </span>
            </button>
          );
        })}
      </div>

      {/* 1st Line: Horizontal Scrollable Row (Swipe left/right or use buttons) */}
      <div
        ref={shortsRowRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar py-1 px-0.5 -mx-1"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {displayedShortsShelf.map((short) => renderShortCard(short))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-slate-100 flex flex-col font-sans">
      {/* Green Channel Strip (Compact YouTube Channel Header with ONE centered Back button) */}
      <section className="relative w-full bg-gradient-to-r from-[#064e3b] via-[#047857] to-[#065f46] border-b border-emerald-700/60 shadow-md text-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Left: Mohan Sir Avatar + Heading Swar Yoga Media */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              {/* Mohan Sir Avatar (Strict 44px circle) */}
              <div 
                className="relative rounded-full overflow-hidden border-2 border-white shadow-md shrink-0 ring-2 ring-emerald-400/40 bg-emerald-950"
                style={{ 
                  width: '44px', 
                  height: '44px', 
                  minWidth: '44px', 
                  minHeight: '44px', 
                  maxWidth: '44px', 
                  maxHeight: '44px' 
                }}
              >
                <img
                  src="https://swaryogacrm.b-cdn.net/mohan.jpg"
                  alt="Mohan Sir - Swar Yoga"
                  className="rounded-full"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>

              {/* Title & Official Channel Checkmark */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight drop-shadow-sm truncate">
                    Swar Yoga Media
                  </h1>
                  <span className="w-4 h-4 rounded-full bg-white text-emerald-800 flex items-center justify-center text-[10px] font-black shadow-xs shrink-0" title="Verified Official Channel">
                    ✓
                  </span>
                </div>
                {/* Desktop Badges (Hidden on mobile) */}
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-100/90 font-medium mt-0.5 truncate">
                  <span>@swaryoga</span>
                  <span>•</span>
                  <span>100K+ Sadhaks</span>
                  <span>•</span>
                  <span>20 Languages</span>
                </div>
              </div>
            </div>

            {/* Center: The ONE Back Button (Centered so menu bar can be used) */}
            <div className="flex items-center justify-center shrink-0">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/40 hover:bg-black/60 active:scale-95 text-white font-bold text-xs border border-white/25 shadow-sm transition-all cursor-pointer"
                title="Back to Website"
                aria-label="Back to Website"
              >
                <ArrowLeft className="w-4 h-4 text-white stroke-[2.5]" />
                <span>Back</span>
              </button>
            </div>

            {/* Right: Language Selector & Desktop Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsLangDropdownOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 active:scale-95 text-white font-bold text-xs border border-white/20 shadow-xs transition-all cursor-pointer"
                title="Select Language"
              >
                <span>{currentLangObj.flag}</span>
                <span className="text-xs">{currentLangObj.name.split(' ')[0]}</span>
                <Globe className="w-3.5 h-3.5 text-amber-300 ml-0.5" />
              </button>

              <div className="hidden sm:flex items-center gap-2">
                <a
                  href="/workshops"
                  className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-black text-xs rounded-full shadow-xs transition-transform active:scale-95 text-center uppercase tracking-wider whitespace-nowrap"
                >
                  Join Workshop
                </a>
                <a
                  href="/sadhana/live"
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 font-black text-xs rounded-full shadow-xs transition-transform active:scale-95 text-center uppercase tracking-wider whitespace-nowrap"
                >
                  Daily Sadhana
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HEADER BUTTONS (Exact 4 buttons: Videos, Shorts, Playlist, Post) */}
      {/* MOBILE VIEW (Strictly untouched for Android mobile app) */}
      <nav className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-200/90 shadow-xs">
        <div className="max-w-md mx-auto px-2 py-2">
          <div className="grid grid-cols-4 gap-2 sm:gap-3 items-center justify-items-center w-full">
            {/* 1. Videos (Play button) */}
            <button
              type="button"
              onClick={() => setActiveTab('videos')}
              className={`w-full aspect-square max-w-[70px] sm:max-w-[78px] flex flex-col items-center justify-center p-1.5 rounded-2xl transition-all cursor-pointer group ${
                activeTab === 'videos'
                  ? 'bg-white border-2 border-blue-600 shadow-xs ring-2 ring-blue-500/20'
                  : 'bg-white border border-gray-200/90 hover:border-blue-300 hover:bg-blue-50/40 shadow-2xs'
              }`}
            >
              <Play className="w-5 h-5 text-blue-600 fill-blue-600 group-hover:scale-110 transition-transform flex-shrink-0" />
              <span className={`text-[10px] sm:text-[11px] mt-1 tracking-tight leading-none truncate ${
                activeTab === 'videos' ? 'font-bold text-blue-900' : 'font-medium text-gray-700 group-hover:text-blue-900'
              }`}>
                Videos
              </span>
            </button>

            {/* 2. Shorts */}
            <button
              type="button"
              onClick={() => setActiveTab('shorts')}
              className={`relative w-full aspect-square max-w-[70px] sm:max-w-[78px] flex flex-col items-center justify-center p-1.5 rounded-2xl transition-all cursor-pointer group ${
                activeTab === 'shorts'
                  ? 'bg-white border-2 border-red-600 shadow-xs ring-2 ring-red-500/20'
                  : 'bg-white border border-gray-200/90 hover:border-red-300 hover:bg-red-50/40 shadow-2xs'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Zap className="w-5 h-5 text-red-600 fill-red-600 group-hover:scale-110 transition-transform flex-shrink-0" />
                <span className="absolute -top-1 -right-2.5 bg-red-600 text-white text-[7px] font-black px-0.5 rounded-sm leading-none">
                  9:16
                </span>
              </div>
              <span className={`text-[10px] sm:text-[11px] mt-1 tracking-tight leading-none truncate ${
                activeTab === 'shorts' ? 'font-bold text-red-900' : 'font-medium text-gray-700 group-hover:text-red-900'
              }`}>
                Shorts
              </span>
            </button>

            {/* 3. Playlist */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('playlists');
                setPlaylistSubTab('my_playlist');
              }}
              className={`w-full aspect-square max-w-[70px] sm:max-w-[78px] flex flex-col items-center justify-center p-1.5 rounded-2xl transition-all cursor-pointer group ${
                activeTab === 'playlists'
                  ? 'bg-white border-2 border-purple-600 shadow-xs ring-2 ring-purple-500/20'
                  : 'bg-white border border-gray-200/90 hover:border-purple-300 hover:bg-purple-50/40 shadow-2xs'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Film className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform flex-shrink-0" />
                {myPlaylist.length > 0 && (
                  <span className="absolute -top-1 -right-2.5 bg-purple-600 text-white text-[8px] font-black px-1 rounded-full leading-none">
                    {myPlaylist.length}
                  </span>
                )}
              </div>
              <span className={`text-[10px] sm:text-[11px] mt-1 tracking-tight leading-none truncate ${
                activeTab === 'playlists' ? 'font-bold text-purple-900' : 'font-medium text-gray-700 group-hover:text-purple-900'
              }`}>
                Playlist
              </span>
            </button>

            {/* 4. Post */}
            <button
              type="button"
              onClick={() => setActiveTab('posts')}
              className={`w-full aspect-square max-w-[70px] sm:max-w-[78px] flex flex-col items-center justify-center p-1.5 rounded-2xl transition-all cursor-pointer group ${
                activeTab === 'posts'
                  ? 'bg-white border-2 border-emerald-600 shadow-xs ring-2 ring-emerald-500/20'
                  : 'bg-white border border-gray-200/90 hover:border-emerald-300 hover:bg-emerald-50/40 shadow-2xs'
              }`}
            >
              <MessageSquare className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform flex-shrink-0" />
              <span className={`text-[10px] sm:text-[11px] mt-1 tracking-tight leading-none truncate ${
                activeTab === 'posts' ? 'font-bold text-emerald-900' : 'font-medium text-gray-700 group-hover:text-emerald-900'
              }`}>
                Post
              </span>
            </button>
          </div>
        </div>

        {/* Orange accent line at bottom identical to user's reference image */}
        <div className="h-0.5 bg-[#FF6B35] w-full" />
      </nav>

      {/* Language Selection Modal (Clean & Interactive, Default Hindi) */}
      {isLangDropdownOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setIsLangDropdownOpen(false)}
          />
          <div className="relative bg-white text-gray-900 rounded-3xl shadow-2xl max-w-md w-full p-5 border border-gray-200 z-10 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 leading-tight">Select Language / भाषा चुनें</h3>
                  <p className="text-xs text-emerald-700 font-semibold">Default: Hindi (हिंदी)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLangDropdownOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 max-h-[60vh] overflow-y-auto pr-1">
              {WORKSHOP_LANGUAGES.map((lang) => {
                const isSelected = selectedLang === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      setSelectedLang(lang.code);
                      setIsLangDropdownOpen(false);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-500/30'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl shrink-0">{lang.flag}</span>
                      <div className="truncate">
                        <div className="text-xs font-semibold truncate leading-tight">{lang.name.split(' ')[0]}</div>
                        {lang.code === 'hi' && (
                          <span className="text-[10px] text-emerald-700 font-bold">Default</span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 ml-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT CANVAS (Clean White Background identical to YouTube) */}
      <section className="flex-1 w-full bg-[#fcfcfc] text-slate-900 min-h-[70vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-6 w-full space-y-3.5">
          
          {/* DESKTOP WEBSITE HEADER BANNER (Hidden on mobile to preserve Android app settings) */}
          <section className="hidden md:block relative w-full md:h-52 lg:h-64 xl:h-72 rounded-2xl overflow-hidden shadow-sm border border-gray-200/80 group bg-slate-950">
            <img
              src="/images/media-channel-banner.jpg"
              alt="Swar Yoga"
              className="w-full h-full object-cover object-center group-hover:scale-101 transition-transform duration-700"
            />
            {/* Only "Swar Yoga" in small */}
            <div className="absolute bottom-2.5 left-3.5 z-10">
              <span className="text-[10px] font-bold tracking-wider text-white drop-shadow-md bg-black/45 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-white/20">
                Swar Yoga
              </span>
            </div>
          </section>

          {/* DESKTOP CHANNEL TABS (Placed BELOW Hero Image on website page) */}
          <div className="hidden md:block sticky top-0 z-30 bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200/90 shadow-xs px-6 py-2.5">
            <div className="flex items-center justify-between gap-4">
              {/* Desktop Tabs */}
              <div className="flex items-center gap-2.5">
                {/* 1. Videos */}
                <button
                  type="button"
                  onClick={() => setActiveTab('videos')}
                  className={`px-5 py-2 rounded-full font-bold text-sm lg:text-base flex items-center gap-2.5 transition-all cursor-pointer ${
                    activeTab === 'videos'
                      ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-500/20'
                      : 'bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-700'
                  }`}
                >
                  <Play className={`w-4 h-4 ${activeTab === 'videos' ? 'fill-white text-white' : 'text-blue-600 fill-blue-600'}`} />
                  <span>Video Lectures</span>
                </button>

                {/* 2. Shorts */}
                <button
                  type="button"
                  onClick={() => setActiveTab('shorts')}
                  className={`relative px-5 py-2 rounded-full font-bold text-sm lg:text-base flex items-center gap-2.5 transition-all cursor-pointer ${
                    activeTab === 'shorts'
                      ? 'bg-red-600 text-white shadow-xs ring-2 ring-red-500/20'
                      : 'bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-700'
                  }`}
                >
                  <Zap className={`w-4 h-4 ${activeTab === 'shorts' ? 'fill-white text-white' : 'text-red-600 fill-red-600'}`} />
                  <span>Shorts</span>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-sm leading-none ${
                    activeTab === 'shorts' ? 'bg-white text-red-600' : 'bg-red-600 text-white'
                  }`}>
                    9:16
                  </span>
                </button>

                {/* 3. Live */}
                <button
                  type="button"
                  onClick={() => setActiveTab('live')}
                  className={`relative px-5 py-2 rounded-full font-bold text-sm lg:text-base flex items-center gap-2.5 transition-all cursor-pointer ${
                    activeTab === 'live'
                      ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-500/20'
                      : 'bg-gray-100 hover:bg-rose-50 text-gray-700 hover:text-rose-700'
                  }`}
                >
                  <div className="relative flex items-center justify-center">
                    <Radio className={`w-4 h-4 ${activeTab === 'live' ? 'text-white' : 'text-rose-600'}`} />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  </div>
                  <span>Live</span>
                </button>

                {/* 4. Playlist */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('playlists');
                    setPlaylistSubTab('my_playlist');
                  }}
                  className={`relative px-5 py-2 rounded-full font-bold text-sm lg:text-base flex items-center gap-2.5 transition-all cursor-pointer ${
                    activeTab === 'playlists'
                      ? 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-500/20'
                      : 'bg-gray-100 hover:bg-purple-50 text-gray-700 hover:text-purple-700'
                  }`}
                >
                  <Film className={`w-4 h-4 ${activeTab === 'playlists' ? 'text-white' : 'text-purple-600'}`} />
                  <span>Playlists</span>
                  {myPlaylist.length > 0 && (
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none ${
                      activeTab === 'playlists' ? 'bg-white text-purple-700' : 'bg-purple-600 text-white'
                    }`}>
                      {myPlaylist.length}
                    </span>
                  )}
                </button>

                {/* 5. Community Posts */}
                <button
                  type="button"
                  onClick={() => setActiveTab('posts')}
                  className={`px-5 py-2 rounded-full font-bold text-sm lg:text-base flex items-center gap-2.5 transition-all cursor-pointer ${
                    activeTab === 'posts'
                      ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/20'
                      : 'bg-gray-100 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700'
                  }`}
                >
                  <MessageSquare className={`w-4 h-4 ${activeTab === 'posts' ? 'text-white' : 'text-emerald-600'}`} />
                  <span>Community Posts</span>
                </button>
              </div>

              {/* Desktop Language Switcher Quick Access */}
              <button
                type="button"
                onClick={() => setIsLangDropdownOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer shadow-2xs"
              >
                <Globe className="w-4 h-4 text-emerald-600" />
                <span>{WORKSHOP_LANGUAGES.find((l) => l.code === selectedLang)?.name.split(' ')[0] || 'Hindi'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* MEDIA SEARCH ENGINE: Search by Word or Number across Videos, Shorts, Playlists, Posts, Live */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-2.5 sm:p-3 shadow-xs space-y-2">
            <div className="relative flex items-center w-full">
              <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-gray-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setSearchQuery(searchInput.trim());
                  }
                }}
                placeholder={
                  selectedLang === 'hi'
                    ? 'शब्द या नंबर खोजें (उदा. 1, स्वर, प्राणायाम, 10m, नींद, #3)...'
                    : 'Search by word or number (e.g. 1, swar, breath, 10m, sleep, #3)...'
                }
                className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-gray-200 focus:border-blue-500 rounded-xl pl-10 pr-20 py-2 sm:py-2.5 text-xs sm:text-sm text-slate-900 placeholder-gray-400 focus:outline-none transition-all"
              />
              <div className="absolute right-2.5 flex items-center gap-1.5">
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      setSearchQuery('');
                    }}
                    className="p-1 rounded-full text-gray-400 hover:text-slate-800 hover:bg-gray-200 text-xs transition-colors cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSearchQuery(searchInput.trim())}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-xs flex items-center gap-1"
                >
                  <span>Search</span>
                </button>
              </div>
            </div>

            {/* Quick Word & Number Filter Suggestions */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px] pt-0.5">
              <span className="text-gray-400 font-medium shrink-0 ml-1">Quick:</span>
              {[
                { label: 'Swar Yoga', val: 'Swar Yoga' },
                { label: 'Day 1', val: 'Day 1' },
                { label: 'Chandra Nadi', val: 'Chandra' },
                { label: 'Surya Nadi', val: 'Surya' },
                { label: 'Morning Sadhana', val: 'Sadhana' },
                { label: '5 min', val: '5' },
                { label: 'Ayurveda', val: 'Ayurveda' },
              ].map((pill) => (
                <button
                  key={pill.val}
                  type="button"
                  onClick={() => {
                    setSearchInput(pill.val);
                    setSearchQuery(pill.val);
                  }}
                  className={`px-2.5 py-0.5 rounded-full border transition-all cursor-pointer shrink-0 font-medium ${
                    searchInput === pill.val
                      ? 'bg-blue-600 text-white border-blue-600 font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/80'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Active Search Result Feedback Banner */}
            {searchQuery.trim() && (
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-blue-900 font-medium">
                <div className="flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>
                    {selectedLang === 'hi'
                      ? `"${searchQuery}" के लिए ${mediaItems.length} परिणाम मिले`
                      : `Found ${mediaItems.length} result${mediaItems.length === 1 ? '' : 's'} matching "${searchQuery}"`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setSearchQuery('');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                >
                  {selectedLang === 'hi' ? 'खोज हटाएं' : 'Reset search'}
                </button>
              </div>
            )}
          </div>

          {/* Sub-Category Filter Chips Bar (YouTube style) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {/* Quick My Playlist Jump Button */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('playlists');
                setPlaylistSubTab('my_playlist');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'playlists' && playlistSubTab === 'my_playlist'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 fill-purple-600 text-purple-600" />
              <span>My Playlist ({myPlaylist.length})</span>
            </button>

            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 animate-pulse">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="space-y-3">
                  <div className="w-full aspect-video bg-slate-100 rounded-2xl" />
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3.5 bg-slate-100 rounded w-5/6" />
                      <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : mediaItems.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400">
                <Video className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No content found in this section</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                We are constantly updating video lectures, shorts, and recipes in {currentLangObj.name}. Try switching languages or check another tab!
              </p>
            </div>
          ) : (
            <>
              {/* 1. VIDEOS TAB VIEW */}
              {activeTab === 'videos' && (
                <div className="space-y-7">
                  {/* Regular Long-form Videos Grid */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                      <Play className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                      <h3 className="text-base font-extrabold text-slate-900">
                        Featured Video Lectures &amp; Deep Dives
                      </h3>
                      <span className="text-xs text-slate-500 font-semibold ml-auto">
                        {mediaItems.length} Videos
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-7">
                      {mediaItems.map((video) => {
                        const isVideoSaved = myPlaylist.some(p => p.id === video.id);
                        return (
                          <div
                            key={video.id}
                            onClick={() => setActivePlayerItem(video)}
                            className="group cursor-pointer flex flex-col space-y-2.5"
                          >
                            {/* Thumbnail with 16:9 ratio and duration badge */}
                            <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-100 shadow-sm group-hover:shadow-md transition-all duration-300">
                              {video.thumbnailUrl ? (
                                <img
                                  src={video.thumbnailUrl}
                                  alt={video.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-600">
                                  <Play className="w-10 h-10 group-hover:text-emerald-700 transition-colors" />
                                </div>
                              )}

                              {/* Duration badge */}
                              <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/85 text-[11px] font-bold text-white rounded">
                                {formatDuration(video.durationSeconds)}
                              </span>

                              {/* Language pill */}
                              <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/75 backdrop-blur-md text-[10px] font-bold text-emerald-300 rounded-md border border-emerald-500/20">
                                {currentLangObj.flag} {currentLangObj.name.split(' ')[0]}
                              </span>

                              {/* + Add to My Playlist Button */}
                              <button
                                type="button"
                                onClick={(e) => toggleSaveToPlaylist(video, e)}
                                className={`absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1 rounded-full backdrop-blur-md shadow-md transition-all active:scale-95 cursor-pointer z-30 border ${
                                  isVideoSaved
                                    ? 'bg-emerald-600 text-white border-emerald-400 font-bold text-[11px]'
                                    : 'bg-black/80 hover:bg-black text-white hover:text-emerald-300 border-white/30 text-[11px] font-semibold'
                                }`}
                                title={isVideoSaved ? 'Saved in My Playlist' : 'Add to My Playlist (+)'}
                                aria-label="Add to My Playlist"
                              >
                                {isVideoSaved ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 stroke-[3] text-white" />
                                    <span>Saved</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3.5 h-3.5 stroke-[3] text-white" />
                                    <span>Playlist</span>
                                  </>
                                )}
                              </button>

                              {/* Play overlay button on hover */}
                              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xl">
                                  <Play className="w-6 h-6 fill-white ml-0.5" />
                                </div>
                              </div>
                            </div>

                            {/* Metadata: Channel Avatar + Title + Views */}
                            <div className="flex gap-3">
                              <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 mt-0.5 ring-1 ring-slate-200">
                                <img
                                  src="https://swaryogacrm.b-cdn.net/mohan.jpg"
                                  alt="Mohan Sir"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-emerald-700 transition-colors">
                                  {video.title}
                                </h3>
                                <div className="text-xs text-slate-600 mt-1">
                                  <p className="hover:text-slate-900 font-medium">Swar Yoga with Mohan Sir</p>
                                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                                    <span>{(video.viewsCount || 1240).toLocaleString()} views</span>
                                    <span>•</span>
                                    <span>{formatTimeAgo(video.createdAt)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. SHORTS TAB VIEW: 1st line horizontal scrollable shelf + Topic Clusters */}
              {activeTab === 'shorts' && (
                <div className="space-y-8">
                  {/* 1st Line of Shorts: Scrollable Left to Right and Right to Left */}
                  {renderHorizontalShortsShelf(
                    'Shorts',
                    'Quick breath & health wisdom in under 60 seconds'
                  )}

                  {/* Topic Sections */}
                  <div className="space-y-8 pt-2">
                    {topicSections.map(({ topic, shorts }) => (
                      <div key={topic.id} className="space-y-3 bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl shrink-0">{topic.icon}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
                                  {selectedLang === 'hi' ? topic.nameHi : topic.name}
                                </h4>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${topic.badgeBg}`}>
                                  {shorts.length} Shorts
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {selectedLang === 'hi' ? topic.descriptionHi : topic.description}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Topic Videos in responsive grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-1">
                          {shorts.map((short) => renderShortCard(short, topic))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* 2. PLAYLISTS TAB VIEW: My Playlist + Official Series */}
            {activeTab === 'playlists' && (
              <div className="space-y-6">
                {/* Playlist Sub-Navigation Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPlaylistSubTab('my_playlist')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        playlistSubTab === 'my_playlist'
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <Bookmark className="w-4 h-4 fill-current" />
                      <span>My Playlist / मेरी प्लेलिस्ट ({myPlaylist.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPlaylistSubTab('official')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        playlistSubTab === 'official'
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                      <span>Official Swar Yoga Series</span>
                    </button>
                  </div>

                  {playlistSubTab === 'my_playlist' && myPlaylist.length > 0 && (
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setActivePlayerItem(myPlaylist[0])}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>▶ Play All</span>
                      </button>
                      <button
                        type="button"
                        onClick={clearMyPlaylist}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
                        title="Clear Playlist"
                        aria-label="Clear Playlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear All</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* SubTab 1: MY PLAYLIST (User's Added Videos to watch later or repeat) */}
                {playlistSubTab === 'my_playlist' && (
                  <div>
                    {myPlaylist.length === 0 ? (
                      <div className="py-16 text-center flex flex-col items-center justify-center space-y-3 bg-white border border-dashed border-slate-300 rounded-3xl p-6">
                        <div className="w-16 h-16 rounded-3xl bg-purple-50 text-purple-600 flex items-center justify-center">
                          <ListMusic className="w-8 h-8" />
                        </div>
                        <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                          Your Playlist is Empty / आपकी प्लेलिस्ट अभी खाली है
                        </h3>
                        <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                          Tap the <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 text-white text-xs font-bold">+</span> button on any video or short while watching or browsing to add it here. You can repeat and watch them anytime!
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveTab('videos')}
                          className="mt-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
                        >
                          Browse Videos &amp; Shorts →
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{myPlaylist.length} saved video(s) ready to repeat and practice</span>
                          <span className="font-semibold text-emerald-700">Auto-saved to your device</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                          {displayedMyPlaylist.map((item) => (
                            <div
                              key={item.id}
                              className="group bg-white border border-slate-200/80 rounded-2xl p-2.5 shadow-xs hover:shadow-md transition-all flex flex-col space-y-2 relative"
                            >
                              {/* Thumbnail */}
                              <div
                                onClick={() => setActivePlayerItem(item)}
                                className={`relative ${item.type === 'shorts' ? 'aspect-[9/16] max-h-72 mx-auto w-full' : 'aspect-video w-full'} rounded-xl overflow-hidden bg-slate-900 cursor-pointer shadow-inner`}
                              >
                                {item.thumbnailUrl ? (
                                  <img
                                    src={item.thumbnailUrl}
                                    alt={item.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400">
                                    <Play className="w-8 h-8" />
                                  </div>
                                )}

                                <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/85 text-[10px] font-bold text-white rounded">
                                  {formatDuration(item.durationSeconds)}
                                </span>

                                <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/75 backdrop-blur-md text-[10px] font-bold text-emerald-300 rounded uppercase">
                                  {item.type}
                                </span>

                                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg">
                                    <Play className="w-5 h-5 fill-white ml-0.5" />
                                  </div>
                                </div>
                              </div>

                              {/* Title & Metadata */}
                              <div className="flex-1 flex flex-col justify-between">
                                <h4
                                  onClick={() => setActivePlayerItem(item)}
                                  className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug cursor-pointer group-hover:text-emerald-700 transition-colors"
                                >
                                  {item.title}
                                </h4>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2 text-[11px] text-slate-500">
                                  <span>{(item.viewsCount || 200000).toLocaleString()} views</span>
                                  <button
                                    type="button"
                                    onClick={(e) => removeFromMyPlaylist(item.id, e)}
                                    className="flex items-center gap-1 text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                                    title="Remove from My Playlist"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Remove</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SubTab 2: OFFICIAL PLAYLISTS */}
                {playlistSubTab === 'official' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {mediaItems.map((playlist) => (
                      <div
                        key={playlist.id}
                        onClick={() => setActivePlayerItem(playlist)}
                        className="group cursor-pointer space-y-2.5 bg-white border border-slate-200/80 rounded-2xl p-2.5 shadow-xs hover:shadow-md transition-all"
                      >
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-[#181818] shadow-md">
                          {playlist.thumbnailUrl ? (
                            <img
                              src={playlist.thumbnailUrl}
                              alt={playlist.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-indigo-950/40 text-indigo-400">
                              <Film className="w-10 h-10" />
                            </div>
                          )}
                          <div className="absolute right-0 inset-y-0 w-2/5 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center text-white border-l border-white/10">
                            <Layers className="w-5 h-5 mb-1" />
                            <span className="text-xs font-bold">12 Videos</span>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-purple-700">
                            {playlist.title}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">Official Course Series • Swar Yoga</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. COMMUNITY POSTS TAB VIEW */}
            {activeTab === 'posts' && (
              <div className="max-w-2xl mx-auto space-y-6">
                {mediaItems.map((post) => (
                  <div
                    key={post.id}
                    className="bg-[#181818] border border-[#2b2b2b] rounded-3xl p-5 shadow-xl space-y-4"
                  >
                    {/* Creator Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-purple-500/40">
                          <img
                            src="https://swaryogacrm.b-cdn.net/mohan.jpg"
                            alt="Mohan Sir"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-bold text-white">Swar Yoga with Mohan Sir</h4>
                            <span className="text-[10px] px-1.5 py-0.2 bg-purple-500/20 text-purple-300 rounded font-semibold">
                              Host
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">{formatTimeAgo(post.createdAt)}</span>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-bold">
                        {currentLangObj.flag} {currentLangObj.name.split(' ')[0]}
                      </span>
                    </div>

                    {/* Post Content */}
                    <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                      {post.description || post.title}
                    </p>

                    {/* Post Attached Media */}
                    {(post.thumbnailUrl || post.mediaUrl) && (
                      <div className="rounded-2xl overflow-hidden border border-slate-800 bg-black">
                        <img
                          src={post.thumbnailUrl || post.mediaUrl}
                          alt="Post media"
                          className="w-full max-h-96 object-contain"
                        />
                      </div>
                    )}

                    {/* Likes & Interaction footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-[#252525] text-xs text-slate-400">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          className="flex items-center gap-1.5 hover:text-white transition-colors"
                        >
                          <ThumbsUp className="w-4 h-4" />
                          <span>{(post.likesCount || 85).toLocaleString()}</span>
                        </button>
                        <button
                          type="button"
                          className="flex items-center gap-1.5 hover:text-white transition-colors"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>24 Comments</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({ title: post.title, url: window.location.href });
                          }
                        }}
                        className="flex items-center gap-1 hover:text-white"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 4. LIVE SESSIONS TAB VIEW */}
            {activeTab === 'live' && (
              <div className="space-y-8">
                {/* Featured Live Banner (Light Green Theme as requested) */}
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50/70 to-green-100/90 border border-emerald-200/90 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-3">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-black shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                        <span>LIVE NOW / UPCOMING WORKSHOP</span>
                      </div>
                      <h2 className="text-xl sm:text-3xl font-extrabold text-emerald-950 tracking-tight">
                        Swar Yoga Morning Sadhana with Mohan Sir
                      </h2>
                      <p className="text-xs sm:text-sm text-emerald-800/90 font-medium max-w-xl leading-relaxed">
                        Interactive morning pranayama, breath rhythm harmonization, and live Q&amp;A directly with Mohan Sir. Broadcasted simultaneously in English, Hindi, and regional languages.
                      </p>
                      <div className="flex items-center gap-3 pt-2">
                        <a
                          href="/sadhana/live"
                          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/25 flex items-center gap-2 transition-transform active:scale-95"
                        >
                          <Radio className="w-4 h-4 text-white" />
                          <span>Join Live Stream</span>
                        </a>
                        <span className="text-xs text-emerald-700 font-bold">Every Morning 5:00 AM IST</span>
                      </div>
                    </div>

                    <div className="w-full md:w-80 aspect-video rounded-2xl overflow-hidden border border-emerald-300/80 relative shadow-xl bg-emerald-950">
                      <img
                        src="https://swaryogacrm.b-cdn.net/mohan.jpg"
                        alt="Mohan Sir Live"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg">
                          <Play className="w-6 h-6 fill-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Past Live Sessions Archive Grid */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-600" />
                    <span>Past Recorded Live Workshops &amp; Sadhana Replays</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    {mediaItems.map((live) => (
                      <div
                        key={live.id}
                        onClick={() => setActivePlayerItem(live)}
                        className="group cursor-pointer space-y-2.5"
                      >
                        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-md">
                          {live.thumbnailUrl ? (
                            <img
                              src={live.thumbnailUrl}
                              alt={live.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-600">
                              <Radio className="w-8 h-8" />
                            </div>
                          )}
                          <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded flex items-center gap-1">
                            LIVE REPLAY
                          </div>
                          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/85 text-[10px] font-bold text-white rounded">
                            {formatDuration(live.durationSeconds)}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 group-hover:text-red-300">
                            {live.title}
                          </h4>
                          <span className="text-[11px] text-slate-500">{formatTimeAgo(live.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        </div>
      </section>

      {/* THEATER MODE VIDEO PLAYER MODAL */}
      {activePlayerItem && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl overflow-y-auto flex flex-col items-center justify-start p-0 sm:p-4 md:p-6">
          <div className="relative w-full max-w-5xl bg-[#141414] border-0 sm:border border-[#2b2b2b] rounded-none sm:rounded-3xl shadow-2xl flex flex-col my-0 sm:my-auto min-h-screen sm:min-h-0">
            {/* Modal Header Bar with Back Button - STICKY so it's ALWAYS visible at top */}
            <div className="sticky top-0 z-50 flex items-center justify-between p-3 sm:p-4 border-b border-[#242424] bg-[#1a1a1a]/95 backdrop-blur-md shadow-md">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setActivePlayerItem(null)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-md transition-all cursor-pointer mr-1 shrink-0"
                  title="Back to Media Feed"
                  aria-label="Back to Media Feed"
                >
                  <ArrowLeft className="w-4 h-4 text-white stroke-[2.5]" />
                  <span>Back</span>
                </button>
                <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-black rounded uppercase shrink-0">
                  {activePlayerItem.type}
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-xs sm:max-w-xl">
                  {activePlayerItem.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePlayerItem(null)}
                className="p-1.5 text-slate-300 hover:text-white rounded-full bg-[#272727] hover:bg-[#383838] transition-colors cursor-pointer shrink-0 ml-2"
                title="Close"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Viewport (Responsive with YouTube iframe support) */}
            <div className={`relative ${activePlayerItem.type === 'shorts' ? 'aspect-[9/16] max-h-[70vh] mx-auto w-full max-w-sm' : 'aspect-video w-full'} bg-black flex items-center justify-center overflow-hidden`}>
              {(() => {
                const embed = getYouTubeEmbedUrl(activePlayerItem.mediaUrl);
                if (embed) {
                  return (
                    <iframe
                      src={embed}
                      title={activePlayerItem.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  );
                }
                if (activePlayerItem.mediaUrl && (activePlayerItem.mediaUrl.endsWith('.mp4') || activePlayerItem.mediaUrl.includes('b-cdn.net'))) {
                  return (
                    <video
                      src={activePlayerItem.mediaUrl}
                      controls
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  );
                }
                return (
                  <iframe
                    src="https://www.youtube.com/embed/luSaTlBXssM?autoplay=1&rel=0"
                    title={activePlayerItem.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                );
              })()}

              {/* LIVE STRIP TICKER OVERLAY (configured in Studio) */}
              {activePlayerItem.overlayStrip?.enabled && activePlayerItem.overlayStrip?.stripText && (
                <div
                  className={`absolute ${
                    activePlayerItem.overlayStrip.position === 'bottom' ? 'bottom-3' : 'top-3'
                  } inset-x-3 z-30 bg-gradient-to-r from-rose-600/95 via-red-600/95 to-orange-600/95 text-white px-3.5 py-1.5 rounded-xl shadow-xl flex items-center justify-between text-xs font-bold backdrop-blur-md border border-white/20`}
                >
                  <div className="flex items-center gap-2 truncate mr-2">
                    <Radio className="w-3.5 h-3.5 animate-pulse text-amber-200 shrink-0" />
                    <span className="truncate">{activePlayerItem.overlayStrip.stripText}</span>
                  </div>
                  {activePlayerItem.overlayStrip.stripLinkText && (
                    <a
                      href={activePlayerItem.overlayStrip.stripLinkUrl || '/workshops'}
                      className="px-2.5 py-1 bg-white text-rose-700 hover:bg-amber-100 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider shrink-0 transition-transform active:scale-95 shadow-xs"
                    >
                      {activePlayerItem.overlayStrip.stripLinkText}
                    </a>
                  )}
                </div>
              )}

              {/* MID-VIDEO POPUP MODAL (configured in Studio) */}
              {showMidVideoPopup && activePlayerItem.overlayStrip?.popupEnabled && (
                <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-[#181818] border border-amber-500/50 rounded-2xl p-5 max-w-sm w-full text-center space-y-3 shadow-2xl relative">
                    <button
                      type="button"
                      onClick={() => setShowMidVideoPopup(false)}
                      className="absolute top-3 right-3 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-amber-500 text-black font-black flex items-center justify-center mx-auto text-lg">
                      ॐ
                    </div>
                    <h4 className="text-sm font-bold text-white">
                      {activePlayerItem.overlayStrip.popupTitle || 'Exclusive Swar Yoga Sadhana'}
                    </h4>
                    <p className="text-xs text-slate-300">
                      {activePlayerItem.overlayStrip.popupMessage || 'Join our online sadhana sessions.'}
                    </p>
                    <div className="flex gap-2 pt-1">
                      <a
                        href={activePlayerItem.overlayStrip.popupLinkUrl || '/workshops'}
                        className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold text-xs rounded-xl shadow text-center"
                      >
                        {activePlayerItem.overlayStrip.popupLinkText || 'Learn More'}
                      </a>
                      <button
                        type="button"
                        onClick={() => setShowMidVideoPopup(false)}
                        className="px-3 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl"
                      >
                        Continue Video
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Video Info & Channel footer */}
            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full overflow-hidden border border-purple-500/50">
                    <img
                      src="https://swaryogacrm.b-cdn.net/mohan.jpg"
                      alt="Mohan Sir"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Swar Yoga with Mohan Sir</h4>
                    <p className="text-xs text-slate-400">100K+ Sadhaks • Verified Channel</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLikedMap(prev => ({ ...prev, [activePlayerItem.id]: !prev[activePlayerItem.id] }));
                      setDislikedMap(prev => ({ ...prev, [activePlayerItem.id]: false }));
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-full transition-colors cursor-pointer ${
                      likedMap[activePlayerItem.id]
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#272727] hover:bg-[#333] text-white'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>Like ({((activePlayerItem.likesCount || 120) + (likedMap[activePlayerItem.id] ? 1 : 0)).toLocaleString()})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: activePlayerItem.title, url: window.location.href });
                      } else if (navigator.clipboard) {
                        navigator.clipboard.writeText(window.location.href);
                        showToast('Link copied to clipboard!');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#272727] hover:bg-[#333] text-white text-xs font-bold rounded-full transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </button>
                  {/* Learn More in Red, Square/Rectangular Button */}
                  <a
                    href={(activePlayerItem as any).redirectUrl || (activePlayerItem as any).learnMoreUrl || '/workshops'}
                    className="flex items-center gap-1.5 px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-md shadow-lg transition-all active:scale-95 cursor-pointer uppercase tracking-wider"
                  >
                    <span>Learn More</span>
                    <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                  </a>
                </div>
              </div>

              {/* Description Box */}
              <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-2xl p-4 text-xs text-slate-300 space-y-2">
                <div className="flex items-center gap-3 text-[11px] text-slate-400 font-semibold">
                  <span>{(activePlayerItem.viewsCount || 2300).toLocaleString()} views</span>
                  <span>•</span>
                  <span>Published {formatTimeAgo(activePlayerItem.createdAt)}</span>
                  <span>•</span>
                  <span>Language: {currentLangObj.name}</span>
                </div>
                <p className="whitespace-pre-line leading-relaxed">
                  {activePlayerItem.description || 'No detailed description provided.'}
                </p>
              </div>

              {/* Related Shorts */}
              {modalTopicRecommendations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#262626] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <h4 className="text-xs sm:text-sm font-bold text-white">
                        Related Shorts ({modalTopicRecommendations.length})
                      </h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {modalTopicRecommendations.map((rShort) => (
                      <div
                        key={rShort.id}
                        onClick={() => setActivePlayerItem(rShort)}
                        className="group cursor-pointer bg-[#1c1c1c] hover:bg-[#252525] p-2 rounded-xl border border-white/5 hover:border-emerald-500/40 transition-all flex flex-col space-y-1.5"
                      >
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                          {rShort.thumbnailUrl ? (
                            <img
                              src={rShort.thumbnailUrl}
                              alt={rShort.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-500">
                              <Zap className="w-5 h-5 text-amber-400" />
                            </div>
                          )}
                          <span className="absolute bottom-1 right-1 px-1 bg-black/80 text-[9px] font-bold text-white rounded">
                            {formatDuration(rShort.durationSeconds)}
                          </span>
                        </div>
                        <h5 className="text-[11px] font-bold text-white line-clamp-2 leading-snug group-hover:text-emerald-300 transition-colors">
                          {rShort.title}
                        </h5>
                        <span className="text-[10px] text-slate-400">
                          {(rShort.viewsCount || 200000).toLocaleString()} views
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Community Comments Section */}
              <div className="mt-4 pt-4 border-t border-[#262626] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-bold text-white">
                      Comments ({currentComments.length})
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 hidden sm:inline">Direct Chat</span>
                    <button
                      type="button"
                      onClick={() => setIsCommentsOpen(!isCommentsOpen)}
                      className="px-2.5 py-1 rounded-lg bg-[#272727] hover:bg-[#333] text-xs font-bold text-slate-300 transition-colors cursor-pointer"
                    >
                      {isCommentsOpen ? 'Hide' : 'Open'}
                    </button>
                  </div>
                </div>

                {isCommentsOpen && (
                  <div className="space-y-4">
                    {/* Quick Reaction Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                      {['🙏 Har Har Mahadev', '🌬️ Chandra Swar active', '🔥 Excellent Mohan Sir!', '🧘 Practicing daily', '💧 Following water rules'].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setCommentInput((prev) => (prev ? `${prev} ${chip}` : chip))}
                          className="shrink-0 px-2.5 py-1 rounded-full bg-[#242424] hover:bg-[#303030] text-slate-300 text-[11px] border border-white/5 transition-all cursor-pointer"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>

                    {/* New Comment Input Box */}
                    <div className="flex gap-2.5 items-start">
                      <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        Y
                      </div>
                      <div className="flex-1 flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddComment();
                          }}
                          placeholder="Add a comment or ask a question to Mohan Sir... / टिप्पणी लिखें..."
                          className="flex-1 bg-[#1c1c1c] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={handleAddComment}
                          disabled={!commentInput.trim()}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Comment</span>
                        </button>
                      </div>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-3 pt-2 max-h-60 overflow-y-auto pr-1">
                      {currentComments.map((comm) => (
                        <div key={comm.id} className="flex gap-2.5 items-start bg-[#191919] p-2.5 rounded-xl border border-white/5">
                          {comm.avatar ? (
                            <img
                              src={comm.avatar}
                              alt={comm.author}
                              className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-purple-800 text-purple-200 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                              {comm.author.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-200">{comm.author}</span>
                              <span className="text-[10px] text-slate-500">{comm.timeAgo}</span>
                            </div>
                            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                              {comm.text}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                              <button
                                type="button"
                                onClick={() => handleLikeComment(comm.id)}
                                className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                              >
                                <ThumbsUp className="w-3 h-3" />
                                <span>{comm.likes}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setCommentInput(`@${comm.author} `)}
                                className="hover:text-white transition-colors cursor-pointer"
                              >
                                Reply
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(comm.id)}
                                className="flex items-center gap-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer ml-auto"
                                title="Delete this comment (Admin moderation)"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR (Exact 4 buttons: Video, Shorts, Playlist, Post) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0f0f0f]/95 backdrop-blur-lg border-t border-[#282828] px-2 py-2 grid grid-cols-4 items-center text-center text-[10px] text-slate-400">
        <button
          type="button"
          onClick={() => setActiveTab('videos')}
          className={`flex flex-col items-center justify-center gap-1 py-1 transition-colors ${
            activeTab === 'videos' ? 'text-white font-bold' : 'hover:text-slate-200'
          }`}
        >
          <Video className="w-5 h-5" />
          <span>Videos</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('shorts')}
          className={`flex flex-col items-center justify-center gap-1 py-1 transition-colors ${
            activeTab === 'shorts' ? 'text-amber-400 font-bold' : 'hover:text-slate-200'
          }`}
        >
          <Zap className="w-5 h-5" />
          <span>Shorts</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('playlists');
            setPlaylistSubTab('my_playlist');
          }}
          className={`flex flex-col items-center justify-center gap-1 py-1 transition-colors ${
            activeTab === 'playlists' ? 'text-purple-400 font-bold' : 'hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Film className="w-5 h-5" />
            {myPlaylist.length > 0 && (
              <span className="absolute -top-1 -right-2 bg-purple-500 text-white text-[8px] font-black px-1 rounded-full leading-none">
                {myPlaylist.length}
              </span>
            )}
          </div>
          <span>Playlists</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('posts')}
          className={`flex flex-col items-center justify-center gap-1 py-1 transition-colors ${
            activeTab === 'posts' ? 'text-emerald-400 font-bold' : 'hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span>Posts</span>
        </button>
      </div>

      {/* Floating Toast Notification for Playlist & Actions */}
      {playlistToast && (
        <div className="fixed bottom-16 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-2xl border border-emerald-500/40 backdrop-blur-md flex items-center gap-2 pointer-events-none animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{playlistToast}</span>
        </div>
      )}

      {/* PROTECTED VIRAL SHARE: APP DOWNLOAD POPUP MODAL */}
      {showSharedAppPopup && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-amber-500/50 rounded-3xl p-6 max-w-md w-full shadow-2xl relative text-center space-y-4">
            <button
              type="button"
              onClick={() => setShowSharedAppPopup(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800/80 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Logo */}
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 font-black text-3xl flex items-center justify-center mx-auto shadow-xl">
              ॐ
            </div>

            <div>
              <div className="flex items-center justify-center gap-1.5">
                <h3 className="text-base font-extrabold text-white">Swar Yoga Official Platform</h3>
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black flex items-center justify-center">
                  ✓
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                You are watching protected Vedic Swar Yoga content by Mohan Sir.
              </p>
            </div>

            <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800 text-xs text-slate-300 text-left space-y-1.5">
              <div className="font-bold text-amber-300">📱 Watch with Official App Experience:</div>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                <li>Zero buffering &amp; 1080p HD masterclass playback</li>
                <li>Daily Morning Sadhana live reminders &amp; calendar</li>
                <li>Offline repeat practice &amp; nostril cycle timer</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <a
                href="/workshops"
                className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all text-center"
              >
                Download Swar Yoga App
              </a>
              <button
                type="button"
                onClick={() => setShowSharedAppPopup(false)}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Continue on Web
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
