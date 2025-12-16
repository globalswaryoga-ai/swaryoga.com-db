'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X, ShoppingCart, User, LogOut } from 'lucide-react';
import { usePathname } from 'next/navigation';

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
    { name: 'Workshops', href: '/workshops' },
    { name: 'Resort', href: '/resort' },
    { name: 'Blog', href: '/blog' },
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
    const cartData = localStorage.getItem('cart');
    if (cartData) {
      try {
        const cart = JSON.parse(cartData);
        setCartCount(Array.isArray(cart) ? cart.length : 0);
      } catch (err) {
        setCartCount(0);
      }
    }
  }, []);

  const isActive = (path: string) => pathname === path;

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setUserDisplayName('');
    setIsMenuOpen(false);
    window.location.href = '/';
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      {/* Top Bar */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white py-2 px-4 hidden lg:block">
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
            {/* Logo - Meta-like Geometric Design */}
            <Link href="/" className="flex items-center space-x-3 group hover:opacity-80 transition-opacity">
              {/* Geometric Infinity + Breath Wave Symbol */}
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center">
                <svg viewBox="0 0 64 64" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  {/* Deep Green Background Circle */}
                  <circle cx="32" cy="32" r="32" fill="#2A5654" opacity="0.1" />
                  
                  {/* Infinity Symbol (∞) */}
                  <path 
                    d="M 16 32 Q 16 20 24 20 Q 32 20 32 28 Q 32 36 24 36 Q 16 36 16 32 M 48 32 Q 48 20 40 20 Q 32 20 32 28 Q 32 36 40 36 Q 48 36 48 32" 
                    stroke="#2A5654" 
                    strokeWidth="2.5" 
                    fill="none" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                  
                  {/* Breath Wave - Saffron Accent */}
                  <path 
                    d="M 14 44 Q 16 42 18 44 T 22 44 T 26 44 T 30 44 T 34 44 T 38 44 T 42 44 T 46 44 T 50 44" 
                    stroke="#FF9F43" 
                    strokeWidth="2" 
                    fill="none" 
                    strokeLinecap="round"
                  />
                  
                  {/* Second Wave for depth */}
                  <path 
                    d="M 14 48 Q 16 46 18 48 T 22 48 T 26 48 T 30 48 T 34 48 T 38 48 T 42 48 T 46 48 T 50 48" 
                    stroke="#2A5654" 
                    strokeWidth="1.5" 
                    fill="none" 
                    opacity="0.6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              
              {/* Text - Meta-like Geometric Font */}
              <div className="flex flex-col tracking-tight">
                <span className="text-xl sm:text-2xl font-bold text-gray-900" style={{
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                  letterSpacing: "-0.02em",
                  fontWeight: 700
                }}>
                  SWAR YOGA
                </span>
                <div className="text-xs sm:text-sm font-medium text-gray-600 -mt-0.5 hidden sm:block" style={{
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  letterSpacing: "0.01em",
                  color: "#2A5654"
                }}>The Science of Breath</div>
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
                      ? 'text-green-600 bg-green-50' 
                      : 'text-gray-700 hover:text-green-600 hover:bg-green-50'
                  }`}
                >
                  {item.name}
                  {isActive(item.href) && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-green-600 rounded-full"></div>
                  )}
                  <div className="absolute inset-0 rounded-lg bg-green-600/10 opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>
                </Link>
              ))}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Cart */}
              <Link
                href="/cart"
                className="relative p-2 text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 group touch-manipulation"
              >
                <ShoppingCart className="h-6 w-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {cartCount}
                  </span>
                )}
                <div className="absolute inset-0 rounded-lg bg-green-600/10 opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>
              </Link>

              {/* User is logged in */}
              {user ? (
                <div className="hidden sm:flex items-center space-x-2">
                  <Link
                    href="/profile"
                    className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <User className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-700">{userDisplayName}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-all duration-200 font-medium group relative"
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
                    className="hidden sm:flex items-center space-x-2 text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-all duration-200 font-medium group relative"
                  >
                    <span>Sign In</span>
                    <div className="absolute inset-0 rounded-lg bg-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>
                  </Link>

                  {/* Sign Up */}
                  <Link
                    href="/signup"
                    className="hidden sm:block bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
                  >
                    Sign Up
                  </Link>
                </>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden p-2 text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="lg:hidden mt-4 pb-4 border-t border-gray-200 animate-in slide-in-from-top duration-200">
              <nav className="flex flex-col space-y-2 mt-4">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 touch-manipulation ${
                      isActive(item.href) 
                        ? 'text-green-600 bg-green-50 border-l-4 border-green-600' 
                        : 'text-gray-700 hover:text-green-600 hover:bg-green-50'
                    }`}
                    onClick={closeMenu}
                  >
                    {item.name}
                  </Link>
                ))}
                
                {/* Mobile Actions */}
                <div className="flex flex-col space-y-2 pt-4 border-t border-gray-200">
                  <Link
                    href="/cart"
                    className="flex items-center space-x-2 px-4 py-3 text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 touch-manipulation"
                    onClick={closeMenu}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    <span>Cart {cartCount > 0 && `(${cartCount})`}</span>
                  </Link>
                  
                  {user ? (
                    <>
                      <Link
                        href="/profile"
                        className="flex items-center space-x-2 px-4 py-3 bg-green-50 text-green-700 rounded-lg touch-manipulation"
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
                        className="flex items-center space-x-2 px-4 py-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 font-medium touch-manipulation"
                      >
                        <LogOut className="h-5 w-5" />
                        <span>Logout</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/signin"
                        className="flex items-center space-x-2 px-4 py-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 font-medium touch-manipulation"
                        onClick={closeMenu}
                      >
                        <span>Sign In</span>
                      </Link>
                      <Link
                        href="/signup"
                        className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 text-center font-medium shadow-lg touch-manipulation"
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
