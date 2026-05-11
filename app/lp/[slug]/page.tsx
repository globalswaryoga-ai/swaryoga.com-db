'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface LandingPageData {
  _id: string;
  slug: string;
  name: string;
  heroHeading?: string;
  heroSubheading?: string;
  heroImage?: string;
  heroImageFit?: 'cover' | 'contain' | 'fill' | 'none';
  heroImagePosition?: string;
  heroVideo?: string;
  heroCTA?: string;
  heroCtaLink?: string;
  eventTitle?: string;
  eventDescription?: string;
  startDate?: string;
  endDate?: string;
  eventTime?: string;
  location?: string;
  language?: string;
  pricing?: Array<{
    name: string;
    price: number;
    currency: string;
    originalPrice?: number;
    features: string[];
    isPopular: boolean;
    ctaText: string;
    paymentLink?: string;
  }>;
  instructorName?: string;
  instructorTitle?: string;
  instructorImage?: string;
  instructorBio?: string;
  benefits?: Array<{ icon: string; title: string; description: string }>;
  curriculum?: Array<{ title: string; description: string; duration: string }>;
  testimonials?: Array<{
    name: string;
    image?: string;
    location?: string;
    text: string;
    videoUrl?: string;
    rating?: number;
  }>;
  demoSession?: {
    enabled: boolean;
    title?: string;
    description?: string;
    date?: string;
    time?: string;
    zoomLink?: string;
    zoomId?: string;
    zoomPassword?: string;
  };
  faqs?: Array<{ question: string; answer: string }>;
  gallery?: Array<{ type: 'image' | 'video'; url: string; caption?: string }>;
  theme?: {
    mode: 'light' | 'dark' | 'custom';
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
    fontFamily: string;
  };
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
  };
  integrations?: {
    whatsappNumber?: string;
    whatsappMessage?: string;
    paymentLink?: string;
  };
  countdown?: {
    enabled: boolean;
    endDate?: string;
    message?: string;
  };
  socialProof?: {
    studentsCount?: number;
    reviewsCount?: number;
    avgRating?: number;
    yearsExperience?: number;
  };
  // World-Class Features
  trustBadges?: Array<{ image?: string; title: string; link?: string }>;
  guarantee?: {
    enabled: boolean;
    days?: number;
    title?: string;
    description?: string;
  };
  bonuses?: Array<{
    title: string;
    description?: string;
    value?: number;
    currency?: string;
    image?: string;
  }>;
  urgency?: {
    enabled: boolean;
    limitedSeats?: boolean;
    totalSeats?: number;
    seatsRemaining?: number;
    earlyBirdDeadline?: string;
    earlyBirdMessage?: string;
    showLiveCount?: boolean;
  };
  registrationForm?: {
    enabled: boolean;
    title?: string;
    subtitle?: string;
    fields?: Array<{
      name: string;
      type: string;
      required: boolean;
      placeholder?: string;
      options?: string[];
    }>;
    submitText?: string;
    successMessage?: string;
  };
  popup?: {
    enabled: boolean;
    type?: 'exit-intent' | 'timer' | 'scroll';
    delay?: number;
    title?: string;
    description?: string;
    ctaText?: string;
    ctaLink?: string;
    image?: string;
  };
  stickyHeader?: {
    enabled: boolean;
    text?: string;
    ctaText?: string;
    ctaLink?: string;
    showCountdown?: boolean;
  };
  announcementBar?: {
    enabled: boolean;
    text?: string;
    link?: string;
    backgroundColor?: string;
    textColor?: string;
  };
  transformation?: {
    enabled: boolean;
    title?: string;
    before?: { title?: string; points?: string[] };
    after?: { title?: string; points?: string[] };
  };
  videoSection?: {
    enabled: boolean;
    title?: string;
    description?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
  };
  liveNotifications?: {
    enabled: boolean;
    messages?: string[];
  };
  // New Global Standard Features
  logo?: {
    url?: string;
    altText?: string;
  };
  navigation?: {
    enabled: boolean;
    showLogo?: boolean;
    showLogin?: boolean;
    loginLink?: string;
    links?: Array<{ label: string; href: string }>;
  };
  problemStatement?: {
    enabled: boolean;
    title?: string;
    subtitle?: string;
    points?: Array<{ icon?: string; title: string; description?: string }>;
  };
  solution?: {
    enabled: boolean;
    title?: string;
    subtitle?: string;
    description?: string;
    image?: string;
    videoUrl?: string;
    points?: string[];
  };
  howItWorks?: {
    enabled: boolean;
    title?: string;
    subtitle?: string;
    steps?: Array<{ number?: number; icon?: string; title: string; description?: string }>;
  };
  leadMagnet?: {
    enabled: boolean;
    title?: string;
    subtitle?: string;
    description?: string;
    image?: string;
    downloadUrl?: string;
    buttonText?: string;
  };
  successStories?: Array<{
    name: string;
    title?: string;
    image?: string;
    videoUrl?: string;
    beforeStats?: string;
    afterStats?: string;
    testimonial?: string;
    duration?: string;
  }>;
  heroQuickBenefits?: Array<{ icon?: string; text: string }>;
  heroSecondaryCTA?: {
    enabled: boolean;
    text?: string;
    link?: string;
    icon?: string;
  };
  contactInfo?: {
    email?: string;
    phone?: string;
    address?: string;
    mapEmbed?: string;
  };
  footer?: {
    showAbout?: boolean;
    aboutText?: string;
    socialLinks?: {
      facebook?: string;
      instagram?: string;
      youtube?: string;
      twitter?: string;
      linkedin?: string;
    };
    quickLinks?: Array<{ label: string; href: string }>;
    showPrivacyPolicy?: boolean;
    privacyPolicyLink?: string;
    showTerms?: boolean;
    termsLink?: string;
    showRefundPolicy?: boolean;
    refundPolicyLink?: string;
    copyrightText?: string;
  };
  productDemo?: {
    enabled: boolean;
    title?: string;
    description?: string;
    demoType?: 'video' | 'gif' | 'interactive';
    mediaUrl?: string;
    screenshots?: string[];
  };
  newsletter?: {
    enabled: boolean;
    title?: string;
    subtitle?: string;
    buttonText?: string;
    placeholder?: string;
  };
  comparisonTable?: {
    enabled: boolean;
    title?: string;
    headers?: string[];
    rows?: Array<{ feature: string; values: string[] }>;
  };
}

