'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { addCartItem } from '@/lib/cart';

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

// Multi-language translations
const translations: Record<string, any> = {
  en: {
    previewVideo: 'Preview Video',
    courseContent: 'Course Content',
    whatYouWillLearn: 'What You Will Learn',
    requirements: 'Requirements',
    targetAudience: 'Who This Course Is For',
    instructor: 'Instructor',
    reviews: 'Student Reviews',
    materials: 'Course Materials',
    videos: 'videos',
    sections: 'sections',
    hours: 'hours',
    minutes: 'min',
    total: 'Total',
    free: 'Free',
    locked: 'Locked',
    preview: 'Preview',
    enrollNow: 'Enroll Now',
    startLearning: 'Start Learning',
    continueWatching: 'Continue Watching',
    giftHours: 'Start Free Trial',
    giftHoursInfo: 'hours free trial included',
    loginToEnroll: 'Login to Enroll',
    enrolled: 'Enrolled',
    progress: 'Your Progress',
    lifetime: 'Lifetime Access',
    accessDays: 'days access',
    maxDevices: 'devices allowed',
    downloadable: 'Downloadable resources',
    certificate: 'Certificate on completion',
    moneyBackGuarantee: '30-day money back guarantee',
    loading: 'Loading...',
    courseNotFound: 'Course not found',
    backToCourses: 'Back to Courses',
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    students: 'students enrolled',
    lastUpdated: 'Last updated',
    language: 'Language',
    buyNow: 'Buy Now',
    addToCart: 'Add to Cart',
    shareThis: 'Share this course',
    seeAll: 'See All',
  },
  hi: {
    previewVideo: 'प्रीव्यू वीडियो',
    courseContent: 'कोर्स सामग्री',
    whatYouWillLearn: 'आप क्या सीखेंगे',
    requirements: 'आवश्यकताएं',
    targetAudience: 'यह कोर्स किसके लिए है',
    instructor: 'प्रशिक्षक',
    reviews: 'छात्र समीक्षा',
    materials: 'कोर्स सामग्री',
    videos: 'वीडियो',
    sections: 'खंड',
    hours: 'घंटे',
    minutes: 'मिनट',
    total: 'कुल',
    free: 'मुफ्त',
    locked: 'लॉक',
    preview: 'पूर्वावलोकन',
    enrollNow: 'अभी नामांकन करें',
    startLearning: 'सीखना शुरू करें',
    continueWatching: 'देखना जारी रखें',
    giftHours: 'मुफ्त परीक्षण शुरू करें',
    giftHoursInfo: 'घंटे मुफ्त परीक्षण शामिल',
    loginToEnroll: 'नामांकन के लिए लॉगिन करें',
    enrolled: 'नामांकित',
    progress: 'आपकी प्रगति',
    lifetime: 'आजीवन पहुंच',
    accessDays: 'दिन की पहुंच',
    maxDevices: 'डिवाइस की अनुमति',
    downloadable: 'डाउनलोड करने योग्य संसाधन',
    certificate: 'पूर्णता पर प्रमाणपत्र',
    moneyBackGuarantee: '30-दिन की मनी बैक गारंटी',
    loading: 'लोड हो रहा है...',
    courseNotFound: 'कोर्स नहीं मिला',
    backToCourses: 'कोर्स पर वापस जाएं',
    beginner: 'शुरुआती',
    intermediate: 'मध्यम',
    advanced: 'उन्नत',
    students: 'छात्र नामांकित',
    lastUpdated: 'अंतिम अपडेट',
    language: 'भाषा',
    buyNow: 'अभी खरीदें',
    addToCart: 'कार्ट में जोड़ें',
    shareThis: 'इस कोर्स को शेयर करें',
    seeAll: 'सभी देखें',
  },
  ne: {
    previewVideo: 'पूर्वावलोकन भिडियो',
    courseContent: 'कोर्स सामग्री',
    whatYouWillLearn: 'तपाईंले के सिक्नुहुनेछ',
    requirements: 'आवश्यकताहरू',
    targetAudience: 'यो कोर्स कसका लागि हो',
    instructor: 'प्रशिक्षक',
    reviews: 'विद्यार्थी समीक्षा',
    materials: 'कोर्स सामग्री',
    videos: 'भिडियो',
    sections: 'खण्ड',
    hours: 'घण्टा',
    minutes: 'मिनेट',
    total: 'जम्मा',
    free: 'नि:शुल्क',
    locked: 'लक गरिएको',
    preview: 'पूर्वावलोकन',
    enrollNow: 'अहिले भर्ना हुनुहोस्',
    startLearning: 'सिक्न सुरु गर्नुहोस्',
    continueWatching: 'हेर्न जारी राख्नुहोस्',
    giftHours: 'नि:शुल्क परीक्षण सुरु गर्नुहोस्',
    giftHoursInfo: 'घण्टा नि:शुल्क परीक्षण समावेश',
    loginToEnroll: 'भर्नाको लागि लगइन गर्नुहोस्',
    enrolled: 'भर्ना भइसकेको',
    progress: 'तपाईंको प्रगति',
    lifetime: 'आजीवन पहुँच',
    accessDays: 'दिन पहुँच',
    maxDevices: 'उपकरण अनुमति',
    downloadable: 'डाउनलोड गर्न मिल्ने स्रोतहरू',
    certificate: 'पूरा गरेपछि प्रमाणपत्र',
    moneyBackGuarantee: '30-दिने पैसा फिर्ता ग्यारेन्टी',
    loading: 'लोड हुँदैछ...',
    courseNotFound: 'कोर्स भेटिएन',
    backToCourses: 'कोर्सहरूमा फर्कनुहोस्',
    beginner: 'शुरुवात',
    intermediate: 'मध्यम',
    advanced: 'उन्नत',
    students: 'विद्यार्थी भर्ना',
    lastUpdated: 'अन्तिम अपडेट',
    language: 'भाषा',
    buyNow: 'अहिले किन्नुहोस्',
    addToCart: 'कार्टमा थप्नुहोस्',
    shareThis: 'यो कोर्स साझा गर्नुहोस्',
    seeAll: 'सबै हेर्नुहोस्',
  },
  mr: {
    previewVideo: 'पूर्वावलोकन व्हिडिओ',
    courseContent: 'कोर्स सामग्री',
    whatYouWillLearn: 'तुम्ही काय शिकाल',
    requirements: 'आवश्यकता',
    targetAudience: 'हा कोर्स कोणासाठी आहे',
    instructor: 'प्रशिक्षक',
    reviews: 'विद्यार्थी पुनरावलोकने',
    materials: 'कोर्स साहित्य',
    videos: 'व्हिडिओ',
    sections: 'विभाग',
    hours: 'तास',
    minutes: 'मिनिटे',
    total: 'एकूण',
    free: 'मोफत',
    locked: 'लॉक केलेले',
    preview: 'पूर्वावलोकन',
    enrollNow: 'आत्ता नोंदणी करा',
    startLearning: 'शिकणे सुरू करा',
    continueWatching: 'पाहणे सुरू ठेवा',
    giftHours: 'मोफत चाचणी सुरू करा',
    giftHoursInfo: 'तास मोफत चाचणी समाविष्ट',
    loginToEnroll: 'नोंदणीसाठी लॉगिन करा',
    enrolled: 'नोंदणीकृत',
    progress: 'तुमची प्रगती',
    lifetime: 'आजीवन प्रवेश',
    accessDays: 'दिवस प्रवेश',
    maxDevices: 'उपकरणांना परवानगी',
    downloadable: 'डाउनलोड करण्यायोग्य संसाधने',
    certificate: 'पूर्ण केल्यावर प्रमाणपत्र',
    moneyBackGuarantee: '30-दिवसांची पैसे परत गॅरंटी',
    loading: 'लोड होत आहे...',
    courseNotFound: 'कोर्स सापडला नाही',
    backToCourses: 'कोर्सेसकडे परत',
    beginner: 'नवशिक्या',
    intermediate: 'मध्यम',
    advanced: 'प्रगत',
    students: 'विद्यार्थी नोंदणीकृत',
    lastUpdated: 'शेवटचे अपडेट',
    language: 'भाषा',
    buyNow: 'आत्ता खरेदी करा',
    addToCart: 'कार्टमध्ये जोडा',
    shareThis: 'हा कोर्स शेअर करा',
    seeAll: 'सर्व पहा',
  },
};

