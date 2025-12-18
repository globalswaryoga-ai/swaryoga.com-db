'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { workshopCatalog } from '@/lib/workshopsData';
import { addCartItem, type CartCurrency, getStoredCart } from '@/lib/cart';

type ModeKey = 'online' | 'offline' | 'residential' | 'recorded';

type LanguageKey = 'Hindi' | 'English' | 'Marathi';

type DbSchedule = {
  id: string;
  workshopSlug: string;
  workshopName?: string;
  mode: ModeKey;
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

const formatScheduleTime = (s: { time?: string; startTime?: string; endTime?: string }) => {
  const direct = String((s as any)?.time || '').trim();
  if (direct) return direct;
  const parts = [String((s as any)?.startTime || '').trim(), String((s as any)?.endTime || '').trim()].filter(Boolean);
  return parts.join(' - ');
};

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const addMonths = (d: Date, months: number) => {
  const copy = new Date(d.getTime());
  copy.setMonth(copy.getMonth() + months);
  return copy;
};

function RegisterNowDashboardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedMode, setSelectedMode] = useState<ModeKey>('online');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageKey>('Hindi');
  const [modePopupOpen, setModePopupOpen] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<string>('Health');
  const [selectedWorkshopSlug, setSelectedWorkshopSlug] = useState<string | null>(null);

  const [allSchedules, setAllSchedules] = useState<DbSchedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [schedulesError, setSchedulesError] = useState<string>('');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');

  // Load published schedules once (used for fees + date blocks + Pay Now schedule id).
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setSchedulesLoading(true);
        setSchedulesError('');
        const res = await fetch('/api/workshops/schedules', { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || 'Failed to load schedules');
        const data = Array.isArray(json?.data) ? (json.data as DbSchedule[]) : [];
        if (!cancelled) setAllSchedules(data);
      } catch (e) {
        if (!cancelled) setSchedulesError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setSchedulesLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  // If something links to `/registernow?workshop=<slug>` (or slug/id), just preselect the workshop.
  // Do NOT redirect away from this page.
  useEffect(() => {
    const slug =
      searchParams?.get('workshop')?.trim() ||
      searchParams?.get('slug')?.trim() ||
      searchParams?.get('id')?.trim() ||
      '';
    if (!slug) return;

    const found = workshopCatalog.find((w) => w.slug === slug);
    if (!found) return;

    setSelectedWorkshopSlug(found.slug);
    if (found.category) setSelectedCategory(found.category);
  }, [searchParams]);

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
    return list.slice();
  }, [grouped, selectedCategory]);

  const selectedWorkshop = useMemo(() => {
    if (!selectedWorkshopSlug) return null;
    return workshopCatalog.find((w) => w.slug === selectedWorkshopSlug) || null;
  }, [selectedWorkshopSlug]);

  const selectedModeLabel = useMemo(() => {
    return MODE_LABELS.find((m) => m.key === selectedMode)?.label || 'Online';
  }, [selectedMode]);

  const schedulesFor = useMemo(() => {
    if (!selectedWorkshopSlug) return [] as DbSchedule[];
    return allSchedules
      .filter((s) => s.workshopSlug === selectedWorkshopSlug)
      .filter((s) => s.mode === selectedMode)
      .slice()
      .sort((a, b) => {
        const ams = a.startDate ? Date.parse(String(a.startDate)) : NaN;
        const bms = b.startDate ? Date.parse(String(b.startDate)) : NaN;
        if (Number.isNaN(ams) && Number.isNaN(bms)) return 0;
        if (Number.isNaN(ams)) return 1;
        if (Number.isNaN(bms)) return -1;
        return ams - bms;
      });
  }, [allSchedules, selectedWorkshopSlug, selectedMode]);

  // Keep a valid selected schedule id when workshop/mode changes.
  useEffect(() => {
    if (!selectedWorkshopSlug) {
      setSelectedScheduleId('');
      return;
    }
    const first = schedulesFor[0]?.id || '';
    setSelectedScheduleId((prev) => (prev && schedulesFor.some((s) => s.id === prev) ? prev : first));
  }, [selectedWorkshopSlug, schedulesFor]);

  const selectedSchedule = useMemo(() => {
    if (!selectedScheduleId) return schedulesFor[0] || null;
    return schedulesFor.find((s) => s.id === selectedScheduleId) || schedulesFor[0] || null;
  }, [schedulesFor, selectedScheduleId]);

  const sixMonthBlocks = useMemo(() => {
    if (!selectedWorkshopSlug) return [] as Array<{ label: string; dateText: string; available: boolean }>;

    const dated = schedulesFor
      .map((s) => ({ s, ms: s.startDate ? Date.parse(String(s.startDate)) : NaN }))
      .filter((p) => !Number.isNaN(p.ms))
      .sort((a, b) => a.ms - b.ms);

    // Recorded can be truly "Anytime" (no date). But if a dated schedule exists, show it in the correct month.
    if (selectedMode === 'recorded' && dated.length === 0) {
      const today = new Date();
      const hasRecorded = schedulesFor.length > 0;
      return Array.from({ length: 6 }, (_, i) => {
        const d = addMonths(today, i);
        return {
          label: d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
          dateText: hasRecorded ? 'Anytime' : 'Coming soon',
          available: hasRecorded,
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
  }, [selectedWorkshopSlug, selectedMode, schedulesFor]);

  const onSelectMode = (next: ModeKey) => {
    setSelectedMode(next);
  };

  const onPayNow = () => {
    if (!selectedWorkshopSlug || !selectedSchedule) return;

    const workshop = workshopCatalog.find((w) => w.slug === selectedWorkshopSlug);
    if (!workshop) return;

    const currencyRaw = String((selectedSchedule as any)?.currency || 'INR').toUpperCase();
    const currency: CartCurrency = (['INR', 'USD', 'NPR'] as const).includes(currencyRaw as any)
      ? (currencyRaw as CartCurrency)
      : 'INR';

    const scheduleId = String((selectedSchedule as any)?.id || '');
    const price = Number((selectedSchedule as any)?.price || 0);
    const seats = Number((selectedSchedule as any)?.seatsTotal || 0);

    const id = `${workshop.slug}|${scheduleId || 'schedule'}|${currency}`;
    const alreadyInCart = getStoredCart().some((item) => item.id === id && item.currency === currency);
    if (!alreadyInCart) {
      addCartItem({
        id,
        name: `${workshop.name} (${selectedModeLabel.toUpperCase()} • ${selectedLanguage} • ${currency})`,
        price,
        quantity: 1,
        currency,
        workshop: workshop.slug,
        scheduleId: scheduleId || undefined,
        seatsTotal: Number.isFinite(seats) && seats > 0 ? seats : undefined,
        mode: (selectedSchedule as any)?.mode || selectedMode,
        language: selectedLanguage,
      });
    }

    router.push('/cart');
  };

  const payDisabled = !selectedWorkshopSlug || !selectedSchedule;

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-20 bg-swar-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
            {/* Sidebar */}
            <aside className="rounded-xl border border-orange-100 bg-orange-50 p-4 sm:p-5 shadow-sm h-fit">
              <h2 className="text-lg font-extrabold text-swar-text mb-4">Register Now</h2>

              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-wide text-swar-text-secondary mb-2">Language</p>
                <div className="grid grid-cols-2 gap-2 sm:block sm:space-y-2">
                  {(['Hindi', 'English', 'Marathi'] as LanguageKey[]).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                        onClick={() => {
                          setSelectedLanguage(lang);
                          // New requirement: when user clicks language, open mode popup.
                          setModePopupOpen(true);
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
              </div>

              <div>
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
                          active ? 'bg-white text-orange-700 border border-orange-200' : 'text-swar-text hover:bg-orange-100'
                        }`}
                      >
                        {heading}
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* Main */}
            <section className="rounded-xl border border-swar-border bg-white shadow-sm overflow-hidden">
              {/* Header with mode buttons */}
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
                          onClick={() => onSelectMode(m.key)}
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
                {/* Workshop dashboard rows */}
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-swar-text">{getCategoryHeading(selectedCategory)}</h2>
                    <p className="text-sm text-swar-text-secondary">Default: Online + Hindi. Mode: {selectedModeLabel}. Language: {selectedLanguage}.</p>
                  </div>
                </div>

                {/* Mobile/tablet: cards */}
                <div className="md:hidden space-y-3">
                  {rows.map((w) => {
                    const schedule = allSchedules
                      .filter((s) => s.workshopSlug === w.slug)
                      .filter((s) => s.mode === selectedMode)
                      .sort((a, b) => {
                        const ams = a.startDate ? Date.parse(String(a.startDate)) : NaN;
                        const bms = b.startDate ? Date.parse(String(b.startDate)) : NaN;
                        if (Number.isNaN(ams) && Number.isNaN(bms)) return 0;
                        if (Number.isNaN(ams)) return 1;
                        if (Number.isNaN(bms)) return -1;
                        return ams - bms;
                      })[0] || null;

                    const active = selectedWorkshopSlug === w.slug;
                    const feeText = schedule
                      ? `₹${Number(schedule.price).toLocaleString('en-IN')} ${String(schedule.currency).toUpperCase()}`
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

                  {rows.length === 0 && (
                    <div className="rounded-xl border border-swar-border bg-white px-4 py-6 text-center text-swar-text-secondary">
                      No workshops found.
                    </div>
                  )}
                </div>

                {/* Desktop: table */}
                <div className="hidden md:block overflow-x-auto rounded-xl border border-swar-border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-swar-bg">
                      <tr>
                        <th className="px-4 py-3 text-left font-bold text-swar-text">Workshop</th>
                        <th className="px-4 py-3 text-left font-bold text-swar-text">Duration</th>
                        <th className="px-4 py-3 text-left font-bold text-swar-text">Fees</th>
                        <th className="px-4 py-3 text-left font-bold text-swar-text">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {rows.map((w) => {
                        const schedule = allSchedules
                          .filter((s) => s.workshopSlug === w.slug)
                          .filter((s) => s.mode === selectedMode)
                          .sort((a, b) => {
                            const ams = a.startDate ? Date.parse(String(a.startDate)) : NaN;
                            const bms = b.startDate ? Date.parse(String(b.startDate)) : NaN;
                            if (Number.isNaN(ams) && Number.isNaN(bms)) return 0;
                            if (Number.isNaN(ams)) return 1;
                            if (Number.isNaN(bms)) return -1;
                            return ams - bms;
                          })[0] || null;
                        const active = selectedWorkshopSlug === w.slug;
                        const feeText = schedule ? `₹${Number(schedule.price).toLocaleString('en-IN')} ${String(schedule.currency).toUpperCase()}` : 'TBD';
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
                                  active ? 'bg-swar-primary text-white' : 'bg-swar-primary-light text-swar-text hover:bg-swar-primary-light'
                                }`}
                              >
                                {active ? 'Selected' : 'Select'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {rows.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-swar-text-secondary">
                            No workshops found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Dates + Pay Now */}
                <div className="mt-6 rounded-xl border border-swar-border bg-swar-bg p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="text-base sm:text-lg font-extrabold text-swar-text">
                        {selectedWorkshop ? selectedWorkshop.name : 'Select a workshop to see dates'}
                      </h3>
                      <p className="text-sm text-swar-text-secondary">Next 6 months dates</p>
                    </div>
                    <button
                      type="button"
                      disabled={payDisabled}
                      onClick={onPayNow}
                      className={`rounded-lg px-5 py-3 text-sm font-extrabold transition-all ${
                        payDisabled
                          ? 'bg-gray-300 text-swar-text-secondary cursor-not-allowed'
                          : 'bg-swar-primary text-white hover:bg-swar-primary hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]'
                      }`}
                    >
                      Pay Now
                    </button>
                  </div>

                  {selectedWorkshopSlug && schedulesFor.length > 1 && (
                    <div className="mt-4">
                      <label className="block text-xs font-bold uppercase tracking-wide text-swar-text-secondary mb-2">
                        Choose batch / time
                      </label>
                      <select
                        value={selectedScheduleId}
                        onChange={(e) => setSelectedScheduleId(e.target.value)}
                        className="w-full max-w-xl rounded-lg border border-swar-border bg-white px-3 py-2 text-sm font-semibold"
                      >
                        {schedulesFor.map((s) => {
                          const start = s.startDate ? formatDate(String(s.startDate)) : 'Anytime';
                          const batch = String(s.batch || '').trim();
                          const time = String(s.time || '').trim() || [s.startTime, s.endTime].filter(Boolean).join(' - ');
                          const price = Number(s.price || 0);
                          const currency = String(s.currency || 'INR').toUpperCase();
                          const label = `${start}${batch ? ` • ${batch}` : ''}${time ? ` • ${time}` : ''} • ₹${price.toLocaleString('en-IN')} ${currency}`;
                          return (
                            <option key={s.id} value={s.id}>
                              {label}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

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
                        <div className="text-[11px] font-bold uppercase tracking-wide">{b.label}</div>
                        <div className="mt-1">{b.dateText}</div>
                      </div>
                    ))}
                  </div>

                  {!selectedWorkshopSlug && (
                    <p className="mt-4 text-xs text-swar-text-secondary">Choose a workshop from the table above to unlock Pay Now.</p>
                  )}

                  {selectedWorkshopSlug && !selectedSchedule && (
                    <p className="mt-4 text-xs text-red-600 font-semibold">
                      No schedule found for selected mode. Please change mode.
                    </p>
                  )}

                  {(schedulesLoading || schedulesError) && (
                    <p className={`mt-4 text-xs ${schedulesError ? 'text-red-600' : 'text-swar-text-secondary'}`}>
                      {schedulesLoading ? 'Loading schedules…' : schedulesError}
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Mode popup overlay (opens when user clicks language) */}
        {modePopupOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl border border-swar-border overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-swar-border">
                <h3 className="text-lg font-extrabold text-swar-text">Select Mode</h3>
                <button
                  type="button"
                  onClick={() => setModePopupOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-bold bg-swar-primary-light hover:bg-swar-primary-light"
                  aria-label="Close mode popup"
                >
                  ✕
                </button>
              </div>
              <div className="p-5 space-y-2">
                {MODE_LABELS.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => {
                      setSelectedMode(m.key);
                      setModePopupOpen(false);
                    }}
                    className={`w-full rounded-lg px-4 py-3 text-left font-extrabold transition-colors ${
                      selectedMode === m.key
                        ? 'bg-swar-primary text-white'
                        : 'bg-swar-bg text-swar-text hover:bg-swar-primary-light'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="px-5 pb-5">
                <p className="text-xs text-swar-text-secondary">Language selected: {selectedLanguage}. Choose the mode to continue.</p>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

export default function RegisterNowDashboardPage() {
  return (
    <Suspense fallback={null}>
      <RegisterNowDashboardPageInner />
    </Suspense>
  );
}
