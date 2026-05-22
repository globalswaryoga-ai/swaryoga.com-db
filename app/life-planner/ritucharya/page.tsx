'use client';

/**
 * Public Ritucharya Page — swaryoga.com/life-planner/ritucharya
 * Step 1 → Location + Weather
 * Step 2 → Detected Ritu (with Uttarayan/Dakshinayan) + Full Diet Plan + Submit
 * Step 3 → Interactive 30-Day Calendar with day-click + ← → navigation
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader, RefreshCw, ChevronDown, ChevronUp, Calendar, ArrowRight, ArrowLeft, List } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { locationData } from '@/lib/locationData';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WeatherState {
  temp:        number;
  tempMin:     number;
  tempMax:     number;
  humidity:    number;
  windSpeed:   number;
  aqi:         number;
  description: string;
}

interface RituResult {
  ritu:        string;
  phase:       string;
  rituLabel:   string;
  phaseLabel:  string;
  icon:        string;
  score:       number;
  ayana:       string;   // 'uttarayan' | 'dakshinayan'
  characterEn: string;
  characterHi: string;
}

interface MealSlot {
  slotKey: string;
  time:    string;
  label:   string;
  emoji:   string;
  foods:   string[];
  tip:     string;
}

interface DietPlan {
  meals:         MealSlot[];
  herbs:         string[];
  lifestyleTips: string[];
  avoidFoods:    string[];
  specialNotes:  string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RITU_META: Record<string, { label:string; icon:string; color:string; bg:string }> = {
  shishir: { label:'शीत (SHISHIRA)',    icon:'❄️', color:'text-blue-700',   bg:'bg-blue-50 border-blue-300'   },
  vasant:  { label:'वसंत (VASANT)',     icon:'🌸', color:'text-green-700',  bg:'bg-green-50 border-green-300' },
  grishma: { label:'ग्रीष्म (GRISHMA)', icon:'☀️', color:'text-orange-700', bg:'bg-orange-50 border-orange-300'},
  varsha:  { label:'वर्षा (VARSHA)',     icon:'🌧️', color:'text-indigo-700', bg:'bg-indigo-50 border-indigo-300'},
  sharad:  { label:'शरद (SHARAD)',      icon:'🍂', color:'text-amber-700',  bg:'bg-amber-50 border-amber-300' },
  hemant:  { label:'हेमंत (HEMANT)',    icon:'🥶', color:'text-purple-700', bg:'bg-purple-50 border-purple-300'},
};

const PHASE_META: Record<string, { label:string; hi:string }> = {
  begin: { label:'BEGIN', hi:'प्रारंभ' },
  peak:  { label:'PEAK',  hi:'शिखर'   },
  last:  { label:'LAST',  hi:'अंत'    },
};

const AYANA_META: Record<string, { label:string; sublabel:string; hi:string; bg:string; color:string; icon:string }> = {
  uttarayan: {
    label:'Uttarayan', sublabel:'Adana Kala', hi:'उत्तरायण',
    bg:'bg-amber-100 border-amber-400', color:'text-amber-800', icon:'🌅'
  },
  dakshinayan: {
    label:'Dakshinayan', sublabel:'Visarga Kala', hi:'दक्षिणायन',
    bg:'bg-indigo-100 border-indigo-400', color:'text-indigo-800', icon:'🌌'
  },
};

const MEAL_SLOTS = [
  { key:'gond_pani',    time:'4:00 AM',  label:'Gond Pani',             emoji:'🌙' },
  { key:'herbal_drink', time:'6:00 AM',  label:'Herbal Drink',          emoji:'🌿' },
  { key:'breakfast',    time:'8:30 AM',  label:'Breakfast',             emoji:'🥣' },
  { key:'lunch',        time:'11:30 AM', label:'Lunch (Bhojan)',        emoji:'🍱' },
  { key:'snacks',       time:'5:00 PM',  label:'Snacks (Nashta)',       emoji:'🍎' },
  { key:'dinner',       time:'7:30 PM',  label:'Dinner (Ratri Bhojan)',emoji:'🍽️' },
  { key:'sleep_drink',  time:'9:30 PM',  label:'Sleep Drink',           emoji:'🥛' },
];

const DAYS_OF_WEEK = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_NAMES  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getClimateType(temp: number): string {
  if (temp < 0)   return 'Extreme Cold';
  if (temp < 10)  return 'Very Cold';
  if (temp < 18)  return 'Cold';
  if (temp < 24)  return 'Mild / Pleasant';
  if (temp < 30)  return 'Warm';
  if (temp < 36)  return 'Hot';
  if (temp < 42)  return 'Very Hot';
  return 'Extreme Hot';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RitucharyaPage() {

  const [step, setStep]           = useState<1|2|3>(1);
  const [country, setCountry]     = useState('');
  const [state,   setState]       = useState('');
  const [city,    setCity]        = useState('');
  const [states,  setStates]      = useState<any[]>([]);
  const [cities,  setCities]      = useState<any[]>([]);

  const [weather, setWeather]     = useState<WeatherState>({
    temp:28, tempMin:22, tempMax:35, humidity:55, windSpeed:12, aqi:60, description:'Partly cloudy',
  });
  const [fetching, setFetching]   = useState(false);
  const [analysing, setAnalysing] = useState(false);

  const [ritu,     setRitu]       = useState<RituResult|null>(null);
  const [dietPlan, setDietPlan]   = useState<DietPlan|null>(null);
  const [openSlot, setOpenSlot]   = useState<string|null>('gond_pani');

  // Step 3 calendar state
  const [calView,    setCalView]   = useState<'calendar'|'list'>('calendar');
  const [selectedDay,setSelectedDay] = useState(1);       // 1-30
  const [calMonth,  setCalMonth]   = useState(0);         // month offset (0 = today's month)

  // ── Location handlers ────────────────────────────────────────────────
  const onCountry = (val: string) => {
    const c = locationData.find(c => c.name === val);
    setCountry(val); setState(''); setCity('');
    setStates(c?.states || []); setCities([]);
  };
  const onState = (val: string) => {
    const c = locationData.find(c => c.name === country);
    const s = c?.states.find(s => s.name === val);
    setState(val); setCity(''); setCities(s?.cities || []);
  };

  useEffect(() => {
    if (city) fetchWeather();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  const fetchWeather = async () => {
    const c       = locationData.find(c => c.name === country);
    const s       = c?.states.find(s => s.name === state);
    const cityObj = s?.cities.find(c => c.name === city);
    if (!cityObj) { setFetching(false); return; }
    setFetching(true);
    try {
      const [wRes, aqiRes] = await Promise.allSettled([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${cityObj.latitude}&longitude=${cityObj.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&temperature_unit=celsius&wind_speed_unit=kmh`),
        fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${cityObj.latitude}&longitude=${cityObj.longitude}&current=us_aqi`),
      ]);
      const w = { ...weather };
      if (wRes.status === 'fulfilled' && wRes.value.ok) {
        const d = await wRes.value.json();
        const code = d.current.weather_code;
        w.temp        = Math.round(d.current.temperature_2m);
        w.humidity    = Math.round(d.current.relative_humidity_2m);
        w.windSpeed   = Math.round(d.current.wind_speed_10m);
        w.tempMin     = d.daily?.temperature_2m_min?.[0] != null ? Math.round(d.daily.temperature_2m_min[0]) : w.temp - 4;
        w.tempMax     = d.daily?.temperature_2m_max?.[0] != null ? Math.round(d.daily.temperature_2m_max[0]) : w.temp + 5;
        w.description = code===0?'Clear sky':code<=3?'Partly cloudy':code<=48?'Foggy':code<=67?'Rainy':code<=77?'Snowy':code<=82?'Heavy rain':'Thunderstorm';
      }
      if (aqiRes.status === 'fulfilled' && aqiRes.value.ok) {
        const a = await aqiRes.value.json();
        if (a?.current?.us_aqi != null) w.aqi = Math.round(a.current.us_aqi);
      }
      setWeather(w);
    } catch { /* silent */ }
    finally { setFetching(false); }
  };

  // ── Run analysis ──────────────────────────────────────────────────────
  const runAnalysis = useCallback(async () => {
    setAnalysing(true);
    try {
      let logicRows: any[] = [];
      try {
        const res  = await fetch('/api/admin/crm/ritucharya-logic');
        const data = await res.json();
        if (data.success && data.rows?.length > 0) logicRows = data.rows;
      } catch { /* fallback */ }

      let bestRitu  = 'grishma';
      let bestPhase = 'peak';
      let bestScore = 0;
      let bestRow: any = null;

      for (const row of logicRows) {
        let score = 0;
        const t = weather.temp;
        if (t >= row.tempMin && t <= row.tempMax) score += 40;
        else { const g = t < row.tempMin ? row.tempMin - t : t - row.tempMax; if (g<=3) score+=28; else if (g<=7) score+=15; else if (g<=12) score+=5; }
        const h = weather.humidity;
        if (h >= row.humidMin && h <= row.humidMax) score += 30;
        else { const g = h < row.humidMin ? row.humidMin - h : h - row.humidMax; if (g<=10) score+=20; else if (g<=20) score+=10; else if (g<=30) score+=3; }
        const ws = weather.windSpeed;
        if (ws >= row.windMin && ws <= row.windMax) score += 15;
        else { const g = ws < row.windMin ? row.windMin - ws : ws - row.windMax; if (g<=5) score+=10; else if (g<=10) score+=5; }
        if (row.skyConditions?.length > 0) {
          const matched = row.skyConditions.some((s:string) => weather.description.toLowerCase().includes(s.toLowerCase().split(' ')[0]));
          score += matched ? 15 : 3;
        } else score += 8;
        if (score > bestScore) { bestScore = score; bestRitu = row.ritu; bestPhase = row.phase; bestRow = row; }
      }

      const rituMeta  = RITU_META[bestRitu]  || RITU_META['grishma'];
      const phaseMeta = PHASE_META[bestPhase] || PHASE_META['peak'];

      setRitu({
        ritu:        bestRitu,
        phase:       bestPhase,
        rituLabel:   rituMeta.label,
        phaseLabel:  `${phaseMeta.label} — ${phaseMeta.hi}`,
        icon:        rituMeta.icon,
        score:       bestScore,
        ayana:       bestRow?.ayana || '',
        characterEn: bestRow?.characterEn || '',
        characterHi: bestRow?.characterHi || '',
      });

      let fetchedDiet: DietPlan | null = null;
      try {
        const res  = await fetch(`/api/admin/crm/ritucharya-diet?ritu=${bestRitu}&phase=${bestPhase}`);
        const data = await res.json();
        if (data.success && data.plan) fetchedDiet = data.plan;
      } catch { /* silent */ }

      setDietPlan(fetchedDiet);
      setStep(2);
    } catch { /* silent */ }
    finally { setAnalysing(false); }
  }, [weather]);

  // ── Calendar helpers ──────────────────────────────────────────────────
  const today = useMemo(() => new Date(), []);

  // Build 30 days starting from today
  const planDays = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return { dayNum: i + 1, date: d };
    });
  }, [today]);

  // Calendar grid for the displayed month
  const calendarGrid = useMemo(() => {
    const base = new Date(today.getFullYear(), today.getMonth() + calMonth, 1);
    const year  = base.getFullYear();
    const month = base.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: { date: number | null; dayNum: number | null; isToday: boolean }[] = [];
    for (let i = 0; i < firstDow; i++) cells.push({ date: null, dayNum: null, isToday: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      const diff = Math.floor((cellDate.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400000);
      const dayNum = diff >= 0 && diff < 30 ? diff + 1 : null;
      const isToday = diff === 0;
      cells.push({ date: d, dayNum, isToday });
    }
    return { cells, label: `${MONTH_NAMES[month]} ${year}` };
  }, [today, calMonth]);

  // Get meal data for a specific day
  const getDayMeals = (dayNum: number) => {
    if (!dietPlan) return [];
    return MEAL_SLOTS.map(slot => {
      const saved = dietPlan.meals?.find(m => m.slotKey === slot.key);
      return { ...slot, foods: saved?.foods || [], tip: saved?.tip || '' };
    });
  };

  const selectedDayDate = planDays[selectedDay - 1]?.date;
  const selectedDayMeals = getDayMeals(selectedDay);

  // ─────────────────────────────────────────────────────────────────────
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gray-50 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-emerald-700 mb-3">
              ऋतुचर्या (Ritucharya)
            </h1>
            <p className="text-lg text-gray-600">Seasonal Ayurvedic Routine Based on Real-Time Weather</p>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mt-5">
              {[1,2,3].map((s,i) => (
                <React.Fragment key={s}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                    step === s ? 'bg-emerald-600 border-emerald-600 text-white'
                    : step > s ? 'bg-emerald-100 border-emerald-400 text-emerald-700'
                    : 'bg-white border-gray-300 text-gray-400'
                  }`}>{s}</div>
                  {i < 2 && <div className={`w-10 h-0.5 ${step > i+1 ? 'bg-emerald-400' : 'bg-gray-300'}`}/>}
                </React.Fragment>
              ))}
            </div>
            <div className="flex justify-center gap-10 mt-2 text-xs text-gray-500">
              <span>Location</span><span>Ritu &amp; Plan</span><span>30-Day Calendar</span>
            </div>
          </div>

          {/* ── STEP 1 ─────────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">

              {/* Location card */}
              <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6">
                <h2 className="text-xl font-bold text-emerald-800 mb-4">📍 Select Your Location</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label:'Country',      val:country, items:locationData.map(c=>c.name), onChange:(v:string)=>onCountry(v),           disabled:false  },
                    { label:'State / Region', val:state, items:states.map(s=>s.name),       onChange:(v:string)=>onState(v),              disabled:!country },
                    { label:'City',          val:city,   items:cities.map(c=>c.name),        onChange:(v:string)=>setCity(v),              disabled:!state },
                  ].map(sel => (
                    <div key={sel.label}>
                      <p className="text-sm text-gray-600 mb-1">{sel.label}</p>
                      <select value={sel.val} onChange={e=>sel.onChange(e.target.value)} disabled={sel.disabled}
                        className="w-full px-3 py-2.5 rounded-lg border-2 border-emerald-200 bg-white text-sm font-semibold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-100 disabled:cursor-not-allowed">
                        <option value="">Select {sel.label}…</option>
                        {sel.items.map(i => <option key={i} value={i}>{i}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                {city && (
                  <button onClick={fetchWeather} disabled={fetching}
                    className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-2 transition-colors">
                    {fetching ? <><Loader className="animate-spin" size={15}/> Fetching…</> : <><RefreshCw size={15}/> Refresh Weather</>}
                  </button>
                )}
              </div>

              {/* Weather blocks */}
              <div className="rounded-2xl border-2 border-blue-300 bg-blue-50 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-blue-800">☁️ Weather Details</h2>
                  {fetching && <div className="flex items-center gap-2 text-blue-600 text-sm"><Loader className="animate-spin" size={15}/> Fetching…</div>}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  {[
                    { label:'🌡️ Current Temp (°C)', field:'temp',        color:'blue',   val:weather.temp        },
                    { label:'❄️ Min Temp (°C)',      field:'tempMin',     color:'blue',   val:weather.tempMin     },
                    { label:'🔥 Max Temp (°C)',      field:'tempMax',     color:'blue',   val:weather.tempMax     },
                    { label:'💧 Humidity (%)',        field:'humidity',    color:'cyan',   val:weather.humidity    },
                    { label:'💨 Wind Speed (km/h)',  field:'windSpeed',   color:'yellow', val:weather.windSpeed   },
                    { label:'🌫️ Air Quality (AQI)',  field:'aqi',         color:'red',    val:weather.aqi         },
                  ].map(item => (
                    <div key={item.field} className={`bg-${item.color}-100 rounded-xl p-4 border border-${item.color}-300`}>
                      <p className="text-xs text-gray-600 mb-2">{item.label}</p>
                      <input type="number" value={item.val}
                        onChange={e => setWeather(w => ({...w, [item.field]:Number(e.target.value)}))}
                        className={`w-full text-2xl font-bold bg-white text-slate-900 outline-none border-2 border-${item.color}-300 rounded px-3 py-2`}/>
                      {item.field === 'aqi' && (
                        <p className="text-xs text-gray-500 mt-1">
                          {weather.aqi<=50?'🟢 Good':weather.aqi<=100?'🟡 Moderate':weather.aqi<=150?'🟠 Sensitive':'🔴 Unhealthy'}
                        </p>
                      )}
                    </div>
                  ))}

                  <div className="bg-purple-100 rounded-xl p-4 border border-purple-300">
                    <p className="text-xs text-gray-600 mb-2">📝 Sky Condition</p>
                    <select value={weather.description} onChange={e => setWeather(w => ({...w, description:e.target.value}))}
                      className="w-full text-sm font-bold bg-white text-slate-900 outline-none border-2 border-purple-300 rounded px-3 py-2">
                      {['Clear sky','Partly cloudy','Cloudy','Mostly cloudy','Overcast','Foggy','Hazy','Light rain','Rainy','Heavy rain','Thunderstorm','Snowy'].map(d =>
                        <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  <div className="bg-green-100 rounded-xl p-4 border border-green-300">
                    <p className="text-xs text-gray-600 mb-2">🌍 Climate Type</p>
                    <div className="text-xl font-bold bg-white text-slate-900 border-2 border-green-300 rounded px-3 py-2">
                      {getClimateType(weather.temp)}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
                  </div>
                </div>

                <button onClick={runAnalysis} disabled={analysing || !country}
                  className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg transition-colors">
                  {analysing
                    ? <><Loader className="animate-spin" size={22}/> Detecting Ritu…</>
                    : <><span>🌿</span> Get My Ritucharya Plan <ArrowRight size={20}/></>}
                </button>
                {!country && <p className="text-center text-xs text-gray-400 mt-2">Please select your location first</p>}
              </div>
            </div>
          )}

          {/* ── STEP 2 ─────────────────────────────────────────────────── */}
          {step === 2 && ritu && (
            <div className="space-y-5">

              {/* Ritu detected banner — with Uttarayan/Dakshinayan */}
              {(() => {
                const meta  = RITU_META[ritu.ritu] || RITU_META['grishma'];
                const ayana = AYANA_META[ritu.ayana];
                return (
                  <div className={`rounded-2xl border-2 p-6 ${meta.bg}`}>
                    {/* Ayana badge row */}
                    {ayana && (
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-bold mb-4 ${ayana.bg} ${ayana.color}`}>
                        <span className="text-lg">{ayana.icon}</span>
                        <span>{ayana.label} ({ayana.hi})</span>
                        <span className="font-normal opacity-70">— {ayana.sublabel}</span>
                      </div>
                    )}

                    {/* Main Ritu info */}
                    <div className="flex items-start gap-5">
                      <div className="text-6xl">{ritu.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-3xl font-bold mb-1 ${meta.color}`}>{ritu.rituLabel}</div>
                        <div className="text-lg font-semibold text-gray-700">{ritu.phaseLabel}</div>
                        {ritu.characterHi && <div className="text-sm text-gray-600 mt-1">{ritu.characterHi}</div>}
                        {ritu.characterEn && <div className="text-xs text-gray-500 italic">{ritu.characterEn}</div>}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-gray-500 mb-1">Match Score</div>
                        <div className={`text-2xl font-bold ${meta.color}`}>{ritu.score}/100</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {ritu.score>=70?'✅ High':ritu.score>=45?'🟡 Medium':'⚠️ Low'} confidence
                        </div>
                      </div>
                    </div>

                    {/* Uttarayan/Dakshinayan explanation */}
                    {ayana && (
                      <div className="mt-4 pt-4 border-t border-black/10 text-xs text-gray-600">
                        {ritu.ayana === 'uttarayan'
                          ? '☀️ Uttarayan (Jan–Jun): Sun moves northward. Body energy reduces, digestion strong. Light, nourishing diet recommended.'
                          : '🌌 Dakshinayan (Jul–Dec): Sun moves southward. Body builds strength. Heavier, nourishing foods are beneficial.'}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Weather summary */}
              <div className="rounded-2xl border-2 border-blue-300 bg-blue-50 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-blue-800">☁️ Your Weather</h3>
                  <button onClick={() => setStep(1)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-100 flex items-center gap-1 transition-colors">
                    <RefreshCw size={12}/> Change Location
                  </button>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-7 gap-2 text-center">
                  {[
                    {label:'Temp',  val:`${weather.temp}°C`,        color:'text-blue-700'},
                    {label:'Min',   val:`${weather.tempMin}°C`,     color:'text-blue-600'},
                    {label:'Max',   val:`${weather.tempMax}°C`,     color:'text-orange-600'},
                    {label:'Humid', val:`${weather.humidity}%`,     color:'text-cyan-700'},
                    {label:'Wind',  val:`${weather.windSpeed}km/h`, color:'text-yellow-700'},
                    {label:'AQI',   val:String(weather.aqi),        color:'text-red-600'},
                    {label:'Sky',   val:weather.description,        color:'text-purple-700'},
                  ].map(f => (
                    <div key={f.label} className="bg-white rounded-lg p-2 border border-blue-200">
                      <div className="text-[10px] text-gray-400">{f.label}</div>
                      <div className={`text-xs font-bold truncate ${f.color}`}>{f.val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diet Plan */}
              {dietPlan ? (
                <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-6 space-y-4">
                  <h2 className="text-xl font-bold text-emerald-800">
                    🍽️ {ritu.icon} {ritu.rituLabel} — {ritu.phaseLabel} Diet Plan
                  </h2>

                  <div className="space-y-2">
                    {MEAL_SLOTS.map(slot => {
                      const mealData = dietPlan.meals?.find(m => m.slotKey === slot.key);
                      if (!mealData || mealData.foods.length === 0) return null;
                      const isOpen = openSlot === slot.key;
                      return (
                        <div key={slot.key} className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm">
                          <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                            onClick={() => setOpenSlot(isOpen ? null : slot.key)}>
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{slot.emoji}</span>
                              <div className="text-left">
                                <div className="font-bold text-gray-900 text-sm">{slot.label}</div>
                                <div className="text-xs text-gray-500">🕐 {slot.time}</div>
                              </div>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                                {mealData.foods.length} foods
                              </span>
                            </div>
                            {isOpen ? <ChevronUp size={18} className="text-gray-400"/> : <ChevronDown size={18} className="text-gray-400"/>}
                          </button>
                          {isOpen && (
                            <div className="px-5 pb-4 pt-3 border-t border-gray-100">
                              <div className="flex flex-wrap gap-2 mb-3">
                                {mealData.foods.map((f,i) => (
                                  <span key={i} className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800">
                                    🌿 {f}
                                  </span>
                                ))}
                              </div>
                              {mealData.tip && (
                                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                                  💡 {mealData.tip}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {dietPlan.herbs?.length > 0 && (
                    <div className="bg-white rounded-xl border-2 border-gray-200 p-4 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-3 text-sm">🌱 Herbs &amp; Supplements</h3>
                      <div className="flex flex-wrap gap-2">
                        {dietPlan.herbs.map((h,i) => (
                          <span key={i} className="px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-xs font-medium text-green-800">🌿 {h}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {dietPlan.lifestyleTips?.length > 0 && (
                    <div className="bg-white rounded-xl border-2 border-gray-200 p-4 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-3 text-sm">🧘 Lifestyle Tips</h3>
                      <div className="space-y-2">
                        {dietPlan.lifestyleTips.map((t,i) => (
                          <div key={i} className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800">
                            <span className="shrink-0 mt-0.5">✦</span> {t}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {dietPlan.avoidFoods?.length > 0 && (
                    <div className="bg-white rounded-xl border-2 border-gray-200 p-4 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-3 text-sm">🚫 Avoid This Season</h3>
                      <div className="flex flex-wrap gap-2">
                        {dietPlan.avoidFoods.map((f,i) => (
                          <span key={i} className="px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-xs font-medium text-red-800">✗ {f}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {dietPlan.specialNotes && (
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 shadow-sm">
                      <h3 className="font-bold text-amber-800 mb-2 text-sm">📝 Special Notes</h3>
                      <p className="text-sm text-amber-900">{dietPlan.specialNotes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-8 text-center">
                  <div className="text-4xl mb-3">🌿</div>
                  <p className="text-amber-800 font-semibold">Diet plan for {ritu.rituLabel} ({ritu.phaseLabel}) is being prepared.</p>
                  <p className="text-amber-600 text-sm mt-1">Our Ayurvedic team is adding the complete plan. Please check back soon.</p>
                </div>
              )}

              {/* SUBMIT button + Change Location link */}
              <button
                onClick={() => { setSelectedDay(1); setCalMonth(0); setStep(3); }}
                className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold flex items-center justify-center gap-3 shadow-lg transition-colors">
                <Calendar size={22}/> Submit — View My 30-Day Plan →
              </button>

              <button onClick={() => setStep(1)}
                className="w-full text-center text-sm text-emerald-600 hover:text-emerald-800 font-semibold transition-colors py-2">
                ← Change Location / Weather
              </button>
            </div>
          )}

          {/* ── STEP 3: Interactive 30-Day Calendar ────────────────────── */}
          {step === 3 && ritu && (
            <div className="space-y-5">

              {/* Header + navigation */}
              <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-5">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                  <div>
                    <h2 className="text-xl font-bold text-emerald-800">
                      📅 30-Day Plan — {ritu.icon} {ritu.rituLabel}
                    </h2>
                    <p className="text-sm text-gray-600 mt-0.5">{ritu.phaseLabel}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Calendar / List toggle */}
                    <div className="flex gap-1 bg-white border-2 border-emerald-200 p-1 rounded-lg">
                      <button onClick={() => setCalView('calendar')}
                        className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-colors ${calView==='calendar' ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                        <Calendar size={13}/> Calendar
                      </button>
                      <button onClick={() => setCalView('list')}
                        className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-colors ${calView==='list' ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                        <List size={13}/> List
                      </button>
                    </div>
                    <button onClick={() => setStep(2)}
                      className="px-4 py-2 rounded-lg border-2 border-emerald-400 text-emerald-700 font-bold hover:bg-emerald-100 text-sm transition-colors">
                      ← Back
                    </button>
                  </div>
                </div>
              </div>

              {/* ── CALENDAR VIEW ── */}
              {calView === 'calendar' && (
                <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 shadow-sm">
                  {/* Month navigation */}
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={() => setCalMonth(m => m - 1)}
                      className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-700 transition-colors">
                      <ArrowLeft size={18}/>
                    </button>
                    <h3 className="font-black text-gray-800 text-lg">{calendarGrid.label}</h3>
                    <button onClick={() => setCalMonth(m => m + 1)}
                      className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-700 transition-colors">
                      <ArrowRight size={18}/>
                    </button>
                  </div>

                  {/* Day-of-week header */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {DAYS_OF_WEEK.map(d => (
                      <div key={d} className="text-xs font-bold text-gray-400 text-center py-1">{d}</div>
                    ))}
                  </div>

                  {/* Day cells */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarGrid.cells.map((cell, ci) => {
                      if (!cell.date) return <div key={ci}/>;
                      const isSelected = cell.dayNum === selectedDay;
                      const isInPlan   = cell.dayNum !== null;

                      return (
                        <button key={ci}
                          onClick={() => cell.dayNum && setSelectedDay(cell.dayNum)}
                          disabled={!isInPlan}
                          className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold transition-all hover:scale-105 ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-400 ring-offset-1 scale-105'
                              : cell.isToday
                                ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-400'
                                : isInPlan
                                  ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-100'
                                  : 'text-gray-300 cursor-not-allowed'
                          }`}>
                          <span>{cell.date}</span>
                          {isInPlan && (
                            <span className={`text-[9px] mt-0.5 font-normal ${isSelected ? 'text-white/80' : 'text-emerald-500'}`}>
                              Day {cell.dayNum}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[10px] text-gray-400 text-center mt-3">
                    🟢 Green days = your 30-day plan · Click any day to see meals
                  </p>
                </div>
              )}

              {/* ── LIST VIEW ── */}
              {calView === 'list' && (
                <div className="space-y-2">
                  {planDays.map(({ dayNum, date }) => {
                    const isSelected = selectedDay === dayNum;
                    const isToday    = dayNum === 1;
                    const dayName    = date.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' });
                    return (
                      <button key={dayNum} onClick={() => setSelectedDay(dayNum)}
                        className={`w-full text-left px-5 py-3 rounded-xl border-2 flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : isToday
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300'
                        }`}>
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${isSelected ? 'bg-white text-emerald-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {dayNum}
                          </span>
                          <span className="font-semibold text-sm">{dayName}</span>
                          {isToday && <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-emerald-600 text-white'}`}>TODAY</span>}
                        </div>
                        <span className={`text-[10px] ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                          {MEAL_SLOTS.length} meals
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ── Selected Day Panel ── */}
              <div className="bg-white rounded-2xl border-2 border-emerald-400 overflow-hidden shadow-md">

                {/* Day navigation header with arrows */}
                <div className="bg-emerald-600 px-5 py-4 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedDay(d => Math.max(1, d - 1))}
                    disabled={selectedDay <= 1}
                    className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white font-bold transition-colors">
                    <ArrowLeft size={20}/>
                  </button>

                  <div className="text-center">
                    <div className="text-white font-black text-lg">
                      Day {selectedDay} of 30
                    </div>
                    <div className="text-emerald-100 text-sm">
                      {selectedDayDate?.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedDay(d => Math.min(30, d + 1))}
                    disabled={selectedDay >= 30}
                    className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white font-bold transition-colors">
                    <ArrowRight size={20}/>
                  </button>
                </div>

                {/* Meal slots for selected day */}
                <div className="divide-y divide-gray-100">
                  {selectedDayMeals.map(slot => {
                    const hasFood = slot.foods.length > 0;
                    return (
                      <div key={slot.key} className={`px-5 py-4 ${hasFood ? '' : 'opacity-50'}`}>
                        <div className="flex items-start gap-4">
                          <div className="text-3xl shrink-0">{slot.emoji}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-gray-900 text-sm">{slot.label}</span>
                              <span className="text-xs text-gray-400">🕐 {slot.time}</span>
                            </div>
                            {hasFood ? (
                              <>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                  {slot.foods.map((f, i) => (
                                    <span key={i} className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800">
                                      🌿 {f}
                                    </span>
                                  ))}
                                </div>
                                {slot.tip && (
                                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                                    💡 {slot.tip}
                                  </div>
                                )}
                              </>
                            ) : (
                              <p className="text-xs text-gray-400 italic">Not planned yet</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Daily extras */}
                {dietPlan && (dietPlan.herbs?.length > 0 || dietPlan.lifestyleTips?.length > 0) && (
                  <div className="px-5 py-4 bg-green-50 border-t-2 border-green-100">
                    {dietPlan.herbs?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-bold text-green-700 mb-1.5">🌱 Today&apos;s Herbs:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {dietPlan.herbs.map((h,i) => (
                            <span key={i} className="px-2.5 py-1 rounded-full bg-white border border-green-200 text-xs text-green-800 font-medium">🌿 {h}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {dietPlan.lifestyleTips?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-blue-700 mb-1.5">🧘 Today&apos;s Lifestyle:</p>
                        <div className="space-y-1">
                          {dietPlan.lifestyleTips.slice(0,2).map((t,i) => (
                            <div key={i} className="text-xs text-blue-700 flex items-start gap-1.5">
                              <span className="shrink-0 font-bold">{i+1}.</span> {t}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Day dot navigation */}
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                  <p className="text-[9px] text-gray-400 mb-2 text-center">Jump to day</p>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {Array.from({length:30},(_,i)=>i+1).map(d => (
                      <button key={d} onClick={() => setSelectedDay(d)}
                        className={`w-6 h-6 rounded-full text-[9px] font-bold transition-all hover:scale-110 ${
                          d === selectedDay
                            ? 'bg-emerald-600 text-white'
                            : d === 1
                              ? 'bg-emerald-200 text-emerald-800'
                              : 'bg-gray-200 text-gray-600 hover:bg-emerald-100'
                        }`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Avoid foods for full month */}
              {dietPlan && dietPlan.avoidFoods && dietPlan.avoidFoods.length > 0 && (
                <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4">
                  <h3 className="font-bold text-red-800 mb-3 text-sm">🚫 Avoid All Month</h3>
                  <div className="flex flex-wrap gap-2">
                    {dietPlan.avoidFoods.map((f,i) => (
                      <span key={i} className="px-3 py-1.5 rounded-full bg-white border border-red-200 text-xs font-medium text-red-800">✗ {f}</span>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => setStep(1)}
                className="w-full text-center text-sm text-emerald-600 hover:text-emerald-800 font-semibold transition-colors py-2">
                ← Change Location / Weather
              </button>
            </div>
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}
