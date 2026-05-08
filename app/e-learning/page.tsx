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

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [language, setLanguage] = useState<Language>('en');
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Use English as fallback if translation not available
  const t = translations[language] || translations.en;

  // Get current language info
  const currentLangInfo = languageOptions.find(l => l.code === language) || languageOptions[0];

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

  // Get language from localStorage or browser
  useEffect(() => {
    const savedLang = localStorage.getItem('preferred_language');
    if (savedLang && languageOptions.some(l => l.code === savedLang)) {
      setLanguage(savedLang);
    } else {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('hi')) setLanguage('hi');
      else if (browserLang.startsWith('mr')) setLanguage('mr');
      else if (browserLang.startsWith('ne')) setLanguage('ne');
    }
  }, []);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`/api/recorded-courses?lang=${language}`, { headers });
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
  }, [language]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    localStorage.setItem('preferred_language', newLang);
    setLangDropdownOpen(false);
  };

  // Filter courses
  const filteredCourses = courses.filter((course) => {
    const matchesSearch = searchQuery === '' || 
      course.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = selectedLevel === 'all' || course.level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  // Format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours} ${t.hours} ${minutes > 0 ? `${minutes} ${t.minutes}` : ''}`;
    }
    return `${minutes} ${t.minutes}`;
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

        {/* Language Dropdown - Top Right */}
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
            <div className="absolute top-full right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden max-h-80 overflow-y-auto">
              {languageOptions.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-700 transition-colors ${
                    language === lang.code ? 'bg-gray-700 font-semibold' : ''
                  }`}
                >
                  <span className="text-xl">{lang.flag}</span>
                  <span className="text-gray-200">{lang.name}</span>
                  {language === lang.code && (
                    <svg className="w-4 h-4 text-green-500 ml-auto" fill="currentColor" viewBox="0 0 20 20">
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
              {t.heroTitle}
            </h1>
            <p className="text-base md:text-lg text-gray-400 mb-4 leading-relaxed">
              {t.heroSubtitle}
            </p>

            {/* Search */}
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
          </div>
        </div>
      </section>

      {/* Filter Section */}
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

      {/* Courses Grid */}
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
                className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-lg text-gray-500 dark:text-gray-400">{t.noCoursesFound}</p>
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
                          {formatDuration(course.totalDuration)}
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
                          {course.enrolledCount.toLocaleString()} {t.students}
                        </span>
                      </div>

                      {/* Price & CTA */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex flex-col gap-1">
                          {!course.isFree && course.discount && course.discount > 0 ? (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 line-through">
                                  {language === 'ne' ? 'रु.' : '₹'}{Math.round((course.pricing.INR?.price || 0) / (1 - course.discount / 100)).toLocaleString()}
                                </span>
                                <span className="text-lg font-bold text-red-600">
                                  {formatPrice(course)}
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

      <Footer />
    </div>
  );
}
