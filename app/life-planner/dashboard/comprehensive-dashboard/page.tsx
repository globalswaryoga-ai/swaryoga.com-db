'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, Edit2, CheckCircle2, Circle, Calendar, DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';
import type { Vision, ActionPlan, Goal, Task, Todo, Reminder, Word } from '@/lib/types/lifePlanner';

type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'vision';

interface DashboardData {
  visions: Vision[];
  actionPlans: ActionPlan[];
  goals: Goal[];
  tasks: Task[];
  todos: Todo[];
  reminders: Reminder[];
  words: Word[];
}

interface ExpandedVisionData {
  visionId: string;
  vision: Vision;
  actionPlans: ActionPlan[];
  goals: Goal[];
  tasks: Task[];
  todos: Todo[];
  reminders: Reminder[];
  words: Word[];
}

export default function ComprehensiveDashboardPage() {
  const router = useRouter();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('daily');
  const [data, setData] = useState<DashboardData>({
    visions: [],
    actionPlans: [],
    goals: [],
    tasks: [],
    todos: [],
    reminders: [],
    words: [],
  });
  const [expandedVisions, setExpandedVisions] = useState<Set<string>>(new Set());
  const [expandedData, setExpandedData] = useState<Map<string, ExpandedVisionData>>(new Map());
  const [mounted, setMounted] = useState(false);

  // Load all data on mount
  useEffect(() => {
    setMounted(true);
    (async () => {
      const [visions, actionPlans, goals, tasks, todos, reminders, words] = await Promise.all([
        lifePlannerStorage.getVisions(),
        lifePlannerStorage.getActionPlans(),
        lifePlannerStorage.getGoals(),
        lifePlannerStorage.getTasks(),
        lifePlannerStorage.getTodos(),
        lifePlannerStorage.getReminders(),
        lifePlannerStorage.getWords(),
      ]);

      const newData: DashboardData = {
        visions: Array.isArray(visions) ? visions : [],
        actionPlans: Array.isArray(actionPlans) ? actionPlans : [],
        goals: Array.isArray(goals) ? goals : [],
        tasks: Array.isArray(tasks) ? tasks : [],
        todos: Array.isArray(todos) ? todos : [],
        reminders: Array.isArray(reminders) ? reminders : [],
        words: Array.isArray(words) ? words : [],
      };

      setData(newData);

      // Pre-cache all related data for vision expansion
      const dataMap = new Map<string, ExpandedVisionData>();
      newData.visions.forEach(vision => {
        dataMap.set(vision.id, {
          visionId: vision.id,
          vision,
          actionPlans: newData.actionPlans.filter(ap => ap.visionId === vision.id),
          goals: newData.goals.filter(g => g.visionId === vision.id),
          tasks: newData.tasks.filter(t => t.visionId === vision.id),
          todos: newData.todos,
          reminders: newData.reminders.filter(r => r.visionId === vision.id),
          words: newData.words.filter(w => w.visionId === vision.id),
        });
      });

      setExpandedData(dataMap);
    })();
  }, []);

  const handleVisionToggleCompleted = async (visionId: string) => {
    const vision = data.visions.find(v => v.id === visionId);
    if (vision) {
      const updated = { ...vision, completed: !vision.completed };
      const newVisions = data.visions.map(v => v.id === visionId ? updated : v);
      setData(prev => ({ ...prev, visions: newVisions }));
      await lifePlannerStorage.saveVisions(newVisions);
    }
  };

  const handleEdit = (visionId: string) => {
    router.push(`/life-planner/dashboard/visions?edit=${visionId}`);
  };

  const toggleExpanded = (visionId: string) => {
    const newSet = new Set(expandedVisions);
    if (newSet.has(visionId)) {
      newSet.delete(visionId);
    } else {
      newSet.add(visionId);
    }
    setExpandedVisions(newSet);
  };

  if (!mounted) return null;

  const getDailyStats = () => {
    const today = new Date().toISOString().split('T')[0];
    return {
      words: data.words.filter(w => w.createdAt?.includes(today)).length,
      reminders: data.reminders.filter(r => r.createdAt?.includes(today)).length,
      todos: data.todos.filter(t => t.createdAt?.includes(today)).length,
      tasks: data.tasks.filter(t => t.createdAt?.includes(today)).length,
      goals: data.goals.filter(g => g.createdAt?.includes(today)).length,
    };
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#000000' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#00FF00' }}>Life Planner Dashboard</h1>
          <p style={{ color: '#FFFFFF' }}>Track your progress across different time periods</p>
        </div>

        {/* Time Period Buttons */}
        <div className="flex flex-wrap gap-3 mb-8">
          {(['daily', 'weekly', 'monthly', 'yearly', 'vision'] as TimePeriod[]).map(period => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className="px-6 py-3 rounded-lg font-semibold transition-all capitalize"
              style={{
                backgroundColor: timePeriod === period ? '#FFFF00' : '#333333',
                color: timePeriod === period ? '#000000' : '#FFFF00',
                border: '2px solid #FFFF00',
              }}
            >
              {period}
            </button>
          ))}
        </div>

        {/* Daily View */}
        {timePeriod === 'daily' && <DailyView data={data} stats={getDailyStats()} />}

        {/* Weekly View */}
        {timePeriod === 'weekly' && <WeeklyView data={data} />}

        {/* Monthly View */}
        {timePeriod === 'monthly' && <MonthlyView data={data} />}

        {/* Yearly View */}
        {timePeriod === 'yearly' && <YearlyView data={data} />}

        {/* Vision View */}
        {timePeriod === 'vision' && (
          <VisionView
            visions={data.visions}
            expandedVisions={expandedVisions}
            expandedData={expandedData}
            onToggleExpanded={toggleExpanded}
            onToggleCompleted={handleVisionToggleCompleted}
            onEdit={handleEdit}
          />
        )}
      </div>
    </div>
  );
}