type Language = string;

interface Section {
  _id: string;
  title: string;
  description?: string;
  order: number;
}

interface Video {
  _id: string;
  title: string;
  description?: string;
  duration: number;
  accessType: 'free' | 'preview' | 'paid';
  sectionId?: string;
  order: number;
  canWatch: boolean;
  isLocked: boolean;
  videoUrl?: string;
  bunnyVideoId?: string;
}

interface Material {
  _id: string;
  title: string;
  type: string;
  fileUrl?: string;
}

interface Review {
  _id: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface Course {
  _id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  thumbnail?: string;
  previewVideoUrl?: string;
  level: string;
  category?: string;
  totalDuration: number;
  totalVideos: number;
  pricing: {
    INR: { price: number; originalPrice?: number };
    USD?: { price: number; originalPrice?: number };
    NPR?: { price: number; originalPrice?: number };
  };
  isFree: boolean;
  giftHours?: {
    enabled: boolean;
    hours: number;
    expirationDays?: number;
  };
  accessSettings?: {
    lifetimeAccess: boolean;
    accessDays: number;
    maxDevices: number;
    allowDownload: boolean;
  };
  enrolledCount: number;
  averageRating?: number;
  reviewCount?: number;
  instructor?: {
    name: string;
    bio?: string;
    avatar?: string;
  };
  whatYouWillLearn?: string[];
  requirements?: string[];
  targetAudience?: string[];
  updatedAt?: string;
}

interface Enrollment {
  _id: string;
  status: string;
  progress: number;
  giftHours?: {
    enabled: boolean;
    totalMinutes: number;
    usedMinutes: number;
    expiresAt?: string;
  };
  completedVideos?: { videoId: string; completedAt: string }[];
}

// Dummy preview videos for non-enrolled users
const DUMMY_PREVIEW_VIDEOS = [
  { id: 1, title: 'Introduction to the Course', duration: '10:30', thumbnail: 'https://swaryogacrm.b-cdn.net/thumbnails/default-video-1.jpg' },
  { id: 2, title: 'Getting Started Basics', duration: '15:45', thumbnail: 'https://swaryogacrm.b-cdn.net/thumbnails/default-video-2.jpg' },
  { id: 3, title: 'Core Concepts Explained', duration: '20:15', thumbnail: 'https://swaryogacrm.b-cdn.net/thumbnails/default-video-3.jpg' },
  { id: 4, title: 'Practice Session 1', duration: '25:00', thumbnail: 'https://swaryogacrm.b-cdn.net/thumbnails/default-video-4.jpg' },
  { id: 5, title: 'Advanced Techniques', duration: '18:30', thumbnail: 'https://swaryogacrm.b-cdn.net/thumbnails/default-video-5.jpg' },
];

export default function CourseDetailPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [slug, setSlug] = useState<string>(params.slug);
  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [canAccessPaidContent, setCanAccessPaidContent] = useState(false);
  const [giftHoursAvailable, setGiftHoursAvailable] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [language, setLanguage] = useState<Language>('en');
  const [showPreviewVideo, setShowPreviewVideo] = useState(false);
  
