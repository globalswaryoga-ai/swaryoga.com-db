'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import { workshopCatalog } from '@/lib/workshopsData';

type ScheduleStatus = 'draft' | 'published';

type AdminSchedule = {
  id: string;
  workshopSlug: string;
  workshopName?: string;
  mode: 'online' | 'offline' | 'residential' | 'recorded';
  batch?: 'morning' | 'evening' | 'full-day' | 'anytime' | string;
  startDate?: string | null;
  endDate?: string | null;
  days?: string;
  time?: string;
  startTime?: string;
  endTime?: string;
  seatsTotal?: number;
  registrationCloseDate?: string | null;
  location?: string;
  price?: number;
  currency?: 'INR' | 'USD' | 'NPR' | string;
  status?: ScheduleStatus;
};

const toInputDate = (value: string | null | undefined) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const fromInputDate = (value: string) => {
  if (!value) return null;
  // Keep as ISO string; server will parse.
  return new Date(value + 'T00:00:00.000Z').toISOString();
};

export default function AdminWorkshopSchedulesPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [adminToken, setAdminToken] = useState('');

  const [selectedWorkshopSlug, setSelectedWorkshopSlug] = useState<string>(workshopCatalog[0]?.slug || '');
  const [filterStatus, setFilterStatus] = useState<'all' | ScheduleStatus>('all');

  const [schedules, setSchedules] = useState<AdminSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<AdminSchedule | null>(null);

  const [form, setForm] = useState<AdminSchedule>({
    id: '',
    workshopSlug: selectedWorkshopSlug,
    mode: 'online',
    batch: 'morning',
    startDate: null,
    endDate: null,
    days: '',
    time: '6:00 AM - 8:00 AM',
    seatsTotal: 60,
    location: '',
    price: 0,
    currency: 'INR',
    status: 'draft',
  });

  const workshopOptions = useMemo(
    () => workshopCatalog.slice().sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  useEffect(() => {
    const token = localStorage.getItem('adminToken') || '';
    if (!token) {
      router.push('/admin/login');
      return;
    }
    setAdminToken(token);
  }, [router]);

  const loadSchedules = async (token: string, slug: string) => {
    try {
      setLoading(true);
      setError('');

      const qs = new URLSearchParams();
      if (slug) qs.set('workshopId', slug);
      const res = await fetch(`/api/admin/workshops/schedules?${qs.toString()}`.replace(/\?$/, ''), {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || 'Failed to load schedules');

      const data = Array.isArray(json?.data) ? (json.data as AdminSchedule[]) : [];
      setSchedules(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!adminToken) return;
    loadSchedules(adminToken, selectedWorkshopSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken, selectedWorkshopSlug]);

  const visibleSchedules = useMemo(() => {
    const list = schedules.slice();
    const filtered = filterStatus === 'all' ? list : list.filter((s) => s.status === filterStatus);

    return filtered.sort((a, b) => {
      const ams = a.startDate ? Date.parse(String(a.startDate)) : NaN;
      const bms = b.startDate ? Date.parse(String(b.startDate)) : NaN;
      if (Number.isNaN(ams) && Number.isNaN(bms)) return 0;
      if (Number.isNaN(ams)) return 1;
      if (Number.isNaN(bms)) return -1;
      return ams - bms;
    });
  }, [schedules, filterStatus]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      id: '',
      workshopSlug: selectedWorkshopSlug,
      workshopName: workshopCatalog.find((w) => w.slug === selectedWorkshopSlug)?.name || '',
      mode: 'online',
      batch: 'morning',
      startDate: null,
      endDate: null,
      days: '',
      time: '6:00 AM - 8:00 AM',
      startTime: '',
      endTime: '',
      seatsTotal: 60,
      registrationCloseDate: null,
      location: '',
      price: 0,
      currency: 'INR',
      status: 'draft',
    });
    setModalOpen(true);
  };

  const openEdit = (schedule: AdminSchedule) => {
    setEditing(schedule);
    setForm({
      ...schedule,
      workshopSlug: schedule.workshopSlug || selectedWorkshopSlug,
      workshopName: schedule.workshopName || workshopCatalog.find((w) => w.slug === schedule.workshopSlug)?.name || '',
      status: (schedule.status || 'draft') as ScheduleStatus,
      batch: (schedule.batch || 'morning') as any,
      currency: (schedule.currency || 'INR') as any,
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!adminToken) return;
    if (!form.workshopSlug?.trim()) {
      setError('Please select a workshop');
      return;
    }
    if (!form.mode) {
      setError('Mode is required');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = {
        id: editing?.id || form.id || undefined,
        workshopSlug: form.workshopSlug,
        workshopName: form.workshopName,
        mode: form.mode,
        batch: form.batch,
        startDate: fromInputDate(toInputDate(form.startDate || null)),
        endDate: fromInputDate(toInputDate(form.endDate || null)),
        days: form.days,
        time: form.time,
        startTime: form.startTime,
        endTime: form.endTime,
        seatsTotal: Number(form.seatsTotal || 0),
        registrationCloseDate: fromInputDate(toInputDate(form.registrationCloseDate || null)),
        location: form.location,
        price: Number(form.price || 0),
        currency: String(form.currency || 'INR').toUpperCase(),
        status: form.status,
      };

      const res = await fetch('/api/admin/workshops/schedules/crud', {
        method: editing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || 'Failed to save schedule');

      setModalOpen(false);
      setEditing(null);
      await loadSchedules(adminToken, selectedWorkshopSlug);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (schedule: AdminSchedule) => {
    if (!adminToken) return;
    try {
      setError('');
      const nextStatus: ScheduleStatus = schedule.status === 'published' ? 'draft' : 'published';

      const res = await fetch('/api/admin/workshops/schedules/crud', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ id: schedule.id, status: nextStatus }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || 'Failed to update status');

      await loadSchedules(adminToken, selectedWorkshopSlug);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const remove = async (schedule: AdminSchedule) => {
    if (!adminToken) return;
    if (!confirm(`Delete schedule ${schedule.id}?`)) return;

    try {
      setError('');
      const url = new URL('/api/admin/workshops/schedules/crud', window.location.origin);
      url.searchParams.set('id', schedule.id);

      const res = await fetch(url.toString(), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || 'Failed to delete');

      await loadSchedules(adminToken, selectedWorkshopSlug);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Workshop Dates</h1>
              <p className="text-sm text-gray-600">Edit dates, fees, and time. Use Publish when ready.</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden rounded-lg bg-gray-100 px-3 py-2 text-sm font-bold"
              >
                Menu
              </button>
              <button
                type="button"
                onClick={openCreate}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-green-700"
              >
                Add Schedule
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg bg-white border border-gray-200 p-4">
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-2">Workshop</label>
              <select
                value={selectedWorkshopSlug}
                onChange={(e) => setSelectedWorkshopSlug(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold"
              >
                {workshopOptions.map((w) => (
                  <option key={w.slug} value={w.slug}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-lg bg-white border border-gray-200 p-4">
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-2">Filter</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold"
              >
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>

            <div className="rounded-lg bg-white border border-gray-200 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-600">Count</p>
                <p className="text-2xl font-extrabold text-gray-900">{visibleSchedules.length}</p>
              </div>
              <button
                type="button"
                onClick={() => adminToken && loadSchedules(adminToken, selectedWorkshopSlug)}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-gray-800"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-gray-700">Start</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-700">End</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-700">Mode</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-700">Batch</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-700">Time</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-700">Fees</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-700">Seats</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-600">
                        Loading schedules…
                      </td>
                    </tr>
                  ) : visibleSchedules.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-600">
                        No schedules found.
                      </td>
                    </tr>
                  ) : (
                    visibleSchedules.map((s) => {
                      const start = s.startDate ? new Date(s.startDate).toLocaleDateString() : '—';
                      const end = s.endDate ? new Date(s.endDate).toLocaleDateString() : '—';
                      const time = s.time || [s.startTime, s.endTime].filter(Boolean).join(' - ') || '—';
                      const fees = `₹${Number(s.price || 0).toLocaleString('en-IN')} ${String(s.currency || 'INR').toUpperCase()}`;
                      const published = s.status === 'published';
                      return (
                        <tr key={s.id} className={published ? 'bg-green-50/40' : 'bg-white'}>
                          <td className="px-4 py-3 whitespace-nowrap">{start}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{end}</td>
                          <td className="px-4 py-3 whitespace-nowrap font-semibold">{s.mode}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{s.batch || '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{time}</td>
                          <td className="px-4 py-3 whitespace-nowrap font-semibold">{fees}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{Number(s.seatsTotal || 0) || '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${
                                published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {published ? 'Published' : 'Draft'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => openEdit(s)}
                                className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-bold text-white hover:bg-gray-800"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => togglePublish(s)}
                                className={`rounded-lg px-3 py-2 text-xs font-bold ${
                                  published
                                    ? 'bg-yellow-100 text-yellow-900 hover:bg-yellow-200'
                                    : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                              >
                                {published ? 'Unpublish' : 'Publish'}
                              </button>
                              <button
                                type="button"
                                onClick={() => remove(s)}
                                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-lg font-extrabold text-gray-900">{editing ? 'Edit Schedule' : 'Add Schedule'}</h2>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setEditing(null);
                }}
                className="rounded-lg px-3 py-2 text-sm font-bold bg-gray-100 hover:bg-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-2">Workshop</label>
                <select
                  value={form.workshopSlug}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      workshopSlug: e.target.value,
                      workshopName: workshopCatalog.find((w) => w.slug === e.target.value)?.name || '',
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold"
                >
                  {workshopOptions.map((w) => (
                    <option key={w.slug} value={w.slug}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-2">Mode</label>
                <select
                  value={form.mode}
                  onChange={(e) => setForm((prev) => ({ ...prev, mode: e.target.value as any }))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold"
                >
                  <option value="online">online</option>
                  <option value="offline">offline</option>
                  <option value="residential">residential</option>
                  <option value="recorded">recorded</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-2">Batch</label>
                <select
                  value={String(form.batch || 'morning')}
                  onChange={(e) => setForm((prev) => ({ ...prev, batch: e.target.value as any }))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold"
                >
                  <option value="morning">morning</option>
                  <option value="evening">evening</option>
                  <option value="full-day">full-day</option>
                  <option value="anytime">anytime</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-2">Status</label>
                <select
                  value={String(form.status || 'draft')}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as any }))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold"
                >
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-2">Start date</label>
                <input
                  type="date"
                  value={toInputDate(form.startDate || null)}
                  onChange={(e) => setForm((prev) => ({ ...prev, startDate: fromInputDate(e.target.value) }))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-2">End date</label>
                <input
                  type="date"
                  value={toInputDate(form.endDate || null)}
                  onChange={(e) => setForm((prev) => ({ ...prev, endDate: fromInputDate(e.target.value) }))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-2">Time (display)</label>
                <input
                  type="text"
                  value={String(form.time || '')}
                  onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold"
                  placeholder="e.g., 6:00 AM - 8:00 AM"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-2">Fees</label>
                <input
                  type="number"
                  value={Number(form.price || 0)}
                  onChange={(e) => setForm((prev) => ({ ...prev, price: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-2">Currency</label>
                <select
                  value={String(form.currency || 'INR').toUpperCase()}
                  onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold"
                >
                  <option value="INR">INR</option>
                  <option value="NPR">NPR</option>
                  <option value="USD">USD</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-2">Seats total</label>
                <input
                  type="number"
                  value={Number(form.seatsTotal || 0)}
                  onChange={(e) => setForm((prev) => ({ ...prev, seatsTotal: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-2">Location</label>
                <input
                  type="text"
                  value={String(form.location || '')}
                  onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold"
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setEditing(null);
                }}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold text-gray-900 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={save}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
