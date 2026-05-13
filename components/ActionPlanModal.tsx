'use client';

import { useEffect, useMemo, useState } from 'react';
import { VISION_CATEGORIES } from '@/lib/types/lifePlanner';
import type { ActionPlan, ActionPlanGoal, Milestone, Vision, MiniTodo, MiniReminder } from '@/lib/types/lifePlanner';
import GoalSection from '@/components/GoalSection';
import type { ActionPlanGoal } from '@/lib/types/lifePlanner';

interface ActionPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (actionPlan: ActionPlan) => void;
  visions: Vision[];
  editingPlan?: ActionPlan;
}

export default function ActionPlanModal({
  isOpen,
  onClose,
  onSave,
  visions,
  editingPlan,
}: ActionPlanModalProps) {
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [selectedVisionId, setSelectedVisionId] = useState('');
  const [selectedVisionHead, setSelectedVisionHead] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [workingHoursStart, setWorkingHoursStart] = useState('11:00');
  const [workingHoursEnd, setWorkingHoursEnd] = useState('11:00');
  const [place, setPlace] = useState('');
  const [expectedAmount, setExpectedAmount] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [goals, setGoals] = useState<ActionPlanGoal[]>([]);
  const [todos, setTodos] = useState<MiniTodo[]>([]);
  const [showTodosEditor, setShowTodosEditor] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoDueDate, setNewTodoDueDate] = useState('');
  const [newTodoDueTime, setNewTodoDueTime] = useState('11:00');

  const selectedVision = visions.find(v => v.id === selectedVisionId);

  // When opening the modal (or switching editingPlan), preload all fields.
  // Without this, React state initialized via useState() won't update when editingPlan changes.
  useEffect(() => {
    if (!isOpen) return;

    if (editingPlan) {
      const v = visions.find(vv => vv.id === editingPlan.visionId);
      const head = v?.category ? String(v.category) : '';
      setSelectedVisionHead(head);
      setSelectedVisionId(editingPlan.visionId || '');
      setTitle(editingPlan.title || '');
      setDescription(editingPlan.description || '');
      setStartDate(editingPlan.startDate || today);
      setEndDate(editingPlan.endDate || today);
      setWorkingHoursStart(editingPlan.workingHoursStart || '11:00');
      setWorkingHoursEnd(editingPlan.workingHoursEnd || '11:00');
      setPlace(editingPlan.place || '');
      setExpectedAmount(editingPlan.expectedAmount || 0);
      setCompleted(editingPlan.completed || false);
      setMilestones(editingPlan.milestones || []);
      setGoals(editingPlan.goals || []);
      setTodos(editingPlan.todos || []);
      setShowTodosEditor(false);
      setNewTodoTitle('');
      setNewTodoDueDate('');
      setNewTodoDueTime('11:00');
      return;
    }

    // Create mode defaults
    setSelectedVisionHead('');
    setSelectedVisionId('');
    setTitle('');
    setDescription('');
    setStartDate(today);
    setEndDate(today);
    setWorkingHoursStart('11:00');
    setWorkingHoursEnd('11:00');
    setPlace('');
    setExpectedAmount(0);
    setCompleted(false);
    setMilestones([]);
    setGoals([]);
    setTodos([]);
    setShowTodosEditor(false);
    setNewTodoTitle('');
    setNewTodoDueDate('');
    setNewTodoDueTime('11:00');
  }, [isOpen, editingPlan, visions, today]);
  
  // Filter visions by selected head
  const visionsUnderHead = selectedVisionHead
    ? visions.filter(v => v.category === selectedVisionHead)
    : [];

  const handleAddMilestone = () => {
    const newMilestone: Milestone = {
      id: Date.now().toString(),
      title: '',
      description: '',
      startDate: startDate || today,
      endDate: endDate || today,
      workingHoursStart: '11:00',
      workingHoursEnd: '11:00',
      place: '',
      status: 'not-started',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setMilestones([...milestones, newMilestone]);
  };

  const handleUpdateMilestone = (id: string, updatedMilestone: Milestone) => {
    setMilestones(milestones.map(m => (m.id === id ? updatedMilestone : m)));
  };

  const handleDeleteMilestone = (id: string) => {
    setMilestones(milestones.filter(m => m.id !== id));
  };

  const handleAddGoal = () => {
    const newGoal: ActionPlanGoal = {
      id: Date.now().toString(),
      title: '',
      description: '',
      startDate: startDate || today,
      endDate: endDate || today,
      workingTimeStart: '11:00',
      workingTimeEnd: '11:00',
      place: '',
      expectedAmount: 0,
      status: 'not-started',
      priority: 'medium',
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setGoals([...goals, newGoal]);
  };

  const handleUpdateGoal = (id: string, updatedGoal: ActionPlanGoal) => {
    setGoals(goals.map(g => (g.id === id ? updatedGoal : g)));
  };

  const handleDeleteGoal = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  const addTodo = () => {
    const titleTrimmed = newTodoTitle.trim();
    if (!titleTrimmed) return;
    const fallbackDate = endDate || startDate || new Date().toISOString().split('T')[0];
    const dueDate = (newTodoDueDate || fallbackDate).trim();
    const dueTime = (newTodoDueTime || '11:00').trim();
    setTodos(prev => [
      ...prev,
      { id: `todo-${Date.now()}`, title: titleTrimmed, dueDate, dueTime, completed: false },
    ]);
    setNewTodoTitle('');
    setNewTodoDueDate('');
    setNewTodoDueTime('11:00');
  };

  const toggleTodo = (id: string) => {
    setTodos(prev => prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const updateTodo = (id: string, patch: Partial<MiniTodo>) => {
    setTodos(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));
  };

  const addReminderToActionTodo = (todoId: string, title: string) => {
    setTodos(prev => prev.map(t => {
      if (t.id !== todoId) return t;
      const newRem: MiniReminder = { id: `rem-${Date.now()}`, title, date: t.dueDate, time: t.dueTime || '11:00', completed: false };
      return { ...t, reminders: [...(t.reminders || []), newRem] };
    }));
  };

  const deleteReminderFromActionTodo = (todoId: string, remId: string) => {
    setTodos(prev => prev.map(t => {
      if (t.id !== todoId) return t;
      return { ...t, reminders: (t.reminders || []).filter(r => r.id !== remId) };
    }));
  };

  const deleteTodo = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  const handleSave = () => {
    if (!selectedVisionId || !title || !place || !startDate || !endDate) {
      alert('Please fill in all required fields');
      return;
    }

    const actionPlan: ActionPlan = {
      id: editingPlan?.id || Date.now().toString(),
      visionId: selectedVisionId,
      title,
      description,
      imageUrl: selectedVision?.imageUrl || selectedVision?.categoryImageUrl,
      startDate,
      endDate,
      workingHoursStart,
      workingHoursEnd,
      place,
      expectedAmount: expectedAmount || undefined,
      milestones,
      goals,
      todos,
      status: editingPlan?.status || 'not-started',
      progress: editingPlan?.progress || 0,
      completed: completed,
      createdAt: editingPlan?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(actionPlan);
    resetForm();
  };

  const resetForm = () => {
    setSelectedVisionId('');
    setSelectedVisionHead('');
    setTitle('');
    setDescription('');
    setStartDate(today);
    setEndDate(today);
    setWorkingHoursStart('11:00');
    setWorkingHoursEnd('11:00');
    setPlace('');
    setExpectedAmount(0);
    setCompleted(false);
    setMilestones([]);
    setGoals([]);
    setTodos([]);
    setShowTodosEditor(false);
    setNewTodoTitle('');
    setNewTodoDueDate('');
    setNewTodoDueTime('11:00');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-swar-primary to-blue-700 p-6 text-white flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">
            {editingPlan ? 'Edit Action Plan' : 'Create Action Plan'}
          </h2>
          <button
            onClick={onClose}
            className="text-2xl font-bold hover:scale-110 transition-transform"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Vision Head Selection - First Level */}
          <div>
            <label className="block text-sm font-semibold text-swar-text mb-2">
              Select Vision Plan Head *
            </label>
            <select
              value={selectedVisionHead}
              onChange={e => {
                setSelectedVisionHead(e.target.value);
                setSelectedVisionId(''); // Reset vision when head changes
              }}
              className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="">Choose a vision head...</option>
              {VISION_CATEGORIES.map(head => (
                <option key={head} value={head}>
                  {head}
                </option>
              ))}
            </select>
          </div>

          {/* Vision Selection - Second Level */}
          <div>
            <label className="block text-sm font-semibold text-swar-text mb-2">
              Select Vision Plan *
            </label>
            {selectedVisionHead ? (
              <select
                value={selectedVisionId}
                onChange={e => setSelectedVisionId(e.target.value)}
                className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="">Choose a vision...</option>
                {visionsUnderHead.map(vision => (
                  <option key={vision.id} value={vision.id}>
                    {vision.title}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-swar-text-secondary italic">Please select a vision head first</p>
            )}
          </div>

          {/* Vision Image Preview */}
          {selectedVision && (
            <div className="flex justify-center">
              <img
                src={selectedVision.imageUrl || selectedVision.categoryImageUrl || '/placeholder.png'}
                alt={selectedVision.title}
                className="w-full h-64 object-cover rounded-lg border-2 border-swar-border"
              />
            </div>
          )}

          {/* Action Plan Title */}
          <div>
            <label className="block text-sm font-semibold text-swar-text mb-2">
              Action Plan Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Q1 Fitness Challenge"
              className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-swar-text mb-2">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe your action plan..."
              rows={3}
              className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-swar-text mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-swar-text mb-2">End Date *</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Working Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-swar-text mb-2">
                Working Hours Start
              </label>
              <input
                type="time"
                value={workingHoursStart}
                onChange={e => setWorkingHoursStart(e.target.value)}
                className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-swar-text mb-2">
                Working Hours End
              </label>
              <input
                type="time"
                value={workingHoursEnd}
                onChange={e => setWorkingHoursEnd(e.target.value)}
                className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Place */}
          <div>
            <label className="block text-sm font-semibold text-swar-text mb-2">
              Working Place *
            </label>
            <input
              type="text"
              value={place}
              onChange={e => setPlace(e.target.value)}
              placeholder="e.g., Home Gym, Office, Studio"
              className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Expected Amount */}
          <div>
            <label className="block text-sm font-semibold text-swar-text mb-2">
              Expected Amount (Rs.)
            </label>
            <input
              type="number"
              value={expectedAmount}
              onChange={e => setExpectedAmount(Number(e.target.value))}
              placeholder="0"
              className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Milestones Section */}
          <div className="border-t-2 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-swar-text">Milestones</h3>
              <button
                onClick={handleAddMilestone}
                className="px-4 py-2 bg-swar-primary text-white rounded-lg hover:opacity-90 transition-colors"
              >
                + Add Milestone
              </button>
            </div>

            <div className="space-y-4">
              {milestones.map((milestone, index) => (
                <MilestoneCard
                  key={milestone.id}
                  milestone={milestone}
                  index={index}
                  onUpdate={handleUpdateMilestone}
                  onDelete={handleDeleteMilestone}
                />
              ))}
            </div>
          </div>





          {/* Completed Checkbox */}
          <div className="flex items-center gap-3 px-4 py-3 bg-swar-bg rounded-lg">
            <input
              type="checkbox"
              id="completed"
              checked={completed}
              onChange={e => setCompleted(e.target.checked)}
              className="w-5 h-5 rounded border-2 border-swar-border cursor-pointer"
            />
            <label htmlFor="completed" className="text-sm font-medium text-swar-text cursor-pointer">
              Mark as Completed
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 border-t-2 pt-6">
            <button
              onClick={handleSave}
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Action Plan
            </button>
            <button
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="flex-1 px-6 py-3 bg-gray-300 text-swar-text font-bold rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Milestone Card Component
function MilestoneCard({
  milestone,
  index,
  onUpdate,
  onDelete,
}: {
  milestone: Milestone;
  index: number;
  onUpdate: (id: string, milestone: Milestone) => void;
  onDelete: (id: string) => void;
}) {
  const milestoneGoals = milestone.goals || [];

  const handleAddGoal = () => {
    const newGoal: ActionPlanGoal = {
      id: Date.now().toString(),
      title: '',
      description: '',
      startDate: milestone.startDate,
      endDate: milestone.endDate,
      workingTimeStart: milestone.workingHoursStart || '11:00',
      workingTimeEnd: milestone.workingHoursEnd || '11:00',
      place: milestone.place || '',
      expectedAmount: 0,
      status: 'not-started',
      priority: 'medium',
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onUpdate(milestone.id, {
      ...milestone,
      goals: [...milestoneGoals, newGoal],
    });
  };

  const handleUpdateGoal = (goalId: string, updatedGoal: ActionPlanGoal) => {
    onUpdate(milestone.id, {
      ...milestone,
      goals: milestoneGoals.map(g => (g.id === goalId ? updatedGoal : g)),
    });
  };

  const handleDeleteGoal = (goalId: string) => {
    onUpdate(milestone.id, {
      ...milestone,
      goals: milestoneGoals.filter(g => g.id !== goalId),
    });
  };

  return (
    <div className="bg-swar-bg p-4 rounded-lg border-2 border-swar-border">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-semibold text-swar-text">Milestone {index + 1}</h4>
        <button
          onClick={() => onDelete(milestone.id)}
          className="text-red-500 hover:text-swar-primary font-bold"
        >
          Delete
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-swar-text-secondary mb-1">Title</label>
          <input
            type="text"
            value={milestone.title || ''}
            onChange={e =>
              onUpdate(milestone.id, {
                ...milestone,
                title: e.target.value,
              })
            }
            placeholder="Milestone title"
            className="w-full px-3 py-2 border border-swar-border rounded text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-swar-text-secondary mb-1">Start Date</label>
            <input
              type="date"
              value={milestone.startDate}
              onChange={e =>
                onUpdate(milestone.id, {
                  ...milestone,
                  startDate: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-swar-border rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-swar-text-secondary mb-1">End Date</label>
            <input
              type="date"
              value={milestone.endDate}
              onChange={e =>
                onUpdate(milestone.id, {
                  ...milestone,
                  endDate: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-swar-border rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-swar-text-secondary mb-1">
              Working Hours Start
            </label>
            <input
              type="time"
              value={milestone.workingHoursStart}
              onChange={e =>
                onUpdate(milestone.id, {
                  ...milestone,
                  workingHoursStart: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-swar-border rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-swar-text-secondary mb-1">
              Working Hours End
            </label>
            <input
              type="time"
              value={milestone.workingHoursEnd}
              onChange={e =>
                onUpdate(milestone.id, {
                  ...milestone,
                  workingHoursEnd: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-swar-border rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-swar-text-secondary mb-1">Place</label>
          <input
            type="text"
            value={milestone.place}
            onChange={e =>
              onUpdate(milestone.id, {
                ...milestone,
                place: e.target.value,
              })
            }
            placeholder="Working location"
            className="w-full px-3 py-2 border border-swar-border rounded text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Goals nested under this Milestone */}
        <div className="mt-4 border-t border-swar-border pt-3">
          <div className="flex justify-between items-center mb-3">
            <h5 className="text-sm font-bold text-swar-text">Goals</h5>
            <button
              type="button"
              onClick={handleAddGoal}
              className="px-3 py-1.5 text-sm bg-swar-primary text-white rounded-lg hover:opacity-90 transition-colors"
            >
              + Add Goal
            </button>
          </div>

          {milestoneGoals.length === 0 ? (
            <p className="text-xs text-swar-text-secondary italic">No goals yet. Add a goal under this milestone.</p>
          ) : (
            <div className="space-y-3">
              {milestoneGoals.map((goal, gIdx) => (
                <GoalSection
                  key={goal.id}
                  goal={goal}
                  index={gIdx}
                  onUpdate={handleUpdateGoal}
                  onDelete={handleDeleteGoal}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────── Action Plan Todo Card (with Reminders) ────────── */
function ActionTodoCard({
  todo, onToggle, onUpdate, onDelete, onAddReminder, onDeleteReminder,
}: {
  todo: MiniTodo;
  onToggle: (id: string) => void;
  onUpdate: (id: string, patch: Partial<MiniTodo>) => void;
  onDelete: (id: string) => void;
  onAddReminder: (todoId: string, title: string) => void;
  onDeleteReminder: (todoId: string, remId: string) => void;
}) {
  const [showRem, setShowRem] = useState(false);
  const [newRemTitle, setNewRemTitle] = useState('');
  const reminders = todo.reminders || [];

  return (
    <div className="bg-white border border-blue-200 rounded-xl px-3 py-3">
      {/* Line 1: title */}
      <input
        type="text"
        value={todo.title}
        onChange={(e) => onUpdate(todo.id, { title: e.target.value })}
        className={`w-full bg-transparent outline-none text-sm px-1 ${todo.completed ? 'text-swar-text-secondary line-through' : 'text-swar-text'}`}
      />

      {/* Line 2: date + time + checkbox + reminders toggle + remove */}
      <div className="mt-2 flex flex-col md:flex-row md:items-center gap-2">
        <label className="inline-flex items-center gap-2 text-sm text-swar-text md:mr-1">
          <input
            type="checkbox"
            checked={!!todo.completed}
            onChange={() => onToggle(todo.id)}
            className="rounded border-swar-border"
          />
          <span className="text-xs">Done</span>
        </label>

        <input
          type="date"
          value={todo.dueDate || ''}
          onChange={(e) => onUpdate(todo.id, { dueDate: e.target.value })}
          className="w-full md:w-auto md:flex-1 px-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        <input
          type="time"
          value={todo.dueTime || '11:00'}
          onChange={(e) => onUpdate(todo.id, { dueTime: e.target.value })}
          className="w-full md:w-44 px-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        <button
          type="button"
          onClick={() => setShowRem(v => !v)}
          className="px-2 py-2 text-amber-600 hover:bg-amber-50 rounded-lg transition text-sm font-medium"
          title="Reminders"
        >
          🔔 {reminders.length}
        </button>

        <button
          type="button"
          onClick={() => onDelete(todo.id)}
          className="w-full md:w-auto px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition inline-flex items-center justify-center gap-2"
          title="Remove"
        >
          <span className="text-sm font-medium">Remove</span>
        </button>
      </div>

      {/* Reminders inside this todo */}
      {showRem && (
        <div className="mt-2 ml-6 space-y-1">
          <div className="flex gap-1">
            <input
              type="text"
              value={newRemTitle}
              onChange={e => setNewRemTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newRemTitle.trim()) { onAddReminder(todo.id, newRemTitle.trim()); setNewRemTitle(''); } } }}
              placeholder="Reminder title"
              className="flex-1 px-3 py-1.5 border border-amber-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-white"
            />
            <button type="button" onClick={() => { if (newRemTitle.trim()) { onAddReminder(todo.id, newRemTitle.trim()); setNewRemTitle(''); } }}
              className="px-3 py-1.5 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600 transition">
              Add
            </button>
          </div>
          {reminders.map(rem => (
            <div key={rem.id} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
              <span className="text-xs">🔔</span>
              <span className="flex-1 text-xs text-swar-text">{rem.title}</span>
              <input type="date" value={rem.date || ''} onChange={e => {
                onUpdate(todo.id, { reminders: reminders.map(r => r.id === rem.id ? { ...r, date: e.target.value } : r) });
              }} className="px-2 py-0.5 border border-amber-200 rounded text-xs w-28" />
              <input type="time" value={rem.time || '11:00'} onChange={e => {
                onUpdate(todo.id, { reminders: reminders.map(r => r.id === rem.id ? { ...r, time: e.target.value } : r) });
              }} className="px-2 py-0.5 border border-amber-200 rounded text-xs w-20" />
              <button type="button" onClick={() => onDeleteReminder(todo.id, rem.id)}
                className="text-red-400 text-xs hover:text-red-600">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
