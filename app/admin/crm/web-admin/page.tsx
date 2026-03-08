'use client';
import { getLoginPath } from '@/hooks/useAuth';
import { jwtDecode } from 'jwt-decode';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Monitor,
  Users,
  LogIn,
  MessageSquare,
  Calendar,
  Share2,
  Video,
  Globe,
  Settings,
  Tag,
  DollarSign,
  FileText,
  Shield,
  ArrowRight,
  Filter,
  TrendingUp,
  BarChart3,
  ShoppingBag,
  Link2,
  Trash2,
  Sliders,
  Smartphone,
  BookOpen,
  Zap,
  Image,
  Bot,
  Calculator,
  Wrench,
  SmartphoneNfc,
  AlertTriangle,
} from 'lucide-react';

type TabKey = 'users' | 'sales' | 'social' | 'tally' | 'tools';

interface PageCard {
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  color: string;
}

const tabConfig: Record<TabKey, { label: string; icon: React.ElementType; pages: PageCard[] }> = {
  users: {
    label: 'Users',
    icon: Users,
    pages: [
      { label: 'Signup Data', description: 'Registration data and form submissions', href: '/admin/signup-data', icon: Users, color: 'bg-blue-500' },
      { label: 'Signin Data', description: 'Login history and authentication records', href: '/admin/signin-data', icon: LogIn, color: 'bg-blue-600' },
      { label: 'Contact Messages', description: 'Messages from the contact form', href: '/admin/contact-messages', icon: MessageSquare, color: 'bg-indigo-500' },
      { label: 'Website Users', description: 'View all registered website users', href: '/admin/users', icon: Users, color: 'bg-indigo-600' },
      { label: 'Enquiries', description: 'Service and workshop enquiries', href: '/admin/enquiries', icon: MessageSquare, color: 'bg-violet-500' },
      { label: 'Admin Users', description: 'CRM admin user management', href: '/admin/crm/users', icon: Shield, color: 'bg-violet-600' },
      { label: 'Workshop Dates', description: 'Manage workshop schedules and timings', href: '/admin/workshops/schedules', icon: Calendar, color: 'bg-purple-500' },
    ],
  },
  sales: {
    label: 'Sales',
    icon: DollarSign,
    pages: [
      { label: 'Leads', description: 'Manage all leads and prospects', href: '/admin/crm/leads', icon: Users, color: 'bg-green-500' },
      { label: 'Follow-up', description: 'Lead follow-up tracking', href: '/admin/crm/leads-followup', icon: Users, color: 'bg-green-600' },
      { label: 'Funnel', description: 'Sales funnel stages and pipeline', href: '/admin/crm/funnel', icon: Filter, color: 'bg-emerald-500' },
      { label: 'Funnel Manage', description: 'Manage funnel stages and settings', href: '/admin/crm/funnel/manage', icon: Sliders, color: 'bg-emerald-600' },
      { label: 'Labels', description: 'Manage lead labels and categories', href: '/admin/crm/labels', icon: Tag, color: 'bg-teal-500' },
      { label: 'Form Links', description: 'Lead capture form links', href: '/admin/crm/form-links', icon: Link2, color: 'bg-teal-600' },
      { label: 'Lead Assignment', description: 'Configure lead assignment rules', href: '/admin/crm/lead-assignment-settings', icon: Settings, color: 'bg-cyan-500' },
      { label: 'Deleted Leads', description: 'View and restore deleted leads', href: '/admin/crm/leads/deleted', icon: Trash2, color: 'bg-red-500' },
      { label: 'Orders', description: 'Order maintenance and tracking', href: '/admin/crm/order-maintenance', icon: ShoppingBag, color: 'bg-orange-500' },
      { label: 'Investment', description: 'Investment tracking', href: '/admin/crm/investment', icon: TrendingUp, color: 'bg-amber-500' },
      { label: 'Investment Dashboard', description: 'Investment analytics overview', href: '/admin/crm/investment-dashboard', icon: BarChart3, color: 'bg-amber-600' },
    ],
  },
  social: {
    label: 'Social',
    icon: Share2,
    pages: [
      { label: 'Social Media', description: 'Social media accounts and posts', href: '/admin/social-media', icon: Share2, color: 'bg-pink-500' },
      { label: 'Social Setup', description: 'Configure social media integrations', href: '/admin/social-media-setup', icon: Settings, color: 'bg-pink-600' },
      { label: 'Video Library', description: 'Manage video content and playlists', href: '/admin/videos', icon: Video, color: 'bg-red-500' },
      { label: 'Communities', description: 'Community management and members', href: '/admin/communities', icon: Globe, color: 'bg-teal-500' },
      { label: 'Community CRM', description: 'CRM community management', href: '/admin/crm/community', icon: Globe, color: 'bg-teal-600' },
      { label: 'Community Moderation', description: 'Content moderation tools', href: '/admin/crm/community-moderation', icon: Shield, color: 'bg-cyan-500' },
      { label: 'Recordings & Videos', description: 'Community recordings and videos', href: '/admin/communities/recordings-videos', icon: Video, color: 'bg-rose-500' },
      { label: 'Recording Mgmt', description: 'Recording management dashboard', href: '/admin/crm/recording-management', icon: Video, color: 'bg-rose-600' },
      { label: 'Zoom Analytics', description: 'Zoom meeting analytics', href: '/admin/crm/zoom-analytics', icon: Video, color: 'bg-blue-500' },
    ],
  },
  tally: {
    label: 'Tally',
    icon: Calculator,
    pages: [
      { label: 'Tally', description: 'Tally integration and management', href: '/admin/crm/tally', icon: Calculator, color: 'bg-yellow-500' },
      { label: 'Accounting', description: 'Financial records and accounting', href: '/admin/accounting', icon: DollarSign, color: 'bg-yellow-600' },
    ],
  },
  tools: {
    label: 'Tools',
    icon: Wrench,
    pages: [
      { label: 'Offers', description: 'Manage promotional offers', href: '/admin/offers', icon: Tag, color: 'bg-orange-500' },
      { label: 'Devices', description: 'Device management', href: '/admin/crm/devices', icon: Smartphone, color: 'bg-slate-500' },
      { label: 'Knowledge Base', description: 'AI knowledge base management', href: '/admin/crm/knowledge-base', icon: BookOpen, color: 'bg-indigo-500' },
      { label: 'AI Agents', description: 'Configure AI agents', href: '/admin/crm/ai-agents', icon: Zap, color: 'bg-violet-500' },
      { label: 'Automation', description: 'Workflow automation rules', href: '/admin/crm/automation', icon: Zap, color: 'bg-violet-600' },
      { label: 'Media', description: 'Media library management', href: '/admin/crm/media', icon: Image, color: 'bg-pink-500' },
      { label: 'Inbound Media', description: 'Inbound media from WhatsApp', href: '/admin/crm/inbound-media', icon: Image, color: 'bg-pink-600' },
      { label: 'Youth Program', description: 'Youth program registrations', href: '/admin/youth-program', icon: Users, color: 'bg-green-500' },
      { label: 'Chatbot Builder', description: 'Build custom chatbot flows', href: '/admin/crm/chatbot-builder', icon: Bot, color: 'bg-emerald-500' },
      { label: 'Chatbot Settings', description: 'Configure chatbot behavior', href: '/admin/crm/chatbot-settings', icon: Settings, color: 'bg-emerald-600' },
      { label: 'Send Template', description: 'Send WhatsApp templates', href: '/admin/crm/send-template', icon: FileText, color: 'bg-blue-500' },
      { label: 'Templates', description: 'Manage WhatsApp templates', href: '/admin/crm/templates', icon: FileText, color: 'bg-blue-600' },
      { label: 'Website Settings', description: 'General website configuration', href: '/admin/settings', icon: Settings, color: 'bg-gray-500' },
      { label: 'CRM Settings', description: 'CRM configuration and tools', href: '/admin/crm/settings', icon: Wrench, color: 'bg-gray-600' },
    ],
  },
};

