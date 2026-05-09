'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

// Language options with flags
const languageOptions = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', flag: '🇮🇳' },
  { code: 'ne', name: 'Nepali', flag: '🇳🇵' },
  { code: 'zh', name: 'Mandarin', flag: '🇨🇳' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
];

// Multi-language translations (English is default, others show English until translated)
const translations: Record<string, any> = {
  en: {
    heroTitle: 'Learn at Your Own Pace',
    heroSubtitle: 'Transform your life with our professionally recorded yoga courses. Practice anytime, anywhere.',
    searchPlaceholder: 'Search courses...',
    allLevels: 'All Levels',
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    free: 'Free',
    enrolled: 'Enrolled',
    videos: 'videos',
    hours: 'hours',
    minutes: 'min',
    students: 'students',
    startLearning: 'Start Learning',
    continueWatching: 'Continue Watching',
    preview: 'Preview',
    giftHours: 'Free Trial',
    giftHoursInfo: 'hours free trial',
    progress: 'Progress',
    loading: 'Loading courses...',
    noCoursesFound: 'No courses found',
    loginToEnroll: 'Login to enroll',
    browseAll: 'Browse All Courses',
    yourProgress: 'Your Progress',
    daysRemaining: 'days remaining',
    languageLabel: 'Language',
  },
  hi: {
    heroTitle: 'अपनी गति से सीखें',
    heroSubtitle: 'हमारे पेशेवर रूप से रिकॉर्ड किए गए योग कोर्स के साथ अपना जीवन बदलें। कभी भी, कहीं भी अभ्यास करें।',
    searchPlaceholder: 'कोर्स खोजें...',
    allLevels: 'सभी स्तर',
    beginner: 'शुरुआती',
    intermediate: 'मध्यम',
    advanced: 'उन्नत',
    free: 'मुफ्त',
    enrolled: 'नामांकित',
    videos: 'वीडियो',
    hours: 'घंटे',
    minutes: 'मिनट',
    students: 'छात्र',
    startLearning: 'सीखना शुरू करें',
    continueWatching: 'देखना जारी रखें',
    preview: 'पूर्वावलोकन',
    giftHours: 'मुफ्त परीक्षण',
    giftHoursInfo: 'घंटे मुफ्त परीक्षण',
    progress: 'प्रगति',
    loading: 'कोर्स लोड हो रहे हैं...',
    noCoursesFound: 'कोई कोर्स नहीं मिला',
    loginToEnroll: 'नामांकन के लिए लॉगिन करें',
    browseAll: 'सभी कोर्स देखें',
    yourProgress: 'आपकी प्रगति',
    daysRemaining: 'दिन शेष',
    languageLabel: 'भाषा',
  },
  mr: {
    heroTitle: 'आपल्या गतीने शिका',
    heroSubtitle: 'आमच्या व्यावसायिकपणे रेकॉर्ड केलेल्या योग कोर्सेससह तुमचे आयुष्य बदला. कधीही, कुठेही सराव करा.',
    searchPlaceholder: 'कोर्स शोधा...',
    allLevels: 'सर्व स्तर',
    beginner: 'नवशिक्या',
    intermediate: 'मध्यम',
    advanced: 'प्रगत',
    free: 'मोफत',
    enrolled: 'नोंदणीकृत',
    videos: 'व्हिडिओ',
    hours: 'तास',
    minutes: 'मिनिटे',
    students: 'विद्यार्थी',
    startLearning: 'शिकणे सुरू करा',
    continueWatching: 'पाहणे सुरू ठेवा',
    preview: 'पूर्वावलोकन',
    giftHours: 'मोफत चाचणी',
    giftHoursInfo: 'तास मोफत चाचणी',
    progress: 'प्रगती',
    loading: 'कोर्सेस लोड होत आहेत...',
    noCoursesFound: 'कोणताही कोर्स सापडला नाही',
    loginToEnroll: 'नोंदणीसाठी लॉगिन करा',
    browseAll: 'सर्व कोर्सेस पहा',
    yourProgress: 'तुमची प्रगती',
    daysRemaining: 'दिवस शिल्लक',
    languageLabel: 'भाषा',
  },
  ne: {
    heroTitle: 'आफ्नो गतिमा सिक्नुहोस्',
    heroSubtitle: 'हाम्रो व्यावसायिक रूपमा रेकर्ड गरिएको योग कोर्सहरूसँग आफ्नो जीवन परिवर्तन गर्नुहोस्। जुनसुकै समय, जहाँसुकै अभ्यास गर्नुहोस्।',
    searchPlaceholder: 'कोर्स खोज्नुहोस्...',
    allLevels: 'सबै स्तर',
    beginner: 'शुरुवात',
    intermediate: 'मध्यम',
    advanced: 'उन्नत',
    free: 'नि:शुल्क',
    enrolled: 'भर्ना भइसकेको',
    videos: 'भिडियो',
    hours: 'घण्टा',
    minutes: 'मिनेट',
    students: 'विद्यार्थी',
    startLearning: 'सिक्न सुरु गर्नुहोस्',
    continueWatching: 'हेर्न जारी राख्नुहोस्',
    preview: 'पूर्वावलोकन',
    giftHours: 'नि:शुल्क परीक्षण',
    giftHoursInfo: 'घण्टा नि:शुल्क परीक्षण',
    progress: 'प्रगति',
    loading: 'कोर्सहरू लोड हुँदैछ...',
    noCoursesFound: 'कुनै कोर्स भेटिएन',
    loginToEnroll: 'भर्नाको लागि लगइन गर्नुहोस्',
    browseAll: 'सबै कोर्स हेर्नुहोस्',
    yourProgress: 'तपाईंको प्रगति',
    daysRemaining: 'दिन बाँकी',
    languageLabel: 'भाषा',
  },
};

