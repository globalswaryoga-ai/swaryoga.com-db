'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Loader, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { getToken } from '@/lib/client-auth';
import { getCurrentSeasonByDate, getRituBySeason } from '@/lib/ritucharya/seasons';

// One distinct tint per ritu so the month reads as a colored chart.
const RITU_STYLE: Record<string, { cell: string; dot: string; text: string }> = {
  grisham: { cell: 'bg-orange-100 hover:bg-orange-200 border-orange-200', dot: 'bg-orange-500', text: 'text-orange-700' },
  varsha:  { cell: 'bg-blue-100 hover:bg-blue-200 border-blue-200',       dot: 'bg-blue-500',   text: 'text-blue-700' },
  sharad:  { cell: 'bg-amber-100 hover:bg-amber-200 border-amber-200',     dot: 'bg-amber-500',  text: 'text-amber-700' },
  hemant:  { cell: 'bg-cyan-100 hover:bg-cyan-200 border-cyan-200',        dot: 'bg-cyan-500',   text: 'text-cyan-700' },
  shishir: { cell: 'bg-indigo-100 hover:bg-indigo-200 border-indigo-200',  dot: 'bg-indigo-500', text: 'text-indigo-700' },
  vasant:  { cell: 'bg-emerald-100 hover:bg-emerald-200 border-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-700' },
};
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function TabNav() {
  const base = 'px-4 py-2 rounded-lg text-sm font-medium transition';
  return (
    <div className="flex gap-2 mb-6 flex-wrap">
      <Link href="/admin/crm/planner-dashboard/ritucharya" className={`${base} bg-white text-gray-700 border hover:bg-gray-50`}>📝 Form</Link>
      <Link href="/admin/crm/planner-dashboard/ritucharya/today" className={`${base} bg-white text-gray-700 border hover:bg-gray-50`}>📅 Today</Link>
      <Link href="/admin/crm/planner-dashboard/ritucharya/calendar" className={`${base} bg-emerald-600 text-white`}>🗓️ Month Calendar</Link>
      <Link href="/admin/crm/planner-dashboard/ritucharya/recipes" className={`${base} bg-white text-gray-700 border hover:bg-gray-50`}>🍲 Recipes</Link>
    </div>
  );
}

export default function RitucharyaCalendarPage() {
  const today = new Date();
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() }); // month 0-11
  const [selected, setSelected] = useState<Date>(today);
  const [recipesByRitu, setRecipesByRitu] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  // Pull recipes once (grouped per ritu) from the calendar API.
  useEffect(() => {
    (async () => {
      const token = getToken();
      if (!token) { setLoading(false); return; }
      try {
        const res = await fetch('/api/admin/crm/ritucharya/calendar', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        const map: Record<string, any[]> = {};
        for (const m of data.months || []) { if (m.rituId && m.recipes) map[m.rituId] = m.recipes; }
        setRecipesByRitu(map);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  // Build the day grid for the current month (with leading blanks).
  const cells = useMemo(() => {
    const first = new Date(view.year, view.month, 1);
    const blanks = first.getDay();
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const arr: (Date | null)[] = [];
    for (let i = 0; i < blanks; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(view.year, view.month, d));
    return arr;
  }, [view]);

  const move = (delta: number) => {
    let m = view.month + delta, y = view.year;
    if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
    setView({ year: y, month: m });
  };

  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const selRitu = getRituBySeason(getCurrentSeasonByDate(selected));
  const selRid = getCurrentSeasonByDate(selected);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 bg-gray-50 min-h-screen">
      <TabNav />
      <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2"><CalendarDays className="text-emerald-600" /> Ritucharya Month Calendar</h1>
      <p className="text-gray-500 text-sm mb-5">Each day is colored by its Ayurvedic ritu. Tap a day for its diet plan & recipes.</p>

      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => move(-1)} className="p-2 rounded-lg border bg-white hover:bg-gray-100"><ChevronLeft size={18} /></button>
        <div className="text-lg font-bold text-gray-800">{MONTH_NAMES[view.month]} {view.year}</div>
        <button onClick={() => move(1)} className="p-2 rounded-lg border bg-white hover:bg-gray-100"><ChevronRight size={18} /></button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl border-2 border-emerald-200 p-3 md:p-4">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map(d => <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={`b${i}`} />;
            const rid = getCurrentSeasonByDate(date);
            const st = RITU_STYLE[rid] || { cell: 'bg-gray-50 hover:bg-gray-100 border-gray-200', dot: 'bg-gray-400', text: 'text-gray-600' };
            const isToday = sameDay(date, today);
            const isSel = sameDay(date, selected);
            return (
              <button key={date.toDateString()} onClick={() => setSelected(date)}
                className={`aspect-square rounded-lg border flex flex-col items-center justify-center text-sm transition ${st.cell} ${isSel ? 'ring-2 ring-emerald-600' : ''} ${isToday ? 'font-extrabold' : ''}`}>
                <span className="text-gray-800">{date.getDate()}</span>
                <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${st.dot}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Ritu legend */}
      <div className="flex flex-wrap gap-3 mt-3 text-xs">
        {Object.entries(RITU_STYLE).map(([rid, st]) => {
          const r = getRituBySeason(rid);
          return <span key={rid} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${st.dot}`} />{r?.nameEn || rid}</span>;
        })}
      </div>

      {/* Selected day plan */}
      {selRitu && (
        <section className="mt-5 rounded-2xl border-2 border-green-300 bg-green-50 p-5 md:p-6">
          <p className="text-xs text-gray-500 mb-1">{selected.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <h2 className="text-xl font-bold text-green-800 mb-1">{selRitu.emoji} {selRitu.nameEn} ({selRitu.nameHi})</h2>
          <p className="text-sm text-green-700 mb-3">{selRitu.monthsEn} · {selRitu.tempRange}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-emerald-800 mb-1">✅ Eat</p>
              <ul className="list-disc ml-5 text-gray-700">
                {(selRitu.tastesToEat || []).map((t: any, i: number) => <li key={i}>{t.nameEn} <span className="text-gray-500">— {t.examples}</span></li>)}
              </ul>
            </div>
            <div>
              <p className="font-medium text-rose-800 mb-1">⛔ Avoid</p>
              <ul className="list-disc ml-5 text-gray-700">
                {(selRitu.tastesToAvoid || []).map((t: any, i: number) => <li key={i}>{t.nameEn} <span className="text-gray-500">— {t.examples}</span></li>)}
              </ul>
            </div>
          </div>
          {selRitu.healthTips?.length > 0 && (
            <div className="mt-3 text-sm">
              <p className="font-medium text-emerald-800 mb-1">🌿 Health tips</p>
              <ul className="list-disc ml-5 text-gray-700">{selRitu.healthTips.map((t: string, i: number) => <li key={i}>{t}</li>)}</ul>
            </div>
          )}
          <div className="mt-4">
            <p className="font-medium text-gray-800 mb-2 text-sm">🍲 Recommended recipes {loading ? '' : `(${(recipesByRitu[selRid] || []).length})`}</p>
            {loading ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm"><Loader size={14} className="animate-spin" /> loading…</div>
            ) : (recipesByRitu[selRid] || []).length === 0 ? (
              <p className="text-xs text-gray-400">No published recipes tagged for this ritu yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(recipesByRitu[selRid] || []).map((r: any) => (
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
        </section>
      )}
    </div>
  );
}
