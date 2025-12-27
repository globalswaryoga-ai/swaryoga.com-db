'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import { workshopCatalog } from '@/lib/workshopsData';

type ModeKey = 'online' | 'offline' | 'residential' | 'recorded';

type LanguageKey = 'Hindi' | 'English' | 'Marathi';

type ScheduleStatus = 'draft' | 'published';

type AdminSchedule = {
  id: string;
  workshopSlug: string;
  workshopName?: string;
  mode: ModeKey;
  language?: string;
  batch?: string;
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
  currency?: string;
  status?: ScheduleStatus;
};

type EditForm = {
  startDate: string;
  endDate: string;
  registrationCloseDate: string;
  batch: string;
  time: string;
  startTime: string;
  endTime: string;
  seatsTotal: string;
  price: string;
  currency: string;
  location: string;
  language: string;
};

type CreateForm = EditForm & {
  allCurrencies: boolean;
};
const MODE_LABELS: Array<{ key: ModeKey; label: string }> = [
  { key: 'online', label: 'Online' },
  { key: 'offline', label: 'Offline' },
  { key: 'residential', label: 'Residential' },
  { key: 'recorded', label: 'Recorded' },
];

const CATEGORY_ORDER = ['Health', 'Wealth', 'Married', 'Youth', 'Trainings'] as const;

const getCategoryHeading = (category: string) => (category === 'Youth' ? 'Youth/Children' : category);

const formatDate = (iso: string) => {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
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
  return new Date(value + 'T00:00:00.000Z').toISOString();
};

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const addMonths = (d: Date, months: number) => {
  const copy = new Date(d.getTime());
  copy.setMonth(copy.getMonth() + months);
  return copy;
};

const formatScheduleTime = (s: { time?: string; startTime?: string; endTime?: string }) => {
  const direct = String(s.time || '').trim();
  if (direct) return direct;
  const parts = [String(s.startTime || '').trim(), String(s.endTime || '').trim()].filter(Boolean);
  return parts.join(' - ');
};

const emptyEditForm = (s?: AdminSchedule): EditForm => ({
  startDate: toInputDate(s?.startDate || null),
  endDate: toInputDate(s?.endDate || null),
  registrationCloseDate: toInputDate(s?.registrationCloseDate || null),
  batch: String(s?.batch || ''),
  time: String(s?.time || ''),
  startTime: String(s?.startTime || ''),
  endTime: String(s?.endTime || ''),
  seatsTotal: String(s?.seatsTotal ?? ''),
  price: String(s?.price ?? ''),
  currency: String(s?.currency || 'INR').toUpperCase(),
  location: String(s?.location || ''),
  language: String(s?.language || 'Hindi'),
});

const emptyCreateForm = (s?: AdminSchedule): CreateForm => ({
  ...emptyEditForm(s),
  allCurrencies: false,
});