  // New state for registration flow
  const [showPreviewSection, setShowPreviewSection] = useState(false);
  const [showRegistrationPopup, setShowRegistrationPopup] = useState(false);
  const [showCurrencyPopup, setShowCurrencyPopup] = useState(false);
  const [registrationForm, setRegistrationForm] = useState({ name: '', email: '', phone: '' });
  const [registrationLoading, setRegistrationLoading] = useState(false);
  
  // Language dropdown state
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Use English as fallback if translation not available
  const t = translations[language] || translations.en;
  
  // Get current language info
  const currentLangInfo = languageOptions.find(l => l.code === language) || languageOptions[0];

  // Close language dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get language from localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('preferred_language');
    if (savedLang && languageOptions.some(l => l.code === savedLang)) {
      setLanguage(savedLang);
    }
  }, []);

  // Handle language change
  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    localStorage.setItem('preferred_language', newLang);
    setLangDropdownOpen(false);
  };

  const fetchCourse = useCallback(async () => {
    if (!slug) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`/api/recorded-courses?slug=${slug}&lang=${language}`, { headers });
      const data = await response.json();

      if (data.success) {
        setCourse(data.course);
        setSections(data.sections || []);
        setVideos(data.videos || []);
        setMaterials(data.materials || []);
        setReviews(data.reviews || []);
        setEnrollment(data.enrollment);
        setCanAccessPaidContent(data.canAccessPaidContent);
        setGiftHoursAvailable(data.giftHoursAvailable);
        setIsLoggedIn(data.isLoggedIn);
        
        // Expand first section by default
        if (data.sections?.length > 0) {
          setExpandedSections(new Set([data.sections[0]._id]));
        }
      }
    } catch (err) {
      console.error('Error fetching course:', err);
    } finally {
      setLoading(false);
    }
  }, [slug, language]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  const handleEnroll = async (useGiftHours = false) => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=/e-learning/${slug}`);
      return;
    }

    if (!course) return;

    setEnrolling(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/recorded-courses/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId: course._id,
          useGiftHours,
          currency: language === 'ne' ? 'NPR' : 'INR',
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.requiresPayment) {
          // Redirect to payment
          // Store payment data and redirect
          sessionStorage.setItem('paymentData', JSON.stringify(data.paymentData));
          router.push(`/e-learning/${slug}/payment`);
        } else {
          // Enrolled successfully (free course or gift hours)
          setEnrollment(data.enrollment);
          setCanAccessPaidContent(true);
          setGiftHoursAvailable(false);
        }
      } else {
        alert(data.error || 'Enrollment failed');
      }
    } catch (err) {
      console.error('Enrollment error:', err);
      alert('Enrollment failed. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  // Handle clicking "Start Learning" - go directly to currency selection
  const handleStartLearning = () => {
    if (enrollment) {
      // Already enrolled, go to learn page
      router.push(`/e-learning/${slug}/learn`);
    } else {
      // Show currency selection popup directly
      setShowCurrencyPopup(true);
    }
  };

  // Handle clicking on a preview video - show currency popup
  const handlePreviewVideoClick = () => {
    setShowCurrencyPopup(true);
  };

  // Handle registration form submission
  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!registrationForm.name.trim() || !registrationForm.email.trim() || !registrationForm.phone.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setRegistrationLoading(true);
    try {
      // Save to leads and create user account
      const response = await fetch('/api/admin/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registrationForm.name,
          email: registrationForm.email,
          phone: registrationForm.phone,
          source: 'e-learning-registration',
          status: 'lead',
          courseName: course?.title || '',
          courseSlug: slug,
          notes: `Registered for E-Learning course: ${course?.title}`,
        }),
      });

      // Also try to create a user account for auto-signup
      try {
        await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: registrationForm.name,
            email: registrationForm.email,
            phone: registrationForm.phone,
            password: registrationForm.phone, // Use phone as default password
          }),
        });
      } catch (signupErr) {
        // User might already exist, continue to payment
        console.log('User signup skipped, may already exist');
      }

      // Close registration popup and show currency selection
      setShowRegistrationPopup(false);
      setShowCurrencyPopup(true);
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed. Please try again.');
    } finally {
      setRegistrationLoading(false);
    }
  };

  // Handle currency selection and payment routing
  const handleCurrencySelect = (currency: 'INR' | 'NPR' | 'USD') => {
    if (!course) return;

    // Get the price for selected currency
    const price = currency === 'INR' 
      ? course.pricing.INR.price 
      : currency === 'NPR' 
        ? course.pricing.NPR?.price || course.pricing.INR.price * 1.6 
        : course.pricing.USD?.price || Math.round(course.pricing.INR.price / 83);

    // Add course to cart
    addCartItem({
      id: course._id,
      name: course.title,
      price: price,
      quantity: 1,
      currency: currency,
      kind: 'course',
      productId: course._id,
      image: course.thumbnail,
      description: course.subtitle || course.description?.slice(0, 100),
      duration: `${course.totalVideos} videos`,
    });

    setShowCurrencyPopup(false);

    // Use setTimeout to ensure localStorage is written before navigation
    setTimeout(() => {
      if (currency === 'NPR') {
        // Redirect to Nepal payment page
        const params = new URLSearchParams({
          course: slug,
          name: course.title,
          price: String(price),
        });
        window.location.href = `/pay-nepal?${params.toString()}`;
      } else {
        // INR or USD - go to checkout
        window.location.href = '/checkout-enhanced';
      }
    }, 100);
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}${t.hours} ${minutes}${t.minutes}`;
    }
    return `${minutes}${t.minutes}`;
  };

  // Get videos by section
  const getVideosBySection = (sectionId: string) => {
    return videos.filter((v) => v.sectionId === sectionId);
  };

  // Get uncategorized videos
  const uncategorizedVideos = videos.filter((v) => !v.sectionId);

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'beginner': return t.beginner;
      case 'intermediate': return t.intermediate;
      case 'advanced': return t.advanced;
      default: return level;
    }
  };

  const formatPrice = () => {
    if (!course || course.isFree) return t.free;
    const symbol = language === 'ne' ? 'रु.' : '₹';
    const price = language === 'ne' ? (course.pricing.NPR?.price || course.pricing.INR.price) : course.pricing.INR.price;
    return `${symbol}${price?.toLocaleString() || '0'}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">{t.loading}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t.courseNotFound}</h1>
            <Link href="/e-learning" className="text-orange-500 hover:text-orange-600">
              {t.backToCourses}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navigation />

      {/* Compact Hero Section */}
      <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white pt-20 pb-6">
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

        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Course Info - Left */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 text-sm">
                <Link href="/e-learning" className="text-gray-400 hover:text-white transition-colors">
                  ← {t.backToCourses}
                </Link>
                <span className="text-gray-500">|</span>
                <span className="text-green-400">{course.category || 'Yoga'}</span>
              </div>

              <h1 className="text-2xl md:text-3xl font-bold mb-2 leading-tight text-green-400">
                {course.title}
              </h1>

              {course.subtitle && (
                <p className="text-gray-300 mb-3">{course.subtitle}</p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-sm">
                {course.averageRating && (
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-yellow-400">{course.averageRating.toFixed(1)}</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg key={star} className={`w-4 h-4 ${star <= course.averageRating! ? 'text-yellow-400' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-gray-400">({course.reviewCount})</span>
                  </div>
                )}
                <span className="text-gray-400">{course.enrolledCount.toLocaleString()} {t.students}</span>
                <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full text-xs">
                  {getLevelLabel(course.level)}
                </span>
                <span className="text-gray-400">{course.totalVideos} {t.videos}</span>
                <span className="text-gray-400">{formatDuration(course.totalDuration)}</span>
              </div>
            </div>

            {/* Price Card - Right (Compact) */}
            <div className="w-full lg:w-72 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-xl">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice()}</span>
                {course.pricing.INR.originalPrice && !course.isFree && (
                  <span className="text-sm text-gray-400 line-through">₹{course.pricing.INR.originalPrice.toLocaleString()}</span>
                )}
              </div>
              {enrollment ? (
                <Link
                  href={`/e-learning/${slug}/learn`}
                  className="block w-full py-3 bg-orange-500 hover:bg-orange-600 text-white text-center font-bold rounded-lg transition-all"
                >
                  {enrollment.progress > 0 ? t.continueWatching : t.startLearning}
                </Link>
              ) : (
                <button
                  onClick={handleStartLearning}
                  disabled={enrolling}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold rounded-lg transition-all"
                >
                  {enrolling ? t.loading : t.startLearning}
                </button>
              )}
              <div className="flex flex-wrap gap-2 mt-3 text-xs text-gray-500 dark:text-gray-400">
                <span>✓ {course.accessSettings?.accessDays || 365} days</span>
                <span>✓ Certificate</span>
                <span>✓ 30-day refund</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content - Full Width Layout */}
      <section className="py-6 flex-1">
        <div className="max-w-5xl mx-auto px-4 space-y-6">
          
          {/* Course Content Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t.courseContent}</h2>
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                {sections.length > 0 ? sections.length : 1} {t.sections} • {course.totalVideos || videos.length} {t.videos} • {formatDuration(course.totalDuration)}
              </span>
            </div>
          </div>

          {/* About This Course Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">About This Course</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{course.description}</p>
          </div>

          {/* Requirements Card */}
          {course.requirements && course.requirements.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t.requirements}</h2>
              <ul className="space-y-3">
                {course.requirements.map((req, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-300">{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Centered Hero Preview Video */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="relative aspect-video bg-gray-900 cursor-pointer group" onClick={() => setShowPreviewVideo(true)}>
              {course.thumbnail ? (
                <Image src={course.thumbnail} alt={course.title} fill className="object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-600 to-green-800">
                  <span className="text-white text-5xl font-bold">{course.title.charAt(0)}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/50 transition-all">
                <div className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                  <svg className="w-10 h-10 text-green-600 ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
              <div className="absolute bottom-4 left-4 px-4 py-2 bg-black/80 rounded-lg text-white">
                <p className="font-semibold">🎬 {t.previewVideo}</p>
              </div>
              <div className="absolute top-4 right-4 px-3 py-1 bg-green-600 rounded-full text-white text-sm font-medium">
                FREE Preview
              </div>
            </div>
          </div>

          {/* Course Videos Grid - 3 columns on desktop */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Course Videos ({course.totalVideos} lessons)
              </h2>
              {!enrollment && (
                <span className="text-sm text-gray-500 dark:text-gray-400">🔒 Register to unlock</span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {DUMMY_PREVIEW_VIDEOS.map((video, index) => (
                <div
                  key={video.id}
                  onClick={enrollment ? undefined : handlePreviewVideoClick}
                  className={`relative rounded-xl overflow-hidden ${enrollment ? '' : 'cursor-pointer'} group bg-gray-900 shadow-md hover:shadow-xl transition-all hover:-translate-y-1`}
                >
                  {/* Video Card - YouTube Style 16:9 */}
                  <div className="aspect-video relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center ${enrollment ? 'bg-green-500' : 'bg-white/20 group-hover:bg-green-500'} transition-colors shadow-lg`}>
                        {enrollment ? (
                          <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        )}
                      </div>
                    </div>
                    {!enrollment && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-sm bg-green-500 px-4 py-2 rounded-full font-medium">🔓 Unlock</span>
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-white text-xs font-medium">
                      {video.duration}
                    </div>
                    <div className="absolute top-2 left-2 px-2 py-1 bg-green-600/90 rounded text-white text-xs font-medium">
                      Lesson {index + 1}
                    </div>
                  </div>
                  {/* Video Info */}
                  <div className="p-3 bg-white dark:bg-gray-800">
                    <p className="text-gray-900 dark:text-white font-medium text-sm line-clamp-2">{video.title}</p>
                    <div className="flex items-center gap-1 mt-2 text-gray-500 dark:text-gray-400 text-xs">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span>{Math.floor(Math.random() * 50) + 10} likes</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Register Now Button - Green */}
            {!enrollment && (
              <div className="mt-6 text-center">
                <button
                  onClick={handleStartLearning}
                  disabled={enrolling}
                  className="px-10 py-4 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-bold text-lg rounded-xl transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-3"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {enrolling ? t.loading : 'Register Now - Get Full Access'}
                </button>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  🔒 Unlock all {course.totalVideos} videos • {formatPrice()}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Preview Video Modal */}
      {showPreviewVideo && course.previewVideoUrl && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setShowPreviewVideo(false)}>
          <div className="relative w-full max-w-4xl aspect-video" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowPreviewVideo(false)}
              className="absolute -top-12 right-0 text-white hover:text-orange-400 transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <video
              src={course.previewVideoUrl}
              controls
              autoPlay
              className="w-full h-full rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Preview Videos Section - Shows 5 dummy videos when not enrolled */}
      {showPreviewSection && !enrollment && (
        <div className="fixed inset-0 bg-black/95 z-50 overflow-y-auto">
          <div className="min-h-screen py-8 px-4">
            <div className="max-w-6xl mx-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    {course?.title} - Preview
                  </h2>
                  <p className="text-gray-400">Click on any video to register and get full access</p>
                </div>
                <button
                  onClick={() => setShowPreviewSection(false)}
                  className="text-white hover:text-orange-400 transition-colors p-2"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Dummy Preview Videos Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {DUMMY_PREVIEW_VIDEOS.map((video, index) => (
                  <div
                    key={video.id}
                    onClick={handlePreviewVideoClick}
                    className="bg-gray-800 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-orange-500 transition-all group"
                  >
                    {/* Video Thumbnail */}
                    <div className="relative aspect-video bg-gradient-to-br from-orange-500/20 to-amber-600/20">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-2 mx-auto group-hover:bg-orange-500 transition-colors">
                            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                          <span className="text-white/70 text-sm">Preview {index + 1}</span>
                        </div>
                      </div>
                      {/* Lock Icon */}
                      <div className="absolute top-3 right-3 bg-black/50 rounded-full p-2">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    </div>
                    {/* Video Info */}
                    <div className="p-4">
                      <h3 className="text-white font-semibold mb-1 group-hover:text-orange-400 transition-colors">
                        {video.title}
                      </h3>
                      <p className="text-gray-400 text-sm">{video.duration}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA at bottom */}
              <div className="mt-8 text-center">
                <button
                  onClick={handlePreviewVideoClick}
                  className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all shadow-lg"
                >
                  Register Now to Unlock All Videos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Registration Popup */}
      {showRegistrationPopup && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowRegistrationPopup(false)}>
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Complete Registration
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Fill in your details to get full access to <span className="text-orange-500 font-semibold">{course?.title}</span>
              </p>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleRegistrationSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={registrationForm.name}
                  onChange={(e) => setRegistrationForm({ ...registrationForm, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Enter your full name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={registrationForm.email}
                  onChange={(e) => setRegistrationForm({ ...registrationForm, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Enter your email"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={registrationForm.phone}
                  onChange={(e) => setRegistrationForm({ ...registrationForm, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Enter your phone number"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={registrationLoading}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl"
              >
                {registrationLoading ? 'Registering...' : 'Register Now'}
              </button>
            </form>

            {/* Close button */}
            <button
              onClick={() => setShowRegistrationPopup(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Currency Selection Popup */}
      {showCurrencyPopup && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowCurrencyPopup(false)}>
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Select Your Currency
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Choose your preferred payment currency
              </p>
            </div>

            {/* Currency Options */}
            <div className="space-y-3">
              {/* INR Option */}
              <button
                onClick={() => handleCurrencySelect('INR')}
                className="w-full flex items-center justify-between p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">🇮🇳</span>
                  <div className="text-left">
                    <p className="font-bold text-gray-900 dark:text-white group-hover:text-orange-500">Indian Rupee (INR)</p>
                    <p className="text-sm text-gray-500">₹{course?.pricing.INR.price.toLocaleString()}</p>
                  </div>
                </div>
                <svg className="w-6 h-6 text-gray-400 group-hover:text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* NPR Option */}
              <button
                onClick={() => handleCurrencySelect('NPR')}
                className="w-full flex items-center justify-between p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">🇳🇵</span>
                  <div className="text-left">
                    <p className="font-bold text-gray-900 dark:text-white group-hover:text-orange-500">Nepali Rupee (NPR)</p>
                    <p className="text-sm text-gray-500">रु.{course?.pricing.NPR?.price?.toLocaleString() || Math.round((course?.pricing.INR.price || 0) * 1.6).toLocaleString()}</p>
                  </div>
                </div>
                <svg className="w-6 h-6 text-gray-400 group-hover:text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* USD Option */}
              <button
                onClick={() => handleCurrencySelect('USD')}
                className="w-full flex items-center justify-between p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">🇺🇸</span>
                  <div className="text-left">
                    <p className="font-bold text-gray-900 dark:text-white group-hover:text-orange-500">US Dollar (USD)</p>
                    <p className="text-sm text-gray-500">${course?.pricing.USD?.price?.toLocaleString() || Math.round((course?.pricing.INR.price || 0) / 83)}</p>
                  </div>
                </div>
                <svg className="w-6 h-6 text-gray-400 group-hover:text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Close button */}
            <button
              onClick={() => setShowCurrencyPopup(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
