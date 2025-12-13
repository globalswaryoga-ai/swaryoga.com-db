'use client';

import React, { useMemo, useState } from 'react';
import { Eye, Trash2, Plus } from 'lucide-react';
import { Task, Vision } from '@/lib/types/lifePlanner';
import { getDefaultCategoryImage } from '@/lib/visionCategoryImages';

type GoalOption = {
  id: string;
  title: string;
  visionId?: string;
};

interface TaskFormState {
  visionHead: string;
  visionId: string;
  goalId: string;
  title: string;
  description: string;
  startDate: string;
  dueDate: string;
  timeStart: string;
  timeEnd: string;
  place: string;
  imageUrl: string;
  todos: Array<{ id: string; title: string; dueDate?: string; dueTime?: string; completed: boolean }>;
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: TaskFormState) => void;
  editingTask: Task | null;
  formState: TaskFormState;
  setFormState: React.Dispatch<React.SetStateAction<TaskFormState>>;
  visions: Vision[];
  goals: GoalOption[];
  visionOptionsForHead: (head: string) => Vision[];
  goalOptionsForVision: (visionId: string) => GoalOption[];
}

const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTask,
  formState,
  setFormState,
  visions,
  goals,
  visionOptionsForHead,
  goalOptionsForVision,
}) => {
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [showTodosEditor, setShowTodosEditor] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoDueDate, setNewTodoDueDate] = useState('');
  const [newTodoDueTime, setNewTodoDueTime] = useState('11:00');

  const handleHeadChange = (head: string) => {
    setFormState(prev => ({
      ...prev,
      visionHead: head,
      visionId: '',
      goalId: '',
    }));
  };

  const handleVisionChange = (visionId: string) => {
    const v = visions.find(vv => vv.id === visionId);
    setFormState(prev => ({
      ...prev,
      visionHead: v?.category ? String(v.category) : prev.visionHead,
      visionId,
      goalId: '',
    }));
  };

  const handleGoalChange = (goalId: string) => {
    setFormState(prev => ({
      ...prev,
      goalId,
    }));
  };

  const availableHeads = Array.from(new Set(visions.map(v => v.category).filter(Boolean)));
  const visionsForHead = visionOptionsForHead(formState.visionHead);

  const goalsForVision = useMemo(() => {
    if (!formState.visionId) return [] as GoalOption[];
    return goalOptionsForVision(formState.visionId);
  }, [formState.visionId, goalOptionsForVision]);

  const visionById = useMemo(() => {
    const map = new Map<string, Vision>();
    for (const v of visions) map.set(v.id, v);
    return map;
  }, [visions]);

  const selectedVision = formState.visionId ? visionById.get(formState.visionId) : undefined;

  const computedDefaultImageUrl = useMemo(() => {
    // Priority: explicit formState.imageUrl > selected vision image > head default image
    if (formState.imageUrl?.trim()) return formState.imageUrl.trim();
    if (selectedVision?.imageUrl?.trim()) return selectedVision.imageUrl.trim();
    if (formState.visionHead?.trim()) return getDefaultCategoryImage(formState.visionHead.trim());
    if (selectedVision?.category) return getDefaultCategoryImage(String(selectedVision.category));
    return getDefaultCategoryImage('Life');
  }, [formState.imageUrl, formState.visionHead, selectedVision]);

  const selectedGoal = useMemo(() => {
    return formState.goalId ? goals.find(g => g.id === formState.goalId) : undefined;
  }, [formState.goalId, goals]);

  const addTodo = () => {
    const title = newTodoTitle.trim();
    if (!title) return;

    const fallbackDate = formState.dueDate || new Date().toISOString().split('T')[0];
    const dueDate = (newTodoDueDate || fallbackDate).trim();
    const dueTime = (newTodoDueTime || '11:00').trim();

    setFormState(prev => ({
      ...prev,
      todos: [
        ...(prev.todos || []),
        { id: `todo-${Date.now()}`, title, dueDate, dueTime, completed: false },
      ],
    }));
    setNewTodoTitle('');
    setNewTodoDueDate('');
    setNewTodoDueTime('11:00');
  };

  const toggleTodo = (id: string) => {
    setFormState(prev => ({
      ...prev,
      todos: (prev.todos || []).map(t => (t.id === id ? { ...t, completed: !t.completed } : t)),
    }));
  };

  const updateTodo = (id: string, patch: Partial<{ title: string; dueDate: string; dueTime: string }>) => {
    setFormState(prev => ({
      ...prev,
      todos: (prev.todos || []).map(t => (t.id === id ? { ...t, ...patch } : t)),
    }));
  };

  const deleteTodo = (id: string) => {
    setFormState(prev => ({
      ...prev,
      todos: (prev.todos || []).filter(t => t.id !== id),
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            {editingTask ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button
            onClick={onClose}
            className="text-2xl font-bold hover:scale-110 transition-transform"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(formState);
          }}
          className="p-6 space-y-5"
        >
          {/* Head Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Head / Category <span className="text-red-500">*</span>
            </label>
            <select
              value={formState.visionHead}
              onChange={(e) => handleHeadChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a head...</option>
              {availableHeads.map(head => (
                <option key={head} value={head}>
                  {head}
                </option>
              ))}
            </select>
          </div>

          {/* Vision Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Vision <span className="text-red-500">*</span>
            </label>
            {!formState.visionHead ? (
              <div className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                Choose a heading first
              </div>
            ) : (
              <select
                value={formState.visionId}
                onChange={(e) => handleVisionChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a vision...</option>
                {visionsForHead.map(vision => (
                  <option key={vision.id} value={vision.id}>
                    {vision.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Goal Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Goal <span className="text-red-500">*</span>
            </label>
            {!formState.visionId ? (
              <div className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                Choose a vision first
              </div>
            ) : goalsForVision.length === 0 ? (
              <div className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                No goals found for this vision
              </div>
            ) : (
              <select
                value={formState.goalId}
                onChange={(e) => handleGoalChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a goal...</option>
                {goalsForVision.map(goal => (
                  <option key={goal.id} value={goal.id}>
                    {goal.title}
                  </option>
                ))}
              </select>
            )}

            {formState.goalId && (
              <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                <p className="text-xs text-blue-800">
                  ✓ Selected: <span className="font-semibold">{selectedGoal?.title || 'Goal'}</span>
                  {selectedVision?.title ? (
                    <>  • Vision: <span className="font-semibold">{selectedVision.title}</span></>
                  ) : null}
                </p>
              </div>
            )}
          </div>

          <hr className="my-4" />

          {/* Task Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formState.title}
              onChange={(e) =>
                setFormState(prev => ({ ...prev, title: e.target.value }))
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter task title"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formState.description}
              onChange={(e) =>
                setFormState(prev => ({ ...prev, description: e.target.value }))
              }
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter task description"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formState.startDate}
                onChange={(e) =>
                  setFormState(prev => ({ ...prev, startDate: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formState.dueDate}
                onChange={(e) =>
                  setFormState(prev => ({ ...prev, dueDate: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={formState.timeStart}
                onChange={(e) =>
                  setFormState(prev => ({ ...prev, timeStart: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                End Time
              </label>
              <input
                type="time"
                value={formState.timeEnd}
                onChange={(e) =>
                  setFormState(prev => ({ ...prev, timeEnd: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Place */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Place <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formState.place}
              onChange={(e) =>
                setFormState(prev => ({ ...prev, place: e.target.value }))
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter location"
            />
          </div>

          {/* Image */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <label className="block text-sm font-bold text-gray-800">
                Default Image (Editable)
              </label>
              <button
                type="button"
                onClick={() => setShowImageEditor(v => !v)}
                className="flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800"
              >
                <Eye className="h-4 w-4" />
                <span>{showImageEditor ? 'Hide' : 'Edit'}</span>
              </button>
            </div>

            <div className="rounded-lg overflow-hidden h-48 border-2 border-gray-200 bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={computedDefaultImageUrl}
                alt="Task visual"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/800x400?text=Image+Not+Found';
                }}
              />
            </div>

            {showImageEditor && (
              <div className="mt-3 rounded-lg border-2 border-emerald-200 bg-emerald-50 p-4">
                <label className="block text-sm font-semibold text-emerald-900 mb-2">
                  Custom Image URL (optional)
                </label>
                <input
                  type="url"
                  value={formState.imageUrl}
                  onChange={(e) =>
                    setFormState(prev => ({ ...prev, imageUrl: e.target.value }))
                  }
                  className="w-full px-4 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                  placeholder="https://..."
                />
                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setFormState(prev => ({ ...prev, imageUrl: '' }))}
                    className="px-4 py-2 rounded-lg border border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100 transition"
                  >
                    Use default
                  </button>
                  <p className="text-xs text-emerald-800">
                    Default comes from the selected Vision (or Head image).
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Todos */}
          <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-blue-900">📌 Todos</h3>
                <p className="text-xs text-blue-800">Break the task into small checkbox items.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowTodosEditor(v => !v)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>{showTodosEditor ? 'Hide Todos' : 'Todos'}</span>
              </button>
            </div>

            {showTodosEditor && (
              <div className="mt-4 space-y-3">
                {/* Add todo (2-line layout) */}
                <div className="rounded-xl border border-blue-200 bg-white p-3">
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
                    placeholder="Todo title (e.g., Sadha)"
                  />

                  <div className="mt-2 flex flex-col md:flex-row gap-2">
                    <input
                      type="date"
                      value={newTodoDueDate || formState.dueDate || ''}
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

                {(formState.todos || []).length === 0 ? (
                  <div className="text-sm text-blue-800 bg-white border border-blue-200 rounded-lg px-4 py-3">
                    No todos yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(formState.todos || []).map(todo => (
                      <div key={todo.id} className="bg-white border border-blue-200 rounded-xl px-3 py-3">
                        {/* Line 1: Todo title */}
                        <input
                          type="text"
                          value={todo.title}
                          onChange={(e) => updateTodo(todo.id, { title: e.target.value })}
                          className={`w-full bg-transparent outline-none text-sm px-1 ${todo.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}
                        />

                        {/* Line 2: date + time + checkbox + remove */}
                        <div className="mt-2 flex flex-col md:flex-row md:items-center gap-2">
                          <label className="inline-flex items-center gap-2 text-sm text-gray-700 md:mr-1">
                            <input
                              type="checkbox"
                              checked={!!todo.completed}
                              onChange={() => toggleTodo(todo.id)}
                              className="rounded border-gray-300"
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
                            aria-label="Delete todo"
                            title="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
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

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 px-0 pt-5 pb-5 border-t-2 border-blue-200 bg-gradient-to-r from-blue-50 via-white to-emerald-50 sticky bottom-0">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              {editingTask ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
