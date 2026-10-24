'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';
import {
  BookOpen,
  ArrowLeft,
  Search,
  Globe,
  Bookmark,
  Clock,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
  CheckCircle,
  BookMarked,
  Menu,
  Sparkles,
  Layers,
  Flame,
  Activity,
  HeartPulse,
  Coins,
  Users,
  Heart,
  Share2,
  Star,
  MessageSquare,
  Laptop,
  Tablet
} from 'lucide-react';
import {
  EBOOK_PILLARS,
  EBOOK_CHAPTERS,
  PILLAR_TOPICS,
  EBookPillar,
  EBookChapter,
  PillarTopic,
  LocalizedString
} from '@/lib/ebookData';

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

// Symbolic Icon: Pregnant Mother with visible womb/stomach curve & tender baby heart
function PregnantMotherIcon({ className = 'w-5 h-5', ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Mother Head */}
      <circle cx="11.5" cy="4" r="2" />
      {/* Back and spine line */}
      <path d="M9 8c-1.4 2.5-1.5 6.5-1 10.5.3 1.8 1.5 2.5 3 2.5" />
      {/* Prominent Pregnant Belly / Womb curvature */}
      <path d="M11.5 7.5c1.6 1 4.5 3.5 4.5 7 0 3-2 4.5-4.5 4.5" />
      {/* Mother's caring hand cradling the stomach */}
      <path d="M8.8 11.5c1.8.4 3.2 1.8 4.2 1.8" />
      {/* Tender baby heart inside the womb */}
      <path
        d="M13.5 14a.9.9 0 0 0-1.2-1.2l-.1.1-.1-.1a.9.9 0 0 0-1.2 1.2l1.3 1.3 1.3-1.3z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

// Color palettes for 2-column topic pills (exact match to user's uploaded reference image)
const TOPIC_PALETTES = [
  { cardBg: 'bg-[#ecfdf5]', borderColor: 'border-[#10b981]', circleBg: 'bg-[#059669]', subtextColor: 'text-[#059669]', icon: HeartPulse },
  { cardBg: 'bg-[#eff6ff]', borderColor: 'border-[#3b82f6]', circleBg: 'bg-[#2563eb]', subtextColor: 'text-[#2563eb]', icon: BookOpen },
  { cardBg: 'bg-[#f3e8ff]', borderColor: 'border-[#a855f7]', circleBg: 'bg-[#6366f1]', subtextColor: 'text-[#6366f1]', icon: Sparkles },
  { cardBg: 'bg-[#f0fdfa]', borderColor: 'border-[#14b8a6]', circleBg: 'bg-[#0d9488]', subtextColor: 'text-[#0d9488]', icon: Activity },
  { cardBg: 'bg-[#faf5ff]', borderColor: 'border-[#c084fc]', circleBg: 'bg-[#9333ea]', subtextColor: 'text-[#9333ea]', icon: Flame },
  { cardBg: 'bg-[#ecfeff]', borderColor: 'border-[#22d3ee]', circleBg: 'bg-[#0284c7]', subtextColor: 'text-[#0284c7]', icon: Users },
  { cardBg: 'bg-[#fdf2f8]', borderColor: 'border-[#f472b6]', circleBg: 'bg-[#db2777]', subtextColor: 'text-[#db2777]', icon: Heart },
  { cardBg: 'bg-[#fffbeb]', borderColor: 'border-[#fbbf24]', circleBg: 'bg-[#d97706]', subtextColor: 'text-[#d97706]', icon: Coins },
  { cardBg: 'bg-[#fff1f2]', borderColor: 'border-[#fb7185]', circleBg: 'bg-[#e11d48]', subtextColor: 'text-[#e11d48]', icon: Clock },
  { cardBg: 'bg-[#fff7ed]', borderColor: 'border-[#fb923c]', circleBg: 'bg-[#ea580c]', subtextColor: 'text-[#ea580c]', icon: Star },
  { cardBg: 'bg-[#f7fee7]', borderColor: 'border-[#a3e635]', circleBg: 'bg-[#65a30d]', subtextColor: 'text-[#65a30d]', icon: Layers },
  { cardBg: 'bg-[#f0f9ff]', borderColor: 'border-[#38bdf8]', circleBg: 'bg-[#0284c7]', subtextColor: 'text-[#0284c7]', icon: Bookmark },
];

export default function BlogEBookPage() {
  // Global Language state (Default Hindi)
  const [selectedLang, setSelectedLang] = useState<string>('hi');
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);

  // Default open pillar: 'health'
  const [activePillar, setActivePillar] = useState<EBookPillar>('health');

  // Dedicated "Topics Page" toggle (3-line menu button)
  const [showTopicsPage, setShowTopicsPage] = useState<boolean>(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Reader Modal State
  const [activeChapter, setActiveChapter] = useState<EBookChapter | null>(null);
  const [readerFontSize, setReaderFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  const [readerLang, setReaderLang] = useState<string>('hi');
  const [savedBookmarks, setSavedBookmarks] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Red Heart Action Menu & Interactions (Like, Comments, Share, Add in my favorite)
  const [heartMenuOpen, setHeartMenuOpen] = useState(false);
  const [likedChapters, setLikedChapters] = useState<string[]>([]);
  const [favoriteChapters, setFavoriteChapters] = useState<string[]>([]);
  const [showCommentDrawer, setShowCommentDrawer] = useState(false);
  const [chapterComments, setChapterComments] = useState<Record<string, string[]>>({});
  const [newCommentText, setNewCommentText] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedBookmarks = localStorage.getItem('swaryoga_ebook_bookmarks');
        if (storedBookmarks) setSavedBookmarks(JSON.parse(storedBookmarks));

        const storedLikes = localStorage.getItem('swaryoga_ebook_likes');
        if (storedLikes) setLikedChapters(JSON.parse(storedLikes));

        const storedFavs = localStorage.getItem('swaryoga_ebook_favorites');
        if (storedFavs) setFavoriteChapters(JSON.parse(storedFavs));

        const storedComments = localStorage.getItem('swaryoga_ebook_comments');
        if (storedComments) setChapterComments(JSON.parse(storedComments));
      } catch (err) {
        console.error('Failed to load storage', err);
      }
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Toggle Like with count
  const handleToggleLike = (chapterId: string) => {
    setLikedChapters((prev) => {
      const isAlready = prev.includes(chapterId);
      const updated = isAlready ? prev.filter((id) => id !== chapterId) : [...prev, chapterId];
      showToast(isAlready ? 'Unliked' : 'Liked this chapter ❤️');
      try {
        localStorage.setItem('swaryoga_ebook_likes', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  // Toggle Favorite
  const handleToggleFavorite = (chapterId: string) => {
    setFavoriteChapters((prev) => {
      const isAlready = prev.includes(chapterId);
      const updated = isAlready ? prev.filter((id) => id !== chapterId) : [...prev, chapterId];
      showToast(isAlready ? 'Removed from Favorites' : 'Added to My Favorites ⭐');
      try {
        localStorage.setItem('swaryoga_ebook_favorites', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  // Share Chapter Link
  const handleShareChapter = (chapter: EBookChapter) => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/blog?chapter=${chapter.id}` : '';
    const title = getLocalized(chapter.title, selectedLang);
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title, text: `Read Swar Yoga: ${title}`, url }).catch(() => {});
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      showToast('Link copied to clipboard! 🔗');
    } else {
      showToast('Sharing link ready! 🔗');
    }
  };

  // Comments Helper
  const getChapterComments = (chapterId: string): string[] => {
    return chapterComments[chapterId] || [
      'अत्यंत ज्ञानवर्धक और व्यावहारिक अध्याय! प्रणाम गुरुजी 🙏',
      'This chapter transformed my daily breathing practice.'
    ];
  };

  const handleAddComment = (chapterId: string) => {
    if (!newCommentText.trim()) return;
    const current = getChapterComments(chapterId);
    const updated = {
      ...chapterComments,
      [chapterId]: [newCommentText.trim(), ...current]
    };
    setChapterComments(updated);
    setNewCommentText('');
    showToast('Comment posted! 💬');
    try {
      localStorage.setItem('swaryoga_ebook_comments', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const getLikeCount = (chapterId: string): number => {
    return 108 + (likedChapters.includes(chapterId) ? 1 : 0);
  };

  const toggleBookmark = (chapterId: string) => {
    setSavedBookmarks((prev) => {
      let updated: string[];
      if (prev.includes(chapterId)) {
        updated = prev.filter((id) => id !== chapterId);
        showToast('Removed from Bookmarks');
      } else {
        updated = [...prev, chapterId];
        showToast('Saved to Bookmarks 🔖');
      }
      try {
        localStorage.setItem('swaryoga_ebook_bookmarks', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  // Helper to extract localized text
  const getLocalized = (field: LocalizedString | undefined, lang: string): string => {
    if (!field) return '';
    const key = lang as keyof LocalizedString;
    return field[key] || field.hi || field.en || '';
  };

  // Filter chapters based on active pillar and search
  const filteredChapters = useMemo(() => {
    return EBOOK_CHAPTERS.filter((chap) => {
      const matchesPillar = chap.pillar === activePillar;
      if (!matchesPillar) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const titleMatch = getLocalized(chap.title, selectedLang).toLowerCase().includes(q);
      const excerptMatch = getLocalized(chap.excerpt, selectedLang).toLowerCase().includes(q);
      const shortNameMatch = getLocalized(chap.shortName, selectedLang).toLowerCase().includes(q);
      const tagMatch = chap.tags.some((t) => t.toLowerCase().includes(q));

      return titleMatch || excerptMatch || shortNameMatch || tagMatch;
    });
  }, [activePillar, searchQuery, selectedLang]);

  // Topics for the active pillar (6 topics, rendered in rows of 3)
  const currentPillarTopics = useMemo(() => {
    return PILLAR_TOPICS.filter((t) => t.pillar === activePillar);
  }, [activePillar]);

  // Current language object
  const currentLangObj = WORKSHOP_LANGUAGES.find((l) => l.code === selectedLang) || WORKSHOP_LANGUAGES[0];

  // Active pillar object
  const activePillarObj = EBOOK_PILLARS.find((p) => p.id === activePillar) || EBOOK_PILLARS[0];

  // Back button handler
  const handleBack = () => {
    if (showTopicsPage) {
      setShowTopicsPage(false);
      return;
    }
    if (typeof window !== 'undefined') {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/';
      }
    }
  };

  // Open Chapter in Reader
  const openChapter = (chap: EBookChapter) => {
    setActiveChapter(chap);
    setReaderLang(selectedLang);
  };

  // Open Chapter linked to a Topic
  const handleSelectTopic = (topic: PillarTopic) => {
    let targetChap = topic.linkedChapterId
      ? EBOOK_CHAPTERS.find((c) => c.id === topic.linkedChapterId)
      : null;
    if (!targetChap) {
      targetChap = EBOOK_CHAPTERS.find((c) => c.pillar === topic.pillar) || EBOOK_CHAPTERS[0];
    }
    if (targetChap) {
      openChapter(targetChap);
    }
  };

  // Get Next & Previous chapter in same pillar
  const { prevChapter, nextChapter } = useMemo(() => {
    if (!activeChapter) return { prevChapter: null, nextChapter: null };
    const samePillar = EBOOK_CHAPTERS.filter((c) => c.pillar === activeChapter.pillar);
    const currIndex = samePillar.findIndex((c) => c.id === activeChapter.id);
    return {
      prevChapter: currIndex > 0 ? samePillar[currIndex - 1] : null,
      nextChapter: currIndex < samePillar.length - 1 ? samePillar[currIndex + 1] : null
    };
  }, [activeChapter]);

  return (
    <div 
      className="min-h-screen bg-[#fcfcfc] text-slate-900 flex flex-col selection:bg-emerald-600 selection:text-white w-full"
      style={{ fontFamily: "'Noto Sans Devanagari', 'Kohinoor Devanagari', 'Mukta', 'Poppins', system-ui, -apple-system, sans-serif" }}
    >
      
      {/* ─────────────────────────────────────────────────────────────
          1. TOP GREEN VEDIC CHANNEL STRIP (With top margin for notch/status bar)
      ───────────────────────────────────────────────────────────── */}
      <section className="relative w-full bg-gradient-to-r from-[#064e3b] via-[#047857] to-[#065f46] border-b border-emerald-700/60 shadow-md text-white sticky top-0 z-40 pt-7 sm:pt-3 pb-2.5 sm:pb-3">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            
            {/* Left: Mohan Sir Avatar + Channel Branding (No duplicate back button here) */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div 
                className="relative rounded-full overflow-hidden border-2 border-white shadow-md shrink-0 ring-2 ring-emerald-400/50 bg-emerald-950"
                style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px' }}
              >
                <img
                  src="https://swaryogacrm.b-cdn.net/mohan.jpg"
                  alt="Mohan Sir - Swar Yoga"
                  className="rounded-full w-full h-full object-cover"
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xs sm:text-base font-black text-white tracking-tight drop-shadow-sm truncate">
                    Swar Yoga
                  </h1>
                  <span className="w-3.5 h-3.5 rounded-full bg-white text-emerald-800 flex items-center justify-center text-[9px] font-black shadow-xs shrink-0" title="Verified Official Channel">
                    ✓
                  </span>
                </div>
                <p className="text-[10px] text-emerald-100/90 font-medium truncate">
                  Yogacharya Mohan Kalburgi
                </p>
              </div>
            </div>

            {/* Center: The ONE Back Button (Centered matching /media) */}
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

            {/* Right: Language Selector Pill */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsLangModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 active:scale-95 text-white font-bold text-xs border border-white/20 shadow-xs transition-all cursor-pointer"
                title="Select Language"
              >
                <span>{currentLangObj.flag}</span>
                <span className="text-xs">{currentLangObj.name.split(' ')[0]}</span>
                <Globe className="w-3.5 h-3.5 text-amber-300 ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Language Selection Modal (Clean & Interactive, Default Hindi - identical to /media & Image 2) */}
      {isLangModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setIsLangModalOpen(false)}
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
                onClick={() => setIsLangModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 cursor-pointer transition-colors"
                aria-label="Close language selector"
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
                      setIsLangModalOpen(false);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-500/30'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
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

      {/* ─────────────────────────────────────────────────────────────
          2. HERO BANNER (AT VERY TOP BELOW CHANNEL BAR ON ALL SCREENS)
      ───────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-3 sm:pt-4 w-full">
        {/* Hero Banner (Snow Mountains + Book, E-Books & Laptop) */}
        <section className="relative w-full h-40 sm:h-52 md:h-60 lg:h-72 rounded-2xl sm:rounded-3xl overflow-hidden shadow-md mb-3 border border-slate-200/80 group bg-slate-900">
          <img
            src="/images/blog-nature-banner.jpg"
            alt="Swar Yoga Sacred Knowledge Sanctuary"
            className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-700"
          />
          {/* Subtle glossy vignette overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

          {/* Bottom Left: "Swar Yoga" tag */}
          <div className="absolute bottom-3 left-3 sm:left-4 z-10 flex items-center gap-2">
            <span className="text-[11px] font-black tracking-wider text-white drop-shadow-md bg-black/65 backdrop-blur-md px-3 py-1 rounded-full border border-white/25 shadow-sm">
              Swar Yoga
            </span>
          </div>

          {/* Bottom Right: Book, E-Books, and Laptop Badges */}
          <div className="absolute bottom-3 right-3 sm:right-4 z-10 flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/30 text-white shadow-md text-[11px] sm:text-xs font-bold hover:bg-black/85 transition-all">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Book</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/30 text-white shadow-md text-[11px] sm:text-xs font-bold hover:bg-black/85 transition-all">
              <Tablet className="w-3.5 h-3.5 text-emerald-400" />
              <span>E-Books</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/30 text-white shadow-md text-[11px] sm:text-xs font-bold hover:bg-black/85 transition-all">
              <Laptop className="w-3.5 h-3.5 text-sky-400" />
              <span>Laptop</span>
            </div>
          </div>
        </section>

        {/* DESKTOP PILLAR TABS (Placed DIRECTLY BELOW Hero Image) */}
        <div className="hidden md:block sticky top-0 z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200/90 shadow-sm px-6 py-2.5 mb-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar">
              {/* 1. Health */}
              <button
                type="button"
                onClick={() => {
                  setActivePillar('health');
                  setShowTopicsPage(false);
                }}
                className={`px-5 py-2 rounded-full font-bold text-sm lg:text-base flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activePillar === 'health'
                    ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20'
                    : 'bg-gray-100 hover:bg-emerald-50 text-gray-800 hover:text-emerald-800'
                }`}
              >
                <HeartPulse className={`w-4 h-4 shrink-0 ${activePillar === 'health' ? 'text-white' : 'text-emerald-600'}`} />
                <span className="hindi-font font-extrabold text-base tracking-wide" lang="hi" style={{ fontFamily: "'Noto Sans Devanagari', 'Mukta', sans-serif" }}>
                  {selectedLang === 'hi' ? 'स्वास्थ्य' : selectedLang === 'mr' ? 'आरोग्य' : selectedLang === 'kn' ? 'ಆರೋಗ್ಯ' : 'Health'}
                </span>
                {selectedLang !== 'en' && (
                  <span className="text-xs opacity-75 font-semibold">
                    ({getLocalized(EBOOK_PILLARS.find(p => p.id === 'health')?.shortName, 'en')})
                  </span>
                )}
              </button>

              {/* 2. Wealth */}
              <button
                type="button"
                onClick={() => {
                  setActivePillar('wealth');
                  setShowTopicsPage(false);
                }}
                className={`px-5 py-2 rounded-full font-bold text-sm lg:text-base flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activePillar === 'wealth'
                    ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/20'
                    : 'bg-gray-100 hover:bg-amber-50 text-gray-800 hover:text-amber-800'
                }`}
              >
                <Coins className={`w-4 h-4 shrink-0 ${activePillar === 'wealth' ? 'text-white' : 'text-amber-600'}`} />
                <span className="hindi-font font-extrabold text-base tracking-wide" lang="hi" style={{ fontFamily: "'Noto Sans Devanagari', 'Mukta', sans-serif" }}>
                  {selectedLang === 'hi' ? 'धन-समृद्धि' : selectedLang === 'mr' ? 'धन-संपत्ती' : selectedLang === 'kn' ? 'ಸಂಪತ್ತು' : 'Wealth'}
                </span>
                {selectedLang !== 'en' && (
                  <span className="text-xs opacity-75 font-semibold">
                    ({getLocalized(EBOOK_PILLARS.find(p => p.id === 'wealth')?.shortName, 'en')})
                  </span>
                )}
              </button>

              {/* 3. Spiritual */}
              <button
                type="button"
                onClick={() => {
                  setActivePillar('spiritual');
                  setShowTopicsPage(false);
                }}
                className={`px-5 py-2 rounded-full font-bold text-sm lg:text-base flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activePillar === 'spiritual'
                    ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-500/20'
                    : 'bg-gray-100 hover:bg-purple-50 text-gray-800 hover:text-purple-800'
                }`}
              >
                <Sparkles className={`w-4 h-4 shrink-0 ${activePillar === 'spiritual' ? 'text-white' : 'text-purple-600'}`} />
                <span className="hindi-font font-extrabold text-base tracking-wide" lang="hi" style={{ fontFamily: "'Noto Sans Devanagari', 'Mukta', sans-serif" }}>
                  {selectedLang === 'hi' ? 'अध्यात्म' : selectedLang === 'mr' ? 'अध्यात्म' : selectedLang === 'kn' ? 'ಆಧ್ಯಾತ್ಮಿಕ' : 'Spiritual'}
                </span>
                {selectedLang !== 'en' && (
                  <span className="text-xs opacity-75 font-semibold">
                    ({getLocalized(EBOOK_PILLARS.find(p => p.id === 'spiritual')?.shortName, 'en')})
                  </span>
                )}
              </button>

              {/* 4. Parenting */}
              <button
                type="button"
                onClick={() => {
                  setActivePillar('parenting');
                  setShowTopicsPage(false);
                }}
                className={`px-5 py-2 rounded-full font-bold text-sm lg:text-base flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activePillar === 'parenting'
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20'
                    : 'bg-gray-100 hover:bg-blue-50 text-gray-800 hover:text-blue-800'
                }`}
              >
                <Users className={`w-4 h-4 shrink-0 ${activePillar === 'parenting' ? 'text-white' : 'text-blue-600'}`} />
                <span className="hindi-font font-extrabold text-base tracking-wide" lang="hi" style={{ fontFamily: "'Noto Sans Devanagari', 'Mukta', sans-serif" }}>
                  {selectedLang === 'hi' ? 'परवरिश' : selectedLang === 'mr' ? 'पालकत्व' : selectedLang === 'kn' ? 'ಪಾಲನೆ' : 'Parenting'}
                </span>
                {selectedLang !== 'en' && (
                  <span className="text-xs opacity-75 font-semibold">
                    ({getLocalized(EBOOK_PILLARS.find(p => p.id === 'parenting')?.shortName, 'en')})
                  </span>
                )}
              </button>

              {/* 5. Pregnancy */}
              <button
                type="button"
                onClick={() => {
                  setActivePillar('pregnancy');
                  setShowTopicsPage(false);
                }}
                className={`px-5 py-2 rounded-full font-bold text-sm lg:text-base flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activePillar === 'pregnancy'
                    ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/20'
                    : 'bg-gray-100 hover:bg-rose-50 text-gray-800 hover:text-rose-800'
                }`}
              >
                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                  <img
                    src="/images/pregnancy-silhouette.png"
                    alt="Pregnancy"
                    className={`w-full h-full object-contain ${activePillar === 'pregnancy' ? 'brightness-0 invert' : ''}`}
                  />
                </div>
                <span className="hindi-font font-extrabold text-base tracking-wide" lang="hi" style={{ fontFamily: "'Noto Sans Devanagari', 'Mukta', sans-serif" }}>
                  {selectedLang === 'hi' ? 'गर्भ संस्कार' : selectedLang === 'mr' ? 'गर्भसंस्कार' : selectedLang === 'kn' ? 'ಗರ್ಭ ಸಂಸ್ಕಾರ' : 'Garbh Sanskar'}
                </span>
                {selectedLang !== 'en' && (
                  <span className="text-xs opacity-75 font-semibold">
                    ({getLocalized(EBOOK_PILLARS.find(p => p.id === 'pregnancy')?.shortName, 'en')})
                  </span>
                )}
              </button>
            </div>

            {/* Browse All Topics */}
            <button
              type="button"
              onClick={() => setShowTopicsPage(true)}
              className="flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Menu className="w-4 h-4 stroke-[3]" />
              <span>Browse All Topics</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MOBILE ONLY SECTIONS (Hidden on Desktop)
      ───────────────────────────────────────────────────────────── */}
      {/* Mobile White Strip: "Swar Yoga E book" */}
      <section className="md:hidden w-full bg-white text-black py-2 px-4 shadow-xs border-b border-gray-200 flex items-center justify-center">
        <h2 className="text-xs font-black tracking-wider text-slate-900 uppercase">
          Swar Yoga E book
        </h2>
      </section>

      {/* Mobile Five Topic Icons (Strictly untouched for Android mobile app) */}
      <nav className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-200/90 shadow-xs">
        <div className="max-w-md mx-auto px-2 py-2">
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 items-center justify-items-center w-full">
            
            {/* 1. Health */}
            <button
              type="button"
              onClick={() => {
                setActivePillar('health');
                setShowTopicsPage(false);
              }}
              className={`w-full aspect-square max-w-[68px] sm:max-w-[76px] flex flex-col items-center justify-center p-1 rounded-2xl transition-all cursor-pointer group ${
                activePillar === 'health'
                  ? 'bg-white border-2 border-emerald-600 shadow-xs ring-2 ring-emerald-500/20'
                  : 'bg-white border border-gray-200/90 hover:border-emerald-300 hover:bg-emerald-50/40 shadow-2xs'
              }`}
            >
              <HeartPulse className={`w-5 h-5 group-hover:scale-110 transition-transform flex-shrink-0 ${
                activePillar === 'health' ? 'text-emerald-600 fill-emerald-600/20' : 'text-emerald-600'
              }`} />
              <span className={`text-[10px] sm:text-[11px] mt-1 tracking-tight leading-none truncate ${
                activePillar === 'health' ? 'font-bold text-emerald-950' : 'font-medium text-gray-700 group-hover:text-emerald-900'
              }`}>
                Health
              </span>
            </button>

            {/* 2. Wealth */}
            <button
              type="button"
              onClick={() => {
                setActivePillar('wealth');
                setShowTopicsPage(false);
              }}
              className={`w-full aspect-square max-w-[68px] sm:max-w-[76px] flex flex-col items-center justify-center p-1 rounded-2xl transition-all cursor-pointer group ${
                activePillar === 'wealth'
                  ? 'bg-white border-2 border-amber-600 shadow-xs ring-2 ring-amber-500/20'
                  : 'bg-white border border-gray-200/90 hover:border-amber-300 hover:bg-amber-50/40 shadow-2xs'
              }`}
            >
              <Coins className={`w-5 h-5 group-hover:scale-110 transition-transform flex-shrink-0 ${
                activePillar === 'wealth' ? 'text-amber-600 fill-amber-600/20' : 'text-amber-600'
              }`} />
              <span className={`text-[10px] sm:text-[11px] mt-1 tracking-tight leading-none truncate ${
                activePillar === 'wealth' ? 'font-bold text-amber-950' : 'font-medium text-gray-700 group-hover:text-amber-900'
              }`}>
                Wealth
              </span>
            </button>

            {/* 3. Spiritual */}
            <button
              type="button"
              onClick={() => {
                setActivePillar('spiritual');
                setShowTopicsPage(false);
              }}
              className={`w-full aspect-square max-w-[68px] sm:max-w-[76px] flex flex-col items-center justify-center p-1 rounded-2xl transition-all cursor-pointer group ${
                activePillar === 'spiritual'
                  ? 'bg-white border-2 border-purple-600 shadow-xs ring-2 ring-purple-500/20'
                  : 'bg-white border border-gray-200/90 hover:border-purple-300 hover:bg-purple-50/40 shadow-2xs'
              }`}
            >
              <Sparkles className={`w-5 h-5 group-hover:scale-110 transition-transform flex-shrink-0 ${
                activePillar === 'spiritual' ? 'text-purple-600 fill-purple-600/20' : 'text-purple-600'
              }`} />
              <span className={`text-[10px] sm:text-[11px] mt-1 tracking-tight leading-none truncate ${
                activePillar === 'spiritual' ? 'font-bold text-purple-950' : 'font-medium text-gray-700 group-hover:text-purple-900'
              }`}>
                Spiritual
              </span>
            </button>

            {/* 4. Parenting */}
            <button
              type="button"
              onClick={() => {
                setActivePillar('parenting');
                setShowTopicsPage(false);
              }}
              className={`w-full aspect-square max-w-[68px] sm:max-w-[76px] flex flex-col items-center justify-center p-1 rounded-2xl transition-all cursor-pointer group ${
                activePillar === 'parenting'
                  ? 'bg-white border-2 border-blue-600 shadow-xs ring-2 ring-blue-500/20'
                  : 'bg-white border border-gray-200/90 hover:border-blue-300 hover:bg-blue-50/40 shadow-2xs'
              }`}
            >
              <Users className={`w-5 h-5 group-hover:scale-110 transition-transform flex-shrink-0 ${
                activePillar === 'parenting' ? 'text-blue-600 fill-blue-600/20' : 'text-blue-600'
              }`} />
              <span className={`text-[10px] sm:text-[11px] mt-1 tracking-tight leading-none truncate ${
                activePillar === 'parenting' ? 'font-bold text-blue-950' : 'font-medium text-gray-700 group-hover:text-blue-900'
              }`}>
                Parenting
              </span>
            </button>

            {/* 5. Pregnancy */}
            <button
              type="button"
              onClick={() => {
                setActivePillar('pregnancy');
                setShowTopicsPage(false);
              }}
              className={`w-full aspect-square max-w-[68px] sm:max-w-[76px] flex flex-col items-center justify-center p-1 rounded-2xl transition-all cursor-pointer group ${
                activePillar === 'pregnancy'
                  ? 'bg-white border-2 border-rose-600 shadow-xs ring-2 ring-rose-500/20'
                  : 'bg-white border border-gray-200/90 hover:border-rose-300 hover:bg-rose-50/40 shadow-2xs'
              }`}
            >
              <div className="w-5 h-5 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                <img
                  src="/images/pregnancy-silhouette.png"
                  alt="Pregnancy"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className={`text-[10px] sm:text-[11px] mt-1 tracking-tight leading-none truncate ${
                activePillar === 'pregnancy' ? 'font-bold text-rose-950' : 'font-medium text-gray-700 group-hover:text-rose-900'
              }`}>
                Pregnancy
              </span>
            </button>

          </div>
        </div>

        {/* Orange accent line */}
        <div className="h-0.5 bg-[#FF6B35] w-full" />
      </nav>

      {/* ─────────────────────────────────────────────────────────────
          4. SUB-BAR: Active Pillar Details, 3-Line Menu Button, and Search
             (Placed BELOW Hero Image and Pillar Tabs!)
      ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Left: Active Pillar Title & Details */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <span className="text-xl shrink-0">{activePillarObj.iconEmoji}</span>
            <div className="min-w-0">
              <h3 
                className="text-xs sm:text-sm font-black text-slate-900 truncate"
                style={{ fontFamily: "'Noto Sans Devanagari', 'Kohinoor Devanagari', 'Mukta', system-ui, sans-serif" }}
              >
                {getLocalized(activePillarObj.name, selectedLang)}
              </h3>
              <p className="text-[10px] text-emerald-700 font-bold truncate">
                {filteredChapters.length} {selectedLang === 'hi' ? 'अध्याय' : selectedLang === 'mr' ? 'प्रकरणे' : selectedLang === 'kn' ? 'ಅಧ್ಯಾಯಗಳು' : 'Chapters'}
              </p>
            </div>
          </div>

          {/* Right: 3-Line Menu Button & Search */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            
            {/* Three-line Menu Button for "{Pillar} Topics" */}
            <button
              type="button"
              onClick={() => setShowTopicsPage(true)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black transition-all shrink-0 cursor-pointer bg-[#f59e0b] hover:bg-[#d97706] text-black border border-amber-600/40 shadow-xs active:scale-95"
              title={`Open ${getLocalized(activePillarObj.shortName, 'en')} Topics`}
              aria-label={`Open ${getLocalized(activePillarObj.shortName, 'en')} Topics`}
              style={{ fontFamily: "'Noto Sans Devanagari', 'Kohinoor Devanagari', 'Mukta', system-ui, sans-serif" }}
            >
              <Menu className="w-4 h-4 text-black stroke-[3]" />
              <span>{getLocalized(activePillarObj.shortName, 'en')} Topics</span>
            </button>

            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={selectedLang === 'hi' ? 'अध्याय खोजें...' : 'Search chapters...'}
                className="w-full bg-gray-50 border border-gray-300 rounded-full pl-8 pr-7 py-1.5 text-xs text-slate-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                style={{ fontFamily: "'Noto Sans Devanagari', 'Kohinoor Devanagari', 'Mukta', system-ui, sans-serif" }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-gray-400 hover:text-slate-900 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. MAIN VIEWPORT: STANDARD CHAPTERS FEED
      ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-6">
        {filteredChapters.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-300">
              {selectedLang === 'hi' ? 'कोई अध्याय नहीं मिला' : 'No chapters found'}
            </h3>
            <p className="text-xs text-slate-500">
              {selectedLang === 'hi' ? 'कृपया अन्य खोज शब्द दर्ज करें।' : 'Try searching with another keyword.'}
            </p>
          </div>
        ) : (
          /* 3 Topics/Chapters in One Row */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredChapters.map((chap) => renderChapterCard(chap))}
          </div>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          4.5 DEDICATED FULL-SCREEN "{Pillar} Topics" PAGE (Exact match to Image 2)
              Light background, 2-column grid of rounded pill cards,
              solid circular icons, small clean lettering, click to open chapter card.
      ───────────────────────────────────────────────────────────── */}
      {showTopicsPage && (
        <div
          data-app-header="true"
          className="fixed inset-0 z-[9990] bg-[#f8fafc] text-gray-900 flex flex-col overflow-y-auto overscroll-contain animate-in fade-in duration-200"
        >
          {/* Top Header: Vedic Green Channel Strip with Back Button & Close */}
          <header className="sticky top-0 z-50 bg-gradient-to-r from-[#064e3b] via-[#047857] to-[#065f46] text-white p-3 sm:p-4 shadow-md shrink-0">
            <div className="max-w-md sm:max-w-3xl mx-auto flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowTopicsPage(false)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/40 hover:bg-black/60 active:scale-95 text-white font-bold text-xs border border-white/25 shadow-sm transition-all cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-4 h-4 text-white stroke-[2.5]" />
                <span>Back</span>
              </button>

              <div className="text-center min-w-0 flex-1 px-2">
                <h1 className="text-sm sm:text-base font-black text-white truncate">
                  {getLocalized(activePillarObj.shortName, 'en')} Topics
                </h1>
                <p className="text-[10px] text-emerald-100/90 font-medium truncate">
                  {currentPillarTopics.length} Topics • Click to open card
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowTopicsPage(false)}
                className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white cursor-pointer shrink-0"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Sticky Pillar Selector Bar */}
          <nav className="sticky top-[53px] sm:top-[61px] z-40 bg-white border-b border-gray-200 shadow-xs py-2 px-3">
            <div className="max-w-md sm:max-w-3xl mx-auto flex items-center justify-start sm:justify-center gap-2 overflow-x-auto no-scrollbar">
              {EBOOK_PILLARS.map((p) => {
                const isActive = activePillar === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActivePillar(p.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                      isActive
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
                    }`}
                  >
                    {p.id === 'pregnancy' ? (
                      <div className="w-4 h-4 flex items-center justify-center shrink-0">
                        <img
                          src="/images/pregnancy-silhouette.png"
                          alt="Pregnancy"
                          className={`w-full h-full object-contain ${isActive ? 'brightness-0 invert' : ''}`}
                        />
                      </div>
                    ) : (
                      <span className="text-sm">{p.iconEmoji}</span>
                    )}
                    <span>{getLocalized(p.shortName, 'en')}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Body: 2-Column Grid of Colorful Pill Cards (Exact match to Image 2) */}
          <main className="flex-1 max-w-md sm:max-w-3xl mx-auto w-full p-3 sm:p-5 pb-32 space-y-4">
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
              {currentPillarTopics.map((topic, index) => {
                const palette = TOPIC_PALETTES[index % TOPIC_PALETTES.length];
                const IconComponent = palette.icon;
                const englishTitle = getLocalized(topic.shortName, 'en');
                const localizedSubtitle = getLocalized(topic.shortName, selectedLang !== 'en' ? selectedLang : 'hi');

                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => handleSelectTopic(topic)}
                    className={`p-3 sm:p-4 rounded-3xl border-2 flex items-center gap-2.5 sm:gap-3.5 text-left transition-all active:scale-95 shadow-xs hover:shadow-md cursor-pointer ${palette.cardBg} ${palette.borderColor}`}
                  >
                    {/* Left: Solid colorful circle with white icon */}
                    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full ${palette.circleBg} flex items-center justify-center shrink-0 shadow-sm text-white`}>
                      <IconComponent className="w-5 h-5 stroke-[2.5]" />
                    </div>

                    {/* Right: Small letter topic names (English primary, localized subtitle) */}
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate leading-tight">
                        {englishTitle}
                      </h4>
                      <p className={`text-[10px] sm:text-xs font-semibold ${palette.subtextColor} truncate mt-0.5`}>
                        {localizedSubtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </main>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. INTERACTIVE DIGITAL E-BOOK READER MODAL
             Smooth buttery scroll up and down, overscroll-contain, pb-36.
             Includes small square button with red heart + dropdown:
             Like, Comments, Share, Add in my favorite
      ───────────────────────────────────────────────────────────── */}
      {activeChapter && (
        <div
          data-app-header="true"
          className="fixed inset-0 z-[10000] bg-white text-slate-900 flex flex-col overflow-hidden animate-in fade-in duration-200"
        >
          {/* Sticky Reader Header with clean white glassmorphic layout */}
          <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-xs shrink-0">
            <div className="flex items-center justify-between p-2.5 sm:p-3.5 max-w-4xl mx-auto w-full gap-2">
              
              {/* Left: Back Button */}
              <button
                type="button"
                onClick={() => setActiveChapter(null)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-sm transition-all cursor-pointer shrink-0"
                title="Back to Chapters"
              >
                <ArrowLeft className="w-4 h-4 text-white stroke-[2.5]" />
                <span>Back</span>
              </button>

              {/* Center: Title & Chapter badge */}
              <div className="min-w-0 text-center flex-1 px-1">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block truncate">
                  {getLocalized(EBOOK_PILLARS.find((p) => p.id === activeChapter.pillar)?.shortName, readerLang)} • Chapter {activeChapter.chapterNumber}
                </span>
                <h3 
                  className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[180px] sm:max-w-md mx-auto"
                  style={{ fontFamily: "'Noto Sans Devanagari', 'Mukta', system-ui, sans-serif" }}
                >
                  {getLocalized(activeChapter.shortName, readerLang)}
                </h3>
              </div>

              {/* Right: Small Square Button with Red Heart & Close X */}
              <div className="flex items-center gap-2 shrink-0">
                
                {/* 1. Small Square Button with Red Heart */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setHeartMenuOpen(!heartMenuOpen)}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 text-red-500"
                    title="Chapter Actions (Like, Comments, Share, Favorite)"
                    aria-label="Chapter Actions"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="w-5 h-5 text-red-500 fill-red-500 shrink-0"
                      style={{ width: '20px', height: '20px', fill: '#ef4444', color: '#ef4444' }}
                    >
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {heartMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setHeartMenuOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-2xl shadow-xl py-1.5 z-50 text-xs backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 text-slate-800">
                        {/* 1. Like */}
                        <button
                          type="button"
                          onClick={() => handleToggleLike(activeChapter.id)}
                          className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer ${
                            likedChapters.includes(activeChapter.id) ? 'text-red-600 font-bold' : 'text-slate-700'
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <Heart className={`w-4 h-4 ${likedChapters.includes(activeChapter.id) ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
                            <span>{likedChapters.includes(activeChapter.id) ? 'Liked' : 'Like'}</span>
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-slate-600 font-semibold">
                            {getLikeCount(activeChapter.id)}
                          </span>
                        </button>

                        {/* 2. Comments */}
                        <button
                          type="button"
                          onClick={() => {
                            setHeartMenuOpen(false);
                            setShowCommentDrawer(true);
                          }}
                          className="w-full text-left px-3.5 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer text-slate-700"
                        >
                          <span className="flex items-center gap-2.5">
                            <MessageSquare className="w-4 h-4 text-blue-600" />
                            <span>Comments</span>
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-slate-600 font-semibold">
                            {getChapterComments(activeChapter.id).length}
                          </span>
                        </button>

                        {/* 3. Share */}
                        <button
                          type="button"
                          onClick={() => {
                            setHeartMenuOpen(false);
                            handleShareChapter(activeChapter);
                          }}
                          className="w-full text-left px-3.5 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer text-slate-700"
                        >
                          <span className="flex items-center gap-2.5">
                            <Share2 className="w-4 h-4 text-emerald-600" />
                            <span>Share</span>
                          </span>
                          <span className="text-[10px] text-slate-400">Link</span>
                        </button>

                        {/* 4. Add in my favorite */}
                        <button
                          type="button"
                          onClick={() => {
                            handleToggleFavorite(activeChapter.id);
                          }}
                          className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer border-t border-gray-100 mt-1 pt-2.5 ${
                            favoriteChapters.includes(activeChapter.id) ? 'text-amber-600 font-bold' : 'text-slate-700'
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <Star className={`w-4 h-4 ${favoriteChapters.includes(activeChapter.id) ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
                            <span>{favoriteChapters.includes(activeChapter.id) ? 'In My Favorites' : 'Add in My Favorite'}</span>
                          </span>
                          {favoriteChapters.includes(activeChapter.id) && (
                            <Check className="w-3.5 h-3.5 text-amber-600" />
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* 2. Close Reader in Gray X */}
                <button
                  type="button"
                  onClick={() => setActiveChapter(null)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 flex items-center justify-center text-gray-700 hover:text-black transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Close Reader"
                  aria-label="Close Reader"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

            </div>

          </header>

          {/* Smooth Scrollable Body: scroll well up and down with overscroll-contain */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-8 max-w-3xl mx-auto w-full space-y-6 pb-36">
            
            {/* Chapter Cover Banner Image */}
            <div className="relative w-full h-56 sm:h-72 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <img
                src={activeChapter.image}
                alt={getLocalized(activeChapter.title, readerLang)}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
              
              {/* TOP LEFT ON BLOG IMAGE: Font Plus/Minus Pill (A- | A+) */}
              <div className="absolute top-3.5 left-4 sm:left-5 z-20 flex items-center bg-black/85 backdrop-blur-md border border-white/40 rounded-full px-3.5 py-1 shadow-2xl text-white shrink-0 min-w-max">
                <button
                  type="button"
                  onClick={() => {
                    if (readerFontSize === 'xl') setReaderFontSize('lg');
                    else if (readerFontSize === 'lg') setReaderFontSize('base');
                    else if (readerFontSize === 'base') setReaderFontSize('sm');
                  }}
                  className="px-2 py-0.5 text-xs font-black text-white hover:text-emerald-400 active:scale-90 transition-transform cursor-pointer"
                  style={{ color: '#ffffff' }}
                  title="Smaller Text (A-)"
                >
                  A-
                </button>
                <span className="text-[10px] text-white/50 px-1.5 font-bold">|</span>
                <button
                  type="button"
                  onClick={() => {
                    if (readerFontSize === 'sm') setReaderFontSize('base');
                    else if (readerFontSize === 'base') setReaderFontSize('lg');
                    else if (readerFontSize === 'lg') setReaderFontSize('xl');
                  }}
                  className="px-2 py-0.5 text-xs font-black text-white hover:text-emerald-400 active:scale-90 transition-transform cursor-pointer"
                  style={{ color: '#ffffff' }}
                  title="Larger Text (A+)"
                >
                  A+
                </button>
              </div>

              {/* TOP RIGHT ON BLOG IMAGE: Language Selector & Bookmark */}
              <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                <select
                  value={readerLang}
                  onChange={(e) => setReaderLang(e.target.value)}
                  className="bg-black/75 backdrop-blur-md border border-white/30 rounded-full px-3 py-1 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 cursor-pointer shadow-xl"
                  title="Switch Language in Reader"
                  style={{ fontFamily: "'Noto Sans Devanagari', 'Kohinoor Devanagari', 'Mukta', system-ui, sans-serif" }}
                >
                  {WORKSHOP_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code} className="bg-slate-900 text-white font-medium">
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => toggleBookmark(activeChapter.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer border shadow-xl backdrop-blur-md ${
                    savedBookmarks.includes(activeChapter.id)
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                      : 'bg-black/75 border-white/30 text-white hover:bg-black/90'
                  }`}
                  title="Bookmark Chapter"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span className="text-[10px] hidden sm:inline">{savedBookmarks.includes(activeChapter.id) ? 'Saved' : 'Bookmark'}</span>
                </button>
              </div>

              <div className="absolute bottom-4 left-4 right-4">
                <span className="px-2.5 py-1 rounded-md bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wider shadow-md">
                  {getLocalized(EBOOK_PILLARS.find((p) => p.id === activeChapter.pillar)?.name, readerLang)}
                </span>
                <h1 className="text-base sm:text-2xl font-black text-white mt-2 drop-shadow-md">
                  {getLocalized(activeChapter.title, readerLang)}
                </h1>
                <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                  <span>{activeChapter.author}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-400" />
                    {getLocalized(activeChapter.readTime, readerLang)}
                  </span>
                </p>
              </div>
            </div>

            {/* Formatted Book Content (White Theme) */}
            <article
              className={`text-slate-800 leading-relaxed font-sans space-y-4 ${
                readerFontSize === 'sm'
                  ? 'text-xs'
                  : readerFontSize === 'lg'
                  ? 'text-lg leading-loose'
                  : readerFontSize === 'xl'
                  ? 'text-xl leading-loose'
                  : 'text-sm sm:text-base'
              }`}
              style={{ fontFamily: "'Noto Sans Devanagari', 'Mukta', system-ui, sans-serif" }}
            >
              {(activeChapter.content[readerLang as keyof typeof activeChapter.content] || activeChapter.content.hi || activeChapter.content.en)
                .split('\n\n')
                .map((paragraph, index) => {
                  if (paragraph.startsWith('### ')) {
                    return (
                      <h3 key={index} className="text-lg sm:text-xl font-sans font-bold text-emerald-900 pt-4 border-b border-emerald-100 pb-1">
                        {paragraph.replace('### ', '')}
                      </h3>
                    );
                  }
                  if (paragraph.startsWith('> ')) {
                    return (
                      <blockquote key={index} className="border-l-4 border-emerald-500 bg-emerald-50/80 rounded-r-2xl p-4 my-3 text-emerald-950 font-sans text-sm shadow-2xs">
                        {paragraph.replace('> ', '')}
                      </blockquote>
                    );
                  }
                  return (
                    <p key={index} className="whitespace-pre-line text-slate-700 leading-relaxed">
                      {paragraph}
                    </p>
                  );
                })}
            </article>

            {/* Quick Interactive Reaction Bar inside Content */}
            <div className="pt-6 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleLike(activeChapter.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                    likedChapters.includes(activeChapter.id)
                      ? 'bg-rose-50 border-rose-400 text-rose-600'
                      : 'bg-gray-100 border-gray-200 text-slate-700 hover:border-rose-400'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${likedChapters.includes(activeChapter.id) ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
                  <span>{likedChapters.includes(activeChapter.id) ? 'Liked' : 'Like'} ({getLikeCount(activeChapter.id)})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCommentDrawer(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 border border-gray-200 text-slate-700 hover:bg-gray-200 transition-all cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                  <span>Comments ({getChapterComments(activeChapter.id).length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShareChapter(activeChapter)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 border border-gray-200 text-slate-700 hover:bg-gray-200 transition-all cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Share</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleToggleFavorite(activeChapter.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                  favoriteChapters.includes(activeChapter.id)
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-gray-100 border-gray-200 text-slate-700 hover:bg-gray-200'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${favoriteChapters.includes(activeChapter.id) ? 'fill-slate-950 text-slate-950' : 'text-amber-500'}`} />
                <span>{favoriteChapters.includes(activeChapter.id) ? 'In Favorites' : 'Add in My Favorite'}</span>
              </button>
            </div>

            {/* Bottom Navigation: Previous / Next Chapter */}
            <div className="pt-6 border-t border-gray-200 flex items-center justify-between gap-3">
              {prevChapter ? (
                <button
                  type="button"
                  onClick={() => openChapter(prevChapter)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 text-slate-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  <ChevronLeft className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="text-left">
                    <span className="text-[10px] text-slate-500 block">Previous</span>
                    <span className="truncate max-w-[120px] sm:max-w-xs block font-semibold">{getLocalized(prevChapter.shortName, readerLang)}</span>
                  </div>
                </button>
              ) : <div />}

              {nextChapter ? (
                <button
                  type="button"
                  onClick={() => openChapter(nextChapter)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer ml-auto shadow-sm"
                >
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-100 block">Next</span>
                    <span className="truncate max-w-[120px] sm:max-w-xs block font-semibold">{getLocalized(nextChapter.shortName, readerLang)}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white shrink-0" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveChapter(null)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md cursor-pointer ml-auto"
                >
                  Finish Reading ✓
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comments Drawer / Modal (White Glossy Theme) */}
      {showCommentDrawer && activeChapter && (
        <div className="fixed inset-0 z-[10001] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="fixed inset-0" onClick={() => setShowCommentDrawer(false)} />
          <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl z-10 flex flex-col max-h-[80vh] text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  Comments ({getChapterComments(activeChapter.id).length})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowCommentDrawer(false)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              {getChapterComments(activeChapter.id).length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  No comments yet. Be the first sadhak to share your thoughts!
                </p>
              ) : (
                getChapterComments(activeChapter.id).map((c, i) => (
                  <div key={i} className="p-3 rounded-2xl bg-gray-50 border border-gray-200/80 text-xs shadow-2xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-emerald-700 font-bold">Sadhak</span>
                      <span className="text-[10px] text-slate-400">Just now</span>
                    </div>
                    <p className="text-xs sm:text-sm font-normal leading-relaxed text-slate-800">
                      {c}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input */}
            <div className="pt-3 border-t border-gray-100 flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment(activeChapter.id)}
                placeholder="Write a comment..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
              <button
                type="button"
                onClick={() => handleAddComment(activeChapter.id)}
                disabled={!newCommentText.trim()}
                className="px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs cursor-pointer shadow-xs transition-all active:scale-95"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-full shadow-2xl flex items-center gap-2 animate-bounce">
          <Check className="w-3.5 h-3.5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  // Helper to render a single 3-in-a-row Chapter Card
  // ─────────────────────────────────────────────────────────────
  function renderChapterCard(chap: EBookChapter) {
    const isBookmarked = savedBookmarks.includes(chap.id);
    const pillarMeta = EBOOK_PILLARS.find((p) => p.id === chap.pillar);

    return (
      <div
        key={chap.id}
        className="group relative bg-white hover:bg-slate-50 border border-gray-200/90 hover:border-emerald-500/50 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col shadow-xs hover:shadow-xl hover:shadow-emerald-950/10"
      >
        {/* Cover Image + Chapter Pill */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900 cursor-pointer" onClick={() => openChapter(chap)}>
          <img
            src={chap.image}
            alt={getLocalized(chap.title, selectedLang)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

          {/* Chapter Number Badge (Top Left) */}
          <div className="absolute top-2.5 left-2.5">
            <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-white text-[10px] font-black border border-white/20">
              CH {chap.chapterNumber}
            </span>
          </div>

          {/* Bookmark Button (Top Right) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleBookmark(chap.id);
            }}
            className={`absolute top-2.5 right-2.5 p-1.5 rounded-full backdrop-blur-md transition-all cursor-pointer z-10 ${
              isBookmarked
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-black/60 text-white/80 hover:text-white hover:bg-black'
            }`}
            title="Bookmark"
          >
            <Bookmark className="w-3.5 h-3.5" />
          </button>

          {/* Pillar Badge (Bottom Left) */}
          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold backdrop-blur-md border ${pillarMeta?.badgeBg} ${pillarMeta?.badgeBorder}`}>
              {pillarMeta?.iconEmoji} {getLocalized(pillarMeta?.shortName, selectedLang)}
            </span>
            <span className="text-[10px] font-medium text-slate-300 flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded">
              <Clock className="w-2.5 h-2.5 text-emerald-400" />
              {getLocalized(chap.readTime, selectedLang)}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5 cursor-pointer" onClick={() => openChapter(chap)}>
            <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
              <span>{getLocalized(chap.shortName, selectedLang)}</span>
            </div>

            <h3 
              className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug"
              style={{ fontFamily: "'Noto Sans Devanagari', 'Kohinoor Devanagari', 'Mukta', system-ui, sans-serif" }}
            >
              {getLocalized(chap.title, selectedLang)}
            </h3>

            <p 
              className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed"
              style={{ fontFamily: "'Noto Sans Devanagari', 'Kohinoor Devanagari', 'Mukta', system-ui, sans-serif" }}
            >
              {getLocalized(chap.excerpt, selectedLang)}
            </p>
          </div>

          {/* Card Action Row */}
          <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-medium">
              {chap.author.split(' ')[0]} {chap.author.split(' ')[1]}
            </span>

            <button
              type="button"
              onClick={() => openChapter(chap)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[11px] font-bold rounded-full transition-all shadow-xs cursor-pointer"
              style={{ fontFamily: "'Noto Sans Devanagari', 'Kohinoor Devanagari', 'Mukta', system-ui, sans-serif" }}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{selectedLang === 'hi' ? 'अध्याय पढ़ें' : 'Read Chapter'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}
