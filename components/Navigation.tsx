'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import HeaderReminders from './HeaderReminders';
import { Reminder } from '@/lib/types/lifePlanner';
import { initializeAutoLogin } from '@/lib/autoLoginManager';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    // Initialize auto-login
    initializeAutoLogin();

    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.log('Error parsing user data:', err);
      }
    }

    // Load reminders from localStorage
    const storedReminders = localStorage.getItem('swar-life-planner-visions');
    if (storedReminders) {
      try {
        const visions = JSON.parse(storedReminders);
        const allReminders: Reminder[] = [];
        // Ensure visions is an array before calling forEach
        if (Array.isArray(visions)) {
          visions.forEach((vision: any) => {
            if (vision.reminders && Array.isArray(vision.reminders)) {
              allReminders.push(...vision.reminders);
            }
          });
        }
        setReminders(allReminders);
      } catch (err) {
        console.log('Error loading reminders:', err);
      }
    }
  }, []);

  const closeMenu = () => setIsOpen(false);

  const menuLinkClass = "block px-4 py-3 rounded-lg text-neutral-700 hover:text-primary-600 hover:bg-primary-50 transition font-medium text-base active:scale-95";

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50 border-b-2 border-primary-100 safe-area-left safe-area-right">
      <div className="container mx-auto px-4 sm:px-6 flex justify-between items-center py-2 sm:py-3 min-h-[64px]">
        <Link 
          href="/" 
          className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-eco bg-clip-text text-transparent hover:opacity-80 transition whitespace-nowrap flex-shrink-0"
          onClick={closeMenu}
        >
          🧘 Swar Yoga
        </Link>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden flex flex-col justify-center w-10 h-10 p-1 -mr-2 touch-target"
          aria-label="Toggle menu"
          aria-expanded={isOpen}
        >
          <span className={`block w-6 h-0.5 bg-primary-700 transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-2.5' : ''}`}></span>
          <span className={`block w-6 h-0.5 bg-primary-700 transition-all duration-300 my-1.5 ${isOpen ? 'opacity-0' : ''}`}></span>
          <span className={`block w-6 h-0.5 bg-primary-700 transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-2.5' : ''}`}></span>
        </button>

        {/* Desktop Menu */}
        <div className="hidden md:flex space-x-2 lg:space-x-6 items-center flex-wrap justify-end">
          <Link href="/" className="text-neutral-700 hover:text-primary-600 transition font-medium text-sm lg:text-base py-2 px-2">
            Home
          </Link>
          <Link href="/about" className="text-neutral-700 hover:text-primary-600 transition font-medium text-sm lg:text-base py-2 px-2">
            About
          </Link>
          <Link href="/resort" className="text-neutral-700 hover:text-primary-600 transition font-medium text-sm lg:text-base py-2 px-2">
            Resort
          </Link>
          <Link href="/blog" className="text-neutral-700 hover:text-primary-600 transition font-medium text-sm lg:text-base py-2 px-2">
            Journal
          </Link>
          <Link href="/workshops" className="text-neutral-700 hover:text-primary-600 transition font-medium text-sm lg:text-base py-2 px-2">
            Workshops
          </Link>
          <Link href="/contact" className="text-neutral-700 hover:text-primary-600 transition font-medium text-sm lg:text-base py-2 px-2">
            Contact
          </Link>
          <Link href="/cart" className="text-neutral-700 hover:text-primary-600 transition font-medium text-sm lg:text-base py-2 px-2 relative">
            🛒 <span className="hidden lg:inline">Cart</span>
          </Link>
          
          {/* Header Reminders */}
          <div className="hidden lg:block">
            <HeaderReminders reminders={reminders} />
          </div>
          
          {user ? (
            <div className="flex items-center gap-2 lg:gap-3 ml-2 lg:ml-4 border-l border-gray-300 pl-2 lg:pl-4">
              <Link href="/profile" className="text-neutral-700 hover:text-primary-600 transition font-medium text-sm lg:text-base py-2 px-2 touch-target">
                👤 <span className="hidden lg:inline">{user.name.split(' ')[0]}</span>
              </Link>
            </div>
          ) : (
            <Link href="/signin" className="bg-primary-600 text-white px-3 lg:px-5 py-2 rounded-lg hover:bg-primary-700 transition shadow-eco font-medium text-sm lg:text-base whitespace-nowrap ml-2 lg:ml-4 touch-target min-h-10">
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 bg-white shadow-xl md:hidden border-t-2 border-primary-100 safe-area-left safe-area-right max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col space-y-1 p-4">
              <Link href="/" className={menuLinkClass} onClick={closeMenu}>
                🏠 Home
              </Link>
              <Link href="/about" className={menuLinkClass} onClick={closeMenu}>
                ℹ️ About
              </Link>
              <Link href="/resort" className={menuLinkClass} onClick={closeMenu}>
                🏖️ Resort
              </Link>
              <Link href="/blog" className={menuLinkClass} onClick={closeMenu}>
                📘 Journal
              </Link>
              <Link href="/workshops" className={menuLinkClass} onClick={closeMenu}>
                📚 Workshops
              </Link>
              <Link href="/calendar" className={menuLinkClass} onClick={closeMenu}>
                📅 Calendar
              </Link>
              <Link href="/contact" className={menuLinkClass} onClick={closeMenu}>
                📞 Contact
              </Link>
              <Link href="/cart" className={menuLinkClass} onClick={closeMenu}>
                🛒 Cart
              </Link>
              
              <hr className="border-gray-200 my-2" />
              
              {/* Mobile Reminders */}
              <div className="md:hidden">
                <HeaderReminders reminders={reminders} />
              </div>
              
              {user ? (
                <div className="flex flex-col gap-2">
                  <Link href="/profile" className={menuLinkClass} onClick={closeMenu}>
                    👤 Profile ({user.name.split(' ')[0]})
                  </Link>
                  <Link href="/life-planner/dashboard" className={menuLinkClass} onClick={closeMenu}>
                    🎯 Life Planner
                  </Link>
                </div>
              ) : (
                <Link href="/signin" className="w-full bg-primary-600 text-white px-4 py-3 rounded-lg text-center hover:bg-primary-700 transition font-medium touch-target min-h-12 block" onClick={closeMenu}>
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
