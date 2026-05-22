'use client';

/**
 * Ritucharya Manage Page
 * Select weather parameters via dropdowns → auto-detects Ritu + Phase
 * → Fill diet plan for that Ritu-Phase → Save to MongoDB
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Save, Loader, ArrowLeft, Plus, X, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import Link from 'next/link';

// ─── Dropdown options ─────────────────────────────────────────────────────────

const TEMP_RANGES = [
  { label: '-20°C to -10°C (Extreme Cold)',  min: -20, max: -10 },
  { label: '-10°C to 0°C  (Very Cold)',      min: -10, max: 0   },
  { label: '0°C  to 10°C  (Cold)',           min: 0,   max: 10  },
  { label: '10°C to 20°C  (Cool)',           min: 10,  max: 20  },
  { label: '20°C to 30°C  (Warm / Mild)',    min: 20,  max: 30  },
  { label: '30°C to 40°C  (Hot)',            min: 30,  max: 40  },
  { label: '40°C+          (Extreme Hot)',   min: 40,  max: 50  },
];

const HUMIDITY_RANGES = [
  { label: '0%  – 20%  (Very Dry)',      min: 0,   max: 20  },
  { label: '20% – 40%  (Dry)',           min: 20,  max: 40  },
  { label: '40% – 55%  (Moderate)',      min: 40,  max: 55  },
  { label: '55% – 70%  (Humid)',         min: 55,  max: 70  },
  { label: '70% – 85%  (Very Humid)',    min: 70,  max: 85  },
  { label: '85% – 100% (Extreme Humid)', min: 85,  max: 100 },
];

const WIND_RANGES = [
  { label: '0–10 km/h   (Still / Calm)',     min: 0,  max: 10  },
  { label: '10–20 km/h  (Light Breeze)',     min: 10, max: 20  },
  { label: '20–30 km/h  (Moderate Wind)',    min: 20, max: 30  },
  { label: '30–40 km/h  (Strong Wind)',      min: 30, max: 40  },
  { label: '40–50 km/h  (Very Strong Wind)', min: 40, max: 50  },
  { label: '50+ km/h    (Storm Wind)',       min: 50, max: 80  },
];

const SKY_CONDITIONS = [
  'Clear',
  'Partly Cloudy',
  'Cloudy',
  'Mostly Cloudy',
  'Overcast',
  'Foggy',
  'Hazy',
  'Light Rain',
  'Rainy',
  'Heavy Rain',
  'Thunderstorm',
  'Snowy',
];

const AQI_RANGES = [
  { label: '0–50   (Good)',           min: 0,   max: 50  },
  { label: '51–100 (Moderate)',       min: 51,  max: 100 },
  { label: '101–150 (Sensitive)',     min: 101, max: 150 },
  { label: '150+   (Unhealthy)',      min: 151, max: 300 },
];

// ─── Ritu + Phase meta ────────────────────────────────────────────────────────

const RITUS = [
  { key: 'shishir', label: 'शीत (SHISHIRA)',   icon: '❄️', color: 'bg-blue-100 border-blue-400',     header: 'bg-blue-600'   },
  { key: 'vasant',  label: 'वसंत (VASANT)',    icon: '🌸', color: 'bg-green-100 border-green-400',   header: 'bg-green-600'  },
  { key: 'grishma', label: 'ग्रीष्म (GRISHMA)', icon: '☀️', color: 'bg-orange-100 border-orange-400', header: 'bg-orange-500' },
  { key: 'varsha',  label: 'वर्षा (VARSHA)',    icon: '🌧️', color: 'bg-indigo-100 border-indigo-400', header: 'bg-indigo-600' },
  { key: 'sharad',  label: 'शरद (SHARAD)',     icon: '🍂', color: 'bg-amber-100 border-amber-400',   header: 'bg-amber-500'  },
  { key: 'hemant',  label: 'हेमंत (HEMANT)',   icon: '🥶', color: 'bg-purple-100 border-purple-400', header: 'bg-purple-600' },
];

const PHASES = [
  { key: 'begin', label: 'BEGIN — प्रारंभ', desc: 'Starting phase' },
  { key: 'peak',  label: 'PEAK — शिखर',    desc: 'Peak / strongest' },
  { key: 'last',  label: 'LAST — अंत',     desc: 'Ending / transition' },
];

// ─── 18-Phase detection table ──────────────────────────────────────────────
// Each entry: ritu, phase, temp {min,max}, humidity {min,max}, airFlow {min,max}, cloud[]

const RITU_PHASE_TABLE = [
  { ritu:'shishir', phase:'begin', temp:{min:-20,max:-10}, humidity:{min:20,max:25},  wind:{min:15,max:25}, sky:['Clear']                         },
  { ritu:'shishir', phase:'peak',  temp:{min:-10,max:0},   humidity:{min:15,max:20},  wind:{min:15,max:20}, sky:['Clear']                         },
  { ritu:'shishir', phase:'last',  temp:{min:0,  max:10},  humidity:{min:20,max:30},  wind:{min:15,max:25}, sky:['Partly Cloudy']                 },
  { ritu:'vasant',  phase:'begin', temp:{min:10, max:20},  humidity:{min:30,max:40},  wind:{min:15,max:25}, sky:['Partly Cloudy']                 },
  { ritu:'vasant',  phase:'peak',  temp:{min:20, max:30},  humidity:{min:35,max:50},  wind:{min:15,max:30}, sky:['Cloudy']                        },
  { ritu:'vasant',  phase:'last',  temp:{min:25, max:35},  humidity:{min:40,max:55},  wind:{min:20,max:35}, sky:['Partly Cloudy']                 },
  { ritu:'grishma', phase:'begin', temp:{min:30, max:40},  humidity:{min:40,max:55},  wind:{min:25,max:40}, sky:['Clear','Hazy']                  },
  { ritu:'grishma', phase:'peak',  temp:{min:35, max:45},  humidity:{min:45,max:65},  wind:{min:30,max:45}, sky:['Hazy']                          },
  { ritu:'grishma', phase:'last',  temp:{min:32, max:42},  humidity:{min:55,max:70},  wind:{min:35,max:50}, sky:['Mostly Cloudy']                 },
  { ritu:'varsha',  phase:'begin', temp:{min:28, max:35},  humidity:{min:65,max:75},  wind:{min:40,max:50}, sky:['Heavy Rain','Overcast']         },
  { ritu:'varsha',  phase:'peak',  temp:{min:24, max:28},  humidity:{min:70,max:85},  wind:{min:45,max:60}, sky:['Heavy Rain','Thunderstorm']     },
  { ritu:'varsha',  phase:'last',  temp:{min:20, max:24},  humidity:{min:60,max:75},  wind:{min:35,max:45}, sky:['Rainy','Overcast']              },
  { ritu:'sharad',  phase:'begin', temp:{min:20, max:26},  humidity:{min:55,max:65},  wind:{min:25,max:35}, sky:['Partly Cloudy']                 },
  { ritu:'sharad',  phase:'peak',  temp:{min:26, max:32},  humidity:{min:45,max:55},  wind:{min:15,max:30}, sky:['Clear']                         },
  { ritu:'sharad',  phase:'last',  temp:{min:24, max:30},  humidity:{min:40,max:50},  wind:{min:15,max:25}, sky:['Clear']                         },
  { ritu:'hemant',  phase:'begin', temp:{min:12, max:24},  humidity:{min:30,max:40},  wind:{min:15,max:25}, sky:['Partly Cloudy']                 },
  { ritu:'hemant',  phase:'peak',  temp:{min:2,  max:12},  humidity:{min:25,max:35},  wind:{min:15,max:20}, sky:['Clear','Foggy']                 },
  { ritu:'hemant',  phase:'last',  temp:{min:-8, max:2},   humidity:{min:20,max:30},  wind:{min:10,max:20}, sky:['Clear']                         },
];

// ─── Detect Ritu+Phase from selected ranges ───────────────────────────────────

function detectRitu(
  tempRange:     { min: number; max: number } | null,
  humidRange:    { min: number; max: number } | null,
  windRange:     { min: number; max: number } | null,
  sky:           string,
): { ritu: string; phase: string; score: number } | null {

  if (!tempRange && !humidRange) return null;

  let best: { ritu: string; phase: string; score: number } | null = null;

  for (const row of RITU_PHASE_TABLE) {
    let score = 0;

    // Temp overlap (40 pts)
    if (tempRange) {
      const overlapMin = Math.max(tempRange.min, row.temp.min);
      const overlapMax = Math.min(tempRange.max, row.temp.max);
      if (overlapMax >= overlapMin) {
        score += 40;
      } else {
        const gap = overlapMin - overlapMax;
        if (gap <= 5)  score += 25;
        else if (gap <= 10) score += 10;
      }
    }

    // Humidity overlap (30 pts)
    if (humidRange) {
      const oMin = Math.max(humidRange.min, row.humidity.min);
      const oMax = Math.min(humidRange.max, row.humidity.max);
      if (oMax >= oMin) {
        score += 30;
      } else {
        const gap = oMin - oMax;
        if (gap <= 10) score += 18;
        else if (gap <= 20) score += 8;
      }
    }

    // Wind overlap (15 pts)
    if (windRange) {
      const oMin = Math.max(windRange.min, row.wind.min);
      const oMax = Math.min(windRange.max, row.wind.max);
      if (oMax >= oMin) score += 15;
      else {
        const gap = oMin - oMax;
        if (gap <= 5) score += 8;
      }
    }

    // Sky match (15 pts)
    if (sky) {
      const skyLower = sky.toLowerCase();
      if (row.sky.some(s => s.toLowerCase() === skyLower)) score += 15;
      else if (row.sky.some(s => skyLower.includes(s.toLowerCase().split(' ')[0]))) score += 7;
    }

    if (!best || score > best.score) {
      best = { ritu: row.ritu, phase: row.phase, score };
    }
  }

  return best && best.score > 0 ? best : null;
}

// ─── Meal slots ───────────────────────────────────────────────────────────────

const MEAL_SLOTS = [
  { key: 'gond_pani',    time: '4:00 AM',  label: 'Gond Pani',           emoji: '🌙', placeholder: 'e.g. Gond Pani, Warm lemon water, Honey water'    },
  { key: 'herbal_drink', time: '6:00 AM',  label: 'Herbal Drink',        emoji: '🌿', placeholder: 'e.g. Tulsi tea, Ginger water, Neem water'           },
  { key: 'breakfast',    time: '8:30 AM',  label: 'Breakfast (Nasta)',   emoji: '🥣', placeholder: 'e.g. Khichdi, Oatmeal with ghee, Poha'              },
  { key: 'lunch',        time: '11:30 AM', label: 'Lunch (Bhojan)',      emoji: '🍱', placeholder: 'e.g. Dal rice, Seasonal sabzi, Roti'                },
  { key: 'snacks',       time: '5:00 PM',  label: 'Snacks (Nashta)',     emoji: '🍎', placeholder: 'e.g. Seasonal fruits, Dry fruits, Roasted chana'    },
  { key: 'dinner',       time: '7:30 PM',  label: 'Dinner (Ratri Bhojan)', emoji: '🍽️', placeholder: 'e.g. Light soup, Khichdi, Dal chapati'          },
  { key: 'sleep_drink',  time: '9:30 PM',  label: 'Sleep Drink',         emoji: '🥛', placeholder: 'e.g. Warm turmeric milk, Ashwagandha milk'          },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface MealSlot { slotKey:string; time:string; label:string; emoji:string; foods:string[]; tip:string; }
interface DietPlan  { ritu:string; phase:string; meals:MealSlot[]; herbs:string[]; lifestyleTips:string[]; avoidFoods:string[]; specialNotes:string; }

function emptyPlan(ritu:string, phase:string): DietPlan {
  return {
    ritu, phase,
    meals: MEAL_SLOTS.map(s => ({ slotKey:s.key, time:s.time, label:s.label, emoji:s.emoji, foods:[], tip:'' })),
    herbs:[], lifestyleTips:[], avoidFoods:[], specialNotes:'',
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ManageFormPage() {

  // ── Dropdown selections ────────────────────────────────────────────────
  const [selTemp,  setSelTemp]  = useState('');
  const [selHumid, setSelHumid] = useState('');
  const [selWind,  setSelWind]  = useState('');
  const [selSky,   setSelSky]   = useState('');
  const [selAQI,   setSelAQI]   = useState('');

  // ── Manual Ritu override ───────────────────────────────────────────────
  const [manualRitu,  setManualRitu]  = useState('');
  const [manualPhase, setManualPhase] = useState('');

  // ── Detection result ───────────────────────────────────────────────────
  const [detected, setDetected] = useState<{ ritu:string; phase:string; score:number } | null>(null);

  // ── Diet plan state ────────────────────────────────────────────────────
  const [dietPlan,    setDietPlan]    = useState<DietPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [savingPlan,  setSavingPlan]  = useState(false);
  const [planSaved,   setPlanSaved]   = useState(false);
  const [savedPlans,  setSavedPlans]  = useState<{ritu:string;phase:string}[]>([]);
  const [openSlot,    setOpenSlot]    = useState<string|null>('gond_pani');

  // ── Temp inputs ────────────────────────────────────────────────────────
  const [newFood,      setNewFood]      = useState<Record<string,string>>({});
  const [newHerb,      setNewHerb]      = useState('');
  const [newLifestyle, setNewLifestyle] = useState('');
  const [newAvoid,     setNewAvoid]     = useState('');

  // ── On mount: load saved plans list ───────────────────────────────────
  useEffect(() => { fetchAllSavedPlans(); }, []);

  const fetchAllSavedPlans = async () => {
    try {
      const res  = await fetch('/api/admin/crm/ritucharya-diet');
      const data = await res.json();
      if (data.success) setSavedPlans(data.plans.map((p:any) => ({ ritu:p.ritu, phase:p.phase })));
    } catch {}
  };

  // ── Auto-detect from dropdowns ─────────────────────────────────────────
  useEffect(() => {
    const tR = TEMP_RANGES.find(r => r.label === selTemp)   || null;
    const hR = HUMIDITY_RANGES.find(r => r.label === selHumid) || null;
    const wR = WIND_RANGES.find(r => r.label === selWind)   || null;
    const result = detectRitu(tR, hR, wR, selSky);
    setDetected(result);
  }, [selTemp, selHumid, selWind, selSky]);

  // ── Final Ritu+Phase to use (manual override or auto-detected) ─────────
  const finalRitu  = manualRitu  || detected?.ritu  || '';
  const finalPhase = manualPhase || detected?.phase || '';

  // ── Load plan when final Ritu+Phase changes ────────────────────────────
  const loadPlan = useCallback(async (ritu:string, phase:string) => {
    if (!ritu || !phase) { setDietPlan(null); return; }
    setLoadingPlan(true); setPlanSaved(false);
    try {
      const res  = await fetch(`/api/admin/crm/ritucharya-diet?ritu=${ritu}&phase=${phase}`);
      const data = await res.json();
      if (data.success && data.plan) {
        const savedMeals: MealSlot[] = data.plan.meals || [];
        const merged = MEAL_SLOTS.map(s => savedMeals.find(m => m.slotKey === s.key) || { slotKey:s.key, time:s.time, label:s.label, emoji:s.emoji, foods:[], tip:'' });
        setDietPlan({ ...data.plan, meals: merged });
      } else {
        setDietPlan(emptyPlan(ritu, phase));
      }
    } catch { setDietPlan(emptyPlan(ritu, phase)); }
    finally  { setLoadingPlan(false); }
  }, []);

  useEffect(() => { loadPlan(finalRitu, finalPhase); }, [finalRitu, finalPhase, loadPlan]);

  // ── Save diet plan ─────────────────────────────────────────────────────
  const saveDietPlan = async () => {
    if (!dietPlan) return;
    setSavingPlan(true);
    try {
      const res  = await fetch('/api/admin/crm/ritucharya-diet', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(dietPlan) });
      const data = await res.json();
      if (data.success) { setPlanSaved(true); setTimeout(() => setPlanSaved(false), 3000); fetchAllSavedPlans(); }
    } finally { setSavingPlan(false); }
  };

  // ── Diet helpers ───────────────────────────────────────────────────────
  const updateMeal = (slotKey:string, field:'foods'|'tip', value:any) =>
    setDietPlan(p => p ? { ...p, meals: p.meals.map(m => m.slotKey===slotKey ? {...m,[field]:value} : m) } : p);
  const addFood = (slotKey:string) => {
    const val = (newFood[slotKey]||'').trim(); if(!val) return;
    setDietPlan(p => p ? { ...p, meals: p.meals.map(m => m.slotKey===slotKey ? {...m,foods:[...m.foods,val]} : m) } : p);
    setNewFood(n => ({...n,[slotKey]:''}));
  };
  const removeFood = (slotKey:string, idx:number) =>
    setDietPlan(p => p ? { ...p, meals: p.meals.map(m => m.slotKey===slotKey ? {...m,foods:m.foods.filter((_,i)=>i!==idx)} : m) } : p);
  const addItem = (field:'herbs'|'lifestyleTips'|'avoidFoods', val:string, reset:()=>void) => {
    const v = val.trim(); if(!v) return;
    setDietPlan(p => p ? {...p,[field]:[...p[field],v]} : p); reset();
  };
  const removeItem = (field:'herbs'|'lifestyleTips'|'avoidFoods', idx:number) =>
    setDietPlan(p => p ? {...p,[field]:p[field].filter((_,i)=>i!==idx)} : p);

  const selectedRituMeta  = RITUS.find(r => r.key === finalRitu);
  const selectedPhaseMeta = PHASES.find(p => p.key === finalPhase);
  const isAlreadySaved    = savedPlans.some(p => p.ritu===finalRitu && p.phase===finalPhase);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">⚙️ Ritucharya Diet Manager</h1>
        <Link href="/admin/crm/planner/ritucharya"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 font-semibold">
          <ArrowLeft size={18}/> Back
        </Link>
      </div>

      {/* ═══════════════════════════════════════════════════════
          SECTION 1: WEATHER PARAMETER DROPDOWNS
      ═══════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border-2 border-blue-300 bg-blue-50 p-6">
        <h2 className="text-xl font-bold text-blue-800 mb-1">🌤️ Select Weather Parameters</h2>
        <p className="text-sm text-blue-600 mb-5">Select the weather ranges → system auto-detects the Ritu</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Temperature */}
          <div className="bg-white rounded-xl border-2 border-blue-200 p-4">
            <label className="block text-xs font-bold text-blue-700 mb-2">🌡️ Temperature Range</label>
            <select value={selTemp} onChange={e => setSelTemp(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border-2 border-blue-200 bg-blue-50 text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500">
              <option value="">— Select Temperature Range —</option>
              {TEMP_RANGES.map(r => <option key={r.label} value={r.label}>{r.label}</option>)}
            </select>
            {selTemp && (
              <div className="mt-2 text-xs text-blue-600 font-medium">
                Min: <strong>{TEMP_RANGES.find(r=>r.label===selTemp)?.min}°C</strong> &nbsp;|&nbsp;
                Max: <strong>{TEMP_RANGES.find(r=>r.label===selTemp)?.max}°C</strong>
              </div>
            )}
          </div>

          {/* Humidity */}
          <div className="bg-white rounded-xl border-2 border-cyan-200 p-4">
            <label className="block text-xs font-bold text-cyan-700 mb-2">💧 Humidity Range</label>
            <select value={selHumid} onChange={e => setSelHumid(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border-2 border-cyan-200 bg-cyan-50 text-sm font-semibold text-slate-800 focus:outline-none focus:border-cyan-500">
              <option value="">— Select Humidity Range —</option>
              {HUMIDITY_RANGES.map(r => <option key={r.label} value={r.label}>{r.label}</option>)}
            </select>
            {selHumid && (
              <div className="mt-2 text-xs text-cyan-600 font-medium">
                Min: <strong>{HUMIDITY_RANGES.find(r=>r.label===selHumid)?.min}%</strong> &nbsp;|&nbsp;
                Max: <strong>{HUMIDITY_RANGES.find(r=>r.label===selHumid)?.max}%</strong>
              </div>
            )}
          </div>

          {/* Wind */}
          <div className="bg-white rounded-xl border-2 border-yellow-200 p-4">
            <label className="block text-xs font-bold text-yellow-700 mb-2">💨 Air Flow (Wind Speed)</label>
            <select value={selWind} onChange={e => setSelWind(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border-2 border-yellow-200 bg-yellow-50 text-sm font-semibold text-slate-800 focus:outline-none focus:border-yellow-500">
              <option value="">— Select Wind Range —</option>
              {WIND_RANGES.map(r => <option key={r.label} value={r.label}>{r.label}</option>)}
            </select>
            {selWind && (
              <div className="mt-2 text-xs text-yellow-600 font-medium">
                Min: <strong>{WIND_RANGES.find(r=>r.label===selWind)?.min} km/h</strong> &nbsp;|&nbsp;
                Max: <strong>{WIND_RANGES.find(r=>r.label===selWind)?.max} km/h</strong>
              </div>
            )}
          </div>

          {/* Sky / Cloud */}
          <div className="bg-white rounded-xl border-2 border-purple-200 p-4">
            <label className="block text-xs font-bold text-purple-700 mb-2">☁️ Sky / Cloud Condition</label>
            <select value={selSky} onChange={e => setSelSky(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border-2 border-purple-200 bg-purple-50 text-sm font-semibold text-slate-800 focus:outline-none focus:border-purple-500">
              <option value="">— Select Sky Condition —</option>
              {SKY_CONDITIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* AQI */}
          <div className="bg-white rounded-xl border-2 border-red-200 p-4 md:col-span-2">
            <label className="block text-xs font-bold text-red-700 mb-2">🌫️ Air Quality (AQI)</label>
            <select value={selAQI} onChange={e => setSelAQI(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border-2 border-red-200 bg-red-50 text-sm font-semibold text-slate-800 focus:outline-none focus:border-red-500">
              <option value="">— Select AQI Range —</option>
              {AQI_RANGES.map(r => <option key={r.label} value={r.label}>{r.label}</option>)}
            </select>
          </div>
        </div>

        {/* Auto-detected Ritu result */}
        {detected && (
          <div className={`mt-5 p-4 rounded-xl text-white flex items-center gap-4 ${RITUS.find(r=>r.key===detected.ritu)?.header || 'bg-gray-600'}`}>
            <span className="text-4xl">{RITUS.find(r=>r.key===detected.ritu)?.icon}</span>
            <div className="flex-1">
              <div className="text-lg font-bold">
                🎯 Auto-Detected: {RITUS.find(r=>r.key===detected.ritu)?.label} — {PHASES.find(p=>p.key===detected.phase)?.label}
              </div>
              <div className="text-sm opacity-80">Match score: {detected.score}/100 — based on your selected parameters</div>
            </div>
            <div className="text-right">
              <button
                onClick={() => { setManualRitu(detected.ritu); setManualPhase(detected.phase); }}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold border border-white/30">
                ✅ Use This Ritu
              </button>
            </div>
          </div>
        )}

        {!detected && (selTemp || selHumid) && (
          <div className="mt-4 p-3 rounded-lg bg-amber-100 border border-amber-300 text-amber-800 text-sm">
            ⚠️ Select more parameters for a better match
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          SECTION 2: RITU + PHASE SELECTOR (dropdown)
      ═══════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6">
        <h2 className="text-xl font-bold text-emerald-800 mb-1">🌿 Select / Confirm Ritu & Phase</h2>
        <p className="text-sm text-emerald-600 mb-5">
          Auto-filled from detection above, or select manually
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Ritu dropdown */}
          <div>
            <label className="block text-sm font-bold text-emerald-800 mb-2">Ritu (Season)</label>
            <select value={manualRitu || detected?.ritu || ''} onChange={e => setManualRitu(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-emerald-300 bg-white text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500">
              <option value="">— Select Ritu —</option>
              {RITUS.map(r => (
                <option key={r.key} value={r.key}>
                  {r.icon} {r.label}
                  {savedPlans.some(p=>p.ritu===r.key) ? ' ✓' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Phase dropdown */}
          <div>
            <label className="block text-sm font-bold text-emerald-800 mb-2">Phase (Level)</label>
            <select value={manualPhase || detected?.phase || ''} onChange={e => setManualPhase(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-emerald-300 bg-white text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500">
              <option value="">— Select Phase —</option>
              {PHASES.map(p => (
                <option key={p.key} value={p.key}>
                  {p.label} — {p.desc}
                  {finalRitu && savedPlans.some(sp=>sp.ritu===finalRitu && sp.phase===p.key) ? ' ✓ Saved' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected badge */}
        {finalRitu && finalPhase && (
          <div className={`mt-4 flex items-center gap-3 px-5 py-3 rounded-xl text-white ${selectedRituMeta?.header || 'bg-gray-600'}`}>
            <span className="text-3xl">{selectedRituMeta?.icon}</span>
            <div>
              <div className="font-bold text-lg">{selectedRituMeta?.label} — {selectedPhaseMeta?.label}</div>
              <div className="text-sm opacity-80">
                {isAlreadySaved ? '✅ Plan already saved — you are editing it' : '📝 New plan — fill the diet details below'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          SECTION 3: DIET PLAN FORM
      ═══════════════════════════════════════════════════════ */}
      {!finalRitu || !finalPhase ? (
        <div className="text-center py-14 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50">
          <div className="text-5xl mb-3">☝️</div>
          <p className="text-gray-600 font-semibold text-lg">Select weather parameters or choose Ritu + Phase above</p>
          <p className="text-gray-400 text-sm mt-1">Then fill the 7 meal slots + herbs + lifestyle + avoid foods</p>
        </div>
      ) : loadingPlan ? (
        <div className="flex items-center justify-center py-14 text-emerald-600">
          <Loader className="animate-spin mr-2" size={24}/> <span className="font-semibold">Loading plan…</span>
        </div>
      ) : dietPlan ? (
        <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-6 space-y-4">
          <h2 className="text-xl font-bold text-emerald-800 mb-2">
            🍽️ Diet Plan — {selectedRituMeta?.icon} {selectedRituMeta?.label} / {selectedPhaseMeta?.label}
          </h2>

          {/* 7 Meal Slots */}
          <div>
            <h3 className="text-base font-bold text-gray-800 mb-3">⏰ 7 Daily Meal Slots</h3>
            <div className="space-y-2">
              {MEAL_SLOTS.map(slot => {
                const mealData = dietPlan.meals.find(m=>m.slotKey===slot.key) || { foods:[], tip:'' };
                const isOpen   = openSlot === slot.key;
                return (
                  <div key={slot.key} className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
                    <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50"
                      onClick={() => setOpenSlot(isOpen ? null : slot.key)}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{slot.emoji}</span>
                        <div className="text-left">
                          <div className="font-bold text-gray-900 text-sm">{slot.label}</div>
                          <div className="text-xs text-gray-500">🕐 {slot.time}</div>
                        </div>
                        {mealData.foods.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                            {mealData.foods.length} foods
                          </span>
                        )}
                      </div>
                      {isOpen ? <ChevronUp size={18} className="text-gray-400"/> : <ChevronDown size={18} className="text-gray-400"/>}
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 pt-3 border-t border-gray-100 space-y-3">
                        {/* Foods */}
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-2">🌿 Foods / Items</label>
                          {mealData.foods.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {mealData.foods.map((f, fi) => (
                                <div key={fi} className="flex items-center gap-1 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs text-emerald-800 font-medium">
                                  🌿 {f}
                                  <button onClick={() => removeFood(slot.key, fi)} className="text-red-400 hover:text-red-600 ml-1"><X size={12}/></button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <input type="text" value={newFood[slot.key]||''}
                              onChange={e => setNewFood(n=>({...n,[slot.key]:e.target.value}))}
                              onKeyDown={e => e.key==='Enter' && addFood(slot.key)}
                              placeholder={slot.placeholder}
                              className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400"/>
                            <button onClick={() => addFood(slot.key)}
                              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 flex items-center gap-1">
                              <Plus size={14}/> Add
                            </button>
                          </div>
                        </div>
                        {/* Tip */}
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">💡 Ayurvedic Tip</label>
                          <textarea value={mealData.tip||''}
                            onChange={e => updateMeal(slot.key,'tip',e.target.value)}
                            placeholder="e.g. Drink warm, never cold. Best time for strongest Agni."
                            rows={2}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-amber-400 resize-none"/>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Herbs */}
          <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
            <h3 className="font-bold text-gray-800 mb-3">🌱 Herbs & Supplements</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {dietPlan.herbs.map((h,i) => (
                <div key={i} className="flex items-center gap-1 px-3 py-1 bg-green-50 border border-green-200 rounded-full text-xs text-green-800 font-medium">
                  🌿 {h} <button onClick={() => removeItem('herbs',i)} className="text-red-400 hover:text-red-600 ml-1"><X size={12}/></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newHerb} onChange={e => setNewHerb(e.target.value)}
                onKeyDown={e => { if(e.key==='Enter'){ addItem('herbs',newHerb,()=>setNewHerb(''));} }}
                placeholder="e.g. Ashwagandha, Triphala, Brahmi…"
                className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-400"/>
              <button onClick={() => addItem('herbs',newHerb,()=>setNewHerb(''))}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 flex items-center gap-1">
                <Plus size={14}/> Add
              </button>
            </div>
          </div>

          {/* Lifestyle Tips */}
          <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
            <h3 className="font-bold text-gray-800 mb-3">🧘 Lifestyle Tips</h3>
            <div className="space-y-1 mb-3">
              {dietPlan.lifestyleTips.map((t,i) => (
                <div key={i} className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800">
                  <span className="mt-0.5 shrink-0">✦</span> <span className="flex-1">{t}</span>
                  <button onClick={() => removeItem('lifestyleTips',i)} className="text-red-400 shrink-0"><X size={12}/></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newLifestyle} onChange={e => setNewLifestyle(e.target.value)}
                onKeyDown={e => { if(e.key==='Enter'){ addItem('lifestyleTips',newLifestyle,()=>setNewLifestyle(''));} }}
                placeholder="e.g. Oil massage daily, Sleep before 10 PM, Surya Namaskar…"
                className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"/>
              <button onClick={() => addItem('lifestyleTips',newLifestyle,()=>setNewLifestyle(''))}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-1">
                <Plus size={14}/> Add
              </button>
            </div>
          </div>

          {/* Avoid Foods */}
          <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
            <h3 className="font-bold text-gray-800 mb-3">🚫 Avoid Foods / Things</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {dietPlan.avoidFoods.map((f,i) => (
                <div key={i} className="flex items-center gap-1 px-3 py-1 bg-red-50 border border-red-200 rounded-full text-xs text-red-800 font-medium">
                  ✗ {f} <button onClick={() => removeItem('avoidFoods',i)} className="text-red-500 hover:text-red-700 ml-1"><X size={12}/></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newAvoid} onChange={e => setNewAvoid(e.target.value)}
                onKeyDown={e => { if(e.key==='Enter'){ addItem('avoidFoods',newAvoid,()=>setNewAvoid(''));} }}
                placeholder="e.g. Cold drinks, Fried food, Heavy dinner…"
                className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400"/>
              <button onClick={() => addItem('avoidFoods',newAvoid,()=>setNewAvoid(''))}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 flex items-center gap-1">
                <Plus size={14}/> Add
              </button>
            </div>
          </div>

          {/* Special Notes */}
          <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
            <h3 className="font-bold text-gray-800 mb-2">📝 Special Notes</h3>
            <textarea value={dietPlan.specialNotes||''} onChange={e => setDietPlan(p => p ? {...p,specialNotes:e.target.value} : p)}
              placeholder="Any special Ayurvedic notes for this Ritu-Phase…" rows={3}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-amber-400 resize-none"/>
          </div>

          {/* Save button */}
          <button onClick={saveDietPlan} disabled={savingPlan}
            className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-lg font-bold flex items-center justify-center gap-3 shadow-lg transition-colors">
            {savingPlan ? <><Loader className="animate-spin" size={22}/> Saving…</> :
             planSaved  ? <><CheckCircle size={22}/> ✅ Saved to MongoDB!</> :
             <><Save size={22}/> Save Diet Plan to MongoDB</>}
          </button>
        </div>
      ) : null}

      {/* Progress tracker */}
      <div className="p-5 bg-white rounded-2xl border-2 border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-gray-700">📊 Diet Plans Progress</span>
          <span className="text-sm font-bold text-emerald-700">{savedPlans.length} / 18 saved</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{width:`${(savedPlans.length/18)*100}%`}}/>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {RITUS.map(r => (
            <div key={r.key} className="text-center">
              <div className="text-xl">{r.icon}</div>
              <div className="text-[10px] text-gray-500 mb-1">{r.key}</div>
              <div className="flex justify-center gap-1">
                {PHASES.map(p => (
                  <div key={p.key} title={`${r.label} ${p.label}`}
                    className={`w-4 h-4 rounded-full border-2 ${
                      savedPlans.some(sp=>sp.ritu===r.key&&sp.phase===p.key)
                        ? 'bg-emerald-500 border-emerald-600' : 'bg-gray-100 border-gray-300'
                    }`}/>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-2 text-center">3 dots per Ritu = Begin · Peak · Last</p>
      </div>

    </div>
  );
}
