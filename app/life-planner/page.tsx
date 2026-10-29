'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  Search, 
  Sparkles, 
  Activity, 
  HeartPulse, 
  Flame, 
  Wind, 
  ShieldCheck, 
  ArrowRight, 
  BookOpen, 
  Clock, 
  Layers, 
  CheckCircle2, 
  Filter, 
  ExternalLink,
  UserCheck
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

interface BreathAttributeItem {
  positive: string;
  intensity: string;
  intensityNum: number;
  negative: string;
  ailment: string;
}

const BREATH_FREQUENCY_DATA: BreathAttributeItem[] = [
  { positive: 'understanding', intensity: '+2000-', intensityNum: 2000, negative: 'intense, continuous anger', ailment: 'coma' },
  { positive: 'have complete knowledge, a specialist', intensity: '+1975-', intensityNum: 1975, negative: 'intense egotism, show-off mentality', ailment: 'loss of memory' },
  { positive: 'abolition of ego', intensity: '+1950-', intensityNum: 1950, negative: 'refusal to flow with experiences', ailment: 'abdominal cramps' },
  { positive: 'kind and generous mind', intensity: '+1925-', intensityNum: 1925, negative: 'mental block; stiff, closed mind', ailment: 'ruined kidney' },
  { positive: 'enthusiasm of action', intensity: '+1900-', intensityNum: 1900, negative: 'brooding over insults and seeking revenge', ailment: 'abscess near neck and face' },
  { positive: 'open mind, a constant learner', intensity: '+1875-', intensityNum: 1875, negative: 'ignorant, but superiority complex', ailment: 'cerebral haemorrhage' },
  { positive: 'affection for divine', intensity: '+1850-', intensityNum: 1850, negative: 'belief in violence', ailment: 'accident prone' },
  { positive: 'earn respect', intensity: '+1825-', intensityNum: 1825, negative: 'mentally lazy and foolish', ailment: 'blindness, narcissism' },
  { positive: 'aspiration for silence in mind', intensity: '+1800-', intensityNum: 1800, negative: 'family friction and arguments', ailment: 'adenoids' },
  { positive: 'logical mind', intensity: '+1775-', intensityNum: 1775, negative: 'consistent anger, foul language', ailment: 'apoplexy' },
  { positive: 'power to reject adverse suggestions', intensity: '+1750-', intensityNum: 1750, negative: 'anxiety and defeatism', ailment: 'adrenal ailments' },
  { positive: 'orderly mind', intensity: '+1725-', intensityNum: 1725, negative: 'ruffled, unsteady mind', ailment: 'stroke and/or shock' },
  { positive: 'mental aspiration', intensity: '+1700-', intensityNum: 1700, negative: 'closed mind not accepting the present', ailment: 'premature old age' },
  { positive: 'wise, guiding type', intensity: '+1675-', intensityNum: 1675, negative: 'inferiority complex; mean and greedy', ailment: 'brain tumour' },
  { positive: 'awakening', intensity: '+1650-', intensityNum: 1650, negative: 'sexual crimes', ailment: 'AIDS' },
  { positive: 'good grasping power and concentration', intensity: '+1625-', intensityNum: 1625, negative: 'meanly, deliberately cause misunderstanding', ailment: 'brain cancer' },
  { positive: 'mental balance', intensity: '+1600-', intensityNum: 1600, negative: 'guilt-, futility-based depression', ailment: 'alcoholism; addiction to other things' },
  { positive: 'highly active and agile mind', intensity: '+1575-', intensityNum: 1575, negative: 'back-biting, gossipy type', ailment: 'insomnia and/or cancer' },
  { positive: 'benevolence', intensity: '+1550-', intensityNum: 1550, negative: 'make mountains of mole-hills, irritation', ailment: 'various allergies' },
  { positive: 'forgiving type', intensity: '+1525-', intensityNum: 1525, negative: 'purposely cause unhappiness', ailment: 'full paralysis' },
  { positive: 'illumined mind centre', intensity: '+1500-', intensityNum: 1500, negative: 'suicidal tendency', ailment: "Alzheimer's disease" },
  { positive: 'rational, clear mind (awake)', intensity: '+1475-', intensityNum: 1475, negative: 'rebellious, undisciplined', ailment: 'insanity and/or partial paralysis' },
  { positive: 'compassion', intensity: '+1450-', intensityNum: 1450, negative: 'trust in no one, nothing; live in fear', ailment: 'amnesia' },
  { positive: 'selfless, helping type', intensity: '+1425-', intensityNum: 1425, negative: 'accepting self-defeat, brooding', ailment: 'arthritis' },
  { positive: 'detachment', intensity: '+1400-', intensityNum: 1400, negative: 'no-spine attitude', ailment: 'anaemia' },
  { positive: 'kind, merciful to a fault', intensity: '+1375-', intensityNum: 1375, negative: 'extreme possessiveness', ailment: 'psychosis and/or lung cancer' },
  { positive: 'divine solitude', intensity: '+1350-', intensityNum: 1350, negative: 'anger through frustration', ailment: 'internal bleeding' },
  { positive: 'dignified approach to life', intensity: '+1325-', intensityNum: 1325, negative: 'fruitless mental gymnastics', ailment: 'chronic bronchitis' },
  { positive: 'perception', intensity: '+1300-', intensityNum: 1300, negative: 'anger through confusion', ailment: 'pain, abscess in anus' },
  { positive: 'steadfast and honest', intensity: '+1275-', intensityNum: 1275, negative: 'cause mental torture and worry', ailment: 'alcoholism and/or TB' },
  { positive: 'tranquility of mind', intensity: '+1250-', intensityNum: 1250, negative: 'preserve all mental debris', ailment: 'fistula in anus' },
  { positive: 'detached-in-life, gyani or yogi', intensity: '+1225-', intensityNum: 1225, negative: 'a revolutionary, mean and self-seeking', ailment: 'severe backache; pain in joints' },
  { positive: 'equanimity', intensity: '+1200-', intensityNum: 1200, negative: 'irritation from remorse and guilt', ailment: 'unbearable itching' },
  { positive: 'very noble mind and pleasant nature', intensity: '+1175-', intensityNum: 1175, negative: 'aggressive, bullying, a moral coward', ailment: 'epilepsy' },
  { positive: 'mental voice', intensity: '+1150-', intensityNum: 1150, negative: 'self-condemning', ailment: 'unexplained pain in body and mind' },
  { positive: 'high mental capacity', intensity: '+1125-', intensityNum: 1125, negative: 'very dirty mind and nature', ailment: 'severe eye troubles' },
  { positive: 'intuitive mind centre', intensity: '+1100-', intensityNum: 1100, negative: 'non-trusting', ailment: 'deep anxiety' },
  { positive: 'creative, organized mind', intensity: '+1075-', intensityNum: 1075, negative: 'drive others insane', ailment: 'lumbago' },
  { positive: 'conscious of duties, obligations', intensity: '+1050-', intensityNum: 1050, negative: 'purposely create doubts, self-seeking', ailment: 'migraine' },
  { positive: 'inner vitality & light', intensity: '+1025-', intensityNum: 1025, negative: 'living, but dead', ailment: 'severe abdominal pains' },
  { positive: 'give happiness to others', intensity: '+1000-', intensityNum: 1000, negative: 'rigid, closed mind; obstinate', ailment: 'ulcers, severe pain' },
  { positive: 'alchemy', intensity: '+975-', intensityNum: 975, negative: 'gulping down words, anger', ailment: 'canker sores' },
  { positive: 'remove misunderstandings', intensity: '+950-', intensityNum: 950, negative: 'destructive tendencies; hatred', ailment: 'angina and heart pains' },
  { positive: 'ananda (bliss) in the centres', intensity: '+925-', intensityNum: 925, negative: 'long-standing pain, hurt, grief', ailment: 'cancer in various stages' },
  { positive: 'live harmoniously with all', intensity: '+900-', intensityNum: 900, negative: 'purposely cause embarrassment', ailment: 'hallucinations' },
  { positive: 'ascension', intensity: '+875-', intensityNum: 875, negative: 'anger due to personal injustice', ailment: 'carbuncle' },
  { positive: 'mind-over-matter type', intensity: '+850-', intensityNum: 850, negative: 'effeminate man and/or manly woman', ailment: 'meningitis' },
  { positive: 'aspiring to immortality', intensity: '+825-', intensityNum: 825, negative: 'feeling of being trapped', ailment: 'car-, bus-, plane-sickness' },
  { positive: 'trustworthy', intensity: '+800-', intensityNum: 800, negative: 'mean, purposely cause irritability', ailment: 'bad nerves, shaking hands' },
  { positive: 'goodness embodied', intensity: '+775-', intensityNum: 775, negative: 'selfish, inconsiderate', ailment: 'eccentricity' },
  { positive: 'soaring aspiration', intensity: '+750-', intensityNum: 750, negative: 'seeing future as dark', ailment: 'cataracts' },
  { positive: 'firm and resolute', intensity: '+725-', intensityNum: 725, negative: 'grave-digger mentality', ailment: 'pain in the joints' },
  { positive: 'beginning of realization', intensity: '+700-', intensityNum: 700, negative: 'mentally retreating', ailment: 'chills and cold' },
  { positive: 'discriminative and good', intensity: '+675-', intensityNum: 675, negative: 'brooding, back-accounting', ailment: 'acidity' },
  { positive: 'radiating peace in cells', intensity: '+650-', intensityNum: 650, negative: 'refusing to change', ailment: 'some chronic disease' },
  { positive: 'sweet-tempered', intensity: '+625-', intensityNum: 625, negative: 'intense greed, self-gain', ailment: 'amoebic dysentery' },
  { positive: 'perfect balance', intensity: '+600-', intensityNum: 600, negative: 'deliberately shut off joys of life', ailment: 'cholesterol' },
  { positive: 'calm and collected', intensity: '+575-', intensityNum: 575, negative: 'mental fog, stupid', ailment: 'obesity' },
  { positive: 'balance', intensity: '+550-', intensityNum: 550, negative: 'mental confusion, small hurts', ailment: 'colds' },
  { positive: 'positive, hopeful, bright outlook', intensity: '+525-', intensityNum: 525, negative: 'idiotic-depression, obsession', ailment: 'backward, sub-normal' },
  { positive: 'intimacy with divine', intensity: '+500-', intensityNum: 500, negative: 'impatience, annoyance all round', ailment: 'colic' },
  { positive: 'peaceful, avoid quarrels', intensity: '+475-', intensityNum: 475, negative: 'purposely cause fear, worry', ailment: 'blood and heart disorders' },
  { positive: 'consciousness turned to light', intensity: '+450-', intensityNum: 450, negative: 'feeling of oppression from parents', ailment: 'colitis' },
  { positive: 'righteous-pride mentality', intensity: '+425-', intensityNum: 425, negative: 'gambler, cheat', ailment: 'giddiness and severe half-headaches' },
  { positive: 'abolition of ego', intensity: '+400-', intensityNum: 400, negative: 'escaping fear and the unwanted', ailment: 'coma' },
  { positive: 'steady and able and good', intensity: '+375-', intensityNum: 375, negative: 'bitter, mental revenge-planning', ailment: 'hernias of different types' },
  { positive: 'self-respectful, kind and good', intensity: '+350-', intensityNum: 350, negative: 'prefer loneliness, avoid people', ailment: 'allergies of different types' },
  { positive: 'enlightened prudence', intensity: '+325-', intensityNum: 325, negative: 'do not like what one sees around', ailment: 'conjunctivitis' },
  { positive: 'avoid games of chance', intensity: '+300-', intensityNum: 300, negative: 'shameless, over-smart', ailment: 'palsy' },
  { positive: 'initiation', intensity: '+275-', intensityNum: 275, negative: 'stuck in past memory', ailment: 'constipation' },
  { positive: 'self-sacrificing', intensity: '+250-', intensityNum: 250, negative: 'sarcastic, fault-finding', ailment: 'phobias, skin eruptions' },
  { positive: 'intuitive knowledge', intensity: '+225-', intensityNum: 225, negative: 'feeling alone and scared', ailment: 'coronary thrombosis' },
  { positive: "go out of one's way to help", intensity: '+200-', intensityNum: 200, negative: 'hurt purposely by fault-finding', ailment: 'high or low blood pressure and disorders' },
  { positive: 'material continuity', intensity: '+175-', intensityNum: 175, negative: 'gripping tension', ailment: 'cramps' },
  { positive: 'mild-natured', intensity: '+150-', intensityNum: 150, negative: 'brutal-but-coward attitude', ailment: 'addictions of various types' },
  { positive: 'conversion of higher mind', intensity: '+125-', intensityNum: 125, negative: 'mental imbalance', ailment: "Cushing's disease" },
  { positive: 'forgiving', intensity: '+100-', intensityNum: 100, negative: 'revengeful', ailment: 'valve or hole in heart disorders' },
  { positive: 'mind of light in matter', intensity: '+75-', intensityNum: 75, negative: 'nursing hurts', ailment: 'cysts' },
  { positive: 'light without obscenity', intensity: '+50-', intensityNum: 50, negative: 'firm belief in hurts, and that no one cares', ailment: 'cystic fibrosis' },
  { positive: 'thirst to understand', intensity: '+25-', intensityNum: 25, negative: 'isolation, not wanting to', ailment: 'deafness' },
  { positive: 'peaceful transition', intensity: '0-15', intensityNum: 10, negative: 'total spiritual detachment / cessation', ailment: 'death' }
];

