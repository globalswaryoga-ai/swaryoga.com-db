'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  Bell,
  Calculator,
  ChevronRight,
  Download,
  Flag,
  Home,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Calendar,
  NotebookPen,
  Target,
  Settings,
  User,
  X,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession } from '@/lib/sessionManager';
import { useEffect, useState } from 'react';

interface LifePlannerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LifePlannerSidebar({ isOpen, onClose }: LifePlannerSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCrm, setIsCrm] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname.startsWith('crm.')) {
      setIsCrm(true);
    }
  }, []);
  
  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (window.innerWidth < 768) {
      onClose();
    }
  }, [pathname, onClose]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  const handleNavClick = () => {
    // Auto-close sidebar on mobile when a link is clicked
    if (window.innerWidth < 768) {
      onClose();
    }
  };
  
  const items = [
    // On CRM domain, Home goes to CRM dashboard; on main site, to website homepage
    { href: isCrm ? '/admin/crm' : '/', label: 'Home', icon: Home },
    // Keep a dedicated link to open the Life Planner dashboard
    { href: '/life-planner/dashboard', label: 'Life Planner', icon: LayoutDashboard },
    { href: '/life-planner/dashboard/vision', label: 'Vision Plan', icon: Target },
    { href: '/life-planner/dashboard/action-plan', label: 'Action Plan', icon: Flag },

    { href: '/life-planner/dashboard/tasks', label: 'Tasks', icon: ListTodo },


    { href: '/life-planner/dashboard/reminders', label: 'Reminders', icon: Bell },
    { href: '/life-planner/dashboard/words', label: 'Words', icon: NotebookPen },
    { href: '/life-planner/dashboard/notes', label: 'Journal', icon: NotebookPen },
    { href: '/life-planner/dashboard/vision-download', label: 'Vision Download', icon: Download },

    { href: '/life-planner/dashboard/accounting', label: 'Accounting', icon: Calculator },
    { href: '/life-planner/dashboard/events', label: 'Events', icon: Calendar },

    // Unified profile + settings
    { href: '/life-planner/profile', label: 'Profile', icon: User },
    { href: '/life-planner/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  const isActive = (href: string) => pathname === href;

  const logout = () => {
    clearSession();
    router.push('/life-planner/login');
  };

  return (
    <>
      {/* Mobile Backdrop with blur */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300" 
          onClick={onClose} 
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 md:w-64 bg-gradient-to-b from-swar-primary to-emerald-800 text-white transform transition-all duration-300 ease-out shadow-2xl md:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src="/logo.png"
              alt="Swar Yoga Logo"
              className="w-10 h-10 rounded-xl bg-white/10 p-1 shadow-lg"
            />
            <div>
              <h2 className="font-bold text-lg text-white">Life Planner</h2>
              <p className="text-xs text-emerald-200">Dashboard</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="md:hidden p-2.5 hover:bg-white/10 rounded-xl text-white transition-colors active:scale-95" 
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-3 md:p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-200px)] scrollbar-thin">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={`flex cursor-pointer items-center space-x-3 px-4 py-3.5 md:py-3 rounded-xl transition-all group font-medium active:scale-[0.98] ${
                  active
                    ? 'bg-white text-swar-primary shadow-lg'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon
                  className={`h-5 w-5 transition-colors flex-shrink-0 ${
                    active ? 'text-swar-primary' : 'text-white/70 group-hover:text-white'
                  }`}
                />
                <span className="truncate">{item.label}</span>
                {active && <ChevronRight className="h-5 w-5 ml-auto text-swar-primary flex-shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-gradient-to-t from-emerald-900/50 to-transparent">
          <div className="text-xs text-emerald-200 mb-3 px-2">
            <p className="font-semibold text-white">Planner v1</p>
            <p className="mt-1 opacity-75">Vision → Action → Tasks</p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-white px-4 py-3 font-semibold transition-all active:scale-[0.98]"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
