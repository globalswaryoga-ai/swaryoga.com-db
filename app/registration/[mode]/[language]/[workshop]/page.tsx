'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import PayUStaticButton from '@/components/PayUStaticButton';
import { findWorkshopBySlug } from '@/lib/workshopsData';
import { getWorkshopPaymentLink } from '@/lib/workshops/workshopPaymentConfig';
import { workshopCatalog } from '@/lib/workshopsData';

type ModeParam = 'online' | 'offline' | 'residential' | 'recorded';
type LanguageParam = 'english' | 'hindi' | 'marathi' | 'nepali';

type PublicSchedule = {
  id: string;
  workshopSlug: string;
  workshopName: string;
  mode: string;
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
  status?: string;
};

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const monthTitle = (month: string) => {
  const [y, m] = month.split('-').map((p) => Number(p));
  if (!y || !m) return month;
  const d = new Date(y, m - 1, 1);
  const mon = d.toLocaleString(undefined, { month: 'short' }).toUpperCase();
  return `${mon} ${y}`;
};

const clampMonthToOptions = (month: string, options: string[]) => {
  if (!month) return '';
  return options.includes(month) ? month : options[0] || '';
};

function normalizeMode(mode: string | string[] | undefined): ModeParam {
  const v = Array.isArray(mode) ? mode[0] : mode;
  const m = String(v || '').toLowerCase();
  if (m === 'offline') return 'offline';
  if (m === 'residential') return 'residential';
  if (m === 'recorded') return 'recorded';
  return 'online';
}

function normalizeLanguage(language: string | string[] | undefined): LanguageParam {
  const v = Array.isArray(language) ? language[0] : language;
  const l = String(v || '').toLowerCase();
  if (l === 'english') return 'english';
  if (l === 'marathi') return 'marathi';
  if (l === 'nepali') return 'nepali';
  return 'hindi';
}

function normalizeWorkshopSlug(workshop: string | string[] | undefined): string {
  const v = Array.isArray(workshop) ? workshop[0] : workshop;
  return decodeURIComponent(String(v || '')).trim();
}

