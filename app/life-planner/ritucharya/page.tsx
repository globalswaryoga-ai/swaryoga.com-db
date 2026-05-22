'use client';

/**
 * Public Ritucharya Page — swaryoga.com/life-planner/ritucharya
 * Emerald theme, white bg — matches admin manage page style
 * Connected to MongoDB logic table + diet plans
 * Step 1 → Location + Weather
 * Step 2 → Detected Ritu + Full Diet Plan
 * Step 3 → 30-Day Meal Calendar
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Loader, RefreshCw, ChevronDown, ChevronUp, Calendar, ArrowRight } from 'lucide-react';
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

const RITU_META: Record<string, { label:string; icon:string; color:string; bg:string; accent:string }> = {
  shishir: { label:'शीत (SHISHIRA)',    icon:'❄️', color:'text-blue-700',   bg:'bg-blue-50 border-blue-300',   accent:'blue'   },
  vasant:  { label:'वसंत (VASANT)',     icon:'🌸', color:'text-green-700',  bg:'bg-green-50 border-green-300', accent:'green'  },
  grishma: { label:'ग्रीष्म (GRISHMA)', icon:'☀️', color:'text-orange-700', bg:'bg-orange-50 border-orange-300',accent:'orange' },
  varsha:  { label:'वर्षा (VARSHA)',     icon:'🌧️', color:'text-indigo-700', bg:'bg-indigo-50 border-indigo-300',accent:'indigo' },
  sharad:  { label:'शरद (SHARAD)',      icon:'🍂', color:'text-amber-700',  bg:'bg-amber-50 border-amber-300', accent:'amber'  },
  hemant:  { label:'हेमंत (HEMANT)',    icon:'🥶', color:'text-purple-700', bg:'bg-purple-50 border-purple-300',accent:'purple' },
};

const PHASE_META: Record<string, { label:string; hi:string }> = {
  begin: { label:'BEGIN', hi:'प्रारंभ' },
  peak:  { label:'PEAK',  hi:'शिखर'   },
  last:  { label:'LAST',  hi:'अंत'    },
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

const WEEKS = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

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

function build30DayPlan(diet: DietPlan | null) {
  if (!diet) return [];
  const days: { day: number; week: number; meals: { key:string; foods:string[]; tip:string }[] }[] = [];
  for (let d = 1; d <= 30; d++) {
    days.push({
      day:  d,
      week: Math.ceil(d / 7),
      meals: MEAL_SLOTS.map(slot => {
        const saved = diet.meals?.find(m => m.slotKey === slot.key);
        return { key: slot.key, foods: saved?.foods || [], tip: saved?.tip || '' };
      }),
    });
  }
  return days;
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

  // 30-day plan state
  const [plan30,   setPlan30]     = useState<ReturnType<typeof build30DayPlan>>([]);
  const [activeWeek, setActiveWeek] = useState(1);
  const [openDay,  setOpenDay]    = useState<number|null>(1);

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

  // ── Auto-fetch weather when city selected ──────────────────────────
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
        const d    = await wRes.value.json();
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

  // ── Run analysis: weather → MongoDB logic → diet plan ────────────
  const runAnalysis = useCallback(async () => {
    setAnalysing(true);
    try {
      // 1. Fetch logic table from MongoDB
      let logicRows: any[] = [];
      try {
        const res  = await fetch('/api/admin/crm/ritucharya-logic');
        const data = await res.json();
        if (data.success && data.rows?.length > 0) logicRows = data.rows;
      } catch { /* use empty */ }

      // 2. Score each row against current weather
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
        characterEn: bestRow?.characterEn || '',
        characterHi: bestRow?.characterHi || '',
      });

      // 3. Fetch diet plan from MongoDB
      let fetchedDiet: DietPlan | null = null;
      try {
        const res  = await fetch(`/api/admin/crm/ritucharya-diet?ritu=${bestRitu}&phase=${bestPhase}`);
        const data = await res.json();
        if (data.success && data.plan) fetchedDiet = data.plan;
      } catch { /* silent */ }

      setDietPlan(fetchedDiet);
      setPlan30(build30DayPlan(fetchedDiet));
      setStep(2);
    } catch { /* silent */ }
    finally { setAnalysing(false); }
  }, [weather]);

  // ── helpers ──────────────────────────────────────────────────────────
  const today = new Date();
  const monthName = today.toLocaleString('default', { month: 'long', year: 'numeric' });

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
              {(['1','2','3'] as const).map((s,i) => (
                <React.Fragment key={s}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                    step === Number(s)
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : step > Number(s)
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-700'
                        : 'bg-white border-gray-300 text-gray-400'
                  }`}>{s}</div>
                  {i < 2 && <div className={`w-10 h-0.5 ${step > i+1 ? 'bg-emerald-400' : 'bg-gray-300'}`}/>}
                </React.Fragment>
              ))}
            </div>
            <div className="flex justify-center gap-10 mt-2 text-xs text-gray-500">
              <span>Location</span><span>Ritu & Plan</span><span>30-Day Calendar</span>
            </div>
          </div>

          {/* ── STEP 1: Location + Weather ─────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">

              {/* Location */}
              <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6">
                <h2 className="text-xl font-bold text-emerald-800 mb-4">📍 Select Your Location</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Country</p>
                    <select value={country} onChange={e => onCountry(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-emerald-200 bg-white text-sm font-semibold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400">
                      <option value="">Select Country…</option>
                      {locationData.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">State / Region</p>
                    <select value={state} onChange={e => onState(e.target.value)} disabled={!country}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-emerald-200 bg-white text-sm font-semibold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-100 disabled:cursor-not-allowed">
                      <option value="">Select State…</option>
                      {states.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">City</p>
                    <select value={city} onChange={e => setCity(e.target.value)} disabled={!state}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-emerald-200 bg-white text-sm font-semibold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-100 disabled:cursor-not-allowed">
                      <option value="">Select City…</option>
                      {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                {country && state && city && (
                  <div className="mt-3 flex gap-6 flex-wrap">
                    <div><p className="text-xs text-gray-500">Country</p><p className="font-bold text-emerald-700">{country}</p></div>
                    <div><p className="text-xs text-gray-500">State</p><p className="font-bold text-emerald-700">{state}</p></div>
                    <div><p className="text-xs text-gray-500">City</p><p className="font-bold text-emerald-700">{city}</p></div>
                  </div>
                )}
                {city && (
                  <button onClick={fetchWeather} disabled={fetching}
                    className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-2 transition-colors">
                    {fetching ? <><Loader className="animate-spin" size={15}/> Fetching…</> : <><RefreshCw size={15}/> Refresh Weather</>}
                  </button>
                )}
              </div>

              {/* Weather Blocks */}
              <div className="rounded-2xl border-2 border-blue-300 bg-blue-50 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-blue-800">☁️ Weather Details</h2>
                  {fetching && <div className="flex items-center gap-2 text-blue-600 text-sm"><Loader className="animate-spin" size={15}/> Auto-fetching…</div>}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">

                  <div className="bg-blue-100 rounded-xl p-4 border border-blue-300">
                    <p className="text-xs text-gray-600 mb-2">🌡️ Current Temp (°C)</p>
                    <input type="number" value={weather.temp}
                      onChange={e => setWeather(w => ({...w, temp:Number(e.target.value)}))}
                      className="w-full text-2xl font-bold bg-white text-slate-900 outline-none border-2 border-blue-300 rounded px-3 py-2"/>
                    <p className="text-xs text-gray-500 mt-1">Today's temperature</p>
                  </div>

                  <div className="bg-blue-100 rounded-xl p-4 border border-blue-300">
                    <p className="text-xs text-gray-600 mb-2">❄️ Min Temp (°C)</p>
                    <input type="number" value={weather.tempMin}
                      onChange={e => setWeather(w => ({...w, tempMin:Number(e.target.value)}))}
                      className="w-full text-2xl font-bold bg-white text-slate-900 outline-none border-2 border-blue-300 rounded px-3 py-2"/>
                    <p className="text-xs text-gray-500 mt-1">Lowest today</p>
                  </div>

                  <div className="bg-blue-100 rounded-xl p-4 border border-blue-300">
                    <p className="text-xs text-gray-600 mb-2">🔥 Max Temp (°C)</p>
                    <input type="number" value={weather.tempMax}
                      onChange={e => setWeather(w => ({...w, tempMax:Number(e.target.value)}))}
                      className="w-full text-2xl font-bold bg-white text-slate-900 outline-none border-2 border-blue-300 rounded px-3 py-2"/>
                    <p className="text-xs text-gray-500 mt-1">Highest today</p>
                  </div>

                  <div className="bg-cyan-100 rounded-xl p-4 border border-cyan-300">
                    <p className="text-xs text-gray-600 mb-2">💧 Humidity (%)</p>
                    <input type="number" value={weather.humidity}
                      onChange={e => setWeather(w => ({...w, humidity:Number(e.target.value)}))}
                      className="w-full text-2xl font-bold bg-white text-slate-900 outline-none border-2 border-cyan-300 rounded px-3 py-2"/>
                    <p className="text-xs text-gray-500 mt-1">Air moisture</p>
                  </div>

                  <div className="bg-yellow-100 rounded-xl p-4 border border-yellow-300">
                    <p className="text-xs text-gray-600 mb-2">💨 Wind Speed (km/h)</p>
                    <input type="number" value={weather.windSpeed}
                      onChange={e => setWeather(w => ({...w, windSpeed:Number(e.target.value)}))}
                      className="w-full text-2xl font-bold bg-white text-slate-900 outline-none border-2 border-yellow-300 rounded px-3 py-2"/>
                    <p className="text-xs text-gray-500 mt-1">km/h</p>
                  </div>

                  <div className="bg-red-100 rounded-xl p-4 border border-red-300">
                    <p className="text-xs text-gray-600 mb-2">🌫️ Air Quality (AQI)</p>
                    <input type="number" value={weather.aqi}
                      onChange={e => setWeather(w => ({...w, aqi:Number(e.target.value)}))}
                      className="w-full text-2xl font-bold bg-white text-slate-900 outline-none border-2 border-red-300 rounded px-3 py-2"/>
                    <p className="text-xs text-gray-500 mt-1">
                      {weather.aqi<=50?'🟢 Good':weather.aqi<=100?'🟡 Moderate':weather.aqi<=150?'🟠 Sensitive':'🔴 Unhealthy'}
                    </p>
                  </div>

                  <div className="bg-purple-100 rounded-xl p-4 border border-purple-300">
                    <p className="text-xs text-gray-600 mb-2">📝 Sky Condition</p>
                    <select value={weather.description} onChange={e => setWeather(w => ({...w, description:e.target.value}))}
                      className="w-full text-sm font-bold bg-white text-slate-900 outline-none border-2 border-purple-300 rounded px-3 py-2">
                      {['Clear sky','Partly cloudy','Cloudy','Mostly cloudy','Overcast','Foggy','Hazy','Light rain','Rainy','Heavy rain','Thunderstorm','Snowy'].map(d =>
                        <option key={d} value={d}>{d}</option>)}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Current sky</p>
                  </div>

                  <div className="bg-green-100 rounded-xl p-4 border border-green-300">
                    <p className="text-xs text-gray-600 mb-2">🌍 Climate Type</p>
                    <div className="text-xl font-bold bg-white text-slate-900 border-2 border-green-300 rounded px-3 py-2">
                      {getClimateType(weather.temp)}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
                  </div>
                </div>

                {/* Get Plan button */}
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

          {/* ── STEP 2: Ritu + Diet Plan ────────────────────────────────── */}
          {step === 2 && ritu && (
            <div className="space-y-5">

              {/* Ritu detected banner */}
              {(() => {
                const meta = RITU_META[ritu.ritu] || RITU_META['grishma'];
                return (
                  <div className={`rounded-2xl border-2 p-6 ${meta.bg}`}>
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
                  </div>
                );
              })()}

              {/* Weather summary strip */}
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

                  {/* 7 Meal Slots accordion */}
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

                  {/* Herbs */}
                  {dietPlan.herbs?.length > 0 && (
                    <div className="bg-white rounded-xl border-2 border-gray-200 p-4 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-3 text-sm">🌱 Herbs & Supplements</h3>
                      <div className="flex flex-wrap gap-2">
                        {dietPlan.herbs.map((h,i) => (
                          <span key={i} className="px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-xs font-medium text-green-800">
                            🌿 {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lifestyle Tips */}
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

                  {/* Avoid Foods */}
                  {dietPlan.avoidFoods?.length > 0 && (
                    <div className="bg-white rounded-xl border-2 border-gray-200 p-4 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-3 text-sm">🚫 Avoid This Season</h3>
                      <div className="flex flex-wrap gap-2">
                        {dietPlan.avoidFoods.map((f,i) => (
                          <span key={i} className="px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-xs font-medium text-red-800">
                            ✗ {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Special Notes */}
                  {dietPlan.specialNotes && (
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 shadow-sm">
                      <h3 className="font-bold text-amber-800 mb-2 text-sm">📝 Special Notes</h3>
                      <p className="text-sm text-amber-900">{dietPlan.specialNotes}</p>
                    </div>
                  )}

                  {/* View 30-Day Plan button */}
                  <button onClick={() => { setStep(3); setActiveWeek(1); setOpenDay(1); }}
                    className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold flex items-center justify-center gap-3 shadow-lg transition-colors">
                    <Calendar size={22}/> View 30-Day Meal Calendar →
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-8 text-center">
                  <div className="text-4xl mb-3">🌿</div>
                  <p className="text-amber-800 font-semibold">Diet plan for {ritu.rituLabel} ({ritu.phaseLabel}) is being prepared.</p>
                  <p className="text-amber-600 text-sm mt-1">Our Ayurvedic team is adding the complete plan. Please check back soon.</p>
                  <button onClick={() => setStep(1)}
                    className="mt-4 px-4 py-2 rounded-lg border-2 border-amber-400 text-amber-700 font-bold hover:bg-amber-100 text-sm transition-colors">
                    ← Change Location
                  </button>
                </div>
              )}

              <button onClick={() => setStep(1)}
                className="w-full py-3 rounded-xl border-2 border-emerald-600 text-emerald-700 font-bold hover:bg-emerald-50 transition-colors">
                ← Change Location / Weather
              </button>
            </div>
          )}

          {/* ── STEP 3: 30-Day Calendar Plan ──────────────────────────── */}
          {step === 3 && ritu && (
            <div className="space-y-5">

              {/* Header */}
              <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-emerald-800">
                      📅 30-Day Plan — {ritu.icon} {ritu.rituLabel}
                    </h2>
                    <p className="text-sm text-gray-600 mt-0.5">{monthName} · {ritu.phaseLabel}</p>
                  </div>
                  <button onClick={() => setStep(2)}
                    className="px-4 py-2 rounded-lg border-2 border-emerald-400 text-emerald-700 font-bold hover:bg-emerald-100 text-sm transition-colors">
                    ← Back to Plan
                  </button>
                </div>

                {/* Week tabs */}
                <div className="flex gap-2 mt-4 flex-wrap">
                  {WEEKS.map((w,i) => (
                    <button key={w} onClick={() => { setActiveWeek(i+1); setOpenDay((i*7)+1); }}
                      className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                        activeWeek === i+1
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-white border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                      }`}>
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day cards for active week */}
              <div className="space-y-3">
                {plan30
                  .filter(d => d.week === activeWeek)
                  .map(dayPlan => {
                    const isOpen = openDay === dayPlan.day;
                    const today_ = new Date();
                    const dayDate = new Date(today_.getFullYear(), today_.getMonth(), today_.getDate() + dayPlan.day - 1);
                    const dayName = dayDate.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' });
                    const isToday = dayPlan.day === 1;

                    return (
                      <div key={dayPlan.day} className={`rounded-xl border-2 overflow-hidden shadow-sm ${isToday ? 'border-emerald-500' : 'border-gray-200'}`}>
                        {/* Day header row */}
                        <button className={`w-full flex items-center justify-between px-5 py-3.5 transition-colors ${isToday ? 'bg-emerald-50 hover:bg-emerald-100' : 'bg-white hover:bg-gray-50'}`}
                          onClick={() => setOpenDay(isOpen ? null : dayPlan.day)}>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 ${
                              isToday ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-700'
                            }`}>
                              {dayPlan.day}
                            </div>
                            <div className="text-left">
                              <div className={`font-bold text-sm ${isToday ? 'text-emerald-800' : 'text-gray-800'}`}>
                                {dayName} {isToday && <span className="ml-1 px-2 py-0.5 bg-emerald-600 text-white text-[10px] rounded-full">TODAY</span>}
                              </div>
                              <div className="text-xs text-gray-500">
                                {dayPlan.meals.filter(m => m.foods.length > 0).length} meals planned
                              </div>
                            </div>
                          </div>

                          {/* Quick meal preview */}
                          <div className="hidden md:flex items-center gap-1 mr-3">
                            {MEAL_SLOTS.slice(0,5).map(slot => {
                              const m = dayPlan.meals.find(m2 => m2.key === slot.key);
                              return (
                                <span key={slot.key} title={slot.label} className={`text-lg ${m && m.foods.length ? 'opacity-100' : 'opacity-20'}`}>
                                  {slot.emoji}
                                </span>
                              );
                            })}
                          </div>

                          {isOpen ? <ChevronUp size={18} className="text-gray-400 shrink-0"/> : <ChevronDown size={18} className="text-gray-400 shrink-0"/>}
                        </button>

                        {/* Expanded meals */}
                        {isOpen && (
                          <div className="border-t border-gray-100">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                              {MEAL_SLOTS.map(slot => {
                                const m = dayPlan.meals.find(m2 => m2.key === slot.key);
                                const hasFoods = m && m.foods.length > 0;
                                return (
                                  <div key={slot.key} className="px-4 py-3">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span>{slot.emoji}</span>
                                      <div>
                                        <div className="text-xs font-bold text-gray-700">{slot.label}</div>
                                        <div className="text-[10px] text-gray-400">{slot.time}</div>
                                      </div>
                                    </div>
                                    {hasFoods ? (
                                      <div className="flex flex-wrap gap-1">
                                        {m.foods.slice(0,4).map((f,i) => (
                                          <span key={i} className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-800 font-medium">
                                            {f}
                                          </span>
                                        ))}
                                        {m.foods.length > 4 && (
                                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] text-gray-500">
                                            +{m.foods.length - 4} more
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-[10px] text-gray-400 italic">Not planned</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            {/* Herbs strip */}
                            {dietPlan?.herbs && dietPlan.herbs.length > 0 && (
                              <div className="px-4 py-2 bg-green-50 border-t border-green-100">
                                <span className="text-[10px] font-bold text-green-700 mr-2">🌱 Daily Herbs:</span>
                                {dietPlan.herbs.slice(0,3).map((h,i) => (
                                  <span key={i} className="text-[10px] text-green-800 mr-2">{h}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Summary grid (non-expandable compact view) */}
              <div className="rounded-2xl border-2 border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4">📊 Full Month Overview</h3>
                <div className="grid grid-cols-5 gap-2">
                  {plan30.map(d => {
                    const hasPlan = d.meals.some(m => m.foods.length > 0);
                    const isToday_ = d.day === 1;
                    return (
                      <button key={d.day}
                        onClick={() => { setActiveWeek(d.week); setOpenDay(d.day); }}
                        className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-bold border-2 transition-all hover:scale-105 ${
                          isToday_
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : hasPlan
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400'
                              : 'bg-gray-50 text-gray-400 border-gray-200'
                        }`}>
                        <span>{d.day}</span>
                        {hasPlan && !isToday_ && <span className="text-[8px] mt-0.5 opacity-60">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lifestyle & avoids for the month */}
              {dietPlan && (
                <div className="grid md:grid-cols-2 gap-4">
                  {dietPlan.lifestyleTips?.length > 0 && (
                    <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-4">
                      <h3 className="font-bold text-blue-800 mb-3 text-sm">🧘 Daily Lifestyle Tips</h3>
                      <div className="space-y-2">
                        {dietPlan.lifestyleTips.map((t,i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-blue-800 bg-white rounded-lg px-3 py-2 border border-blue-100">
                            <span className="shrink-0 font-bold text-blue-500">{i+1}.</span> {t}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {dietPlan.avoidFoods?.length > 0 && (
                    <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4">
                      <h3 className="font-bold text-red-800 mb-3 text-sm">🚫 Avoid All Month</h3>
                      <div className="flex flex-wrap gap-2">
                        {dietPlan.avoidFoods.map((f,i) => (
                          <span key={i} className="px-3 py-1.5 rounded-full bg-white border border-red-200 text-xs font-medium text-red-800">✗ {f}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(2)}
                  className="flex-1 py-3 rounded-xl border-2 border-emerald-600 text-emerald-700 font-bold hover:bg-emerald-50 transition-colors">
                  ← Back to Diet Plan
                </button>
                <button onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl border-2 border-gray-400 text-gray-600 font-bold hover:bg-gray-100 transition-colors">
                  ← Change Location
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}
