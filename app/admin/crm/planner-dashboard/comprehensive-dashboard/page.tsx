'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Edit2,
  CheckCircle2,
  Circle,
  Calendar,
  DollarSign,
  Sparkles,
  Target,
  ListTodo,
  CheckSquare,
  Bell,
  BookOpen,
  Eye,
  Flag,
  ArrowRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { crmPlannerStorage } from '@/lib/crmPlannerMongoStorage';
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
        crmPlannerStorage.getVisions(),
        crmPlannerStorage.getActionPlans(),
        crmPlannerStorage.getGoals(),
        crmPlannerStorage.getTasks(),
        crmPlannerStorage.getTodos(),
        crmPlannerStorage.getReminders(),
        crmPlannerStorage.getWords(),
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
      newData.visions.forEach((vision) => {
        dataMap.set(vision.id, {
          visionId: vision.id,
          vision,
          actionPlans: newData.actionPlans.filter((ap) => ap.visionId === vision.id),
          goals: newData.goals.filter((g) => g.visionId === vision.id),
          tasks: newData.tasks.filter((t) => t.visionId === vision.id),
          todos: newData.todos,
          reminders: newData.reminders.filter((r) => r.visionId === vision.id),
          words: newData.words.filter((w) => w.visionId === vision.id),
        });
      });

      setExpandedData(dataMap);
    })();
  }, []);

  const handleVisionToggleCompleted = async (visionId: string) => {
    const vision = data.visions.find((v) => v.id === visionId);
    if (vision) {
      const updated = { ...vision, completed: !vision.completed };
      const newVisions = data.visions.map((v) => (v.id === visionId ? updated : v));
      setData((prev) => ({ ...prev, visions: newVisions }));
      await crmPlannerStorage.saveVisions(newVisions);
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
      words: data.words.filter((w) => w.createdAt?.includes(today)).length,
      reminders: data.reminders.filter((r) => r.createdAt?.includes(today)).length,
      todos: data.todos.filter((t) => t.createdAt?.includes(today)).length,
      tasks: data.tasks.filter((t) => t.createdAt?.includes(today)).length,
      goals: data.goals.filter((g) => g.createdAt?.includes(today)).length,
    };
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-emerald-50 border border-rose-200/60 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-rose-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                  Life Planner Studio
                </span>
                <span className="text-xs text-slate-500 font-medium">Ayurvedic Ritucharya & Goal Alignment</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Life Planner Dashboard
              </h1>
              <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                Track your personal Sadhana intentions, active habits, daily tasks, reminders, and long-term vision goals.
              </p>
            </div>
          </div>
        </div>

        {/* Time Period Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {(['daily', 'weekly', 'monthly', 'yearly', 'vision'] as TimePeriod[]).map((period) => {
            const active = timePeriod === period;
            return (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={`px-4 py-2 rounded-xl font-bold text-xs capitalize transition-all cursor-pointer shadow-xs ${
                  active
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-950/20'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {period} View
              </button>
            );
          })}
        </div>

        {/* Daily View */}
        {timePeriod === 'daily' && <DailyView stats={getDailyStats()} />}

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

function StatCard({
  label,
  count,
  icon: Icon,
  gradient,
  badge,
}: {
  label: string;
  count: number;
  icon: React.ElementType;
  gradient: string;
  badge: string;
}) {
  return (
    <div className="group bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-300 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div
            className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${gradient} flex items-center justify-center text-white shadow-md shadow-slate-200 group-hover:scale-105 transition-transform`}
          >
            <Icon className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200">
            {badge}
          </span>
        </div>
        <p className="text-3xl font-black text-slate-900 tracking-tight">{count}</p>
        <p className="text-xs text-slate-500 mt-1 font-semibold">{label}</p>
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
        <span>Active records</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </div>
    </div>
  );
}

function DailyView({ stats }: { stats: Record<string, number> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <StatCard label="Inspiring Words" count={stats.words} icon={BookOpen} gradient="from-purple-500 to-indigo-600" badge="Words" />
      <StatCard label="Reminders Today" count={stats.reminders} icon={Bell} gradient="from-amber-500 to-orange-600" badge="Alerts" />
      <StatCard label="To-Dos Today" count={stats.todos} icon={CheckSquare} gradient="from-blue-500 to-cyan-600" badge="To-Dos" />
      <StatCard label="Priority Tasks" count={stats.tasks} icon={ListTodo} gradient="from-emerald-500 to-teal-600" badge="Tasks" />
      <StatCard label="Active Goals" count={stats.goals} icon={Target} gradient="from-rose-500 to-pink-600" badge="Goals" />
    </div>
  );
}

function WeeklyView({ data }: { data: DashboardData }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Inspiring Words" count={data.words.length} icon={BookOpen} gradient="from-purple-500 to-indigo-600" badge="Words" />
      <StatCard label="Weekly Reminders" count={data.reminders.length} icon={Bell} gradient="from-amber-500 to-orange-600" badge="Alerts" />
      <StatCard label="Weekly To-Dos" count={data.todos.length} icon={CheckSquare} gradient="from-blue-500 to-cyan-600" badge="To-Dos" />
      <StatCard label="Weekly Tasks" count={data.tasks.length} icon={ListTodo} gradient="from-emerald-500 to-teal-600" badge="Tasks" />
      <StatCard label="Weekly Goals" count={data.goals.length} icon={Target} gradient="from-rose-500 to-pink-600" badge="Goals" />
      <StatCard label="Action Plans" count={data.actionPlans.length} icon={Flag} gradient="from-teal-600 to-cyan-600" badge="Actions" />
      <StatCard label="Visions Set" count={data.visions.length} icon={Eye} gradient="from-indigo-600 to-blue-700" badge="Visions" />
    </div>
  );
}

function MonthlyView({ data }: { data: DashboardData }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Total Words" count={data.words.length} icon={BookOpen} gradient="from-purple-500 to-indigo-600" badge="Words" />
      <StatCard label="Monthly Reminders" count={data.reminders.length} icon={Bell} gradient="from-amber-500 to-orange-600" badge="Alerts" />
      <StatCard label="Monthly To-Dos" count={data.todos.length} icon={CheckSquare} gradient="from-blue-500 to-cyan-600" badge="To-Dos" />
      <StatCard label="Monthly Tasks" count={data.tasks.length} icon={ListTodo} gradient="from-emerald-500 to-teal-600" badge="Tasks" />
      <StatCard label="Monthly Goals" count={data.goals.length} icon={Target} gradient="from-rose-500 to-pink-600" badge="Goals" />
      <StatCard label="Action Plans" count={data.actionPlans.length} icon={Flag} gradient="from-teal-600 to-cyan-600" badge="Actions" />
      <StatCard label="Active Visions" count={data.visions.length} icon={Eye} gradient="from-indigo-600 to-blue-700" badge="Visions" />
    </div>
  );
}

function YearlyView({ data }: { data: DashboardData }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Annual Words" count={data.words.length} icon={BookOpen} gradient="from-purple-500 to-indigo-600" badge="Words" />
      <StatCard label="Annual Reminders" count={data.reminders.length} icon={Bell} gradient="from-amber-500 to-orange-600" badge="Alerts" />
      <StatCard label="Annual To-Dos" count={data.todos.length} icon={CheckSquare} gradient="from-blue-500 to-cyan-600" badge="To-Dos" />
      <StatCard label="Annual Tasks" count={data.tasks.length} icon={ListTodo} gradient="from-emerald-500 to-teal-600" badge="Tasks" />
      <StatCard label="Annual Goals" count={data.goals.length} icon={Target} gradient="from-rose-500 to-pink-600" badge="Goals" />
      <StatCard label="Action Plans" count={data.actionPlans.length} icon={Flag} gradient="from-teal-600 to-cyan-600" badge="Actions" />
      <StatCard label="Visions Board" count={data.visions.length} icon={Eye} gradient="from-indigo-600 to-blue-700" badge="Visions" />
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
        <div className="text-center py-12 rounded-2xl bg-white border border-slate-200">
          <Eye className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-bold text-slate-800">No visions created yet</p>
          <p className="text-xs text-slate-500 mt-1">Set your first long-term life vision in the Planner.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visions.map((vision) => (
            <div
              key={vision.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-200 overflow-hidden flex flex-col justify-between"
            >
              {/* Card Header with Image */}
              <div className="relative h-36 bg-slate-900 overflow-hidden">
                {vision.imageUrl ? (
                  <img
                    src={vision.imageUrl}
                    alt={vision.title}
                    className="w-full h-full object-cover opacity-90"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=Vision';
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-indigo-700 to-purple-800 flex items-center justify-center text-white/50">
                    <Sparkles className="w-10 h-10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-xs">
                  Vision Board
                </span>
              </div>

              {/* Card Content */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-base font-bold text-slate-900 flex-1">{vision.title}</h3>
                    <button
                      onClick={() => onToggleCompleted(vision.id)}
                      className="cursor-pointer transition-transform active:scale-90"
                      title={vision.completed ? 'Mark pending' : 'Mark completed'}
                    >
                      {vision.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 hover:text-slate-500" />
                      )}
                    </button>
                  </div>

                  {/* Date & Budget Chips */}
                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-3 flex-wrap">
                    {vision.endDate && (
                      <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md text-[11px] font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Due: {new Date(vision.endDate).toLocaleDateString()}
                      </span>
                    )}
                    {vision.budget && (
                      <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px] font-bold">
                        <DollarSign className="w-3.5 h-3.5" />
                        ₹{vision.budget.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {vision.description || 'No detailed description provided.'}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(vision.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => onToggleExpanded(vision.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition cursor-pointer"
                    >
                      {expandedVisions.has(vision.id) ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          <span>Hide Details</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          <span>View Details</span>
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

    try {
      const updatedItem = { ...item, completed: !isCompleted, updatedAt: new Date().toISOString() };

      if (itemType === 'actionPlans') {
        await crmPlannerStorage.saveActionPlans(data.actionPlans.map((ap) => (ap.id === itemId ? updatedItem : ap)));
      } else if (itemType === 'goals') {
        await crmPlannerStorage.saveGoals(data.goals.map((g) => (g.id === itemId ? updatedItem : g)));
      } else if (itemType === 'tasks') {
        await crmPlannerStorage.saveTasks(data.tasks.map((t) => (t.id === itemId ? updatedItem : t)));
      } else if (itemType === 'todos') {
        await crmPlannerStorage.saveTodos(data.todos.map((t) => (t.id === itemId ? updatedItem : t)));
      } else if (itemType === 'reminders') {
        await crmPlannerStorage.saveReminders(data.reminders.map((r) => (r.id === itemId ? updatedItem : r)));
      } else if (itemType === 'words') {
        await crmPlannerStorage.saveWords(data.words.map((w) => (w.id === itemId ? updatedItem : w)));
      }
    } catch (error) {
      console.error('Error updating item completion:', error);
    }
  };

  const sections = [
    { id: 'actionPlans', label: 'Action Plans', items: data.actionPlans, type: 'actionPlans', property: 'title' },
    { id: 'goals', label: 'Goals', items: data.goals, type: 'goals', property: 'title' },
    { id: 'tasks', label: 'Tasks', items: data.tasks, type: 'tasks', property: 'title' },
    { id: 'todos', label: 'To-Dos', items: data.todos, type: 'todos', property: 'title' },
    { id: 'reminders', label: 'Reminders', items: data.reminders, type: 'reminders', property: 'title' },
    { id: 'words', label: 'Words', items: data.words, type: 'words', property: 'title' },
  ];

  return (
    <div className="pt-3 border-t border-slate-100 space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Related Entities</p>

      <div className="space-y-1.5">
        {sections.map((section) => (
          <div key={section.id} className="rounded-xl border border-slate-200 overflow-hidden">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 transition cursor-pointer text-xs font-semibold"
            >
              <span>
                {section.label} ({section.items.length})
              </span>
              {expandedSections.has(section.id) ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {expandedSections.has(section.id) && section.items.length > 0 && (
              <div className="p-2.5 space-y-1 bg-white">
                {section.items.slice(0, 5).map((item: any) => {
                  const itemKey = `${section.type}-${item.id}`;
                  const isCompleted = completedItems.has(itemKey) || item.completed;
                  const itemName = item[section.property] || item.name || 'Untitled';

                  return (
                    <div key={item.id} className="flex items-center gap-2 text-xs py-0.5 text-slate-700">
                      <button
                        onClick={() => toggleItemCompletion(section.type, item.id, item)}
                        className="flex-shrink-0 cursor-pointer"
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-300" />
                        )}
                      </button>
                      <span className={isCompleted ? 'line-through text-slate-400' : 'text-slate-700'}>
                        {itemName}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
