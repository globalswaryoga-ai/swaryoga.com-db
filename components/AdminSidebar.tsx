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
  CalendarDays,
  Video,
  Clock,
} from 'lucide-react';
import { PlanBadge, SidebarLock } from './admin/crm/PlanComponents';
import type { CrmModule } from '@/lib/crm-site/planConfig';

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

    // ===== WEB ADMIN =====
    {
      key: 'web-admin',
      label: 'Web Admin',
      icon: Monitor,
      items: [
        {
          icon: Monitor,
          label: 'Web Admin',
          href: '/admin/crm/web-admin',
          color: 'text-gray-400',
          module: 'dashboard',
          description: 'All admin detail pages (Users, Sales, Social, etc)',
        },
      ],
    },

    // ===== LEAD & SALES MANAGEMENT =====
    {
      key: 'sales',
      label: 'Lead & Sales',
      icon: DollarSign,
      items: [
        {
          icon: Users,
          label: 'Leads',
          href: '/admin/crm/leads',
          color: 'text-purple-400',
          module: 'payments',
          planModule: 'leads',
          description: 'Capture, qualify & manage leads',
        },
        {
          icon: FileText,
          label: 'Landing Pages',
          href: '/admin/landing-pages',
          color: 'text-cyan-400',
          module: 'dashboard',
          planModule: 'landingPages',
          description: 'High-converting landing pages',
        },
        {
          icon: DollarSign,
          label: 'Sales',
          href: '/admin/crm/sales',
          color: 'text-green-400',
          module: 'payments',
          planModule: 'leads',
          description: 'Track & close deals',
        },
        {
          icon: PieChart,
          label: 'Sales Funnel',
          href: '/admin/crm/funnel',
          color: 'text-orange-400',
          module: 'payments',
          planModule: 'leads',
          description: 'Visualize conversion pipeline',
        },
        {
          icon: BarChart3,
          label: 'Funnel Manager',
          href: '/admin/crm/funnel/manage',
          color: 'text-amber-400',
          module: 'payments',
          planModule: 'leads',
          description: 'Configure sales stages',
        },
      ],
    },

    // ===== CUSTOMER ENGAGEMENT =====
    {
      key: 'engagement',
      label: 'Engagement',
      icon: Globe,
      items: [
        {
          icon: Globe,
          label: 'Community',
          href: '/admin/crm/community',
          color: 'text-indigo-400',
          module: 'community',
          planModule: 'community',
          description: 'Forums, courses & communities',
        },
      ],
    },

    // ===== DIRECT MESSAGING & CAMPAIGNS =====
    {
      key: 'messaging',
      label: 'Messaging & Outreach',
      icon: MessageCircle,
      items: [
        // --- Direct Messaging ---
        {
          icon: MessageCircle,
          label: 'Meta WhatsApp',
          href: '/admin/crm/meta',
          color: 'text-gray-400',
          module: 'whatsapp',
          planModule: 'whatsapp',
          badge: unreadCount,
          description: '1:1 WhatsApp messaging',
          superAdminOnly: true,  // Hide from basic plan
        },
        {
          icon: QrCode,
          label: 'QR WhatsApp',
          href: '/admin/crm/qr',
          color: 'text-gray-400',
          module: 'whatsapp',
          planModule: 'whatsapp',
          description: 'QR code WhatsApp bridge',
        },
        {
          icon: Radio,
          label: 'QR Broadcast',
          href: '/admin/crm/qr?tab=broadcast',
          color: 'text-purple-400',
          module: 'whatsapp',
          planModule: 'whatsapp',
          description: 'Send messages to many',
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
          description: 'Email (1000/month limit)',
        },
        {
          icon: SmartphoneNfc,
          label: 'SMS',
          href: '/admin/crm/messages',
          color: 'text-gray-400',
          module: 'messages',
          planModule: 'whatsapp',
          description: 'Text messaging',
          superAdminOnly: true,  // Hide from basic plan
        },
        // --- Lead Capture & Campaigns ---
        {
          icon: Users,
          label: 'QR Leads',
          href: '/admin/crm/qr/leads',
          color: 'text-emerald-400',
          module: 'whatsapp',
          planModule: 'whatsapp',
          description: 'QR code lead generation',
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
      ],
    },

    // ===== AUTOMATION & AI =====
    {
      key: 'automation',
      label: 'Automation & AI',
      icon: Zap,
      items: [
        {
          icon: Zap,
          label: 'Workflows',
          href: '/admin/crm/automation',
          color: 'text-yellow-400',
          module: 'dashboard',
          description: 'Automated workflows',
        },
        {
          icon: Bot,
          label: 'Chatbots',
          href: '/admin/crm/chatbots',
          color: 'text-violet-400',
          module: 'whatsapp',
          planModule: 'chatbot',
          description: 'AI conversation flows',
        },
        {
          icon: Phone,
          label: 'AI Calls',
          href: '/admin/crm/calls',
          color: 'text-teal-400',
          module: 'calls',
          planModule: 'aiCalls',
          description: 'AI voice calling',
        },
      ],
    },

    // ===== ANALYTICS & REPORTING =====
    {
      key: 'analytics',
      label: 'Analytics & Reports',
      icon: BarChart3,
      items: [
        {
          icon: BarChart3,
          label: 'All Reports',
          href: '/admin/crm/all-reports',
          color: 'text-blue-400',
          module: 'analytics',
          planModule: 'reports',
          description: 'Unified analytics dashboard',
        },
      ],
    },

    // ===== TOOLS & SETTINGS =====
    {
      key: 'tools',
      label: 'Tools & Settings',
      icon: Wrench,
      items: [
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
          icon: Calculator,
          label: 'Accounting',
          href: '/admin/crm/accounting',
          color: 'text-emerald-400',
          module: 'accounting',
          planModule: 'accounting',
          description: 'Financial accounts & reports',
        },
        {
          icon: Calculator,
          label: 'Life Planner',
          href: '/admin/crm/life-planner',
          color: 'text-orange-400',
          module: 'lifePlanner',
          planModule: 'lifePlanner',
          description: 'Goals, tasks & planning',
        },
        {
          icon: Settings,
          label: 'Plan & Billing',
          href: '/admin/crm/billing',
          color: 'text-emerald-400',
          module: 'dashboard' as CrmModule,
          description: '₹499/mo | Storage: ₹50/GB',
        },
      ],
    },
  ];

  // Super admin only items
  const superAdminItems = [
    {
      icon: Shield,
      label: 'Super Admin',
      href: '/admin/crm/super-admin',
      color: 'text-gray-400',
    },
    {
      icon: UsersRound,
      label: 'CRM Users',
      href: '/admin/crm/crm-users',
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
      icon: GraduationCap,
      label: 'E-Learning',
      href: '/admin/crm/e-learning',
      color: 'text-gray-400',
    },
    {
      icon: Building2,
      label: 'Tenants',
      href: '/admin/crm/tenants',
      color: 'text-gray-400',
    },
    {
      icon: Shield,
      label: 'Permissions',
      href: '/admin/crm/permissions',
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
        className={`fixed md:static inset-y-0 left-0 z-50 ${sidebarWidth} bg-gray-900 text-white transform transition-all duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className={`border-b border-gray-800 flex-shrink-0 ${isCollapsed ? 'p-2' : 'p-4'}`}>
          <div className="flex items-center justify-between mb-2">
            {!isCollapsed && (
              <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                <img src="/logo.png" alt="Swar Yoga" className="w-8 h-8 rounded-lg flex-shrink-0" />
                <h2 className="font-bold text-base truncate text-white">Swar Yoga</h2>
              </div>
            )}
            {isCollapsed && (
              <div className="flex items-center justify-center w-full">
                <img src="/logo.png" alt="Swar Yoga" className="w-8 h-8 rounded-lg" />
              </div>
            )}
            <button
              onClick={onClose}
              className="md:hidden p-1 rounded-lg hover:bg-gray-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Navigation (only when expanded) */}
          {!isCollapsed && (
            <div className="flex gap-2">
              <button
                onClick={() => { router.push('/'); onClose(); }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-swar-primary hover:bg-swar-primary-dark rounded-lg text-white text-xs font-medium transition"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Home</span>
              </button>
              <button
                onClick={() => { router.back(); onClose(); }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-white text-xs font-medium transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
            </div>
          )}

          {/* Collapse/Expand Toggle — placed at top for easy access */}
          <button
            onClick={toggleCollapse}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 mt-2 rounded-lg bg-gray-800/60 hover:bg-gray-700 text-gray-400 hover:text-white transition-all"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="text-xs font-medium">Collapse</span>
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
                        className={`flex items-center ${isCollapsed ? 'justify-center' : ''} gap-3 px-3 py-2 rounded-lg transition-all group relative ${
                          active
                            ? 'bg-indigo-600/15 border-l-2 border-indigo-500 -ml-[2px]'
                            : 'hover:bg-gray-800/60'
                        }`}
                      >
                        <Icon className={`h-[16px] w-[16px] flex-shrink-0 transition-colors ${active ? 'text-indigo-400' : 'text-gray-400 group-hover:text-gray-200'}`} />
                        {!isCollapsed && (
                          <span className={`font-medium text-[13px] truncate ${active ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                            {item.label}
                          </span>
                        )}
                        {item.badge && item.badge > 0 && (
                          <span className={`${isCollapsed ? 'absolute -top-0.5 -right-0.5 w-4 h-4 text-[10px]' : 'ml-auto w-5 h-5 text-xs'} bg-red-500 text-white font-bold rounded-full flex items-center justify-center flex-shrink-0`}>
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}
                        {isCollapsed && (
                          <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg border border-gray-700 transition-opacity">
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
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-2 px-3 py-2 rounded-lg transition-all group ${
                    hasActiveItem ? 'bg-indigo-600/10' : 'hover:bg-gray-800/40'
                  }`}
                  title={isCollapsed ? category.label : undefined}
                >
                  <div className="flex items-center gap-2">
                    <CategoryIcon className={`h-4 w-4 flex-shrink-0 ${hasActiveItem ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                    {!isCollapsed && (
                      <span className={`text-xs font-semibold uppercase tracking-wider ${hasActiveItem ? 'text-indigo-300' : 'text-gray-500 group-hover:text-gray-300'}`}>
                        {category.label}
                      </span>
                    )}
                  </div>
                  {!isCollapsed && (
                    <div className="flex items-center gap-1">
                      {totalBadges > 0 && (
                        <span className="w-5 h-5 text-[10px] bg-red-500 text-white font-bold rounded-full flex items-center justify-center">
                          {totalBadges > 99 ? '99+' : totalBadges}
                        </span>
                      )}
                      <ChevronDown className={`h-3.5 w-3.5 text-gray-500 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                    </div>
                  )}
                  {/* Tooltip when collapsed */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg border border-gray-700 transition-opacity">
                      <div className="font-medium">{category.label}</div>
                      <div className="text-[10px] text-gray-400">{category.items.length} items</div>
                    </div>
                  )}
                </button>

                {/* Category Items - collapsible */}
                {(isExpanded || isCollapsed) && (
                  <div className={`${isCollapsed ? '' : 'ml-2 border-l border-gray-800 pl-2'} space-y-0.5 mt-0.5`}>
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
                          className={`flex items-center ${isCollapsed ? 'justify-center' : ''} gap-3 px-3 py-2 rounded-lg transition-all group relative ${
                            active
                              ? 'bg-indigo-600/15 border-l-2 border-indigo-500 -ml-[2px]'
                              : 'hover:bg-gray-800/60'
                          }`}
                        >
                          <Icon className={`h-[16px] w-[16px] flex-shrink-0 transition-colors ${active ? 'text-indigo-400' : 'text-gray-400 group-hover:text-gray-200'}`} />
                          {!isCollapsed && (
                            <span className={`font-medium text-[13px] truncate ${active ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                              {item.label}
                            </span>
                          )}
                          {item.badge && item.badge > 0 && (
                            <span className={`${isCollapsed ? 'absolute -top-0.5 -right-0.5 w-4 h-4 text-[10px]' : 'ml-auto w-5 h-5 text-xs'} bg-red-500 text-white font-bold rounded-full flex items-center justify-center flex-shrink-0`}>
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
                            <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg border border-gray-700 transition-opacity">
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
                    className={`flex items-center ${isCollapsed ? 'justify-center' : ''} gap-3 px-3 py-2.5 rounded-xl transition-all group relative ${
                      active
                        ? 'bg-indigo-600/15 border-l-[3px] border-indigo-500'
                        : 'hover:bg-gray-800/60'
                    }`}
                  >
                    <Icon className={`h-[18px] w-[18px] flex-shrink-0 ${active ? 'text-indigo-400' : 'text-gray-400 group-hover:text-gray-200'}`} />
                    {!isCollapsed && (
                      <span className={`font-medium text-sm ${active ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                        {item.label}
                      </span>
                    )}
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-2.5 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg border border-gray-700 transition-opacity">
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
        <div className={`border-t border-gray-800 flex-shrink-0 ${isCollapsed ? 'p-2' : 'p-3'}`}>
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
              <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg border border-gray-700 transition-opacity">
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
              <div className="absolute left-full ml-2 px-2.5 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg border border-gray-700 transition-opacity">
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
              <div className="absolute left-full ml-2 px-2.5 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg border border-gray-700 transition-opacity">
                Sign Out
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
