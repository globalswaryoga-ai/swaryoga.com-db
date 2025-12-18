'use client';

import React, { useState, useEffect } from 'react';
import { Bell, X, ChevronDown } from 'lucide-react';
import { Reminder } from '@/lib/types/lifePlanner';

interface HeaderRemindersProps {
  reminders?: Reminder[];
  onReminderComplete?: (reminderId: string, completed: boolean) => void;
}

export default function HeaderReminders({ reminders = [], onReminderComplete }: HeaderRemindersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localReminders, setLocalReminders] = useState<Reminder[]>(reminders);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    setLocalReminders(reminders);
    setCompletedCount(reminders.filter(r => r.completed).length);
  }, [reminders]);

  const handleToggleReminder = (reminderId: string, completed: boolean) => {
    setLocalReminders(prev =>
      prev.map(r =>
        r.id === reminderId ? { ...r, completed } : r
      )
    );

    const updatedCount = localReminders.filter(r =>
      r.id === reminderId ? completed : r.completed
    ).length;
    setCompletedCount(updatedCount);

    if (onReminderComplete) {
      onReminderComplete(reminderId, completed);
    }
  };

  const pendingReminders = localReminders.filter(r => !r.completed);

  if (localReminders.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Reminder Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-all group"
        title="View reminders"
      >
        <Bell className="h-6 w-6 group-hover:scale-110 transition-transform" />

        {/* Badge showing pending count */}
        {pendingReminders.length > 0 && (
          <span className="absolute top-0 right-0 bg-swar-accent text-white text-xs font-bold h-5 w-5 rounded-full flex items-center justify-center animate-pulse">
            {pendingReminders.length}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-orange-100 z-50 max-h-96 overflow-y-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-400 to-swar-accent text-white p-4 sticky top-0 flex items-center justify-between rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <h3 className="font-bold">Reminders</h3>
              {completedCount > 0 && (
                <span className="bg-white text-orange-600 px-2 py-1 rounded-full text-xs font-bold">
                  {completedCount}/{localReminders.length} Done
                </span>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-orange-600 rounded transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Reminders List */}
          <div className="p-4 space-y-3">
            {localReminders.length === 0 ? (
              <div className="text-center py-8 text-swar-text-secondary">
                <p>No reminders yet</p>
              </div>
            ) : (
              <>
                {/* Pending Reminders */}
                {pendingReminders.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-swar-text mb-2 uppercase">To Do</h4>
                    <div className="space-y-2">
                      {pendingReminders.map((reminder) => (
                        <div
                          key={reminder.id}
                          className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition group"
                        >
                          <input
                            type="checkbox"
                            checked={reminder.completed || false}
                            onChange={(e) =>
                              handleToggleReminder(reminder.id, e.target.checked)
                            }
                            className="h-5 w-5 rounded border-2 border-orange-400 text-orange-600 cursor-pointer mt-0.5 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-swar-text text-sm">
                              {reminder.title}
                            </p>
                            {reminder.description && (
                              <p className="text-xs text-swar-text-secondary mt-1">
                                {reminder.description}
                              </p>
                            )}
                            <div className="flex gap-2 mt-2 flex-wrap text-xs text-swar-text-secondary">
                              {reminder.dueDate && (
                                <span className="bg-white px-2 py-1 rounded border border-orange-200">
                                  📅 {new Date(reminder.dueDate).toLocaleDateString()}
                                </span>
                              )}
                              {reminder.dueTime && (
                                <span className="bg-white px-2 py-1 rounded border border-orange-200">
                                  🕐 {reminder.dueTime}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed Reminders */}
                {completedCount > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-swar-primary mb-2 uppercase">Completed</h4>
                    <div className="space-y-2">
                      {localReminders
                        .filter(r => r.completed)
                        .map((reminder) => (
                          <div
                            key={reminder.id}
                            className="flex items-start gap-3 p-3 bg-swar-primary-light border border-green-200 rounded-lg opacity-70"
                          >
                            <input
                              type="checkbox"
                              checked={true}
                              onChange={(e) =>
                                handleToggleReminder(reminder.id, e.target.checked)
                              }
                              className="h-5 w-5 rounded border-2 border-green-400 text-swar-primary cursor-pointer mt-0.5 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-swar-text text-sm line-through">
                                {reminder.title}
                              </p>
                              {reminder.description && (
                                <p className="text-xs text-swar-text-secondary mt-1 line-through">
                                  {reminder.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {localReminders.length > 0 && (
            <div className="border-t border-orange-100 p-3 bg-swar-bg flex justify-center">
              <a
                href="/life-planner/dashboard/reminders"
                className="text-sm font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1"
              >
                View All Reminders
                <ChevronDown className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
