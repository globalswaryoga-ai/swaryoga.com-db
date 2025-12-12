'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import HeaderReminders from './HeaderReminders';
import { Reminder } from '@/lib/types/lifePlanner';
import { initializeAutoLogin, shouldPreventLogout } from '@/lib/autoLoginManager';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [preventLogout, setPreventLogout] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Initialize auto-login
    initializeAutoLogin();

    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setPreventLogout(shouldPreventLogout());
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
        visions.forEach((vision: any) => {
          if (vision.reminders && Array.isArray(vision.reminders)) {
            allReminders.push(...vision.reminders);
          }
        });
        setReminders(allReminders);
      } catch (err) {
        console.log('Error loading reminders:', err);
      }
    }
  }, []);

  const handleLogout = () => {
    // Prevent logout for auto-login user
    if (preventLogout) {
      alert('This user cannot be logged out.');
      return;
    }

    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    router.push('/');
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50 border-b-2 border-primary-100">
      <div className="container mx-auto px-4 sm:px-6 flex justify-between items-center py-3 sm:py-4">
        <Link href="/" className="text-2xl sm:text-3xl font-bold bg-gradient-eco bg-clip-text text-transparent hover:opacity-80 transition whitespace-nowrap">
          🧘 Swar Yoga
        </Link>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden flex flex-col space-y-1 p-2 -mr-2"
          aria-label="Toggle menu"
        >
          <span className={`block w-6 h-0.5 bg-primary-700 transition-transform ${isOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
          <span className={`block w-6 h-0.5 bg-primary-700 transition-opacity ${isOpen ? 'opacity-0' : ''}`}></span>
          <span className={`block w-6 h-0.5 bg-primary-700 transition-transform ${isOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
        </button>

        {/* Desktop Menu */}
        <div className="hidden md:flex space-x-3 lg:space-x-8 items-center">
          <Link href="/" className="text-neutral-700 hover:text-primary-600 transition font-medium text-sm lg:text-base">
            Home
          </Link>
          <Link href="/about" className="text-neutral-700 hover:text-primary-600 transition font-medium text-sm lg:text-base">
            About
          </Link>
          <Link href="/resort" className="text-neutral-700 hover:text-primary-600 transition font-medium text-sm lg:text-base">
            Resort
          </Link>
          <Link href="/blog" className="text-neutral-700 hover:text-primary-600 transition font-medium text-sm lg:text-base">
            Journal
          </Link>
          <Link href="/workshops" className="text-neutral-700 hover:text-primary-600 transition font-medium text-sm lg:text-base">
            Workshops
          </Link>
          <Link href="/contact" className="text-neutral-700 hover:text-primary-600 transition font-medium text-sm lg:text-base">
            Contact
          </Link>
          <Link href="/cart" className="text-neutral-700 hover:text-primary-600 transition font-medium text-sm lg:text-base">
            🛒 Cart
          </Link>
          
          {/* Header Reminders */}
          <HeaderReminders reminders={reminders} />
          
          {user ? (
            <div className="flex items-center gap-2 lg:gap-4 ml-2 lg:ml-4 border-l border-gray-300 pl-2 lg:pl-4">
              <Link href="/profile" className="text-neutral-700 hover:text-primary-600 transition font-medium text-sm lg:text-base">
                👤 <span className="hidden lg:inline">{user.name}</span>
              </Link>
              {/* Hide logout button for auto-login user */}
              {!preventLogout && (
                <button
                  onClick={handleLogout}
                  className="bg-red-600 text-white px-3 lg:px-6 py-2 rounded-lg hover:bg-red-700 transition shadow-eco font-medium text-sm lg:text-base whitespace-nowrap"
                >
                  Logout
                </button>
              )}
            </div>
          ) : (
            <Link href="/signin" className="bg-primary-600 text-white px-3 lg:px-6 py-2 rounded-lg hover:bg-primary-700 transition shadow-eco font-medium text-sm lg:text-base whitespace-nowrap ml-2 lg:ml-4">
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 bg-white shadow-lg md:hidden flex flex-col space-y-3 p-4 border-t-2 border-primary-100 safe-area">
            <Link href="/" className="text-neutral-700 hover:text-primary-600 font-medium py-2">
              🏠 Home
            </Link>
            <Link href="/about" className="text-neutral-700 hover:text-primary-600 font-medium py-2">
              ℹ️ About
            </Link>
            <Link href="/resort" className="text-neutral-700 hover:text-primary-600 font-medium py-2">
              🏖️ Resort
            </Link>
            <Link href="/blog" className="text-neutral-700 hover:text-primary-600 font-medium py-2">
              📘 Journal
            </Link>
            <Link href="/workshops" className="text-neutral-700 hover:text-primary-600 font-medium py-2">
              📚 Workshops
            </Link>
            <Link href="/contact" className="text-neutral-700 hover:text-primary-600 font-medium py-2">
              📞 Contact
            </Link>
            <Link href="/cart" className="text-neutral-700 hover:text-primary-600 font-medium py-2">
              🛒 Cart
            </Link>
            <hr className="border-gray-200 my-2" />
            {user ? (
              <div className="flex flex-col gap-3">
                <Link href="/profile" className="text-neutral-700 hover:text-primary-600 font-medium py-2">
                  👤 Profile ({user.name})
                </Link>
                {/* Hide logout button for auto-login user */}
                {!preventLogout && (
                  <button
                    onClick={handleLogout}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-center hover:bg-red-700 transition font-medium"
                  >
                    Logout
                  </button>
                )}
              </div>
            ) : (
              <Link href="/signin" className="bg-primary-600 text-white px-4 py-2 rounded-lg text-center hover:bg-primary-700 transition font-medium">
                Sign In
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
