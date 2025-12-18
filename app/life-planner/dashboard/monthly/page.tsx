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

export default function MonthlyViewPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 11, 1)); // December 2025
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [items, setItems] = useState<Item[]>([
    { id: '1', type: 'vision', title: 'Complete Life Transformation', date: '2025-12-12' },
    { id: '2', type: 'goal', title: 'Morning workout', date: '2025-12-12' },
    { id: '3', type: 'todo', title: 'Finish project', date: '2025-12-12', completed: false },
    { id: '4', type: 'reminder', title: 'Take vitamins', date: '2025-12-12' },
    { id: '5', type: 'vision', title: 'Build healthy habits', date: '2025-12-15' },
    { id: '6', type: 'goal', title: 'Meditation practice', date: '2025-12-15' },
    { id: '7', type: 'todo', title: 'Grocery shopping', date: '2025-12-15', completed: true },
    { id: '8', type: 'goal', title: 'Study programming', date: '2025-12-20' },
    { id: '9', type: 'todo', title: 'Pay bills', date: '2025-12-20', completed: false },
    { id: '10', type: 'reminder', title: 'Doctor appointment', date: '2025-12-25' },
  ]);

  // Get days in month
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const monthDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      days.push(date);
    }
    return days;
  }, [currentDate, daysInMonth, firstDay]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatDateISO = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Navigation handlers
  const handlePreviousMonth = useCallback(() => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  }, [currentDate]);

  const handleNextMonth = useCallback(() => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  }, [currentDate]);

  const handleCurrentMonth = useCallback(() => {
    setCurrentDate(new Date());
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

  // Calculate month stats
  const monthStats = useMemo(() => {
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

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="relative flex gap-4 min-h-screen">
      {/* Left Navigation Arrow */}
      <div className="flex items-center">
        <button
          onClick={handlePreviousMonth}
          className="flex items-center justify-center h-16 w-16 rounded-2xl bg-swar-accent hover:bg-swar-accent-hover transition shadow-lg active:scale-95"
          title="Previous month"
        >
          <ChevronLeft className="h-10 w-10 text-white" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Header with Month Navigation */}
        <div className="flex items-center justify-center bg-gradient-to-r from-green-50 to-emerald-50 rounded-3xl p-6 border border-green-200">
          <div className="text-center flex-1">
            <p className="text-sm font-medium text-swar-text-secondary">Month View</p>
            <h1 className="text-3xl font-bold text-swar-text mt-1">{formatDate(currentDate)}</h1>
            <button
              onClick={handleCurrentMonth}
              className="mt-3 px-4 py-2 rounded-lg bg-swar-primary-light0 text-white text-sm font-semibold hover:bg-swar-primary transition"
            >
              Current Month
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Progress Bar */}
      <div className="rounded-2xl border border-green-200 bg-swar-primary-light p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-swar-text">Monthly Progress</h3>
          <span className="text-2xl font-bold text-swar-primary">{monthStats.percentage}%</span>
        </div>
        <div className="w-full bg-gray-300 rounded-full h-3 mb-3">
          <div
            className="bg-gradient-to-r from-green-500 to-swar-primary h-3 rounded-full transition-all duration-300"
            style={{ width: `${monthStats.percentage}%` }}
          />
        </div>
        <p className="text-sm text-swar-text-secondary mb-4">
          {monthStats.completed} of {monthStats.todos} todos completed
        </p>

        {/* Monthly Stats */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="rounded-lg bg-purple-50 p-2 text-center">
            <p className="text-xs font-medium text-swar-text-secondary">Visions</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{monthStats.visions}</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-2 text-center">
            <p className="text-xs font-medium text-swar-text-secondary">Goals</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{monthStats.goals}</p>
          </div>
          <div className="rounded-lg bg-swar-primary-light p-2 text-center">
            <p className="text-xs font-medium text-swar-text-secondary">Todos</p>
            <p className="text-2xl font-bold text-swar-primary mt-1">{monthStats.todos}</p>
          </div>
          <div className="rounded-lg bg-orange-50 p-2 text-center">
            <p className="text-xs font-medium text-swar-text-secondary">Reminders</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{monthStats.reminders}</p>
          </div>
        </div>
      </div>

      {/* Month Calendar Grid */}
      <div className="bg-white rounded-2xl border border-swar-border overflow-hidden">
        {/* Day names header */}
        <div className="grid grid-cols-7 gap-0 bg-swar-primary-light">
          {dayNames.map((day) => (
            <div key={day} className="p-3 text-center font-semibold text-swar-text border-b border-swar-border">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-0">
          {monthDays.map((date, index) => {
            if (!date) {
              return (
                <div key={`empty-${index}`} className="bg-swar-bg p-2 min-h-24 border border-gray-100" />
              );
            }

            const dateISO = formatDateISO(date);
            const dayItems = items.filter((item) => item.date === dateISO);
            const isSelected = selectedDate.toDateString() === date.toDateString();
            const isToday = new Date().toDateString() === date.toDateString();

            return (
              <button
                key={dateISO}
                onClick={() => setSelectedDate(new Date(date))}
                className={`p-2 min-h-24 border transition hover:bg-blue-50 ${
                  isSelected
                    ? 'ring-2 ring-inset ring-blue-500 bg-blue-100'
                    : isToday
                    ? 'bg-red-50 border-red-300'
                    : 'border-gray-100 bg-white'
                }`}
              >
                <p className={`font-bold text-sm mb-1 ${
                  isToday ? 'text-red-600' : 'text-swar-text'
                }`}>
                  {date.getDate()}
                </p>
                <div className="space-y-1 text-xs">
                  {dayItems.length > 0 && (
                    <>
                      {dayItems.some((item) => item.type === 'vision') && (
                        <span className="block bg-purple-200 text-purple-800 px-1 py-0.5 rounded truncate">
                          Vision
                        </span>
                      )}
                      {dayItems.some((item) => item.type === 'goal') && (
                        <span className="block bg-blue-200 text-blue-800 px-1 py-0.5 rounded truncate">
                          Goal
                        </span>
                      )}
                      {dayItems.some((item) => item.type === 'todo') && (
                        <span className="block bg-swar-border text-swar-primary px-1 py-0.5 rounded truncate">
                          Todo
                        </span>
                      )}
                      {dayItems.some((item) => item.type === 'reminder') && (
                        <span className="block bg-orange-200 text-orange-800 px-1 py-0.5 rounded truncate">
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
      </div>

      {/* Selected Day Details */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-swar-text">
          {selectedDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </h2>

        {selectedDateItems.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-swar-border p-12 text-center">
            <p className="text-swar-text-secondary text-lg">No items for this day</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Visions */}
            {groupedItems.visions.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-swar-text mb-2 flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  Visions ({groupedItems.visions.length})
                </h3>
                <div className="grid gap-2">
                  {groupedItems.visions.map((item) => (
                    <div key={item.id} className="rounded-lg border border-purple-200 bg-purple-50 p-3">
                      <p className="font-medium text-swar-text">{item.title}</p>
                      {item.description && (
                        <p className="text-sm text-swar-text-secondary mt-1">{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Goals */}
            {groupedItems.goals.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-swar-text mb-2 flex items-center gap-2">
                  <Flag className="h-5 w-5 text-blue-600" />
                  Goals ({groupedItems.goals.length})
                </h3>
                <div className="grid gap-2">
                  {groupedItems.goals.map((item) => (
                    <div key={item.id} className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <p className="font-medium text-swar-text">{item.title}</p>
                      {item.description && (
                        <p className="text-sm text-swar-text-secondary mt-1">{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Todos */}
            {groupedItems.todos.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-swar-text mb-2 flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-swar-primary" />
                  Todos ({groupedItems.todos.length})
                </h3>
                <div className="grid gap-2">
                  {groupedItems.todos.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-lg border-2 p-3 transition ${
                        item.completed
                          ? 'border-green-300 bg-swar-primary-light opacity-60'
                          : 'border-green-200 bg-swar-primary-light'
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
                          className="w-4 h-4 rounded text-swar-primary cursor-pointer"
                        />
                        <p
                          className={`font-medium ${
                            item.completed
                              ? 'line-through text-swar-text-secondary'
                              : 'text-swar-text'
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
                <h3 className="text-lg font-semibold text-swar-text mb-2 flex items-center gap-2">
                  <Bell className="h-5 w-5 text-orange-600" />
                  Reminders ({groupedItems.reminders.length})
                </h3>
                <div className="grid gap-2">
                  {groupedItems.reminders.map((item) => (
                    <div key={item.id} className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                      <p className="font-medium text-swar-text">{item.title}</p>
                      {item.description && (
                        <p className="text-sm text-swar-text-secondary mt-1">{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Navigation Arrow */}
      <div className="flex items-center">
        <button
          onClick={handleNextMonth}
          className="flex items-center justify-center h-16 w-16 rounded-2xl bg-swar-accent hover:bg-swar-accent-hover transition shadow-lg active:scale-95"
          title="Next month"
        >
          <ChevronRight className="h-10 w-10 text-white" />
        </button>
      </div>
    </div>
  );
}
