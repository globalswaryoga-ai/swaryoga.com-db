'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import BookSeatModal from '@/components/BookSeatModal';
import { workshopCatalog } from '@/lib/workshopsData';
import { addCartItem, type CartCurrency, getStoredCart } from '@/lib/cart';

type ModeKey = 'online' | 'offline' | 'residential' | 'recorded';

type LanguageKey = 'Hindi' | 'English' | 'Marathi';

type DbSchedule = {
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
};

const MODE_LABELS: Array<{ key: ModeKey; label: string }> = [
  { key: 'online', label: 'Online' },
  { key: 'offline', label: 'Offline' },
  { key: 'residential', label: 'Residential' },
  { key: 'recorded', label: 'Recorded' },
];

const CATEGORY_ORDER = ['Health', 'Wealth', 'Marriage', 'Training', 'Youth & Children'] as const;

const getCategoryHeading = (category: string) => {
  if (category === 'Youth' || category === 'Youth & Children') return 'Youth/Children';
  return category;
};

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

const normalizeModeKey = (v: unknown): ModeKey | '' => {
  const key = String(v ?? '').trim().toLowerCase();
  if (key === 'online') return 'online';
  if (key === 'offline') return 'offline';
  if (key === 'residential') return 'residential';
  if (key === 'recorded') return 'recorded';
  return '';
};

const normalizeLanguageKey = (v: unknown): LanguageKey | '' => {
  const key = String(v ?? '').trim().toLowerCase();
  if (key === 'hindi') return 'Hindi';
  if (key === 'english') return 'English';
  if (key === 'marathi') return 'Marathi';
  return '';
};

function RegisterNowDashboardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedMode, setSelectedMode] = useState<ModeKey>('online');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageKey>('Hindi');

  const [selectedCategory, setSelectedCategory] = useState<string>('Health');
  const [selectedWorkshopSlug, setSelectedWorkshopSlug] = useState<string | null>(null);

  const [allSchedules, setAllSchedules] = useState<DbSchedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [schedulesError, setSchedulesError] = useState<string>('');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');

  // Book seat modal state
  const [bookSeatModal, setBookSeatModal] = useState<{
    isOpen: boolean;
    month?: string;
  }>({ isOpen: false });

  // Load published schedules once (used for fees + date blocks + Pay Now schedule id).
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setSchedulesLoading(true);
        setSchedulesError('');
        const res = await fetch('/api/workshops/schedules?status=published', { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || 'Failed to load schedules');
        const data = Array.isArray(json?.data) ? (json.data as DbSchedule[]) : [];
        console.log('[registerNow] Loaded', data.length, 'published schedules');
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

    const modeParam = searchParams?.get('mode')?.trim();
    const languageParam = (searchParams?.get('language') || searchParams?.get('lang'))?.trim();
    const scheduleIdParam = (searchParams?.get('scheduleId') || searchParams?.get('schedule'))?.trim();

    if (slug) {
      const found = workshopCatalog.find((w) => w.slug === slug);
      if (found) {
        setSelectedWorkshopSlug(found.slug);
        if (found.category) setSelectedCategory(found.category);
      }
    }

    const normalizedMode = normalizeModeKey(modeParam);
    if (normalizedMode) setSelectedMode(normalizedMode);

    const normalizedLanguage = normalizeLanguageKey(languageParam);
    if (normalizedLanguage) setSelectedLanguage(normalizedLanguage);

    if (scheduleIdParam) setSelectedScheduleId(scheduleIdParam);
  }, [searchParams]);

  const categoryOptions = useMemo(() => {
    const unique = new Set<string>();
    for (const w of workshopCatalog) unique.add(w.category || 'Health');

    const preferred = CATEGORY_ORDER.filter((c) => unique.has(c));
    const remainder = Array.from(unique)
      .filter((c) => !preferred.includes(c as any))
      .sort((a, b) => a.localeCompare(b));
    return [...preferred, ...remainder];
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, typeof workshopCatalog> = {};
    for (const c of categoryOptions) map[c] = [];
    for (const w of workshopCatalog) {
      const c = w.category || 'Health';
      if (!map[c]) map[c] = [];
      map[c].push(w);
    }
    return map;
  }, [categoryOptions]);

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
          {/* Filters (Row 1) */}
          <section className="rounded-xl border border-swar-border bg-white shadow-sm p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-swar-text">Register Now</h1>
                <p className="mt-1 text-sm text-swar-text-secondary">Select filters and view the next 6 months schedule.</p>
              </div>
              <div className="text-xs text-swar-text-secondary">
                Mode: <span className="font-semibold text-swar-text">{selectedModeLabel}</span> • Language:{' '}
                <span className="font-semibold text-swar-text">{selectedLanguage}</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-swar-text-secondary mb-1">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    const next = e.target.value;
                    setSelectedCategory(next);
                    // If the currently selected workshop isn't in this category, clear it.
                    if (selectedWorkshopSlug && !(grouped[next] || []).some((w) => w.slug === selectedWorkshopSlug)) {
                      setSelectedWorkshopSlug(null);
                    }
                  }}
                  className="w-full rounded-lg border border-swar-border bg-white px-3 py-2 text-sm font-semibold"
                >
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {getCategoryHeading(cat)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-swar-text-secondary mb-1">Workshop</label>
                <select
                  value={selectedWorkshopSlug || ''}
                  onChange={(e) => setSelectedWorkshopSlug(e.target.value || null)}
                  className="w-full rounded-lg border border-swar-border bg-white px-3 py-2 text-sm font-semibold"
                >
                  <option value="">Select a workshop</option>
                  {rows.map((w) => (
                    <option key={w.slug} value={w.slug}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-swar-text-secondary mb-1">Mode</label>
                <select
                  value={selectedMode}
                  onChange={(e) => onSelectMode(e.target.value as ModeKey)}
                  className="w-full rounded-lg border border-swar-border bg-white px-3 py-2 text-sm font-semibold"
                >
                  {MODE_LABELS.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-swar-text-secondary mb-1">Language</label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value as LanguageKey)}
                  className="w-full rounded-lg border border-swar-border bg-white px-3 py-2 text-sm font-semibold"
                >
                  {(['Hindi', 'English', 'Marathi'] as LanguageKey[]).map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Body: schedule + status */}
          <div className="mt-6">
            <section className="rounded-xl border border-swar-border bg-white shadow-sm p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-swar-text">
                    {selectedWorkshop ? selectedWorkshop.name : 'Select a workshop'}
                  </h2>
                  <p className="mt-1 text-sm text-swar-text-secondary">Next 6 months dates</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {sixMonthBlocks.map((b) => (
                  <div
                    key={b.label}
                    className={`rounded-lg px-3 py-3 border text-sm font-semibold transition-all ${
                      b.available
                        ? 'bg-swar-primary-light border-green-200 text-swar-text'
                        : 'bg-white border-swar-border text-swar-text-secondary hover:border-swar-primary hover:bg-swar-primary/5'
                    }`}
                  >
                    <div className="text-[11px] font-bold uppercase tracking-wide">{b.label}</div>
                    <div className="mt-1 mb-2">{b.dateText}</div>
                    {selectedWorkshopSlug && (
                      <button
                        type="button"
                        onClick={() => setBookSeatModal({ isOpen: true, month: b.label })}
                        className="w-full mt-2 rounded-md px-2 py-1 bg-swar-primary text-white text-xs font-bold hover:bg-swar-primary/90 transition-colors active:scale-95"
                      >
                        Book your seat
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Batch / Time Dropdown - Below Month Boxes */}
              <div className="mt-4 max-w-sm">
                <label className="block text-xs font-bold uppercase tracking-wide text-swar-text-secondary mb-1">
                  Batch / Time
                </label>
                <select
                  value={selectedScheduleId}
                  onChange={(e) => setSelectedScheduleId(e.target.value)}
                  disabled={!selectedWorkshopSlug || schedulesFor.length === 0}
                  className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold ${
                    !selectedWorkshopSlug || schedulesFor.length === 0
                      ? 'border-gray-200 bg-gray-100 text-gray-400'
                      : 'border-swar-border bg-white'
                  }`}
                >
                  {(!selectedWorkshopSlug || schedulesFor.length === 0) && <option value="">Select workshop first</option>}
                  {selectedWorkshopSlug && schedulesFor.length > 0 && (
                    <>
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
                    </>
                  )}
                </select>
              </div>

              {!selectedWorkshopSlug && (
                <p className="mt-4 text-xs text-swar-text-secondary">Choose a workshop from the dropdown to unlock Pay Now.</p>
              )}

              {selectedWorkshopSlug && !selectedSchedule && (
                <p className="mt-4 text-xs text-red-600 font-semibold">No schedule found for selected filters.</p>
              )}

              {(schedulesLoading || schedulesError) && (
                <p className={`mt-4 text-xs ${schedulesError ? 'text-red-600' : 'text-swar-text-secondary'}`}>
                  {schedulesLoading ? 'Loading schedules…' : schedulesError}
                </p>
              )}
            </section>

            {/* Selected Workshop Details - Below in a Row */}
            <div className="mt-6 rounded-xl border border-swar-border bg-swar-bg shadow-sm p-4 sm:p-6">
              <h3 className="text-base font-extrabold text-swar-text mb-4">Selected Workshop Details</h3>

              {!selectedWorkshop ? (
                <p className="text-sm text-swar-text-secondary">Select a workshop to see details and enroll.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="rounded-lg bg-white border border-swar-border p-4">
                    <p className="text-sm font-extrabold text-swar-text">{selectedWorkshop.name}</p>
                    <p className="mt-1 text-xs text-swar-text-secondary">
                      {selectedWorkshop.duration} • {selectedModeLabel} • {selectedLanguage}
                    </p>
                  </div>

                  <div className="rounded-lg bg-white border border-swar-border p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-swar-text-secondary">Next schedule</p>
                    {selectedSchedule ? (
                      <div className="mt-2 text-sm font-semibold text-swar-text">
                        <div>{selectedSchedule.startDate ? formatDate(String(selectedSchedule.startDate)) : 'Anytime'}</div>
                        <div className="mt-1 text-xs text-swar-text-secondary">
                          {[String(selectedSchedule.batch || '').trim(), formatScheduleTime(selectedSchedule), String(selectedSchedule.location || '').trim()]
                            .filter(Boolean)
                            .join(' • ')}
                        </div>
                        <div className="mt-2 text-sm font-extrabold text-swar-text">
                          ₹{Number(selectedSchedule.price || 0).toLocaleString('en-IN')} {String(selectedSchedule.currency || 'INR').toUpperCase()}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 text-sm font-semibold text-red-600">No schedule found.</div>
                    )}
                  </div>

                  <div className="rounded-lg bg-white border border-swar-border p-4">
                    <p className="text-sm text-swar-text font-semibold">Enroll Now</p>
                    <p className="mt-1 text-xs text-swar-text-secondary">Click to add to cart and checkout.</p>
                    <button
                      type="button"
                      disabled={payDisabled}
                      onClick={onPayNow}
                      className={`mt-3 w-full rounded-lg px-4 py-3 text-sm font-extrabold transition-all ${
                        payDisabled
                          ? 'bg-gray-300 text-swar-text-secondary cursor-not-allowed'
                          : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white active:scale-95'
                      }`}
                    >
                      🎓 Enroll Now
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Book Seat Modal */}
        {bookSeatModal.isOpen && selectedWorkshop && (
          <BookSeatModal
            workshopId={selectedWorkshop.slug}
            workshopName={selectedWorkshop.name}
            mode={selectedMode}
            language={selectedLanguage}
            month={bookSeatModal.month || 'Coming soon'}
            onClose={() => setBookSeatModal({ isOpen: false })}
          />
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
