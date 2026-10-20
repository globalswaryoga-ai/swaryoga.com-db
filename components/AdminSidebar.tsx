'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { usePlan } from '@/components/admin/crm/hooks/usePlan';
import {
  LayoutDashboard,
  X,
  Home,
  ArrowLeft,
  MessageCircle,
  Radio,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  DollarSign,
  Globe,
  Settings,
  Phone,
  Bot,
  Bug,
  Activity,
  Shield,
  Mail,
  Building2,
  QrCode,
  SmartphoneNfc,
  Calculator,
  Monitor,
  FileText,
  HardDrive,
  Eye,
  EyeOff,
  GraduationCap,
  Languages,
  Lock,
  LogOut,
  Plug,
  Zap,
  Send,
  Megaphone,
  Wrench,
  PieChart,
  Users,
  UsersRound,
  Sparkles,
  Calendar,
  CalendarDays,
  Video,
  Clock,
  Leaf,
  Cloud,
  UtensilsCrossed,
  Share2,
  Filter,
  Sliders,
  PhoneCall,
  ShoppingBag,
  Landmark,
  LogIn,
  MessageSquare,
  Inbox,
  Tag,
  Image,
  TrendingUp,
  GitBranch,
  Workflow,
  BookOpen,
} from 'lucide-react';
import { PlanBadge, SidebarLock } from './admin/crm/PlanComponents';
import type { CrmModule } from '@/lib/crm-site/planConfig';
import CrmSidebar from './admin/crm/CrmSidebar';

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function AdminSidebar({ isOpen = true, onClose = () => {}, collapsed = false, onToggleCollapse }: AdminSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAuth();
  const plan = usePlan();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string>('admin');
  const [permissionsV2, setPermissionsV2] = useState<any>(null);
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const [isMainAdminDomain, setIsMainAdminDomain] = useState(true);

  // Check if accessed from swaryoga.com/admin/crm (not crm.swaryoga.com)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hostname = window.location.hostname;
    // Hide Web Admin for crm.swaryoga.com, show only for swaryoga.com
    const isCrmSubdomain = hostname === 'crm.swaryoga.com';
    setIsMainAdminDomain(!isCrmSubdomain);
  }, []);

  // Category expansion state (persisted in localStorage)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    home: true,
    sales: true,
    messaging: true,
    automation: false,
    reports: false,
    tools: false,
  });
  
  // Storage usage state
  const [storageUsage, setStorageUsage] = useState<{
    display: string;
    totalGB: number;
    monthlyCostINR: number;
    monthlyCostUSD: number;
    percentage: number;
    billingDaysRemaining: number;
    storagePlan: string;
  } | null>(null);
  const [storageHidden, setStorageHidden] = useState(false);
  const [isIndiaUser, setIsIndiaUser] = useState(true);

  const isCollapsed = onToggleCollapse ? collapsed : localCollapsed;
  const toggleCollapse = onToggleCollapse || (() => setLocalCollapsed(!localCollapsed));

  // Load persisted category expansion state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('crm_sidebar_expanded');
    if (saved) {
      try {
        setExpandedCategories(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = { ...prev, [category]: !prev[category] };
      localStorage.setItem('crm_sidebar_expanded', JSON.stringify(next));
      return next;
    });
  };

  // Determine super-admin status and permissions
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const userStr = localStorage.getItem('admin_user');
    let resolvedUserId = localStorage.getItem('adminUser') || '';
    let legacyPerms: string[] = [];
    let pv2: any = null;
    let role = 'admin';
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        resolvedUserId = (u?.userId as string) || resolvedUserId;
        legacyPerms = Array.isArray(u?.permissions) ? u.permissions : [];
        pv2 = u?.permissionsV2 || null;
        role = u?.role || 'admin';
      } catch {
        // ignore
      }
    }

    // Super Admin = ONLY userId 'admin' or 'admincrm' (hardcoded).
    // Do NOT use role or permissions — those can be set on tenant users.
    const superAdmin =
      resolvedUserId === 'admin' ||
      resolvedUserId === 'admincrm';

    setIsSuperAdmin(superAdmin);
    setUserRole(role);
    setPermissionsV2(pv2);

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

  // Fetch storage usage (super admin only — VIP data)
  useEffect(() => {
    if (!token || !isSuperAdmin) return;
    
    // Check if hidden in this session
    const hidden = sessionStorage.getItem('storageUsageHidden') === 'true';
    setStorageHidden(hidden);
    
    // Detect if user is in India based on timezone
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const indiaTz = tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta';
      setIsIndiaUser(indiaTz);
    } catch {
      setIsIndiaUser(true); // Default to India
    }
    
    if (hidden) return;
    // Don't call the API until we actually have a token, otherwise the request
    // goes out as "Bearer undefined" and the server rightly returns 401.
    if (!token) return;

    const fetchStorageUsage = async () => {
      try {
        const res = await window.fetch('/api/admin/crm/storage-usage', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && json.data) {
          // Assume 5GB free tier, calculate percentage
          const maxGB = 5;
          const percentage = Math.min(100, (json.data.totalGB / maxGB) * 100);
          setStorageUsage({
            display: json.data.storageSize?.display || '0 MB',
            totalGB: json.data.totalGB,
            monthlyCostINR: json.data.monthlyCost || 30,
            monthlyCostUSD: json.data.monthlyCostUSD || Math.ceil(json.data.totalGB * 0.42), // ~$0.42/GB
            percentage,
            billingDaysRemaining: json.data.billingCycleDaysRemaining ?? 30,
            storagePlan: json.data.storagePlan || 'free',
          });
        }
      } catch {
        // Silently fail
      }
    };

    // Fetch after a delay to not block initial render
    const timeout = setTimeout(fetchStorageUsage, 2000);
    return () => clearTimeout(timeout);
  }, [token, isSuperAdmin]);

  // Hide storage usage for this session
  const hideStorageUsage = () => {
    setStorageHidden(true);
    sessionStorage.setItem('storageUsageHidden', 'true');
  };

  // Show storage usage again
  const showStorageUsage = () => {
    setStorageHidden(false);
    sessionStorage.removeItem('storageUsageHidden');
  };

  const handleNavClick = () => {
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  // Permission check helper - returns true if user has access to a module
  const hasModuleAccess = (module: string): boolean => {
    if (isSuperAdmin) return true;
    if (!permissionsV2) return true;
    const modulePerms = permissionsV2[module];
    if (!modulePerms || typeof modulePerms !== 'object') return false;
    return Object.values(modulePerms).some((v: any) => v === true);
  };

  // If we are inside the CRM admin area, delegate to the CRM-specific sidebar
  if (pathname?.startsWith('/admin/crm')) {
    return (
      <CrmSidebar
        isOpen={isOpen}
        onClose={onClose}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
      />
    );
  }

  // ===== PROFESSIONAL SIDEBAR ORGANIZATION =====
  type SidebarItem = {
    icon: React.ElementType;
    label: string;
    href: string;
    color: string;
    module: string;
    planModule?: CrmModule;
    badge?: number;
    description?: string;
    superAdminOnly?: boolean;
    items?: any[];
  };

  type SidebarCategory = {
    key: string;
    label: string;
    icon: React.ElementType;
    items: SidebarItem[];
  };

  const sidebarCategories: SidebarCategory[] = [
    // ===== CORE DASHBOARD =====
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      items: [
        {
          icon: LayoutDashboard,
          label: 'Overview',
          href: '/admin/crm',
          color: 'text-blue-400',
          module: 'dashboard',
          description: 'Real-time CRM analytics & KPIs',
        },
      ],
    },

    // ===== PLANNER =====
    {
      key: 'planner',
      label: 'Planner',
      icon: LayoutDashboard,
      items: [
        {
          icon: LayoutDashboard,
          label: 'Planner',
          href: '/admin/crm/planner',
          color: 'text-orange-400',
          module: 'lifePlanner',
          planModule: 'lifePlanner',
          description: 'Goals, tasks, vision & planning',
        },
        {
          icon: Leaf,
          label: 'Ritucharya',
          href: '/admin/crm/planner/ritucharya',
          color: 'text-green-400',
          module: 'lifePlanner',
          planModule: 'lifePlanner',
          description: 'Ayurvedic seasonal guide',
        },
        {
          icon: Zap,
          label: 'Ritucharya Admin',
          href: '/admin/crm/ritucharya',
          color: 'text-emerald-500',
          module: 'lifePlanner',
          planModule: 'lifePlanner',
          description: 'Manage weather, dietary & meal plans',
          items: [
            {
              icon: Cloud,
              label: 'Ritucharya Logic',
              href: '/admin/crm/ritucharya/logic',
              color: 'text-blue-400',
              description: 'Weather ranges & Ritu mapping',
            },
            {
              icon: UtensilsCrossed,
              label: 'Dietary Recommendations',
              href: '/admin/crm/ritucharya/dietary-recommendations',
              color: 'text-green-400',
              description: 'Tastes & avoid recommendations',
            },
            {
              icon: CalendarDays,
              label: 'Diet Plan & Meals',
              href: '/admin/crm/ritucharya/diet-plan',
              color: 'text-orange-400',
              description: 'Daily meal schedules & tips',
            },
          ],
        },
      ],
    },

    // ===== 1. WEBSITE MANAGEMENT =====
    {
      key: 'web-admin',
      label: 'Website Management',
      icon: Monitor,
      items: [
        {
          icon: Monitor,
          label: 'Website Hub',
          href: '/admin/crm/web-admin',
          color: 'text-orange-400',
          module: 'dashboard',
          description: 'Members, signups, visitors & site config',
        },
        {
          icon: Users,
          label: 'Signup Data',
          href: '/admin/signup-data',
          color: 'text-blue-400',
          module: 'dashboard',
          description: 'User registration records',
        },
        {
          icon: LogIn,
          label: 'Signin Data',
          href: '/admin/signin-data',
          color: 'text-indigo-400',
          module: 'dashboard',
          description: 'Login logs & history',
        },
        {
          icon: Users,
          label: 'Users',
          href: '/admin/users',
          color: 'text-purple-400',
          module: 'dashboard',
          description: 'All registered platform users',
        },
        {
          icon: MessageSquare,
          label: 'Contact Messages',
          href: '/admin/contact-messages',
          color: 'text-emerald-400',
          module: 'dashboard',
          description: 'Messages & visitor inquiries',
        },
        {
          icon: Inbox,
          label: 'Enquiries',
          href: '/admin/enquiries',
          color: 'text-amber-400',
          module: 'dashboard',
          description: 'Workshop & course enquiries',
        },
        {
          icon: Tag,
          label: 'Offers',
          href: '/admin/offers',
          color: 'text-rose-400',
          module: 'dashboard',
          description: 'Website offers & banner promotions',
        },
        {
          icon: Settings,
          label: 'Site Settings',
          href: '/admin/settings',
          color: 'text-gray-400',
          module: 'dashboard',
          description: 'Site configuration & system keys',
        },
      ],
    },

    // ===== 2. WORKSHOP MANAGEMENT =====
    {
      key: 'workshop-management',
      label: 'Workshop Management',
      icon: GraduationCap,
      items: [
        {
          icon: GraduationCap,
          label: 'Workshop Hub',
          href: '/admin/crm/workshop-hub',
          color: 'text-emerald-400',
          module: 'dashboard',
          description: 'Central hub for workshops & batches',
        },
        {
          icon: Users,
          label: 'Workshop Students',
          href: '/admin/crm/workshop-management',
          color: 'text-teal-400',
          module: 'dashboard',
          description: 'Live cohorts, attendance & recordings',
        },
        {
          icon: FileText,
          label: 'Landing Pages',
          href: '/admin/landing-pages',
          color: 'text-cyan-400',
          module: 'dashboard',
          planModule: 'landingPages',
          description: 'Workshop landing funnels & pages',
        },
        {
          icon: CalendarDays,
          label: 'Batch Schedules',
          href: '/admin/workshops/schedules',
          color: 'text-blue-400',
          module: 'dashboard',
          description: 'Upcoming schedules & batch dates',
        },
        {
          icon: Tag,
          label: 'Workshop Offers',
          href: '/admin/crm/workshop-offer',
          color: 'text-pink-400',
          module: 'dashboard',
          description: 'Special pricing, discounts & creatives studio',
        },
        {
          icon: Sparkles,
          label: 'Youth Program',
          href: '/admin/youth-program',
          color: 'text-amber-400',
          module: 'dashboard',
          description: 'Workshops tailored for children & youth',
        },
      ],
    },

    // ===== 3. LEADS MANAGEMENT =====
    {
      key: 'leads-hub',
      label: 'Leads Management',
      icon: Users,
      items: [
        {
          icon: Users,
          label: 'Leads Hub',
          href: '/admin/crm/leads-hub',
          color: 'text-indigo-400',
          module: 'dashboard',
          description: 'Unified central intake & funnel hub',
        },
        {
          icon: Users,
          label: 'All Leads',
          href: '/admin/crm/leads',
          color: 'text-blue-400',
          module: 'payments',
          planModule: 'leads',
          description: 'Unified database (Web, Meta, QR, Forms)',
        },
        {
          icon: Filter,
          label: 'Unified Sales Funnel',
          href: '/admin/crm/funnel',
          color: 'text-purple-400',
          module: 'payments',
          planModule: 'leads',
          description: 'Universal visual Kanban pipeline',
        },
        {
          icon: Sliders,
          label: 'Funnel Manage',
          href: '/admin/crm/funnel/manage',
          color: 'text-amber-400',
          module: 'payments',
          planModule: 'leads',
          description: 'Manage funnel stages & triggers',
        },
        {
          icon: PhoneCall,
          label: 'Follow-up Queue',
          href: '/admin/crm/leads-followup',
          color: 'text-emerald-400',
          module: 'payments',
          planModule: 'leads',
          description: 'Scheduled follow-up calls & inquiries',
        },
      ],
    },

    // ===== 4. SALES MANAGEMENT =====
    {
      key: 'sales',
      label: 'Sales Management',
      icon: DollarSign,
      items: [
        {
          icon: DollarSign,
          label: 'Sales Deals',
          href: '/admin/crm/sales',
          color: 'text-green-400',
          module: 'payments',
          planModule: 'leads',
          description: 'Track conversions & closed deals',
        },
        {
          icon: ShoppingBag,
          label: 'Orders Maintenance',
          href: '/admin/crm/order-maintenance',
          color: 'text-emerald-400',
          module: 'payments',
          planModule: 'leads',
          description: 'Maintain orders & payment receipts',
        },
      ],
    },

    // ===== 5. BANKING & FINANCE =====
    {
      key: 'bank-income',
      label: 'Banking & Finance',
      icon: Landmark,
      items: [
        {
          icon: Landmark,
          label: 'Banking Hub',
          href: '/admin/crm/banking-hub',
          color: 'text-emerald-400',
          module: 'dashboard',
          description: 'All banking, tally & investment modules',
        },
        {
          icon: Landmark,
          label: 'Bank Income Tracker',
          href: '/admin/crm/bank-income',
          color: 'text-teal-400',
          module: 'dashboard',
          description: 'Upload PDF statements & categorization',
        },
        {
          icon: DollarSign,
          label: 'Accounting & P&L',
          href: '/admin/accounting',
          color: 'text-blue-400',
          module: 'dashboard',
          description: 'Master accounts & ledger entries',
        },
        {
          icon: Calculator,
          label: 'Tally Synchronization',
          href: '/admin/crm/tally',
          color: 'text-purple-400',
          module: 'dashboard',
          description: 'Tally Prime / ERP export & sync',
        },
        {
          icon: TrendingUp,
          label: 'Investment Portfolio',
          href: '/admin/crm/investment',
          color: 'text-green-400',
          module: 'dashboard',
          description: 'Portfolio tracking & asset allocation',
        },
      ],
    },

    // ===== 6. ZOOM MANAGEMENT =====
    {
      key: 'zoom',
      label: 'Zoom Management',
      icon: Video,
      items: [
        {
          icon: Video,
          label: 'Zoom Hub',
          href: '/admin/crm/zoom-hub',
          color: 'text-blue-400',
          module: 'community',
          planModule: 'community',
          description: 'All Zoom live & recording modules',
        },
        {
          icon: BarChart3,
          label: 'Zoom Meeting Analytics',
          href: '/admin/crm/zoom-analytics',
          color: 'text-indigo-400',
          module: 'community',
          planModule: 'community',
          description: 'Live meetings & attendance analytics',
        },
        {
          icon: Video,
          label: 'Recording Management',
          href: '/admin/crm/recording-management',
          color: 'text-cyan-400',
          module: 'community',
          planModule: 'community',
          description: 'Cloud recordings & storage library',
        },
        {
          icon: Globe,
          label: 'Community Zoom Setup',
          href: '/admin/crm/community/zoom-setting',
          color: 'text-teal-400',
          module: 'community',
          planModule: 'community',
          description: 'Map meeting IDs to community channels',
        },
        {
          icon: Video,
          label: 'Sadhana Program',
          href: '/admin/crm/sadhana-programs',
          color: 'text-emerald-400',
          module: 'community',
          planModule: 'community',
          description: 'Automated Zoom sadhana rooms & bot timers',
        },
        {
          icon: Calendar,
          label: 'Sadhana Scheduler',
          href: '/admin/crm/sadhana-scheduler',
          color: 'text-teal-400',
          module: 'community',
          planModule: 'community',
          description: 'Recurring Zoom schedules & reminders',
        },
      ],
    },

    // ===== 7. COMMUNICATION =====
    {
      key: 'communication',
      label: 'Communication',
      icon: MessageCircle,
      items: [
        {
          icon: MessageCircle,
          label: 'Communication Hub',
          href: '/admin/crm/communication-hub',
          color: 'text-emerald-400',
          module: 'whatsapp',
          planModule: 'whatsapp',
          description: 'Omnichannel: QR WA, Meta, Email, SMS, Calls, Telegram',
        },
        {
          icon: MessageSquare,
          label: 'Meta WhatsApp',
          href: '/admin/crm/meta',
          color: 'text-green-400',
          module: 'whatsapp',
          planModule: 'whatsapp',
          badge: unreadCount,
          description: 'Official 1:1 Meta WhatsApp inbox',
        },
        {
          icon: QrCode,
          label: 'QR WhatsApp',
          href: '/admin/crm/qr',
          color: 'text-teal-400',
          module: 'whatsapp',
          planModule: 'whatsapp',
          description: 'QR code WhatsApp bridge',
        },
        {
          icon: UsersRound,
          label: 'QR Groups',
          href: '/admin/crm/qr/group-contacts',
          color: 'text-sky-400',
          module: 'whatsapp',
          planModule: 'whatsapp',
          description: 'WhatsApp group members',
        },
        {
          icon: Send,
          label: 'Telegram',
          href: '/admin/crm/telegram',
          color: 'text-blue-400',
          module: 'whatsapp',
          planModule: 'whatsapp',
          description: 'Telegram bot messaging',
        },
        {
          icon: Mail,
          label: 'Email',
          href: '/admin/crm/email',
          color: 'text-red-400',
          module: 'email',
          planModule: 'emailMarketing',
          description: 'Email inbox & campaigns',
        },
        {
          icon: SmartphoneNfc,
          label: 'SMS',
          href: '/admin/crm/messages',
          color: 'text-gray-400',
          module: 'messages',
          planModule: 'whatsapp',
          description: 'Text messaging',
        },
        {
          icon: Phone,
          label: 'AI Calls',
          href: '/admin/crm/calls',
          color: 'text-teal-400',
          module: 'calls',
          planModule: 'aiCalls',
          description: 'AI voice calling agent',
        },
      ],
    },

    // ===== 8. COMMUNITY =====
    {
      key: 'engagement',
      label: 'Community',
      icon: Globe,
      items: [
        {
          icon: Globe,
          label: 'Community Hub',
          href: '/admin/crm/community',
          color: 'text-indigo-400',
          module: 'community',
          planModule: 'community',
          description: 'All community channels, forums & media',
        },
        {
          icon: MessageSquare,
          label: 'Community Workspace',
          href: '/admin/crm/community/workspace',
          color: 'text-cyan-400',
          module: 'community',
          planModule: 'community',
          description: 'Live feed, discussions & post composer',
        },
        {
          icon: Shield,
          label: 'Content Moderation',
          href: '/admin/crm/community-moderation',
          color: 'text-rose-400',
          module: 'community',
          planModule: 'community',
          description: 'Review pending stories, tips & Q&A',
        },
        {
          icon: Video,
          label: 'Recording Setup',
          href: '/admin/crm/community/zoom-setting',
          color: 'text-purple-400',
          module: 'community',
          planModule: 'community',
          description: 'Map Zoom meeting IDs → communities for auto-recording',
        },
      ],
    },

    // ===== 9. AUTOMATION & AI =====
    {
      key: 'automation',
      label: 'Automation & AI',
      icon: Zap,
      items: [
        {
          icon: Zap,
          label: 'Automation Hub',
          href: '/admin/crm/automation',
          color: 'text-purple-400',
          module: 'dashboard',
          description: 'All AI, chatflows & automation tools',
        },
        {
          icon: GitBranch,
          label: 'Visual Chatflow Builder',
          href: '/admin/crm/chatbot-builder',
          color: 'text-indigo-400',
          module: 'whatsapp',
          planModule: 'chatbot',
          description: 'Design multi-step visual chatflows',
        },
        {
          icon: Bot,
          label: 'AI Chatbots',
          href: '/admin/crm/chatbots',
          color: 'text-violet-400',
          module: 'whatsapp',
          planModule: 'chatbot',
          description: 'Intelligent AI conversation bots',
        },
        {
          icon: Sparkles,
          label: 'Autonomous AI Agents',
          href: '/admin/crm/ai-agents',
          color: 'text-pink-400',
          module: 'dashboard',
          description: 'Autonomous LLM agent assistants',
        },
        {
          icon: BookOpen,
          label: 'Knowledge Base',
          href: '/admin/crm/knowledge-base',
          color: 'text-amber-400',
          module: 'dashboard',
          description: 'RAG embeddings & training documents',
        },
        {
          icon: Workflow,
          label: 'Workflows',
          href: '/admin/crm/workflows',
          color: 'text-yellow-400',
          module: 'dashboard',
          description: 'Event-driven automated workflows',
        },
        {
          icon: MessageSquare,
          label: 'WhatsApp Welcome & Rules',
          href: '/admin/crm/automation/rules',
          color: 'text-emerald-400',
          module: 'whatsapp',
          description: 'Keyword replies & welcome messages',
        },
        {
          icon: QrCode,
          label: 'QR Automation',
          href: '/admin/crm/qr/automation',
          color: 'text-teal-400',
          module: 'whatsapp',
          planModule: 'chatbot',
          description: 'QR welcome + keyword rules',
        },
        {
          icon: Bot,
          label: 'QR Chatbot',
          href: '/admin/crm/qr/chatbot',
          color: 'text-cyan-400',
          module: 'whatsapp',
          planModule: 'chatbot',
          description: 'QR WhatsApp chatbot flows',
        },
      ],
    },

    // ===== 10. BROADCAST & TEMPLATES =====
    {
      key: 'broadcast',
      label: 'Broadcast',
      icon: Radio,
      items: [
        {
          icon: Radio,
          label: 'Broadcast Hub',
          href: '/admin/crm/broadcast-hub',
          color: 'text-purple-400',
          module: 'whatsapp',
          planModule: 'whatsapp',
          description: '3-Column Broadcast, Templates & Reports Hub',
        },
        {
          icon: Radio,
          label: 'Broadcast',
          href: '/admin/crm/broadcast',
          color: 'text-purple-400',
          module: 'whatsapp',
          planModule: 'whatsapp',
          description: 'Send messages to many',
        },
        {
          icon: BarChart3,
          label: 'Broadcast Dashboard',
          href: '/admin/crm/broadcast-dashboard',
          color: 'text-blue-400',
          module: 'whatsapp',
          planModule: 'whatsapp',
          description: 'Broadcast analytics & run logs',
        },
        {
          icon: Radio,
          label: 'QR Broadcast',
          href: '/admin/crm/qr?tab=broadcast',
          color: 'text-indigo-400',
          module: 'whatsapp',
          planModule: 'whatsapp',
          description: 'QR WhatsApp broadcast',
        },
        {
          icon: CalendarDays,
          label: 'Group Scheduler',
          href: '/admin/crm/qr/group-scheduler',
          color: 'text-emerald-400',
          module: 'whatsapp',
          planModule: 'whatsapp',
          description: 'Recurring scheduled group messages',
        },
      ],
    },

    // ===== 11. SOCIAL MEDIA =====
    {
      key: 'social-media',
      label: 'Social Media',
      icon: Share2,
      items: [
        {
          icon: Share2,
          label: 'Social Media Hub',
          href: '/admin/crm/social-hub',
          color: 'text-pink-400',
          module: 'dashboard',
          description: 'Publishing accounts, video vault & channels',
        },
        {
          icon: Video,
          label: 'Private Video Vault',
          href: '/admin/crm/private-videos',
          color: 'text-purple-400',
          module: 'dashboard',
          description: 'Private video collection & hosting',
        },
        {
          icon: Image,
          label: 'Media Upload',
          href: '/admin/media/upload',
          color: 'text-rose-400',
          module: 'dashboard',
          description: 'Upload posters, videos & graphics',
        },
      ],
    },

    // ===== 12. CRM & TENANTS =====
    {
      key: 'tenants',
      label: 'CRM & Tenants',
      icon: Building2,
      items: [
        {
          icon: Building2,
          label: 'Tenants Hub',
          href: '/admin/crm/tenants-hub',
          color: 'text-cyan-400',
          module: 'dashboard',
          description: 'Multi-tenant architecture & organizations hub',
        },
        {
          icon: Building2,
          label: 'Tenants',
          href: '/admin/crm/tenants',
          color: 'text-cyan-400',
          module: 'dashboard',
          description: 'Manage tenant accounts & websites',
        },
        {
          icon: Shield,
          label: 'Tenants Plan',
          href: '/admin/crm/tenants-plan',
          color: 'text-emerald-400',
          module: 'dashboard',
          description: 'Plan tiers & module access',
        },
        {
          icon: UsersRound,
          label: 'CRM Users',
          href: '/admin/crm/crm-users',
          color: 'text-blue-400',
          module: 'dashboard',
          description: 'Manage staff, roles & logins',
        },
      ],
    },

    // ===== 13. ALL REPORTS =====
    {
      key: 'analytics',
      label: 'All Reports',
      icon: BarChart3,
      items: [
        {
          icon: BarChart3,
          label: 'Reports Hub',
          href: '/admin/crm/reports-hub',
          color: 'text-blue-400',
          module: 'analytics',
          planModule: 'reports',
          description: '3-Column Reports & Intelligence Hub',
        },
        {
          icon: BarChart3,
          label: 'All Reports',
          href: '/admin/crm/all-reports',
          color: 'text-blue-400',
          module: 'analytics',
          planModule: 'reports',
          description: 'Unified analytics dashboard',
        },
        {
          icon: PieChart,
          label: 'CRM Analytics',
          href: '/admin/crm/analytics',
          color: 'text-purple-400',
          module: 'analytics',
          planModule: 'reports',
          description: 'Detailed metrics & performance graphs',
        },
      ],
    },

    // ===== 14. TOOLS & SETTINGS =====
    {
      key: 'tools',
      label: 'Tools & Settings',
      icon: Settings,
      items: [
        {
          icon: Settings,
          label: 'Settings Hub',
          href: '/admin/crm/settings-hub',
          color: 'text-indigo-400',
          module: 'dashboard' as CrmModule,
          description: '3-Column System Configuration Hub',
        },
        {
          icon: Settings,
          label: 'CRM Settings',
          href: '/admin/crm/settings',
          color: 'text-gray-300',
          module: 'dashboard' as CrmModule,
          description: 'CRM settings & preferences',
        },
        {
          icon: Plug,
          label: 'Connections',
          href: '/admin/crm/connections',
          color: 'text-gray-400',
          module: 'dashboard' as CrmModule,
          description: 'API & service integrations',
        },
        {
          icon: Zap,
          label: 'Extensions',
          href: '/admin/crm/integration-hub',
          color: 'text-gray-400',
          module: 'dashboard' as CrmModule,
          description: 'Third-party integrations',
        },
        {
          icon: Settings,
          label: 'Plan & Billing',
          href: '/admin/crm/billing',
          color: 'text-emerald-400',
          module: 'dashboard' as CrmModule,
          description: '₹499/mo | Storage: ₹50/GB',
        },
        {
          icon: Shield,
          label: 'Permissions',
          href: '/admin/crm/permissions',
          color: 'text-gray-400',
          module: 'dashboard' as CrmModule,
          description: 'User access levels & policies',
        },
      ],
    },

    // ===== 15. KP ASTRO =====
    {
      key: 'kp-astro',
      label: 'KP Astro',
      icon: Sparkles,
      items: [
        {
          icon: Sparkles,
          label: 'KP Astro',
          href: '/admin/crm/kp-astro',
          color: 'text-indigo-400',
          module: 'dashboard',
          description: 'KP astrology rule lookup & reference tool',
        },
      ],
    },

    // ===== 16. E-LEARNING (Strictly Untouched!) =====
    {
      key: 'elearning',
      label: 'E-Learning',
      icon: GraduationCap,
      items: [
        {
          icon: GraduationCap,
          label: 'E-Learning',
          href: '/admin/crm/e-learning',
          color: 'text-purple-400',
          module: 'elearning',
          planModule: 'community',
          description: 'Online learning platform & courses',
        },
      ],
    },
  ];

  // Super admin only developer & system utilities
  const superAdminItems = [
    {
      icon: Shield,
      label: 'Super Admin',
      href: '/admin/crm/super-admin',
      color: 'text-gray-400',
    },
    {
      icon: Bug,
      label: 'Error Logs',
      href: '/admin/crm/error-logs',
      color: 'text-gray-400',
    },
    {
      icon: Activity,
      label: 'Anti-Bug',
      href: '/admin/crm/anti-bug',
      color: 'text-gray-400',
    },
    {
      icon: Activity,
      label: 'Admin Activity',
      href: '/admin/crm/admin-activity',
      color: 'text-gray-400',
    },
    {
      icon: Video,
      label: 'Sadhana Program',
      href: '/admin/crm/sadhana-programs',
      color: 'text-purple-400',
    },
    {
      icon: CalendarDays,
      label: 'Sadhana Scheduler',
      href: '/admin/crm/sadhana-scheduler',
      color: 'text-blue-400',
    },
  ];

  const isActive = (href: string) => {
    if (href === '/admin/crm') return pathname === '/admin/crm';
    return pathname?.startsWith(href) || false;
  };

  // Sidebar width
  const sidebarWidth = isCollapsed ? 'w-[68px]' : 'w-60';

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-[10000] ${sidebarWidth} bg-[#0b0f19] border-r border-slate-800/80 text-white transform transition-all duration-300 ease-in-out flex flex-col relative overflow-hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Subtle Top Atmospheric Glow */}
        <div className="absolute top-0 left-0 right-0 h-44 bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none" />

        {/* Sidebar Header */}
        <div className={`border-b border-slate-800/80 flex-shrink-0 relative z-10 ${isCollapsed ? 'p-2.5' : 'p-3.5'}`}>
          <div className="flex items-center justify-between mb-2.5">
            {!isCollapsed && (
              <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-md shadow-indigo-500/25 flex-shrink-0 flex items-center justify-center">
                  <div className="w-full h-full bg-[#0b0f19] rounded-[10px] flex items-center justify-center overflow-hidden">
                    <img
                      src="https://swaryogacrm.b-cdn.net/Symbol%20of%20infinity%20with%20a%20flame.png"
                      alt="Swar Yoga"
                      className="w-7 h-7 object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/logo.png';
                      }}
                    />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-extrabold text-sm truncate text-white tracking-tight">Swar Yoga</h2>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400/90 truncate">Admin Console</p>
                </div>
              </div>
            )}
            {isCollapsed && (
              <div className="flex items-center justify-center w-full">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-md shadow-indigo-500/25 flex items-center justify-center">
                  <div className="w-full h-full bg-[#0b0f19] rounded-[10px] flex items-center justify-center overflow-hidden">
                    <img
                      src="https://swaryogacrm.b-cdn.net/Symbol%20of%20infinity%20with%20a%20flame.png"
                      alt="Swar Yoga"
                      className="w-7 h-7 object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/logo.png';
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Navigation (only when expanded) */}
          {!isCollapsed && (
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => { router.push('/'); onClose(); }}
                className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-white border border-emerald-500/25 text-xs font-semibold transition-all shadow-xs"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Home</span>
              </button>
              <button
                onClick={() => { router.back(); onClose(); }}
                className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-all shadow-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
            </div>
          )}

          {/* Collapse/Expand Toggle — placed at top for easy access */}
          <button
            onClick={toggleCollapse}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 mt-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/5 text-xs font-medium transition-all"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="text-[11px] font-medium tracking-wide">Collapse Navigation</span>
              </>
            )}
          </button>
        </div>

        {/* Main Navigation - Flat for Free/Basic, Grouped for Starter+ */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {(plan.plan === 'free' || plan.plan === 'basic') ? (
            // FLAT LIST - Free/Basic plans only
            <div className="space-y-0.5">
              {sidebarCategories.flatMap((category) =>
                category.items
                  .filter((item) => {
                    if (item.superAdminOnly && !isSuperAdmin) return false;
                    if (!isSuperAdmin && item.planModule && !plan.canAccess(item.planModule)) return false;
                    return true;
                  })
                  .map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={handleNavClick}
                        title={isCollapsed ? item.label : undefined}
                        className={`flex items-center ${isCollapsed ? 'justify-center' : ''} gap-2.5 px-3 py-2 rounded-xl transition-all duration-150 group relative ${
                          active
                            ? 'bg-gradient-to-r from-indigo-600/30 via-indigo-500/15 to-transparent text-white font-semibold border-l-[3px] border-indigo-400 shadow-sm shadow-indigo-950/40 -ml-[2px]'
                            : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                        }`}
                      >
                        <Icon className={`h-4 w-4 flex-shrink-0 transition-all ${active ? 'text-indigo-400 drop-shadow-[0_0_6px_rgba(129,140,248,0.7)]' : 'text-slate-500 group-hover:text-slate-200 group-hover:scale-105'}`} />
                        {!isCollapsed && (
                          <span className={`font-medium text-xs truncate ${active ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                            {item.label}
                          </span>
                        )}
                        {item.badge && item.badge > 0 && (
                          <span className={`${isCollapsed ? 'absolute -top-0.5 -right-0.5 w-4 h-4 text-[10px]' : 'ml-auto px-1.5 py-0.2 text-[10px]'} bg-rose-500 text-white font-bold rounded-full flex items-center justify-center flex-shrink-0 shadow-xs shadow-rose-500/40`}>
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}
                        {isCollapsed && (
                          <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[10000] shadow-lg border border-gray-700 transition-opacity">
                            <div className="font-medium">{item.label}</div>
                            {item.description && (
                              <div className="text-[10px] text-gray-400 mt-0.5">{item.description}</div>
                            )}
                          </div>
                        )}
                      </Link>
                    );
                  })
              )}
            </div>
          ) : (
            // GROUPED LIST - Starter+ plans
            <>
              {sidebarCategories.map((category) => {
                const CategoryIcon = category.icon;
                const isExpanded = expandedCategories[category.key] ?? true;
                // Check if any item in category is active
                const hasActiveItem = category.items.some((item) => isActive(item.href));
                // Count badges in category
                const totalBadges = category.items.reduce((sum, item) => sum + (item.badge || 0), 0);

                return (
                  <div key={category.key}>
                {/* Category Header */}
                <button
                  onClick={() => !isCollapsed && toggleCategory(category.key)}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-2 px-3 py-2 rounded-xl transition-all duration-150 group ${
                    hasActiveItem ? 'bg-indigo-600/15 text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                  title={isCollapsed ? category.label : undefined}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                      hasActiveItem ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/[0.04] text-slate-400 group-hover:text-indigo-400 group-hover:bg-white/[0.08]'
                    }`}>
                      <CategoryIcon className="h-3.5 w-3.5" />
                    </div>
                    {!isCollapsed && (
                      <span className={`text-[11px] font-bold uppercase tracking-wider truncate ${hasActiveItem ? 'text-indigo-300' : 'text-slate-400 group-hover:text-slate-200'}`}>
                        {category.label}
                      </span>
                    )}
                  </div>
                  {!isCollapsed && (
                    <div className="flex items-center gap-1.5">
                      {totalBadges > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-rose-500 text-white font-bold rounded-full shadow-xs shadow-rose-500/50">
                          {totalBadges > 99 ? '99+' : totalBadges}
                        </span>
                      )}
                      <ChevronDown className={`h-3.5 w-3.5 text-slate-500 group-hover:text-slate-300 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
                    </div>
                  )}
                  {/* Tooltip when collapsed */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[10000] shadow-lg border border-gray-700 transition-opacity">
                      <div className="font-medium">{category.label}</div>
                      <div className="text-[10px] text-gray-400">{category.items.length} items</div>
                    </div>
                  )}
                </button>

                {/* Category Items - collapsible */}
                {(isExpanded || isCollapsed) && (
                  <div className={`${isCollapsed ? '' : 'ml-2 border-l border-slate-800/80 pl-2'} space-y-0.5 mt-0.5`}>
                    {category.items.filter((item) => {
                      // Hide if superAdminOnly and not a super admin
                      if (item.superAdminOnly && !isSuperAdmin) return false;
                      // Hide if has planModule and user doesn't have access (but super admin sees everything)
                      if (!isSuperAdmin && item.planModule && !plan.canAccess(item.planModule)) return false;
                      return true;
                    }).map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={handleNavClick}
                          title={isCollapsed ? item.label : undefined}
                          className={`flex items-center ${isCollapsed ? 'justify-center' : ''} gap-2.5 px-3 py-2 rounded-xl transition-all duration-150 group relative ${
                            active
                              ? 'bg-gradient-to-r from-indigo-600/30 via-indigo-500/15 to-transparent text-white font-semibold border-l-[3px] border-indigo-400 shadow-sm shadow-indigo-950/40 -ml-[2px]'
                              : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                          }`}
                        >
                          <Icon className={`h-4 w-4 flex-shrink-0 transition-all ${active ? 'text-indigo-400 drop-shadow-[0_0_6px_rgba(129,140,248,0.7)]' : 'text-slate-500 group-hover:text-slate-200 group-hover:scale-105'}`} />
                          {!isCollapsed && (
                            <span className={`font-medium text-xs truncate ${active ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                              {item.label}
                            </span>
                          )}
                          {item.badge && item.badge > 0 && (
                            <span className={`${isCollapsed ? 'absolute -top-0.5 -right-0.5 w-4 h-4 text-[10px]' : 'ml-auto px-1.5 py-0.2 text-[10px]'} bg-rose-500 text-white font-bold rounded-full flex items-center justify-center flex-shrink-0 shadow-xs shadow-rose-500/40`}>
                              {item.badge > 99 ? '99+' : item.badge}
                            </span>
                          )}
                          {/* Plan lock icon for gated modules */}
                          {!isCollapsed && item.planModule && !item.badge && (
                            <span className="ml-auto">
                              <SidebarLock module={item.planModule} />
                            </span>
                          )}
                          {/* Tooltip when collapsed */}
                          {isCollapsed && (
                            <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[10000] shadow-lg border border-gray-700 transition-opacity">
                              <div className="font-medium">{item.label}</div>
                              {item.description && (
                                <div className="text-[10px] text-gray-400 mt-0.5">{item.description}</div>
                              )}
                            </div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
            </>
          )}

          {/* Super Admin Section */}
          {isSuperAdmin && (
            <>
              {!isCollapsed && (
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-3 pt-4 pb-1">
                  Admin
                </p>
              )}
              {isCollapsed && <div className="border-t border-gray-800 my-2" />}
              {superAdminItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleNavClick}
                    title={isCollapsed ? item.label : undefined}
                    className={`flex items-center ${isCollapsed ? 'justify-center' : ''} gap-3 px-3 py-2 rounded-xl transition-all duration-150 group relative ${
                      active
                        ? 'bg-gradient-to-r from-indigo-600/30 via-indigo-500/15 to-transparent text-white font-semibold border-l-[3px] border-indigo-400 shadow-sm shadow-indigo-950/40'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    <Icon className={`h-4 w-4 flex-shrink-0 transition-colors ${active ? 'text-indigo-400 drop-shadow-[0_0_6px_rgba(129,140,248,0.7)]' : 'text-slate-500 group-hover:text-slate-200'}`} />
                    {!isCollapsed && (
                      <span className={`font-medium text-xs truncate ${active ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                        {item.label}
                      </span>
                    )}
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-2.5 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[10000] shadow-lg border border-gray-700 transition-opacity">
                        {item.label}
                      </div>
                    )}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Settings at bottom */}
        <div className={`border-t border-slate-800/80 flex-shrink-0 ${isCollapsed ? 'p-2' : 'p-3'}`}>
          {/* Storage Usage Indicator */}
          {storageUsage && !storageHidden && !isCollapsed && (
            <Link
              href="/admin/crm/settings?tab=storage"
              onClick={handleNavClick}
              className="mb-3 p-2.5 bg-gradient-to-r from-gray-800/80 to-gray-800/40 rounded-xl border border-gray-700/50 block hover:border-cyan-700/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <HardDrive className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="text-[11px] font-medium text-gray-300">Storage</span>
                </div>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); hideStorageUsage(); }}
                  className="p-0.5 hover:bg-gray-700 rounded transition-colors"
                  title="Hide for this session"
                >
                  <X className="h-3 w-3 text-gray-500 hover:text-gray-300" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      storageUsage.percentage > 80 ? 'bg-red-500' : 
                      storageUsage.percentage > 50 ? 'bg-yellow-500' : 'bg-cyan-500'
                    }`}
                    style={{ width: `${storageUsage.percentage}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-gray-400 min-w-fit">
                  {storageUsage.display}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[9px] text-gray-500">
                  {storageUsage.totalGB.toFixed(2)} GB used
                </span>
                <span className="text-[9px] text-amber-400 font-medium">
                  {isIndiaUser ? `₹${storageUsage.monthlyCostINR}` : `$${storageUsage.monthlyCostUSD}`}/mo
                </span>
              </div>
              {/* Billing countdown for free users */}
              {!isSuperAdmin && storageUsage.storagePlan === 'free' && (
                <div className={`flex items-center justify-center gap-1 mt-2 px-2 py-1 rounded-lg text-[9px] font-medium ${
                  storageUsage.billingDaysRemaining <= 5 
                    ? 'bg-red-900/40 text-red-300 border border-red-700/50' 
                    : storageUsage.billingDaysRemaining <= 10
                    ? 'bg-amber-900/30 text-amber-300 border border-amber-700/40'
                    : 'bg-cyan-900/20 text-cyan-300 border border-cyan-700/30'
                }`}>
                  <span>⏱</span>
                  <span>
                    {storageUsage.billingDaysRemaining <= 0 
                      ? 'Payment due now' 
                      : `${storageUsage.billingDaysRemaining}d until next billing`}
                  </span>
                  <span className="text-[8px] opacity-70">
                    (min {isIndiaUser ? '₹30' : '$0.36'})
                  </span>
                </div>
              )}
              <div className="text-[8px] text-gray-500 text-center mt-1.5 hover:text-cyan-400">
                Click for details →
              </div>
            </Link>
          )}
          
          {/* Collapsed storage indicator */}
          {storageUsage && !storageHidden && isCollapsed && (
            <Link
              href="/admin/crm/settings?tab=storage"
              onClick={handleNavClick}
              className="mb-2 p-2 bg-gray-800/60 rounded-lg flex items-center justify-center relative group cursor-pointer hover:bg-gray-700/60 transition-colors"
              title={`Storage: ${storageUsage.display} (${isIndiaUser ? `₹${storageUsage.monthlyCostINR}` : `$${storageUsage.monthlyCostUSD}`}/mo)`}
            >
              <HardDrive className={`h-4 w-4 ${
                storageUsage.percentage > 80 ? 'text-red-400' : 
                storageUsage.percentage > 50 ? 'text-yellow-400' : 'text-cyan-400'
              }`} />
              <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[10000] shadow-lg border border-gray-700 transition-opacity">
                <div className="font-medium">{storageUsage.display}</div>
                <div className="text-amber-400 text-[10px]">{isIndiaUser ? `₹${storageUsage.monthlyCostINR}` : `$${storageUsage.monthlyCostUSD}`}/mo</div>
                {!isSuperAdmin && storageUsage.storagePlan === 'free' && (
                  <div className="text-cyan-400 text-[10px]">{storageUsage.billingDaysRemaining}d remaining</div>
                )}
              </div>
            </Link>
          )}
          
          {/* Show storage button when hidden */}
          {storageHidden && !isCollapsed && (
            <button
              onClick={showStorageUsage}
              className="w-full mb-2 flex items-center justify-center gap-1.5 px-2 py-1 text-[10px] text-gray-500 hover:text-gray-300 hover:bg-gray-800/40 rounded-lg transition-colors"
            >
              <Eye className="h-3 w-3" />
              <span>Show storage</span>
            </button>
          )}

          {/* Plan Badge */}
          {!isCollapsed ? (
            <PlanBadge variant="sidebar" />
          ) : (
            <PlanBadge variant="compact" className="flex justify-center mb-2" />
          )}
          
          <Link
            href="/admin/crm/settings"
            onClick={handleNavClick}
            title="Settings"
            className={`flex items-center ${isCollapsed ? 'justify-center' : ''} gap-3 px-3 py-2 rounded-xl transition-all group relative hover:bg-gray-800/60`}
          >
            <Settings className={`h-[18px] w-[18px] flex-shrink-0 text-gray-400 group-hover:text-white ${isActive('/admin/crm/settings') ? 'text-indigo-400' : ''}`} />
            {!isCollapsed && (
              <span className="font-medium text-[13px] text-gray-400 group-hover:text-white">Settings</span>
            )}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2.5 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[10000] shadow-lg border border-gray-700 transition-opacity">
                Settings
              </div>
            )}
          </Link>

          {/* Sign Out */}
          <button
            onClick={() => {
              localStorage.removeItem('adminToken');
              localStorage.removeItem('adminUser');
              localStorage.removeItem('admin_token');
              localStorage.removeItem('admin_user');
              localStorage.removeItem('crm_token');
              localStorage.removeItem('crm_user_name');
              localStorage.removeItem('crm_user_email');
              const isCrm = typeof window !== 'undefined' &&
                (window.location.hostname === 'crm.swaryoga.com' || window.location.hostname.startsWith('crm.'));
              router.push(isCrm ? '/crm-site/login' : '/admin/login');
            }}
            title="Sign Out"
            className={`flex items-center ${isCollapsed ? 'justify-center' : ''} gap-3 px-3 py-2 rounded-xl transition-all group relative hover:bg-red-900/30 w-full text-left`}
          >
            <LogOut className="h-[18px] w-[18px] flex-shrink-0 text-gray-400 group-hover:text-red-400" />
            {!isCollapsed && (
              <span className="font-medium text-[13px] text-gray-400 group-hover:text-red-400">Sign Out</span>
            )}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2.5 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[10000] shadow-lg border border-gray-700 transition-opacity">
                Sign Out
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
