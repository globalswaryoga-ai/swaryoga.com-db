'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  Clock, Send, Search, Users, Loader2, CheckCircle2, X, AlertCircle,
  Plus, Edit2, Trash2, Pause, Play, Eye
} from 'lucide-react';

type Schedule = {
  _id: string;
  name: string;
  messageText: string;
  totalRecipients: number;
  startTime: string;
  endTime: string;
  frequency: string;
  maxMessagesPerDay: number;
  isActive: boolean;
  status: string;
  stats?: { totalSent: number; totalFailed: number };
  lastRunDate?: string;
};

export default function QRBroadcastSchedulePage() {
  const token = useAuth();

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    messageText: '',
    startTime: '05:00',
    endTime: '22:30',
    frequency: 'daily',
    maxMessagesPerDay: 300,
    description: '',
    gapStrategy: {
      preset: 'SAFE', // Default: 60 messages/hour
      initialGapMs: 7000,
      initialGapCount: 2,
      minGapMs: 45000, // 45 seconds
      maxGapMs: 120000, // 120 seconds
      ensureVariation: true,
    },
  });

  const loadSchedules = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/crm/qr-broadcast-schedule', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSchedules(data.data || []);
      }
    } catch (err) {
      console.error('Error loading schedules:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const handleSaveSchedule = async () => {
    if (!token || !formData.name.trim() || !formData.messageText.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const url = editingId
        ? `/api/admin/crm/qr-broadcast-schedule/${editingId}`
        : '/api/admin/crm/qr-broadcast-schedule';

      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientChatIds: [], // Will be set during actual broadcast
          ...formData,
          maxMessagesPerDay: Math.min(300, Math.max(1, formData.maxMessagesPerDay)),
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`Schedule ${editingId ? 'updated' : 'created'} successfully`);
        setShowForm(false);
        setEditingId(null);
        setFormData({
          name: '',
          messageText: '',
          startTime: '05:00',
          endTime: '22:30',
          frequency: 'daily',
          maxMessagesPerDay: 300,
          description: '',
          gapStrategy: {
            preset: 'SAFE',
            initialGapMs: 7000,
            initialGapCount: 2,
            minGapMs: 45000,
            maxGapMs: 120000,
            ensureVariation: true,
          },
        });
        await loadSchedules();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      console.error('Error saving schedule:', err);
      alert('Error saving schedule');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this schedule?')) return;

    try {
      const res = await fetch(`/api/admin/crm/qr-broadcast-schedule/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        await loadSchedules();
      }
    } catch (err) {
      console.error('Error deleting schedule:', err);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const endpoint = isActive ? 'pause' : 'resume';
      const res = await fetch(`/api/admin/crm/qr-broadcast-schedule/${id}/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        await loadSchedules();
      }
    } catch (err) {
      console.error('Error toggling schedule:', err);
    }
  };

  const filteredSchedules = schedules.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.messageText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-8 h-8 text-blue-600" />
              Scheduled Broadcasts
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Messages send: 5 AM - 10:30 PM IST | Max 300/day | Random intervals to prevent bans
            </p>
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({
                name: '',
                messageText: '',
                startTime: '05:00',
                endTime: '22:30',
                frequency: 'daily',
                maxMessagesPerDay: 300,
                description: '',
                gapStrategy: {
                  preset: 'SAFE',
                  initialGapMs: 7000,
                  initialGapCount: 2,
                  minGapMs: 45000,
                  maxGapMs: 120000,
                  ensureVariation: true,
                },
              });
              setShowForm(!showForm);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Schedule
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg border shadow-sm p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {editingId ? 'Edit Schedule' : 'Create New Schedule'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Schedule Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Daily 9 AM Reminder"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Message *
                </label>
                <textarea
                  value={formData.messageText}
                  onChange={e => setFormData({ ...formData, messageText: e.target.value })}
                  placeholder="Your message here..."
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                  maxLength={4096}
                />
                <p className="text-xs text-gray-500 mt-1">{formData.messageText.length}/4096</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Start Time (IST)
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Min: 5:00 AM</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    End Time (IST)
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max: 10:30 PM</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Frequency
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="once">Once</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Max Messages/Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={formData.maxMessagesPerDay}
                    onChange={e => setFormData({
                      ...formData,
                      maxMessagesPerDay: Math.min(300, Math.max(1, parseInt(e.target.value) || 1))
                    })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max: 300/day</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional notes..."
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Gap Strategy Settings (WhatsApp Compliance) */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <h3 className="font-bold text-blue-900 mb-3">🛡️ Message Delivery Speed (WhatsApp-Safe)</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Gap Strategy Preset
                    </label>
                    <select
                      value={formData.gapStrategy.preset}
                      onChange={(e) => {
                        const preset = e.target.value;
                        let settings: any = { preset };

                        if (preset === 'ULTRA_SAFE') {
                          settings = { ...settings, minGapMs: 100000, maxGapMs: 180000, initialGapMs: 10000 };
                        } else if (preset === 'VERY_SAFE') {
                          settings = { ...settings, minGapMs: 70000, maxGapMs: 150000, initialGapMs: 8000 };
                        } else if (preset === 'SAFE') {
                          settings = { ...settings, minGapMs: 45000, maxGapMs: 120000, initialGapMs: 7000 };
                        } else if (preset === 'PROFESSIONAL') {
                          settings = { ...settings, minGapMs: 40000, maxGapMs: 90000, initialGapMs: 7000 };
                        } else if (preset === 'AGGRESSIVE') {
                          settings = { ...settings, minGapMs: 25000, maxGapMs: 60000, initialGapMs: 5000 };
                        }

                        setFormData({
                          ...formData,
                          gapStrategy: { ...formData.gapStrategy, ...settings },
                        });
                      }}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ULTRA_SAFE">🟢 Ultra Safe (30/hour) - Minimum ban risk</option>
                      <option value="VERY_SAFE">🟢 Very Safe (45/hour) - Very safe</option>
                      <option value="SAFE">🟢 Safe (60/hour) - RECOMMENDED ✓</option>
                      <option value="PROFESSIONAL">🟡 Professional (80/hour) - Medium risk</option>
                      <option value="AGGRESSIVE">🔴 Aggressive (120/hour) - High risk</option>
                      <option value="CUSTOM">⚙️ Custom - Configure manually</option>
                    </select>
                    <p className="text-xs text-blue-700 mt-1">
                      Recommended: SAFE (60 messages/hour) - Perfect balance for any account
                    </p>
                  </div>

                  {formData.gapStrategy.preset === 'CUSTOM' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Min Gap (seconds)
                          </label>
                          <input
                            type="number"
                            min="5"
                            max="180"
                            value={formData.gapStrategy.minGapMs / 1000}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                gapStrategy: {
                                  ...formData.gapStrategy,
                                  minGapMs: Math.max(5000, parseInt(e.target.value) * 1000 || 45000),
                                },
                              })
                            }
                            className="w-full px-2 py-1.5 border rounded text-xs focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-0.5">Min: 5s | Safe: 45s+</p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Max Gap (seconds)
                          </label>
                          <input
                            type="number"
                            min="10"
                            max="300"
                            value={formData.gapStrategy.maxGapMs / 1000}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                gapStrategy: {
                                  ...formData.gapStrategy,
                                  maxGapMs: Math.max(10000, parseInt(e.target.value) * 1000 || 120000),
                                },
                              })
                            }
                            className="w-full px-2 py-1.5 border rounded text-xs focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-0.5">Safe: 120s max</p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Initial Fixed Gap (seconds)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={formData.gapStrategy.initialGapMs / 1000}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              gapStrategy: {
                                ...formData.gapStrategy,
                                initialGapMs: parseInt(e.target.value) * 1000 || 7000,
                              },
                            })
                          }
                          className="w-full px-2 py-1.5 border rounded text-xs focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-0.5">Default: 7s (quick start)</p>
                      </div>
                    </>
                  )}

                  <div className="bg-white p-2 rounded text-xs border border-blue-100">
                    <p className="font-semibold text-blue-900 mb-1">📊 Current Settings:</p>
                    <p className="text-gray-700">
                      • First 2 messages: {formData.gapStrategy.initialGapMs / 1000}s apart
                    </p>
                    <p className="text-gray-700">
                      • Remaining: {formData.gapStrategy.minGapMs / 1000}s - {formData.gapStrategy.maxGapMs / 1000}s random
                    </p>
                    <p className="text-gray-700">
                      • Estimated: ~{Math.round(3600 / ((formData.gapStrategy.minGapMs + formData.gapStrategy.maxGapMs) / 2 / 1000))} messages/hour
                    </p>
                    <p className="text-blue-700 font-semibold mt-1">
                      ✅ 100% human-like (no gap ever repeats)
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveSchedule}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                >
                  {editingId ? 'Update' : 'Create'} Schedule
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Schedules List */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-4 border-b flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search schedules..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 text-sm focus:outline-none"
            />
          </div>

          {loading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No schedules found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Message</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Time</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Freq</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Max/Day</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Stats</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchedules.map(schedule => (
                    <tr key={schedule._id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{schedule.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-600 truncate text-xs max-w-xs">{schedule.messageText}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {schedule.startTime} - {schedule.endTime}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium capitalize">{schedule.frequency}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {schedule.maxMessagesPerDay}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded ${
                          schedule.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {schedule.isActive ? 'Active' : 'Paused'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        ✓ {schedule.stats?.totalSent || 0} | ✕ {schedule.stats?.totalFailed || 0}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleToggleActive(schedule._id, schedule.isActive)}
                            className="p-1.5 hover:bg-gray-200 rounded text-gray-600"
                            title={schedule.isActive ? 'Pause' : 'Resume'}
                          >
                            {schedule.isActive ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(schedule._id)}
                            className="p-1.5 hover:bg-red-100 rounded text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Panel */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-2">Anti-Ban Protection Enabled</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Random message intervals (3-15 seconds) between sends</li>
                <li>30-second delays between batches</li>
                <li>Random recipient order (shuffled each run)</li>
                <li>Time window: 5:00 AM - 10:30 PM IST only</li>
                <li>Daily limit: Max 300 messages per schedule</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
