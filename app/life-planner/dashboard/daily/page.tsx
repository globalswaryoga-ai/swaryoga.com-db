'use client';

import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Target, Flag, CheckSquare, Bell } from 'lucide-react';

interface DailyItem {
  type: 'vision' | 'goal' | 'todo' | 'reminder';
  id: string;
  title: string;
  description?: string;
  completed?: boolean;
  date?: string;
}

export default function DailyViewPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyItems, setDailyItems] = useState<DailyItem[]>([
    // Sample data - In production, this would come from localStorage or database
    { type: 'vision', id: '1', title: 'Complete Life Transformation', description: 'Long-term health and wellness goals' },
    { type: 'goal', id: '2', title: 'Exercise for 30 minutes', description: 'Morning workout routine' },
    { type: 'goal', id: '3', title: 'Read 20 pages', description: 'Personal development' },
    { type: 'todo', id: '4', title: 'Finish project report', completed: false },
    { type: 'todo', id: '5', title: 'Call mom', completed: true },
    { type: 'todo', id: '6', title: 'Grocery shopping', completed: false },
    { type: 'reminder', id: '7', title: 'Take vitamins', description: 'Morning health routine' },
    { type: 'reminder', id: '8', title: 'Team meeting', description: '2:00 PM' },
  ]);

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Navigation handlers
  const handlePreviousDay = useCallback(() => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  }, [selectedDate]);

  const handleNextDay = useCallback(() => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  }, [selectedDate]);

  const handleToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  // Check if selected date is today
  const isToday = useMemo(() => {
    const today = new Date();
    return (
      selectedDate.getDate() === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    );
  }, [selectedDate]);

  // Group items by type
  const groupedItems = useMemo(() => {
    return {
      visions: dailyItems.filter((item) => item.type === 'vision'),
      goals: dailyItems.filter((item) => item.type === 'goal'),
      todos: dailyItems.filter((item) => item.type === 'todo'),
      reminders: dailyItems.filter((item) => item.type === 'reminder'),
    };
  }, [dailyItems]);

  // Calculate completion stats
  const completionStats = useMemo(() => {
    const todos = groupedItems.todos;
    const completed = todos.filter((t) => t.completed).length;
    const percentage = todos.length > 0 ? Math.round((completed / todos.length) * 100) : 0;
    return { completed, total: todos.length, percentage };
  }, [groupedItems.todos]);

  return (
    <div className="relative flex gap-4 min-h-screen">
      {/* Left Navigation Arrow */}
      <div className="flex items-center">
        <button
          onClick={handlePreviousDay}
          className="flex items-center justify-center h-16 w-16 rounded-2xl bg-red-500 hover:bg-red-600 transition shadow-lg active:scale-95"
          title="Previous day"
        >
          <ChevronLeft className="h-10 w-10 text-white" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Header with Date Navigation */}
        <div className="flex items-center justify-center bg-gradient-to-r from-pink-50 to-purple-50 rounded-3xl p-6 border border-swar-border">
          <div className="text-center flex-1">
            <p className="text-sm font-medium text-swar-text-secondary">Selected Date</p>
            <h1 className="text-3xl font-bold text-swar-text mt-1">{formatDate(selectedDate)}</h1>
            {!isToday && (
              <button
                onClick={handleToday}
                className="mt-3 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition"
              >
                Go to Today
              </button>
            )}
          </div>
        </div>

      {/* Daily Progress Graph */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 text-center">
          <p className="text-xs font-medium text-swar-text-secondary">Visions</p>
          <p className="text-3xl font-bold text-purple-600 mt-2">{groupedItems.visions.length}</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-center">
          <p className="text-xs font-medium text-swar-text-secondary">Goals</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{groupedItems.goals.length}</p>
        </div>
        <div className="rounded-2xl border border-green-200 bg-swar-primary-light p-4 text-center">
          <p className="text-xs font-medium text-swar-text-secondary">Todos</p>
          <p className="text-3xl font-bold text-swar-primary mt-2">{groupedItems.todos.length}</p>
        </div>
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-center">
          <p className="text-xs font-medium text-swar-text-secondary">Reminders</p>
          <p className="text-3xl font-bold text-orange-600 mt-2">{groupedItems.reminders.length}</p>
        </div>
      </div>

      {/* Todo Completion Progress */}
      <div className="rounded-2xl border border-green-200 bg-swar-primary-light p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-swar-text">Daily Completion</h3>
          <span className="text-2xl font-bold text-swar-primary">{completionStats.percentage}%</span>
        </div>
        <div className="w-full bg-gray-300 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${completionStats.percentage}%` }}
          />
        </div>
        <p className="text-sm text-swar-text-secondary mt-2">
          {completionStats.completed} of {completionStats.total} todos completed
        </p>
      </div>

      {/* Daily Items by Type */}
      <div className="space-y-6">
        {/* Visions */}
        {groupedItems.visions.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-swar-text mb-4 flex items-center gap-2">
              <Target className="h-6 w-6 text-purple-600" />
              Today's Visions
            </h2>
            <div className="grid gap-3">
              {groupedItems.visions.map((item) => (
                <div key={item.id} className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
                  <h3 className="font-semibold text-swar-text">{item.title}</h3>
                  {item.description && <p className="text-sm text-swar-text-secondary mt-1">{item.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Goals */}
        {groupedItems.goals.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-swar-text mb-4 flex items-center gap-2">
              <Flag className="h-6 w-6 text-blue-600" />
              Today's Goals
            </h2>
            <div className="grid gap-3">
              {groupedItems.goals.map((item) => (
                <div key={item.id} className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <h3 className="font-semibold text-swar-text">{item.title}</h3>
                  {item.description && <p className="text-sm text-swar-text-secondary mt-1">{item.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Todos */}
        {groupedItems.todos.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-swar-text mb-4 flex items-center gap-2">
              <CheckSquare className="h-6 w-6 text-swar-primary" />
              Today's Todos
            </h2>
            <div className="grid gap-3">
              {groupedItems.todos.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-2xl border-2 p-4 transition ${
                    item.completed
                      ? 'border-green-300 bg-swar-primary-light opacity-60'
                      : 'border-green-200 bg-swar-primary-light hover:border-green-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={item.completed || false}
                      onChange={(e) => {
                        setDailyItems(
                          dailyItems.map((i) =>
                            i.id === item.id ? { ...i, completed: e.target.checked } : i
                          )
                        );
                      }}
                      className="w-5 h-5 rounded text-swar-primary cursor-pointer"
                    />
                    <h3 className={`font-semibold ${item.completed ? 'line-through text-swar-text-secondary' : 'text-swar-text'}`}>
                      {item.title}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reminders */}
        {groupedItems.reminders.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-swar-text mb-4 flex items-center gap-2">
              <Bell className="h-6 w-6 text-orange-600" />
              Today's Reminders
            </h2>
            <div className="grid gap-3">
              {groupedItems.reminders.map((item) => (
                <div key={item.id} className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                  <h3 className="font-semibold text-swar-text">{item.title}</h3>
                  {item.description && <p className="text-sm text-swar-text-secondary mt-1">{item.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {dailyItems.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-swar-border p-12 text-center">
            <p className="text-swar-text-secondary text-lg">No items scheduled for {formatDateShort(selectedDate)}</p>
            <p className="text-swar-text-secondary text-sm mt-1">Add visions, goals, todos, or reminders to get started</p>
          </div>
        )}
      </div>
      </div>

      {/* Right Navigation Arrow */}
      <div className="flex items-center">
        <button
          onClick={handleNextDay}
          className="flex items-center justify-center h-16 w-16 rounded-2xl bg-red-500 hover:bg-red-600 transition shadow-lg active:scale-95"
          title="Next day"
        >
          <ChevronRight className="h-10 w-10 text-white" />
        </button>
      </div>
    </div>
  );
}
