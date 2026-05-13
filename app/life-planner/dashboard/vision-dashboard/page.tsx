'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Edit2, CheckCircle2, Circle, Calendar, DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';
import type { Vision, ActionPlan, Goal, Task, Todo, Reminder, Word } from '@/lib/types/lifePlanner';

interface ExpandedVisionData {
  visionId: string;
  actionPlans: ActionPlan[];
  goals: Goal[];
  tasks: Task[];
  todos: Todo[];
  reminders: Reminder[];
  words: Word[];
}

export default function VisionDashboardPage() {
  const router = useRouter();
  const [visions, setVisions] = useState<Vision[]>([]);
  const [expandedVisions, setExpandedVisions] = useState<Set<string>>(new Set());
  const [expandedData, setExpandedData] = useState<Map<string, ExpandedVisionData>>(new Map());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    (async () => {
      const [savedVisions, savedActionPlans, savedGoals, savedTasks, savedTodos, savedReminders, savedWords] =
        await Promise.all([
          lifePlannerStorage.getVisions(),
          lifePlannerStorage.getActionPlans(),
          lifePlannerStorage.getGoals(),
          lifePlannerStorage.getTasks(),
          lifePlannerStorage.getTodos(),
          lifePlannerStorage.getReminders(),
          lifePlannerStorage.getWords(),
        ]);

      setVisions(Array.isArray(savedVisions) ? savedVisions : []);

      // Pre-cache all related data
      const dataMap = new Map<string, ExpandedVisionData>();
      const visionsArr = Array.isArray(savedVisions) ? savedVisions : [];

      visionsArr.forEach(vision => {
        dataMap.set(vision.id, {
          visionId: vision.id,
          actionPlans: Array.isArray(savedActionPlans) ? (savedActionPlans as ActionPlan[]).filter(ap => ap.visionId === vision.id) : [],
          goals: Array.isArray(savedGoals) ? (savedGoals as Goal[]).filter(g => g.visionId === vision.id) : [],
          tasks: Array.isArray(savedTasks) ? (savedTasks as Task[]).filter(t => t.visionId === vision.id) : [],
          todos: Array.isArray(savedTodos) ? (savedTodos as Todo[]).filter(t => !vision.id || true) : [],
          reminders: Array.isArray(savedReminders) ? (savedReminders as Reminder[]).filter(r => r.visionId === vision.id) : [],
          words: Array.isArray(savedWords) ? (savedWords as Word[]).filter(w => w.visionId === vision.id) : [],
        });
      });

      setExpandedData(dataMap);
    })();
  }, []);

  const toggleExpanded = (visionId: string) => {
    const newSet = new Set(expandedVisions);
    if (newSet.has(visionId)) {
      newSet.delete(visionId);
    } else {
      newSet.add(visionId);
    }
    setExpandedVisions(newSet);
  };

  const handleVisionToggleCompleted = async (visionId: string) => {
    const vision = visions.find(v => v.id === visionId);
    if (vision) {
      const updated = { ...vision, completed: !vision.completed };
      setVisions(prev => prev.map(v => v.id === visionId ? updated : v));
      await lifePlannerStorage.saveVisions(visions.map(v => v.id === visionId ? updated : v));
    }
  };

  const handleEdit = (visionId: string) => {
    router.push(`/life-planner/dashboard/visions?edit=${visionId}`);
  };

  if (!mounted) return null;

  const data = expandedData.get('') || { visionId: '', actionPlans: [], goals: [], tasks: [], todos: [], reminders: [], words: [] };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#000000' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2" style={{ color: '#00FF00' }}>Vision Dashboard</h1>
              <p style={{ color: '#FFFFFF' }}>Manage your vision plans and track progress</p>
            </div>
            <button
              onClick={() => router.push('/life-planner/dashboard/visions')}
              className="px-6 py-2 rounded-lg font-semibold transition-all"
              style={{ backgroundColor: '#FFFF00', color: '#000000', borderColor: '#FFFF00', border: '2px solid' }}
            >
              + Add Vision
            </button>
          </div>
        </div>

        {/* Vision Cards Grid */}
        {visions.length === 0 ? (
          <div className="text-center py-12 rounded-lg" style={{ borderColor: '#FFFF00', border: '2px solid', backgroundColor: '#1a1a1a' }}>
            <p style={{ color: '#FFFFFF' }} className="text-lg mb-4">No visions created yet</p>
            <button
              onClick={() => router.push('/life-planner/dashboard/visions')}
              className="px-6 py-2 rounded-lg font-semibold"
              style={{ backgroundColor: '#FFFF00', color: '#000000' }}
            >
              Create Your First Vision
            </button>
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
                  backgroundColor: '#1a1a1a'
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
                    <h3 className="text-xl font-bold flex-1" style={{ color: '#00FF00' }}>{vision.title}</h3>
                    <button
                      onClick={() => handleVisionToggleCompleted(vision.id)}
                      className="ml-2 transition-all"
                    >
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
                      <span className="text-sm">Due: {new Date(vision.targetDate || '').toLocaleDateString()}</span>
                    </div>
                    {vision.amount && (
                      <div className="flex items-center gap-2" style={{ color: '#FFFFFF' }}>
                        <DollarSign size={16} />
                        <span className="text-sm">₹{parseFloat(vision.amount).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Description Preview */}
                  <p style={{ color: '#CCCCCC' }} className="text-sm line-clamp-2 mb-4">{vision.description}</p>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => handleEdit(vision.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all font-semibold"
                      style={{ backgroundColor: '#FFFF00', color: '#000000', borderColor: '#FFFF00', border: '1px solid' }}
                    >
                      <Edit2 size={16} />
                      Edit
                    </button>
                    <button
                      onClick={() => toggleExpanded(vision.id)}
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
    </div>
  );
}

function ExpandedVisionDetails({ data }: { data: ExpandedVisionData }) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['actionPlans']));

  const toggleSection = (section: string) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(section)) {
      newSet.delete(section);
    } else {
      newSet.add(section);
    }
    setExpandedSections(newSet);
  };

  const sections = [
    { id: 'actionPlans', label: '📋 Action Plans', items: data.actionPlans, property: 'title' },
    { id: 'goals', label: '🎯 Goals', items: data.goals, property: 'title' },
    { id: 'tasks', label: '✓ Tasks', items: data.tasks, property: 'title' },
    { id: 'todos', label: '☐ Todos', items: data.todos, property: 'title' },
    { id: 'reminders', label: '🔔 Reminders', items: data.reminders, property: 'title' },
    { id: 'words', label: '✨ Words', items: data.words, property: 'title' },
  ];

  return (
    <div className="mt-4 pt-4" style={{ borderTopColor: '#FFFF00', borderTopWidth: '2px' }}>
      <p style={{ color: '#00FF00' }} className="text-sm font-semibold mb-3">Related Entities</p>

      <div className="space-y-2">
        {sections.map(section => (
          <div key={section.id}>
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between p-2 rounded transition-all"
              style={{ backgroundColor: '#222222', color: '#FFFF00' }}
            >
              <span className="font-semibold text-sm">{section.label} ({section.items.length})</span>
              {expandedSections.has(section.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {expandedSections.has(section.id) && section.items.length > 0 && (
              <div className="mt-1 pl-4 space-y-1">
                {section.items.slice(0, 3).map((item: any) => (
                  <div key={item.id} className="flex items-center gap-2 text-xs py-1" style={{ color: '#CCCCCC' }}>
                    <span>•</span>
                    <span>{item[section.property]}</span>
                  </div>
                ))}
                {section.items.length > 3 && (
                  <p className="text-xs" style={{ color: '#999999' }}>+{section.items.length - 3} more</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