const formatCurrency = (amount: number, currency: string) => {
  const symbols: Record<string, string> = { INR: '₹', USD: '$', NPR: 'रू', EUR: '€', GBP: '£' };
  return `${symbols[currency] || currency} ${amount.toLocaleString('en-IN')}`;
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

// Animated Counter Component
function AnimatedCounter({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          let start = 0;
          const increment = target / (duration / 16);
          const timer = setInterval(() => {
            start += increment;
            if (start >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration, hasAnimated]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
}

export default function LandingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  const isPreview = searchParams?.get('preview') === 'true';

  const [pageData, setPageData] = useState<LandingPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupDismissed, setPopupDismissed] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [viewingNow, setViewingNow] = useState(0);

  // Get theme override colors from URL params (for preview mode)
  const themeOverride = {
    primaryColor: searchParams?.get('primaryColor'),
    secondaryColor: searchParams?.get('secondaryColor'),
    accentColor: searchParams?.get('accentColor'),
    backgroundColor: searchParams?.get('backgroundColor'),
    textColor: searchParams?.get('textColor'),
  };

  // Hero image settings from URL params (for preview)
  const heroImageOverride = {
    heroImageFit: searchParams?.get('heroImageFit') as 'cover' | 'contain' | 'fill' | 'none' | null,
    heroImagePosition: searchParams?.get('heroImagePosition'),
  };

  useEffect(() => {
    if (!slug) return;
    const fetchPage = async () => {
      try {
        // In preview mode, check sessionStorage first for live form data from admin
        if (isPreview) {
          try {
            const previewData = sessionStorage.getItem(`lp-preview-${slug}`);
            if (previewData) {
              const parsedData = JSON.parse(previewData);
              console.log('[Preview] Loading from sessionStorage:', slug);
              setPageData(parsedData);
              setLoading(false);
              return; // Use sessionStorage data, skip API call
            }
          } catch (e) {
            console.warn('[Preview] Failed to read sessionStorage:', e);
          }
        }
        
        const url = isPreview ? `/api/landing-pages/${slug}?preview=true` : `/api/landing-pages/${slug}`;
        const res = await fetch(url);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Page not found');
        
        // Apply theme overrides from URL params (for live preview editing)
        const data = json.data;
        if (isPreview) {
          if (data.theme) {
            if (themeOverride.primaryColor) data.theme.primaryColor = themeOverride.primaryColor;
            if (themeOverride.secondaryColor) data.theme.secondaryColor = themeOverride.secondaryColor;
            if (themeOverride.accentColor) data.theme.accentColor = themeOverride.accentColor;
            if (themeOverride.backgroundColor) data.theme.backgroundColor = themeOverride.backgroundColor;
            if (themeOverride.textColor) data.theme.textColor = themeOverride.textColor;
          }
          // Apply hero image settings
          if (heroImageOverride.heroImageFit) data.heroImageFit = heroImageOverride.heroImageFit;
          if (heroImageOverride.heroImagePosition) data.heroImagePosition = heroImageOverride.heroImagePosition;
        }
        
        setPageData(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load page');
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
  }, [slug, isPreview, themeOverride.primaryColor, themeOverride.secondaryColor, themeOverride.accentColor, themeOverride.backgroundColor, themeOverride.textColor, heroImageOverride.heroImageFit, heroImageOverride.heroImagePosition]);

  // Countdown timer
  useEffect(() => {
    if (!pageData?.countdown?.enabled || !pageData.countdown.endDate) return;
    const updateCountdown = () => {
      const end = new Date(pageData.countdown!.endDate!).getTime();
      const now = Date.now();
      const diff = Math.max(0, end - now);
      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [pageData?.countdown]);

  // Sticky header on scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyHeader(window.scrollY > 500);
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress((window.scrollY / docHeight) * 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Popup timer
  useEffect(() => {
    if (!pageData?.popup?.enabled || popupDismissed) return;
    if (pageData.popup.type === 'timer') {
      const timer = setTimeout(() => setShowPopup(true), pageData.popup.delay || 5000);
      return () => clearTimeout(timer);
    }
  }, [pageData?.popup, popupDismissed]);

  // Exit intent popup
  useEffect(() => {
    if (!pageData?.popup?.enabled || pageData.popup.type !== 'exit-intent' || popupDismissed) return;
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY < 10) setShowPopup(true);
    };
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [pageData?.popup, popupDismissed]);

  // Live notifications
  useEffect(() => {
    if (!pageData?.liveNotifications?.enabled || !pageData.liveNotifications.messages?.length) return;
    const messages = pageData.liveNotifications.messages;
    const showNotification = () => {
      const msg = messages[Math.floor(Math.random() * messages.length)];
      setNotification(msg);
      setTimeout(() => setNotification(null), 4000);
    };
    const interval = setInterval(showNotification, 15000);
    setTimeout(showNotification, 3000);
    return () => clearInterval(interval);
  }, [pageData?.liveNotifications]);

  // Fake "viewing now" count
  useEffect(() => {
    if (!pageData?.urgency?.showLiveCount) return;
    setViewingNow(Math.floor(Math.random() * 20) + 10);
    const interval = setInterval(() => {
      setViewingNow(prev => Math.max(5, prev + Math.floor(Math.random() * 5) - 2));
    }, 10000);
    return () => clearInterval(interval);
  }, [pageData?.urgency?.showLiveCount]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 to-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !pageData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 to-white p-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Page Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'Landing page not found'}</p>
          <Link href="/" className="rounded-lg bg-orange-500 px-6 py-3 text-white hover:bg-orange-600">Go Home</Link>
        </div>
      </div>
    );
  }

  const theme = pageData.theme || {
    mode: 'light',
    primaryColor: '#FF6B35',
    secondaryColor: '#1E3A5F',
    accentColor: '#FFD700',
    backgroundColor: '#FFFFFF',
    textColor: '#333333',
    fontFamily: 'Inter',
  };

  const isDark = theme.mode === 'dark';
  const bgColor = isDark ? '#1a1a2e' : theme.backgroundColor;
  const textColor = isDark ? '#f5f5f5' : theme.textColor;

  const whatsappLink = pageData.integrations?.whatsappNumber
    ? `https://wa.me/${pageData.integrations.whatsappNumber}${pageData.integrations.whatsappMessage ? `?text=${encodeURIComponent(pageData.integrations.whatsappMessage)}` : ''}`
    : null;

  const ctaLink = pageData.heroCtaLink || pageData.integrations?.paymentLink || '#pricing';

  return (
    <div style={{ backgroundColor: bgColor, color: textColor, fontFamily: theme.fontFamily }} className="overflow-x-hidden">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 h-1 z-[100] transition-all duration-150" style={{ width: `${scrollProgress}%`, backgroundColor: theme.primaryColor }} />

      {/* Preview Banner */}
      {isPreview && (
        <div className="sticky top-0 z-[99] bg-yellow-400 text-yellow-900 py-2 px-4 text-center text-sm font-medium">
          ⚠️ Preview Mode - This page is not published yet.
          <a href="/admin/landing-pages" className="underline ml-2 hover:text-yellow-700">Go to Admin</a>
        </div>
      )}

      {/* Announcement Bar */}
      {pageData.announcementBar?.enabled && pageData.announcementBar.text && (
        <div
          className="py-2 px-4 text-center text-sm font-medium"
          style={{
            backgroundColor: pageData.announcementBar.backgroundColor || theme.primaryColor,
            color: pageData.announcementBar.textColor || '#fff',
          }}
        >
          {pageData.announcementBar.link ? (
            <a href={pageData.announcementBar.link} className="hover:underline">
              🎉 {pageData.announcementBar.text} →
            </a>
          ) : (
            <span>🎉 {pageData.announcementBar.text}</span>
          )}
        </div>
      )}

      {/* Sticky Header */}
      {(pageData.stickyHeader?.enabled !== false) && showStickyHeader && (
        <div
          className="fixed top-0 left-0 right-0 z-50 py-3 px-4 shadow-lg transition-transform duration-300"
          style={{ backgroundColor: isDark ? '#16213e' : '#fff' }}
        >
          <div className="container mx-auto flex items-center justify-between max-w-6xl">
            <div className="flex items-center gap-4">
              {pageData.logo?.url && (
                <img src={pageData.logo.url} alt={pageData.logo.altText || 'Logo'} className="h-8" />
              )}
              <span className="font-bold" style={{ color: theme.primaryColor }}>
                {pageData.stickyHeader?.text || pageData.name}
              </span>
              {pageData.stickyHeader?.showCountdown && pageData.countdown?.enabled && (
                <div className="hidden md:flex items-center gap-2 text-sm">
                  <span className="text-red-500 font-bold animate-pulse">⏰</span>
                  <span>{countdown.days}d {countdown.hours}h {countdown.minutes}m {countdown.seconds}s</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {pageData.urgency?.limitedSeats && pageData.urgency.seatsRemaining && (
                <span className="hidden sm:block text-sm text-red-600 font-medium animate-pulse">
                  🔥 Only {pageData.urgency.seatsRemaining} seats left!
                </span>
              )}
              <a
                href={pageData.stickyHeader?.ctaLink || ctaLink}
                className="px-5 py-2 rounded-full font-bold text-sm transition hover:scale-105"
                style={{ backgroundColor: theme.primaryColor, color: '#fff' }}
              >
                {pageData.stickyHeader?.ctaText || pageData.heroCTA || 'Enroll Now'}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Bar */}
      {(pageData.navigation?.enabled !== false) && (
        <nav className="absolute top-0 left-0 right-0 z-40 py-4 px-4" style={{ backgroundColor: 'transparent' }}>
          <div className="container mx-auto flex items-center justify-between max-w-6xl">
            <div className="flex items-center gap-3">
              {pageData.logo?.url ? (
                <img src={pageData.logo.url} alt={pageData.logo.altText || 'Logo'} className="h-10" />
              ) : (
                <span className="text-xl font-bold" style={{ color: pageData.heroImage ? '#fff' : theme.primaryColor }}>
                  {pageData.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              {pageData.navigation?.links?.map((link, idx) => (
                <a key={idx} href={link.href} className="hidden md:block text-sm font-medium transition hover:opacity-80" style={{ color: pageData.heroImage ? '#fff' : textColor }}>
                  {link.label}
                </a>
              ))}
              {pageData.navigation?.showLogin && (
                <a href={pageData.navigation.loginLink || '/login'} className="hidden md:block text-sm font-medium transition hover:opacity-80" style={{ color: pageData.heroImage ? '#fff' : textColor }}>
                  Login
                </a>
              )}
              <a
                href={ctaLink}
                className="px-4 py-2 rounded-full font-bold text-sm transition hover:scale-105"
                style={{ backgroundColor: theme.primaryColor, color: '#fff' }}
              >
                {pageData.heroCTA || 'Register'}
              </a>
            </div>
          </div>
        </nav>
      )}

      {/* Hero Section */}
      <section
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        style={{
          background: pageData.heroImage
            ? `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6))`
            : `linear-gradient(135deg, ${theme.primaryColor}20, ${theme.secondaryColor}20)`,
        }}
      >
        {/* Hero Background Image with adjustable fit/position */}
        {pageData.heroImage && (
          <div 
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: `url(${pageData.heroImage})`,
              backgroundSize: pageData.heroImageFit === 'contain' ? 'contain' : 
                              pageData.heroImageFit === 'fill' ? '100% 100%' : 
                              pageData.heroImageFit === 'none' ? 'auto' : 'cover',
              backgroundPosition: pageData.heroImagePosition || 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />
        )}
        <div className="container mx-auto px-4 py-20 text-center relative z-10">
          {/* Live Viewing Count */}
          {pageData.urgency?.showLiveCount && viewingNow > 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-sm animate-pulse" style={{ backgroundColor: 'rgba(255,0,0,0.1)', color: '#ef4444' }}>
              <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
              <span className="font-medium">{viewingNow} people viewing this page right now</span>
            </div>
          )}

          {/* Social Proof Bar */}
          {pageData.socialProof && (pageData.socialProof.studentsCount || pageData.socialProof.avgRating) && (
            <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-8">
              {pageData.socialProof.studentsCount && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                  <span className="text-2xl">👥</span>
                  <span style={{ color: pageData.heroImage ? '#fff' : textColor }}>
                    <strong><AnimatedCounter target={pageData.socialProof.studentsCount} />+</strong> Students
                  </span>
                </div>
              )}
              {pageData.socialProof.reviewsCount && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                  <span className="text-2xl">💬</span>
                  <span style={{ color: pageData.heroImage ? '#fff' : textColor }}>
                    <strong><AnimatedCounter target={pageData.socialProof.reviewsCount} />+</strong> Reviews
                  </span>
                </div>
              )}
              {pageData.socialProof.avgRating && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                  <span className="text-2xl">⭐</span>
                  <span style={{ color: pageData.heroImage ? '#fff' : textColor }}>
                    <strong>{pageData.socialProof.avgRating}</strong>/5 Rating
                  </span>
                </div>
              )}
              {pageData.socialProof.yearsExperience && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                  <span className="text-2xl">🏆</span>
                  <span style={{ color: pageData.heroImage ? '#fff' : textColor }}>
                    <strong>{pageData.socialProof.yearsExperience}+</strong> Years
                  </span>
                </div>
              )}
            </div>
          )}

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight animate-fade-in" style={{ color: pageData.heroImage ? '#fff' : theme.primaryColor }}>
            {pageData.heroHeading || pageData.eventTitle || pageData.name}
          </h1>

          {pageData.heroSubheading && (
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto opacity-90" style={{ color: pageData.heroImage ? '#f5f5f5' : textColor }}>
              {pageData.heroSubheading}
            </p>
          )}

          {/* Event Quick Info */}
          {(pageData.startDate || pageData.eventTime || pageData.location) && (
            <div className="inline-flex flex-wrap justify-center gap-4 md:gap-6 mb-8 p-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
              {pageData.startDate && (
                <div className="flex items-center gap-2">
                  <span>📅</span>
                  <span style={{ color: pageData.heroImage ? '#fff' : textColor }}>
                    {formatDate(pageData.startDate)}
                    {pageData.endDate && ` - ${formatDate(pageData.endDate)}`}
                  </span>
                </div>
              )}
              {pageData.eventTime && (
                <div className="flex items-center gap-2">
                  <span>🕐</span>
                  <span style={{ color: pageData.heroImage ? '#fff' : textColor }}>{pageData.eventTime}</span>
                </div>
              )}
              {pageData.location && (
                <div className="flex items-center gap-2">
                  <span>📍</span>
                  <span style={{ color: pageData.heroImage ? '#fff' : textColor }}>{pageData.location}</span>
                </div>
              )}
              {pageData.language && (
                <div className="flex items-center gap-2">
                  <span>🗣️</span>
                  <span style={{ color: pageData.heroImage ? '#fff' : textColor }}>{pageData.language}</span>
                </div>
              )}
            </div>
          )}

          {/* Countdown Timer */}
          {pageData.countdown?.enabled && pageData.countdown.endDate && (
            <div className="mb-8">
              <p className="text-sm mb-3 font-medium" style={{ color: pageData.heroImage ? '#fff' : textColor }}>
                ⏰ {pageData.countdown.message || 'Registration closes in:'}
              </p>
              <div className="flex justify-center gap-3 md:gap-4">
                {[
                  { value: countdown.days, label: 'Days' },
                  { value: countdown.hours, label: 'Hours' },
                  { value: countdown.minutes, label: 'Mins' },
                  { value: countdown.seconds, label: 'Secs' },
                ].map((item, idx) => (
                  <div key={idx} className="w-16 md:w-20 p-3 rounded-xl text-center shadow-lg" style={{ backgroundColor: theme.primaryColor, color: '#fff' }}>
                    <div className="text-2xl md:text-4xl font-bold tabular-nums">{String(item.value).padStart(2, '0')}</div>
                    <div className="text-[10px] md:text-xs uppercase tracking-wider opacity-80">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Urgency Badge */}
          {pageData.urgency?.enabled && (
            <div className="mb-6">
              {pageData.urgency.limitedSeats && pageData.urgency.seatsRemaining && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500 text-white text-sm font-bold animate-bounce">
                  🔥 Only {pageData.urgency.seatsRemaining} of {pageData.urgency.totalSeats || 100} seats remaining!
                </div>
              )}
              {pageData.urgency.earlyBirdMessage && (
                <p className="mt-2 text-sm" style={{ color: pageData.heroImage ? '#fcd34d' : theme.accentColor }}>
                  ⚡ {pageData.urgency.earlyBirdMessage}
                </p>
              )}
            </div>
          )}

          {/* Hero Quick Benefits */}
          {pageData.heroQuickBenefits && pageData.heroQuickBenefits.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 mb-8 max-w-2xl mx-auto">
              {pageData.heroQuickBenefits.map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: pageData.heroImage ? '#fff' : textColor }}>
                  <span>{benefit.icon || '✓'}</span>
                  <span>{benefit.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href={ctaLink}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-lg font-bold transition transform hover:scale-105 shadow-xl"
              style={{ backgroundColor: theme.primaryColor, color: '#fff' }}
            >
              {pageData.heroCTA || 'Register Now'} 
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </a>
            {/* Secondary CTA */}
            {pageData.heroSecondaryCTA?.enabled && (
              <a
                href={pageData.heroSecondaryCTA.link || '#video'}
                className="inline-flex items-center gap-2 px-6 py-4 rounded-full text-lg font-bold transition hover:scale-105 border-2"
                style={{ borderColor: pageData.heroImage ? '#fff' : theme.primaryColor, color: pageData.heroImage ? '#fff' : theme.primaryColor }}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                {pageData.heroSecondaryCTA.text || 'Watch Demo'}
              </a>
            )}
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-4 rounded-full text-lg font-bold transition hover:scale-105"
                style={{ backgroundColor: '#25D366', color: '#fff' }}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Chat with Us
              </a>
            )}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-8 h-8" style={{ color: pageData.heroImage ? '#fff' : theme.primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Trust Badges Section */}
      {pageData.trustBadges && pageData.trustBadges.length > 0 && (
        <section className="py-8 border-b" style={{ backgroundColor: isDark ? '#16213e' : '#f8f9fa', borderColor: isDark ? '#2a2a4e' : '#eee' }}>
          <div className="container mx-auto px-4">
            <p className="text-center text-sm mb-4" style={{ color: textColor, opacity: 0.6 }}>Trusted By & Featured In</p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
              {pageData.trustBadges.map((badge, idx) => (
                <div key={idx} className="flex items-center gap-2 opacity-70 hover:opacity-100 transition">
                  {badge.image ? (
                    <img src={badge.image} alt={badge.title} className="h-8 md:h-12 object-contain" />
                  ) : (
                    <span className="text-sm font-medium" style={{ color: textColor }}>{badge.title}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Problem Statement Section */}
      {pageData.problemStatement?.enabled && (
        <section className="py-16 md:py-24" style={{ backgroundColor: isDark ? '#0f0f23' : '#fff' }}>
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1 rounded-full text-sm font-bold mb-4" style={{ backgroundColor: theme.accentColor + '30', color: theme.accentColor, border: `1px solid ${theme.accentColor}` }}>⚠️ Common Challenges</span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: theme.secondaryColor }}>
                {pageData.problemStatement.title || 'Are You Facing These Problems?'}
              </h2>
              {pageData.problemStatement.subtitle && (
                <p className="text-lg" style={{ color: textColor, opacity: 0.8 }}>{pageData.problemStatement.subtitle}</p>
              )}
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pageData.problemStatement.points?.map((point, idx) => (
                <div key={idx} className="p-5 rounded-xl flex items-start gap-4 transition hover:scale-[1.02]" style={{ backgroundColor: isDark ? '#16213e' : theme.secondaryColor + '10', border: `2px solid ${theme.secondaryColor}30` }}>
                  <span className="text-3xl flex-shrink-0 p-2 rounded-lg" style={{ backgroundColor: theme.accentColor + '20' }}>{point.icon || '😰'}</span>
                  <div>
                    <h3 className="font-bold mb-1" style={{ color: theme.secondaryColor }}>{point.title}</h3>
                    {point.description && <p className="text-sm" style={{ color: textColor, opacity: 0.7 }}>{point.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Solution Section */}
      {pageData.solution?.enabled && (
        <section className="py-16 md:py-24" style={{ backgroundColor: isDark ? '#16213e' : '#f0fdf4' }}>
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <span className="inline-block px-3 py-1 rounded-full text-sm font-bold mb-4" style={{ backgroundColor: theme.primaryColor + '20', color: theme.primaryColor }}>
                  ✨ The Solution
                </span>
                <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: theme.primaryColor }}>
                  {pageData.solution.title || 'Here\'s Your Solution'}
                </h2>
                {pageData.solution.subtitle && (
                  <p className="text-lg mb-4" style={{ color: textColor, opacity: 0.8 }}>{pageData.solution.subtitle}</p>
                )}
                {pageData.solution.description && (
                  <p className="mb-6 leading-relaxed" style={{ color: textColor }}>{pageData.solution.description}</p>
                )}
                {pageData.solution.points && pageData.solution.points.length > 0 && (
                  <ul className="space-y-3">
                    {pageData.solution.points.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-green-500 font-bold">✓</span>
                        <span style={{ color: textColor }}>{point}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                {pageData.solution.videoUrl ? (
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-video cursor-pointer group" onClick={() => setShowVideoModal(true)}>
                    <img
                      src={`https://img.youtube.com/vi/${pageData.solution.videoUrl.split('v=')[1]?.split('&')[0]}/maxresdefault.jpg`}
                      alt="Solution video"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.primaryColor }}>
                        <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      </div>
                    </div>
                  </div>
                ) : pageData.solution.image ? (
                  <img src={pageData.solution.image} alt="Solution" className="rounded-2xl shadow-2xl w-full" />
                ) : null}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* How It Works Section */}
      {pageData.howItWorks?.enabled && pageData.howItWorks.steps && pageData.howItWorks.steps.length > 0 && (
        <section className="py-16 md:py-24" style={{ backgroundColor: isDark ? '#0f0f23' : theme.secondaryColor + '05' }}>
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1 rounded-full text-sm font-bold mb-4" style={{ backgroundColor: theme.accentColor, color: isDark ? '#fff' : '#333' }}>📌 Step by Step</span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: theme.primaryColor }}>
                {pageData.howItWorks.title || 'How It Works'}
              </h2>
              {pageData.howItWorks.subtitle && (
                <p className="text-lg" style={{ color: textColor, opacity: 0.8 }}>{pageData.howItWorks.subtitle}</p>
              )}
            </div>
            <div className="relative">
              {/* Connecting line */}
              <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-1" style={{ background: `linear-gradient(to bottom, ${theme.primaryColor}, ${theme.accentColor}, ${theme.secondaryColor})` }} />
              <div className="space-y-8">
                {pageData.howItWorks.steps.map((step, idx) => (
                  <div key={idx} className={`flex flex-col md:flex-row items-center gap-6 ${idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                    <div className={`flex-1 p-6 rounded-xl text-${idx % 2 === 0 ? 'right' : 'left'}`} style={{ backgroundColor: isDark ? '#16213e' : '#fff', border: `1px solid ${idx % 3 === 0 ? theme.primaryColor : idx % 3 === 1 ? theme.secondaryColor : theme.accentColor}30` }}>
                      <h3 className="font-bold text-lg mb-2" style={{ color: idx % 3 === 0 ? theme.primaryColor : idx % 3 === 1 ? theme.secondaryColor : theme.accentColor }}>{step.title}</h3>
                      {step.description && <p className="text-sm" style={{ color: textColor, opacity: 0.7 }}>{step.description}</p>}
                    </div>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl shadow-lg z-10" style={{ backgroundColor: idx % 3 === 0 ? theme.primaryColor : idx % 3 === 1 ? theme.secondaryColor : theme.accentColor, color: '#fff' }}>
                      {step.icon || step.number || idx + 1}
                    </div>
                    <div className="flex-1 hidden md:block" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Video Section */}
      {pageData.videoSection?.enabled && pageData.videoSection.videoUrl && (
        <section className="py-16 md:py-24" style={{ backgroundColor: isDark ? '#0f0f23' : '#fff' }}>
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: theme.primaryColor }}>
              {pageData.videoSection.title || 'Watch This First'}
            </h2>
            {pageData.videoSection.description && (
              <p className="mb-8" style={{ color: textColor, opacity: 0.8 }}>{pageData.videoSection.description}</p>
            )}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-video cursor-pointer group" onClick={() => setShowVideoModal(true)}>
              <img
                src={pageData.videoSection.thumbnailUrl || `https://img.youtube.com/vi/${pageData.videoSection.videoUrl.split('v=')[1]?.split('&')[0]}/maxresdefault.jpg`}
                alt="Video thumbnail"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition">
                <div className="w-20 h-20 rounded-full flex items-center justify-center transition group-hover:scale-110" style={{ backgroundColor: theme.primaryColor }}>
                  <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Transformation Section (Before/After) */}
      {pageData.transformation?.enabled && (
        <section className="py-16 md:py-24" style={{ backgroundColor: isDark ? '#16213e' : theme.accentColor + '10' }}>
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1 rounded-full text-sm font-bold mb-4" style={{ backgroundColor: theme.primaryColor, color: '#fff' }}>🔄 Transformation</span>
              <h2 className="text-3xl md:text-4xl font-bold" style={{ color: theme.primaryColor }}>
                {pageData.transformation.title || 'Your Transformation Journey'}
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Before */}
              <div className="p-6 rounded-2xl" style={{ backgroundColor: isDark ? '#1a1a2e' : '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderTop: `4px solid ${theme.secondaryColor}` }}>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: theme.secondaryColor }}>
                  <span className="text-2xl">😔</span> {pageData.transformation.before?.title || 'Before'}
                </h3>
                <ul className="space-y-3">
                  {pageData.transformation.before?.points?.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm" style={{ color: textColor, opacity: 0.8 }}>
                      <span style={{ color: theme.secondaryColor }}>✗</span> {point}
                    </li>
                  ))}
                </ul>
              </div>
              {/* After */}
              <div className="p-6 rounded-2xl border-2" style={{ backgroundColor: isDark ? '#1a1a2e' : '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderColor: theme.primaryColor, borderTop: `4px solid ${theme.primaryColor}` }}>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: theme.primaryColor }}>
                  <span className="text-2xl">🎉</span> {pageData.transformation.after?.title || 'After This Course'}
                </h3>
                <ul className="space-y-3">
                  {pageData.transformation.after?.points?.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm" style={{ color: textColor }}>
                      <span style={{ color: theme.accentColor }}>✓</span> {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* About/Description Section */}
      {pageData.eventDescription && (
        <section className="py-16 md:py-24" style={{ backgroundColor: isDark ? '#0f0f23' : '#fff' }}>
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <span className="inline-block px-4 py-1 rounded-full text-sm font-bold mb-4" style={{ backgroundColor: theme.secondaryColor + '15', color: theme.secondaryColor }}>ℹ️ About</span>
            <h2 className="text-3xl md:text-4xl font-bold mb-8" style={{ color: theme.primaryColor }}>About This Program</h2>
            <div className="text-lg leading-relaxed whitespace-pre-line p-6 rounded-2xl" style={{ color: textColor, backgroundColor: theme.accentColor + '08', border: `1px dashed ${theme.accentColor}40` }}>{pageData.eventDescription}</div>
          </div>
        </section>
      )}

      {/* Benefits Section */}
      {pageData.benefits && pageData.benefits.length > 0 && (
        <section className="py-16 md:py-24" style={{ backgroundColor: isDark ? '#16213e' : theme.secondaryColor + '08' }}>
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1 rounded-full text-sm font-bold mb-4" style={{ backgroundColor: theme.primaryColor, color: '#fff' }}>✨ Key Benefits</span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: theme.primaryColor }}>Why Join This Program?</h2>
              <p style={{ color: textColor, opacity: 0.7 }}>Transform your life with these powerful benefits</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {pageData.benefits.map((benefit, idx) => (
                <div key={idx} className="p-6 rounded-xl text-center transition hover:shadow-lg hover:-translate-y-1" style={{ backgroundColor: isDark ? '#1a1a2e' : '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderTop: `4px solid ${idx % 3 === 0 ? theme.primaryColor : idx % 3 === 1 ? theme.secondaryColor : theme.accentColor}` }}>
                  <div className="text-4xl mb-4 w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: idx % 3 === 0 ? theme.primaryColor + '15' : idx % 3 === 1 ? theme.secondaryColor + '15' : theme.accentColor + '15' }}>{benefit.icon}</div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: theme.secondaryColor }}>{benefit.title}</h3>
                  <p className="text-sm" style={{ color: textColor, opacity: 0.8 }}>{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Bonus Stack Section */}
      {pageData.bonuses && pageData.bonuses.length > 0 && (
        <section className="py-16 md:py-24" style={{ backgroundColor: theme.accentColor + '20' }}>
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1 rounded-full text-sm font-bold mb-4" style={{ backgroundColor: theme.accentColor, color: '#333' }}>🎁 LIMITED TIME BONUSES</span>
              <h2 className="text-3xl md:text-4xl font-bold" style={{ color: theme.primaryColor }}>Enroll Today & Get These Free Bonuses!</h2>
            </div>
            <div className="space-y-4">
              {pageData.bonuses.map((bonus, idx) => (
                <div key={idx} className="p-5 rounded-xl flex items-center gap-4" style={{ backgroundColor: isDark ? '#1a1a2e' : '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                  <div className="text-4xl">🎁</div>
                  <div className="flex-1">
                    <h3 className="font-bold" style={{ color: theme.secondaryColor }}>{bonus.title}</h3>
                    {bonus.description && <p className="text-sm" style={{ color: textColor, opacity: 0.7 }}>{bonus.description}</p>}
                  </div>
                  {bonus.value && (
                    <div className="text-right">
                      <div className="text-sm line-through opacity-50">Worth {formatCurrency(bonus.value, bonus.currency || 'INR')}</div>
                      <div className="font-bold text-green-600">FREE</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <div className="text-lg font-bold mb-2">Total Bonus Value: <span className="line-through opacity-50">{formatCurrency(pageData.bonuses.reduce((sum, b) => sum + (b.value || 0), 0), pageData.bonuses[0]?.currency || 'INR')}</span></div>
              <div className="text-2xl font-bold" style={{ color: theme.primaryColor }}>Yours FREE Today!</div>
            </div>
          </div>
        </section>
      )}

      {/* Curriculum Section */}
      {pageData.curriculum && pageData.curriculum.length > 0 && (
        <section className="py-16 md:py-24" style={{ backgroundColor: isDark ? '#0f0f23' : '#fff' }}>
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1 rounded-full text-sm font-bold mb-4" style={{ backgroundColor: theme.accentColor, color: isDark ? '#fff' : '#333' }}>📚 Course Curriculum</span>
              <h2 className="text-3xl md:text-4xl font-bold" style={{ color: theme.primaryColor }}>What You&apos;ll Learn</h2>
            </div>
            <div className="space-y-4">
              {pageData.curriculum.map((item, idx) => (
                <div key={idx} className="p-5 rounded-xl flex gap-4 transition hover:shadow-md" style={{ backgroundColor: isDark ? '#16213e' : theme.accentColor + '08', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderLeft: `4px solid ${theme.primaryColor}` }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: theme.primaryColor, color: '#fff' }}>{idx + 1}</div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-lg" style={{ color: theme.secondaryColor }}>{item.title}</h3>
                      {item.duration && <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: theme.accentColor, color: isDark ? '#fff' : '#333' }}>{item.duration}</span>}
                    </div>
                    {item.description && <p className="mt-1 text-sm" style={{ color: textColor, opacity: 0.8 }}>{item.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Instructor Section */}
      {pageData.instructorName && (
        <section className="py-16 md:py-24" style={{ backgroundColor: isDark ? '#16213e' : theme.primaryColor + '05' }}>
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1 rounded-full text-sm font-bold mb-4" style={{ backgroundColor: theme.secondaryColor, color: '#fff' }}>👨‍🏫 Your Guide</span>
              <h2 className="text-3xl md:text-4xl font-bold" style={{ color: theme.primaryColor }}>Meet Your Instructor</h2>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-8 p-8 rounded-2xl" style={{ backgroundColor: isDark ? '#1a1a2e' : '#fff', boxShadow: '0 4px 30px rgba(0,0,0,0.1)', border: `2px solid ${theme.accentColor}30` }}>
              {pageData.instructorImage && (
                <img src={pageData.instructorImage} alt={pageData.instructorName} className="w-48 h-48 rounded-full object-cover border-4" style={{ borderColor: theme.accentColor }} />
              )}
              <div className="text-center md:text-left">
                <h3 className="text-2xl font-bold" style={{ color: theme.primaryColor }}>{pageData.instructorName}</h3>
                {pageData.instructorTitle && <p className="text-sm mb-4 px-3 py-1 inline-block rounded-full" style={{ color: theme.secondaryColor, backgroundColor: theme.secondaryColor + '15' }}>{pageData.instructorTitle}</p>}
                {pageData.instructorBio && <p className="leading-relaxed mt-4" style={{ color: textColor }}>{pageData.instructorBio}</p>}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Demo Session Section */}
      {pageData.demoSession?.enabled && (
        <section className="py-16 md:py-24" style={{ backgroundColor: theme.primaryColor }}>
          <div className="container mx-auto px-4 max-w-3xl text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">🎥 {pageData.demoSession.title || 'Free Demo Session'}</h2>
            {pageData.demoSession.description && <p className="text-lg mb-6 opacity-90">{pageData.demoSession.description}</p>}
            <div className="flex flex-wrap justify-center gap-6 mb-8">
              {pageData.demoSession.date && <div className="flex items-center gap-2"><span>📅</span> {formatDate(pageData.demoSession.date)}</div>}
              {pageData.demoSession.time && <div className="flex items-center gap-2"><span>🕐</span> {pageData.demoSession.time}</div>}
            </div>
            {pageData.demoSession.zoomLink && (
              <a href={pageData.demoSession.zoomLink} target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-4 rounded-full font-bold text-lg transition hover:scale-105" style={{ backgroundColor: '#fff', color: theme.primaryColor }}>
                Join Free Demo →
              </a>
            )}
          </div>
        </section>
      )}

      {/* Testimonials Section */}
      {pageData.testimonials && pageData.testimonials.length > 0 && (
        <section className="py-16 md:py-24" style={{ backgroundColor: isDark ? '#0f0f23' : '#fff' }}>
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1 rounded-full text-sm font-bold mb-4" style={{ backgroundColor: theme.secondaryColor, color: '#fff' }}>💬 Testimonials</span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: theme.primaryColor }}>What Our Students Say</h2>
              <p style={{ color: textColor, opacity: 0.7 }}>Real results from real people</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {pageData.testimonials.map((t, idx) => (
                <div key={idx} className="p-6 rounded-xl transition hover:shadow-lg" style={{ backgroundColor: isDark ? '#16213e' : '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: `1px solid ${theme.accentColor}30` }}>
                  <div className="flex items-center gap-3 mb-4">
                    {t.image ? <img src={t.image} alt={t.name} className="w-12 h-12 rounded-full object-cover border-2" style={{ borderColor: theme.accentColor }} /> : (
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: theme.primaryColor }}>{t.name.charAt(0)}</div>
                    )}
                    <div>
                      <h4 className="font-bold" style={{ color: theme.secondaryColor }}>{t.name}</h4>
                      {t.location && <p className="text-xs" style={{ color: theme.accentColor }}>{t.location}</p>}
                    </div>
                  </div>
                  {t.rating && <div className="mb-2" style={{ color: theme.accentColor }}>{'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}</div>}
                  <p className="italic text-sm" style={{ color: textColor, opacity: 0.85 }}>&quot;{t.text}&quot;</p>
                  {t.videoUrl && <a href={t.videoUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-medium" style={{ color: theme.primaryColor }}>🎬 Watch Video</a>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing Section */}
      {pageData.pricing && pageData.pricing.length > 0 && (
        <section id="pricing" className="py-16 md:py-24" style={{ backgroundColor: isDark ? '#16213e' : theme.primaryColor + '08' }}>
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1 rounded-full text-sm font-bold mb-4" style={{ backgroundColor: theme.accentColor, color: isDark ? '#fff' : '#333' }}>💰 Pricing Plans</span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: theme.primaryColor }}>Choose Your Plan</h2>
              <p style={{ color: textColor, opacity: 0.7 }}>Invest in yourself today</p>
            </div>
            <div className={`grid gap-6 max-w-5xl mx-auto ${pageData.pricing.length === 1 ? 'md:grid-cols-1 max-w-md' : pageData.pricing.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
              {pageData.pricing.map((plan, idx) => (
                <div key={idx} className={`relative p-6 rounded-2xl transition hover:shadow-xl ${plan.isPopular ? 'md:scale-105' : ''}`} style={{ backgroundColor: isDark ? '#1a1a2e' : '#fff', boxShadow: plan.isPopular ? `0 0 0 3px ${theme.primaryColor}` : '0 4px 20px rgba(0,0,0,0.08)' }}>
                  {plan.isPopular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: theme.primaryColor }}>🔥 MOST POPULAR</div>}
                  <h3 className="text-xl font-bold mb-2" style={{ color: theme.secondaryColor }}>{plan.name}</h3>
                  <div className="mb-4">
                    {plan.originalPrice && <span className="text-lg line-through mr-2 opacity-50">{formatCurrency(plan.originalPrice, plan.currency)}</span>}
                    <span className="text-4xl font-bold" style={{ color: theme.primaryColor }}>{formatCurrency(plan.price, plan.currency)}</span>
                  </div>
                  {plan.features.length > 0 && (
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((f, fidx) => (
                        <li key={fidx} className="flex items-start gap-2 text-sm" style={{ color: textColor }}>
                          <span style={{ color: theme.primaryColor }}>✓</span> {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  <a href={plan.paymentLink || pageData.integrations?.paymentLink || '#'} className="block w-full py-3 rounded-lg font-bold text-center transition hover:opacity-90" style={{ backgroundColor: plan.isPopular ? theme.primaryColor : theme.secondaryColor, color: '#fff' }}>
                    {plan.ctaText || 'Enroll Now'} →
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Guarantee Section */}
      {pageData.guarantee?.enabled && (
        <section className="py-16 md:py-24" style={{ backgroundColor: isDark ? '#0f0f23' : '#fff' }}>
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-6" style={{ backgroundColor: theme.accentColor + '20', border: `3px solid ${theme.accentColor}` }}>
              <span className="text-5xl">🛡️</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: theme.primaryColor }}>
              {pageData.guarantee.title || `${pageData.guarantee.days || 7}-Day Money-Back Guarantee`}
            </h2>
            <p className="text-lg mb-6" style={{ color: textColor, opacity: 0.8 }}>
              {pageData.guarantee.description || `We're confident you'll love this program. If you're not completely satisfied within ${pageData.guarantee.days || 7} days, we'll refund 100% of your investment. No questions asked.`}
            </p>
            <div className="inline-block px-6 py-2 rounded-full" style={{ backgroundColor: theme.secondaryColor + '15', border: `1px solid ${theme.secondaryColor}40` }}>
              <span style={{ color: theme.secondaryColor }}>✓ 100% Risk-Free Purchase</span>
            </div>
          </div>
        </section>
      )}

      {/* FAQ Section */}
      {pageData.faqs && pageData.faqs.length > 0 && (
        <section className="py-16 md:py-24" style={{ backgroundColor: isDark ? '#16213e' : theme.secondaryColor + '05' }}>
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1 rounded-full text-sm font-bold mb-4" style={{ backgroundColor: theme.secondaryColor, color: '#fff' }}>❓ FAQs</span>
              <h2 className="text-3xl md:text-4xl font-bold" style={{ color: theme.primaryColor }}>Frequently Asked Questions</h2>
            </div>
            <div className="space-y-4">
              {pageData.faqs.map((faq, idx) => (
                <div key={idx} className="rounded-xl overflow-hidden" style={{ backgroundColor: isDark ? '#1a1a2e' : '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                  <button className="w-full p-5 text-left font-semibold flex justify-between items-center" style={{ color: theme.secondaryColor }} onClick={() => setOpenFaq(openFaq === idx ? null : idx)}>
                    {faq.question}
                    <span className="text-xl transition-transform" style={{ transform: openFaq === idx ? 'rotate(45deg)' : 'none' }}>+</span>
                  </button>
                  <div className={`transition-all overflow-hidden ${openFaq === idx ? 'max-h-96 pb-5' : 'max-h-0'}`}>
                    <div className="px-5" style={{ color: textColor, opacity: 0.85 }}>{faq.answer}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Gallery Section */}
      {pageData.gallery && pageData.gallery.length > 0 && (
        <section className="py-16 md:py-24" style={{ backgroundColor: isDark ? '#0f0f23' : '#fff' }}>
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1 rounded-full text-sm font-bold mb-4" style={{ backgroundColor: theme.accentColor, color: isDark ? '#fff' : '#333' }}>🖼️ Highlights</span>
              <h2 className="text-3xl md:text-4xl font-bold" style={{ color: theme.primaryColor }}>Gallery</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
              {pageData.gallery.map((item, idx) => (
                <div key={idx} className="rounded-xl overflow-hidden aspect-square hover:scale-105 transition" style={{ border: `3px solid ${idx % 3 === 0 ? theme.primaryColor : idx % 3 === 1 ? theme.secondaryColor : theme.accentColor}30` }}>
                  {item.type === 'image' ? <img src={item.url} alt={item.caption || ''} className="w-full h-full object-cover" /> : <iframe src={item.url} className="w-full h-full" allowFullScreen />}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Success Stories Section */}
      {pageData.successStories && pageData.successStories.length > 0 && (
        <section className="py-16 md:py-24" style={{ backgroundColor: isDark ? '#16213e' : theme.accentColor + '08' }}>
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1 rounded-full text-sm font-bold mb-4" style={{ backgroundColor: theme.primaryColor, color: '#fff' }}>🌟 Success Stories</span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: theme.primaryColor }}>Real Student Transformations</h2>
              <p style={{ color: textColor, opacity: 0.7 }}>See what our students have achieved</p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              {pageData.successStories.map((story, idx) => (
                <div key={idx} className="p-6 rounded-2xl transition hover:shadow-xl" style={{ backgroundColor: isDark ? '#1a1a2e' : '#fff', boxShadow: '0 4px 30px rgba(0,0,0,0.1)', borderLeft: `4px solid ${idx % 3 === 0 ? theme.primaryColor : idx % 3 === 1 ? theme.secondaryColor : theme.accentColor}` }}>
                  <div className="flex items-start gap-4 mb-4">
                    {story.image ? (
                      <img src={story.image} alt={story.name} className="w-20 h-20 rounded-full object-cover border-3" style={{ borderColor: theme.accentColor }} />
                    ) : (
                      <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold" style={{ backgroundColor: idx % 2 === 0 ? theme.primaryColor : theme.secondaryColor, color: '#fff' }}>{story.name.charAt(0)}</div>
                    )}
                    <div>
                      <h3 className="font-bold text-lg" style={{ color: theme.secondaryColor }}>{story.name}</h3>
                      {story.title && <p className="text-sm" style={{ color: theme.accentColor }}>{story.title}</p>}
                      {story.duration && <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: theme.accentColor, color: isDark ? '#fff' : '#333' }}>Results in {story.duration}</span>}
                    </div>
                  </div>
                  {(story.beforeStats || story.afterStats) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 p-3 rounded-lg" style={{ backgroundColor: isDark ? '#0f0f23' : theme.secondaryColor + '08' }}>
                      {story.beforeStats && (
                        <div className="text-center">
                          <div className="text-xs mb-1" style={{ color: theme.secondaryColor }}>BEFORE</div>
                          <div className="text-sm font-medium" style={{ color: theme.secondaryColor }}>{story.beforeStats}</div>
                        </div>
                      )}
                      {story.afterStats && (
                        <div className="text-center">
                          <div className="text-xs mb-1" style={{ color: theme.primaryColor }}>AFTER</div>
                          <div className="text-sm font-medium" style={{ color: theme.primaryColor }}>{story.afterStats}</div>
                        </div>
                      )}
                    </div>
                  )}
                  {story.testimonial && <p className="text-sm italic mb-4" style={{ color: textColor, opacity: 0.8 }}>&quot;{story.testimonial}&quot;</p>}
                  {story.videoUrl && (
                    <a href={story.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: theme.primaryColor }}>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      Watch Video Testimonial
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Lead Magnet Section */}
      {pageData.leadMagnet?.enabled && (
        <section className="py-16 md:py-24" style={{ backgroundColor: isDark ? '#0f0f23' : '#fff' }}>
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="grid md:grid-cols-2 gap-8 items-center p-8 rounded-2xl" style={{ backgroundColor: theme.primaryColor + '10', border: `2px dashed ${theme.primaryColor}` }}>
              {pageData.leadMagnet.image && (
                <img src={pageData.leadMagnet.image} alt={pageData.leadMagnet.title} className="rounded-xl shadow-lg" />
              )}
              <div className="text-center md:text-left">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-3" style={{ backgroundColor: theme.accentColor, color: '#333' }}>🎁 FREE DOWNLOAD</span>
                <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: theme.primaryColor }}>
                  {pageData.leadMagnet.title || 'Get Your Free Guide!'}
                </h2>
                {pageData.leadMagnet.subtitle && <p className="text-lg mb-2" style={{ color: textColor, opacity: 0.8 }}>{pageData.leadMagnet.subtitle}</p>}
                {pageData.leadMagnet.description && <p className="text-sm mb-6" style={{ color: textColor, opacity: 0.7 }}>{pageData.leadMagnet.description}</p>}
                <a
                  href={pageData.leadMagnet.downloadUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold transition hover:scale-105"
                  style={{ backgroundColor: theme.primaryColor, color: '#fff' }}
                >
                  📥 {pageData.leadMagnet.buttonText || 'Download Free Guide'}
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Product Demo Section */}
      {pageData.productDemo?.enabled && (
        <section className="py-16 md:py-24" style={{ backgroundColor: isDark ? '#16213e' : '#f8f9fa' }}>
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: theme.primaryColor }}>
              {pageData.productDemo.title || 'See It In Action'}
            </h2>
            {pageData.productDemo.description && <p className="mb-8" style={{ color: textColor, opacity: 0.8 }}>{pageData.productDemo.description}</p>}
            {pageData.productDemo.mediaUrl && pageData.productDemo.demoType === 'video' && (
              <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-video cursor-pointer group" onClick={() => setShowVideoModal(true)}>
                <img
                  src={`https://img.youtube.com/vi/${pageData.productDemo.mediaUrl.split('v=')[1]?.split('&')[0]}/maxresdefault.jpg`}
                  alt="Product demo"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center transition group-hover:scale-110" style={{ backgroundColor: theme.primaryColor }}>
                    <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                </div>
              </div>
            )}
            {pageData.productDemo.mediaUrl && pageData.productDemo.demoType === 'gif' && (
              <img src={pageData.productDemo.mediaUrl} alt="Product demo" className="rounded-2xl shadow-2xl mx-auto" />
            )}
            {pageData.productDemo.screenshots && pageData.productDemo.screenshots.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                {pageData.productDemo.screenshots.map((screenshot, idx) => (
                  <img key={idx} src={screenshot} alt={`Screenshot ${idx + 1}`} className="rounded-xl shadow-lg hover:scale-105 transition" />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Comparison Table Section */}
      {pageData.comparisonTable?.enabled && pageData.comparisonTable.headers && pageData.comparisonTable.rows && (
        <section className="py-16 md:py-24" style={{ backgroundColor: isDark ? '#0f0f23' : '#fff' }}>
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12" style={{ color: theme.primaryColor }}>
              {pageData.comparisonTable.title || 'Compare Your Options'}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full rounded-xl overflow-hidden" style={{ backgroundColor: isDark ? '#16213e' : '#f8f9fa' }}>
                <thead>
                  <tr style={{ backgroundColor: theme.primaryColor }}>
                    <th className="px-4 py-3 text-left text-white font-bold">Feature</th>
                    {pageData.comparisonTable.headers.map((header, idx) => (
                      <th key={idx} className="px-4 py-3 text-center text-white font-bold">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageData.comparisonTable.rows.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? '' : ''} style={{ backgroundColor: idx % 2 === 0 ? (isDark ? '#1a1a2e' : '#fff') : (isDark ? '#16213e' : '#f8f9fa') }}>
                      <td className="px-4 py-3 font-medium">{row.feature}</td>
                      {row.values.map((value, vidx) => (
                        <td key={vidx} className="px-4 py-3 text-center">
                          {value === 'yes' || value === '✓' ? (
                            <span className="text-green-500 text-xl">✓</span>
                          ) : value === 'no' || value === '✗' ? (
                            <span className="text-red-500 text-xl">✗</span>
                          ) : (
                            value
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Newsletter Section */}
      {pageData.newsletter?.enabled && (
        <section className="py-16 md:py-24" style={{ backgroundColor: isDark ? '#16213e' : '#f8f9fa' }}>
          <div className="container mx-auto px-4 max-w-xl text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: theme.primaryColor }}>
              {pageData.newsletter.title || 'Stay Updated'}
            </h2>
            {pageData.newsletter.subtitle && <p className="mb-6" style={{ color: textColor, opacity: 0.7 }}>{pageData.newsletter.subtitle}</p>}
            <form className="flex flex-col sm:flex-row gap-3" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder={pageData.newsletter.placeholder || 'Enter your email'}
                className="flex-1 px-4 py-3 rounded-lg border"
                style={{ backgroundColor: isDark ? '#1a1a2e' : '#fff', borderColor: isDark ? '#2a2a4e' : '#ddd' }}
                required
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-lg font-bold transition hover:opacity-90"
                style={{ backgroundColor: theme.primaryColor, color: '#fff' }}
              >
                {pageData.newsletter.buttonText || 'Subscribe'}
              </button>
            </form>
          </div>
        </section>
      )}

      {/* Contact Info Section */}
      {pageData.contactInfo && (pageData.contactInfo.email || pageData.contactInfo.phone || pageData.contactInfo.address) && (
        <section className="py-16 md:py-24" style={{ backgroundColor: isDark ? '#0f0f23' : '#fff' }}>
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12" style={{ color: theme.primaryColor }}>Contact Us</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {pageData.contactInfo.email && (
                <div className="text-center p-6 rounded-xl" style={{ backgroundColor: isDark ? '#16213e' : '#f8f9fa' }}>
                  <div className="text-3xl mb-3">📧</div>
                  <h3 className="font-bold mb-2">Email</h3>
                  <a href={`mailto:${pageData.contactInfo.email}`} className="text-sm" style={{ color: theme.primaryColor }}>{pageData.contactInfo.email}</a>
                </div>
              )}
              {pageData.contactInfo.phone && (
                <div className="text-center p-6 rounded-xl" style={{ backgroundColor: isDark ? '#16213e' : '#f8f9fa' }}>
                  <div className="text-3xl mb-3">📞</div>
                  <h3 className="font-bold mb-2">Phone</h3>
                  <a href={`tel:${pageData.contactInfo.phone}`} className="text-sm" style={{ color: theme.primaryColor }}>{pageData.contactInfo.phone}</a>
                </div>
              )}
              {pageData.contactInfo.address && (
                <div className="text-center p-6 rounded-xl" style={{ backgroundColor: isDark ? '#16213e' : '#f8f9fa' }}>
                  <div className="text-3xl mb-3">📍</div>
                  <h3 className="font-bold mb-2">Address</h3>
                  <p className="text-sm" style={{ color: textColor, opacity: 0.7 }}>{pageData.contactInfo.address}</p>
                </div>
              )}
            </div>
            {pageData.contactInfo.mapEmbed && (
              <div className="mt-8 rounded-xl overflow-hidden shadow-lg" dangerouslySetInnerHTML={{ __html: pageData.contactInfo.mapEmbed }} />
            )}
          </div>
        </section>
      )}

      {/* Registration Form Section */}
      {pageData.registrationForm?.enabled && (
        <section id="register" className="py-16 md:py-24" style={{ backgroundColor: theme.primaryColor }}>
          <div className="container mx-auto px-4 max-w-xl text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{pageData.registrationForm.title || 'Register Now'}</h2>
            {pageData.registrationForm.subtitle && <p className="mb-8 opacity-90">{pageData.registrationForm.subtitle}</p>}
            {formSubmitted ? (
              <div className="p-8 rounded-xl bg-white/10">
                <div className="text-5xl mb-4">✅</div>
                <p className="text-xl font-bold">{pageData.registrationForm.successMessage || 'Thank you! We will contact you soon.'}</p>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setFormSubmitted(true); }}>
                {(pageData.registrationForm.fields || [
                  { name: 'name', type: 'text', required: true, placeholder: 'Your Name' },
                  { name: 'email', type: 'email', required: true, placeholder: 'Your Email' },
                  { name: 'phone', type: 'phone', required: true, placeholder: 'Your Phone (with country code)' },
                ]).map((field, idx) => (
                  <input key={idx} type={field.type === 'phone' ? 'tel' : field.type} name={field.name} required={field.required} placeholder={field.placeholder || field.name} className="w-full px-4 py-3 rounded-lg text-gray-900 placeholder:text-gray-500" />
                ))}
                <button type="submit" className="w-full py-4 rounded-lg font-bold text-lg transition hover:scale-105" style={{ backgroundColor: theme.secondaryColor, color: '#fff' }}>
                  {pageData.registrationForm.submitText || 'Register Now'} →
                </button>
              </form>
            )}
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="py-16 md:py-24" style={{ background: `linear-gradient(135deg, ${theme.secondaryColor}, ${theme.primaryColor})` }}>
        <div className="container mx-auto px-4 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Life?</h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">{pageData.heroSubheading || 'Join thousands of students who have already started their journey.'}</p>
          {pageData.countdown?.enabled && (
            <div className="flex justify-center gap-3 mb-8">
              {[{ value: countdown.days, label: 'D' }, { value: countdown.hours, label: 'H' }, { value: countdown.minutes, label: 'M' }, { value: countdown.seconds, label: 'S' }].map((item, idx) => (
                <div key={idx} className="px-3 py-2 rounded-lg" style={{ backgroundColor: theme.accentColor + '30' }}><span className="font-bold">{item.value}</span>{item.label}</div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-4">
            <a href={ctaLink} className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-lg transition hover:scale-105 shadow-xl" style={{ backgroundColor: theme.accentColor, color: isDark ? '#fff' : '#333' }}>
              {pageData.heroCTA || 'Register Now'} →
            </a>
            {whatsappLink && (
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-lg transition hover:scale-105 border-2 border-white/30" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff' }}>
                💬 WhatsApp Us
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Floating WhatsApp Button */}
      {whatsappLink && (
        <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-40 transition hover:scale-110 animate-bounce" style={{ backgroundColor: '#25D366' }}>
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        </a>
      )}

      {/* Live Notification Toast */}
      {notification && (
        <div className="fixed bottom-24 left-6 max-w-xs p-4 rounded-xl shadow-2xl z-40 animate-slide-in" style={{ backgroundColor: isDark ? '#16213e' : '#fff' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.primaryColor + '20' }}>
              <span className="text-lg">🎉</span>
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: theme.secondaryColor }}>{notification}</p>
              <p className="text-xs opacity-60">Just now</p>
            </div>
          </div>
        </div>
      )}

      {/* Popup Modal */}
      {showPopup && !popupDismissed && pageData.popup?.enabled && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setPopupDismissed(true)}>
          <div className="relative max-w-md w-full p-8 rounded-2xl text-center animate-scale-in" style={{ backgroundColor: isDark ? '#16213e' : '#fff' }} onClick={e => e.stopPropagation()}>
            <button className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100" onClick={() => setPopupDismissed(true)}>✕</button>
            {pageData.popup.image && <img src={pageData.popup.image} alt="" className="w-24 h-24 mx-auto mb-4 rounded-full object-cover" />}
            <h3 className="text-2xl font-bold mb-2" style={{ color: theme.primaryColor }}>{pageData.popup.title || 'Wait! Special Offer'}</h3>
            <p className="mb-6 opacity-80">{pageData.popup.description || 'Don\'t miss out on this exclusive deal!'}</p>
            <a href={pageData.popup.ctaLink || ctaLink} className="inline-block w-full py-3 rounded-lg font-bold transition hover:opacity-90" style={{ backgroundColor: theme.primaryColor, color: '#fff' }}>
              {pageData.popup.ctaText || 'Get Special Offer'} →
            </a>
          </div>
        </div>
      )}

      {/* Video Modal */}
      {showVideoModal && pageData.videoSection?.videoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90" onClick={() => setShowVideoModal(false)}>
          <div className="relative max-w-4xl w-full aspect-video">
            <button className="absolute -top-10 right-0 text-white text-3xl hover:opacity-70" onClick={() => setShowVideoModal(false)}>✕</button>
            <iframe
              src={pageData.videoSection.videoUrl.includes('youtube') ? pageData.videoSection.videoUrl.replace('watch?v=', 'embed/') + '?autoplay=1' : pageData.videoSection.videoUrl}
              className="w-full h-full rounded-xl"
              allowFullScreen
              allow="autoplay"
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-12" style={{ backgroundColor: isDark ? '#0a0a1a' : '#1E3A5F', color: '#fff' }}>
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-2">
              {pageData.logo?.url ? (
                <img src={pageData.logo.url} alt={pageData.logo.altText || 'Logo'} className="h-10 mb-4" />
              ) : (
                <h3 className="text-xl font-bold mb-4">{pageData.name}</h3>
              )}
              {pageData.footer?.aboutText && (
                <p className="text-sm opacity-70 max-w-sm">{pageData.footer.aboutText}</p>
              )}
              {/* Social Links */}
              {pageData.footer?.socialLinks && (
                <div className="flex gap-3 mt-4">
                  {pageData.footer.socialLinks.facebook && (
                    <a href={pageData.footer.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center transition hover:opacity-80" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    </a>
                  )}
                  {pageData.footer.socialLinks.instagram && (
                    <a href={pageData.footer.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center transition hover:opacity-80" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/></svg>
                    </a>
                  )}
                  {pageData.footer.socialLinks.youtube && (
                    <a href={pageData.footer.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center transition hover:opacity-80" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                    </a>
                  )}
                  {pageData.footer.socialLinks.twitter && (
                    <a href={pageData.footer.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center transition hover:opacity-80" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    </a>
                  )}
                  {pageData.footer.socialLinks.linkedin && (
                    <a href={pageData.footer.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center transition hover:opacity-80" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    </a>
                  )}
                </div>
              )}
            </div>
            {/* Quick Links */}
            {pageData.footer?.quickLinks && pageData.footer.quickLinks.length > 0 && (
              <div>
                <h4 className="font-bold mb-4">Quick Links</h4>
                <ul className="space-y-2">
                  {pageData.footer.quickLinks.map((link, idx) => (
                    <li key={idx}>
                      <a href={link.href} className="text-sm opacity-70 hover:opacity-100 transition">{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Legal Links */}
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2">
                {pageData.footer?.showPrivacyPolicy !== false && (
                  <li><a href={pageData.footer?.privacyPolicyLink || '/privacy'} className="text-sm opacity-70 hover:opacity-100 transition">Privacy Policy</a></li>
                )}
                {pageData.footer?.showTerms !== false && (
                  <li><a href={pageData.footer?.termsLink || '/terms'} className="text-sm opacity-70 hover:opacity-100 transition">Terms of Service</a></li>
                )}
                {pageData.footer?.showRefundPolicy !== false && (
                  <li><a href={pageData.footer?.refundPolicyLink || '/refund'} className="text-sm opacity-70 hover:opacity-100 transition">Refund Policy</a></li>
                )}
              </ul>
            </div>
          </div>
          {/* Copyright */}
          <div className="pt-8 border-t border-white/10 text-center">
            <p className="text-sm opacity-60">
              {pageData.footer?.copyrightText || `© ${new Date().getFullYear()} Swar Yoga. All rights reserved.`}
            </p>
            <p className="text-xs mt-2 opacity-40">Crafted with ❤️ for transformation</p>
          </div>
        </div>
      </footer>

      {/* Custom Styles */}
      <style jsx global>{`
        @keyframes slide-in {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes scale-in {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-in { animation: slide-in 0.5s ease-out; }
        .animate-scale-in { animation: scale-in 0.3s ease-out; }
        .animate-fade-in { animation: fade-in 0.8s ease-out; }
      `}</style>
    </div>
  );
}
