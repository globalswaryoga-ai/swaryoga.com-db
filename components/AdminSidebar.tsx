'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  Users,
  LogIn,
  MessageSquare,
  X,
  Home,
  Calendar,
  Share2,
  ArrowLeft,
  MessageCircle,
  TrendingUp,
  Video,
  FileText,
  Radio,
  BarChart3,
  ChevronDown,
  DollarSign,
  Globe,
  Settings,
  ShoppingBag,
  Phone,
  Bot,
  Tag,
  Activity,
  Shield,
  Mail,
  Building2,
  Filter,
} from 'lucide-react';

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

// Dropdown Menu Component
function HeaderDropdown({
  label,
  icon: Icon,
  items,
  isOpen,
  onToggle,
  onClose,
}: {
  label: string;
  icon: React.ElementType;
  items: { label: string; href: string; icon: React.ElementType }[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={onToggle}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          isOpen ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-52 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1">
          {items.map((item) => {
            const ItemIcon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              >
                <ItemIcon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminSidebar({ isOpen = true, onClose = () => {} }: AdminSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Determine super-admin status
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

    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 2;

    const fetchUnreadCount = async () => {
      if (!isMounted || retryCount >= maxRetries) return;

      try {
        const response = await window.fetch('/api/admin/crm/messages/unread-count', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          retryCount++;
          return;
        }

        const result = await response.json();
        if (isMounted) {
          setUnreadCount(result?.unreadCount || 0);
          retryCount = 0;
        }
      } catch {
        retryCount++;
      }
    };

    const initialTimeout = setTimeout(fetchUnreadCount, 1000);
    const interval = setInterval(fetchUnreadCount, 60000);

    return () => {
      isMounted = false;
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [token]);

  const handleNavClick = () => {
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  // Header dropdown items
  const userDataItems = [
    { label: 'Signup Data', href: '/admin/signup-data', icon: Users },
    { label: 'Signin Data', href: '/admin/signin-data', icon: LogIn },
    { label: 'Contact Messages', href: '/admin/contact-messages', icon: MessageSquare },
    { label: 'Workshop Dates', href: '/admin/workshops/schedules', icon: Calendar },
    { label: 'Users', href: '/admin/users', icon: Users },
    { label: 'Enquiries', href: '/admin/enquiries', icon: MessageSquare },
  ];

  const socialMediaItems = [
    { label: 'Social Media', href: '/admin/social-media', icon: Share2 },
    { label: 'Social Setup', href: '/admin/social-media-setup', icon: Settings },
    { label: 'Video Library', href: '/admin/videos', icon: Video },
    { label: 'Communities', href: '/admin/communities', icon: Globe },
    { label: 'Recordings & Videos', href: '/admin/communities/recordings-videos', icon: Video },
  ];

  const moreItems = [
    { label: 'Accounting', href: '/admin/accounting', icon: DollarSign },
    { label: 'Offers', href: '/admin/offers', icon: Tag },
    { label: 'Youth Program', href: '/admin/youth-program', icon: Users },
    { label: 'Investment', href: '/admin/crm/investment', icon: TrendingUp },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  // Main sidebar menu items
  const sidebarItems = [
    {
      icon: LayoutDashboard,
      label: 'Dashboard',
      href: '/admin/crm',
      color: 'text-blue-500',
    },
    {
      icon: Users,
      label: 'Leads',
      href: '/admin/crm/leads',
      color: 'text-emerald-500',
    },
    {
      icon: Phone,
      label: 'Leads Followup',
      href: '/admin/crm/leads-followup',
      color: 'text-violet-500',
    },
    {
      icon: ShoppingBag,
      label: 'Sales',
      href: '/admin/crm/sales',
      color: 'text-green-500',
    },
    {
      icon: MessageCircle,
      label: 'Meta Inbox',
      href: '/admin/crm/meta',
      color: 'text-cyan-500',
      badge: unreadCount,
    },
    {
      icon: TrendingUp,
      label: 'Meta Report',
      href: '/admin/crm/meta-dashboard',
      color: 'text-blue-400',
    },
    {
      icon: Filter,
      label: 'Sales Funnel',
      href: '/admin/crm/funnel',
      color: 'text-rose-500',
    },
    {
      icon: Users,
      label: 'Manage Pipeline',
      href: '/admin/crm/funnel/manage',
      color: 'text-indigo-500',
    },
    {
      icon: Phone,
      label: 'Call Workflows',
      href: '/admin/crm/calls',
      color: 'text-emerald-500',
    },
    {
      icon: Bot,
      label: 'Call Scripts',
      href: '/admin/crm/calls/templates',
      color: 'text-orange-500',
    },
    {
      icon: BarChart3,
      label: 'Analytics',
      href: '/admin/crm/analytics',
      color: 'text-purple-500',
    },
    {
      icon: FileText,
      label: 'Templates',
      href: '/admin/crm/templates',
      color: 'text-orange-500',
    },
    {
      icon: Radio,
      label: 'Broadcast',
      href: '/admin/crm/broadcast',
      color: 'text-pink-500',
    },
    {
      icon: Mail,
      label: 'Email',
      href: '/admin/crm/email',
      color: 'text-blue-500',
    },
    {
      icon: Globe,
      label: 'Community',
      href: '/admin/crm/community',
      color: 'text-teal-500',
    },
    {
      icon: Video,
      label: 'Recordings Mgmt',
      href: '/admin/crm/recording-management',
      color: 'text-indigo-500',
    },
    {
      icon: Building2,
      label: 'Tally Prime',
      href: '/admin/crm/tally',
      color: 'text-yellow-500',
    },
  ];

  // Additional CRM items in a secondary section
  const toolsItems = [
    {
      icon: MessageSquare,
      label: 'Messages',
      href: '/admin/crm/messages',
      color: 'text-indigo-500',
    },
    {
      icon: Bot,
      label: 'Chatbots',
      href: '/admin/crm/chatbots',
      color: 'text-emerald-400',
    },
    {
      icon: Tag,
      label: 'Labels',
      href: '/admin/crm/labels',
      color: 'text-amber-500',
    },
    {
      icon: Settings,
      label: 'WhatsApp Settings',
      href: '/admin/crm/whatsapp/settings',
      color: 'text-gray-400',
    },
  ];

  // Super admin only items
  const superAdminItems = [
    {
      icon: Shield,
      label: 'Permissions',
      href: '/admin/crm/permissions',
      color: 'text-red-500',
    },
    {
      icon: Activity,
      label: 'Admin Activity',
      href: '/admin/crm/admin-activity',
      color: 'text-yellow-500',
    },
  ];

  const isActive = (href: string) => pathname === href;

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
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <img src="/logo.png" alt="Swar Yoga" className="w-9 h-9 rounded-lg flex-shrink-0" />
              <h2 className="font-bold text-lg truncate text-white">Swar Yoga</h2>
            </div>
            <button
              onClick={onClose}
              className="md:hidden p-1 rounded-lg hover:bg-gray-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Header Dropdowns */}
          {isSuperAdmin && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              <HeaderDropdown
                label="User Data"
                icon={Users}
                items={userDataItems}
                isOpen={openDropdown === 'userData'}
                onToggle={() => setOpenDropdown(openDropdown === 'userData' ? null : 'userData')}
                onClose={() => setOpenDropdown(null)}
              />
              <HeaderDropdown
                label="Social"
                icon={Share2}
                items={socialMediaItems}
                isOpen={openDropdown === 'social'}
                onToggle={() => setOpenDropdown(openDropdown === 'social' ? null : 'social')}
                onClose={() => setOpenDropdown(null)}
              />
              <HeaderDropdown
                label="More"
                icon={Settings}
                items={moreItems}
                isOpen={openDropdown === 'more'}
                onToggle={() => setOpenDropdown(openDropdown === 'more' ? null : 'more')}
                onClose={() => setOpenDropdown(null)}
              />
            </div>
          )}

          {/* Quick Navigation */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                router.push('/');
                onClose();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-swar-primary hover:bg-swar-primary-dark rounded-lg text-white text-sm font-medium transition"
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
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
            CRM
          </p>
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  active
                    ? 'bg-swar-primary/20 border-l-3 border-swar-primary'
                    : 'hover:bg-gray-800'
                }`}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-swar-primary' : item.color}`} />
                <span className={`font-medium text-sm ${active ? 'text-white' : 'text-gray-300'}`}>
                  {item.label}
                </span>
                {item.badge && item.badge > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Tools Items */}
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-3 pt-4 pb-2">
            Tools
          </p>
          {toolsItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  active
                    ? 'bg-swar-primary/20 border-l-3 border-swar-primary'
                    : 'hover:bg-gray-800'
                }`}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-swar-primary' : item.color}`} />
                <span className={`font-medium text-sm ${active ? 'text-white' : 'text-gray-300'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Super Admin Section */}
          {isSuperAdmin && (
            <>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-3 pt-4 pb-2">
                Admin
              </p>
              {superAdminItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleNavClick}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      active
                        ? 'bg-swar-primary/20 border-l-3 border-swar-primary'
                        : 'hover:bg-gray-800'
                    }`}
                  >
                    <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-swar-primary' : item.color}`} />
                    <span className={`font-medium text-sm ${active ? 'text-white' : 'text-gray-300'}`}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 flex-shrink-0">
          <p className="text-xs text-gray-500">Admin Panel v2.0</p>
        </div>
      </aside>
    </>
  );
}
