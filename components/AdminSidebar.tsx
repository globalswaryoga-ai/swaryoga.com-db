'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { LayoutDashboard, Users, LogIn, MessageSquare, Gift, X, Calculator, Mail, Home, Calendar, Share2, ArrowLeft, MessageCircle, TrendingUp, Globe, Video, FileText, Send, Radio, Settings } from 'lucide-react';

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({ isOpen = true, onClose = () => {} }: AdminSidebarProps) {
  const router = useRouter();
  const token = useAuth();
  const crm = useCRM({ token });
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Determine super-admin status from stored admin user info.
  // This is consistent with other CRM screens and avoids needing to decode JWT in the browser.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const userStr = localStorage.getItem('admin_user');
    let resolvedUserId = localStorage.getItem('adminUser') || '';
    let legacyPerms: string[] = [];
    let permissionsV2: any = null;
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        resolvedUserId = (u?.userId as string) || resolvedUserId;
        legacyPerms = Array.isArray(u?.permissions) ? u.permissions : [];
        permissionsV2 = u?.permissionsV2 || null;
      } catch {
        // ignore
      }
    }

    const superAdmin =
      resolvedUserId === 'admin' ||
      resolvedUserId === 'admincrm' ||
      legacyPerms.includes('all') ||
      permissionsV2?.isSuperAdmin === true;

    setIsSuperAdmin(superAdmin);
  }, []);

  // Fetch unread message count
  useEffect(() => {
    if (!token) return;

    const fetchUnreadCount = async () => {
      try {
        const result = await crm.fetch('/api/admin/crm/messages/unread-count');
        setUnreadCount(result?.unreadCount || 0);
      } catch (err) {
        console.error('Failed to fetch unread count:', err);
      }
    };

    fetchUnreadCount();

    // Poll every 30 seconds for new messages
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [token, crm]);

  const handleNavClick = () => {
    // Auto-close sidebar on mobile when a link is clicked
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  // Sidebar menu
  // - CRM links should be available for CRM users.
  // - Super-admin should also see the full legacy admin modules (Signup/Signin/Messages/etc).
  const adminModuleItems = isSuperAdmin
    ? [
        {
          icon: LayoutDashboard,
          label: 'Dashboard',
          href: '/admin/dashboard',
          color: 'text-blue-600',
        },
        {
          icon: Users,
          label: 'Signup Data',
          href: '/admin/signup-data',
          color: 'text-green-600',
        },
        {
          icon: LogIn,
          label: 'Signin Data',
          href: '/admin/signin-data',
          color: 'text-purple-600',
        },
        {
          icon: MessageSquare,
          label: 'Contact Messages',
          href: '/admin/contact-messages',
          color: 'text-orange-600',
        },
        {
          icon: Calendar,
          label: 'Workshop Schedules',
          href: '/admin/workshops/schedules',
          color: 'text-teal-600',
        },
        {
          icon: Share2,
          label: 'Social Media',
          href: '/admin/social-media',
          color: 'text-sky-600',
        },
        {
          icon: Share2,
          label: 'Social Setup',
          href: '/admin/social-media-setup',
          color: 'text-indigo-600',
        },
        {
          icon: Calculator,
          label: 'Accounting',
          href: '/admin/accounting',
          color: 'text-amber-600',
        },
        {
          icon: Gift,
          label: 'Offers',
          href: '/admin/offers',
          color: 'text-pink-600',
        },
        {
          icon: Globe,
          label: 'Communities',
          href: '/admin/communities',
          color: 'text-teal-600',
        },
        {
          icon: Video,
          label: 'Recordings & Videos',
          href: '/admin/communities/recordings-videos',
          color: 'text-purple-600',
        },
        {
          icon: Video,
          label: '🎬 Video Library',
          href: '/admin/videos',
          color: 'text-indigo-600',
        },
        {
          icon: Users,
          label: 'Users',
          href: '/admin/users',
          color: 'text-rose-600',
        },
      ]
    : [];

  const crmItems = [
    {
      icon: MessageSquare,
      label: 'CRM Leads',
      href: '/admin/crm/leads',
      color: 'text-emerald-600',
    },
    {
      icon: MessageCircle,
      label: 'Meta Inbox',
      href: '/admin/crm/meta',
      color: 'text-cyan-600',
    },
    {
      icon: LayoutDashboard,
      label: 'Meta Setup',
      href: '/admin/crm/whatsapp-meta',
      color: 'text-indigo-600',
    },
    {
      icon: FileText,
      label: 'Templates',
      href: '/admin/crm/templates',
      color: 'text-orange-600',
    },
    {
      icon: Send,
      label: 'Send Template',
      href: '/admin/crm/send-template',
      color: 'text-blue-600',
    },
    {
      icon: Radio,
      label: 'Broadcast',
      href: '/admin/crm/broadcast',
      color: 'text-pink-600',
    },
    {
      icon: Settings,
      label: 'Lead Assignment',
      href: '/admin/crm/lead-assignment-settings',
      color: 'text-gray-600',
    },
    {
      icon: MessageSquare,
      label: 'Lead Followup',
      href: '/admin/crm/leads-followup',
      color: 'text-violet-600',
    },
    {
      icon: TrendingUp,
      label: 'Investment',
      href: '/admin/crm/investment',
      color: 'text-green-600',
    },
  ];

  const menuItems = [...adminModuleItems, ...crmItems];

  // Meta WhatsApp chat should always be visible in CRM sidebar.
  // Even if Cloud sending isn't enabled, the screen can show setup/status guidance.
  const visibleMenuItems = menuItems;

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
                src="/logo.png"
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
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const showBadge = (item.label === 'WhatsApp Inbox' || item.label === 'Meta Inbox') && unreadCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className="flex items-center space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg hover:bg-gray-800 transition-colors group touch-target text-sm sm:text-base active:scale-95 relative"
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${item.color}`} />
                <span className="font-medium truncate">{item.label}</span>
                {showBadge && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
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
