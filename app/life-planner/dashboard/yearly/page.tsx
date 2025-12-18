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

export default function YearlyViewPage() {
  const [currentYear, setCurrentYear] = useState(2025);
  const [selectedMonth, setSelectedMonth] = useState(new Date(2025, 11)); // December
  const [items, setItems] = useState<Item[]>([
    { id: '1', type: 'vision', title: 'Complete Life Transformation', date: '2025-12-12' },
    { id: '2', type: 'goal', title: 'Morning workout', date: '2025-12-12' },
    { id: '3', type: 'todo', title: 'Finish project', date: '2025-12-12', completed: false },
    { id: '4', type: 'reminder', title: 'Take vitamins', date: '2025-12-12' },
    { id: '5', type: 'vision', title: 'Build healthy habits', date: '2025-06-15' },
    { id: '6', type: 'goal', title: 'Learn new skill', date: '2025-03-10' },
    { id: '7', type: 'todo', title: 'Grocery shopping', date: '2025-09-20', completed: true },
    { id: '8', type: 'goal', title: 'Study programming', date: '2025-01-05' },
    { id: '9', type: 'todo', title: 'Annual review', date: '2025-12-31', completed: false },
    { id: '10', type: 'reminder', title: 'Doctor checkup', date: '2025-07-15' },
  ]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Navigation handlers
  const handlePreviousYear = useCallback(() => {
    setCurrentYear(currentYear - 1);
  }, [currentYear]);

  const handleNextYear = useCallback(() => {
    setCurrentYear(currentYear + 1);
  }, [currentYear]);

  const handleCurrentYear = useCallback(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  // Get items for selected month
  const selectedMonthItems = useMemo(() => {
    const monthStart = `${currentYear}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;
    return items.filter((item) => item.date.startsWith(monthStart));
  }, [selectedMonth, items, currentYear]);

  // Group items by type
  const groupedItems = useMemo(() => {
    return {
      visions: selectedMonthItems.filter((item) => item.type === 'vision'),
      goals: selectedMonthItems.filter((item) => item.type === 'goal'),
      todos: selectedMonthItems.filter((item) => item.type === 'todo'),
      reminders: selectedMonthItems.filter((item) => item.type === 'reminder'),
    };
  }, [selectedMonthItems]);

  // Calculate yearly stats
  const yearStats = useMemo(() => {
    const yearItems = items.filter((item) => item.date.startsWith(String(currentYear)));
    const todos = yearItems.filter((item) => item.type === 'todo');
    const completed = todos.filter((t) => t.completed).length;
    const percentage = todos.length > 0 ? Math.round((completed / todos.length) * 100) : 0;
    return {
      visions: yearItems.filter((item) => item.type === 'vision').length,
      goals: yearItems.filter((item) => item.type === 'goal').length,
      todos: todos.length,
      reminders: yearItems.filter((item) => item.type === 'reminder').length,
      completed,
      percentage,
    };
  }, [items, currentYear]);

  // Get items by month for stats
  const monthStats = useMemo(() => {
    return months.map((_, monthIndex) => {
      const monthStart = `${currentYear}-${String(monthIndex + 1).padStart(2, '0')}`;
      const monthItems = items.filter((item) => item.date.startsWith(monthStart));
      return monthItems.length;
    });
  }, [items, currentYear]);

  return (
    <div className="relative flex gap-4 min-h-screen">
      {/* Left Navigation Arrow */}
      <div className="flex items-center">
        <button
          onClick={handlePreviousYear}
          className="flex items-center justify-center h-16 w-16 rounded-2xl bg-red-500 hover:bg-red-600 transition shadow-lg active:scale-95"
          title="Previous year"
        >
          <ChevronLeft className="h-10 w-10 text-white" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Header with Year Navigation */}
        <div className="flex items-center justify-center bg-gradient-to-r from-orange-50 to-amber-50 rounded-3xl p-6 border border-orange-200">
          <div className="text-center flex-1">
            <p className="text-sm font-medium text-swar-text-secondary">Year View</p>
            <h1 className="text-4xl font-bold text-swar-text mt-1">{currentYear}</h1>
            <button
              onClick={handleCurrentYear}
              className="mt-3 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition"
            >
              Current Year
            </button>
          </div>
        </div>

      {/* Yearly Progress Bar */}
      <div className="rounded-2xl border border-green-200 bg-swar-primary-light p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-swar-text">Yearly Progress</h3>
          <span className="text-2xl font-bold text-swar-primary">{yearStats.percentage}%</span>
        </div>
        <div className="w-full bg-gray-300 rounded-full h-3 mb-3">
          <div
            className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${yearStats.percentage}%` }}
          />
        </div>
        <p className="text-sm text-swar-text-secondary mb-4">
          {yearStats.completed} of {yearStats.todos} todos completed
        </p>

        {/* Yearly Stats */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="rounded-lg bg-purple-50 p-2 text-center">
            <p className="text-xs font-medium text-swar-text-secondary">Visions</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{yearStats.visions}</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-2 text-center">
            <p className="text-xs font-medium text-swar-text-secondary">Goals</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{yearStats.goals}</p>
          </div>
          <div className="rounded-lg bg-swar-primary-light p-2 text-center">
            <p className="text-xs font-medium text-swar-text-secondary">Todos</p>
            <p className="text-2xl font-bold text-swar-primary mt-1">{yearStats.todos}</p>
          </div>
          <div className="rounded-lg bg-orange-50 p-2 text-center">
            <p className="text-xs font-medium text-swar-text-secondary">Reminders</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{yearStats.reminders}</p>
          </div>
        </div>
      </div>

      {/* 12-Month Grid */}
      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
        {months.map((month, monthIndex) => {
          const itemCount = monthStats[monthIndex];
          const isSelected = selectedMonth.getMonth() === monthIndex;
          const isCurrentMonth =
            new Date().getMonth() === monthIndex &&
            new Date().getFullYear() === currentYear;

          return (
            <button
              key={month}
              onClick={() => setSelectedMonth(new Date(currentYear, monthIndex))}
              className={`rounded-lg p-4 transition transform hover:scale-105 text-center ${
                isSelected
                  ? 'ring-2 ring-offset-2 ring-blue-500 bg-blue-100 border-2 border-blue-400'
                  : isCurrentMonth
                  ? 'bg-red-50 border-2 border-red-400'
                  : 'bg-white border-2 border-swar-border hover:border-swar-border'
              }`}
            >
              <p className="font-semibold text-swar-text text-sm">{month}</p>
              <p className={`text-2xl font-bold mt-2 ${
                itemCount > 0 ? 'text-swar-primary' : 'text-swar-text-secondary'
              }`}>
                {itemCount}
              </p>
              <p className="text-xs text-swar-text-secondary mt-1">items</p>
            </button>
          );
        })}
      </div>

      {/* Selected Month Details */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-swar-text">
          {months[selectedMonth.getMonth()]} {currentYear}
        </h2>

        {selectedMonthItems.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-swar-border p-12 text-center">
            <p className="text-swar-text-secondary text-lg">No items for this month</p>
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
                      <p className="text-xs text-swar-text-secondary mt-1">{item.date}</p>
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
                      <p className="text-xs text-swar-text-secondary mt-1">{item.date}</p>
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
                      <p className="text-xs text-swar-text-secondary mt-1">{item.date}</p>
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
                      <p className="text-xs text-swar-text-secondary mt-1">{item.date}</p>
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
      </div>

      {/* Right Navigation Arrow */}
      <div className="flex items-center">
        <button
          onClick={handleNextYear}
          className="flex items-center justify-center h-16 w-16 rounded-2xl bg-red-500 hover:bg-red-600 transition shadow-lg active:scale-95"
          title="Next year"
        >
          <ChevronRight className="h-10 w-10 text-white" />
        </button>
      </div>
    </div>
  );
}
