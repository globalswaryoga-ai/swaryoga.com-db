'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Target, Flag, CheckSquare, Bell, BookOpen, Gem, Users, Plus } from 'lucide-react';

interface CalendarItem {
  id: string;
  type: 'vision' | 'goal' | 'task' | 'reminder' | 'word' | 'milestone' | 'diamond';
  title: string;
  startDate: string;
  endDate?: string;
  color: string;
  symbol: string;
}

export default function EnhancedCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Load data from localStorage
  useEffect(() => {
    const allItems: CalendarItem[] = [];
    
    // Load visions
    const visions = JSON.parse(localStorage.getItem('lifePlannerVision') || '[]');
    visions.forEach((v: any) => {
      if (v.date) {
        allItems.push({
          id: v.id || v._id,
          type: 'vision',
          title: v.title || v.name,
          startDate: v.date,
          color: 'bg-purple-100 border-purple-400',
          symbol: '🎯',
        });
      }
    });

    // Load goals (with date ranges)
    const goals = JSON.parse(localStorage.getItem('lifePlannerGoals') || '[]');
    goals.forEach((g: any) => {
      if (g.startDate || g.date) {
        allItems.push({
          id: g.id || g._id,
          type: 'goal',
          title: g.title || g.name,
          startDate: g.startDate || g.date,
          endDate: g.endDate || g.dueDate,
          color: 'bg-blue-100 border-blue-400',
          symbol: '🏆',
        });
      }
    });

    // Load tasks
    const tasks = JSON.parse(localStorage.getItem('lifePlannerTasks') || '[]');
    tasks.forEach((t: any) => {
      if (t.date || t.dueDate) {
        allItems.push({
          id: t.id || t._id,
          type: 'task',
          title: t.title || t.name,
          startDate: t.date || t.dueDate,
          color: 'bg-green-100 border-green-400',
          symbol: '✅',
        });
      }
    });

    // Load reminders
    const reminders = JSON.parse(localStorage.getItem('lifePlannerReminders') || '[]');
    reminders.forEach((r: any) => {
      if (r.date || r.dueDate) {
        allItems.push({
          id: r.id || r._id,
          type: 'reminder',
          title: r.title || r.name,
          startDate: r.date || r.dueDate,
          color: 'bg-orange-100 border-orange-400',
          symbol: '🔔',
        });
      }
    });

    // Load words
    const words = JSON.parse(localStorage.getItem('lifePlannerWords') || '[]');
    words.forEach((w: any) => {
      if (w.date) {
        allItems.push({
          id: w.id || w._id,
          type: 'word',
          title: w.title || w.name,
          startDate: w.date,
          color: 'bg-yellow-100 border-yellow-400',
          symbol: '📝',
        });
      }
    });

    // Load milestones
    const milestones = JSON.parse(localStorage.getItem('lifePlannerMilestones') || '[]');
    milestones.forEach((m: any) => {
      if (m.date) {
        allItems.push({
          id: m.id || m._id,
          type: 'milestone',
          title: m.title || m.name,
          startDate: m.date,
          color: 'bg-pink-100 border-pink-400',
          symbol: '⭐',
        });
      }
    });

    setItems(allItems);
  }, []);

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfMonth = getFirstDayOfMonth(currentDate);
  const previousMonthDays = getDaysInMonth(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));

  const calendarDays = [];
  
  // Previous month's days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarDays.push({ date: `${currentDate.getFullYear()}-${String(currentDate.getMonth()).padStart(2, '0')}-${String(previousMonthDays - i).padStart(2, '0')}`, isCurrentMonth: false });
  }

  // Current month's days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ date: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`, isCurrentMonth: true });
  }

  // Next month's days
  const remainingDays = 42 - calendarDays.length;
  for (let i = 1; i <= remainingDays; i++) {
    calendarDays.push({ date: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}`, isCurrentMonth: false });
  }

  const getItemsForDate = (date: string) => {
    return items.filter(item => {
      const itemStart = new Date(item.startDate);
      const itemEnd = item.endDate ? new Date(item.endDate) : itemStart;
      const checkDate = new Date(date);
      return checkDate >= itemStart && checkDate <= itemEnd;
    });
  };

  const selectedItems = selectedDate ? getItemsForDate(selectedDate) : [];

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-swar-primary-light to-blue-50 rounded-3xl p-6 border border-swar-border">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-swar-primary">Calendar Overview</h1>
            <p className="text-sm text-swar-text-secondary mt-1">View all visions, goals, tasks, reminders, and milestones</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
              className="p-2 rounded-lg hover:bg-white transition"
            >
              <ChevronLeft className="h-6 w-6 text-swar-primary" />
            </button>
            <span className="text-lg font-semibold text-swar-text min-w-[150px] text-center">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
              className="p-2 rounded-lg hover:bg-white transition"
            >
              <ChevronRight className="h-6 w-6 text-swar-primary" />
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-2xl p-4 border border-swar-border">
        <h3 className="text-sm font-bold text-swar-text mb-3">Legend:</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
          <div className="flex items-center gap-2 text-xs"><span className="text-xl">🎯</span> Vision</div>
          <div className="flex items-center gap-2 text-xs"><span className="text-xl">🏆</span> Goal</div>
          <div className="flex items-center gap-2 text-xs"><span className="text-xl">✅</span> Task</div>
          <div className="flex items-center gap-2 text-xs"><span className="text-xl">🔔</span> Reminder</div>
          <div className="flex items-center gap-2 text-xs"><span className="text-xl">📝</span> Word</div>
          <div className="flex items-center gap-2 text-xs"><span className="text-xl">⭐</span> Milestone</div>
          <div className="flex items-center gap-2 text-xs"><span className="text-xl">👥</span> Diamond</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-4 border border-swar-border">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-bold text-swar-text-secondary py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              const dayItems = getItemsForDate(day.date);
              const isSelected = day.date === selectedDate;
              const isToday = day.date === new Date().toISOString().split('T')[0];

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(day.date)}
                  className={`aspect-square rounded-lg p-1 border-2 transition flex flex-col items-center justify-center text-xs overflow-hidden ${
                    isSelected
                      ? 'border-swar-primary bg-swar-primary-light'
                      : isToday
                      ? 'border-swar-accent bg-orange-50'
                      : day.isCurrentMonth
                      ? 'border-gray-200 bg-white hover:border-swar-primary hover:bg-swar-primary-light'
                      : 'border-gray-100 bg-gray-50 text-gray-400'
                  }`}
                >
                  <span className={`font-bold ${day.isCurrentMonth ? 'text-swar-text' : 'text-gray-400'}`}>
                    {parseInt(day.date.split('-')[2])}
                  </span>
                  <div className="flex gap-0.5 flex-wrap justify-center">
                    {dayItems.slice(0, 3).map(item => (
                      <span key={item.id} title={item.title} className="text-lg leading-none">
                        {item.symbol}
                      </span>
                    ))}
                    {dayItems.length > 3 && <span className="text-[10px] font-bold text-swar-primary">+{dayItems.length - 3}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar - Selected Date Details */}
        <div className="bg-white rounded-2xl p-4 border border-swar-border h-fit sticky top-4">
          <h3 className="text-lg font-bold text-swar-primary mb-4">
            {selectedDate
              ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
              : 'Select a date'}
          </h3>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {selectedItems.length > 0 ? (
              selectedItems.map(item => (
                <div key={item.id} className={`rounded-lg p-3 border-l-4 border-swar-primary ${item.color}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-2xl flex-shrink-0">{item.symbol}</span>
                    <div className="flex-grow min-w-0">
                      <p className="text-xs font-semibold text-swar-text-secondary uppercase">{item.type}</p>
                      <p className="text-sm font-semibold text-swar-text truncate">{item.title}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-swar-text-secondary italic text-center py-4">
                No items scheduled for this date
              </p>
            )}
          </div>

          {selectedDate && (
            <button className="w-full mt-4 flex items-center justify-center gap-2 py-2 px-3 bg-swar-primary text-white rounded-lg hover:bg-swar-primary-dark transition text-sm font-semibold">
              <Plus size={16} />
              Add item
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
