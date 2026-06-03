'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MapPin, Loader, RefreshCw, Save, Pencil, Leaf, Thermometer, Droplets, Wind } from 'lucide-react';
import { locationData } from '@/lib/locationData';
import { getClimateRitu, getRituBySeason } from '@/lib/ritucharya/seasons';
import { getToken } from '@/lib/client-auth';

const PRAKRITI = [
  { v: '', label: 'Select prakriti (body type)' },
  { v: 'vata', label: 'Vata (वात)' },
  { v: 'pitta', label: 'Pitta (पित्त)' },
  { v: 'kapha', label: 'Kapha (कफ)' },
  { v: 'vata-pitta', label: 'Vata-Pitta' },
  { v: 'pitta-kapha', label: 'Pitta-Kapha' },
  { v: 'vata-kapha', label: 'Vata-Kapha' },
  { v: 'tridosha', label: 'Tridosha (balanced)' },
];

function weatherCodeToText(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 67) return 'Rainy';
  if (code <= 77) return 'Snowy';
  if (code <= 82) return 'Rain showers';
  if (code <= 99) return 'Thunderstorm';
  return 'Clear sky';
}

function TabNav() {
  const base = 'px-4 py-2 rounded-lg text-sm font-medium transition';
  return (
    <div className="flex gap-2 mb-6 flex-wrap">
      <Link href="/admin/crm/planner-dashboard/ritucharya" className={`${base} bg-white text-gray-700 border hover:bg-gray-50`}>🌿 Ritucharya</Link>
      <Link href="/admin/crm/planner-dashboard/ritucharya/profile" className={`${base} bg-emerald-600 text-white`}>📝 My Form</Link>
      <Link href="/admin/crm/planner-dashboard/ritucharya/today" className={`${base} bg-white text-gray-700 border hover:bg-gray-50`}>📅 Today</Link>
      <Link href="/admin/crm/planner-dashboard/ritucharya/calendar" className={`${base} bg-white text-gray-700 border hover:bg-gray-50`}>🗓️ Year Calendar</Link>
    </div>
  );
}

