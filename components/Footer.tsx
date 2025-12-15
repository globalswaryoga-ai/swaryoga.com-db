'use client';

import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary-950 text-white mt-12 sm:mt-16 md:mt-20 border-t-4 border-accent-500 safe-area-left safe-area-right">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 md:gap-10 mb-8 sm:mb-12">
          <div className="col-span-1 sm:col-span-2 lg:col-span-1">
            <h3 className="text-xl sm:text-2xl font-bold mb-4 bg-gradient-eco bg-clip-text text-transparent">🧘 Swar Yoga</h3>
            <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
              Transform your life through authentic yoga teachings and premium wellness products.
            </p>
          </div>

          <div>
            <h4 className="text-base sm:text-lg font-bold mb-4 text-primary-300">Quick Links</h4>
            <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base text-neutral-400">
              <li>
                <Link href="/" className="hover:text-primary-300 transition active:scale-95 touch-target inline-block">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-primary-300 transition active:scale-95 touch-target inline-block">
                  About
                </Link>
              </li>
              <li>
                <Link href="/workshops" className="hover:text-primary-300 transition active:scale-95 touch-target inline-block">
                  Workshops
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-primary-300 transition active:scale-95 touch-target inline-block">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-base sm:text-lg font-bold mb-4 text-primary-300">Account</h4>
            <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base text-neutral-400">
              <li>
                <Link href="/signin" className="hover:text-primary-300 transition active:scale-95 touch-target inline-block">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-primary-300 transition active:scale-95 touch-target inline-block">
                  Sign Up
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-primary-300 transition active:scale-95 touch-target inline-block">
                  My Cart
                </Link>
              </li>
              <li>
                <Link href="/profile" className="hover:text-primary-300 transition active:scale-95 touch-target inline-block">
                  Profile
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-base sm:text-lg font-bold mb-4 text-primary-300">Tools</h4>
            <div className="flex flex-col gap-2 sm:gap-3">
              <Link href="/calendar" className="text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg flex items-center space-x-2 bg-accent-600 hover:bg-accent-700 transition shadow-eco text-xs sm:text-sm font-medium touch-target text-center justify-center sm:justify-start">
                <span>📅</span>
                <span>Calendar</span>
              </Link>
              <Link href="/life-planner" className="text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 transition shadow-eco text-xs sm:text-sm font-medium touch-target text-center justify-center sm:justify-start">
                <span>🗓️</span>
                <span>Life Planner</span>
              </Link>
              <Link href="/admin/login" className="text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg flex items-center space-x-2 bg-secondary-600 hover:bg-secondary-700 transition shadow-eco text-xs sm:text-sm font-medium touch-target text-center justify-center sm:justify-start">
                <span>🔐</span>
                <span>Admin</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-800 pt-6 sm:pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-neutral-400 text-xs sm:text-sm gap-4 sm:gap-6">
            <p className="text-center md:text-left">&copy; {currentYear} Swar Yoga. All rights reserved.</p>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 md:gap-6">
              <a href="#" className="hover:text-primary-300 transition active:scale-95 touch-target">
                Privacy Policy
              </a>
              <span className="hidden sm:inline text-neutral-600">•</span>
              <a href="#" className="hover:text-primary-300 transition active:scale-95 touch-target">
                Terms
              </a>
              <span className="hidden sm:inline text-neutral-600">•</span>
              <a href="#" className="hover:text-primary-300 transition active:scale-95 touch-target">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
