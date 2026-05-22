'use client';

/**
 * Ritucharya Admin Manage Page
 *
 * TAB 1 — Logic Table: Admin sets weather ranges for each Ritu+Phase → saves to MongoDB
 * TAB 2 — Diet Plans:  Admin fills 7 meal slots for each Ritu+Phase → saves to MongoDB
 *
 * Flow:
 *   Admin defines logic → User enters weather → system matches → loads diet plan
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Save, Loader, ArrowLeft, Plus, X, ChevronDown, ChevronUp, CheckCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

// ─── Static Data ──────────────────────────────────────────────────────────────

const RITUS = [
  { key: 'shishir', label: 'शीत — SHISHIRA',    icon: '❄️', color: 'bg-blue-600'   },
  { key: 'vasant',  label: 'वसंत — VASANT',      icon: '🌸', color: 'bg-green-600'  },
  { key: 'grishma', label: 'ग्रीष्म — GRISHMA',  icon: '☀️', color: 'bg-orange-500' },
  { key: 'varsha',  label: 'वर्षा — VARSHA',      icon: '🌧️', color: 'bg-indigo-600' },
  { key: 'sharad',  label: 'शरद — SHARAD',        icon: '🍂', color: 'bg-amber-500'  },
  { key: 'hemant',  label: 'हेमंत — HEMANT',      icon: '🥶', color: 'bg-purple-600' },
];

const PHASES = [
  { key: 'begin', label: 'BEGIN',  hi: 'प्रारंभ', desc: 'Starting phase' },
  { key: 'peak',  label: 'PEAK',   hi: 'शिखर',    desc: 'Peak / strongest' },
  { key: 'last',  label: 'LAST',   hi: 'अंत',     desc: 'Ending / transition' },
];

// All 18 Ritu-Phase rows with default values from classical Ayurvedic chart
const DEFAULT_LOGIC_ROWS = [
  { ritu:'shishir', phase:'begin', tempMin:-20, tempMax:-10, humidMin:20, humidMax:25,  windMin:15, windMax:25, skyConditions:['Clear'],             aqiMin:0, aqiMax:150, ayana:'uttarayan', characterEn:'Deep cold begins, Kapha+Vata rising',        characterHi:'गहन ठंड शुरू, कफ+वात बढ़ रहा'  },
  { ritu:'shishir', phase:'peak',  tempMin:-10, tempMax:0,   humidMin:15, humidMax:20,  windMin:15, windMax:20, skyConditions:['Clear'],             aqiMin:0, aqiMax:150, ayana:'uttarayan', characterEn:'Peak cold, digestion intense',               characterHi:'सर्वाधिक ठंड, पाचन तीव्र'      },
  { ritu:'shishir', phase:'last',  tempMin:0,   tempMax:10,  humidMin:20, humidMax:30,  windMin:15, windMax:25, skyConditions:['Partly Cloudy'],     aqiMin:0, aqiMax:150, ayana:'uttarayan', characterEn:'Cold reducing, warmth beginning',            characterHi:'ठंड घट रही, गर्मी शुरू'          },
  { ritu:'vasant',  phase:'begin', tempMin:10,  tempMax:20,  humidMin:30, humidMax:40,  windMin:15, windMax:25, skyConditions:['Partly Cloudy'],     aqiMin:0, aqiMax:150, ayana:'uttarayan', characterEn:'Spring begins, Kapha excited',               characterHi:'वसंत शुरू, कफ उत्तेजना'         },
  { ritu:'vasant',  phase:'peak',  tempMin:20,  tempMax:30,  humidMin:35, humidMax:50,  windMin:15, windMax:30, skyConditions:['Cloudy'],            aqiMin:0, aqiMax:150, ayana:'uttarayan', characterEn:'Kapha peak, allergies high',                characterHi:'कफ शिखर, एलर्जी अधिक'          },
  { ritu:'vasant',  phase:'last',  tempMin:25,  tempMax:35,  humidMin:40, humidMax:55,  windMin:20, windMax:35, skyConditions:['Partly Cloudy'],     aqiMin:0, aqiMax:150, ayana:'uttarayan', characterEn:'Spring ending, Pitta beginning',             characterHi:'वसंत अंत, पित्त शुरू'           },
  { ritu:'grishma', phase:'begin', tempMin:30,  tempMax:40,  humidMin:40, humidMax:55,  windMin:25, windMax:40, skyConditions:['Clear','Hazy'],      aqiMin:0, aqiMax:200, ayana:'uttarayan', characterEn:'Intense heat begins, dry',                  characterHi:'तीव्र गर्मी शुरू (सूख)'         },
  { ritu:'grishma', phase:'peak',  tempMin:35,  tempMax:45,  humidMin:45, humidMax:65,  windMin:30, windMax:45, skyConditions:['Hazy'],             aqiMin:0, aqiMax:200, ayana:'uttarayan', characterEn:'Extreme heat + humidity rising',             characterHi:'अति गर्मी + आर्द्रता बढ़'       },
  { ritu:'grishma', phase:'last',  tempMin:32,  tempMax:42,  humidMin:55, humidMax:70,  windMin:35, windMax:50, skyConditions:['Mostly Cloudy'],     aqiMin:0, aqiMax:200, ayana:'uttarayan', characterEn:'Summer ending, monsoon approaching',        characterHi:'ग्रीष्म अंत, वर्षा आने वाली'   },
  { ritu:'varsha',  phase:'begin', tempMin:28,  tempMax:35,  humidMin:65, humidMax:75,  windMin:40, windMax:50, skyConditions:['Heavy Rain','Overcast'], aqiMin:0, aqiMax:150, ayana:'dakshinayan', characterEn:'Monsoon starts, Vata excited',     characterHi:'वर्षा शुरू, वात उत्तेजना'       },
  { ritu:'varsha',  phase:'peak',  tempMin:24,  tempMax:28,  humidMin:70, humidMax:85,  windMin:45, windMax:60, skyConditions:['Heavy Rain','Thunderstorm'], aqiMin:0, aqiMax:150, ayana:'dakshinayan', characterEn:'Peak monsoon, Vata very high', characterHi:'वर्षा शिखर, वात अधिक'          },
  { ritu:'varsha',  phase:'last',  tempMin:20,  tempMax:24,  humidMin:60, humidMax:75,  windMin:35, windMax:45, skyConditions:['Rainy','Overcast'],  aqiMin:0, aqiMax:150, ayana:'dakshinayan', characterEn:'Monsoon ending, Sharad approaching',        characterHi:'वर्षा अंत, शरद शुरू'           },
  { ritu:'sharad',  phase:'begin', tempMin:20,  tempMax:26,  humidMin:55, humidMax:65,  windMin:25, windMax:35, skyConditions:['Partly Cloudy'],     aqiMin:0, aqiMax:150, ayana:'dakshinayan', characterEn:'Sharad begins, sky clearing',               characterHi:'शरद शुरू, साफ आसमान'           },
  { ritu:'sharad',  phase:'peak',  tempMin:26,  tempMax:32,  humidMin:45, humidMax:55,  windMin:15, windMax:30, skyConditions:['Clear'],             aqiMin:0, aqiMax:100, ayana:'dakshinayan', characterEn:'Sharad peak — BEST HEALTH',                characterHi:'शरद शिखर — BEST HEALTH'         },
  { ritu:'sharad',  phase:'last',  tempMin:24,  tempMax:30,  humidMin:40, humidMax:50,  windMin:15, windMax:25, skyConditions:['Clear'],             aqiMin:0, aqiMax:100, ayana:'dakshinayan', characterEn:'Sharad ending, cold approaching',           characterHi:'शरद अंत, ठंड आने वाली'         },
  { ritu:'hemant',  phase:'begin', tempMin:12,  tempMax:24,  humidMin:30, humidMax:40,  windMin:15, windMax:25, skyConditions:['Partly Cloudy'],     aqiMin:0, aqiMax:150, ayana:'dakshinayan', characterEn:'Hemant begins, Kapha building',             characterHi:'हेमंत शुरू, कफ शुरू'           },
  { ritu:'hemant',  phase:'peak',  tempMin:2,   tempMax:12,  humidMin:25, humidMax:35,  windMin:15, windMax:20, skyConditions:['Clear','Foggy'],     aqiMin:0, aqiMax:150, ayana:'dakshinayan', characterEn:'Hemant peak — deep cold',                   characterHi:'हेमंत शिखर — गहन ठंड'          },
  { ritu:'hemant',  phase:'last',  tempMin:-8,  tempMax:2,   humidMin:20, humidMax:30,  windMin:10, windMax:20, skyConditions:['Clear'],             aqiMin:0, aqiMax:150, ayana:'dakshinayan', characterEn:'Hemant ending, Shishira beginning',         characterHi:'हेमंत अंत, शीत शुरू'           },
];

const SKY_OPTIONS = ['Clear','Partly Cloudy','Cloudy','Mostly Cloudy','Overcast','Hazy','Foggy','Light Rain','Rainy','Heavy Rain','Thunderstorm','Snowy'];
const AYANA_OPTIONS = ['uttarayan','dakshinayan'];

// ─── Meal Slots ───────────────────────────────────────────────────────────────

const MEAL_SLOTS = [
  { key:'gond_pani',    time:'4:00 AM',  label:'Gond Pani',            emoji:'🌙', placeholder:'e.g. Gond Pani, Warm lemon water'         },
  { key:'herbal_drink', time:'6:00 AM',  label:'Herbal Drink',         emoji:'🌿', placeholder:'e.g. Tulsi tea, Ginger water'              },
  { key:'breakfast',    time:'8:30 AM',  label:'Breakfast (Nasta)',    emoji:'🥣', placeholder:'e.g. Khichdi, Oatmeal with ghee'           },
  { key:'lunch',        time:'11:30 AM', label:'Lunch (Bhojan)',       emoji:'🍱', placeholder:'e.g. Dal rice, Seasonal sabzi'             },
  { key:'snacks',       time:'5:00 PM',  label:'Snacks (Nashta)',      emoji:'🍎', placeholder:'e.g. Seasonal fruits, Roasted chana'       },
  { key:'dinner',       time:'7:30 PM',  label:'Dinner (Ratri Bhojan)',emoji:'🍽️', placeholder:'e.g. Light soup, Khichdi'                 },
  { key:'sleep_drink',  time:'9:30 PM',  label:'Sleep Drink',          emoji:'🥛', placeholder:'e.g. Warm turmeric milk, Ashwagandha milk' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type LogicRow = typeof DEFAULT_LOGIC_ROWS[0];
interface MealSlot { slotKey:string; time:string; label:string; emoji:string; foods:string[]; tip:string; }
interface DietPlan  { ritu:string; phase:string; meals:MealSlot[]; herbs:string[]; lifestyleTips:string[]; avoidFoods:string[]; specialNotes:string; }

function emptyPlan(ritu:string, phase:string): DietPlan {
  return { ritu, phase, meals: MEAL_SLOTS.map(s => ({ slotKey:s.key, time:s.time, label:s.label, emoji:s.emoji, foods:[], tip:'' })), herbs:[], lifestyleTips:[], avoidFoods:[], specialNotes:'' };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ManageFormPage() {
  const [activeTab, setActiveTab] = useState<'logic'|'diet'>('logic');

  // ── LOGIC TABLE STATE ──────────────────────────────────────────────────
  const [logicRows,     setLogicRows]     = useState<LogicRow[]>(DEFAULT_LOGIC_ROWS);
  const [expandedRow,   setExpandedRow]   = useState<string|null>(null);
  const [savingLogic,   setSavingLogic]   = useState(false);
  const [logicSaved,    setLogicSaved]    = useState(false);
  const [loadingLogic,  setLoadingLogic]  = useState(true);

  // ── DIET PLAN STATE ────────────────────────────────────────────────────
  const [selRitu,       setSelRitu]       = useState('');
  const [selPhase,      setSelPhase]      = useState('');
  const [dietPlan,      setDietPlan]      = useState<DietPlan|null>(null);
  const [loadingPlan,   setLoadingPlan]   = useState(false);
  const [savingPlan,    setSavingPlan]    = useState(false);
  const [planSaved,     setPlanSaved]     = useState(false);
  const [savedPlans,    setSavedPlans]    = useState<{ritu:string;phase:string}[]>([]);
  const [openSlot,      setOpenSlot]      = useState<string|null>('gond_pani');
  const [newFood,       setNewFood]       = useState<Record<string,string>>({});
  const [newHerb,       setNewHerb]       = useState('');
  const [newLifestyle,  setNewLifestyle]  = useState('');
  const [newAvoid,      setNewAvoid]      = useState('');

  // ── On mount: load logic + diet plans ────────────────────────────────
  useEffect(() => {
    fetchLogic();
    fetchAllSavedPlans();
  }, []);

  const fetchLogic = async () => {
    setLoadingLogic(true);
    try {
      const res  = await fetch('/api/admin/crm/ritucharya-logic');
      const data = await res.json();
      if (data.success && data.rows?.length > 0) {
        // Merge saved rows with defaults (in case some are missing)
        const merged = DEFAULT_LOGIC_ROWS.map(def => {
          const saved = data.rows.find((r:LogicRow) => r.ritu===def.ritu && r.phase===def.phase);
          return saved ? { ...def, ...saved } : def;
        });
        setLogicRows(merged);
      }
    } catch {}
    finally { setLoadingLogic(false); }
  };

  const fetchAllSavedPlans = async () => {
    try {
      const res  = await fetch('/api/admin/crm/ritucharya-diet');
      const data = await res.json();
      if (data.success) setSavedPlans(data.plans.map((p:any) => ({ ritu:p.ritu, phase:p.phase })));
    } catch {}
  };

  // ── Save entire logic table ────────────────────────────────────────────
  const saveAllLogic = async () => {
    setSavingLogic(true);
    try {
      const res  = await fetch('/api/admin/crm/ritucharya-logic', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ rows: logicRows }) });
      const data = await res.json();
      if (data.success) { setLogicSaved(true); setTimeout(() => setLogicSaved(false), 3000); }
    } finally { setSavingLogic(false); }
  };

  // ── Update one field in a logic row ──────────────────────────────────
  const updateRow = (ritu:string, phase:string, field:string, value:any) => {
    setLogicRows(rows => rows.map(r => r.ritu===ritu && r.phase===phase ? { ...r, [field]:value } : r));
  };

  const toggleSky = (ritu:string, phase:string, sky:string) => {
    setLogicRows(rows => rows.map(r => {
      if (r.ritu!==ritu || r.phase!==phase) return r;
      const has = r.skyConditions.includes(sky);
      return { ...r, skyConditions: has ? r.skyConditions.filter(s=>s!==sky) : [...r.skyConditions, sky] };
    }));
  };

  // ── Diet plan helpers ─────────────────────────────────────────────────
  const loadDietPlan = useCallback(async (ritu:string, phase:string) => {
    if (!ritu || !phase) { setDietPlan(null); return; }
    setLoadingPlan(true); setPlanSaved(false);
    try {
      const res  = await fetch(`/api/admin/crm/ritucharya-diet?ritu=${ritu}&phase=${phase}`);
      const data = await res.json();
      if (data.success && data.plan) {
        const saved: MealSlot[] = data.plan.meals || [];
        const merged = MEAL_SLOTS.map(s => saved.find(m=>m.slotKey===s.key) || { slotKey:s.key, time:s.time, label:s.label, emoji:s.emoji, foods:[], tip:'' });
        setDietPlan({ ...data.plan, meals:merged });
      } else { setDietPlan(emptyPlan(ritu, phase)); }
    } catch { setDietPlan(emptyPlan(ritu, phase)); }
    finally  { setLoadingPlan(false); }
  }, []);

  useEffect(() => { loadDietPlan(selRitu, selPhase); }, [selRitu, selPhase, loadDietPlan]);

  const saveDietPlan = async () => {
    if (!dietPlan) return;
    setSavingPlan(true);
    try {
      const res  = await fetch('/api/admin/crm/ritucharya-diet', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(dietPlan) });
      const data = await res.json();
      if (data.success) { setPlanSaved(true); setTimeout(()=>setPlanSaved(false), 3000); fetchAllSavedPlans(); }
    } finally { setSavingPlan(false); }
  };

  const updateMeal = (slotKey:string, field:'foods'|'tip', value:any) =>
    setDietPlan(p => p ? { ...p, meals: p.meals.map(m => m.slotKey===slotKey ? {...m,[field]:value} : m) } : p);
  const addFood = (slotKey:string) => {
    const val = (newFood[slotKey]||'').trim(); if(!val) return;
    setDietPlan(p => p ? { ...p, meals: p.meals.map(m => m.slotKey===slotKey ? {...m,foods:[...m.foods,val]} : m) } : p);
    setNewFood(n=>({...n,[slotKey]:''}));
  };
  const removeFood = (slotKey:string, idx:number) =>
    setDietPlan(p => p ? { ...p, meals: p.meals.map(m => m.slotKey===slotKey ? {...m,foods:m.foods.filter((_,i)=>i!==idx)} : m) } : p);
  const addItem = (field:'herbs'|'lifestyleTips'|'avoidFoods', val:string, reset:()=>void) => {
    const v = val.trim(); if(!v) return;
    setDietPlan(p => p ? {...p,[field]:[...p[field],v]} : p); reset();
  };
  const removeItem = (field:'herbs'|'lifestyleTips'|'avoidFoods', idx:number) =>
    setDietPlan(p => p ? {...p,[field]:p[field].filter((_,i)=>i!==idx)} : p);

  const selectedRituMeta  = RITUS.find(r=>r.key===selRitu);
  const selectedPhaseMeta = PHASES.find(p=>p.key===selPhase);

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 p-5 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">⚙️ Ritucharya Admin Manager</h1>
          <p className="text-slate-500 text-sm">Define weather logic + add diet plans for all 18 Ritu-Phases</p>
        </div>
        <Link href="/admin/crm/planner/ritucharya"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 font-semibold text-sm">
          <ArrowLeft size={16}/> Back
        </Link>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button onClick={() => setActiveTab('logic')}
          className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab==='logic' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
          📊 Weather → Ritu Logic
        </button>
        <button onClick={() => setActiveTab('diet')}
          className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab==='diet' ? 'bg-white shadow text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}>
          🍽️ Diet Plans
          <span className="ml-2 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">{savedPlans.length}/18</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TAB 1 — LOGIC TABLE
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'logic' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">📊 Weather → Ritu Detection Logic</h2>
              <p className="text-sm text-gray-500">Set exact temp / humidity / wind / sky ranges for each Ritu + Phase. System uses this to auto-detect Ritu from user&apos;s weather.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={fetchLogic} className="px-3 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm flex items-center gap-1">
                <RefreshCw size={14}/> Reload
              </button>
              <button onClick={saveAllLogic} disabled={savingLogic}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center gap-2 disabled:opacity-60">
                {savingLogic ? <><Loader className="animate-spin" size={16}/> Saving…</> :
                 logicSaved  ? <><CheckCircle size={16}/> Saved!</> :
                 <><Save size={16}/> Save All Logic</>}
              </button>
            </div>
          </div>

          {loadingLogic ? (
            <div className="flex items-center justify-center py-16 text-blue-600">
              <Loader className="animate-spin mr-2" size={24}/> <span className="font-semibold">Loading logic table…</span>
            </div>
          ) : (
            <div className="space-y-2">
              {logicRows.map(row => {
                const rituMeta  = RITUS.find(r=>r.key===row.ritu);
                const phaseMeta = PHASES.find(p=>p.key===row.phase);
                const rowKey    = `${row.ritu}_${row.phase}`;
                const isOpen    = expandedRow === rowKey;
                const dietSaved = savedPlans.some(p=>p.ritu===row.ritu&&p.phase===row.phase);

                return (
                  <div key={rowKey} className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">

                    {/* Row header — click to expand */}
                    <button className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
                      onClick={() => setExpandedRow(isOpen ? null : rowKey)}>

                      {/* Ritu + Phase badge */}
                      <div className={`shrink-0 px-3 py-1.5 rounded-lg text-white text-sm font-bold ${rituMeta?.color}`}>
                        {rituMeta?.icon} {rituMeta?.label}
                      </div>
                      <div className="shrink-0 px-3 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold">
                        {phaseMeta?.label} — {phaseMeta?.hi}
                      </div>

                      {/* Summary */}
                      <div className="flex-1 text-xs text-gray-500 flex flex-wrap gap-3">
                        <span className="font-medium text-blue-700">🌡️ {row.tempMin}° to {row.tempMax}°C</span>
                        <span className="font-medium text-cyan-700">💧 {row.humidMin}%–{row.humidMax}%</span>
                        <span className="font-medium text-yellow-700">💨 {row.windMin}–{row.windMax} km/h</span>
                        <span className="font-medium text-purple-700">☁️ {row.skyConditions.join(', ') || 'Any'}</span>
                      </div>

                      {dietSaved && <span className="shrink-0 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">✅ Diet saved</span>}
                      {isOpen ? <ChevronUp size={18} className="shrink-0 text-gray-400"/> : <ChevronDown size={18} className="shrink-0 text-gray-400"/>}
                    </button>

                    {/* Expanded edit form */}
                    {isOpen && (
                      <div className="px-5 pb-5 pt-4 border-t-2 border-gray-100 space-y-4">

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

                          {/* Temperature */}
                          <div className="col-span-2 md:col-span-1 bg-blue-50 rounded-xl p-4 border border-blue-200">
                            <div className="text-xs font-bold text-blue-700 mb-3">🌡️ Temperature Range (°C)</div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] text-gray-500 mb-1">Min °C</label>
                                <input type="number"
                                  value={row.tempMin}
                                  onChange={e => updateRow(row.ritu, row.phase, 'tempMin', Number(e.target.value))}
                                  className="w-full px-3 py-2 rounded-lg border-2 border-blue-200 bg-white text-lg font-bold text-blue-800 focus:outline-none focus:border-blue-500"/>
                              </div>
                              <div>
                                <label className="block text-[10px] text-gray-500 mb-1">Max °C</label>
                                <input type="number"
                                  value={row.tempMax}
                                  onChange={e => updateRow(row.ritu, row.phase, 'tempMax', Number(e.target.value))}
                                  className="w-full px-3 py-2 rounded-lg border-2 border-blue-200 bg-white text-lg font-bold text-blue-800 focus:outline-none focus:border-blue-500"/>
                              </div>
                            </div>
                          </div>

                          {/* Humidity */}
                          <div className="bg-cyan-50 rounded-xl p-4 border border-cyan-200">
                            <div className="text-xs font-bold text-cyan-700 mb-3">💧 Humidity Range (%)</div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] text-gray-500 mb-1">Min %</label>
                                <input type="number" min={0} max={100}
                                  value={row.humidMin}
                                  onChange={e => updateRow(row.ritu, row.phase, 'humidMin', Number(e.target.value))}
                                  className="w-full px-3 py-2 rounded-lg border-2 border-cyan-200 bg-white text-lg font-bold text-cyan-800 focus:outline-none focus:border-cyan-500"/>
                              </div>
                              <div>
                                <label className="block text-[10px] text-gray-500 mb-1">Max %</label>
                                <input type="number" min={0} max={100}
                                  value={row.humidMax}
                                  onChange={e => updateRow(row.ritu, row.phase, 'humidMax', Number(e.target.value))}
                                  className="w-full px-3 py-2 rounded-lg border-2 border-cyan-200 bg-white text-lg font-bold text-cyan-800 focus:outline-none focus:border-cyan-500"/>
                              </div>
                            </div>
                          </div>

                          {/* Wind */}
                          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                            <div className="text-xs font-bold text-yellow-700 mb-3">💨 Wind Speed (km/h)</div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] text-gray-500 mb-1">Min km/h</label>
                                <input type="number" min={0}
                                  value={row.windMin}
                                  onChange={e => updateRow(row.ritu, row.phase, 'windMin', Number(e.target.value))}
                                  className="w-full px-3 py-2 rounded-lg border-2 border-yellow-200 bg-white text-lg font-bold text-yellow-800 focus:outline-none focus:border-yellow-500"/>
                              </div>
                              <div>
                                <label className="block text-[10px] text-gray-500 mb-1">Max km/h</label>
                                <input type="number" min={0}
                                  value={row.windMax}
                                  onChange={e => updateRow(row.ritu, row.phase, 'windMax', Number(e.target.value))}
                                  className="w-full px-3 py-2 rounded-lg border-2 border-yellow-200 bg-white text-lg font-bold text-yellow-800 focus:outline-none focus:border-yellow-500"/>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Sky Conditions — checkbox selection */}
                        <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                          <div className="text-xs font-bold text-purple-700 mb-3">☁️ Sky / Cloud Conditions (select all that match)</div>
                          <div className="flex flex-wrap gap-2">
                            {SKY_OPTIONS.map(sky => (
                              <button key={sky}
                                onClick={() => toggleSky(row.ritu, row.phase, sky)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                                  row.skyConditions.includes(sky)
                                    ? 'bg-purple-600 text-white border-purple-600'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                                }`}>
                                {sky}
                              </button>
                            ))}
                          </div>
                          <div className="mt-2 text-[10px] text-purple-600">
                            Selected: {row.skyConditions.length > 0 ? row.skyConditions.join(' · ') : 'None selected'}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {/* AQI Range */}
                          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                            <div className="text-xs font-bold text-red-700 mb-3">🌫️ AQI Range</div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] text-gray-500 mb-1">Min AQI</label>
                                <input type="number" min={0}
                                  value={row.aqiMin}
                                  onChange={e => updateRow(row.ritu, row.phase, 'aqiMin', Number(e.target.value))}
                                  className="w-full px-3 py-2 rounded-lg border-2 border-red-200 bg-white text-lg font-bold text-red-800 focus:outline-none focus:border-red-500"/>
                              </div>
                              <div>
                                <label className="block text-[10px] text-gray-500 mb-1">Max AQI</label>
                                <input type="number" min={0}
                                  value={row.aqiMax}
                                  onChange={e => updateRow(row.ritu, row.phase, 'aqiMax', Number(e.target.value))}
                                  className="w-full px-3 py-2 rounded-lg border-2 border-red-200 bg-white text-lg font-bold text-red-800 focus:outline-none focus:border-red-500"/>
                              </div>
                            </div>
                          </div>

                          {/* Ayana */}
                          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                            <div className="text-xs font-bold text-gray-700 mb-3">🌞 Ayana (Solar Period)</div>
                            <select value={row.ayana}
                              onChange={e => updateRow(row.ritu, row.phase, 'ayana', e.target.value)}
                              className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-200 bg-white text-sm font-bold text-slate-800 focus:outline-none focus:border-gray-400">
                              <option value="">— Select —</option>
                              {AYANA_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                          </div>
                        </div>

                        {/* Description fields */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">📝 Character (English)</label>
                            <input type="text" value={row.characterEn}
                              onChange={e => updateRow(row.ritu, row.phase, 'characterEn', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 text-sm focus:outline-none focus:border-gray-400"
                              placeholder="e.g. Deep cold begins, Kapha+Vata rising"/>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">📝 Character (Hindi)</label>
                            <input type="text" value={row.characterHi}
                              onChange={e => updateRow(row.ritu, row.phase, 'characterHi', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 text-sm focus:outline-none focus:border-gray-400"
                              placeholder="e.g. गहन ठंड शुरू"/>
                          </div>
                        </div>

                        {/* Quick save for this row */}
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => {
                              setSelRitu(row.ritu); setSelPhase(row.phase);
                              setActiveTab('diet');
                            }}
                            className="px-4 py-2 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-700 text-sm font-bold hover:bg-emerald-100">
                            🍽️ Add Diet Plan for this Ritu →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Save All Logic (bottom) */}
          <button onClick={saveAllLogic} disabled={savingLogic}
            className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold flex items-center justify-center gap-3 shadow disabled:opacity-60">
            {savingLogic ? <><Loader className="animate-spin" size={22}/> Saving All Logic to MongoDB…</> :
             logicSaved  ? <><CheckCircle size={22}/> ✅ All Logic Saved!</> :
             <><Save size={22}/> Save All Weather → Ritu Logic to MongoDB</>}
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 2 — DIET PLANS
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'diet' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">🍽️ Add Diet Plans per Ritu + Phase</h2>
            <p className="text-sm text-gray-500">Select the Ritu and Phase → fill 7 meal slots + herbs + lifestyle → save to MongoDB</p>
          </div>

          {/* Ritu + Phase selector */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Select Ritu</label>
                <select value={selRitu} onChange={e => setSelRitu(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-400">
                  <option value="">— Select Ritu —</option>
                  {RITUS.map(r => (
                    <option key={r.key} value={r.key}>
                      {r.icon} {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Select Phase (Level)</label>
                <select value={selPhase} onChange={e => setSelPhase(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-400">
                  <option value="">— Select Phase —</option>
                  {PHASES.map(p => (
                    <option key={p.key} value={p.key}>
                      {p.label} ({p.hi}) — {p.desc}
                      {selRitu && savedPlans.some(sp=>sp.ritu===selRitu&&sp.phase===p.key) ? ' ✓ Saved' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selRitu && selPhase && (
              <div className={`mt-4 flex items-center gap-3 px-5 py-3 rounded-xl text-white ${selectedRituMeta?.color || 'bg-gray-600'}`}>
                <span className="text-3xl">{selectedRituMeta?.icon}</span>
                <div>
                  <div className="font-bold">{selectedRituMeta?.label} — {selectedPhaseMeta?.label} ({selectedPhaseMeta?.hi})</div>
                  <div className="text-xs opacity-80">
                    {savedPlans.some(p=>p.ritu===selRitu&&p.phase===selPhase)
                      ? '✅ Already saved — you are editing existing plan'
                      : '📝 New plan — fill the diet details below'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Diet form */}
          {!selRitu || !selPhase ? (
            <div className="text-center py-14 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50">
              <div className="text-5xl mb-3">☝️</div>
              <p className="text-gray-600 font-semibold">Select Ritu + Phase above to start filling the diet plan</p>
              <p className="text-gray-400 text-sm mt-1">Fill all 18 combinations (6 Ritus × 3 phases) for complete coverage</p>
            </div>
          ) : loadingPlan ? (
            <div className="flex items-center justify-center py-12 text-emerald-600">
              <Loader className="animate-spin mr-2" size={24}/> Loading plan…
            </div>
          ) : dietPlan ? (
            <div className="space-y-3">

              {/* 7 Meal Slots */}
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-5">
                <h3 className="font-bold text-gray-800 mb-3">⏰ 7 Daily Meal Slots</h3>
                <div className="space-y-2">
                  {MEAL_SLOTS.map(slot => {
                    const mealData = dietPlan.meals.find(m=>m.slotKey===slot.key) || { foods:[], tip:'' };
                    const isOpen   = openSlot === slot.key;
                    return (
                      <div key={slot.key} className="rounded-xl border-2 border-gray-100 overflow-hidden bg-gray-50">
                        <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100"
                          onClick={() => setOpenSlot(isOpen ? null : slot.key)}>
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{slot.emoji}</span>
                            <div className="text-left">
                              <div className="font-bold text-gray-900 text-sm">{slot.label}</div>
                              <div className="text-xs text-gray-500">🕐 {slot.time}</div>
                            </div>
                            {mealData.foods.length > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">{mealData.foods.length} foods</span>
                            )}
                          </div>
                          {isOpen ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 pt-3 bg-white border-t border-gray-100 space-y-3">
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-2">🌿 Foods / Items</label>
                              {mealData.foods.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                  {mealData.foods.map((f,fi) => (
                                    <div key={fi} className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs text-emerald-800">
                                      🌿 {f}
                                      <button onClick={()=>removeFood(slot.key,fi)} className="text-red-400 hover:text-red-600 ml-0.5"><X size={11}/></button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="flex gap-2">
                                <input type="text" value={newFood[slot.key]||''}
                                  onChange={e=>setNewFood(n=>({...n,[slot.key]:e.target.value}))}
                                  onKeyDown={e=>e.key==='Enter'&&addFood(slot.key)}
                                  placeholder={slot.placeholder}
                                  className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400"/>
                                <button onClick={()=>addFood(slot.key)}
                                  className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 flex items-center gap-1">
                                  <Plus size={13}/> Add
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1">💡 Ayurvedic Tip</label>
                              <textarea value={mealData.tip||''} onChange={e=>updateMeal(slot.key,'tip',e.target.value)}
                                placeholder="e.g. Drink warm, never cold…" rows={2}
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-amber-400 resize-none"/>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Herbs, Lifestyle, Avoid, Notes in a grid */}
              <div className="grid md:grid-cols-2 gap-3">
                {/* Herbs */}
                <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                  <h3 className="font-bold text-gray-800 mb-2 text-sm">🌱 Herbs & Supplements</h3>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {dietPlan.herbs.map((h,i)=>(
                      <div key={i} className="flex items-center gap-1 px-2.5 py-1 bg-green-50 border border-green-200 rounded-full text-xs text-green-800">
                        🌿 {h} <button onClick={()=>removeItem('herbs',i)}><X size={11} className="text-red-400 hover:text-red-600 ml-0.5"/></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={newHerb} onChange={e=>setNewHerb(e.target.value)}
                      onKeyDown={e=>{if(e.key==='Enter'){addItem('herbs',newHerb,()=>setNewHerb(''));}}}
                      placeholder="e.g. Ashwagandha, Triphala…"
                      className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-xs focus:outline-none focus:border-green-400"/>
                    <button onClick={()=>addItem('herbs',newHerb,()=>setNewHerb(''))}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700"><Plus size={13}/></button>
                  </div>
                </div>

                {/* Avoid Foods */}
                <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                  <h3 className="font-bold text-gray-800 mb-2 text-sm">🚫 Avoid Foods / Things</h3>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {dietPlan.avoidFoods.map((f,i)=>(
                      <div key={i} className="flex items-center gap-1 px-2.5 py-1 bg-red-50 border border-red-200 rounded-full text-xs text-red-800">
                        ✗ {f} <button onClick={()=>removeItem('avoidFoods',i)}><X size={11} className="text-red-500 hover:text-red-700 ml-0.5"/></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={newAvoid} onChange={e=>setNewAvoid(e.target.value)}
                      onKeyDown={e=>{if(e.key==='Enter'){addItem('avoidFoods',newAvoid,()=>setNewAvoid(''));}}}
                      placeholder="e.g. Cold drinks, Fried food…"
                      className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-xs focus:outline-none focus:border-red-400"/>
                    <button onClick={()=>addItem('avoidFoods',newAvoid,()=>setNewAvoid(''))}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700"><Plus size={13}/></button>
                  </div>
                </div>

                {/* Lifestyle Tips */}
                <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                  <h3 className="font-bold text-gray-800 mb-2 text-sm">🧘 Lifestyle Tips</h3>
                  <div className="space-y-1 mb-2">
                    {dietPlan.lifestyleTips.map((t,i)=>(
                      <div key={i} className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs text-blue-800">
                        <span className="shrink-0 mt-0.5">✦</span> <span className="flex-1">{t}</span>
                        <button onClick={()=>removeItem('lifestyleTips',i)}><X size={11} className="text-red-400 hover:text-red-600 shrink-0"/></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={newLifestyle} onChange={e=>setNewLifestyle(e.target.value)}
                      onKeyDown={e=>{if(e.key==='Enter'){addItem('lifestyleTips',newLifestyle,()=>setNewLifestyle(''));}}}
                      placeholder="e.g. Oil massage daily…"
                      className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400"/>
                    <button onClick={()=>addItem('lifestyleTips',newLifestyle,()=>setNewLifestyle(''))}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"><Plus size={13}/></button>
                  </div>
                </div>

                {/* Special Notes */}
                <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                  <h3 className="font-bold text-gray-800 mb-2 text-sm">📝 Special Notes</h3>
                  <textarea value={dietPlan.specialNotes||''} onChange={e=>setDietPlan(p=>p?{...p,specialNotes:e.target.value}:p)}
                    placeholder="Any special Ayurvedic notes for this Ritu-Phase…" rows={4}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-xs focus:outline-none focus:border-amber-400 resize-none"/>
                </div>
              </div>

              {/* Save */}
              <button onClick={saveDietPlan} disabled={savingPlan}
                className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold flex items-center justify-center gap-3 shadow disabled:opacity-60">
                {savingPlan ? <><Loader className="animate-spin" size={22}/> Saving…</> :
                 planSaved  ? <><CheckCircle size={22}/> ✅ Diet Plan Saved!</> :
                 <><Save size={22}/> Save Diet Plan to MongoDB</>}
              </button>
            </div>
          ) : null}

          {/* Progress */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-700">📊 Diet Plans Progress</span>
              <span className="text-sm font-bold text-emerald-700">{savedPlans.length} / 18 saved</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{width:`${(savedPlans.length/18)*100}%`}}/>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {RITUS.map(r => (
                <div key={r.key} className="text-center">
                  <div className="text-xl">{r.icon}</div>
                  <div className="text-[10px] text-gray-400 mb-1">{r.key}</div>
                  <div className="flex justify-center gap-1">
                    {PHASES.map(p => (
                      <button key={p.key} title={`${r.label} ${p.label}`}
                        onClick={() => { setSelRitu(r.key); setSelPhase(p.key); }}
                        className={`w-4 h-4 rounded-full border-2 transition-all hover:scale-125 ${
                          savedPlans.some(sp=>sp.ritu===r.key&&sp.phase===p.key)
                            ? 'bg-emerald-500 border-emerald-600'
                            : 'bg-gray-100 border-gray-300 hover:border-emerald-400'
                        }`}/>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-2 text-center">Click any dot to edit that plan · 3 dots = Begin · Peak · Last</p>
          </div>
        </div>
      )}
    </div>
  );
}
