'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Plus, Trash2, X, Calculator, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/admin/crm';
import { useAuth } from '@/hooks/useAuth';
import { getCountryNames, getStateNames, getCityNames, getCityCoordinates, getIndiaCityLookupOptions } from '@/lib/locationData';

const PLANET_NAMES = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

interface HouseRow {
  house: number;
  sign: string;
  signLord: string;
  star: string;
  starLord: string;
  subLord: string;
  degree: string;
}

interface PlanetRow {
  planet: string;
  sign: string;
  star: string;
  subLord: string;
  house: string;
  degree: string;
  retrograde: boolean;
  combust: boolean;
}

interface MahadashaRow {
  planet: string;
  startDate: string;
  endDate: string;
}

interface ChartListItem {
  _id: string;
  personName: string;
  gender?: string;
  dob?: string;
  updatedAt: string;
}

const emptyHouses = (): HouseRow[] =>
  Array.from({ length: 12 }, (_, i) => ({ house: i + 1, sign: '', signLord: '', star: '', starLord: '', subLord: '', degree: '' }));

const emptyPlanets = (): PlanetRow[] =>
  PLANET_NAMES.map((planet) => ({ planet, sign: '', star: '', subLord: '', house: '', degree: '', retrograde: false, combust: false }));

export default function KpHoroscopeChartsPage() {
  const token = useAuth();
  const router = useRouter();

  const [charts, setCharts] = useState<ChartListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [personName, setPersonName] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [ascendantSign, setAscendantSign] = useState('');
  const [ascendantDegree, setAscendantDegree] = useState('');
  const [houses, setHouses] = useState<HouseRow[]>(emptyHouses());
  const [planets, setPlanets] = useState<PlanetRow[]>(emptyPlanets());
  const [mahadashas, setMahadashas] = useState<MahadashaRow[]>([{ planet: '', startDate: '', endDate: '' }]);
  const [dashaPeriods, setDashaPeriods] = useState<any[]>([]);
  const [kalsarp, setKalsarp] = useState(false);
  const [pitru, setPitru] = useState(false);
  const [stri, setStri] = useState(false);
  const [otherNotes, setOtherNotes] = useState('');

  const [utcOffset, setUtcOffset] = useState('+5:30');
  const [birthLatitude, setBirthLatitude] = useState('');
  const [birthLongitude, setBirthLongitude] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState('');

  const [lookupCountry, setLookupCountry] = useState('');
  const [lookupState, setLookupState] = useState('');
  const [lookupCity, setLookupCity] = useState('');
  const [indiaCityLookup, setIndiaCityLookup] = useState('');

  const [searchQuery, setSearchQuery] = useState('');

  const fetchCharts = useCallback(async (search?: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await fetch(`/api/admin/crm/kp-astro/charts${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      setCharts(res.ok && Array.isArray(json.data) ? json.data : []);
    } catch {
      setError('Failed to load charts');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchCharts(searchQuery); }, [fetchCharts, searchQuery]);

  const updateHouse = (idx: number, field: keyof HouseRow, value: string) => {
    setHouses((prev) => prev.map((h, i) => (i === idx ? { ...h, [field]: value } : h)));
  };
  const updatePlanet = (idx: number, field: keyof PlanetRow, value: string | boolean) => {
    setPlanets((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };
  const updateDasha = (idx: number, field: keyof MahadashaRow, value: string) => {
    setMahadashas((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));
  };

  const resetForm = () => {
    setPersonName(''); setGender(''); setDob(''); setBirthTime(''); setBirthPlace('');
    setAscendantSign(''); setAscendantDegree('');
    setHouses(emptyHouses()); setPlanets(emptyPlanets());
    setMahadashas([{ planet: '', startDate: '', endDate: '' }]);
    setDashaPeriods([]);
    setKalsarp(false); setPitru(false); setStri(false); setOtherNotes('');
    setLookupCountry(''); setLookupState(''); setLookupCity(''); setIndiaCityLookup('');
    setBirthLatitude(''); setBirthLongitude('');
  };

  const handleLookupCity = (city: string) => {
    setLookupCity(city);
    const coords = getCityCoordinates(lookupCountry, lookupState, city);
    if (coords) {
      setBirthLatitude(String(coords.latitude));
      setBirthLongitude(String(coords.longitude));
    }
  };

  const handleIndiaCityLookup = (value: string) => {
    setIndiaCityLookup(value);
    const option = getIndiaCityLookupOptions().find((item) => `${item.city}|${item.state}` === value);
    if (!option) return;
    setLookupCountry('India');
    setLookupState(option.state);
    setLookupCity(option.city);
    setBirthPlace(`${option.city}, ${option.state}, India`);
    setBirthLatitude(String(option.latitude));
    setBirthLongitude(String(option.longitude));
    setUtcOffset('+5:30');
  };

  const handleCalculate = async () => {
    if (!token) return;
    if (!dob || !birthTime || !birthLatitude || !birthLongitude) {
      setCalcError('Date of birth, birth time, latitude, and longitude are all required to calculate.');
      return;
    }
    setCalculating(true);
    setCalcError('');
    try {
      const res = await fetch('/api/admin/crm/kp-astro/calculate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dob, birthTime, utcOffset,
          latitude: Number(birthLatitude), longitude: Number(birthLongitude),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Calculation failed');

      const data = json.data;
      setAscendantSign(data.ascendant.sign);
      setAscendantDegree(data.ascendant.degree);
      setHouses(data.houses.map((h: any) => ({
        house: h.house, sign: h.sign, signLord: h.signLord, star: h.star, starLord: h.starLord, subLord: h.subLord, degree: h.degree,
      })));
      setPlanets(data.planets.map((p: any) => ({
        planet: p.planet, sign: p.sign, star: p.star, subLord: p.subLord, house: String(p.house), degree: p.degree,
        retrograde: p.retrograde || false, combust: p.combust || false,
      })));
      setMahadashas(data.mahadashas.map((m: any) => ({ planet: m.planet, startDate: m.startDate, endDate: m.endDate })));
      setDashaPeriods(Array.isArray(data.dashaPeriods) ? data.dashaPeriods : []);
    } catch (e) {
      setCalcError(e instanceof Error ? e.message : 'Calculation failed');
    } finally {
      setCalculating(false);
    }
  };

  const handleSave = async () => {
    if (!token) return;
    if (!personName.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/crm/kp-astro/charts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personName: personName.trim(),
          gender: gender || undefined,
          dob: dob || undefined,
          birthTime: birthTime || undefined,
          birthPlace: birthPlace || undefined,
          ascendant: (ascendantSign || ascendantDegree) ? { sign: ascendantSign, degree: ascendantDegree } : undefined,
          houses: houses.filter((h) => h.sign || h.subLord),
          planets: planets
            .filter((p) => p.sign || p.subLord)
            .map((p) => ({ ...p, house: p.house ? Number(p.house) : undefined })),
          mahadashas: mahadashas
            .filter((m) => m.planet && m.startDate && m.endDate)
            .map((m) => ({ planet: m.planet, startDate: m.startDate, endDate: m.endDate })),
          doshas: { kalsarp, pitru, stri, otherNotes },
          dashaPeriods,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save chart');
      resetForm();
      setShowForm(false);
      router.push(`/admin/crm/kp-astro/charts/${json.data._id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save chart');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (!confirm('Delete this chart? This cannot be undone.')) return;
    try {
      await fetch(`/api/admin/crm/kp-astro/charts/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      setCharts((prev) => prev.filter((c) => c._id !== id));
    } catch {
      setError('Failed to delete chart');
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <PageHeader theme="light"
        title={
          <span className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-500" />
            KP Horoscope Charts
          </span>
        }
        subtitle="Enter chart data from your astrology software, then generate an AI-written reading and ask follow-up questions"
        action={
          <div className="flex items-center gap-3">
            <Link href="/admin/crm/kp-astro" className="text-sm text-indigo-600 hover:underline">← Reference lookup</Link>
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showForm ? 'Cancel' : 'New Chart'}
            </button>
          </div>
        }
      />

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {showForm && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="Name *" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <select value={gender} onChange={(e) => setGender(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input value={birthTime} onChange={(e) => setBirthTime(e.target.value)} placeholder="Birth time (e.g. 14:32)" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <Calculator className="h-4 w-4 text-indigo-600" /> Calculate from Birth Details
            </h3>
            <p className="text-xs text-gray-500">Choose an Indian city to fill place, latitude, longitude, and IST automatically. For outside India or a city not listed, enter the place and coordinates manually.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <select
                value={indiaCityLookup}
                onChange={(e) => handleIndiaCityLookup(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">India city quick lookup</option>
                {getIndiaCityLookupOptions().map((item) => (
                  <option key={`${item.city}|${item.state}`} value={`${item.city}|${item.state}`}>
                    {item.city}, {item.state}
                  </option>
                ))}
              </select>
              <input value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} placeholder="Birth place / manual outside India" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <details className="rounded-lg border border-indigo-100 bg-white/70 p-3">
              <summary className="cursor-pointer text-xs font-semibold text-indigo-700">Advanced country/state/city lookup</summary>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                <select
                  value={lookupCountry}
                  onChange={(e) => { setLookupCountry(e.target.value); setLookupState(''); setLookupCity(''); setIndiaCityLookup(''); }}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Country</option>
                  {getCountryNames().map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
                <select
                  value={lookupState}
                  onChange={(e) => { setLookupState(e.target.value); setLookupCity(''); setIndiaCityLookup(''); }}
                  disabled={!lookupCountry}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
                >
                  <option value="">State</option>
                  {getStateNames(lookupCountry).map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
                <select
                  value={lookupCity}
                  onChange={(e) => { handleLookupCity(e.target.value); setIndiaCityLookup(''); }}
                  disabled={!lookupState}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
                >
                  <option value="">City</option>
                  {getCityNames(lookupCountry, lookupState).map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
            </details>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input value={utcOffset} onChange={(e) => setUtcOffset(e.target.value)} placeholder='UTC offset (e.g. "+5:30")' className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <input value={birthLatitude} onChange={(e) => setBirthLatitude(e.target.value)} placeholder="Birth latitude (e.g. 28.6139)" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <input value={birthLongitude} onChange={(e) => setBirthLongitude(e.target.value)} placeholder="Birth longitude (e.g. 77.2090)" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            {calcError && <p className="text-xs text-red-600">{calcError}</p>}
            <button
              type="button"
              onClick={handleCalculate}
              disabled={calculating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {calculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
              Calculate
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <input value={ascendantSign} onChange={(e) => setAscendantSign(e.target.value)} placeholder="Ascendant (Lagna) Sign" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input value={ascendantDegree} onChange={(e) => setAscendantDegree(e.target.value)} placeholder="Ascendant Degree" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">12 House Cusps</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-400">
                    <th className="p-1">House</th><th className="p-1">Sign</th><th className="p-1">Sign Lord</th>
                    <th className="p-1">Star</th><th className="p-1">Star Lord</th><th className="p-1">Sub Lord</th><th className="p-1">Degree</th>
                  </tr>
                </thead>
                <tbody>
                  {houses.map((h, idx) => (
                    <tr key={h.house}>
                      <td className="p-1 font-semibold text-gray-700">{h.house}</td>
                      {(['sign', 'signLord', 'star', 'starLord', 'subLord', 'degree'] as const).map((field) => (
                        <td key={field} className="p-1">
                          <input value={h[field]} onChange={(e) => updateHouse(idx, field, e.target.value)} className="w-full rounded border border-gray-200 px-2 py-1" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">9 Planets</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-400">
                    <th className="p-1">Planet</th><th className="p-1">Sign</th><th className="p-1">Star</th>
                    <th className="p-1">Sub Lord</th><th className="p-1">House</th><th className="p-1">Degree</th>
                    <th className="p-1">Retro</th><th className="p-1">Combust</th>
                  </tr>
                </thead>
                <tbody>
                  {planets.map((p, idx) => (
                    <tr key={p.planet}>
                      <td className="p-1 font-semibold text-gray-700">{p.planet}</td>
                      {(['sign', 'star', 'subLord', 'house', 'degree'] as const).map((field) => (
                        <td key={field} className="p-1">
                          <input value={p[field]} onChange={(e) => updatePlanet(idx, field, e.target.value)} className="w-full rounded border border-gray-200 px-2 py-1" />
                        </td>
                      ))}
                      <td className="p-1"><input type="checkbox" checked={p.retrograde} onChange={(e) => updatePlanet(idx, 'retrograde', e.target.checked)} /></td>
                      <td className="p-1"><input type="checkbox" checked={p.combust} onChange={(e) => updatePlanet(idx, 'combust', e.target.checked)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Mahadasha Periods</h3>
              <button
                type="button"
                onClick={() => setMahadashas((prev) => [...prev, { planet: '', startDate: '', endDate: '' }])}
                className="text-xs flex items-center gap-1 text-indigo-600 hover:underline"
              >
                <Plus className="h-3 w-3" /> Add row
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-2">Enter as many rows as you have (current + future). The system figures out which one is "current" from today's date — no need to label it.</p>
            <div className="space-y-2">
              {mahadashas.map((m, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <input value={m.planet} onChange={(e) => updateDasha(idx, 'planet', e.target.value)} placeholder="Planet" className="w-full sm:flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <input type="date" value={m.startDate} onChange={(e) => updateDasha(idx, 'startDate', e.target.value)} className="w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <input type="date" value={m.endDate} onChange={(e) => updateDasha(idx, 'endDate', e.target.value)} className="w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  {mahadashas.length > 1 && (
                    <button type="button" onClick={() => setMahadashas((prev) => prev.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Doshas</h3>
            <div className="flex flex-wrap items-center gap-4 text-sm mb-2">
              <label className="flex items-center gap-2"><input type="checkbox" checked={kalsarp} onChange={(e) => setKalsarp(e.target.checked)} /> Kalsarp Dosha</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={pitru} onChange={(e) => setPitru(e.target.checked)} /> Pitru Dosha</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={stri} onChange={(e) => setStri(e.target.checked)} /> Stri Dosha</label>
            </div>
            <textarea value={otherNotes} onChange={(e) => setOtherNotes(e.target.value)} placeholder="Other dosha notes" rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save & Continue'}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <h2 className="font-semibold text-gray-900">Saved Charts</h2>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name…"
            className="w-full sm:w-64 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : charts.length === 0 ? (
          <p className="text-sm text-gray-400">No charts yet. Click "New Chart" to create one.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {charts.map((c) => (
              <div key={c._id} className="flex items-center justify-between py-3">
                <Link href={`/admin/crm/kp-astro/charts/${c._id}`} className="text-sm font-medium text-gray-900 hover:text-indigo-600">
                  {c.personName} {c.gender ? <span className="text-gray-400">({c.gender})</span> : null}
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
