'use client';

import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Target, Flag, CheckSquare, Bell } from 'lucide-react';

interface Item {
  id: string;
  type: 'vision' | 'goal' | 'todo' | 'reminder';
  title: string;
  description?: string;
  date: string;
  completed?: boolean;
}

export default function WeeklyViewPage() {
  const [weekStartDate, setWeekStartDate] = useState(() => {
    const date = new Date();
    const day = date.getDay();
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff));
  });

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [items, setItems] = useState<Item[]>([
    // Sample data for the week
    { id: '1', type: 'vision', title: 'Complete Life Transformation', date: '2025-12-12' },
    { id: '2', type: 'goal', title: 'Morning workout', date: '2025-12-12' },
    { id: '3', type: 'goal', title: 'Read 20 pages', date: '2025-12-12' },
    { id: '4', type: 'todo', title: 'Finish project', date: '2025-12-12', completed: false },
    { id: '5', type: 'todo', title: 'Call mom', date: '2025-12-12', completed: true },
    { id: '6', type: 'reminder', title: 'Take vitamins', date: '2025-12-12' },
    { id: '7', type: 'vision', title: 'Build healthy habits', date: '2025-12-13' },
    { id: '8', type: 'goal', title: 'Meditation practice', date: '2025-12-13' },
    { id: '9', type: 'todo', title: 'Grocery shopping', date: '2025-12-13', completed: false },
    { id: '10', type: 'goal', title: 'Study programming', date: '2025-12-14' },
    { id: '11', type: 'todo', title: 'Pay bills', date: '2025-12-14', completed: false },
    { id: '12', type: 'reminder', title: 'Doctor appointment', date: '2025-12-15' },
  ]);

  // Get days of the week
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStartDate);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  }, [weekStartDate]);

  // Format date for display
  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const formatDateISO = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Navigation handlers
  const handlePreviousWeek = useCallback(() => {
    const newDate = new Date(weekStartDate);
    newDate.setDate(newDate.getDate() - 7);
    setWeekStartDate(newDate);
  }, [weekStartDate]);

  const handleNextWeek = useCallback(() => {
    const newDate = new Date(weekStartDate);
    newDate.setDate(newDate.getDate() + 7);
    setWeekStartDate(newDate);
  }, [weekStartDate]);

  const handleCurrentWeek = useCallback(() => {
    const date = new Date();
    const day = date.getDay();
    const diff = date.getDate() - day;
    setWeekStartDate(new Date(date.setDate(diff)));
  }, []);

  // Get items for selected date
  const selectedDateItems = useMemo(() => {
    const dateISO = formatDateISO(selectedDate);
    return items.filter((item) => item.date === dateISO);
  }, [selectedDate, items]);

  // Group items by type
  const groupedItems = useMemo(() => {
    return {
      visions: selectedDateItems.filter((item) => item.type === 'vision'),
      goals: selectedDateItems.filter((item) => item.type === 'goal'),
      todos: selectedDateItems.filter((item) => item.type === 'todo'),
      reminders: selectedDateItems.filter((item) => item.type === 'reminder'),
    };
  }, [selectedDateItems]);

  // Calculate week stats
  const weekStats = useMemo(() => {
    const todos = items.filter((item) => item.type === 'todo');
    const completed = todos.filter((t) => t.completed).length;
    const percentage = todos.length > 0 ? Math.round((completed / todos.length) * 100) : 0;
    return {
      visions: items.filter((item) => item.type === 'vision').length,
      goals: items.filter((item) => item.type === 'goal').length,
      todos: todos.length,
      reminders: items.filter((item) => item.type === 'reminder').length,
      completed,
      percentage,
    };
  }, [items]);

  return (
    <div className="relative flex gap-4 min-h-screen">
      {/* Left Navigation Arrow */}
      <div className="flex items-center">
        <button
          onClick={handlePreviousWeek}
          className="flex items-center justify-center h-16 w-16 rounded-2xl bg-red-500 hover:bg-red-600 transition shadow-lg active:scale-95"
          title="Previous week"
        >
          <ChevronLeft className="h-10 w-10 text-white" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Header with Week Navigation */}
        <div className="flex items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-6 border border-blue-200">
          <div className="text-center flex-1">
            <p className="text-sm font-medium text-gray-600">Week View</p>
            <h1 className="text-3xl font-bold text-gray-900 mt-1">
              {formatDateShort(weekDays[0])} - {formatDateShort(weekDays[6])}
            </h1>
            <button
              onClick={handleCurrentWeek}
              className="mt-3 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition"
            >
              Current Week
            </button>
          </div>
        </div>

      {/* Weekly Progress Bar */}
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Weekly Progress</h3>
          <span className="text-2xl font-bold text-green-600">{weekStats.percentage}%</span>
        </div>
        <div className="w-full bg-gray-300 rounded-full h-3 mb-3">
          <div
            className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${weekStats.percentage}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mb-4">
          {weekStats.completed} of {weekStats.todos} todos completed
        </p>

        {/* Weekly Stats */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="rounded-lg bg-purple-50 p-2 text-center">
            <p className="text-xs font-medium text-gray-600">Visions</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{weekStats.visions}</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-2 text-center">
            <p className="text-xs font-medium text-gray-600">Goals</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{weekStats.goals}</p>
          </div>
          <div className="rounded-lg bg-green-50 p-2 text-center">
            <p className="text-xs font-medium text-gray-600">Todos</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{weekStats.todos}</p>
          </div>
          <div className="rounded-lg bg-orange-50 p-2 text-center">
            <p className="text-xs font-medium text-gray-600">Reminders</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{weekStats.reminders}</p>
          </div>
        </div>
      </div>

      {/* 7-Day Calendar */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((date, index) => {
          const dateISO = formatDateISO(date);
          const dayItems = items.filter((item) => item.date === dateISO);
          const isSelected =
            selectedDate.toDateString() === date.toDateString();
          const isToday = new Date().toDateString() === date.toDateString();

          return (
            <button
              key={index}
              onClick={() => setSelectedDate(new Date(date))}
              className={`rounded-xl p-4 transition transform hover:scale-105 ${
                isSelected
                  ? 'ring-2 ring-offset-2 ring-blue-500 bg-blue-100 border-2 border-blue-400'
                  : isToday
                  ? 'border-2 border-red-400 bg-red-50'
                  : 'border-2 border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <p className="font-semibold text-gray-900">{formatDayName(date)}</p>
              <p className={`text-lg font-bold mt-1 ${
                isToday ? 'text-red-600' : 'text-gray-700'
              }`}>
                {date.getDate()}
              </p>
              <div className="mt-2 space-y-1 text-xs">
                {dayItems.length > 0 && (
                  <>
                    {dayItems.some((item) => item.type === 'vision') && (
                      <span className="block bg-purple-200 text-purple-800 px-2 py-1 rounded">
                        Vision
                      </span>
                    )}
                    {dayItems.some((item) => item.type === 'goal') && (
                      <span className="block bg-blue-200 text-blue-800 px-2 py-1 rounded">
                        Goal
                      </span>
                    )}
                    {dayItems.some((item) => item.type === 'todo') && (
                      <span className="block bg-green-200 text-green-800 px-2 py-1 rounded">
                        Todo
                      </span>
                    )}
                    {dayItems.some((item) => item.type === 'reminder') && (
                      <span className="block bg-orange-200 text-orange-800 px-2 py-1 rounded">
                        Reminder
                      </span>
                    )}
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Day Details */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">
          {selectedDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </h2>

        {selectedDateItems.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-600 text-lg">No items for this day</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Visions */}
            {groupedItems.visions.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  Visions ({groupedItems.visions.length})
                </h3>
                <div className="grid gap-2">
                  {groupedItems.visions.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-purple-200 bg-purple-50 p-3"
                    >
                      <p className="font-medium text-gray-900">{item.title}</p>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Goals */}
            {groupedItems.goals.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Flag className="h-5 w-5 text-blue-600" />
                  Goals ({groupedItems.goals.length})
                </h3>
                <div className="grid gap-2">
                  {groupedItems.goals.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-blue-200 bg-blue-50 p-3"
                    >
                      <p className="font-medium text-gray-900">{item.title}</p>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Todos */}
            {groupedItems.todos.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-green-600" />
                  Todos ({groupedItems.todos.length})
                </h3>
                <div className="grid gap-2">
                  {groupedItems.todos.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-lg border-2 p-3 transition ${
                        item.completed
                          ? 'border-green-300 bg-green-50 opacity-60'
                          : 'border-green-200 bg-green-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.completed || false}
                          onChange={(e) => {
                            setItems(
                              items.map((i) =>
                                i.id === item.id
                                  ? { ...i, completed: e.target.checked }
                                  : i
                              )
                            );
                          }}
                          className="w-4 h-4 rounded text-green-600 cursor-pointer"
                        />
                        <p
                          className={`font-medium ${
                            item.completed
                              ? 'line-through text-gray-500'
                              : 'text-gray-900'
                          }`}
                        >
                          {item.title}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reminders */}
            {groupedItems.reminders.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Bell className="h-5 w-5 text-orange-600" />
                  Reminders ({groupedItems.reminders.length})
                </h3>
                <div className="grid gap-2">
                  {groupedItems.reminders.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-orange-200 bg-orange-50 p-3"
                    >
                      <p className="font-medium text-gray-900">{item.title}</p>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      </div>

      {/* Right Navigation Arrow */}
      <div className="flex items-center">
        <button
          onClick={handleNextWeek}
          className="flex items-center justify-center h-16 w-16 rounded-2xl bg-red-500 hover:bg-red-600 transition shadow-lg active:scale-95"
          title="Next week"
        >
          <ChevronRight className="h-10 w-10 text-white" />
        </button>
      </div>
    </div>
  );
}