export default function LifePlannerLandingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<'all' | 'high' | 'mid' | 'low'>('all');

  const filteredData = useMemo(() => {
    let list = BREATH_FREQUENCY_DATA;

    if (filterTier === 'high') {
      list = list.filter(item => item.intensityNum >= 1500);
    } else if (filterTier === 'mid') {
      list = list.filter(item => item.intensityNum >= 750 && item.intensityNum < 1500);
    } else if (filterTier === 'low') {
      list = list.filter(item => item.intensityNum < 750);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => 
        item.ailment.toLowerCase().includes(q) ||
        item.positive.toLowerCase().includes(q) ||
        item.negative.toLowerCase().includes(q) ||
        item.intensity.toLowerCase().includes(q)
      );
    }

    return list;
  }, [searchQuery, filterTier]);

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-slate-50 text-slate-900 pb-20">
        {/* Top Header / Hero */}
        <section className="bg-gradient-to-br from-[#0b3d2e] via-[#166235] to-[#124e2c] text-white pt-8 pb-12 px-4 sm:px-6 relative overflow-hidden shadow-md">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_60%)] pointer-events-none" />

          <div className="max-w-5xl mx-auto space-y-4 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-bold text-amber-300">
              <Calendar className="w-3.5 h-3.5" />
              <span>Swar Yoga Life Planner (L-Plan)</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Life Planner &amp; Swar Breath Diagnostic Chart
            </h1>

            <p className="text-sm sm:text-base text-white/90 max-w-3xl leading-relaxed">
              Understand the subtle frequencies of breath, your mind&apos;s positive attributes, and the mental root causes of ailments. Align with Shiva Swarodaya to transform your health, daily routine, and life decisions.
            </p>

            {/* Quick Navigation Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              <Link
                href="/calendar"
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 transition flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-xs font-bold text-amber-300 mb-1">
                  <span>Swar Calendar</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
                <div className="text-[11px] text-white/80">Daily Lunar &amp; Solar Swar Timing</div>
              </Link>

              <Link
                href="/sadhana/live"
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 transition flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-xs font-bold text-emerald-300 mb-1">
                  <span>Live Sadhana</span>
                  <Flame className="w-3 h-3" />
                </div>
                <div className="text-[11px] text-white/80">Morning &amp; Evening Breath Timers</div>
              </Link>

              <Link
                href="/life-planner/dashboard"
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 transition flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-xs font-bold text-cyan-300 mb-1">
                  <span>Planner Dashboard</span>
                  <Layers className="w-3 h-3" />
                </div>
                <div className="text-[11px] text-white/80">Goals, Habits &amp; Vision Board</div>
              </Link>

              <Link
                href="/zoom-booking"
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 transition flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-xs font-bold text-amber-200 mb-1">
                  <span>Talk to Guruji</span>
                  <UserCheck className="w-3 h-3" />
                </div>
                <div className="text-[11px] text-white/80">1-on-1 Guidance with Mohan Sir</div>
              </Link>
            </div>
          </div>
        </section>

        {/* Breath Metrics Callout */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-6">
          <div className="rounded-2xl bg-white border border-emerald-100 shadow-xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
                <Wind className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Physical Breath Calibration Baseline</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Swar Science
                  </span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  <b>Warm and moist breath</b>, 14–17 breaths per minute, 4–7 fingers in length; breathing irregular vs aligned rhythm.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs text-slate-500 font-medium">
                {filteredData.length} Frequency Records
              </span>
            </div>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search disease, ailment, positive attribute, or intensity (e.g. migraine, cancer, anger)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setFilterTier('all')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  filterTier === 'all'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                All Intensities
              </button>
              <button
                onClick={() => setFilterTier('high')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  filterTier === 'high'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                High (+1500 to +2000)
              </button>
              <button
                onClick={() => setFilterTier('mid')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  filterTier === 'mid'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Mid (+750 to +1475)
              </button>
              <button
                onClick={() => setFilterTier('low')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  filterTier === 'low'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Low (Below +750)
              </button>
            </div>
          </div>

          {/* Table Container (Desktop & Tablet) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Positive Attributes (Sadhana Goal)</th>
                    <th className="py-3 px-3 text-center">Intensity</th>
                    <th className="py-3 px-4">Negative Attributes (Root Cause)</th>
                    <th className="py-3 px-4">Diseases / Ailments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((row, idx) => (
                    <tr 
                      key={idx}
                      className="hover:bg-emerald-50/50 transition-colors"
                    >
                      <td className="py-2.5 px-4 font-semibold text-emerald-800 capitalize">
                        {row.positive}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-extrabold text-amber-700 whitespace-nowrap bg-amber-50/50">
                        {row.intensity}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 capitalize">
                        {row.negative}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-red-700 capitalize">
                        {row.ailment}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card Stack */}
          <div className="space-y-2.5 md:hidden">
            {filteredData.map((row, idx) => (
              <div 
                key={idx}
                className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-extrabold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                    {row.intensity}
                  </span>
                  <span className="text-xs font-bold text-red-700 capitalize">
                    {row.ailment}
                  </span>
                </div>

                <div className="text-xs">
                  <span className="text-slate-400 font-semibold block text-[10px]">POSITIVE SADHANA ATTRIBUTE:</span>
                  <span className="font-bold text-emerald-800 capitalize">{row.positive}</span>
                </div>

                <div className="text-xs">
                  <span className="text-slate-400 font-semibold block text-[10px]">ROOT CAUSE NEGATIVE MENTAL TRAIT:</span>
                  <span className="text-slate-700 capitalize">{row.negative}</span>
                </div>
              </div>
            ))}
          </div>

          {filteredData.length === 0 && (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No matching breath records found</p>
              <p className="text-xs text-slate-500 mt-1">Try searching for a different ailment or mental attribute.</p>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
