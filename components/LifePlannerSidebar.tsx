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
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession } from '@/lib/sessionManager';

interface LifePlannerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LifePlannerSidebar({ isOpen, onClose }: LifePlannerSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  const handleNavClick = () => {
    // Auto-close sidebar on mobile when a link is clicked
    if (window.innerWidth < 768) {
      onClose();
    }
  };
  
  const items = [
    // User requested: Life Planner "Home" should go to main website homepage
    { href: '/', label: 'Home', icon: Home },
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
  ];

  const isActive = (href: string) => pathname === href;

  const logout = () => {
    localStorage.removeItem('lifePlannerUser');
    localStorage.removeItem('lifePlannerToken');
    clearSession();
    router.push('/life-planner/login');
  };

  return (
    <>
      {isOpen ? (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />
      ) : null}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-swar-primary text-white transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-swar-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img
              src="https://i.postimg.cc/xTPRSY4X/swar_yoga_new_logo.png"
              alt="Swar Yoga Logo"
              className="w-10 h-10 rounded-lg bg-white/10 p-1"
            />
            <div>
              <h2 className="font-bold text-lg text-white">Life Planner</h2>
              <p className="text-xs text-swar-primary-light">Dashboard</p>
            </div>
          </div>
          <button onClick={onClose} className="md:hidden p-2 hover:bg-swar-primary-hover rounded-lg text-white" aria-label="Close sidebar">
            ✕
          </button>
        </div>

        <nav className="p-6 space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={`flex cursor-pointer items-center space-x-3 px-4 py-3 rounded-lg transition-all group font-medium ${
                  active
                    ? 'bg-swar-accent text-white shadow-md'
                    : 'text-swar-primary-light hover:bg-swar-accent/20 hover:text-white'
                }`}
              >
                <Icon
                  className={`h-5 w-5 transition-colors ${
                    active ? 'text-white' : 'text-swar-primary-light group-hover:text-white'
                  }`}
                />
                <span>{item.label}</span>
                {active && <ChevronRight className="h-5 w-5 ml-auto text-white font-bold" />}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-swar-border">
          <div className="text-xs text-swar-primary-light">
            <p className="font-semibold text-white mb-2">Planner v1 (demo)</p>
            <p>Vision Plan → Action Plan → Tasks → Reminders</p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 hover:bg-white/20 text-white px-4 py-3 font-semibold transition-colors"
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