export default function RitucharyaProfilePage() {
  const [editing, setEditing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const [country, setCountry] = useState('');
  const [stateName, setStateName] = useState('');
  const [city, setCity] = useState('');
  const [countries, setCountries] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<any[]>([]);

  const [w, setW] = useState({ temp: 25, tempMin: 20, tempMax: 30, humidity: 50, windSpeed: 15, aqi: 50, description: 'Clear sky', manuallyCorrected: false });
  const [profile, setProfile] = useState({ name: '', age: '' as string | number, gender: '', prakriti: '', healthConditions: '' as string, notes: '' });

  const [resolvedRitu, setResolvedRitu] = useState<any>(null);

  // Countries on mount
  useEffect(() => { setCountries(locationData.map((c: any) => c.name).sort()); }, []);

  // States when country changes
  useEffect(() => {
    if (!country) return;
    const c = locationData.find((x: any) => x.name === country);
    setStates((c?.states.map((s: any) => s.name).sort()) || []);
  }, [country]);

  // Cities when state changes
  useEffect(() => {
    if (!country || !stateName) return;
    const c = locationData.find((x: any) => x.name === country);
    const s = c?.states.find((x: any) => x.name === stateName);
    setCities(s?.cities || []);
  }, [country, stateName]);

  // Load saved profile
  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/crm/ritucharya/profile', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data?.profile) {
        const p = data.profile;
        setCountry(p.country || ''); setStateName(p.state || ''); setCity(p.city || '');
        setW({
          temp: p.weather?.temp ?? 25, tempMin: p.weather?.tempMin ?? 20, tempMax: p.weather?.tempMax ?? 30,
          humidity: p.weather?.humidity ?? 50, windSpeed: p.weather?.windSpeed ?? 15, aqi: p.weather?.aqi ?? 50,
          description: p.weather?.description || 'Clear sky', manuallyCorrected: !!p.weather?.manuallyCorrected,
        });
        setProfile({
          name: p.profile?.name || '', age: p.profile?.age ?? '', gender: p.profile?.gender || '',
          prakriti: p.profile?.prakriti || '', healthConditions: (p.profile?.healthConditions || []).join(', '),
          notes: p.profile?.notes || '',
        });
        setResolvedRitu(data.ritu || null);
        setEditing(false); // have a saved form → show read-only with Edit button
      }
    } catch (e: any) { /* first-time user: stay in edit mode */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Live ritu preview from current (possibly corrected) weather
  useEffect(() => {
    const rid = getClimateRitu(Number(w.temp), Number(w.humidity), w.description);
    setResolvedRitu(getRituBySeason(rid) || null);
  }, [w.temp, w.humidity, w.description]);

  async function fetchWeather() {
    setError('');
    const c = locationData.find((x: any) => x.name === country);
    const s = c?.states.find((x: any) => x.name === stateName);
    const ct = s?.cities.find((x: any) => x.name === city);
    if (!ct) { setError('Pick country, state and city first.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${ct.latitude}&longitude=${ct.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&temperature_unit=celsius`);
      if (!res.ok) throw new Error(`Weather API ${res.status}`);
      const d = await res.json();
      const cur = d.current;
      setW(prev => ({
        ...prev,
        temp: Math.round(cur.temperature_2m),
        tempMin: Math.round(d.daily?.temperature_2m_min?.[0] ?? cur.temperature_2m - 5),
        tempMax: Math.round(d.daily?.temperature_2m_max?.[0] ?? cur.temperature_2m + 5),
        humidity: Math.round(cur.relative_humidity_2m),
        windSpeed: Math.round(cur.wind_speed_10m),
        description: weatherCodeToText(cur.weather_code),
        manuallyCorrected: false,
      }));
    } catch (e: any) { setError(e.message || 'Weather fetch failed'); }
    finally { setLoading(false); }
  }

  async function save() {
    const token = getToken();
    if (!token) { setError('Not logged in.'); return; }
    if (!country || !stateName || !city) { setError('Please select country, state and city.'); return; }
    setSaving(true); setError(''); setSaved(false);
    try {
      const res = await fetch('/api/admin/crm/ritucharya/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          country, state: stateName, city,
          weather: { ...w },
          profile: {
            name: profile.name, age: profile.age === '' ? null : Number(profile.age), gender: profile.gender,
            prakriti: profile.prakriti,
            healthConditions: String(profile.healthConditions).split(',').map(s => s.trim()).filter(Boolean),
            notes: profile.notes,
          },
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Save failed');
      setResolvedRitu(data.ritu || null);
      // keep the existing Today page (localStorage-based) in sync
      try {
        localStorage.setItem('ritucharya_weather', JSON.stringify({ currentTemp: w.temp, humidity: w.humidity, description: w.description }));
        localStorage.setItem('ritucharya_location', JSON.stringify({ country, state: stateName, city }));
      } catch {}
      setSaved(true); setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  const ro = !editing;
  const inputCls = (extra = '') => `w-full px-3 py-2 border rounded-lg ${ro ? 'bg-gray-100 text-gray-600' : 'bg-white'} ${extra}`;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <TabNav />

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Leaf className="text-emerald-600" /> Ritucharya — My Form</h1>
        {ro ? (
          <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
            <Pencil size={16} /> Edit
          </button>
        ) : (
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
            {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />} Save
          </button>
        )}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
      {saved && <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm">✓ Saved. Diet plan recalculated for your weather.</div>}

      {/* Location */}
      <section className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5 md:p-6 mb-5">
        <h2 className="text-xl font-bold text-emerald-800 mb-4 flex items-center gap-2"><MapPin size={20} /> Location</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select disabled={ro} value={country} onChange={e => { setCountry(e.target.value); setStateName(''); setCity(''); }} className={inputCls()}>
            <option value="">Country</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select disabled={ro || !country} value={stateName} onChange={e => { setStateName(e.target.value); setCity(''); }} className={inputCls()}>
            <option value="">State</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select disabled={ro || !stateName} value={city} onChange={e => setCity(e.target.value)} className={inputCls()}>
            <option value="">City</option>
            {cities.map((c: any) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        {!ro && (
          <button onClick={fetchWeather} disabled={loading} className="mt-3 flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />} Auto-fetch weather
          </button>
        )}
      </section>

      {/* Weather (correctable) — colorful cards matching the public Ritucharya page */}
      <section className="rounded-2xl border-2 border-blue-300 bg-blue-50 p-5 md:p-6 mb-5">
        <h2 className="text-xl font-bold text-blue-800 mb-1 flex items-center gap-2">☁️ Weather Details</h2>
        <p className="text-xs text-gray-500 mb-4">Correct any value — the diet plan recalculates from this.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {([
            { k: 'temp',      label: '🌡️ Current Temp (°C)', card: 'bg-blue-100 border-blue-300' },
            { k: 'tempMin',   label: '❄️ Min Temp (°C)',      card: 'bg-blue-100 border-blue-300' },
            { k: 'tempMax',   label: '🔥 Max Temp (°C)',      card: 'bg-blue-100 border-blue-300' },
            { k: 'humidity',  label: '💧 Humidity (%)',        card: 'bg-cyan-100 border-cyan-300' },
            { k: 'windSpeed', label: '💨 Wind Speed (km/h)',  card: 'bg-yellow-100 border-yellow-300' },
            { k: 'aqi',       label: '🌫️ Air Quality (AQI)',  card: 'bg-red-100 border-red-300' },
          ] as const).map(item => (
            <div key={item.k} className={`rounded-xl p-3 border ${item.card}`}>
              <p className="text-[11px] text-gray-600 mb-1">{item.label}</p>
              <input type="number" disabled={ro} value={(w as any)[item.k]}
                onChange={e => setW(p => ({ ...p, [item.k]: Number(e.target.value), manuallyCorrected: true }))}
                className={`w-full px-2 py-1.5 rounded-lg text-lg font-bold text-gray-900 border ${ro ? 'bg-white/60' : 'bg-white'}`} />
            </div>
          ))}
          <div className="rounded-xl p-3 border bg-purple-100 border-purple-300 col-span-2">
            <p className="text-[11px] text-gray-600 mb-1">📝 Sky Condition</p>
            <input type="text" disabled={ro} value={w.description}
              onChange={e => setW(p => ({ ...p, description: e.target.value, manuallyCorrected: true }))}
              className={`w-full px-2 py-1.5 rounded-lg font-semibold text-gray-900 border ${ro ? 'bg-white/60' : 'bg-white'}`} />
          </div>
        </div>
      </section>

      {/* Personal profile */}
      <section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 md:p-6 mb-5">
        <h2 className="text-xl font-bold text-amber-800 mb-4 flex items-center gap-2">🧘 Personal Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm"><span className="block text-gray-500 mb-1">Name</span>
            <input disabled={ro} value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} className={inputCls()} /></label>
          <label className="text-sm"><span className="block text-gray-500 mb-1">Age</span>
            <input type="number" disabled={ro} value={profile.age} onChange={e => setProfile(p => ({ ...p, age: e.target.value }))} className={inputCls()} /></label>
          <label className="text-sm"><span className="block text-gray-500 mb-1">Gender</span>
            <select disabled={ro} value={profile.gender} onChange={e => setProfile(p => ({ ...p, gender: e.target.value }))} className={inputCls()}>
              <option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </select></label>
          <label className="text-sm"><span className="block text-gray-500 mb-1">Prakriti (Ayurvedic body type)</span>
            <select disabled={ro} value={profile.prakriti} onChange={e => setProfile(p => ({ ...p, prakriti: e.target.value }))} className={inputCls()}>
              {PRAKRITI.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select></label>
          <label className="text-sm md:col-span-2"><span className="block text-gray-500 mb-1">Health conditions (comma-separated)</span>
            <input disabled={ro} value={profile.healthConditions} onChange={e => setProfile(p => ({ ...p, healthConditions: e.target.value }))} placeholder="e.g. diabetes, acidity" className={inputCls()} /></label>
          <label className="text-sm md:col-span-2"><span className="block text-gray-500 mb-1">Notes</span>
            <textarea disabled={ro} value={profile.notes} onChange={e => setProfile(p => ({ ...p, notes: e.target.value }))} rows={2} className={inputCls()} /></label>
        </div>
      </section>

      {/* Resolved ritu + diet preview */}
      {resolvedRitu && (
        <section className="rounded-2xl border-2 border-green-300 bg-green-50 p-5 md:p-6">
          <h2 className="text-xl font-bold text-green-800 mb-2">{resolvedRitu.emoji} Your Ritu: {resolvedRitu.nameEn} ({resolvedRitu.nameHi})</h2>
          <p className="text-sm text-emerald-800 mb-3">{resolvedRitu.monthsEn} · {resolvedRitu.tempRange}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-emerald-900 mb-1">✅ Eat (tastes)</p>
              <ul className="list-disc ml-5 text-gray-700">
                {(resolvedRitu.tastesToEat || []).map((t: any, i: number) => <li key={i}>{t.nameEn} — {t.examples}</li>)}
              </ul>
            </div>
            <div>
              <p className="font-medium text-rose-900 mb-1">⛔ Avoid (tastes)</p>
              <ul className="list-disc ml-5 text-gray-700">
                {(resolvedRitu.tastesToAvoid || []).map((t: any, i: number) => <li key={i}>{t.nameEn} — {t.examples}</li>)}
              </ul>
            </div>
          </div>
          {resolvedRitu.healthTips?.length > 0 && (
            <div className="mt-3 text-sm">
              <p className="font-medium text-emerald-900 mb-1">🌿 Health tips</p>
              <ul className="list-disc ml-5 text-gray-700">{resolvedRitu.healthTips.map((t: string, i: number) => <li key={i}>{t}</li>)}</ul>
            </div>
          )}
          <Link href="/admin/crm/planner-dashboard/ritucharya/today" className="inline-block mt-4 text-sm text-emerald-700 underline">See today's full plan →</Link>
        </section>
      )}
    </div>
  );
}
