'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { AlertBox, LoadingSpinner } from '@/components/admin/crm';
import EventFormModal, { type WorkshopEvent } from './EventFormModal';

type EventRecord = WorkshopEvent & {
  _id: string;
  month: string;
  totalAmount: number;
  participantCount: number;
};

function monthLabel(month: string) {
  if (!month) return '';
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function fmtDate(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function WorkshopEventsPage() {
  const token = useAuth();
  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [monthFilter, setMonthFilter] = useState('all');
  const [workshopFilter, setWorkshopFilter] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (monthFilter !== 'all') params.set('month', monthFilter);
      if (workshopFilter !== 'all') params.set('workshop', workshopFilter);
      params.set('limit', '1000');
      const res = await fetch(`/api/admin/crm/sales/events?${params}`, { headers: authHeaders });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load events');
      setEvents(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [token, authHeaders, monthFilter, workshopFilter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const months = useMemo(() => {
    const set = new Set(events.map((e) => e.month));
    return Array.from(set).sort().reverse();
  }, [events]);

  const workshopOptions = useMemo(() => {
    const set = new Set(events.map((e) => e.workshopName));
    return Array.from(set).sort();
  }, [events]);

  const totals = useMemo(() => {
    return events.reduce(
      (acc, e) => ({
        totalAmount: acc.totalAmount + (e.totalAmount || 0),
        totalParticipants: acc.totalParticipants + (e.participantCount || 0),
        totalEvents: acc.totalEvents + 1,
      }),
      { totalAmount: 0, totalParticipants: 0, totalEvents: 0 }
    );
  }, [events]);

  const handleAdd = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleEdit = (evt: EventRecord) => {
    setEditingEvent(evt);
    setIsModalOpen(true);
  };

  const handleSave = async (payload: WorkshopEvent) => {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const body = {
        startDate: payload.startDate,
        endDate: payload.endDate || undefined,
        workshopName: payload.workshopName,
        workshopTime: payload.workshopTime,
        workshopFees: payload.workshopFees,
        notes: payload.notes,
        participants: payload.participants,
      };
      const res = editingEvent
        ? await fetch(`/api/admin/crm/sales/events/${editingEvent._id}`, {
            method: 'PUT',
            headers: { ...authHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch('/api/admin/crm/sales/events', {
            method: 'POST',
            headers: { ...authHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Save failed');
      setSuccess(editingEvent ? 'Event updated' : 'Event created');
      setIsModalOpen(false);
      await fetchEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (evt: EventRecord) => {
    if (!token) return;
    if (!confirm(`Delete event "${evt.workshopName}" (${fmtDate(evt.startDate)})? This cannot be undone.`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/crm/sales/events/${evt._id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Delete failed');
      setSuccess('Event deleted');
      setEvents((prev) => prev.filter((e) => e._id !== evt._id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/crm/sales" className="text-gray-500 hover:text-gray-700 text-sm">
                ← Sales
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">📅 Workshop Events</h1>
            </div>
            <button
              type="button"
              onClick={handleAdd}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white px-5 py-2.5 rounded-lg font-bold hover:from-purple-700 hover:to-violet-700 transition-all shadow"
            >
              + Add Event
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}
        {success && <AlertBox type="success" message={success} onClose={() => setSuccess(null)} />}

        {/* Summary */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-2xl font-bold text-purple-600 mb-1">{totals.totalEvents}</div>
            <div className="text-gray-500 text-sm">Events</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-2xl font-bold text-blue-600 mb-1">{totals.totalParticipants}</div>
            <div className="text-gray-500 text-sm">Participants</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-2xl font-bold text-emerald-600 mb-1">₹{totals.totalAmount.toLocaleString('en-IN')}</div>
            <div className="text-gray-500 text-sm">Total Amount</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Month</label>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            >
              <option value="all">All months</option>
              {months.map((m) => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Workshop</label>
            <select
              value={workshopFilter}
              onChange={(e) => setWorkshopFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            >
              <option value="all">All workshops</option>
              {workshopOptions.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>
          {(monthFilter !== 'all' || workshopFilter !== 'all') && (
            <button
              onClick={() => { setMonthFilter('all'); setWorkshopFilter('all'); }}
              className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Events table */}
        {loading ? (
          <LoadingSpinner />
        ) : events.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
            No events found. Click &quot;+ Add Event&quot; to create one.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Start Date</th>
                  <th className="px-4 py-3 text-left">End Date</th>
                  <th className="px-4 py-3 text-left">Workshop</th>
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-right">Fees</th>
                  <th className="px-4 py-3 text-right">Participants</th>
                  <th className="px-4 py-3 text-right">Total Amount</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => (
                  <>
                    <tr key={evt._id} className="border-t border-gray-100 text-gray-900 hover:bg-gray-50">
                      <td className="px-4 py-3">{fmtDate(evt.startDate)}</td>
                      <td className="px-4 py-3">{fmtDate(evt.endDate)}</td>
                      <td className="px-4 py-3 font-semibold">{evt.workshopName}</td>
                      <td className="px-4 py-3">{evt.workshopTime || '—'}</td>
                      <td className="px-4 py-3 text-right">₹{Number(evt.workshopFees || 0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setExpandedId(expandedId === evt._id ? null : evt._id)}
                          className="text-purple-600 font-bold hover:underline"
                        >
                          {evt.participantCount} {expandedId === evt._id ? '▲' : '▼'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right font-bold">₹{Number(evt.totalAmount || 0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => handleEdit(evt)} className="text-blue-600 font-bold hover:underline mr-3">Edit</button>
                        <button onClick={() => handleDelete(evt)} className="text-red-600 font-bold hover:underline">Delete</button>
                      </td>
                    </tr>
                    {expandedId === evt._id && (
                      <tr className="border-t border-gray-100 bg-purple-50">
                        <td colSpan={8} className="px-4 py-3">
                          {evt.notes && <p className="text-sm text-gray-600 mb-2">📝 {evt.notes}</p>}
                          {evt.participants.length > 0 ? (
                            <table className="w-full text-sm bg-white rounded-lg border border-purple-100 overflow-hidden">
                              <thead className="bg-purple-100 text-purple-900">
                                <tr>
                                  <th className="px-3 py-2 text-left">ID</th>
                                  <th className="px-3 py-2 text-left">Name</th>
                                  <th className="px-3 py-2 text-left">Phone</th>
                                  <th className="px-3 py-2 text-left">Workshop</th>
                                  <th className="px-3 py-2 text-right">Amount</th>
                                  <th className="px-3 py-2 text-left">Payment</th>
                                </tr>
                              </thead>
                              <tbody>
                                {evt.participants.map((p, idx) => (
                                  <tr key={idx} className="border-t border-purple-50 text-gray-900">
                                    <td className="px-3 py-2 font-mono">{p.customerId || '—'}</td>
                                    <td className="px-3 py-2">{p.customerName}</td>
                                    <td className="px-3 py-2">{p.customerPhone || '—'}</td>
                                    <td className="px-3 py-2">{p.workshopName}</td>
                                    <td className="px-3 py-2 text-right">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                                    <td className="px-3 py-2">{p.paymentMode}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-sm text-gray-500">No participants.</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EventFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        editingEvent={editingEvent}
        workshopOptions={workshopOptions}
        saving={saving}
      />
    </div>
  );
}
