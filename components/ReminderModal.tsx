'use client';

import React from 'react';
import { X, Bell } from 'lucide-react';
import { Reminder } from '@/lib/types/lifePlanner';

interface ReminderModalProps {
  reminders: Reminder[];
  onDismiss: (reminderId: string) => void;
}

export default function ReminderModal({ reminders, onDismiss }: ReminderModalProps) {
  if (reminders.length === 0) return null;

  const reminder = reminders[0]; // Show one at a time, or could show all in a queue
  const priority = reminder.priority ?? 'medium';
  const frequency = reminder.frequency ?? 'once';
  const dueDate = reminder.dueDate ?? reminder.startDate;
  const dueDateLabel = dueDate
    ? new Date(dueDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 animate-in fade-in slide-in-from-bottom-4">
        {/* Header with X button */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${
              priority === 'high' ? 'bg-red-100' :
              priority === 'medium' ? 'bg-orange-100' :
              'bg-swar-primary-light'
            }`}>
              <Bell className={`h-6 w-6 ${
                priority === 'high' ? 'text-red-600' :
                priority === 'medium' ? 'text-orange-600' :
                'text-swar-primary'
              }`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-swar-text">Reminder</h3>
              <p className="text-xs text-swar-text-secondary">
                {dueDateLabel}
              </p>
            </div>
          </div>
          <button
            onClick={() => onDismiss(reminder.id)}
            className="p-1 hover:bg-swar-primary-light rounded-full transition-colors"
            aria-label="Close reminder"
          >
            <X className="h-6 w-6 text-swar-text-secondary hover:text-swar-text-secondary" />
          </button>
        </div>

        {/* Reminder Content */}
        <div className="mb-6">
          <h4 className="text-xl font-semibold text-swar-text mb-2">{reminder.title}</h4>
          {reminder.description && (
            <p className="text-swar-text-secondary leading-relaxed">{reminder.description}</p>
          )}
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            priority === 'high' ? 'bg-red-100 text-red-700' :
            priority === 'medium' ? 'bg-orange-100 text-orange-700' :
            'bg-swar-primary-light text-swar-primary'
          }`}>
            {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
          </span>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
          </span>
        </div>

        {/* Close Button */}
        <button
          onClick={() => onDismiss(reminder.id)}
          className="w-full bg-gradient-to-r from-swar-accent to-pink-500 text-white font-semibold py-3 rounded-xl hover:from-red-600 hover:to-pink-600 transition-all"
        >
          Got it ✓
        </button>
      </div>
    </div>
  );
}