function DailyView({ data, stats }: { data: DashboardData; stats: Record<string, number> }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <StatCard label="Words" count={stats.words} icon="✨" />
      <StatCard label="Reminders" count={stats.reminders} icon="🔔" />
      <StatCard label="Todos" count={stats.todos} icon="☐" />
      <StatCard label="Tasks" count={stats.tasks} icon="✓" />
      <StatCard label="Goals" count={stats.goals} icon="🎯" />
    </div>
  );
}

function WeeklyView({ data }: { data: DashboardData }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Words" count={data.words.length} icon="✨" />
      <StatCard label="Reminders" count={data.reminders.length} icon="🔔" />
      <StatCard label="Todos" count={data.todos.length} icon="☐" />
      <StatCard label="Tasks" count={data.tasks.length} icon="✓" />
      <StatCard label="Goals" count={data.goals.length} icon="🎯" />
      <StatCard label="Actions" count={data.actionPlans.length} icon="📋" />
      <StatCard label="Visions" count={data.visions.length} icon="🎪" />
    </div>
  );
}

function MonthlyView({ data }: { data: DashboardData }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Words" count={data.words.length} icon="✨" />
      <StatCard label="Reminders" count={data.reminders.length} icon="🔔" />
      <StatCard label="Todos" count={data.todos.length} icon="☐" />
      <StatCard label="Tasks" count={data.tasks.length} icon="✓" />
      <StatCard label="Goals" count={data.goals.length} icon="🎯" />
      <StatCard label="Actions" count={data.actionPlans.length} icon="📋" />
      <StatCard label="Visions" count={data.visions.length} icon="🎪" />
    </div>
  );
}

function YearlyView({ data }: { data: DashboardData }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Words" count={data.words.length} icon="✨" />
      <StatCard label="Reminders" count={data.reminders.length} icon="🔔" />
      <StatCard label="Todos" count={data.todos.length} icon="☐" />
      <StatCard label="Tasks" count={data.tasks.length} icon="✓" />
      <StatCard label="Goals" count={data.goals.length} icon="🎯" />
      <StatCard label="Actions" count={data.actionPlans.length} icon="📋" />
      <StatCard label="Visions" count={data.visions.length} icon="🎪" />
    </div>
  );
}

