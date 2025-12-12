'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, LogOut, Target, Flag, CheckSquare, ListChecks, Bell, NotebookPen, HeartPulse, Gem, BarChart3, User } from 'lucide-react';
import HealthTracker from './HealthTracker';

const topTabs = [
  { href: '/life-planner/dashboard/vision', label: 'Vision', icon: Target },
  { href: '/life-planner/dashboard/goals', label: 'Goals', icon: Flag },
  { href: '/life-planner/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/life-planner/dashboard/todos', label: 'Todos', icon: ListChecks },
  { href: '/life-planner/dashboard/words', label: 'Words', icon: NotebookPen },
  { href: '/life-planner/dashboard/reminders', label: 'Reminders', icon: Bell },
  { href: '/life-planner/dashboard/health-routines', label: 'Health', icon: HeartPulse },
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
    localStorage.removeItem('lifePlannerUser');
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

      <div className="border-t border-pink-100 px-4 md:px-6 py-2 overflow-x-auto">
        <nav className="flex items-center gap-2 min-w-max">
          {topTabs.map((tab) => {
            const Icon = tab.icon;
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
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
