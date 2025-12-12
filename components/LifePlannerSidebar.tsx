'use client';

import Link from 'next/link';
import { CalendarDays, CalendarRange, Calendar, CalendarClock, ChevronRight } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface LifePlannerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LifePlannerSidebar({ isOpen, onClose }: LifePlannerSidebarProps) {
  const pathname = usePathname();
  
  const items = [
    { href: '/life-planner/dashboard/daily', label: 'Daily', icon: CalendarDays, color: 'text-emerald-400' },
    { href: '/life-planner/dashboard/weekly', label: 'Weekly', icon: CalendarRange, color: 'text-blue-400' },
    { href: '/life-planner/dashboard/monthly', label: 'Monthly', icon: Calendar, color: 'text-indigo-400' },
    { href: '/life-planner/dashboard/yearly', label: 'Yearly', icon: CalendarClock, color: 'text-amber-400' },
    { href: '/life-planner/dashboard/calendar', label: 'Calendar', icon: Calendar, color: 'text-pink-400' },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {isOpen ? (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />
      ) : null}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-green-100 text-white transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-green-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center font-bold text-white text-lg">
              LP
            </div>
            <div>
              <h2 className="font-bold text-lg text-green-900">Life Planner</h2>
              <p className="text-xs text-green-700">Dashboard</p>
            </div>
          </div>
          <button onClick={onClose} className="md:hidden p-2 hover:bg-green-200 rounded-lg text-green-900" aria-label="Close sidebar">
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
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all group font-medium ${
                  active
                    ? 'bg-green-300 text-green-900 shadow-md'
                    : 'hover:bg-green-200 text-green-900'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-green-900' : 'text-green-700'}`} />
                <span>{item.label}</span>
                {active && <ChevronRight className="h-5 w-5 ml-auto text-green-900 font-bold" />}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-green-200">
          <div className="text-xs text-green-700">
            <p className="font-semibold text-green-900 mb-2">Planner v1 (demo)</p>
            <p>Vision → Action Plan → Tasks → Reminders</p>
          </div>
        </div>
      </aside>
    </>
  );
}
