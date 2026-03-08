'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
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
  DollarSign,
  Globe,
  Settings,
  Phone,
  Bot,
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
} from 'lucide-react';

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
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string>('admin');
  const [permissionsV2, setPermissionsV2] = useState<any>(null);
  const [localCollapsed, setLocalCollapsed] = useState(false);
  
  // Storage usage state
  const [storageUsage, setStorageUsage] = useState<{
    display: string;
    totalGB: number;
    monthlyCostINR: number;
    monthlyCostUSD: number;
    percentage: number;
  } | null>(null);
  const [storageHidden, setStorageHidden] = useState(false);
  const [isIndiaUser, setIsIndiaUser] = useState(true);

  const isCollapsed = onToggleCollapse ? collapsed : localCollapsed;
  const toggleCollapse = onToggleCollapse || (() => setLocalCollapsed(!localCollapsed));

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

    const superAdmin =
      resolvedUserId === 'admin' ||
      resolvedUserId === 'admincrm' ||
      legacyPerms.includes('all') ||
      pv2?.isSuperAdmin === true;

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

  // Fetch storage usage
  useEffect(() => {
    if (!token) return;
    
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
            monthlyCostINR: json.data.monthlyCost || 0,
            monthlyCostUSD: json.data.monthlyCostUSD || Math.ceil(json.data.totalGB * 0.42), // ~$0.42/GB
            percentage,
          });
        }
      } catch {
        // Silently fail
      }
    };

    // Fetch after a delay to not block initial render
    const timeout = setTimeout(fetchStorageUsage, 2000);
    return () => clearTimeout(timeout);
  }, [token]);

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

  // ===== MAIN SIDEBAR ITEMS =====
  const sidebarItems: {
    icon: React.ElementType;
    label: string;
    href: string;
    color: string;
    module: string;
    badge?: number;
  }[] = [
    {
      icon: LayoutDashboard,
      label: 'Dashboard',
      href: '/admin/crm',
      color: 'text-blue-400',
      module: 'dashboard',
    },
    {
      icon: Monitor,
      label: 'Web Admin',
      href: '/admin/crm/web-admin',
      color: 'text-orange-400',
      module: 'dashboard',
    },
    {
      icon: FileText,
      label: 'Landing Pages',
      href: '/admin/landing-pages',
      color: 'text-rose-400',
      module: 'dashboard',
    },
    {
      icon: Calculator,
      label: 'Tally',
      href: '/admin/crm/tally',
      color: 'text-yellow-400',
      module: 'dashboard',
    },
    {
      icon: DollarSign,
      label: 'Sales & Funnel',
      href: '/admin/crm/funnel/manage',
      color: 'text-green-400',
      module: 'payments',
    },
    {
      icon: MessageCircle,
      label: 'Meta WhatsApp',
      href: '/admin/crm/meta',
      color: 'text-cyan-400',
      module: 'whatsapp',
      badge: unreadCount,
    },
    {
      icon: Radio,
      label: 'Broadcast',
      href: '/admin/crm/broadcast',
      color: 'text-pink-400',
      module: 'broadcasts',
    },
    {
      icon: Mail,
      label: 'Email',
      href: '/admin/crm/email',
      color: 'text-blue-400',
      module: 'email',
    },
    {
      icon: Globe,
      label: 'Community',
      href: '/admin/crm/community',
      color: 'text-teal-400',
      module: 'community',
    },
    {
      icon: QrCode,
      label: 'QR WhatsApp',
      href: '/admin/crm/qr',
      color: 'text-emerald-400',
      module: 'whatsapp',
    },
    {
      icon: Bot,
      label: 'AI & Chatbot',
      href: '/admin/crm/chatbots',
      color: 'text-violet-400',
      module: 'whatsapp',
    },
    {
      icon: Phone,
      label: 'Call',
      href: '/admin/crm/calls',
      color: 'text-emerald-400',
      module: 'calls',
    },
    {
      icon: SmartphoneNfc,
      label: 'SMS Management',
      href: '/admin/crm/messages',
      color: 'text-indigo-400',
      module: 'messages',
    },
    {
      icon: BarChart3,
      label: 'All Reports',
      href: '/admin/crm/analytics',
      color: 'text-purple-400',
      module: 'analytics',
    },
    {
      icon: Languages,
      label: 'Translator',
      href: '/admin/crm/translate',
      color: 'text-cyan-400',
      module: 'translate',
    },
  ];

  // Super admin only items
  const superAdminItems = [
    {
      icon: GraduationCap,
      label: 'E-Learning',
      href: '/admin/crm/e-learning',
      color: 'text-lime-400',
    },
    {
      icon: Building2,
      label: 'Tenants',
      href: '/admin/crm/tenants',
      color: 'text-indigo-400',
    },
    {
      icon: Shield,
      label: 'Permissions',
      href: '/admin/crm/permissions',
      color: 'text-red-400',
    },
    {
      icon: Activity,
      label: 'Admin Activity',
      href: '/admin/crm/admin-activity',
      color: 'text-yellow-400',
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

        {/* Main Navigation */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {sidebarItems.filter(item => hasModuleAccess(item.module)).map((item) => {
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
                    ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/20 border-l-[3px] border-indigo-400'
                    : 'hover:bg-gray-800/60'
                }`}
              >
                <Icon className={`h-[18px] w-[18px] flex-shrink-0 transition-colors ${active ? 'text-indigo-400' : item.color + ' group-hover:text-white'}`} />
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
                {/* Tooltip when collapsed */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2.5 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg border border-gray-700 transition-opacity">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}

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
                        ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/20 border-l-[3px] border-indigo-400'
                        : 'hover:bg-gray-800/60'
                    }`}
                  >
                    <Icon className={`h-[18px] w-[18px] flex-shrink-0 ${active ? 'text-indigo-400' : item.color + ' group-hover:text-white'}`} />
                    {!isCollapsed && (
                      <span className={`font-medium text-[13px] ${active ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
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
        </div>
      </aside>
    </>
  );
}
