'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  CheckSquare,
  Calendar,
  Heart,
  Gem,
  TrendingUp,
  Target,
  Flag,
  ListTodo,
  Bell,
  BookOpen,
  Calculator,
  Loader,
} from 'lucide-react';

type SidebarType = 'dashboard' | 'daily' | 'vision' | 'action-plan' | 'goals' | 'tasks' | 'todos' | 'reminders' | 'words' | 'accounting' | 'journal' | 'events' | 'health' | 'diamond' | 'progress';

// Dynamically import Life Planner pages
const DashboardPage = dynamic(() => import('@/app/life-planner/dashboard/comprehensive-dashboard/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const DailyPage = dynamic(() => import('@/app/life-planner/dashboard/daily/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const VisionPage = dynamic(() => import('@/app/life-planner/dashboard/vision/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const ActionPlanPage = dynamic(() => import('@/app/life-planner/dashboard/action-plan/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const GoalsPage = dynamic(() => import('@/app/life-planner/dashboard/goals/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const TasksPage = dynamic(() => import('@/app/life-planner/dashboard/tasks/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const TodosPage = dynamic(() => import('@/app/life-planner/dashboard/todos/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const RemindersPage = dynamic(() => import('@/app/life-planner/dashboard/reminders/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const WordsPage = dynamic(() => import('@/app/life-planner/dashboard/words/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const CalendarPage = dynamic(() => import('@/app/life-planner/dashboard/calendar/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const AccountingPage = dynamic(() => import('@/app/life-planner/dashboard/accounting/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const NotesPage = dynamic(() => import('@/app/life-planner/dashboard/notes/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const EventsPage = dynamic(() => import('@/app/life-planner/dashboard/events/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const HealthPage = dynamic(() => import('@/app/life-planner/dashboard/health/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const DiamondPage = dynamic(() => import('@/app/life-planner/dashboard/diamond-people/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const ProgressPage = dynamic(() => import('@/app/life-planner/dashboard/progress/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="flex flex-col items-center gap-2">
        <Loader className="animate-spin" size={40} />
        <p className="text-gray-600">Loading page...</p>
      </div>
    </div>
  );
}

export default function PlannerPage() {
  const router = useRouter();
  const [activeSidebar, setActiveSidebar] = useState<SidebarType>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: CheckSquare },
    { id: 'daily', label: 'Daily', icon: CheckSquare },
    { id: 'vision', label: 'Vision', icon: Target },
    { id: 'action-plan', label: 'Action Plan', icon: Flag },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'tasks', label: 'Tasks', icon: ListTodo },
    { id: 'todos', label: 'Todos', icon: CheckSquare },
    { id: 'reminders', label: 'Reminders', icon: Bell },
    { id: 'words', label: 'Words', icon: BookOpen },
    { id: 'accounting', label: 'Accounting', icon: Calculator },
    { id: 'journal', label: 'Journal', icon: BookOpen },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'health', label: 'Health', icon: Heart },
    { id: 'diamond', label: 'Diamond', icon: Gem },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
  ] as const;

  const renderContent = () => {
    switch (activeSidebar) {
      case 'dashboard':
        return <DashboardPage />;
      case 'daily':
        return <DailyPage />;
      case 'vision':
        return <VisionPage />;
      case 'action-plan':
        return <ActionPlanPage />;
      case 'goals':
        return <GoalsPage />;
      case 'tasks':
        return <TasksPage />;
      case 'todos':
        return <TodosPage />;
      case 'reminders':
        return <RemindersPage />;
      case 'words':
        return <WordsPage />;
      case 'accounting':
        return <AccountingPage />;
      case 'journal':
        return <NotesPage />;
      case 'events':
        return <EventsPage />;
      case 'health':
        return <HealthPage />;
      case 'diamond':
        return <DiamondPage />;
      case 'progress':
        return <ProgressPage />;
      default:
        return <DailyPage />;
    }
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-gradient-to-b from-emerald-700 to-emerald-800 text-white transition-all duration-300 overflow-hidden flex-shrink-0`}>
        <div className="h-full flex flex-col p-4 space-y-3 overflow-y-auto">
          <h3 className="text-lg font-bold text-emerald-100 mb-4">Planner</h3>
          {sidebarItems.map(item => {
            const Icon = item.icon;
            const isActive = activeSidebar === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSidebar(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left font-medium ${
                  isActive
                    ? 'bg-white text-emerald-700 shadow-lg'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with Back Arrow */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/admin/crm')}
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-700 font-semibold"
          >
            <ArrowLeft size={20} />
            <span className="hidden sm:inline">Back to CRM</span>
            <span className="sm:hidden">Back</span>
          </button>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-700"
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto bg-gray-50">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
