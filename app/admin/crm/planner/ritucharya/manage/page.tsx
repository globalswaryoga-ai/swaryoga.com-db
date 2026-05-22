'use client';

/**
 * Ritucharya Manage Page
 * ─ Weather data editor (top)
 * ─ Diet Plan Manager: select Ritu + Phase → fill diet data → save to MongoDB
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Save, Loader, ArrowLeft, Plus, X, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import Link from 'next/link';

// ─── Ritu & Phase meta ────────────────────────────────────────────────────────

const RITUS = [
  { key: 'shishir', label: 'शीत (SHISHIRA)',  icon: '❄️', color: 'bg-blue-100   border-blue-400',   header: 'bg-blue-600'   },
  { key: 'vasant',  label: 'वसंत (VASANT)',   icon: '🌸', color: 'bg-green-100  border-green-400',  header: 'bg-green-600'  },
  { key: 'grishma', label: 'ग्रीष्म (GRISHMA)', icon: '☀️', color: 'bg-orange-100 border-orange-400', header: 'bg-orange-500' },
  { key: 'varsha',  label: 'वर्षा (VARSHA)',   icon: '🌧️', color: 'bg-indigo-100 border-indigo-400', header: 'bg-indigo-600' },
  { key: 'sharad',  label: 'शरद (SHARAD)',    icon: '🍂', color: 'bg-amber-100  border-amber-400',  header: 'bg-amber-500'  },
  { key: 'hemant',  label: 'हेमंत (HEMANT)',  icon: '🥶', color: 'bg-purple-100 border-purple-400', header: 'bg-purple-600' },
];

const PHASES = [
  { key: 'begin', label: 'BEGIN — प्रारंभ', desc: 'Starting phase of the season' },
  { key: 'peak',  label: 'PEAK — शिखर',    desc: 'Peak / strongest phase'         },
  { key: 'last',  label: 'LAST — अंत',     desc: 'Ending / transition phase'      },
];

const MEAL_SLOTS = [
  { key: 'brahma_muhurta', time: '4:00–5:00 AM',     label: 'Brahma Muhurta Drink', emoji: '🌙', placeholder: 'e.g. Lukewarm water with honey' },
  { key: 'herbal_drink',   time: '6:00–7:00 AM',     label: 'Herbal Morning Drink',  emoji: '🌿', placeholder: 'e.g. Tulsi tea, Ginger water'   },
  { key: 'breakfast',      time: '8:30–9:30 AM',     label: 'Breakfast (Nasta)',     emoji: '🥣', placeholder: 'e.g. Khichdi, Oatmeal with ghee' },
  { key: 'lunch',          time: '11:30 AM–1:00 PM', label: 'Lunch (Bhojan)',        emoji: '🍱', placeholder: 'e.g. Dal rice, Seasonal sabzi'   },
  { key: 'dinner',         time: '7:00–8:00 PM',     label: 'Dinner (Ratri Bhojan)', emoji: '🌙', placeholder: 'e.g. Light soup, Khichdi'        },
  { key: 'before_sleep',   time: '9:00–10:00 PM',    label: 'Before Sleep',          emoji: '🥛', placeholder: 'e.g. Warm turmeric milk'         },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface MealSlot {
  slotKey: string;
  time: string;
  label: string;
  emoji: string;
  foods: string[];
  tip: string;
}

interface DietPlan {
  ritu: string;
  phase: string;
  meals: MealSlot[];
  herbs: string[];
  lifestyleTips: string[];
  avoidFoods: string[];
  specialNotes: string;
}

interface WeatherData {
  currentTemp: number;
  minTemp: number;
  maxTemp: number;
  humidity: number;
  windSpeed: number;
  airQuality: number;
  description: string;
  climateType: string;
}

// ─── Helper: empty diet plan ──────────────────────────────────────────────────

function emptyPlan(ritu: string, phase: string): DietPlan {
  return {
    ritu,
    phase,
    meals: MEAL_SLOTS.map(s => ({
      slotKey: s.key,
      time: s.time,
      label: s.label,
      emoji: s.emoji,
      foods: [],
      tip: '',
    })),
    herbs: [],
    lifestyleTips: [],
    avoidFoods: [],
    specialNotes: '',
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ManageFormPage() {

  // ── Weather state ────────────────────────────────────────────────────────
  const [location, setLocation] = useState({ country: '', state: '', city: '' });
  const [weather, setWeather] = useState<WeatherData>({
    currentTemp: 0, minTemp: 0, maxTemp: 0,
    humidity: 0, windSpeed: 0, airQuality: 50,
    description: 'Partly cloudy', climateType: 'Hot',
  });
  const [savingWeather, setSavingWeather] = useState(false);
  const [weatherSaved, setWeatherSaved] = useState(false);

  // ── Diet plan state ──────────────────────────────────────────────────────
  const [selectedRitu,  setSelectedRitu]  = useState('');
  const [selectedPhase, setSelectedPhase] = useState('');
  const [dietPlan,      setDietPlan]      = useState<DietPlan | null>(null);
  const [loadingPlan,   setLoadingPlan]   = useState(false);
  const [savingPlan,    setSavingPlan]    = useState(false);
  const [planSaved,     setPlanSaved]     = useState(false);
  const [savedPlans,    setSavedPlans]    = useState<{ritu:string; phase:string}[]>([]);

  // ── Temp input trackers for list fields ──────────────────────────────────
  const [newFood,      setNewFood]      = useState<Record<string, string>>({});
  const [newHerb,      setNewHerb]      = useState('');
  const [newLifestyle, setNewLifestyle] = useState('');
  const [newAvoid,     setNewAvoid]     = useState('');

  // ── Accordion: which meal slot is open ───────────────────────────────────
  const [openSlot, setOpenSlot] = useState<string | null>('brahma_muhurta');

  // ── Load location + weather from localStorage ─────────────────────────
  useEffect(() => {
    const loc = localStorage.getItem('ritucharya_location');
    if (loc) setLocation(JSON.parse(loc));
    const w = localStorage.getItem('ritucharya_weather');
    if (w) setWeather(JSON.parse(w));
    fetchAllSavedPlans();
  }, []);

  // ── Fetch which Ritu-Phase combos are already saved ───────────────────
  const fetchAllSavedPlans = async () => {
    try {
      const res = await fetch('/api/admin/crm/ritucharya-diet');
      const data = await res.json();
      if (data.success && Array.isArray(data.plans)) {
        setSavedPlans(data.plans.map((p: any) => ({ ritu: p.ritu, phase: p.phase })));
      }
    } catch { /* ignore */ }
  };

  // ── Load diet plan when Ritu + Phase selected ─────────────────────────
  const loadPlan = useCallback(async (ritu: string, phase: string) => {
    if (!ritu || !phase) return;
    setLoadingPlan(true);
    setPlanSaved(false);
    try {
      const res = await fetch(`/api/admin/crm/ritucharya-diet?ritu=${ritu}&phase=${phase}`);
      const data = await res.json();
      if (data.success && data.plan) {
        // Merge saved plan with MEAL_SLOTS to ensure all slots exist
        const savedMeals: MealSlot[] = data.plan.meals || [];
        const mergedMeals = MEAL_SLOTS.map(s => {
          const saved = savedMeals.find(m => m.slotKey === s.key);
          return saved || { slotKey: s.key, time: s.time, label: s.label, emoji: s.emoji, foods: [], tip: '' };
        });
        setDietPlan({ ...data.plan, meals: mergedMeals });
      } else {
        setDietPlan(emptyPlan(ritu, phase));
      }
    } catch {
      setDietPlan(emptyPlan(ritu, phase));
    } finally {
      setLoadingPlan(false);
    }
  }, []);

  useEffect(() => {
    if (selectedRitu && selectedPhase) loadPlan(selectedRitu, selectedPhase);
  }, [selectedRitu, selectedPhase, loadPlan]);

  // ── Save weather ──────────────────────────────────────────────────────
  const saveWeather = async () => {
    setSavingWeather(true);
    try {
      localStorage.setItem('ritucharya_weather', JSON.stringify(weather));
      setWeatherSaved(true);
      setTimeout(() => setWeatherSaved(false), 3000);
    } finally { setSavingWeather(false); }
  };

  // ── Save diet plan to MongoDB ─────────────────────────────────────────
  const saveDietPlan = async () => {
    if (!dietPlan) return;
    setSavingPlan(true);
    try {
      const res = await fetch('/api/admin/crm/ritucharya-diet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dietPlan),
      });
      const data = await res.json();
      if (data.success) {
        setPlanSaved(true);
        setTimeout(() => setPlanSaved(false), 3000);
        fetchAllSavedPlans();
      }
    } catch { /* ignore */ }
    finally { setSavingPlan(false); }
  };

  // ── Diet plan field helpers ──────────────────────────────────────────
  const updateMeal = (slotKey: string, field: 'foods' | 'tip', value: any) => {
    setDietPlan(p => p ? {
      ...p,
      meals: p.meals.map(m => m.slotKey === slotKey ? { ...m, [field]: value } : m),
    } : p);
  };

  const addFood = (slotKey: string) => {
    const val = (newFood[slotKey] || '').trim();
    if (!val) return;
    setDietPlan(p => p ? {
      ...p,
      meals: p.meals.map(m => m.slotKey === slotKey
        ? { ...m, foods: [...m.foods, val] }
        : m
      ),
    } : p);
    setNewFood(n => ({ ...n, [slotKey]: '' }));
  };

  const removeFood = (slotKey: string, idx: number) => {
    setDietPlan(p => p ? {
      ...p,
      meals: p.meals.map(m => m.slotKey === slotKey
        ? { ...m, foods: m.foods.filter((_, i) => i !== idx) }
        : m
      ),
    } : p);
  };

  const addListItem = (field: 'herbs' | 'lifestyleTips' | 'avoidFoods', val: string) => {
    const v = val.trim();
    if (!v) return;
    setDietPlan(p => p ? { ...p, [field]: [...p[field], v] } : p);
  };

  const removeListItem = (field: 'herbs' | 'lifestyleTips' | 'avoidFoods', idx: number) => {
    setDietPlan(p => p ? { ...p, [field]: p[field].filter((_, i) => i !== idx) } : p);
  };

  const selectedRituMeta = RITUS.find(r => r.key === selectedRitu);

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">⚙️ Manage Weather Form</h1>
        <Link href="/admin/crm/planner/ritucharya"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 font-semibold">
          <ArrowLeft size={18} /> Back
        </Link>
      </div>

      {/* ── Location display ─────────────────────────────────────────── */}
      {location.country && (
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6">
          <h2 className="text-xl font-bold text-emerald-700 mb-4">📍 User Selected Location</h2>
          <div className="flex gap-8">
            {[['Country', location.country], ['State/Region', location.state], ['City', location.city]].map(([label, val]) => val ? (
              <div key={label}>
                <p className="text-sm text-gray-600">{label}</p>
                <p className="text-lg font-bold text-emerald-700">{val}</p>
              </div>
            ) : null)}
          </div>
        </div>
      )}

      {/* ── Editable Weather Blocks ───────────────────────────────────── */}
      <div className="rounded-2xl border-2 border-blue-300 bg-blue-50 p-8">
        <h2 className="text-2xl font-bold text-blue-700 mb-6">☁️ Editable Weather Blocks</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-100 rounded-xl p-4 border border-blue-300">
            <p className="text-xs text-gray-600 mb-2">🌡️ Current Temp</p>
            <input type="number" value={weather.currentTemp}
              onChange={e => setWeather(w => ({ ...w, currentTemp: Number(e.target.value) }))}
              className="w-full text-2xl font-bold bg-white text-slate-900 outline-none border-2 border-blue-300 rounded px-3 py-2" />
            <p className="text-xs text-gray-500 mt-2">Today's temp</p>
          </div>
          <div className="bg-blue-100 rounded-xl p-4 border border-blue-300">
            <p className="text-xs text-gray-600 mb-2">❄️ Min Temp</p>
            <input type="number" value={weather.minTemp}
              onChange={e => setWeather(w => ({ ...w, minTemp: Number(e.target.value) }))}
              className="w-full text-2xl font-bold bg-white text-slate-900 outline-none border-2 border-blue-300 rounded px-3 py-2" />
            <p className="text-xs text-gray-500 mt-2">Lowest today</p>
          </div>
          <div className="bg-blue-100 rounded-xl p-4 border border-blue-300">
            <p className="text-xs text-gray-600 mb-2">🔥 Max Temp</p>
            <input type="number" value={weather.maxTemp}
              onChange={e => setWeather(w => ({ ...w, maxTemp: Number(e.target.value) }))}
              className="w-full text-2xl font-bold bg-white text-slate-900 outline-none border-2 border-blue-300 rounded px-3 py-2" />
            <p className="text-xs text-gray-500 mt-2">Highest today</p>
          </div>
          <div className="bg-cyan-100 rounded-xl p-4 border border-cyan-300">
            <p className="text-xs text-gray-600 mb-2">💧 Humidity (%)</p>
            <input type="number" value={weather.humidity}
              onChange={e => setWeather(w => ({ ...w, humidity: Number(e.target.value) }))}
              className="w-full text-2xl font-bold bg-white text-slate-900 outline-none border-2 border-cyan-300 rounded px-3 py-2" />
            <p className="text-xs text-gray-500 mt-2">Air moisture</p>
          </div>
          <div className="bg-yellow-100 rounded-xl p-4 border border-yellow-300">
            <p className="text-xs text-gray-600 mb-2">💨 Wind Speed</p>
            <input type="number" value={weather.windSpeed}
              onChange={e => setWeather(w => ({ ...w, windSpeed: Number(e.target.value) }))}
              className="w-full text-2xl font-bold bg-white text-slate-900 outline-none border-2 border-yellow-300 rounded px-3 py-2" />
            <p className="text-xs text-gray-500 mt-2">Air movement</p>
          </div>
          <div className="bg-red-100 rounded-xl p-4 border border-red-300">
            <p className="text-xs text-gray-600 mb-2">🌫️ Air Quality (AQI)</p>
            <input type="number" value={weather.airQuality}
              onChange={e => setWeather(w => ({ ...w, airQuality: Number(e.target.value) }))}
              className="w-full text-2xl font-bold bg-white text-slate-900 outline-none border-2 border-red-300 rounded px-3 py-2" />
            <p className="text-xs text-gray-500 mt-2">
              {weather.airQuality <= 50 ? '🟢 Good' : weather.airQuality <= 100 ? '🟡 Moderate' : '🔴 Unhealthy'}
            </p>
          </div>
          <div className="bg-purple-100 rounded-xl p-4 border border-purple-300">
            <p className="text-xs text-gray-600 mb-2">📝 Description</p>
            <select value={weather.description}
              onChange={e => setWeather(w => ({ ...w, description: e.target.value }))}
              className="w-full text-sm font-bold bg-white text-slate-900 outline-none border-2 border-purple-300 rounded px-3 py-2">
              {['Clear', 'Partly cloudy', 'Cloudy', 'Overcast', 'Foggy', 'Hazy', 'Light rain', 'Rainy', 'Heavy rain', 'Thunderstorm', 'Snowy'].map(d =>
                <option key={d} value={d}>{d}</option>)}
            </select>
            <p className="text-xs text-gray-500 mt-2">Clear, Cloudy, Rainy</p>
          </div>
          <div className="bg-green-100 rounded-xl p-4 border border-green-300">
            <p className="text-xs text-gray-600 mb-2">🌍 Climate Type</p>
            <input type="text" value={weather.climateType}
              onChange={e => setWeather(w => ({ ...w, climateType: e.target.value }))}
              className="w-full text-xl font-bold bg-white text-slate-900 outline-none border-2 border-green-300 rounded px-3 py-2" />
            <p className="text-xs text-gray-500 mt-2">Auto-calculated</p>
          </div>
        </div>
        <button onClick={saveWeather} disabled={savingWeather}
          className="w-full px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 font-bold flex items-center justify-center gap-2">
          {savingWeather ? <><Loader className="animate-spin" size={18}/> Saving…</> :
           weatherSaved  ? <><CheckCircle size={18}/> Saved!</> :
           <><Save size={18}/> Save Weather Data</>}
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          DIET PLAN MANAGER
      ════════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-6">
        <h2 className="text-2xl font-bold text-emerald-800 mb-2">🍽️ Diet Plan Manager</h2>
        <p className="text-sm text-emerald-700 mb-6">
          Select Ritu + Phase → add all diet details → Save to MongoDB.
          The system will auto-load the correct plan when weather is detected.
        </p>

        {/* ── Ritu × Phase selectors ──────────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">

          {/* Ritu selector */}
          <div>
            <label className="block text-sm font-bold text-emerald-800 mb-2">1. Select Ritu (Season)</label>
            <div className="grid grid-cols-2 gap-2">
              {RITUS.map(r => (
                <button key={r.key}
                  onClick={() => setSelectedRitu(r.key)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                    selectedRitu === r.key
                      ? `${r.color} border-opacity-100 shadow-md scale-[1.02]`
                      : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}>
                  <span className="text-xl">{r.icon}</span>
                  <span className="text-xs leading-tight">{r.label}</span>
                  {savedPlans.some(p => p.ritu === r.key) && (
                    <span className="ml-auto text-green-500 text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Phase selector */}
          <div>
            <label className="block text-sm font-bold text-emerald-800 mb-2">2. Select Phase</label>
            <div className="space-y-2">
              {PHASES.map(p => (
                <button key={p.key}
                  onClick={() => setSelectedPhase(p.key)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                    selectedPhase === p.key
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                      : 'bg-white border-gray-200 hover:border-emerald-300 text-gray-700'
                  }`}>
                  <span>{p.label}</span>
                  <span className={`text-xs font-normal ${selectedPhase === p.key ? 'text-emerald-100' : 'text-gray-400'}`}>
                    {p.desc}
                  </span>
                  {selectedRitu && savedPlans.some(sp => sp.ritu === selectedRitu && sp.phase === p.key) && (
                    <CheckCircle size={16} className="text-green-400 ml-2 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Selected Ritu + Phase badge ──────────────────────────────── */}
        {selectedRitu && selectedPhase && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-white mb-6 ${selectedRituMeta?.header || 'bg-gray-600'}`}>
            <span className="text-2xl">{selectedRituMeta?.icon}</span>
            <div>
              <div className="font-bold">{selectedRituMeta?.label} — {PHASES.find(p => p.key === selectedPhase)?.label}</div>
              <div className="text-xs opacity-80">
                {savedPlans.some(p => p.ritu === selectedRitu && p.phase === selectedPhase)
                  ? '✅ Plan already saved — editing existing data'
                  : '📝 New plan — fill in the diet details below'}
              </div>
            </div>
          </div>
        )}

        {/* ── Loading ───────────────────────────────────────────────────── */}
        {loadingPlan && (
          <div className="flex items-center justify-center py-12 text-emerald-600">
            <Loader className="animate-spin mr-2" size={24} />
            <span className="font-semibold">Loading plan…</span>
          </div>
        )}

        {/* ── Diet Plan Form ────────────────────────────────────────────── */}
        {!loadingPlan && dietPlan && selectedRitu && selectedPhase && (
          <div className="space-y-4">

            {/* ── Meal Slots (accordion) ─────────────────────────────────── */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3">🍽️ Meal Slots (6 times per day)</h3>
              <div className="space-y-3">
                {MEAL_SLOTS.map((slot) => {
                  const mealData = dietPlan.meals.find(m => m.slotKey === slot.key) || { foods: [], tip: '' };
                  const isOpen = openSlot === slot.key;

                  return (
                    <div key={slot.key} className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
                      {/* Slot header — click to expand */}
                      <button
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                        onClick={() => setOpenSlot(isOpen ? null : slot.key)}>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{slot.emoji}</span>
                          <div className="text-left">
                            <div className="font-bold text-gray-900">{slot.label}</div>
                            <div className="text-xs text-gray-500">🕐 {slot.time}</div>
                          </div>
                          {mealData.foods.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                              {mealData.foods.length} foods
                            </span>
                          )}
                        </div>
                        {isOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                      </button>

                      {/* Slot body */}
                      {isOpen && (
                        <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">

                          {/* Food items */}
                          <div>
                            <label className="block text-xs font-bold text-gray-600 mb-2">🌿 Food Items (add one by one)</label>

                            {/* Existing foods list */}
                            {mealData.foods.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {mealData.foods.map((food, fi) => (
                                  <div key={fi} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-sm text-emerald-800 font-medium">
                                    <span>🌿 {food}</span>
                                    <button onClick={() => removeFood(slot.key, fi)}
                                      className="text-red-400 hover:text-red-600 ml-1">
                                      <X size={14} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Add food input */}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newFood[slot.key] || ''}
                                onChange={e => setNewFood(n => ({ ...n, [slot.key]: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && addFood(slot.key)}
                                placeholder={slot.placeholder}
                                className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
                              />
                              <button onClick={() => addFood(slot.key)}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 flex items-center gap-1">
                                <Plus size={16} /> Add
                              </button>
                            </div>
                          </div>

                          {/* Tip for this slot */}
                          <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">💡 Ayurvedic Tip for this slot</label>
                            <textarea
                              value={mealData.tip || ''}
                              onChange={e => updateMeal(slot.key, 'tip', e.target.value)}
                              placeholder="e.g. Drink warm, never cold. Agni is strongest at midday."
                              rows={2}
                              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-amber-400 resize-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Herbs ─────────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border-2 border-gray-200 p-5">
              <h3 className="font-bold text-gray-800 mb-3">🌱 Herbs & Supplements</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {dietPlan.herbs.map((h, i) => (
                  <div key={i} className="flex items-center gap-1 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full text-sm text-green-800 font-medium">
                    🌿 {h}
                    <button onClick={() => removeListItem('herbs', i)} className="text-red-400 hover:text-red-600 ml-1"><X size={14}/></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newHerb}
                  onChange={e => setNewHerb(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { addListItem('herbs', newHerb); setNewHerb(''); } }}
                  placeholder="e.g. Ashwagandha, Triphala, Brahmi…"
                  className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-400" />
                <button onClick={() => { addListItem('herbs', newHerb); setNewHerb(''); }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 flex items-center gap-1">
                  <Plus size={16}/> Add
                </button>
              </div>
            </div>

            {/* ── Lifestyle Tips ───────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border-2 border-gray-200 p-5">
              <h3 className="font-bold text-gray-800 mb-3">🧘 Lifestyle Tips</h3>
              <div className="space-y-2 mb-3">
                {dietPlan.lifestyleTips.map((t, i) => (
                  <div key={i} className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-800">
                    <span className="mt-0.5">✦</span>
                    <span className="flex-1">{t}</span>
                    <button onClick={() => removeListItem('lifestyleTips', i)} className="text-red-400 hover:text-red-600 shrink-0"><X size={14}/></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newLifestyle}
                  onChange={e => setNewLifestyle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { addListItem('lifestyleTips', newLifestyle); setNewLifestyle(''); } }}
                  placeholder="e.g. Oil massage daily, Sleep before 10 PM…"
                  className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
                <button onClick={() => { addListItem('lifestyleTips', newLifestyle); setNewLifestyle(''); }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-1">
                  <Plus size={16}/> Add
                </button>
              </div>
            </div>

            {/* ── Avoid Foods ──────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border-2 border-gray-200 p-5">
              <h3 className="font-bold text-gray-800 mb-3">🚫 Avoid Foods / Things</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {dietPlan.avoidFoods.map((f, i) => (
                  <div key={i} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full text-sm text-red-800 font-medium">
                    ✗ {f}
                    <button onClick={() => removeListItem('avoidFoods', i)} className="text-red-500 hover:text-red-700 ml-1"><X size={14}/></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newAvoid}
                  onChange={e => setNewAvoid(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { addListItem('avoidFoods', newAvoid); setNewAvoid(''); } }}
                  placeholder="e.g. Cold drinks, Fried food, Heavy dinner…"
                  className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400" />
                <button onClick={() => { addListItem('avoidFoods', newAvoid); setNewAvoid(''); }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 flex items-center gap-1">
                  <Plus size={16}/> Add
                </button>
              </div>
            </div>

            {/* ── Special Notes ─────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border-2 border-gray-200 p-5">
              <h3 className="font-bold text-gray-800 mb-2">📝 Special Notes (optional)</h3>
              <textarea
                value={dietPlan.specialNotes || ''}
                onChange={e => setDietPlan(p => p ? { ...p, specialNotes: e.target.value } : p)}
                placeholder="Any special Ayurvedic notes for this Ritu-Phase…"
                rows={3}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-amber-400 resize-none"
              />
            </div>

            {/* ── Save Diet Plan button ─────────────────────────────────────── */}
            <button onClick={saveDietPlan} disabled={savingPlan}
              className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-lg font-bold flex items-center justify-center gap-3 shadow-lg transition-colors">
              {savingPlan  ? <><Loader className="animate-spin" size={22}/> Saving to MongoDB…</> :
               planSaved   ? <><CheckCircle size={22}/> ✅ Diet Plan Saved!</> :
               <><Save size={22}/> Save Diet Plan to MongoDB</>}
            </button>

          </div>
        )}

        {/* ── Placeholder when nothing selected ───────────────────────── */}
        {!selectedRitu && !selectedPhase && (
          <div className="text-center py-12 border-2 border-dashed border-emerald-300 rounded-xl">
            <div className="text-5xl mb-3">☝️</div>
            <p className="text-emerald-700 font-semibold">Select a Ritu and Phase above to start adding the diet plan</p>
            <p className="text-gray-500 text-sm mt-1">You will fill 18 total plans (6 Ritus × 3 Phases)</p>
          </div>
        )}

        {/* ── Progress: how many plans saved ─────────────────────────── */}
        <div className="mt-6 p-4 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-700">📊 Diet Plans Progress</span>
            <span className="text-sm font-bold text-emerald-700">{savedPlans.length} / 18 saved</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${(savedPlans.length / 18) * 100}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-3 md:grid-cols-6 gap-2">
            {RITUS.map(r => (
              <div key={r.key} className="text-center">
                <div className="text-lg">{r.icon}</div>
                <div className="text-[10px] text-gray-500 mb-1">{r.key}</div>
                <div className="flex justify-center gap-0.5">
                  {PHASES.map(p => (
                    <div key={p.key}
                      className={`w-3 h-3 rounded-full ${
                        savedPlans.some(sp => sp.ritu === r.key && sp.phase === p.key)
                          ? 'bg-emerald-500'
                          : 'bg-gray-200'
                      }`}
                      title={`${r.label} ${p.label}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-center">Each row of 3 dots = Begin · Peak · Last</p>
        </div>

      </div>

      {/* Note */}
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>💡 Note:</strong> Fill all 18 Ritu-Phase combinations for complete coverage.
          When a user enters weather data, the system detects the exact Ritu + Phase and auto-loads the correct diet plan.
        </p>
      </div>

    </div>
  );
}
