'use client';

import { useEffect, useMemo, useState } from 'react';
import { VISION_CATEGORIES } from '@/lib/types/lifePlanner';
import type { ActionPlan, ActionPlanGoal, Milestone, Vision, MiniTodo } from '@/lib/types/lifePlanner';
import GoalSection from '@/components/GoalSection';

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

  const updateTodo = (id: string, patch: Partial<Pick<MiniTodo, 'title' | 'dueDate' | 'dueTime'>>) => {
    setTodos(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));
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

          {/* Goals Section */}
          <div className="border-t-2 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-swar-text">Goals</h3>
              <button
                onClick={handleAddGoal}
                className="px-4 py-2 bg-swar-primary text-white rounded-lg hover:opacity-90 transition-colors"
              >
                + Add Goal
              </button>
            </div>

            <div className="space-y-4">
              {goals.map((goal, index) => (
                <GoalSection
                  key={goal.id}
                  goal={goal}
                  index={index}
                  onUpdate={handleUpdateGoal}
                  onDelete={handleDeleteGoal}
                />
              ))}
            </div>
          </div>

          {/* Todos Section */}
          <div className="border-t-2 pt-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold text-swar-text">Todos</h3>
                <p className="text-xs text-swar-text-secondary">Small checkbox items under this action plan.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowTodosEditor(v => !v)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {showTodosEditor ? 'Hide Todos' : '+ Todos'}
              </button>
            </div>

            {showTodosEditor && (
              <div className="space-y-3">
                {/* Add todo (2-line layout) */}
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                  <input
                    type="text"
                    value={newTodoTitle}
                    onChange={(e) => setNewTodoTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTodo();
                      }
                    }}
                    className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    placeholder="Todo title"
                  />

                  <div className="mt-2 flex flex-col md:flex-row gap-2">
                    <input
                      type="date"
                      value={newTodoDueDate || endDate || ''}
                      onChange={(e) => setNewTodoDueDate(e.target.value)}
                      className="w-full md:w-auto md:flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      title="Due date"
                    />
                    <input
                      type="time"
                      value={newTodoDueTime}
                      onChange={(e) => setNewTodoDueTime(e.target.value)}
                      className="w-full md:w-44 px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      title="Due time (default 11:00)"
                    />
                    <button
                      type="button"
                      onClick={addTodo}
                      className="w-full md:w-28 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {todos.length === 0 ? (
                  <div className="text-sm text-blue-800 bg-white border border-blue-200 rounded-lg px-4 py-3">
                    No todos yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todos.map((todo) => (
                      <div key={todo.id} className="bg-white border border-blue-200 rounded-xl px-3 py-3">
                        {/* Line 1: title */}
                        <input
                          type="text"
                          value={todo.title}
                          onChange={(e) => updateTodo(todo.id, { title: e.target.value })}
                          className={`w-full bg-transparent outline-none text-sm px-1 ${todo.completed ? 'text-swar-text-secondary line-through' : 'text-swar-text'}`}
                        />

                        {/* Line 2: date + time + checkbox + remove */}
                        <div className="mt-2 flex flex-col md:flex-row md:items-center gap-2">
                          <label className="inline-flex items-center gap-2 text-sm text-swar-text md:mr-1">
                            <input
                              type="checkbox"
                              checked={!!todo.completed}
                              onChange={() => toggleTodo(todo.id)}
                              className="rounded border-swar-border"
                            />
                            <span className="text-xs">Done</span>
                          </label>

                          <input
                            type="date"
                            value={todo.dueDate || ''}
                            onChange={(e) => updateTodo(todo.id, { dueDate: e.target.value })}
                            className="w-full md:w-auto md:flex-1 px-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />

                          <input
                            type="time"
                            value={todo.dueTime || '11:00'}
                            onChange={(e) => updateTodo(todo.id, { dueTime: e.target.value })}
                            className="w-full md:w-44 px-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />

                          <button
                            type="button"
                            onClick={() => deleteTodo(todo.id)}
                            className="w-full md:w-auto px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition inline-flex items-center justify-center gap-2"
                            title="Remove"
                          >
                            <span className="text-sm font-medium">Remove</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
            placeholder="Milestone title (optional)"
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
      </div>
    </div>
  );
}
