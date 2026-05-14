'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  DollarSign,
  Eye,
} from 'lucide-react';

type TabType = 'daily' | 'calendar' | 'health' | 'diamond' | 'progress';
type SidebarType = 'daily' | 'vision' | 'action-plan' | 'goals' | 'tasks' | 'todos' | 'reminders' | 'words' | 'accounting' | 'journal' | 'events';

export default function PlannerPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('daily');
  const [activeSidebar, setActiveSidebar] = useState<SidebarType>('daily');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const tabs = [
    { id: 'daily', label: 'Daily', icon: CheckSquare },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'health', label: 'Health', icon: Heart },
    { id: 'diamond', label: 'Diamond', icon: Gem },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
  ] as const;

  const sidebarItems = [
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
  ] as const;

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-gradient-to-b from-emerald-700 to-emerald-800 text-white transition-all duration-300 overflow-hidden flex-shrink-0`}>
        <div className="h-full flex flex-col p-4 space-y-3 overflow-y-auto">
          <h3 className="text-lg font-bold text-emerald-100 mb-4">Planner Menu</h3>
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
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            {/* Back Button */}
            <button
              onClick={() => router.push('/admin/crm')}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-700 font-semibold"
            >
              <ArrowLeft size={20} />
              Back to CRM
            </button>

            {/* Toggle Sidebar Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {sidebarOpen ? '✕' : '☰'}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {tabs.find(t => t.id === activeTab)?.label} - {sidebarItems.find(s => s.id === activeSidebar)?.label}
              </h2>
              <p className="text-gray-600 mb-6">
                Content for <strong>{activeSidebar}</strong> page in <strong>{activeTab}</strong> view.
              </p>
              <div className="text-center py-12 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg">
                <p className="text-gray-700 font-medium">📋 Planner pages will be integrated here</p>
                <p className="text-gray-600 text-sm mt-2">Tab: {activeTab} | Page: {activeSidebar}</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
