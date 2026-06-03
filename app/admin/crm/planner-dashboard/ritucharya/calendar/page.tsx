'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader, CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';
import { getToken } from '@/lib/client-auth';

interface MonthEntry {
  month: number;
  monthName: string;
  rituId: string;
  ritu: any;
  recipes: any[];
}

// One distinct tint per ritu so the year reads as a colored chart.
const RITU_TINT: Record<string, string> = {
  grisham: 'bg-orange-50 border-orange-200',
  varsha: 'bg-blue-50 border-blue-200',
  sharad: 'bg-amber-50 border-amber-200',
  hemant: 'bg-cyan-50 border-cyan-200',
  shishir: 'bg-indigo-50 border-indigo-200',
  vasant: 'bg-emerald-50 border-emerald-200',
};

function TabNav() {
  const base = 'px-4 py-2 rounded-lg text-sm font-medium transition';
  return (
    <div className="flex gap-2 mb-6 flex-wrap">
      <Link href="/admin/crm/planner-dashboard/ritucharya/profile" className={`${base} bg-white text-gray-700 border hover:bg-gray-50`}>📝 My Form</Link>
      <Link href="/admin/crm/planner-dashboard/ritucharya/today" className={`${base} bg-white text-gray-700 border hover:bg-gray-50`}>📅 Today</Link>
      <Link href="/admin/crm/planner-dashboard/ritucharya/calendar" className={`${base} bg-emerald-600 text-white`}>🗓️ Year Calendar</Link>
    </div>
  );
}

export default function RitucharyaCalendarPage() {
  const [months, setMonths] = useState<MonthEntry[]>([]);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<number | null>(new Date().getMonth() + 1); // current month expanded

  useEffect(() => {
    (async () => {
      const token = getToken();
      if (!token) { setError('Not logged in.'); setLoading(false); return; }
      try {
        const res = await fetch('/api/admin/crm/ritucharya/calendar', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to load calendar');
        setMonths(data.months || []);
        setYear(data.year);
      } catch (e: any) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="max-w-5xl mx-auto p-6"><TabNav /><div className="flex items-center gap-2 text-gray-500"><Loader className="animate-spin" size={18} /> Loading year chart…</div></div>;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      <TabNav />
      <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2"><CalendarDays className="text-emerald-600" /> Ritucharya Year Calendar — {year}</h1>
      <p className="text-gray-500 text-sm mb-6">Each month maps to its Ayurvedic ritu (season). Tap a month for the full diet plan and recommended recipes.</p>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {months.map(m => {
          const tint = RITU_TINT[m.rituId] || 'bg-gray-50 border-gray-200';
          const isOpen = open === m.month;
          return (
            <div key={m.month} className={`border rounded-xl overflow-hidden ${tint}`}>
              <button onClick={() => setOpen(isOpen ? null : m.month)} className="w-full flex items-center justify-between p-4 text-left">
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">{m.monthName}</div>
                  <div className="font-semibold text-gray-900">{m.ritu?.emoji} {m.ritu?.nameEn} <span className="text-gray-500 font-normal">({m.ritu?.nameHi})</span></div>
                  <div className="text-xs text-gray-500">{m.ritu?.tempRange}</div>
                </div>
                {isOpen ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
              </button>

              {isOpen && m.ritu && (
                <div className="px-4 pb-4 bg-white/60 border-t">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-sm">
                    <div>
                      <p className="font-medium text-emerald-800 mb-1">✅ Eat</p>
                      <ul className="list-disc ml-5 text-gray-700">
                        {(m.ritu.tastesToEat || []).map((t: any, i: number) => <li key={i}>{t.nameEn} <span className="text-gray-500">— {t.examples}</span></li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-rose-800 mb-1">⛔ Avoid</p>
                      <ul className="list-disc ml-5 text-gray-700">
                        {(m.ritu.tastesToAvoid || []).map((t: any, i: number) => <li key={i}>{t.nameEn} <span className="text-gray-500">— {t.examples}</span></li>)}
                      </ul>
                    </div>
                  </div>

                  {m.ritu.healthTips?.length > 0 && (
                    <div className="mt-3 text-sm">
                      <p className="font-medium text-emerald-800 mb-1">🌿 Health tips</p>
                      <ul className="list-disc ml-5 text-gray-700">{m.ritu.healthTips.map((t: string, i: number) => <li key={i}>{t}</li>)}</ul>
                    </div>
                  )}

                  <div className="mt-4">
                    <p className="font-medium text-gray-800 mb-2 text-sm">🍲 Recommended recipes ({m.recipes.length})</p>
                    {m.recipes.length === 0 ? (
                      <p className="text-xs text-gray-400">No published recipes tagged for this ritu yet.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {m.recipes.map(r => (
                          <div key={r.id} className="border rounded-lg bg-white overflow-hidden">
                            {r.image && <img src={r.image} alt={r.name} className="w-full h-20 object-cover" />}
                            <div className="p-2">
                              <div className="text-xs font-medium text-gray-800 truncate">{r.name}</div>
                              <div className="text-[10px] text-gray-500 capitalize">{r.category} · {r.primaryRasa}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
