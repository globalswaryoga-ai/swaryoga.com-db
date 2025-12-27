'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X, ShoppingCart, User, LogOut } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { getStoredCart } from '@/lib/cart';
import { clearSession } from '@/lib/sessionManager';

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [userDisplayName, setUserDisplayName] = useState<string>('');
  const pathname = usePathname();

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
    { name: 'Workshops', href: '/workshop' },
    { name: 'Resort', href: '/resort' },
    { name: 'Blog', href: '/blog' },
    { name: 'Community', href: '/community' },
    { name: 'Contact', href: '/contact' },
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
            <span>Contact: globalswaryoga@gmail.com</span>
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
            <Link href="/" className="flex items-center space-x-3 group hover:opacity-80 transition-opacity">
              {/* Logo Image */}
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center flex-shrink-0">
                <img 
                  src="https://i.postimg.cc/xTPRSY4X/swar_yoga_new_logo.png"
                  alt="Swar Yoga Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              
              {/* Text - Poppins Font */}
              <div className="flex flex-col tracking-tight">
                <span 
                  className="text-xl sm:text-2xl font-bold" 
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
                  className="text-xs sm:text-sm font-semibold -mt-0.5 hidden sm:block" 
                  style={{
                    fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto",
                    letterSpacing: "0.02em",
                    color: "#ff751f",
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
                  className={`relative px-4 py-2 rounded-lg font-medium transition-all duration-200 group ${
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
                className="lg:hidden p-2 text-swar-text hover:text-swar-primary hover:bg-swar-primary-light rounded-lg transition-all duration-200"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="lg:hidden mt-4 pb-4 border-t border-swar-border animate-in slide-in-from-top duration-200">
              <nav className="flex flex-col space-y-2 mt-4">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 touch-manipulation ${
                      isActive(item.href) 
                        ? 'text-swar-primary bg-swar-primary-light border-l-4 border-green-600' 
                        : 'text-swar-text hover:text-swar-primary hover:bg-swar-primary-light'
                    }`}
                    onClick={closeMenu}
                  >
                    {item.name}
                  </Link>
                ))}
                
                {/* Mobile Actions */}
                <div className="flex flex-col space-y-2 pt-4 border-t border-swar-border">
                  <Link
                    href="/cart"
                    className="flex items-center space-x-2 px-4 py-3 text-swar-text hover:text-swar-primary hover:bg-swar-primary-light rounded-lg transition-all duration-200 touch-manipulation"
                    onClick={closeMenu}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    <span>Cart {cartCount > 0 && `(${cartCount})`}</span>
                  </Link>
                  
                  {user ? (
                    <>
                      <Link
                        href="/profile"
                        className="flex items-center space-x-2 px-4 py-3 bg-swar-primary-light text-swar-primary rounded-lg touch-manipulation"
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
                        className="flex items-center space-x-2 px-4 py-3 text-red-600 hover:text-swar-primary hover:bg-red-50 rounded-lg transition-all duration-200 font-medium touch-manipulation"
                      >
                        <LogOut className="h-5 w-5" />
                        <span>Logout</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/signin"
                        className="flex items-center space-x-2 px-4 py-3 text-red-600 hover:text-swar-primary hover:bg-red-50 rounded-lg transition-all duration-200 font-medium touch-manipulation"
                        onClick={closeMenu}
                      >
                        <span>Sign In</span>
                      </Link>
                      <Link
                        href="/signup"
                        className="bg-gradient-to-r from-swar-primary to-green-700 text-white px-4 py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 text-center font-medium shadow-lg touch-manipulation"
                        onClick={closeMenu}
                      >
                        Sign Up
                      </Link>
                    </>
                  )}
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
