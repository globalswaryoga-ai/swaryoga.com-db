'use client';

import { useState } from 'react';
import type { ActionPlanGoal, MiniTask, MiniTodo, MiniReminder } from '@/lib/types/lifePlanner';

interface GoalSectionProps {
  goal: ActionPlanGoal;
  index: number;
  onUpdate: (id: string, goal: ActionPlanGoal) => void;
  onDelete: (id: string) => void;
}

function normalizeActionPlanGoalStatus(status: unknown): ActionPlanGoal['status'] {
  if (typeof status !== 'string') return undefined;
  if (status === 'working') return 'in-progress';
  if (status === 'done') return 'completed';
  if (status === 'pending') return 'on-hold';
  if (status === 'not-started' || status === 'in-progress' || status === 'completed' || status === 'on-hold') {
    return status;
  }
  return undefined;
}

export default function GoalSection({ goal, index, onUpdate, onDelete }: GoalSectionProps) {
  const normalizedStatus = normalizeActionPlanGoalStatus(goal.status as unknown);
  const [showTasks, setShowTasks] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const tasks = goal.tasks || [];

  const addTask = () => {
    const t = newTaskTitle.trim();
    if (!t) return;
    const newTask: MiniTask = {
      id: `task-${Date.now()}`,
      title: t,
      startDate: goal.startDate,
      dueDate: goal.endDate,
      status: 'not-started',
      priority: 'medium',
      completed: false,
      todos: [],
    };
    onUpdate(goal.id, { ...goal, tasks: [...tasks, newTask] });
    setNewTaskTitle('');
  };

  const updateTask = (taskId: string, patch: Partial<MiniTask>) => {
    onUpdate(goal.id, {
      ...goal,
      tasks: tasks.map(t => t.id === taskId ? { ...t, ...patch } : t),
    });
  };

  const deleteTask = (taskId: string) => {
    onUpdate(goal.id, { ...goal, tasks: tasks.filter(t => t.id !== taskId) });
  };

  const addTodoToTask = (taskId: string, title: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newTodo: MiniTodo = {
      id: `todo-${Date.now()}`,
      title,
      dueDate: task.dueDate,
      dueTime: '11:00',
      completed: false,
      reminders: [],
    };
    updateTask(taskId, { todos: [...(task.todos || []), newTodo] });
  };

  const updateTodoInTask = (taskId: string, todoId: string, patch: Partial<MiniTodo>) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    updateTask(taskId, {
      todos: (task.todos || []).map(td => td.id === todoId ? { ...td, ...patch } : td),
    });
  };

  const deleteTodoFromTask = (taskId: string, todoId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    updateTask(taskId, { todos: (task.todos || []).filter(td => td.id !== todoId) });
  };

  const addReminderToTodo = (taskId: string, todoId: string, title: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const todo = (task.todos || []).find(td => td.id === todoId);
    if (!todo) return;
    const newReminder: MiniReminder = {
      id: `rem-${Date.now()}`,
      title,
      date: todo.dueDate,
      time: todo.dueTime || '11:00',
      completed: false,
    };
    updateTodoInTask(taskId, todoId, { reminders: [...(todo.reminders || []), newReminder] });
  };

  const deleteReminderFromTodo = (taskId: string, todoId: string, remId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const todo = (task.todos || []).find(td => td.id === todoId);
    if (!todo) return;
    updateTodoInTask(taskId, todoId, { reminders: (todo.reminders || []).filter(r => r.id !== remId) });
  };

  return (
    <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-semibold text-blue-800">Goal {index + 1}</h4>
        <button
          onClick={() => onDelete(goal.id)}
          className="text-red-500 hover:text-swar-primary font-bold"
        >
          Delete
        </button>
      </div>

      <div className="space-y-3">
        {/* Goal Name */}
        <div>
          <label className="block text-xs font-semibold text-swar-text mb-1">Goal Name *</label>
          <input
            type="text"
            value={goal.title}
            onChange={e => onUpdate(goal.id, { ...goal, title: e.target.value })}
            placeholder="Goal name"
            className="w-full px-3 py-2 border border-swar-border rounded text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-swar-text mb-1">Description</label>
          <textarea
            value={goal.description}
            onChange={e => onUpdate(goal.id, { ...goal, description: e.target.value })}
            placeholder="Goal description"
            rows={2}
            className="w-full px-3 py-2 border border-swar-border rounded text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-swar-text mb-1">Start Date *</label>
            <input
              type="date"
              value={goal.startDate}
              onChange={e => onUpdate(goal.id, { ...goal, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-swar-border rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-swar-text mb-1">End Date *</label>
            <input
              type="date"
              value={goal.endDate}
              onChange={e => onUpdate(goal.id, { ...goal, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-swar-border rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Working Time */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-swar-text mb-1">Working Time Start</label>
            <input
              type="time"
              value={goal.workingTimeStart}
              onChange={e => onUpdate(goal.id, { ...goal, workingTimeStart: e.target.value })}
              className="w-full px-3 py-2 border border-swar-border rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-swar-text mb-1">Working Time End</label>
            <input
              type="time"
              value={goal.workingTimeEnd}
              onChange={e => onUpdate(goal.id, { ...goal, workingTimeEnd: e.target.value })}
              className="w-full px-3 py-2 border border-swar-border rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Place */}
        <div>
          <label className="block text-xs font-semibold text-swar-text mb-1">Place *</label>
          <input
            type="text"
            value={goal.place}
            onChange={e => onUpdate(goal.id, { ...goal, place: e.target.value })}
            placeholder="Work location"
            className="w-full px-3 py-2 border border-swar-border rounded text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Expected Amount */}
        <div>
          <label className="block text-xs font-semibold text-swar-text mb-1">Expected Amount (Rs.)</label>
          <input
            type="number"
            value={goal.expectedAmount || 0}
            onChange={e => onUpdate(goal.id, { ...goal, expectedAmount: Number(e.target.value) })}
            placeholder="0"
            className="w-full px-3 py-2 border border-swar-border rounded text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-semibold text-swar-text mb-1">Status</label>
          <select
            value={normalizedStatus ?? 'not-started'}
            onChange={e => onUpdate(goal.id, { ...goal, status: e.target.value as ActionPlanGoal['status'] })}
            className="w-full px-3 py-2 border border-swar-border rounded text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="not-started">Not Started</option>
            <option value="in-progress">In Progress</option>
            <option value="on-hold">On Hold</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* ─── TASKS inside this Goal ─── */}
        <div className="border-t border-blue-200 pt-3 mt-3">
          <div className="flex justify-between items-center mb-2">
            <h5 className="text-sm font-bold text-blue-700">Tasks ({tasks.length})</h5>
            <button
              type="button"
              onClick={() => setShowTasks(v => !v)}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              {showTasks ? 'Hide Tasks' : '+ Tasks'}
            </button>
          </div>

          {showTasks && (
            <div className="space-y-2 ml-2">
              {/* Add task input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTask(); } }}
                  placeholder="New task title"
                  className="flex-1 px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
                <button type="button" onClick={addTask} className="px-4 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition">
                  Add
                </button>
              </div>

              {/* Task list */}
              {tasks.map((task, tIdx) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={tIdx}
                  onUpdateTask={updateTask}
                  onDeleteTask={deleteTask}
                  onAddTodo={addTodoToTask}
                  onUpdateTodo={updateTodoInTask}
                  onDeleteTodo={deleteTodoFromTask}
                  onAddReminder={addReminderToTodo}
                  onDeleteReminder={deleteReminderFromTodo}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────── Task Card (inside Goal) ────────── */
function TaskCard({
  task, index, onUpdateTask, onDeleteTask,
  onAddTodo, onUpdateTodo, onDeleteTodo,
  onAddReminder, onDeleteReminder,
}: {
  task: MiniTask;
  index: number;
  onUpdateTask: (id: string, patch: Partial<MiniTask>) => void;
  onDeleteTask: (id: string) => void;
  onAddTodo: (taskId: string, title: string) => void;
  onUpdateTodo: (taskId: string, todoId: string, patch: Partial<MiniTodo>) => void;
  onDeleteTodo: (taskId: string, todoId: string) => void;
  onAddReminder: (taskId: string, todoId: string, title: string) => void;
  onDeleteReminder: (taskId: string, todoId: string, remId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const todos = task.todos || [];

  return (
    <div className="bg-white border border-blue-200 rounded-xl p-3">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setExpanded(v => !v)} className="text-blue-600 text-xs font-bold">
          {expanded ? '▼' : '▶'}
        </button>
        <input
          type="text"
          value={task.title}
          onChange={e => onUpdateTask(task.id, { title: e.target.value })}
          className="flex-1 bg-transparent outline-none text-sm font-medium text-swar-text"
        />
        <span className="text-[10px] text-blue-500 font-bold whitespace-nowrap">Task {index + 1}</span>
        <button type="button" onClick={() => onDeleteTask(task.id)} className="text-red-500 text-xs hover:text-red-700">
          Remove
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 ml-4">
          {/* Task dates */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-swar-text-secondary mb-0.5">Start</label>
              <input type="date" value={task.startDate || ''} onChange={e => onUpdateTask(task.id, { startDate: e.target.value })}
                className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-swar-text-secondary mb-0.5">Due</label>
              <input type="date" value={task.dueDate || ''} onChange={e => onUpdateTask(task.id, { dueDate: e.target.value })}
                className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          {/* Todos inside this task */}
          <div className="border-t border-gray-100 pt-2">
            <h6 className="text-xs font-bold text-swar-text mb-1">Todos ({todos.length})</h6>
            <div className="flex gap-1 mb-2">
              <input
                type="text"
                value={newTodoTitle}
                onChange={e => setNewTodoTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newTodoTitle.trim()) { onAddTodo(task.id, newTodoTitle.trim()); setNewTodoTitle(''); } } }}
                placeholder="New todo"
                className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-400 bg-white"
              />
              <button type="button" onClick={() => { if (newTodoTitle.trim()) { onAddTodo(task.id, newTodoTitle.trim()); setNewTodoTitle(''); } }}
                className="px-3 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 transition">
                Add
              </button>
            </div>

            {todos.map(todo => (
              <TodoCard
                key={todo.id}
                taskId={task.id}
                todo={todo}
                onUpdateTodo={onUpdateTodo}
                onDeleteTodo={onDeleteTodo}
                onAddReminder={onAddReminder}
                onDeleteReminder={onDeleteReminder}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────── Todo Card (inside Task) ────────── */
function TodoCard({
  taskId, todo, onUpdateTodo, onDeleteTodo, onAddReminder, onDeleteReminder,
}: {
  taskId: string;
  todo: MiniTodo;
  onUpdateTodo: (taskId: string, todoId: string, patch: Partial<MiniTodo>) => void;
  onDeleteTodo: (taskId: string, todoId: string) => void;
  onAddReminder: (taskId: string, todoId: string, title: string) => void;
  onDeleteReminder: (taskId: string, todoId: string, remId: string) => void;
}) {
  const [showReminders, setShowReminders] = useState(false);
  const [newRemTitle, setNewRemTitle] = useState('');
  const reminders = todo.reminders || [];

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 mb-1">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={!!todo.completed}
          onChange={() => onUpdateTodo(taskId, todo.id, { completed: !todo.completed })}
          className="rounded border-gray-300"
        />
        <input
          type="text"
          value={todo.title}
          onChange={e => onUpdateTodo(taskId, todo.id, { title: e.target.value })}
          className={`flex-1 bg-transparent outline-none text-xs ${todo.completed ? 'text-gray-400 line-through' : 'text-swar-text'}`}
        />
        <button type="button" onClick={() => setShowReminders(v => !v)}
          className="text-[10px] text-amber-600 font-bold hover:text-amber-700">
          🔔 {reminders.length}
        </button>
        <button type="button" onClick={() => onDeleteTodo(taskId, todo.id)}
          className="text-red-400 text-[10px] hover:text-red-600">✕</button>
      </div>

      {/* Date/Time row */}
      <div className="flex gap-2 mt-1 ml-5">
        <input type="date" value={todo.dueDate || ''} onChange={e => onUpdateTodo(taskId, todo.id, { dueDate: e.target.value })}
          className="px-2 py-0.5 border border-gray-200 rounded text-[10px] focus:outline-none focus:border-blue-400" />
        <input type="time" value={todo.dueTime || '11:00'} onChange={e => onUpdateTodo(taskId, todo.id, { dueTime: e.target.value })}
          className="px-2 py-0.5 border border-gray-200 rounded text-[10px] focus:outline-none focus:border-blue-400" />
      </div>

      {/* Reminders inside this todo */}
      {showReminders && (
        <div className="ml-5 mt-1 space-y-1">
          <div className="flex gap-1">
            <input
              type="text"
              value={newRemTitle}
              onChange={e => setNewRemTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newRemTitle.trim()) { onAddReminder(taskId, todo.id, newRemTitle.trim()); setNewRemTitle(''); } } }}
              placeholder="Reminder title"
              className="flex-1 px-2 py-0.5 border border-amber-200 rounded text-[10px] focus:outline-none focus:border-amber-500 bg-white"
            />
            <button type="button" onClick={() => { if (newRemTitle.trim()) { onAddReminder(taskId, todo.id, newRemTitle.trim()); setNewRemTitle(''); } }}
              className="px-2 py-0.5 bg-amber-500 text-white text-[10px] rounded hover:bg-amber-600 transition">
              Add
            </button>
          </div>
          {reminders.map(rem => (
            <div key={rem.id} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              <span className="text-[10px]">🔔</span>
              <span className="flex-1 text-[10px] text-swar-text">{rem.title}</span>
              <input type="date" value={rem.date || ''} onChange={e => {
                const task = undefined; // update via parent
                onUpdateTodo(taskId, todo.id, {
                  reminders: reminders.map(r => r.id === rem.id ? { ...r, date: e.target.value } : r),
                });
              }} className="px-1 py-0.5 border border-amber-200 rounded text-[10px] w-28" />
              <input type="time" value={rem.time || '11:00'} onChange={e => {
                onUpdateTodo(taskId, todo.id, {
                  reminders: reminders.map(r => r.id === rem.id ? { ...r, time: e.target.value } : r),
                });
              }} className="px-1 py-0.5 border border-amber-200 rounded text-[10px] w-20" />
              <button type="button" onClick={() => onDeleteReminder(taskId, todo.id, rem.id)}
                className="text-red-400 text-[10px] hover:text-red-600">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
