'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Leaf,
} from 'lucide-react';

// Error boundary for render errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('Planner error boundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Oops, something went wrong</h2>
          <p className="text-gray-600 mb-4">{this.state.error?.message || 'Unknown error'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

type SidebarType = 'dashboard' | 'calendar' | 'daily' | 'vision' | 'vision-download' | 'action-plan' | 'goals' | 'tasks' | 'todos' | 'reminders' | 'words' | 'ritucharya' | 'accounting' | 'journal' | 'events' | 'health' | 'diamond' | 'progress';

// Dynamically import Life Planner pages
const DashboardPage = dynamic(() => import('@/app/admin/crm/planner-dashboard/comprehensive-dashboard/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const DailyPage = dynamic(() => import('@/app/admin/crm/planner-dashboard/daily/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const VisionPage = dynamic(() => import('@/app/admin/crm/planner-dashboard/vision/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const VisionDownloadPage = dynamic(() => import('@/app/admin/crm/planner-dashboard/vision-download/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const ActionPlanPage = dynamic(() => import('@/app/admin/crm/planner-dashboard/action-plan/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const GoalsPage = dynamic(() => import('@/app/admin/crm/planner-dashboard/goals/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const TasksPage = dynamic(() => import('@/app/admin/crm/planner-dashboard/tasks/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const TodosPage = dynamic(() => import('@/app/admin/crm/planner-dashboard/todos/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const RemindersPage = dynamic(() => import('@/app/admin/crm/planner-dashboard/reminders/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const WordsPage = dynamic(() => import('@/app/admin/crm/planner-dashboard/words/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
// const RitucharyaPage = dynamic(() => import('@/app/admin/crm/planner/ritucharya/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const CalendarPage = dynamic(() => import('@/app/admin/crm/planner-dashboard/calendar/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const AccountingPage = dynamic(() => import('@/app/admin/crm/planner-dashboard/accounting/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const NotesPage = dynamic(() => import('@/app/admin/crm/planner-dashboard/notes/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const EventsPage = dynamic(() => import('@/app/admin/crm/planner-dashboard/events/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const HealthPage = dynamic(() => import('@/app/admin/crm/planner-dashboard/health/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const DiamondPage = dynamic(() => import('@/app/admin/crm/planner-dashboard/diamond-people/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });
const ProgressPage = dynamic(() => import('@/app/admin/crm/planner-dashboard/progress/page').then(mod => mod.default), { loading: () => <LoadingSpinner /> });

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

function PlannerPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeSidebar, setActiveSidebar] = useState<SidebarType>('dashboard');
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // On mobile, sidebar starts closed; on desktop, it starts open
  React.useEffect(() => {
    setMounted(true);
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    setSidebarOpen(!isMobile);
  }, []);

  // Handle section query parameter (e.g., ?section=health)
  useEffect(() => {
    const section = searchParams.get('section');
    if (section) {
      setActiveSidebar(section as SidebarType);
    }
  }, [searchParams]);

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: CheckSquare },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'daily', label: 'Daily', icon: CheckSquare },
    { id: 'vision', label: 'Vision', icon: Target },
    { id: 'action-plan', label: 'Action Plan', icon: Flag },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'tasks', label: 'Tasks', icon: ListTodo },
    { id: 'todos', label: 'Todos', icon: CheckSquare },
    { id: 'reminders', label: 'Reminders', icon: Bell },
    { id: 'words', label: 'Words', icon: BookOpen },
    // { id: 'ritucharya', label: 'Ritucharya', icon: Leaf },
    { id: 'accounting', label: 'Accounting', icon: Calculator },
    { id: 'journal', label: 'Journal', icon: BookOpen },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'health', label: 'Health', icon: Heart },
    { id: 'diamond', label: 'Diamond', icon: Gem },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
    { id: 'vision-download', label: 'Download Vision', icon: Calendar },
  ] as const;

  const renderContent = () => {
    switch (activeSidebar) {
      case 'dashboard':
        return <DashboardPage />;
      case 'calendar':
        return <CalendarPage />;
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
      // case 'ritucharya':
      //   return <RitucharyaPage />;
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
      case 'vision-download':
        return <VisionDownloadPage />;
      default:
        return <DailyPage />;
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:relative h-full z-40 md:z-auto bg-gradient-to-b from-emerald-700 to-emerald-800 text-white transition-all duration-300 overflow-hidden flex-shrink-0 ${
        sidebarOpen ? 'w-64' : 'w-0'
      }`}>
        <div className="h-full flex flex-col p-3 md:p-4 space-y-2 md:space-y-3 overflow-y-auto">
          <h3 className="text-base md:text-lg font-bold text-emerald-100 mb-2 md:mb-4">Planner</h3>
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
            className="md:hidden p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-700"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {sidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
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

export default function PlannerPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner />}>
        <PlannerPageContent />
      </Suspense>
    </ErrorBoundary>
  );
}