export default function RegistrationPage() {
  const params = useParams<{ mode: string; language: string; workshop: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode = normalizeMode(params?.mode);
  const language = normalizeLanguage(params?.language);
  const workshopSlug = normalizeWorkshopSlug(params?.workshop);

  // Month is carried in the query string so we don't have to expand path params.
  // Example: /registration/online/hindi/swar-yoga-level-1?month=2026-01
  const [selectedMonth, setSelectedMonth] = useState('');
  const monthOptions = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const opts: string[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      opts.push(monthKey(d));
    }
    return opts;
  }, []);

  // Keep internal state hydrated from URL, but always clamp to next-6-months.
  useEffect(() => {
    const monthFromUrl = searchParams?.get('month') || '';
    const normalized = clampMonthToOptions(monthFromUrl, monthOptions);
    setSelectedMonth(normalized);
  }, [searchParams, monthOptions]);

  const navigate = (next: { mode?: ModeParam; language?: LanguageParam; workshopSlug?: string; month?: string }) => {
    const nextMode = next.mode ?? mode;
    const nextLanguage = next.language ?? language;
    const nextWorkshopSlug = next.workshopSlug ?? workshopSlug;

    const sp = new URLSearchParams(searchParams?.toString() || '');
  const raw = typeof next.month === 'string' ? next.month : selectedMonth;
  const m = clampMonthToOptions(raw, monthOptions);
    if (m) sp.set('month', m);
    else sp.delete('month');

    const qs = sp.toString();
    const url = `/registration/${nextMode}/${nextLanguage}/${encodeURIComponent(nextWorkshopSlug)}${qs ? `?${qs}` : ''}`;
    router.push(url);
  };

  const workshop = useMemo(() => findWorkshopBySlug(workshopSlug), [workshopSlug]);

  const payLink = useMemo(() => {
    if (!workshopSlug) return '';
    return getWorkshopPaymentLink(workshopSlug, mode, language);
  }, [workshopSlug, mode, language]);

  const masterMonthlyPayLink = useMemo(() => {
    if (workshopSlug !== 'master-swar-yoga') return '';
    return getWorkshopPaymentLink('master-swar-yoga', mode, language);
  }, [workshopSlug, mode, language]);

  const masterThreeMonthPayLink = useMemo(() => {
    if (workshopSlug !== 'master-swar-yoga') return '';
    return getWorkshopPaymentLink('master-swar-yoga-3-month', mode, language);
  }, [workshopSlug, mode, language]);

  const [schedules, setSchedules] = useState<PublicSchedule[]>([]);
  const [availability, setAvailability] = useState<Record<string, number>>({});
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState('');

  const schedulesForSelectedMonth = useMemo(() => {
    const month = selectedMonth || monthOptions[0] || '';
    if (!month) return [];
    return schedules.filter((s) => {
      const start = s.startDate ? new Date(String(s.startDate)) : null;
      if (!start || Number.isNaN(start.getTime())) return false;
      return monthKey(start) === month;
    });
  }, [schedules, selectedMonth, monthOptions]);

  const loadSchedules = async (month: string) => {
    try {
      setScheduleLoading(true);
      setScheduleError('');

      const qs = new URLSearchParams();
      if (workshopSlug) qs.set('workshopSlug', workshopSlug);
      if (mode) qs.set('mode', mode);
      if (language) qs.set('language', language);

      const res = await fetch(`/api/workshops/schedules?${qs.toString()}`, { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || 'Failed to load schedules');
      const data = Array.isArray(json?.data) ? (json.data as PublicSchedule[]) : [];
      setSchedules(data);

      // Fetch availability for the currently selected month only.
      const wanted = data.filter((s) => {
        const start = s.startDate ? new Date(String(s.startDate)) : null;
        if (!start || Number.isNaN(start.getTime())) return false;
        return monthKey(start) === month;
      });

      if (wanted.length === 0) {
        setAvailability({});
        return;
      }

      const requests = wanted
        .map((s) => ({
          workshopSlug: String(s.workshopSlug || workshopSlug || ''),
          scheduleId: String(s.id),
          seatsTotal: Number(s.seatsTotal || 0),
        }))
        .filter((r) => r.workshopSlug && r.scheduleId && Number.isFinite(r.seatsTotal) && r.seatsTotal > 0);

      if (requests.length === 0) {
        setAvailability({});
        return;
      }

      const availRes = await fetch('/api/workshops/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests }),
      });
      const availJson = await availRes.json().catch(() => null);
      if (!availRes.ok) throw new Error(availJson?.error || 'Failed to load availability');
      setAvailability((availJson?.data as Record<string, number>) || {});
    } catch (e) {
      setSchedules([]);
      setAvailability({});
      setScheduleError(e instanceof Error ? e.message : String(e));
    } finally {
      setScheduleLoading(false);
    }
  };

  useEffect(() => {
    if (!workshopSlug) return;
    const month = clampMonthToOptions(selectedMonth, monthOptions) || monthOptions[0] || '';
    if (!month) return;
    loadSchedules(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workshopSlug, mode, language, selectedMonth, monthOptions.join('|')]);

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gray-50 pt-24">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Registration</h1>
                <p className="mt-2 text-sm text-gray-600">
                  {workshop ? (
                    <>
                      <span className="font-semibold">{workshop.name}</span>
                      <span className="mx-2">•</span>
                      <span className="uppercase font-semibold">{mode}</span>
                      <span className="mx-2">•</span>
                      <span className="uppercase font-semibold">{language}</span>
                    </>
                  ) : (
                    <>Workshop not found for slug: <span className="font-mono">{workshopSlug || '(empty)'}</span></>
                  )}
                </p>
              </div>
              <Link
                href="/workshops"
                className="shrink-0 text-sm font-bold text-green-700 hover:text-green-800"
              >
                Back to workshops
              </Link>
            </div>

            <div className="mt-6 space-y-4">
              {/* Controls: every click updates URL */}
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Workshop</label>
                    <select
                      value={workshopSlug}
                      onChange={(e) => navigate({ workshopSlug: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800"
                    >
                      {workshopCatalog.map((w) => (
                        <option key={w.slug} value={w.slug}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Mode</label>
                    <select
                      value={mode}
                      onChange={(e) => navigate({ mode: normalizeMode(e.target.value) })}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800"
                    >
                      {(['online', 'offline', 'residential', 'recorded'] as ModeParam[]).map((m) => (
                        <option key={m} value={m}>
                          {m.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Language</label>
                    <select
                      value={language}
                      onChange={(e) => navigate({ language: normalizeLanguage(e.target.value) })}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800"
                    >
                      {(['hindi', 'english', 'marathi', 'nepali'] as LanguageParam[]).map((l) => (
                        <option key={l} value={l}>
                          {l.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-extrabold text-gray-900">Next 6 months dates</p>
                      <p className="mt-1 text-[11px] text-gray-500">
                        Month is stored in the URL as <span className="font-mono">?month=YYYY-MM</span>.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = monthOptions[0] || '';
                        setSelectedMonth(next);
                        navigate({ month: next });
                      }}
                      className="text-xs font-bold text-green-700 hover:text-green-800"
                    >
                      Reset
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {monthOptions.map((m) => {
                      const isActive = (selectedMonth || monthOptions[0]) === m;
                      const hasAny = schedules.some((s) => {
                        const start = s.startDate ? new Date(String(s.startDate)) : null;
                        if (!start || Number.isNaN(start.getTime())) return false;
                        return monthKey(start) === m;
                      });
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setSelectedMonth(m);
                            navigate({ month: m });
                          }}
                          className={
                            `text-left rounded-2xl border px-4 py-4 transition ` +
                            (isActive
                              ? 'border-green-600 bg-green-50 shadow-sm'
                              : 'border-gray-200 bg-white hover:border-green-300')
                          }
                        >
                          <div className="text-sm font-extrabold text-gray-900">{monthTitle(m)}</div>
                          <div className={'mt-2 text-sm font-semibold ' + (hasAny ? 'text-green-700' : 'text-gray-500')}>
                            {hasAny ? 'Available' : 'Coming soon'}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-extrabold text-gray-900">Schedules</p>
                      {scheduleLoading ? (
                        <span className="text-xs font-semibold text-gray-500">Loading…</span>
                      ) : null}
                    </div>

                    {scheduleError ? (
                      <div className="mt-2 text-sm font-semibold text-red-700">{scheduleError}</div>
                    ) : null}

                    {!scheduleLoading && !scheduleError && schedulesForSelectedMonth.length === 0 ? (
                      <div className="mt-2 text-sm font-semibold text-red-700">
                        No schedule found for selected mode. Please change mode.
                      </div>
                    ) : null}

                    {schedulesForSelectedMonth.length > 0 ? (
                      <div className="mt-3 space-y-3">
                        {schedulesForSelectedMonth.map((s) => {
                          const time = String(s.time || '').trim() || [s.startTime, s.endTime].filter(Boolean).join(' - ');
                          const startDate = s.startDate ? new Date(String(s.startDate)) : null;
                          const endDate = s.endDate ? new Date(String(s.endDate)) : null;
                          const dateLine = [
                            startDate && !Number.isNaN(startDate.getTime())
                              ? startDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                              : '',
                            endDate && !Number.isNaN(endDate.getTime())
                              ? endDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                              : '',
                          ].filter(Boolean).join(' - ');

                          const key = `${String(s.workshopSlug)}|${String(s.id)}`;
                          const seatsRemaining = availability[key];
                          const seatsText = Number.isFinite(seatsRemaining) ? `${seatsRemaining} seats left` : '';

                          return (
                            <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-extrabold text-gray-900">{s.batch || 'Batch'}</div>
                                  <div className="mt-1 text-xs text-gray-600">
                                    {[dateLine, time, s.location, seatsText].filter(Boolean).join(' • ')}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="rounded-lg bg-green-700 px-4 py-2 text-sm font-extrabold text-white hover:bg-green-800"
                                >
                                  Book Seat
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm text-gray-700 font-semibold mb-1">Pay Now</p>
                <p className="text-xs text-gray-500">
                  This opens PayU in the same tab.
                </p>

                <div className="mt-4">
                  {workshopSlug === 'master-swar-yoga' ? (
                    <div className="space-y-3">
                      {masterMonthlyPayLink ? (
                        <PayUStaticButton
                          workshopName={workshop?.name || workshopSlug}
                          payuLink={masterMonthlyPayLink}
                          mode={mode}
                          language={language}
                          className="w-full"
                          buttonText="Pay Now (Monthly ₹1500)"
                        />
                      ) : (
                        <div className="text-sm text-red-700 font-semibold">
                          Monthly payment link is not configured for this workshop / mode / language.
                        </div>
                      )}

                      {masterThreeMonthPayLink ? (
                        <PayUStaticButton
                          workshopName={workshop?.name || workshopSlug}
                          payuLink={masterThreeMonthPayLink}
                          mode={mode}
                          language={language}
                          className="w-full"
                          buttonText="Pay Now (3 Months ₹3600)"
                        />
                      ) : (
                        <div className="text-sm text-red-700 font-semibold">
                          3-month payment link is not configured for this workshop / mode / language.
                        </div>
                      )}
                    </div>
                  ) : payLink ? (
                    <PayUStaticButton
                      workshopName={workshop?.name || workshopSlug}
                      payuLink={payLink}
                      mode={mode}
                      language={language}
                      className="w-full"
                      buttonText="Pay Now"
                    />
                  ) : (
                    <div className="text-sm text-red-700 font-semibold">
                      Payment link is not configured for this workshop / mode / language.
                    </div>
                  )}
                </div>
              </div>

              {/* For now, keep this page focused on URL + payment. We can add form fields later. */}
              <div className="text-xs text-gray-500">
                URL format: <span className="font-mono">/registration/&lt;mode&gt;/&lt;language&gt;/&lt;workshopSlug&gt;</span>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
