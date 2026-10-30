'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Menu, X, ShoppingCart, User, LogOut, ChevronDown, Users, Sun, BookOpen, Film, Video, Flame, CreditCard, Building2, Sparkles, Home, GraduationCap, Calendar, Phone, Clock, MessageCircle, ArrowRight, ArrowLeft, Play, RefreshCw, Check } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { getStoredCart } from '@/lib/cart';
import { clearSession } from '@/lib/sessionManager';
import { ZoomJoinModal, DailySadhanaModal, QuickPaymentModal } from './HeaderQuickModals';

const communityDropdownItems = [
  {
    name: 'Community',
    href: '/community',
    description: 'Join discussions & connect with practitioners',
    icon: Users,
  },
  {
    name: 'Media',
    href: '/media',
    description: 'Videos, shorts, playlists & live sessions',
    icon: Film,
  },
  {
    name: 'Rutucharya',
    href: '/life-planner/ritucharya',
    description: 'Seasonal Ayurvedic & Swar diet routines',
    icon: Sun,
  },
  {
    name: 'Blogs',
    href: '/blog',
    description: 'Articles, insights, and wisdom',
    icon: BookOpen,
  },
];

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isCommunityDropdownOpen, setIsCommunityDropdownOpen] = useState(false);
  const [isMobileCommunityOpen, setIsMobileCommunityOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [userDisplayName, setUserDisplayName] = useState<string>('');
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const [isSadhanaModalOpen, setIsSadhanaModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAndroidApp, setIsAndroidApp] = useState(false);
  const [isUpdatingApp, setIsUpdatingApp] = useState(false);
  const [updateStatusText, setUpdateStatusText] = useState('');
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true);
  const [lastUpdateLabel, setLastUpdateLabel] = useState('Checked today');
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('swar_auto_update_enabled');
      const isEnabled = stored !== null ? stored === 'true' : true;
      if (stored === null) {
        localStorage.setItem('swar_auto_update_enabled', 'true');
      }
      setAutoUpdateEnabled(isEnabled);

      // Check last update timestamp
      const lastTs = Number(localStorage.getItem('swar_last_auto_update_ts') || '0');
      const now = Date.now();
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

      if (lastTs > 0) {
        const diffHours = Math.floor((now - lastTs) / (1000 * 60 * 60));
        if (diffHours < 1) {
          setLastUpdateLabel('Just now');
        } else if (diffHours < 24) {
          setLastUpdateLabel(`${diffHours}h ago`);
        } else {
          setLastUpdateLabel('Over 24h ago');
        }
      } else {
        localStorage.setItem('swar_last_auto_update_ts', String(now));
        setLastUpdateLabel('Just now');
      }

      // 24-Hour Automatic Update Check
      if (isEnabled && (!lastTs || (now - lastTs) >= TWENTY_FOUR_HOURS)) {
        console.log('[Auto-Update] 24 hours elapsed since last update. Running automated update sync...');
        handleAppAutoUpdate(false);
      }
    }
  }, []);

  const toggleAutoUpdate = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextVal = !autoUpdateEnabled;
    setAutoUpdateEnabled(nextVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('swar_auto_update_enabled', String(nextVal));
    }
  };

  const handleAppAutoUpdate = async (isManual: boolean = true) => {
    if (isUpdatingApp) return;
    if (isManual) {
      setIsUpdatingApp(true);
      setUpdateStatusText('Checking latest updates...');
    }

    try {
      // 1. Clear caches
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map((k) => caches.delete(k)));
        } catch {}
      }

      // 2. Clear & update service worker registrations
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) {
            await reg.update().catch(() => {});
            await reg.unregister().catch(() => {});
          }
        } catch {}
      }

      // Record latest update timestamp
      if (typeof window !== 'undefined') {
        localStorage.setItem('swar_last_auto_update_ts', String(Date.now()));
        setLastUpdateLabel('Just now');
      }

      if (isManual) {
        setUpdateStatusText('Applying new updates...');
        // 3. Clear session storage flags
        try {
          sessionStorage.clear();
        } catch {}

        setTimeout(() => {
          setUpdateStatusText('Update applied! Reloading...');
          // 4. Force hard reload with timestamp to bust all WebView caches
          if (typeof window !== 'undefined') {
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('v', String(Date.now()));
            window.location.href = currentUrl.toString();
          }
        }, 700);
      }
    } catch (err) {
      console.warn('Auto-update error:', err);
      if (isManual && typeof window !== 'undefined') {
        window.location.reload();
      }
    } finally {
      if (!isManual) {
        setIsUpdatingApp(false);
      }
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const isExplicitWeb = searchParams.get('web') === 'true' || searchParams.get('app') === 'false';
      const isNativeApp = Boolean((window as any).SwarYoga) || navigator.userAgent.includes('SwarYogaApp');
      const isQueryApp = searchParams.get('app') === 'true' || searchParams.get('is_app') === 'true';

      if (isExplicitWeb) {
        try { sessionStorage.removeItem('is_swar_app'); } catch {}
        setIsAndroidApp(false);
      } else if (isNativeApp || isQueryApp) {
        try { sessionStorage.setItem('is_swar_app', 'true'); } catch {}
        setIsAndroidApp(true);
      } else {
        // Default to Website: do NOT hijack regular browsing
        try { sessionStorage.removeItem('is_swar_app'); } catch {}
        setIsAndroidApp(false);
      }
    }
  }, [pathname]);

  // Website navigation: Home, About, Workshops, E-Learning, Resort, Community, Contact
  const websiteNav = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
    { name: 'Workshops', href: '/workshops' },
    { name: 'E-Learning', href: '/e-learning' },
    { name: 'Resort', href: '/resort' },
  ];

  // Mobile App navigation: Home, Workshops, E-Learning, Resort, Life Planner, Rutucharya, Swar Calendar, Zoom Join
  const appNav: { name: string; href: string; isZoom?: boolean }[] = [
    { name: 'Home', href: '/' },
    { name: 'Workshops', href: '/workshops' },
    { name: 'E-Learning', href: '/e-learning' },
    { name: 'Resort', href: '/resort' },
    { name: 'Life Planner', href: '/life-planner' },
    { name: 'Rutucharya', href: '/life-planner/ritucharya' },
    { name: 'Swar Yoga Calender', href: '/calendar' },
    { name: 'Zoom Join', href: '#zoom-join', isZoom: true },
  ];

  // Handle scroll effect with hysteresis & rAF (completely eliminates vibration/jitter)
  useEffect(() => {
    let ticking = false;
    let lastState = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY;
          // Hysteresis buffer: activate shadow at >40px, deactivate only below 10px
          const nextState = lastState ? y > 10 : y > 40;
          if (nextState !== lastState) {
            lastState = nextState;
            setIsScrolled(nextState);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle body overflow lock when menu opens (prevents page vibration)
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  // Load user data from localStorage (no auto-login)
  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        // Set display name
        const name = userData.name || userData.email?.split('@')[0] || 'User';
        setUserDisplayName(name.split(' ')[0]);
      } catch (err) {
        console.log('Error parsing user data:', err);
      }
    }

    // Load reminders from localStorage (for future features)
    const storedReminders = localStorage.getItem('swar-life-planner-visions');
    if (storedReminders) {
      try {
        // JSON.parse(storedReminders); // Reminders available in visions data if needed for future features
      } catch (err) {
        console.log('Error loading reminders:', err);
      }
    }

    // Load cart count
    try {
      const cart = getStoredCart();
      setCartCount(Array.isArray(cart) ? cart.length : 0);
    } catch (err) {
      setCartCount(0);
    }
  }, []);

  const isActive = (path: string) => pathname === path;

  const isCommunityActive = communityDropdownItems.some(
    (item) =>
      pathname === item.href ||
      (item.href === '/blog' && (pathname === '/blogs' || pathname?.startsWith('/blog/'))) ||
      (item.href === '/life-planner/ritucharya' && (pathname?.includes('ritucharya') || pathname?.includes('rutucharya')))
  );

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCommunityDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown and mobile menu on route change
  useEffect(() => {
    setIsCommunityDropdownOpen(false);
    setIsMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    // Proper logout: clear token/user/expiry + life planner legacy keys.
    clearSession();
    setUser(null);
    setUserDisplayName('');
    setIsMenuOpen(false);
    window.location.href = '/';
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      {/* Top Sticky Header Wrapper (Keeps green notification band always on top when scrolling) */}
      <div className="sticky top-0 z-40 w-full select-none">
        {/* Top Green Band (App Header for ANDROID APP ONLY - stable height, no layout thrashing) */}
        {isAndroidApp && (
          <div 
            data-app-header="true" 
            className="bg-[#166235] text-white w-full border-b border-emerald-800/40 overflow-hidden shadow-xs py-2"
            style={{
              paddingTop: 'max(env(safe-area-inset-top, 0px), 6px)',
              paddingBottom: '6px'
            }}
          >
            <div className="w-full max-w-7xl mx-auto px-2.5 sm:px-4 flex items-center justify-between gap-2">
              {/* Logo and Swar Yoga in bold white text (ALWAYS on the left in one place) */}
              <Link href="/" className="flex items-center space-x-2 group hover:opacity-95 transition-opacity min-w-0 flex-1 pr-1">
                <div className="relative flex items-center justify-center flex-shrink-0 rounded-full overflow-hidden shadow-sm w-7 h-7">
                  <picture>
                    <source srcSet="/images/logo-infinity.webp" type="image/webp" />
                    <img 
                      src="/images/logo-infinity.png"
                      alt="Swar Yoga Logo"
                      className="w-full h-full object-contain"
                      width={28}
                      height={28}
                      loading="eager"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/logo.png';
                      }}
                    />
                  </picture>
                </div>
                
                <div className="flex flex-col tracking-tight truncate">
                  <span 
                    className="font-bold leading-none text-white truncate text-lg sm:text-xl"
                    style={{
                      fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto",
                      letterSpacing: "-0.01em",
                      fontWeight: 700
                    }}
                  >
                    Swar Yoga
                  </span>
                  <span 
                    className="font-semibold leading-tight text-[#FFA726] truncate text-[9px] mt-0.5"
                    style={{
                      fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto",
                      letterSpacing: "0.02em",
                      fontWeight: 600
                    }}
                  >
                    From Breath To Soul
                  </span>
                </div>
              </Link>

              {/* Right Side of Green Strip: Cart + Menu + Back button */}
              <div className="flex items-center space-x-2 shrink-0">
                {/* Cart in upper green area as requested */}
                <Link
                  href="/cart"
                  className="relative flex items-center justify-center p-2 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 transition-all text-white shadow-xs"
                  aria-label="View Shopping Cart"
                  title="Cart"
                >
                  <ShoppingCart className="w-5 h-5 text-white" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center shadow-xs border border-white">
                      {cartCount}
                    </span>
                  )}
                </Link>

                {/* Menu Button in Green Top Bar for easy navigation */}
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center justify-center p-2 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 transition-all text-white shadow-xs cursor-pointer"
                  aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                  title="Menu"
                >
                  {isMenuOpen ? (
                    <X className="w-5 h-5 text-white stroke-[2.5]" />
                  ) : (
                    <Menu className="w-5 h-5 text-white stroke-[2.5]" />
                  )}
                </button>

                {/* Back Button for all subpages on the RIGHT side */}
                {pathname !== '/' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        if (window.history.length > 1) {
                          window.history.back();
                        } else {
                          window.location.href = '/';
                        }
                      }
                    }}
                    className="flex items-center space-x-1.5 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 transition-all text-white font-bold shadow-xs flex-shrink-0 py-1.5 px-3 text-xs"
                    aria-label="Back to Previous Page"
                  >
                    <ArrowLeft className="w-4 h-4 text-white stroke-[2.5]" />
                    <span>Back</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main White Header Strip */}
        <header 
          className="w-full bg-white shadow-xs border-b border-gray-100"
          style={{ backgroundColor: '#ffffff' }}
        >
          <div className="w-full max-w-7xl mx-auto px-2 sm:px-6 py-1 sm:py-2">
            {/* If Android App: 6 SQUARE Buttons with Icon & Below Text (Zoom, Sadhana, Media/YouTube, Pay, Cart, Menu) */}
            {isAndroidApp ? (
              pathname !== '/media' ? (
                <div className="grid grid-cols-6 gap-1 sm:gap-1.5 items-center justify-items-center w-full max-w-md mx-auto py-1">
                  {/* 1. Zoom */}
                  <button
                    type="button"
                    onClick={() => setIsZoomModalOpen(true)}
                    className="w-full aspect-square max-w-[62px] flex flex-col items-center justify-center p-1 rounded-2xl bg-white border border-gray-200/90 hover:border-blue-300 hover:bg-blue-50/50 shadow-xs active:scale-95 transition-all group"
                  >
                    <Video className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform flex-shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-medium text-gray-700 group-hover:text-blue-900 mt-1 tracking-tight leading-none truncate">
                      Zoom
                    </span>
                  </button>

                  {/* 2. Sadhana */}
                  <button
                    type="button"
                    onClick={() => setIsSadhanaModalOpen(true)}
                    className="w-full aspect-square max-w-[62px] flex flex-col items-center justify-center p-1 rounded-2xl bg-white border border-gray-200/90 hover:border-amber-300 hover:bg-amber-50/50 shadow-xs active:scale-95 transition-all group"
                  >
                    <Flame className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform flex-shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-medium text-gray-700 group-hover:text-amber-900 mt-1 tracking-tight leading-none truncate">
                      Sadhana
                    </span>
                  </button>

                  {/* 3. YouTube Symbol connected to /media */}
                  <Link
                    href="/media"
                    className={`relative w-full aspect-square max-w-[62px] flex flex-col items-center justify-center p-1 rounded-2xl bg-white border border-gray-200/90 hover:border-red-400 hover:bg-red-50/40 shadow-xs active:scale-95 transition-all group ${
                      pathname === '/media' ? 'border-2 border-red-600 ring-2 ring-red-500/20' : ''
                    }`}
                    title="Swar Yoga Media"
                  >
                    <div className="relative flex items-center justify-center">
                      <div className="w-7 h-5 bg-[#FF0000] rounded-xl flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                        <Play className="w-2.5 h-2.5 text-white fill-white ml-0.5" />
                      </div>
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-medium text-gray-700 group-hover:text-red-600 mt-1 tracking-tight leading-none truncate">
                      Media
                    </span>
                  </Link>

                  {/* 4. Pay */}
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="w-full aspect-square max-w-[62px] flex flex-col items-center justify-center p-1 rounded-2xl bg-white border border-gray-200/90 hover:border-purple-300 hover:bg-purple-50/50 shadow-xs active:scale-95 transition-all group"
                  >
                    <CreditCard className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform flex-shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-medium text-gray-700 group-hover:text-purple-900 mt-1 tracking-tight leading-none truncate">
                      Pay
                    </span>
                  </button>

                  {/* 5. Blog (Book Icon before three-line Menu bar) */}
                  <Link
                    href="/blog"
                    className={`relative w-full aspect-square max-w-[62px] flex flex-col items-center justify-center p-1 rounded-2xl bg-white border border-gray-200/90 hover:border-emerald-400 hover:bg-emerald-50/50 shadow-xs active:scale-95 transition-all group ${
                      pathname?.startsWith('/blog') ? 'border-2 border-emerald-600 ring-2 ring-emerald-500/20' : ''
                    }`}
                    title="Swar Yoga Blog & E-Book"
                  >
                    <BookOpen className={`w-5 h-5 group-hover:scale-110 transition-transform flex-shrink-0 ${
                      pathname?.startsWith('/blog') ? 'text-emerald-700' : 'text-emerald-600'
                    }`} />
                    <span className={`text-[10px] sm:text-[11px] font-medium mt-1 tracking-tight leading-none truncate ${
                      pathname?.startsWith('/blog') ? 'text-emerald-700 font-bold' : 'text-gray-700 group-hover:text-emerald-900'
                    }`}>
                      Blog
                    </span>
                  </Link>

                  {/* 6. L-Plan (Calendar Icon) */}
                  <Link
                    href="/life-planner"
                    className={`relative w-full aspect-square max-w-[62px] flex flex-col items-center justify-center p-1 rounded-2xl bg-white border border-gray-200/90 hover:border-emerald-400 hover:bg-emerald-50/50 shadow-xs active:scale-95 transition-all group ${
                      pathname?.startsWith('/life-planner') ? 'border-2 border-emerald-600 ring-2 ring-emerald-500/20' : ''
                    }`}
                    title="Life Planner"
                  >
                    <Calendar className={`w-5 h-5 group-hover:scale-110 transition-transform flex-shrink-0 ${
                      pathname?.startsWith('/life-planner') ? 'text-emerald-700' : 'text-emerald-600'
                    }`} />
                    <span className={`text-[10px] sm:text-[11px] font-medium mt-1 tracking-tight leading-none truncate ${
                      pathname?.startsWith('/life-planner') ? 'text-emerald-700 font-bold' : 'text-gray-700 group-hover:text-emerald-900'
                    }`}>
                      L-Plan
                    </span>
                  </Link>
                </div>
            ) : null
          ) : (
            /* Regular Desktop & Mobile Website Header */
            <div className="flex items-center justify-between gap-2 w-full">
              {/* Logo - Image Based */}
              <Link href="/" className="flex items-center space-x-2 group hover:opacity-90 transition-opacity flex-shrink-0 min-w-0">
                <div className="relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center flex-shrink-0">
                  <picture>
                    <source srcSet="/images/logo-infinity.webp" type="image/webp" />
                    <img 
                      src="/images/logo-infinity.png"
                      alt="Swar Yoga Logo"
                      className="w-full h-full object-contain drop-shadow-sm"
                      width={40}
                      height={40}
                      loading="eager"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/logo.png';
                      }}
                    />
                  </picture>
                </div>
                
                <div className="flex flex-col tracking-tight truncate">
                  <span 
                    className="text-base sm:text-lg xl:text-xl font-bold leading-none text-black truncate" 
                    style={{
                      fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto",
                      letterSpacing: "-0.01em",
                      fontWeight: 700
                    }}
                  >
                    Swar Yoga
                  </span>
                  <span 
                    className="text-[9px] sm:text-xs font-semibold leading-tight text-[#FF6B35] mt-0.5 hidden xs:block sm:block truncate" 
                    style={{
                      fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto",
                      letterSpacing: "0.02em",
                      fontWeight: 600
                    }}
                  >
                    From Breath To Soul
                  </span>
                </div>
              </Link>

              {/* Desktop Navigation (Website: Home, About, Workshops, E-Learning, Resort, Community, Contact) */}
              <nav className="hidden lg:flex items-center space-x-1 xl:space-x-2">
                {websiteNav.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`relative px-2.5 py-1.5 rounded-lg font-medium transition-all duration-200 group text-xs xl:text-sm whitespace-nowrap ${
                      isActive(item.href) 
                        ? 'text-swar-primary bg-swar-primary-light font-bold' 
                        : 'text-swar-text hover:text-swar-primary hover:bg-swar-primary-light'
                    }`}
                  >
                    {item.name}
                    {isActive(item.href) && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-swar-primary rounded-full"></div>
                    )}
                    <div className="absolute inset-0 rounded-lg bg-swar-primary/10 opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>
                  </Link>
                ))}

                {/* Community Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsCommunityDropdownOpen((prev) => !prev)}
                    className={`relative flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium transition-all duration-200 group text-xs xl:text-sm whitespace-nowrap ${
                      isCommunityActive || isCommunityDropdownOpen
                        ? 'text-swar-primary bg-swar-primary-light font-bold'
                        : 'text-swar-text hover:text-swar-primary hover:bg-swar-primary-light'
                    }`}
                    aria-expanded={isCommunityDropdownOpen}
                    aria-haspopup="true"
                  >
                    <span>Community</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        isCommunityDropdownOpen ? 'rotate-180 text-swar-primary' : 'text-gray-400 group-hover:text-swar-primary'
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isCommunityDropdownOpen && (
                    <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white shadow-xl border border-gray-100 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      {communityDropdownItems.map((subItem) => {
                        const Icon = subItem.icon;
                        const subActive =
                          pathname === subItem.href ||
                          (subItem.href === '/blog' && (pathname === '/blogs' || pathname?.startsWith('/blog/'))) ||
                          (subItem.href === '/life-planner/ritucharya' && (pathname?.includes('ritucharya') || pathname?.includes('rutucharya')));
                        return (
                          <Link
                            key={subItem.name}
                            href={subItem.href}
                            onClick={() => setIsCommunityDropdownOpen(false)}
                            className={`flex items-start gap-3 p-2.5 rounded-xl transition-all duration-150 ${
                              subActive
                                ? 'bg-swar-primary-light text-swar-primary'
                                : 'hover:bg-gray-50 text-gray-700 hover:text-swar-primary'
                            }`}
                          >
                            <div className={`p-2 rounded-lg mt-0.5 ${subActive ? 'bg-swar-primary text-white' : 'bg-green-50 text-swar-primary'}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm leading-snug">{subItem.name}</span>
                              <span className="text-[11px] text-gray-500 font-normal leading-tight mt-0.5">{subItem.description}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Contact Link */}
                <Link
                  href="/contact"
                  className={`relative px-2.5 py-1.5 rounded-lg font-medium transition-all duration-200 group text-xs xl:text-sm whitespace-nowrap ${
                    isActive('/contact') 
                      ? 'text-swar-primary bg-swar-primary-light font-bold' 
                      : 'text-swar-text hover:text-swar-primary hover:bg-swar-primary-light'
                  }`}
                >
                  Contact
                </Link>
              </nav>

              {/* Right Side Actions: Cart + Sign In (in red) / User Profile + Mobile Hamburger */}
              <div className="flex items-center space-x-2.5 sm:space-x-3 flex-shrink-0 ml-auto lg:ml-0">
                {/* Cart */}
                <Link
                  href="/cart"
                  className="relative p-2 text-gray-700 hover:text-swar-primary hover:bg-emerald-50 rounded-xl transition-all duration-200 touch-manipulation flex-shrink-0"
                  aria-label="View Cart"
                >
                  <ShoppingCart className="h-5 w-5 sm:h-5 sm:w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center shadow-sm">
                      {cartCount}
                    </span>
                  )}
                </Link>

                {/* Desktop User is logged in */}
                {user ? (
                  <div className="hidden sm:flex items-center space-x-1.5 flex-shrink-0">
                    <Link
                      href="/profile"
                      className="flex items-center space-x-1.5 bg-emerald-50 text-swar-primary px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors text-xs xl:text-sm font-semibold"
                    >
                      <User className="h-4 w-4" />
                      <span>{userDisplayName}</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      title="Logout"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="hidden sm:flex items-center space-x-1 flex-shrink-0">
                    {/* Sign In in RED as requested */}
                    <Link
                      href="/signin"
                      className="text-xs xl:text-sm font-bold text-red-600 border border-red-600 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-all duration-200 whitespace-nowrap shadow-sm hover:scale-[1.02] active:scale-95"
                    >
                      Sign In
                    </Link>
                  </div>
                )}

                {/* Mobile 3-Line Menu Button */}
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="lg:hidden p-2 text-white bg-gradient-to-br from-swar-primary to-[#166235] hover:opacity-95 rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center flex-shrink-0"
                  aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                >
                  {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </div>
          )}

        </div>
      </header>
    </div>

      {/* FULL-SCREEN ALL CARDS MENU (Shows ONLY cards, NOT any page, with Back button) */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-[9999] bg-white flex flex-col overflow-y-auto animate-in fade-in duration-200"
          style={{ backgroundColor: '#ffffff' }}
        >
          {/* Top Bar inside Menu: Logo on Left, Back & Close buttons on Right */}
          <div className="sticky top-0 z-20 w-full bg-[#0B5C37] px-3 sm:px-6 py-2.5 flex items-center justify-between shadow-md">
            {/* Logo and Swar Yoga on Left */}
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="relative w-8 h-8 flex items-center justify-center rounded-full overflow-hidden shadow-sm flex-shrink-0">
                <picture>
                  <source srcSet="/images/logo-infinity.webp" type="image/webp" />
                  <img 
                    src="/images/logo-infinity.png"
                    alt="Swar Yoga Logo"
                    className="w-full h-full object-contain"
                    width={32}
                    height={32}
                  />
                </picture>
              </div>
              <div className="flex flex-col tracking-tight truncate">
                <span className="text-sm sm:text-base font-bold leading-none text-white truncate">
                  Swar Yoga
                </span>
                <span className="text-[9.5px] font-semibold leading-tight text-[#FFA726] mt-0.5 truncate">
                  From Breath To Soul
                </span>
              </div>
            </div>

            {/* Back & Close buttons on Right */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button
                type="button"
                onClick={closeMenu}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-xs active:scale-95 transition-all shadow-sm"
                aria-label="Back to Previous Page"
              >
                <ArrowLeft className="w-4 h-4 text-white stroke-[2.5]" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={closeMenu}
                className="p-1.5 text-white/90 hover:text-white hover:bg-white/15 rounded-full transition-all active:scale-95 flex-shrink-0"
                aria-label="Close Menu"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Cards Content Container */}
          <div className="w-full max-w-2xl mx-auto px-4 py-4 sm:py-6 space-y-4 flex-1">
            {/* Header Side: Sign In & Sign Up (or Profile if logged in) */}
            <div className="pb-2">
              {user ? (
                <div className="flex items-center justify-between p-3.5 bg-emerald-50/90 rounded-2xl border border-emerald-200">
                  <Link
                    href="/profile"
                    className="flex items-center space-x-3 text-swar-primary touch-manipulation min-w-0"
                    onClick={closeMenu}
                  >
                    <div className="w-10 h-10 rounded-xl bg-swar-primary text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-sm block truncate text-gray-900">{userDisplayName}</span>
                      <span className="text-xs text-emerald-700 block font-medium">View My Profile</span>
                    </div>
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="py-1.5 px-3 text-red-600 hover:bg-red-50 rounded-xl transition-all font-semibold touch-manipulation active:scale-[0.98] text-xs flex items-center gap-1 border border-red-200"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  <Link
                    href="/signin"
                    className="flex items-center justify-center py-3 px-4 text-red-600 border-2 border-red-600 hover:bg-red-50 rounded-2xl font-bold text-sm touch-manipulation active:scale-[0.98] transition-all shadow-xs"
                    onClick={closeMenu}
                  >
                    <span>Sign In</span>
                  </Link>
                  <Link
                    href="/signup"
                    className="flex items-center justify-center py-3 px-4 bg-gradient-to-r from-swar-primary to-[#166235] text-white rounded-2xl font-bold text-sm shadow-md hover:opacity-95 touch-manipulation active:scale-[0.98] transition-all"
                    onClick={closeMenu}
                  >
                    <span>Sign Up</span>
                  </Link>
                </div>
              )}
            </div>

            {/* All Pages Shown in Colorful Cards (2-column responsive grid, NO page shown behind) */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {[
                { 
                  name: 'Home', 
                  href: '/', 
                  icon: Home, 
                  desc: 'Main Portal',
                  bg: 'bg-[#ECFDF5] border-[#A7F3D0] hover:bg-[#D1FAE5]',
                  iconBg: 'bg-[#059669] text-white',
                  descColor: 'text-[#047857]'
                },
                { 
                  name: 'Workshops', 
                  href: '/workshops', 
                  icon: BookOpen, 
                  desc: 'Live Batches',
                  bg: 'bg-[#EFF6FF] border-[#BFDBFE] hover:bg-[#DBEAFE]',
                  iconBg: 'bg-[#2563EB] text-white',
                  descColor: 'text-[#1D4ED8]'
                },
                { 
                  name: 'E-Learning', 
                  href: '/e-learning', 
                  icon: GraduationCap, 
                  desc: 'Video Courses',
                  bg: 'bg-[#EEF2FF] border-[#C7D2FE] hover:bg-[#E0E7FF]',
                  iconBg: 'bg-[#4F46E5] text-white',
                  descColor: 'text-[#4338CA]'
                },
                { 
                  name: 'Resort', 
                  href: '/resort', 
                  icon: Building2, 
                  desc: 'Stay & Retreat',
                  bg: 'bg-[#F0FDFA] border-[#99F6E4] hover:bg-[#CCFBF1]',
                  iconBg: 'bg-[#0D9488] text-white',
                  descColor: 'text-[#0F766E]'
                },
                { 
                  name: 'About Us', 
                  href: '/about', 
                  icon: Sparkles, 
                  desc: 'Guru & Mission',
                  bg: 'bg-[#FAF5FF] border-[#E9D5FF] hover:bg-[#F3E8FF]',
                  iconBg: 'bg-[#9333EA] text-white',
                  descColor: 'text-[#7E22CE]'
                },
                { 
                  name: 'Community', 
                  href: '/community', 
                  icon: Users, 
                  desc: 'Sadhak Forum',
                  bg: 'bg-[#ECFEFF] border-[#A5F3FC] hover:bg-[#CFFAFE]',
                  iconBg: 'bg-[#0891B2] text-white',
                  descColor: 'text-[#0E7490]'
                },
                { 
                  name: 'Media', 
                  href: '/media', 
                  icon: Film, 
                  desc: 'Photos & Videos',
                  bg: 'bg-[#FDF4FF] border-[#F5D0FE] hover:bg-[#FAE8FF]',
                  iconBg: 'bg-[#C026D3] text-white',
                  descColor: 'text-[#A21CAF]'
                },
                { 
                  name: 'Rutucharya', 
                  href: '/life-planner/ritucharya', 
                  icon: Sun, 
                  desc: 'Seasonal Diet',
                  bg: 'bg-[#FFFBEB] border-[#FDE68A] hover:bg-[#FEF3C7]',
                  iconBg: 'bg-[#D97706] text-white',
                  descColor: 'text-[#B45309]'
                },
                { 
                  name: 'Life Planner', 
                  href: '/life-planner', 
                  icon: Clock, 
                  desc: 'Visions & Habits',
                  bg: 'bg-[#FFF1F2] border-[#FECDD3] hover:bg-[#FFE4E6]',
                  iconBg: 'bg-[#E11D48] text-white',
                  descColor: 'text-[#BE123C]'
                },
                { 
                  name: 'Swar Calendar', 
                  href: '/calendar', 
                  icon: Calendar, 
                  desc: 'Tithi & Panchang',
                  bg: 'bg-[#FFF7ED] border-[#FED7AA] hover:bg-[#FFEDD5]',
                  iconBg: 'bg-[#EA580C] text-white',
                  descColor: 'text-[#C2410C]'
                },
                { 
                  name: 'Blogs', 
                  href: '/blog', 
                  icon: BookOpen, 
                  desc: 'Articles & Wisdom',
                  bg: 'bg-[#F7FEE7] border-[#D9F99D] hover:bg-[#ECFCCB]',
                  iconBg: 'bg-[#65A30D] text-white',
                  descColor: 'text-[#4D7C0F]'
                },
                { 
                  name: 'Contact Us', 
                  href: '/contact', 
                  icon: Phone, 
                  desc: 'Help & Enquiries',
                  bg: 'bg-[#F0F9FF] border-[#BAE6FD] hover:bg-[#E0F2FE]',
                  iconBg: 'bg-[#0284C7] text-white',
                  descColor: 'text-[#0369A1]'
                },
              ].map((page) => {
                const PageIcon = page.icon;
                const active = isActive(page.href);
                return (
                  <Link
                    key={page.name}
                    href={page.href}
                    onClick={closeMenu}
                    className={`flex items-center space-x-3 p-3 sm:p-3.5 rounded-2xl border transition-all active:scale-[0.98] shadow-xs ${page.bg} ${
                      active ? 'ring-2 ring-emerald-500 shadow-sm' : ''
                    }`}
                  >
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${page.iconBg}`}>
                      <PageIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs sm:text-sm font-bold text-gray-900 truncate leading-tight">{page.name}</span>
                      <span className={`text-[10px] sm:text-[11px] font-semibold truncate block mt-0.5 leading-tight ${page.descColor}`}>{page.desc}</span>
                    </div>
                  </Link>
                );
              })}

              {/* Office Use Button -> Opens Login Page (/admin/login) */}
              <Link
                href="/admin/login"
                onClick={closeMenu}
                className="col-span-2 flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-[#166235] to-teal-700 text-white shadow-md active:scale-[0.98] transition-all group mt-1"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0 backdrop-blur-sm shadow-inner">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-base tracking-tight block">Office Use</span>
                    <span className="text-[11px] text-emerald-100/90 truncate block mt-0.5">Staff &amp; Admin Portal</span>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-2">
                  <span className="px-3.5 py-1.5 rounded-xl bg-emerald-300 hover:bg-emerald-200 text-emerald-950 font-extrabold text-xs shadow-sm flex items-center gap-1.5 transition-all group-hover:scale-105">
                    <span>Office Use</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>

              {/* Short "Update Now" Button in Menu */}
              <button
                type="button"
                onClick={() => setIsUpdateModalOpen(true)}
                className="col-span-2 flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-pink-50 hover:from-purple-100 hover:to-indigo-100 border border-purple-200/80 text-gray-800 shadow-xs active:scale-[0.99] transition-all group mt-1 cursor-pointer text-left"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center flex-shrink-0 text-white shadow-xs">
                    <RefreshCw className="w-4 h-4 text-white group-hover:rotate-180 transition-transform duration-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-gray-900 tracking-tight">Update Now</span>
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                        ✓ 24h Auto
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-500 truncate block">
                      Tap to check releases & manage sync
                    </span>
                  </div>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1 flex-shrink-0 ml-2">
                  <span>Open</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>
            
            {/* Bottom spacer for comfortable scrolling */}
            <div className="h-8" />
          </div>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar for Mobile App (Home, Workshops, E-Learning, Resort, Community) */}
      {!isMenuOpen && isAndroidApp && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.08)] select-none"
          style={{ backgroundColor: '#ffffff' }}
        >
          <div 
            className="w-full max-w-md mx-auto grid grid-cols-5 px-1 py-1"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 6px)' }}
          >
            <Link
              href="/"
              className={`flex flex-col items-center justify-center py-1 transition-colors ${
                pathname === '/' ? 'text-swar-primary font-bold' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-[10px] font-medium mt-0.5">Home</span>
            </Link>

            <Link
              href="/workshops"
              className={`flex flex-col items-center justify-center py-1 transition-colors ${
                pathname?.startsWith('/workshops') ? 'text-swar-primary font-bold' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span className="text-[10px] font-medium mt-0.5">Workshops</span>
            </Link>

            <Link
              href="/e-learning"
              className={`flex flex-col items-center justify-center py-1 transition-colors ${
                pathname?.startsWith('/e-learning') ? 'text-swar-primary font-bold' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <GraduationCap className="w-5 h-5" />
              <span className="text-[10px] font-medium mt-0.5">E-Learning</span>
            </Link>

            <Link
              href="/resort"
              className={`flex flex-col items-center justify-center py-1 transition-colors ${
                pathname?.startsWith('/resort') ? 'text-swar-primary font-bold' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Building2 className="w-5 h-5" />
              <span className="text-[10px] font-medium mt-0.5">Resort</span>
            </Link>

            <Link
              href="/community"
              className={`flex flex-col items-center justify-center py-1 transition-colors ${
                pathname?.startsWith('/community') || pathname?.startsWith('/blog') ? 'text-swar-primary font-bold' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="text-[10px] font-medium mt-0.5">Community</span>
            </Link>
          </div>
        </div>
      )}

      {/* Quick Action Modals */}
      <ZoomJoinModal 
        isOpen={isZoomModalOpen} 
        onClose={() => setIsZoomModalOpen(false)} 
      />
      <DailySadhanaModal 
        isOpen={isSadhanaModalOpen} 
        onClose={() => setIsSadhanaModalOpen(false)} 
      />
      <QuickPaymentModal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)} 
      />

      {/* Update App Popup Modal */}
      {isUpdateModalOpen && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsUpdateModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-sm bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700 text-white rounded-3xl p-5 shadow-2xl border border-white/20 select-none animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={() => setIsUpdateModalOpen(false)}
              aria-label="Close update modal"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition-all"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Header */}
            <div className="pr-8 mb-4">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <h3 className="font-bold text-lg tracking-tight">Update App</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs transition-colors ${autoUpdateEnabled ? 'bg-emerald-500 text-white border border-emerald-300/40' : 'bg-white/20 text-purple-200'}`}>
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>{autoUpdateEnabled ? '24h Auto-Update Active' : 'Auto-Update OFF'}</span>
                </span>
              </div>
              <p className="text-xs text-purple-100/90 leading-relaxed">
                {updateStatusText || (autoUpdateEnabled ? `Auto-updates every 24h • ${lastUpdateLabel}` : 'Auto-updates disabled')}
              </p>
            </div>

            {/* Action Card with Small "Update Now" Button */}
            <div className="bg-black/25 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 flex items-center justify-between mb-3.5">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <RefreshCw className={`w-5 h-5 text-white ${isUpdatingApp ? 'animate-spin' : ''}`} />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-xs text-white block">Manual Sync</span>
                  <span className="text-[11px] text-purple-200 block truncate">
                    {isUpdatingApp ? 'Applying updates...' : 'Get latest fixes now'}
                  </span>
                </div>
              </div>

              {/* Small Update Now Button */}
              <button
                type="button"
                disabled={isUpdatingApp}
                onClick={() => handleAppAutoUpdate(true)}
                className="px-3 py-1.5 rounded-xl bg-white text-purple-900 hover:bg-purple-50 active:scale-95 font-bold text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer flex-shrink-0 disabled:opacity-70 ml-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isUpdatingApp ? 'animate-spin' : ''}`} />
                <span>{isUpdatingApp ? 'Updating...' : 'Update Now'}</span>
              </button>
            </div>

            {/* Interactive Checkmark Row for Auto-Update */}
            <div
              onClick={toggleAutoUpdate}
              className="flex items-center justify-between pt-3 border-t border-white/15 cursor-pointer active:opacity-80 transition-opacity"
            >
              <div className="flex items-center space-x-2.5">
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                    autoUpdateEnabled
                      ? 'bg-emerald-500 border-emerald-300 text-white shadow-xs'
                      : 'bg-white/15 border-white/30 text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span className="text-xs font-semibold text-purple-100">
                  Auto-update every 24 hours for new releases
                </span>
              </div>
              <span className="text-[10px] font-bold text-emerald-300 flex-shrink-0 ml-2">
                {autoUpdateEnabled ? '✓ Every 24h' : 'Manual only'}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
