'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, LogOut, Target, Flag, CheckSquare, Bell, NotebookPen, HeartPulse, Gem, BarChart3, User, Home } from 'lucide-react';
import HealthTracker from './HealthTracker';
import ServerStatus from './ServerStatus';
import { clearSession } from '@/lib/sessionManager';

const topTabs = [
  { href: '/life-planner/dashboard/vision', label: 'Vision Plan', icon: Target },
  { href: '/life-planner/dashboard/action-plan', label: 'Action Plan', icon: Flag },
  { href: '/life-planner/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/life-planner/dashboard/words', label: 'Words', icon: NotebookPen },
  { href: '/life-planner/dashboard/reminders', label: 'Reminders', icon: Bell },
  { href: '/life-planner/dashboard/health', label: 'Health', icon: HeartPulse },
  { href: '/life-planner/dashboard/diamond-people', label: 'Diamond', icon: Gem },
  { href: '/life-planner/dashboard/progress', label: 'Progress', icon: BarChart3 },
];

export default function LifePlannerTopNav({
  sidebarOpen,
  onToggleSidebar,
}: {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = () => {
    // Life planner uses the same JWT as the rest of the app; clear both the planner keys and the main session.
    localStorage.removeItem('lifePlannerUser');
    localStorage.removeItem('lifePlannerToken');
    clearSession();
    router.push('/life-planner/login');
  };

  return (
    <header className="bg-white border-b border-pink-200 shadow-sm">
      <div className="px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-lg bg-pink-100 hover:bg-pink-200 text-green-700"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <h1 className="text-2xl font-bold text-green-700 flex items-center space-x-2 whitespace-nowrap">
            <span>🗓️</span>
            <span>Life Planner</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <HealthTracker />
          <ServerStatus />
          
          <Link
            href="/life-planner/profile"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === '/life-planner/profile'
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'text-gray-600 hover:text-gray-900 hover:bg-pink-50'
            }`}
          >
            <User className="h-5 w-5" />
            <span className="hidden sm:inline">Profile</span>
          </Link>

          <button
            onClick={logout}
            className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
            title="Logout"
          >
            <LogOut className="h-6 w-6" />
          </button>
        </div>
      </div>

      <div className="border-t border-pink-100 px-2 sm:px-4 md:px-6 py-2 overflow-visible md:overflow-x-auto md:scroll-smooth md:snap-x md:snap-proximity">
        <nav className="grid grid-cols-4 gap-2 md:flex md:items-center md:gap-2 md:min-w-max">
          <Link
            href="/"
            className={`w-full flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 rounded-lg px-2 md:px-3 py-2 text-[11px] md:text-sm font-medium transition-colors text-center md:text-left md:snap-start ${
              pathname === '/'
                ? 'bg-red-100 text-red-700 border border-red-300'
                : 'text-gray-600 hover:text-gray-900 hover:bg-pink-50'
            }`}
            title="Go to Home"
          >
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Link>
          {topTabs.map((tab) => {
            const Icon = tab.icon;
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`w-full flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 rounded-lg px-2 md:px-3 py-2 text-[11px] md:text-sm font-medium transition-colors text-center md:text-left md:snap-start ${
                  active
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-pink-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
