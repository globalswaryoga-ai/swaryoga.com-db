'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Plus, Trash2, X, Eye } from 'lucide-react';
import { PageHeader } from '@/components/admin/crm';
import { useAuth } from '@/hooks/useAuth';
import { getCountryNames, getStateNames, getCityNames, getCityCoordinates, getIndiaCityLookupOptions } from '@/lib/locationData';

interface HoraryListItem {
  _id: string;
  questionText: string;
  querentName?: string;
  horaryNumber: number;
  askedAt: string;
  updatedAt: string;
}

function nowForInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function KpHoraryListPage() {
  const token = useAuth();
  const router = useRouter();

  const [charts, setCharts] = useState<HoraryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [questionText, setQuestionText] = useState('');
  const [querentName, setQuerentName] = useState('');
  const [horaryNumber, setHoraryNumber] = useState('');
  const [askedAt, setAskedAt] = useState(nowForInput());
  const [askedPlace, setAskedPlace] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [utcOffsetHours, setUtcOffsetHours] = useState('5.5');
  const [lookupCountry, setLookupCountry] = useState('');
  const [lookupState, setLookupState] = useState('');
  const [lookupCity, setLookupCity] = useState('');
  const [indiaCityLookup, setIndiaCityLookup] = useState('');

  const fetchCharts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/crm/kp-astro/horary', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      setCharts(res.ok && Array.isArray(json.data) ? json.data : []);
    } catch {
      setError('Failed to load horary charts');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchCharts(); }, [fetchCharts]);

  const resetForm = () => {
    setQuestionText(''); setQuerentName(''); setHoraryNumber(''); setAskedAt(nowForInput());
    setAskedPlace(''); setLatitude(''); setLongitude(''); setUtcOffsetHours('5.5');
    setLookupCountry(''); setLookupState(''); setLookupCity(''); setIndiaCityLookup('');
  };

  const handleLookupCity = (city: string) => {
    setLookupCity(city);
    const coords = getCityCoordinates(lookupCountry, lookupState, city);
    if (!coords) return;
    setLatitude(String(coords.latitude));
    setLongitude(String(coords.longitude));
  };

  const handleIndiaCityLookup = (value: string) => {
    setIndiaCityLookup(value);
    const option = getIndiaCityLookupOptions().find((item) => `${item.city}|${item.state}` === value);
    if (!option) return;
    setLookupCountry('India');
    setLookupState(option.state);
    setLookupCity(option.city);
    setAskedPlace(`${option.city}, ${option.state}, India`);
    setLatitude(String(option.latitude));
    setLongitude(String(option.longitude));
    setUtcOffsetHours('5.5');
  };

  const handleSave = async () => {
    if (!token) return;
    const num = Number(horaryNumber);
    if (!questionText.trim()) { setError('Question is required'); return; }
    if (!num || num < 1 || num > 249) { setError('Horary number must be between 1 and 249'); return; }
    if (!latitude || !longitude) { setError('Latitude and longitude are required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/crm/kp-astro/horary', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: questionText.trim(),
          querentName: querentName || undefined,
          horaryNumber: num,
          askedAt: new Date(askedAt).toISOString(),
          askedPlace: askedPlace || undefined,
          latitude: Number(latitude),
          longitude: Number(longitude),
          utcOffsetHours: Number(utcOffsetHours),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to cast horary chart');
      resetForm();
      setShowForm(false);
      router.push(`/admin/crm/kp-astro/horary-workspace?chartId=${json.data._id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to cast horary chart');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (!confirm('Delete this horary chart? This cannot be undone.')) return;
    try {
      await fetch(`/api/admin/crm/kp-astro/horary/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      setCharts((prev) => prev.filter((c) => c._id !== id));
    } catch {
      setError('Failed to delete chart');
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Eye className="h-6 w-6 text-indigo-500" />
            Horary (Prashna) Charts
          </span>
        }
        subtitle="Cast a chart from a 1-249 number at the moment the question was asked"
        action={
          <div className="flex items-center gap-3">
            <Link href="/admin/crm/kp-astro/data-entry" className="text-sm text-indigo-600 hover:underline">← Data entry</Link>
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showForm ? 'Cancel' : 'New Question'}
            </button>
          </div>
        }
      />

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {showForm && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <textarea value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="Question / matter asked *" rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={querentName} onChange={(e) => setQuerentName(e.target.value)} placeholder="Querent name" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input type="number" min={1} max={249} value={horaryNumber} onChange={(e) => setHoraryNumber(e.target.value)} placeholder="Horary number (1-249) *" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input type="datetime-local" value={askedAt} onChange={(e) => setAskedAt(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
            <p className="text-xs text-gray-500">Choose an Indian city to fill place, latitude, longitude, and IST automatically. For outside India or a city not listed, enter the place and coordinates manually.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <select value={indiaCityLookup} onChange={(e) => handleIndiaCityLookup(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="">India city quick lookup</option>
                {getIndiaCityLookupOptions().map((item) => (
                  <option key={`${item.city}|${item.state}`} value={`${item.city}|${item.state}`}>
                    {item.city}, {item.state}
                  </option>
                ))}
              </select>
              <input value={askedPlace} onChange={(e) => setAskedPlace(e.target.value)} placeholder="Place asked / manual outside India" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <details className="rounded-lg border border-indigo-100 bg-white/70 p-3">
              <summary className="cursor-pointer text-xs font-semibold text-indigo-700">Advanced country/state/city lookup</summary>
              <div className="grid sm:grid-cols-3 gap-3 mt-3">
                <select value={lookupCountry} onChange={(e) => { setLookupCountry(e.target.value); setLookupState(''); setLookupCity(''); setIndiaCityLookup(''); }} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="">Country</option>
                  {getCountryNames().map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
                <select value={lookupState} onChange={(e) => { setLookupState(e.target.value); setLookupCity(''); setIndiaCityLookup(''); }} disabled={!lookupCountry} className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50">
                  <option value="">State</option>
                  {getStateNames(lookupCountry).map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
                <select value={lookupCity} onChange={(e) => { handleLookupCity(e.target.value); setIndiaCityLookup(''); }} disabled={!lookupState} className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50">
                  <option value="">City</option>
                  {getCityNames(lookupCountry, lookupState).map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
            </details>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <input value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="Latitude *" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="Longitude *" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input value={utcOffsetHours} onChange={(e) => setUtcOffsetHours(e.target.value)} placeholder="UTC offset hours (e.g. 5.5)" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Casting…' : 'Cast Chart & Continue'}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Saved Horary Questions</h2>
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : charts.length === 0 ? (
          <p className="text-sm text-gray-400">No horary charts yet. Click "New Question" to cast one.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {charts.map((c) => (
              <div key={c._id} className="flex items-center justify-between py-3">
                <Link href={`/admin/crm/kp-astro/horary-workspace?chartId=${c._id}`} className="text-sm font-medium text-gray-900 hover:text-indigo-600">
                  #{c.horaryNumber} — {c.questionText.slice(0, 60)}{c.questionText.length > 60 ? '…' : ''}
                  {c.querentName ? <span className="text-gray-400"> ({c.querentName})</span> : null}
                </Link>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{new Date(c.updatedAt).toLocaleDateString('en-IN')}</span>
                  <button onClick={() => handleDelete(c._id)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