interface Course {
  _id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  thumbnail?: string;
  level: string;
  videoLanguage?: string;
  category?: string;
  totalDuration: number;
  totalVideos: number;
  pricing: {
    INR: { price: number; originalPrice?: number };
    USD?: { price: number; originalPrice?: number };
    NPR?: { price: number; originalPrice?: number };
  };
  discount?: number;
  promoCode?: string;
  isFree: boolean;
  giftHours?: {
    enabled: boolean;
    hours: number;
  };
  enrolledCount: number;
  averageRating?: number;
  reviewCount?: number;
  likes?: number;
  comments?: number;
  isEnrolled: boolean;
  progress?: number;
}

type Language = string;

interface LanguageFolder {
  _id: string;
  code: string;
  name: string;
  flag: string;
  thumbnail: string;
  isActive: boolean;
  order: number;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [language, setLanguage] = useState<Language>('all');
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [languageFolders, setLanguageFolders] = useState<LanguageFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<LanguageFolder | null>(null);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Always use English for UI - only course content translates
  const t = translations.en;

  // Get current language info
  const currentLangInfo = language === 'all'
    ? { code: 'all', name: 'All Languages', flag: '🌍' }
    : languageOptions.find(l => l.code === language) || languageOptions[0];

  // Fetch language folders on mount
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        setLoadingFolders(true);
        const response = await fetch('/api/language-folders');
        const data = await response.json();
        if (data.success && Array.isArray(data.folders)) {
          const sortedFolders = data.folders.sort((a: LanguageFolder, b: LanguageFolder) => a.order - b.order);
          setLanguageFolders(sortedFolders);
        }
      } catch (err) {
        console.error('Error fetching language folders:', err);
      } finally {
        setLoadingFolders(false);
      }
    };
    fetchFolders();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get language from localStorage, default to 'all'
  useEffect(() => {
    const savedLang = localStorage.getItem('preferred_language');
    if (savedLang && (savedLang === 'all' || languageOptions.some(l => l.code === savedLang))) {
      setLanguage(savedLang as Language);
    }
    // Default to 'all' if nothing saved
  }, []);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const langParam = selectedFolder ? selectedFolder.code : language;
      const response = await fetch(`/api/recorded-courses?lang=${langParam}`, { headers });
      const data = await response.json();

      if (data.success) {
        setCourses(data.courses || []);
        setIsLoggedIn(data.isLoggedIn);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  }, [language, selectedFolder]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    localStorage.setItem('preferred_language', newLang);
    setLangDropdownOpen(false);
    setSelectedFolder(null);
    setSearchQuery('');
    setSelectedLevel('all');
  };

  // Filter courses by language, search, and level
  const filteredCourses = courses.filter((course) => {
    // Show all languages if selected language is 'all', otherwise filter by videoLanguage
    const matchesLanguage = language === 'all' || course.videoLanguage === language || !course.videoLanguage;
    const matchesSearch = searchQuery === '' ||
      course.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = selectedLevel === 'all' || course.level === selectedLevel;
    return matchesLanguage && matchesSearch && matchesLevel;
  });

  // Format duration (in days)
  const formatDuration = (days: number) => {
    if (days > 0) {
      return `${days} ${days === 1 ? 'day' : 'days'}`;
    }
    return '0 days';
  };

  // Format price
  const formatPrice = (course: Course) => {
    if (course.isFree) return t.free;
    const symbol = language === 'ne' ? 'रु.' : '₹';
    const price = language === 'ne' ? (course.pricing.NPR?.price || course.pricing.INR.price) : course.pricing.INR.price;
    return `${symbol}${price?.toLocaleString() || '0'}`;
  };

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'beginner': return t.beginner;
      case 'intermediate': return t.intermediate;
      case 'advanced': return t.advanced;
      default: return level;
    }
  };

  return (
    <div className={`min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 ${['hi', 'mr', 'ne'].includes(language) ? 'devanagari' : ''}`}>
      <Navigation />

      {/* Hero Section - Dark Black Glossy */}
      <section className="relative py-10 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)' }}>
        {/* Glossy overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

        {/* Subtle glow effects */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-green-500/10 rounded-full blur-3xl" />

        {/* Back Button (Phase 2 only) */}
        {selectedFolder && (
          <div className="absolute top-4 left-4 z-20">
            <button
              onClick={() => {
                setSelectedFolder(null);
                setSearchQuery('');
                setSelectedLevel('all');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700 shadow-md hover:bg-gray-700 transition-all text-gray-200 font-medium text-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Languages
            </button>
          </div>
        )}

        {/* Language Selector - Top Right (Phase 1 and 2) */}
        <div className="absolute top-4 right-4 z-20" ref={langDropdownRef}>
          <button
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700 shadow-md hover:bg-gray-700 transition-all"
          >
            <span className="text-lg">{currentLangInfo.flag}</span>
            <span className="font-medium text-gray-200 text-sm">{currentLangInfo.name}</span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${langDropdownOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {langDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
              {/* All Languages Option */}
              <button
                onClick={() => {
                  handleLanguageChange('all');
                  setLangDropdownOpen(false);
                }}
                className={`w-full px-4 py-3 text-left flex items-center gap-3 text-sm font-medium transition-all border-b border-gray-800 ${
                  language === 'all'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-900 text-gray-300 hover:bg-gray-800'
                }`}
              >
                <span className="text-lg">🌍</span>
                <span>All</span>
                {language === 'all' && (
                  <svg className="w-4 h-4 ml-auto text-green-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>

              {/* Individual Languages */}
              {languageOptions.map((lang, idx) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    handleLanguageChange(lang.code);
                    setLangDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-3 text-left flex items-center gap-3 text-sm font-medium transition-all ${
                    idx < languageOptions.length - 1 ? 'border-b border-gray-800' : ''
                  } ${
                    language === lang.code
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-900 text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span>{lang.name}</span>
                  {language === lang.code && (
                    <svg className="w-4 h-4 ml-auto text-green-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative max-w-7xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight text-green-500">
              {selectedFolder ? selectedFolder.name : t.heroTitle}
            </h1>
            <p className="text-base md:text-lg text-gray-400 mb-4 leading-relaxed">
              {selectedFolder ? `Browse all ${selectedFolder.name} workshops` : t.heroSubtitle}
            </p>

            {/* Phase 2: Search Input */}
            {selectedFolder && (
              <div className="max-w-md mx-auto relative">
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-5 py-3 rounded-full text-white placeholder-gray-500 bg-gray-800/80 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-700"
                />
                <svg
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            )}
          </div>

          {/* Phase 1: Language Folder Cards Grid */}
          {!selectedFolder && (
            <div className="mt-12">
              {loadingFolders ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                (() => {
                  const filteredFolders = languageFolders.filter(folder => language === 'all' || folder.code === language);
                  if (filteredFolders.length === 0) {
                    return language === 'all' ? (
                      <div className="text-center py-12">
                        <p className="text-gray-400 mb-4">No folders available</p>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <svg className="w-16 h-16 text-yellow-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-lg font-bold text-gray-900 dark:text-white mb-2">Coming Soon!</p>
                        <p className="text-gray-600 dark:text-gray-400">We're preparing amazing workshops in {currentLangInfo.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Stay tuned for updates!</p>
                      </div>
                    );
                  }
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredFolders.map((folder) => (
                    <button
                      key={folder._id}
                      onClick={() => setSelectedFolder(folder)}
                      className="group relative rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 h-full flex flex-col"
                    >
                      {/* Folder Thumbnail */}
                      <div className="relative w-full aspect-video bg-gradient-to-br from-green-800 to-green-900 overflow-hidden">
                        {folder.thumbnail ? (
                          <img
                            src={folder.thumbnail}
                            alt={folder.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <svg className="w-16 h-16 text-green-400/50" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                            </svg>
                          </div>
                        )}

                        {/* Language Badge */}
                        <div className="absolute top-3 right-3 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                          <span className="text-lg">{folder.flag}</span>
                          <span>{folder.code.toUpperCase()}</span>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="flex-1 p-4 flex flex-col justify-between">
                        {/* Heading */}
                        <div className="mb-4">
                          <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white line-clamp-2">
                            {folder.name}
                          </h3>
                        </div>

                        {/* Stats and Action */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10.894 2.553a.961.961 0 00-1.788 0l-7 140a.955.955 0 001.379 1.007L10 5.45l6.515 8.11a.956.956 0 101.379-1.007l-7-140z" />
                              </svg>
                              0
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                              </svg>
                              0
                            </span>
                          </div>

                          <button
                            className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors"
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedFolder(folder);
                            }}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </button>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>
          )}
        </div>
      </section>

      {/* Filter Section (Phase 2 only) */}
      {selectedFolder && (
        <section className="py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {['all', 'beginner', 'intermediate', 'advanced'].map((level) => (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                    selectedLevel === level
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:border-gray-700'
                  }`}
                >
                  {level === 'all' ? t.allLevels : getLevelLabel(level)}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Courses Grid (Phase 2 only) */}
      {selectedFolder && (
      <section className="py-10 flex-grow bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-3 border-green-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-500 dark:text-gray-400">{t.loading}</p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-20">
              <svg
                className="w-16 h-16 text-yellow-500 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-bold text-gray-900 dark:text-white mb-2">Coming Soon!</p>
              <p className="text-gray-600 dark:text-gray-400">We're preparing amazing workshops in {selectedFolder?.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Stay tuned for updates!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <Link
                  key={course._id}
                  href={`/e-learning/${course.slug}`}
                  className="group"
                >
                  <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700">
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-gradient-to-br from-green-800 to-green-900">
                      {course.thumbnail && !course.thumbnail.includes('placehold') ? (
                        <Image
                          src={course.thumbnail}
                          alt={course.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                          <svg className="w-12 h-12 text-green-400 mb-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                          <span className="text-sm font-medium text-green-300 opacity-80">Swar Yoga</span>
                        </div>
                      )}

                      {/* Badges */}
                      <div className="absolute top-3 left-3 flex gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getLevelBadgeColor(course.level)}`}>
                          {getLevelLabel(course.level)}
                        </span>
                        {course.isFree && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500 text-white">
                            {t.free}
                          </span>
                        )}
                        {course.isEnrolled && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-500 text-white">
                            {t.enrolled}
                          </span>
                        )}
                      </div>

                      {/* Gift Hours Badge */}
                      {course.giftHours?.enabled && !course.isEnrolled && (
                        <div className="absolute bottom-3 left-3">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500 text-white flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {course.giftHours.hours} {t.giftHoursInfo}
                          </span>
                        </div>
                      )}

                      {/* Progress overlay if enrolled */}
                      {course.isEnrolled && course.progress !== undefined && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                          <div className="flex items-center justify-between text-white text-sm mb-1">
                            <span>{t.progress}</span>
                            <span>{course.progress}%</span>
                          </div>
                          <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500 rounded-full transition-all"
                              style={{ width: `${course.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 line-clamp-2 group-hover:text-green-600 transition-colors">
                        {course.title}
                      </h3>
                      {course.subtitle && (
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-2 line-clamp-2">
                          {course.subtitle}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {course.totalVideos} {t.videos}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatDuration(course.totalDuration)} • {languageOptions.find(l => l.code === (course.videoLanguage || 'en'))?.name}
                        </span>
                      </div>

                      {/* Likes, Comments, Rating */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {/* Likes */}
                          <span className="flex items-center gap-1 text-xs">
                            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                            <span className="text-gray-600 dark:text-gray-400 font-medium">{course.likes || 0}</span>
                          </span>
                          {/* Comments */}
                          <span className="flex items-center gap-1 text-xs">
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span className="text-gray-600 dark:text-gray-400 font-medium">{course.comments || 0}</span>
                          </span>
                        </div>
                        {/* 5 Star Rating */}
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg
                              key={star}
                              className={`w-4 h-4 ${
                                star <= Math.round(course.averageRating || 0)
                                  ? 'text-yellow-400'
                                  : 'text-gray-300 dark:text-gray-600'
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>

                      {/* Students count */}
                      <div className="flex items-center justify-end mb-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {(15 + course.enrolledCount).toLocaleString()} {t.students}
                        </span>
                      </div>

                      {/* Price & CTA */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex flex-col gap-1">
                          {!course.isFree && course.discount && course.discount > 0 ? (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 line-through">
                                  {language === 'ne' ? 'रु.' : '₹'}{(course.pricing.INR?.price || 0).toLocaleString()}
                                </span>
                                <span className="text-lg font-bold text-red-600">
                                  {language === 'ne' ? 'रु.' : '₹'}{Math.round((course.pricing.INR?.price || 0) * (1 - course.discount / 100)).toLocaleString()}
                                </span>
                              </div>
                              <span className="text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-1 rounded w-fit">
                                {course.discount}% OFF
                              </span>
                            </>
                          ) : (
                            <span className="text-xl font-bold text-green-600">
                              {formatPrice(course)}
                            </span>
                          )}
                        </div>
                        <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-all">
                          {course.isEnrolled ? t.continueWatching : t.startLearning}
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
      )}

      <Footer />
    </div>
  );
}