const allTabs: TabKey[] = ['users', 'sales', 'social', 'tally', 'tools'];

export default function WebAdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('users');

  useEffect(() => {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
    if (!token) {
      router.push(getLoginPath());
      return;
    }
    
    // Check if user is superadmin
    try {
      const decoded: any = jwtDecode(token);
      const superAdminEmails = [
        'swarsakshi9999@gmail.com',
        'admin@swaryoga.com',
        'vijay@swaryoga.com',
        'varun@swaryoga.com'
      ];
      const userIsSuperAdmin = decoded.role === 'superadmin' || superAdminEmails.includes(decoded?.email?.toLowerCase());
      setIsSuperAdmin(userIsSuperAdmin);
      setIsAuthenticated(true);
    } catch {
      router.push(getLoginPath());
    }
  }, [router]);

  // Read tab from URL query param
  useEffect(() => {
    const tab = searchParams.get('tab') as TabKey;
    if (tab && allTabs.includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const switchTab = (tab: TabKey) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `/admin/crm/web-admin${tab === 'users' ? '' : `?tab=${tab}`}`);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  // Block non-superadmin access
  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500 max-w-md">
          Web Admin is restricted to superadmin users only. Please contact your administrator if you need access.
        </p>
        <button
          onClick={() => router.push('/admin/crm/dashboard')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  const currentTab = tabConfig[activeTab];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
          <Monitor className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Web Admin</h1>
          <p className="text-sm text-gray-500">Manage website pages, users, sales, social, and tools</p>
        </div>
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 pb-3 overflow-x-auto">
        {allTabs.map(tab => {
          const cfg = tabConfig[tab];
          const Icon = cfg.icon;
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => switchTab(tab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {cfg.label}
              <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                isActive ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {cfg.pages.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Page Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentTab.pages.map(page => {
          const Icon = page.icon;
          return (
            <Link
              key={page.href}
              href={page.href}
              className="group bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-lg transition-all p-5 flex items-start gap-4"
            >
              <div className={`w-11 h-11 ${page.color} rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                  {page.label}
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-sm text-gray-500 mt-1">{page.description}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Stats Footer */}
      <div className="mt-8 bg-gray-50 rounded-xl border p-4 flex items-center justify-between">
        <span className="text-sm text-gray-500">
          Showing <strong>{currentTab.pages.length}</strong> pages in <strong>{currentTab.label}</strong>
        </span>
        <span className="text-sm text-gray-400">
          Total: {Object.values(tabConfig).reduce((sum, t) => sum + t.pages.length, 0)} admin pages
        </span>
      </div>
    </div>
  );
}