function StatCard({ label, count, icon }: { label: string; count: number; icon: string }) {
  return (
    <div
      className="rounded-lg p-6 flex flex-col items-center justify-center"
      style={{
        backgroundColor: '#1a1a1a',
        borderColor: '#FFFF00',
        border: '2px solid',
      }}
    >
      <div className="text-4xl mb-3">{icon}</div>
      <div style={{ color: '#FFFFFF' }} className="text-sm font-semibold mb-2">
        {label}
      </div>
      <div style={{ color: '#00FF00' }} className="text-3xl font-bold">
        {count}
      </div>
    </div>
  );
}

interface VisionViewProps {
  visions: Vision[];
  expandedVisions: Set<string>;
  expandedData: Map<string, ExpandedVisionData>;
  onToggleExpanded: (visionId: string) => void;
  onToggleCompleted: (visionId: string) => void;
  onEdit: (visionId: string) => void;
}

function VisionView({
  visions,
  expandedVisions,
  expandedData,
  onToggleExpanded,
  onToggleCompleted,
  onEdit,
}: VisionViewProps) {
  return (
    <div>
      {visions.length === 0 ? (
        <div
          className="text-center py-12 rounded-lg"
          style={{ borderColor: '#FFFF00', border: '2px solid', backgroundColor: '#1a1a1a' }}
        >
          <p style={{ color: '#FFFFFF' }} className="text-lg mb-4">
            No visions created yet
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visions.map(vision => (
            <div
              key={vision.id}
              className="rounded-lg overflow-hidden transition-all duration-200"
              style={{
                borderColor: '#FFFF00',
                border: '3px solid',
                backgroundColor: '#1a1a1a',
              }}
            >
              {/* Card Header with Image */}
              <div className="relative h-32 bg-gray-800 overflow-hidden">
                {vision.imageUrl && (
                  <img
                    src={vision.imageUrl}
                    alt={vision.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=Vision';
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
              </div>

              {/* Card Content */}
              <div className="p-4">
                {/* Title and Completed Checkbox */}
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-bold flex-1" style={{ color: '#00FF00' }}>
                    {vision.title}
                  </h3>
                  <button onClick={() => onToggleCompleted(vision.id)} className="ml-2 transition-all">
                    {vision.completed ? (
                      <CheckCircle2 size={24} style={{ color: '#00FF00' }} />
                    ) : (
                      <Circle size={24} style={{ color: '#FFFFFF' }} />
                    )}
                  </button>
                </div>

                {/* Date and Amount */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2" style={{ color: '#FFFFFF' }}>
                    <Calendar size={16} />
                    <span className="text-sm">Due: {new Date((vision as any).targetDate || '').toLocaleDateString()}</span>
                  </div>
                  {(vision as any).amount && (
                    <div className="flex items-center gap-2" style={{ color: '#FFFFFF' }}>
                      <DollarSign size={16} />
                      <span className="text-sm">₹{parseFloat((vision as any).amount).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Description Preview */}
                <p style={{ color: '#CCCCCC' }} className="text-sm line-clamp-2 mb-4">
                  {vision.description}
                </p>

                {/* Action Buttons */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => onEdit(vision.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all font-semibold"
                    style={{ backgroundColor: '#FFFF00', color: '#000000', borderColor: '#FFFF00', border: '1px solid' }}
                  >
                    <Edit2 size={16} />
                    Edit
                  </button>
                  <button
                    onClick={() => onToggleExpanded(vision.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all font-semibold"
                    style={{ backgroundColor: '#333333', color: '#FFFF00', borderColor: '#FFFF00', border: '2px solid' }}
                  >
                    {expandedVisions.has(vision.id) ? (
                      <>
                        <ChevronUp size={16} />
                        Hide Details
                      </>
                    ) : (
                      <>
                        <ChevronDown size={16} />
                        Show Details
                      </>
                    )}
                  </button>
                </div>

                {/* Expanded Details */}
                {expandedVisions.has(vision.id) && expandedData.has(vision.id) && (
                  <ExpandedVisionDetails data={expandedData.get(vision.id)!} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ExpandedVisionDetailsProps {
  data: ExpandedVisionData;
}

function ExpandedVisionDetails({ data }: ExpandedVisionDetailsProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['actionPlans']));
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(section)) {
      newSet.delete(section);
    } else {
      newSet.add(section);
    }
    setExpandedSections(newSet);
  };

  const toggleItemCompletion = async (itemType: string, itemId: string, item: any) => {
    const key = `${itemType}-${itemId}`;
    const isCompleted = completedItems.has(key);
    const newCompletedSet = new Set(completedItems);

    if (isCompleted) {
      newCompletedSet.delete(key);
    } else {
      newCompletedSet.add(key);
    }

    setCompletedItems(newCompletedSet);

    // Save to database
    try {
      const updatedItem = { ...item, completed: !isCompleted, updatedAt: new Date().toISOString() };

      if (itemType === 'actionPlans') {
        await lifePlannerStorage.saveActionPlans(data.actionPlans.map(ap => ap.id === itemId ? updatedItem : ap));
      } else if (itemType === 'goals') {
        await lifePlannerStorage.saveGoals(data.goals.map(g => g.id === itemId ? updatedItem : g));
      } else if (itemType === 'tasks') {
        await lifePlannerStorage.saveTasks(data.tasks.map(t => t.id === itemId ? updatedItem : t));
      } else if (itemType === 'todos') {
        await lifePlannerStorage.saveTodos(data.todos.map(t => t.id === itemId ? updatedItem : t));
      } else if (itemType === 'reminders') {
        await lifePlannerStorage.saveReminders(data.reminders.map(r => r.id === itemId ? updatedItem : r));
      } else if (itemType === 'words') {
        await lifePlannerStorage.saveWords(data.words.map(w => w.id === itemId ? updatedItem : w));
      }
    } catch (error) {
      console.error('Error updating item completion:', error);
    }
  };

  const sections = [
    { id: 'actionPlans', label: '📋 Action Plans', items: data.actionPlans, type: 'actionPlans', property: 'title' },
    { id: 'goals', label: '🎯 Goals', items: data.goals, type: 'goals', property: 'title' },
    { id: 'tasks', label: '✓ Tasks', items: data.tasks, type: 'tasks', property: 'title' },
    { id: 'todos', label: '☐ Todos', items: data.todos, type: 'todos', property: 'title' },
    { id: 'reminders', label: '🔔 Reminders', items: data.reminders, type: 'reminders', property: 'title' },
    { id: 'words', label: '✨ Words', items: data.words, type: 'words', property: 'title' },
  ];

  return (
    <div className="mt-4 pt-4" style={{ borderTopColor: '#FFFF00', borderTopWidth: '2px' }}>
      <p style={{ color: '#00FF00' }} className="text-sm font-semibold mb-3">
        Related Entities
      </p>

      <div className="space-y-2">
        {sections.map(section => (
          <div key={section.id}>
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between p-2 rounded transition-all"
              style={{ backgroundColor: '#222222', color: '#FFFF00' }}
            >
              <span className="font-semibold text-sm">
                {section.label} ({section.items.length})
              </span>
              {expandedSections.has(section.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {expandedSections.has(section.id) && section.items.length > 0 && (
              <div className="mt-1 pl-4 space-y-1">
                {section.items.slice(0, 5).map((item: any) => {
                  const itemKey = `${section.type}-${item.id}`;
                  const isCompleted = completedItems.has(itemKey) || item.completed;
                  const itemName = item[section.property] || item.name || 'Untitled';

                  return (
                    <div key={item.id} className="flex items-center gap-2 text-xs py-1" style={{ color: '#CCCCCC' }}>
                      <button
                        onClick={() => toggleItemCompletion(section.type, item.id, item)}
                        className="flex-shrink-0 transition-all"
                      >
                        {isCompleted ? (
                          <CheckCircle2 size={16} style={{ color: '#00FF00' }} />
                        ) : (
                          <Circle size={16} style={{ color: '#FFFFFF' }} />
                        )}
                      </button>
                      <span style={{ textDecoration: isCompleted ? 'line-through' : 'none', opacity: isCompleted ? 0.6 : 1 }}>
                        {itemName}
                      </span>
                    </div>
                  );
                })}
                {section.items.length > 5 && (
                  <p className="text-xs" style={{ color: '#999999' }}>
                    +{section.items.length - 5} more
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
