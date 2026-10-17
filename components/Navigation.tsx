'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Menu, X, ShoppingCart, User, LogOut, ChevronDown, Users, Sun, BookOpen, Film } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { getStoredCart } from '@/lib/cart';
import { clearSession } from '@/lib/sessionManager';

const communityDropdownItems = [
  {
    name: 'Community',
    href: '/community',
    description: 'Join discussions & connect with practitioners',
    icon: Users,
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
  {
    name: 'Media',
    href: '/media',
    description: 'Photos, videos, and press coverage',
    icon: Film,
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
  const pathname = usePathname();

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
    { name: 'Workshops', href: '/workshops' },
    { name: 'E-Learning', href: '/e-learning' },
    { name: 'Resort', href: '/resort' },
  ];

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
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
      {/* Top Bar */}
      <div className="bg-gradient-to-r from-swar-primary to-green-700 text-white py-2 px-4 hidden lg:block">
        <div className="container mx-auto flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <span>Contact: mohan@swaryoga.com</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Transform Your Life Through Yoga</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100' 
          : 'bg-white shadow-md'
      }`}>
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Logo - Image Based */}
            <Link href="/" className="flex items-center space-x-2 sm:space-x-3 group hover:opacity-90 transition-opacity">
              {/* Logo Image - Enhanced Size */}
              <div className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center flex-shrink-0">
                <img 
                  src="/logo with mohan sir.png"
                  alt="Swar Yoga Logo"
                  className="w-full h-full object-contain"
                  loading="eager"
                />
              </div>
              
              {/* Text - Poppins Font */}
              <div className="flex flex-col tracking-tight">
                <span 
                  className="text-sm sm:text-xl md:text-2xl font-bold leading-none" 
                  style={{
                    fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto",
                    letterSpacing: "-0.01em",
                    fontWeight: 700,
                    color: "#000000"
                  }}
                >
                  Swar Yoga
                </span>
                <div 
                  className="text-[8px] sm:text-xs font-semibold leading-tight hidden xs:block sm:block" 
                  style={{
                    fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto",
                    letterSpacing: "0.02em",
                    color: "#FF6B35",
                    fontWeight: 600
                  }}
                >
                  From Breath To Soul
                </div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`relative px-3.5 py-2 rounded-lg font-medium transition-all duration-200 group ${
                    isActive(item.href) 
                      ? 'text-swar-primary bg-swar-primary-light' 
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
                  className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-medium transition-all duration-200 group ${
                    isCommunityActive || isCommunityDropdownOpen
                      ? 'text-swar-primary bg-swar-primary-light'
                      : 'text-swar-text hover:text-swar-primary hover:bg-swar-primary-light'
                  }`}
                  aria-expanded={isCommunityDropdownOpen}
                  aria-haspopup="true"
                >
                  <span>Community</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      isCommunityDropdownOpen ? 'rotate-180 text-swar-primary' : 'text-gray-400 group-hover:text-swar-primary'
                    }`}
                  />
                  {isCommunityActive && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-swar-primary rounded-full"></div>
                  )}
                  <div className="absolute inset-0 rounded-lg bg-swar-primary/10 opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>
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
                className={`relative px-3.5 py-2 rounded-lg font-medium transition-all duration-200 group ${
                  isActive('/contact') 
                    ? 'text-swar-primary bg-swar-primary-light' 
                    : 'text-swar-text hover:text-swar-primary hover:bg-swar-primary-light'
                }`}
              >
                Contact
                {isActive('/contact') && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-swar-primary rounded-full"></div>
                )}
                <div className="absolute inset-0 rounded-lg bg-swar-primary/10 opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>
              </Link>
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Cart */}
              <Link
                href="/cart"
                className="relative p-2 text-swar-text hover:text-swar-primary hover:bg-swar-primary-light rounded-lg transition-all duration-200 group touch-manipulation"
              >
                <ShoppingCart className="h-6 w-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-swar-accent to-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {cartCount}
                  </span>
                )}
                <div className="absolute inset-0 rounded-lg bg-swar-primary/10 opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>
              </Link>

              {/* User is logged in */}
              {user ? (
                <div className="hidden sm:flex items-center space-x-2">
                  <Link
                    href="/profile"
                    className="flex items-center space-x-2 bg-swar-primary-light px-3 py-2 rounded-lg hover:bg-swar-primary-light transition-colors"
                  >
                    <User className="h-5 w-5 text-swar-primary" />
                    <span className="font-medium text-swar-primary">{userDisplayName}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 text-red-600 hover:text-swar-primary hover:bg-red-50 px-3 py-2 rounded-lg transition-all duration-200 font-medium group relative"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                    <div className="absolute inset-0 rounded-lg bg-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>
                  </button>
                </div>
              ) : (
                <>
                  {/* Sign In */}
                  <Link
                    href="/signin"
                    className="hidden sm:flex items-center space-x-2 text-red-600 hover:text-swar-primary hover:bg-red-50 px-3 py-2 rounded-lg transition-all duration-200 font-medium group relative"
                  >
                    <span>Sign In</span>
                    <div className="absolute inset-0 rounded-lg bg-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>
                  </Link>

                  {/* Sign Up */}
                  <Link
                    href="/signup"
                    className="hidden sm:block bg-gradient-to-r from-swar-primary to-green-700 text-white px-6 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
                  >
                    Sign Up
                  </Link>
                </>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden p-2.5 text-white bg-gradient-to-br from-swar-primary to-green-600 hover:from-green-600 hover:to-green-700 rounded-xl transition-all duration-200 shadow-md active:scale-95"
                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="lg:hidden mt-4 pb-4 border-t border-swar-border animate-in slide-in-from-top duration-200">
              <nav className="flex flex-col space-y-1.5 mt-4">
                {/* Sign In / Sign Out — shown first, in red */}
                <div className="flex flex-col space-y-2 pb-4 mb-2 border-b border-swar-border">
                  {user ? (
                    <>
                      <Link
                        href="/profile"
                        className="flex items-center space-x-3 px-4 py-3.5 bg-swar-primary-light text-swar-primary rounded-xl touch-manipulation active:scale-[0.98]"
                        onClick={closeMenu}
                      >
                        <User className="h-5 w-5" />
                        <span className="font-medium">{userDisplayName}</span>
                      </Link>
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center space-x-3 px-4 py-3.5 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 font-medium touch-manipulation active:scale-[0.98]"
                      >
                        <LogOut className="h-5 w-5" />
                        <span>Sign Out</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/signin"
                        className="flex items-center justify-center space-x-2 px-4 py-3.5 text-red-600 border-2 border-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 font-medium touch-manipulation active:scale-[0.98]"
                        onClick={closeMenu}
                      >
                        <span>Sign In</span>
                      </Link>
                      <Link
                        href="/signup"
                        className="bg-gradient-to-r from-swar-primary to-green-600 text-white px-4 py-3.5 rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 text-center font-medium shadow-lg touch-manipulation active:scale-[0.98]"
                        onClick={closeMenu}
                      >
                        Sign Up
                      </Link>
                    </>
                  )}
                </div>

                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`px-4 py-3.5 rounded-xl font-medium transition-all duration-200 touch-manipulation active:scale-[0.98] ${
                      isActive(item.href)
                        ? 'text-white bg-gradient-to-r from-swar-primary to-green-600 shadow-md'
                        : 'text-swar-text hover:text-swar-primary hover:bg-swar-primary-light'
                    }`}
                    onClick={closeMenu}
                  >
                    {item.name}
                  </Link>
                ))}

                {/* Mobile Community Accordion */}
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => setIsMobileCommunityOpen((prev) => !prev)}
                    className={`flex items-center justify-between px-4 py-3.5 rounded-xl font-medium transition-all duration-200 touch-manipulation active:scale-[0.98] ${
                      isCommunityActive
                        ? 'text-white bg-gradient-to-r from-swar-primary to-green-600 shadow-md'
                        : 'text-swar-text hover:text-swar-primary hover:bg-swar-primary-light'
                    }`}
                  >
                    <span>Community</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${
                        isMobileCommunityOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isMobileCommunityOpen && (
                    <div className="pl-3 pr-2 py-1.5 space-y-1 bg-gray-50/80 rounded-xl mt-1 border border-gray-100">
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
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                              subActive
                                ? 'text-swar-primary bg-swar-primary-light font-bold'
                                : 'text-gray-600 hover:text-swar-primary hover:bg-gray-100'
                            }`}
                            onClick={closeMenu}
                          >
                            <Icon className="h-4 w-4 text-swar-primary" />
                            <span>{subItem.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Mobile Contact Link */}
                <Link
                  href="/contact"
                  className={`px-4 py-3.5 rounded-xl font-medium transition-all duration-200 touch-manipulation active:scale-[0.98] ${
                    isActive('/contact')
                      ? 'text-white bg-gradient-to-r from-swar-primary to-green-600 shadow-md'
                      : 'text-swar-text hover:text-swar-primary hover:bg-swar-primary-light'
                  }`}
                  onClick={closeMenu}
                >
                  Contact
                </Link>

                {/* Cart */}
                <div className="pt-4 mt-2 border-t border-swar-border">
                  <Link
                    href="/cart"
                    className="flex items-center space-x-3 px-4 py-3.5 text-swar-text hover:text-swar-primary hover:bg-swar-primary-light rounded-xl transition-all duration-200 touch-manipulation active:scale-[0.98]"
                    onClick={closeMenu}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    <span>Cart {cartCount > 0 && `(${cartCount})`}</span>
                  </Link>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