export default function AdminWorkshopSchedulesPage() {
    const router = useRouter();

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [adminToken, setAdminToken] = useState('');

    const [selectedMode, setSelectedMode] = useState<ModeKey>('online');
    const [selectedLanguage, setSelectedLanguage] = useState<LanguageKey>('Hindi');
    const [selectedCategory, setSelectedCategory] = useState<string>('Health');
    const [selectedWorkshopSlug, setSelectedWorkshopSlug] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');

    const [allSchedules, setAllSchedules] = useState<AdminSchedule[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<EditForm>(emptyEditForm());
    const [savingId, setSavingId] = useState<string | null>(null);

    const [creating, setCreating] = useState(false);
    const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm());

    useEffect(() => {
      const token = localStorage.getItem('adminToken') || '';
      if (!token) {
        router.push('/admin/login');
        return;
      }
      setAdminToken(token);
    }, [router]);

    const loadAllSchedules = async (token: string) => {
      try {
        setLoading(true);
        setError('');

        const res = await fetch('/api/admin/workshops/schedules', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || 'Failed to load schedules');
        const data = Array.isArray(json?.data) ? (json.data as AdminSchedule[]) : [];
        setAllSchedules(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setAllSchedules([]);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      if (!adminToken) return;
      loadAllSchedules(adminToken);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [adminToken]);

    const grouped = useMemo(() => {
      const map: Record<string, typeof workshopCatalog> = {};
      for (const c of CATEGORY_ORDER) map[c] = [];
      for (const w of workshopCatalog) {
        const c = w.category || 'Health';
        if (!map[c]) map[c] = [];
        map[c].push(w);
      }
      return map;
    }, []);

    const rows = useMemo(() => {
      const list = grouped[selectedCategory] || [];
      return list
        .filter((w) => {
          const langs = (w as any)?.language;
          if (!Array.isArray(langs) || langs.length === 0) return true;
          return langs.includes(selectedLanguage);
        })
        .slice();
    }, [grouped, selectedCategory, selectedLanguage]);

    const selectedWorkshop = useMemo(() => {
      if (!selectedWorkshopSlug) return null;
      return workshopCatalog.find((w) => w.slug === selectedWorkshopSlug) || null;
    }, [selectedWorkshopSlug]);

    const schedulesForWorkshopAndMode = useMemo(() => {
      if (!selectedWorkshopSlug) return [] as AdminSchedule[];
      return allSchedules
        .filter((s) => s.workshopSlug === selectedWorkshopSlug)
        .filter((s) => s.mode === selectedMode)
        .filter((s) => s.language === selectedLanguage)
        .slice()
        .sort((a, b) => {
          const ams = a.startDate ? Date.parse(String(a.startDate)) : NaN;
          const bms = b.startDate ? Date.parse(String(b.startDate)) : NaN;
          if (Number.isNaN(ams) && Number.isNaN(bms)) return 0;
          if (Number.isNaN(ams)) return 1;
          if (Number.isNaN(bms)) return -1;
          return ams - bms;
        });
    }, [allSchedules, selectedWorkshopSlug, selectedMode, selectedLanguage]);

    const publishedSchedules = useMemo(() => {
      return schedulesForWorkshopAndMode.filter((s) => (s.status || 'draft') === 'published');
    }, [schedulesForWorkshopAndMode]);

    const draftSchedules = useMemo(() => {
      return schedulesForWorkshopAndMode.filter((s) => (s.status || 'draft') !== 'published');
    }, [schedulesForWorkshopAndMode]);

    const filteredSchedules = useMemo(() => {
      let filtered = schedulesForWorkshopAndMode;

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter((s) => {
          const workshopName = (s.workshopName || '').toLowerCase();
          const time = (s.time || '').toLowerCase();
          const location = (s.location || '').toLowerCase();
          return (
            workshopName.includes(query) ||
            time.includes(query) ||
            location.includes(query)
          );
        });
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter((s) => (s.status || 'draft') === statusFilter);
      }

      return filtered;
    }, [schedulesForWorkshopAndMode, searchQuery, statusFilter]);

    const sixMonthBlocks = useMemo(() => {
      if (!selectedWorkshopSlug) return [] as Array<{ label: string; dateText: string; available: boolean }>;

      const dated = publishedSchedules
        .map((s) => ({ s, ms: s.startDate ? Date.parse(String(s.startDate)) : NaN }))
        .filter((p) => !Number.isNaN(p.ms))
        .sort((a, b) => a.ms - b.ms);

      // Recorded can be truly "Anytime" (no date). But if admin created a dated recorded schedule,
      // show it in the correct month instead of repeating "Anytime".
      if (selectedMode === 'recorded' && dated.length === 0) {
        const today = new Date();
        const hasAnyRecorded = publishedSchedules.length > 0;
        return Array.from({ length: 6 }, (_, i) => {
          const d = addMonths(today, i);
          return {
            label: d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
            dateText: hasAnyRecorded ? 'Anytime' : 'Coming soon',
            available: hasAnyRecorded,
          };
        });
      }

      const today = new Date();
      const monthStarts = Array.from({ length: 6 }, (_, i) => {
        const d = addMonths(today, i);
        return new Date(d.getFullYear(), d.getMonth(), 1);
      });

      return monthStarts.map((m) => {
        const key = monthKey(m);
        const inMonth = dated.filter((p) => monthKey(new Date(p.ms)) === key);

        const picked = inMonth[0]?.s;
        const count = inMonth.length;
        const pickedTime = picked ? formatScheduleTime(picked) : '';
        const timeSuffix = pickedTime ? ` • ${pickedTime}` : '';
        return {
          label: m.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
          dateText: picked
            ? `${formatDate(String(picked.startDate))}${timeSuffix}${count > 1 ? ` (${count} batches)` : ''}`
            : 'Coming soon',
          available: Boolean(picked),
        };
      });
    }, [selectedWorkshopSlug, selectedMode, publishedSchedules]);

    const pickEarliestScheduleForCard = (slug: string) => {
      const list = allSchedules
        .filter((s) => s.workshopSlug === slug)
        .filter((s) => s.mode === selectedMode)
        .filter((s) => (s.status || 'draft') === 'published')
        .slice()
        .sort((a, b) => {
          const ams = a.startDate ? Date.parse(String(a.startDate)) : NaN;
          const bms = b.startDate ? Date.parse(String(b.startDate)) : NaN;
          if (Number.isNaN(ams) && Number.isNaN(bms)) return 0;
          if (Number.isNaN(ams)) return 1;
          if (Number.isNaN(bms)) return -1;
          return ams - bms;
        });
      return list[0] || null;
    };

    const onStartEdit = (s: AdminSchedule) => {
      setEditingId(s.id);
      setEditForm(emptyEditForm(s));
    };

    const cancelEdit = () => {
      setEditingId(null);
      setEditForm(emptyEditForm());
    };

    const startCreate = () => {
      if (!selectedWorkshopSlug) {
        setError('Please select a workshop first');
        return;
      }
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');

      setCreating(true);
      setCreateForm({
        startDate: `${y}-${m}-${d}`,
        endDate: '',
        registrationCloseDate: '',
        batch: 'morning',
        time: '6:00 AM - 8:00 AM',
        startTime: '',
        endTime: '',
        seatsTotal: '60',
        price: '0',
        currency: 'INR',
        location: '',
        language: selectedLanguage,
        allCurrencies: false,
      });
    };

    const cancelCreate = () => {
      setCreating(false);
      setCreateForm(emptyCreateForm());
    };

    const createSchedule = async () => {
      if (!adminToken) {
        setError('No admin token found. Please log in again.');
        return;
      }
      if (!selectedWorkshopSlug) {
        setError('Please select a workshop');
        return;
      }
      try {
        setSavingId('__create__');
        setError('');

        const workshopName = workshopCatalog.find((w) => w.slug === selectedWorkshopSlug)?.name || '';

        const basePayload = {
          workshopSlug: selectedWorkshopSlug,
          workshopName,
          mode: selectedMode,
          language: createForm.language,
          batch: createForm.batch?.trim() || 'morning',
          startDate: fromInputDate(createForm.startDate),
          endDate: fromInputDate(createForm.endDate),
          registrationCloseDate: fromInputDate(createForm.registrationCloseDate),
          time: createForm.time,
          startTime: createForm.startTime,
          endTime: createForm.endTime,
          seatsTotal: createForm.seatsTotal === '' ? undefined : Number(createForm.seatsTotal),
          price: createForm.price === '' ? undefined : Number(createForm.price),
          location: createForm.location,
          status: 'published' as const,
        };

        const currencies = createForm.allCurrencies
          ? (['INR', 'USD', 'NPR'] as const)
          : ([String(createForm.currency || 'INR').toUpperCase()] as const);

        for (const currency of currencies) {
          const payload = { ...basePayload, currency };

          console.log(`[createSchedule] Creating ${currency} schedule:`, payload);

          const res = await fetch('/api/admin/workshops/schedules/crud', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify(payload),
          });

          console.log(`[createSchedule] ${currency} Response status:`, res.status);

          let json: any;
          try {
            json = await res.json();
          } catch {
            const text = await res.text();
            console.error(`[createSchedule] ${currency} Failed to parse JSON, raw text:`, text);
            json = { error: `Server error: ${text.substring(0, 200)}` };
          }
          
          console.log(`[createSchedule] ${currency} Response JSON:`, json);
          
          if (!res.ok) {
            throw new Error(json?.error ? `${currency}: ${json.error}` : `${currency}: Failed to create`);
          }
        }

        await loadAllSchedules(adminToken);
        cancelCreate();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        // If some currencies were created before a later failure, refresh so UI stays consistent.
        if (adminToken) await loadAllSchedules(adminToken);
      } finally {
        setSavingId(null);
      }
    };

    const saveSchedule = async (scheduleId: string) => {
      if (!adminToken) {
        setError('No admin token found. Please log in again.');
        return;
      }
      try {
        setSavingId(scheduleId);
        setError('');

        const payload = {
          id: scheduleId,
          batch: editForm.batch?.trim() || undefined,
          startDate: fromInputDate(editForm.startDate),
          endDate: fromInputDate(editForm.endDate),
          registrationCloseDate: fromInputDate(editForm.registrationCloseDate),
          time: editForm.time,
          startTime: editForm.startTime,
          endTime: editForm.endTime,
          seatsTotal: editForm.seatsTotal === '' ? undefined : Number(editForm.seatsTotal),
          price: editForm.price === '' ? undefined : Number(editForm.price),
          currency: String(editForm.currency || 'INR').toUpperCase(),
          location: editForm.location,
          language: editForm.language,
        };

        console.log('[saveSchedule] Payload:', payload);
        console.log('[saveSchedule] Token:', adminToken.substring(0, 20) + '...');

        const res = await fetch('/api/admin/workshops/schedules/crud', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify(payload),
        });

        console.log('[saveSchedule] Response status:', res.status);

        let json: any;
        try {
          json = await res.json();
        } catch {
          const text = await res.text();
          console.error('[saveSchedule] Failed to parse JSON, raw text:', text);
          json = { error: `Server error: ${text.substring(0, 200)}` };
        }
        
        console.log('[saveSchedule] Response JSON:', json);
        
        if (!res.ok) throw new Error(json?.error || `Failed to save (status ${res.status})`);

        await loadAllSchedules(adminToken);
        cancelEdit();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setSavingId(null);
      }
    };

    const setPublishStatus = async (scheduleId: string, nextStatus: ScheduleStatus) => {
      if (!adminToken) return;
      try {
        setSavingId(scheduleId);
        setError('');

        const res = await fetch('/api/admin/workshops/schedules/crud', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ id: scheduleId, status: nextStatus }),
        });

        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || 'Failed to update publish status');

        await loadAllSchedules(adminToken);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setSavingId(null);
      }
    };

    const deleteSchedule = async (scheduleId: string) => {
      if (!adminToken) return;
      if (!confirm('Are you sure you want to delete this schedule? This action cannot be undone.')) {
        return;
      }
      try {
        setSavingId(scheduleId);
        setError('');

        const res = await fetch(`/api/admin/workshops/schedules/crud?id=${encodeURIComponent(scheduleId)}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
        });

        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || 'Failed to delete schedule');

        await loadAllSchedules(adminToken);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setSavingId(null);
      }
    };

    return (
      <div className="flex h-screen bg-swar-primary-light">
        <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white shadow">
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-swar-text">Workshop Dates</h1>
                <p className="text-sm text-swar-text-secondary">Manage workshop schedules. Publish/Edit/Delete dates.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="md:hidden rounded-lg bg-swar-primary-light px-3 py-2 text-sm font-bold"
                >
                  Menu
                </button>
                <button
                  type="button"
                  onClick={() => adminToken && loadAllSchedules(adminToken)}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-gray-800"
                >
                  Refresh
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-swar-primary">
                {error}
              </div>
            )}

            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
                <aside className="rounded-xl border border-orange-100 bg-orange-50 p-4 sm:p-5 shadow-sm h-fit">
                  <h2 className="text-lg font-extrabold text-swar-text mb-4">Workshop Dates</h2>

                  <div className="mb-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-swar-text-secondary mb-2">Language</p>
                    <div className="grid grid-cols-2 gap-2 sm:block sm:space-y-2">
                      {(['Hindi', 'English', 'Marathi'] as LanguageKey[]).map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => {
                            setSelectedLanguage(lang);
                          }}
                          className={`w-full rounded-lg px-3 py-2 text-left font-semibold transition-colors ${
                            selectedLanguage === lang
                              ? 'bg-swar-primary text-white'
                              : 'bg-white text-black hover:bg-orange-100'
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-swar-text-secondary">Filtering workshop list by selected language.</p>
                  </div>

                  <div className="mb-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-swar-text-secondary mb-2">Our Workshops</p>
                    <div className="grid grid-cols-2 gap-2 sm:block sm:space-y-1">
                      {CATEGORY_ORDER.map((cat) => {
                        const heading = getCategoryHeading(cat);
                        const active = selectedCategory === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            className={`w-full rounded-lg px-3 py-2 text-left font-semibold transition-colors ${
                              active
                                ? 'bg-white text-orange-700 border border-orange-200'
                                : 'text-swar-text hover:bg-orange-100'
                            }`}
                          >
                            {heading}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </aside>

                <section className="rounded-xl border border-swar-border bg-white shadow-sm overflow-hidden">
                  <div className="border-b border-swar-border bg-white px-4 sm:px-6 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <h1 className="text-xl sm:text-2xl font-extrabold text-swar-text">Select Mode</h1>
                      <div className="flex flex-wrap gap-2">
                        {MODE_LABELS.map((m) => {
                          const active = selectedMode === m.key;
                          return (
                            <button
                              key={m.key}
                              type="button"
                              onClick={() => setSelectedMode(m.key)}
                              className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                                active
                                  ? 'bg-swar-primary text-white shadow-sm'
                                  : 'bg-swar-primary-light text-swar-text hover:bg-swar-primary-light'
                              }`}
                            >
                              {m.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div>
                        <h2 className="text-lg sm:text-xl font-extrabold text-swar-text">{getCategoryHeading(selectedCategory)}</h2>
                        <p className="text-sm text-swar-text-secondary">Pick a workshop to edit/publish dates.</p>
                      </div>
                      <div className="text-sm text-swar-text-secondary">Total schedules: {allSchedules.length}</div>
                    </div>

                    {/* Mobile/tablet workshops list */}
                    <div className="md:hidden space-y-3">
                      {rows.map((w) => {
                        const schedule = pickEarliestScheduleForCard(w.slug);
                        const active = selectedWorkshopSlug === w.slug;

                        const feeText = schedule
                          ? `₹${Number(schedule.price || 0).toLocaleString('en-IN')} ${String(schedule.currency || 'INR').toUpperCase()}`
                          : 'TBD';

                        return (
                          <div
                            key={w.slug}
                            className={`rounded-xl border p-4 shadow-sm ${
                              active ? 'border-primary-200 bg-primary-50' : 'border-swar-border bg-white'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-base font-extrabold text-swar-text leading-tight">{w.name}</div>
                                <div className="mt-1 text-sm text-swar-text">Duration: {w.duration}</div>
                                <div className="mt-1 text-sm font-semibold text-swar-text">Fees: {feeText}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedWorkshopSlug(w.slug)}
                                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-extrabold transition-colors ${
                                  active ? 'bg-swar-primary text-white' : 'bg-swar-primary-light text-swar-text hover:bg-swar-primary-light'
                                }`}
                              >
                                {active ? 'Selected' : 'Select'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop workshops list */}
                    <div className="hidden md:block overflow-x-auto rounded-xl border border-swar-border">
                      <table className="min-w-full text-sm">
                        <thead className="bg-swar-bg">
                          <tr>
                            <th className="px-4 py-3 text-left font-bold text-swar-text">Workshop</th>
                            <th className="px-4 py-3 text-left font-bold text-swar-text">Duration</th>
                            <th className="px-4 py-3 text-left font-bold text-swar-text">Fees (Published)</th>
                            <th className="px-4 py-3 text-left font-bold text-swar-text">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {rows.map((w) => {
                            const schedule = pickEarliestScheduleForCard(w.slug);
                            const active = selectedWorkshopSlug === w.slug;
                            const feeText = schedule
                              ? `₹${Number(schedule.price || 0).toLocaleString('en-IN')} ${String(schedule.currency || 'INR').toUpperCase()}`
                              : 'TBD';
                            return (
                              <tr key={w.slug} className={active ? 'bg-primary-50' : 'bg-white'}>
                                <td className="px-4 py-3 font-semibold text-swar-text whitespace-nowrap">{w.name}</td>
                                <td className="px-4 py-3 text-swar-text whitespace-nowrap">{w.duration}</td>
                                <td className="px-4 py-3 text-swar-text whitespace-nowrap">{feeText}</td>
                                <td className="px-4 py-3">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedWorkshopSlug(w.slug)}
                                    className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                                      active
                                        ? 'bg-swar-primary text-white'
                                        : 'bg-swar-primary-light text-swar-text hover:bg-swar-primary-light'
                                    }`}
                                  >
                                    {active ? 'Selected' : 'Select'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-6 rounded-xl border border-swar-border bg-swar-bg p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <h3 className="text-base sm:text-lg font-extrabold text-swar-text">
                            {selectedWorkshop ? selectedWorkshop.name : 'Select a workshop to see dates'}
                          </h3>
                          <p className="text-sm text-swar-text-secondary">Next 6 months dates (Published only)</p>
                        </div>
                        <div className="text-sm text-swar-text-secondary">{loading ? 'Loading…' : ''}</div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {sixMonthBlocks.map((b) => (
                          <div
                            key={b.label}
                            className={`rounded-lg px-3 py-3 border text-sm font-semibold ${
                              b.available
                                ? 'bg-swar-primary-light border-green-200 text-swar-text'
                                : 'bg-white border-swar-border text-swar-text-secondary'
                            }`}
                          >
                            <div className="text-xs font-bold uppercase tracking-wide opacity-80">{b.label}</div>
                            <div className="mt-1">{b.dateText}</div>
                          </div>
                        ))}
                        {selectedWorkshopSlug && sixMonthBlocks.length === 0 && (
                          <div className="col-span-full text-sm text-swar-text-secondary">No dates yet.</div>
                        )}
                      </div>
                    </div>

                    {/* Schedules editor */}
                    {selectedWorkshopSlug && (
                      <div className="mt-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                          <div>
                            <h3 className="text-lg font-extrabold text-swar-text">Schedules</h3>
                            <p className="text-sm text-swar-text-secondary">Publish to show on main site. Edit → Save updates MongoDB.</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-sm text-swar-text-secondary">
                              Published: {publishedSchedules.length} • Draft: {draftSchedules.length}
                            </div>
                            <button
                              type="button"
                              disabled={savingId === '__create__' || Boolean(editingId)}
                              onClick={creating ? cancelCreate : startCreate}
                              className={`rounded-lg px-4 py-2 text-sm font-extrabold disabled:opacity-60 ${
                                creating
                                  ? 'bg-swar-primary-light text-swar-text hover:bg-swar-primary-light'
                                  : 'bg-swar-primary text-white hover:bg-swar-primary'
                              }`}
                            >
                              {creating ? 'Cancel Add' : 'Add Date'}
                            </button>
                          </div>
                        </div>

                        {/* Search and Filter Section */}
                        <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
                          <input
                            type="text"
                            placeholder="Search by workshop, time, or location..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 rounded-lg border border-swar-border bg-white px-4 py-2 text-sm font-semibold text-swar-text placeholder-swar-text-secondary"
                          />
                          <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'draft' | 'published')}
                            className="rounded-lg border border-swar-border bg-white px-4 py-2 text-sm font-semibold text-swar-text min-w-fit"
                          >
                            <option value="all">All Statuses</option>
                            <option value="draft">Draft Only</option>
                            <option value="published">Published Only</option>
                          </select>
                        </div>

                        <div className="rounded-xl border border-swar-border bg-white overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead className="bg-swar-bg">
                                <tr>
                                  <th className="px-4 py-3 text-left font-bold text-swar-text">Start</th>
                                  <th className="px-4 py-3 text-left font-bold text-swar-text">End</th>
                                  <th className="px-4 py-3 text-left font-bold text-swar-text">Batch</th>
                                  <th className="px-4 py-3 text-left font-bold text-swar-text">Language</th>
                                  <th className="px-4 py-3 text-left font-bold text-swar-text">Time</th>
                                  <th className="px-4 py-3 text-left font-bold text-swar-text">Fees</th>
                                  <th className="px-4 py-3 text-left font-bold text-swar-text">Seats</th>
                                  <th className="px-4 py-3 text-left font-bold text-swar-text">Status</th>
                                  <th className="px-4 py-3 text-left font-bold text-swar-text">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {creating && (
                                  <tr className="bg-orange-50/60">
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <input
                                        type="date"
                                        value={createForm.startDate}
                                        onChange={(e) => setCreateForm((p) => ({ ...p, startDate: e.target.value }))}
                                        className="rounded-lg border border-swar-border bg-white px-2 py-1 text-sm font-semibold"
                                      />
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <input
                                        type="date"
                                        value={createForm.endDate}
                                        onChange={(e) => setCreateForm((p) => ({ ...p, endDate: e.target.value }))}
                                        className="rounded-lg border border-swar-border bg-white px-2 py-1 text-sm font-semibold"
                                      />
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <input
                                        type="text"
                                        value={createForm.batch}
                                        onChange={(e) => setCreateForm((p) => ({ ...p, batch: e.target.value }))}
                                        className="w-28 rounded-lg border border-swar-border bg-white px-2 py-1 text-sm font-semibold"
                                        placeholder="morning"
                                      />
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <select
                                        value={createForm.language}
                                        onChange={(e) => setCreateForm((p) => ({ ...p, language: e.target.value }))}
                                        className="w-28 rounded-lg border border-swar-border bg-white px-2 py-1 text-sm font-semibold"
                                      >
                                        <option value="Hindi">Hindi</option>
                                        <option value="English">English</option>
                                        <option value="Marathi">Marathi</option>
                                      </select>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <input
                                        type="text"
                                        value={createForm.time}
                                        onChange={(e) => setCreateForm((p) => ({ ...p, time: e.target.value }))}
                                        className="w-44 rounded-lg border border-swar-border bg-white px-2 py-1 text-sm font-semibold"
                                        placeholder="6:00 AM - 8:00 AM"
                                      />
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap font-semibold">
                                      <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="number"
                                            value={createForm.price}
                                            onChange={(e) => setCreateForm((p) => ({ ...p, price: e.target.value }))}
                                            className="w-24 rounded-lg border border-swar-border bg-white px-2 py-1 text-sm font-semibold"
                                          />
                                          <select
                                            value={createForm.currency}
                                            onChange={(e) => setCreateForm((p) => ({ ...p, currency: e.target.value }))}
                                            disabled={createForm.allCurrencies}
                                            className="rounded-lg border border-swar-border bg-white px-2 py-1 text-sm font-semibold disabled:opacity-60"
                                          >
                                            <option value="INR">INR</option>
                                            <option value="USD">USD</option>
                                            <option value="NPR">NPR</option>
                                          </select>
                                        </div>

                                        <label className="flex items-center gap-2 text-xs font-semibold text-swar-text">
                                          <input
                                            type="checkbox"
                                            checked={createForm.allCurrencies}
                                            onChange={(e) =>
                                              setCreateForm((p) => ({
                                                ...p,
                                                allCurrencies: e.target.checked,
                                              }))
                                            }
                                            className="h-4 w-4 rounded border-swar-border"
                                          />
                                          All currencies (INR, USD, NPR)
                                        </label>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <input
                                        type="number"
                                        value={createForm.seatsTotal}
                                        onChange={(e) => setCreateForm((p) => ({ ...p, seatsTotal: e.target.value }))}
                                        className="w-20 rounded-lg border border-swar-border bg-white px-2 py-1 text-sm font-semibold"
                                      />
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <span className="inline-flex rounded-full px-2 py-1 text-xs font-bold bg-swar-primary-light text-swar-text">
                                        Draft
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          disabled={savingId === '__create__'}
                                          onClick={createSchedule}
                                          className="rounded-lg bg-swar-primary px-3 py-2 text-xs font-bold text-white hover:bg-swar-primary disabled:opacity-60"
                                        >
                                          {savingId === '__create__' ? 'Saving…' : 'Save'}
                                        </button>
                                        <button
                                          type="button"
                                          disabled={savingId === '__create__'}
                                          onClick={cancelCreate}
                                          className="rounded-lg bg-swar-primary-light px-3 py-2 text-xs font-bold text-swar-text hover:bg-swar-primary-light disabled:opacity-60"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )}

                                {filteredSchedules.length === 0 && !creating ? (
                                  <tr>
                                    <td colSpan={9} className="px-4 py-8 text-center text-swar-text-secondary">
                                      No schedules found for this workshop + mode + language.
                                    </td>
                                  </tr>
                                ) : (
                                  filteredSchedules.map((s) => {
                                    const published = (s.status || 'draft') === 'published';
                                    const timeText = s.time || [s.startTime, s.endTime].filter(Boolean).join(' - ') || '';
                                    const feesText = `₹${Number(s.price || 0).toLocaleString('en-IN')} ${String(
                                      s.currency || 'INR'
                                    ).toUpperCase()}`;
                                    const editing = editingId === s.id;
                                    const busy = savingId === s.id || savingId === '__create__';

                                    return (
                                      <tr key={s.id} className={published ? 'bg-swar-primary-light/40' : 'bg-white'}>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                          {editing ? (
                                            <input
                                              type="date"
                                              value={editForm.startDate}
                                              onChange={(e) => setEditForm((p) => ({ ...p, startDate: e.target.value }))}
                                              className="rounded-lg border border-swar-border bg-white px-2 py-1 text-sm font-semibold"
                                            />
                                          ) : s.startDate ? (
                                            formatDate(String(s.startDate))
                                          ) : (
                                            '—'
                                          )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                          {editing ? (
                                            <input
                                              type="date"
                                              value={editForm.endDate}
                                              onChange={(e) => setEditForm((p) => ({ ...p, endDate: e.target.value }))}
                                              className="rounded-lg border border-swar-border bg-white px-2 py-1 text-sm font-semibold"
                                            />
                                          ) : s.endDate ? (
                                            formatDate(String(s.endDate))
                                          ) : (
                                            '—'
                                          )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                          {editing ? (
                                            <input
                                              type="text"
                                              value={editForm.batch}
                                              onChange={(e) => setEditForm((p) => ({ ...p, batch: e.target.value }))}
                                              className="w-28 rounded-lg border border-swar-border bg-white px-2 py-1 text-sm font-semibold"
                                              placeholder="morning"
                                            />
                                          ) : (
                                            s.batch || '—'
                                          )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                          {editing ? (
                                            <select
                                              value={editForm.language}
                                              onChange={(e) => setEditForm((p) => ({ ...p, language: e.target.value }))}
                                              className="w-28 rounded-lg border border-swar-border bg-white px-2 py-1 text-sm font-semibold"
                                            >
                                              <option value="Hindi">Hindi</option>
                                              <option value="English">English</option>
                                              <option value="Marathi">Marathi</option>
                                            </select>
                                          ) : (
                                            s.language || '—'
                                          )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                          {editing ? (
                                            <input
                                              type="text"
                                              value={editForm.time}
                                              onChange={(e) => setEditForm((p) => ({ ...p, time: e.target.value }))}
                                              className="w-44 rounded-lg border border-swar-border bg-white px-2 py-1 text-sm font-semibold"
                                              placeholder="6:00 AM - 8:00 AM"
                                            />
                                          ) : (
                                            timeText || '—'
                                          )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap font-semibold">
                                          {editing ? (
                                            <div className="flex items-center gap-2">
                                              <input
                                                type="number"
                                                value={editForm.price}
                                                onChange={(e) => setEditForm((p) => ({ ...p, price: e.target.value }))}
                                                className="w-24 rounded-lg border border-swar-border bg-white px-2 py-1 text-sm font-semibold"
                                              />
                                              <select
                                                value={editForm.currency}
                                                onChange={(e) => setEditForm((p) => ({ ...p, currency: e.target.value }))}
                                                className="rounded-lg border border-swar-border bg-white px-2 py-1 text-sm font-semibold"
                                              >
                                                <option value="INR">INR</option>
                                                <option value="USD">USD</option>
                                                <option value="NPR">NPR</option>
                                              </select>
                                            </div>
                                          ) : (
                                            feesText
                                          )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                          {editing ? (
                                            <input
                                              type="number"
                                              value={editForm.seatsTotal}
                                              onChange={(e) => setEditForm((p) => ({ ...p, seatsTotal: e.target.value }))}
                                              className="w-20 rounded-lg border border-swar-border bg-white px-2 py-1 text-sm font-semibold"
                                            />
                                          ) : (
                                            Number(s.seatsTotal || 0) || '—'
                                          )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                          <span
                                            className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${
                                              published
                                                ? 'bg-swar-primary-light text-swar-primary'
                                                : 'bg-swar-primary-light text-swar-text'
                                            }`}
                                          >
                                            {published ? 'Published' : 'Draft'}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                          <div className="flex gap-2 flex-wrap">
                                            <button
                                              type="button"
                                              disabled={busy}
                                              onClick={() =>
                                                setPublishStatus(s.id, published ? 'draft' : 'published')
                                              }
                                              className={`rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-60 ${
                                                published
                                                  ? 'bg-yellow-100 text-yellow-900 hover:bg-yellow-200'
                                                  : 'bg-swar-primary text-white hover:bg-swar-primary'
                                              }`}
                                            >
                                              {published ? 'Unpublish' : 'Publish'}
                                            </button>

                                            {!editing ? (
                                              <>
                                                <button
                                                  type="button"
                                                  disabled={busy}
                                                  onClick={() => onStartEdit(s)}
                                                  className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-bold text-white hover:bg-gray-800 disabled:opacity-60"
                                                >
                                                  Edit
                                                </button>
                                                <button
                                                  type="button"
                                                  disabled={busy}
                                                  onClick={() => deleteSchedule(s.id)}
                                                  className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60"
                                                  title="Delete this workshop schedule"
                                                >
                                                  Delete
                                                </button>
                                              </>
                                            ) : (
                                              <>
                                                <button
                                                  type="button"
                                                  disabled={busy}
                                                  onClick={() => saveSchedule(s.id)}
                                                  className="rounded-lg bg-swar-primary px-3 py-2 text-xs font-bold text-white hover:bg-swar-primary disabled:opacity-60"
                                                >
                                                  {busy ? 'Saving…' : 'Save'}
                                                </button>
                                                <button
                                                  type="button"
                                                  disabled={busy}
                                                  onClick={cancelEdit}
                                                  className="rounded-lg bg-swar-primary-light px-3 py-2 text-xs font-bold text-swar-text hover:bg-swar-primary-light disabled:opacity-60"
                                                >
                                                  Cancel
                                                </button>
                                              </>
                                            )}
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
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }
