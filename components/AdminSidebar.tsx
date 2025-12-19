'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, Users, LogIn, MessageSquare, Gift, X, Calculator, Mail, Home, Calendar, Share2, ArrowLeft } from 'lucide-react';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const router = useRouter();

  const handleNavClick = () => {
    // Auto-close sidebar on mobile when a link is clicked
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const menuItems = [
    {
      icon: Home,
      label: 'Home',
      href: '/',
      color: 'text-red-500'
    },
    {
      icon: LayoutDashboard,
      label: 'Dashboard',
      href: '/admin/dashboard',
      color: 'text-blue-600'
    },
    {
      icon: Users,
      label: 'Signup Data',
      href: '/admin/signup-data',
      color: 'text-swar-primary'
    },
    {
      icon: LogIn,
      label: 'Signin Data',
      href: '/admin/signin-data',
      color: 'text-purple-600'
    },
    {
      icon: MessageSquare,
      label: 'Contact Messages',
      href: '/admin/contact-messages',
      color: 'text-orange-600'
    },
    {
      icon: Mail,
      label: 'Workshop Enquiries',
      href: '/admin/enquiries',
      color: 'text-pink-600'
    },
    {
      icon: Calendar,
      label: 'Workshop Dates',
      href: '/admin/workshops/schedules',
      color: 'text-emerald-500'
    },
    {
      icon: Gift,
      label: 'Send Offers',
      href: '/admin/offers',
      color: 'text-red-600'
    },
    {
      icon: Calculator,
      label: 'Accounting',
      href: '/admin/accounting',
      color: 'text-indigo-600'
    },
    {
      icon: Share2,
      label: 'Social Media',
      href: '/admin/social-media',
      color: 'text-emerald-500'
    },
    {
      icon: Share2,
      label: 'Connect Accounts',
      href: '/admin/social-media-setup',
      color: 'text-cyan-500'
    }
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden transition-opacity"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 max-w-[90vw] bg-gray-900 text-white transform transition-transform duration-300 ease-in-out flex flex-col safe-area-left ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Sidebar Header with Logo */}
        <div className="p-4 sm:p-6 border-b border-gray-800 space-y-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <img
                src="https://i.postimg.cc/xTPRSY4X/swar_yoga_new_logo.png"
                alt="Swar Yoga Logo"
                className="w-10 h-10 rounded-lg flex-shrink-0"
              />
              <h2 className="font-bold text-base sm:text-lg truncate">Swar Yoga</h2>
            </div>
            <button
              onClick={onClose}
              className="md:hidden p-1 rounded-lg hover:bg-gray-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Navigation Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => {
                router.push('/');
                onClose();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-swar-primary hover:bg-swar-primary-dark rounded-lg text-white text-sm font-medium transition"
              title="Go to Home"
            >
              <Home className="h-4 w-4" />
              <span>Home</span>
            </button>
            <button
              onClick={() => {
                router.back();
                onClose();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white text-sm font-medium transition"
              title="Go Back"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 sm:p-6 space-y-1 sm:space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className="flex items-center space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg hover:bg-gray-800 transition-colors group touch-target text-sm sm:text-base active:scale-95"
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${item.color}`} />
                <span className="font-medium truncate">{item.label}</span>
              </Link>
            );
          })}
          
          {/* Home link for mobile */}
          <div className="pt-2 border-t border-gray-800 mt-2">
            <Link
              href="/"
              onClick={handleNavClick}
              className="flex items-center space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg hover:bg-gray-800 transition-colors group touch-target text-sm sm:text-base active:scale-95 text-gray-300"
            >
              <Home className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium truncate">Back to Home</span>
            </Link>
          </div>
        </nav>

        {/* Footer Info */}
        <div className="p-4 sm:p-6 border-t border-gray-800 flex-shrink-0 safe-area-bottom">
          <div className="text-xs text-swar-text-secondary">
            <p className="font-semibold text-gray-300 mb-2">Admin Panel v1.0</p>
            <p className="line-clamp-2">Manage all user data and site content</p>
          </div>
        </div>
      </aside>
    </>
  );
}
