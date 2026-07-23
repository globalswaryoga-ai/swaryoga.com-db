'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, Eye, EyeOff, BookMarked } from 'lucide-react';
import type { SignificatorHouse, SignificatorPlanet } from '@/lib/kpAstro/significators';
import { computeFreshTemplate, FORTUNA_HOUSE_MEANINGS, IMPROVING_BHAVAS, type MatterRule } from './bhavAutoFill';
import MatterRuleLibrary from './MatterRuleLibrary';

// Per-bhav (per-house) astrologer working sheet — the "Prediction Template":
// pick a Matter + its Primary House, the sub-lord chain auto-derives (sub
// lord -> its star -> that star's lord), then four conjunction/opposition
// blocks, ending in a manual Summary/Conclusion/Rule. Mirrors the
// astrologer's own reference spreadsheet field-for-field and row-for-row.

// The nine KP planets, in Vimshottari order — options for planet dropdowns.
const KP_PLANETS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];

// The 27 nakshatras, in standard order — derived from lib/kpAstro/subTable.json's
// unique `star` values (NOT lib/panchang.ts's NAKSHATRAS, which is built for
// Panchang/calendar use: wrong spellings, an extra "Abhijit," and missing "Revati").
const NAKSHATRAS = [
  'Ashvini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashīrsha', 'Ardra', 'Punarvasu', 'Pushya', 'Āshleshā',
  'Maghā', 'Pūrva Phalgunī', 'Uttara Phalgunī', 'Hasta', 'Chitra', 'Svati', 'Vishakha', 'Anuradha',
  'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhādrapadā', 'Revati',
];

const RETROGRADE_OPTIONS = ['Direct', 'Retrograde'];
const HOUSE_NUMBERS = Array.from({ length: 12 }, (_, i) => i + 1);

// Per-house color accents so each bhav box is visually distinct at a glance.
const HOUSE_COLORS: Record<number, { badge: string; border: string }> = {
  1:  { badge: 'bg-red-500 text-white',     border: 'border-red-300' },
  2:  { badge: 'bg-orange-500 text-white',  border: 'border-orange-300' },
  3:  { badge: 'bg-amber-500 text-white',   border: 'border-amber-300' },
  4:  { badge: 'bg-yellow-500 text-white',  border: 'border-yellow-300' },
  5:  { badge: 'bg-lime-600 text-white',    border: 'border-lime-300' },
  6:  { badge: 'bg-emerald-600 text-white', border: 'border-emerald-300' },
  7:  { badge: 'bg-teal-600 text-white',    border: 'border-teal-300' },
  8:  { badge: 'bg-cyan-600 text-white',    border: 'border-cyan-300' },
  9:  { badge: 'bg-sky-600 text-white',     border: 'border-sky-300' },
  10: { badge: 'bg-indigo-600 text-white',  border: 'border-indigo-300' },
  11: { badge: 'bg-violet-600 text-white',  border: 'border-violet-300' },
  12: { badge: 'bg-pink-600 text-white',    border: 'border-pink-300' },
};

export interface AspectBlock {
  present: string;          // 'Yes' | 'No' | ''
  planet: string;           // which planet, if present === 'Yes'
  planetRetrograde: string; // 'Direct' | 'Retrograde'
  starLordRetrograde: string; // 'Direct' | 'Retrograde' — of that planet's OWN star lord
  signification: string;    // auto text, editable override
  favorable: string;        // manual judgment — not auto-derivable
}

export interface PredictionTemplate {
  primaryHouse: number;
  subLordRetrograde: string;
  subLordStar: string;
  starLord: string;
  starLordRetrograde: string;
  starLordHouses: string;
  starLordConnecting: string;
  subLordConjunct: AspectBlock;
  starLordConjunct: AspectBlock;
  subLordOpposed: AspectBlock;
  starLordOpposed: AspectBlock;
  summary: string;
  conclusion: string;
  rule: string;
}

export interface BhavAnalysisRow {
  house: number;
  subLord: string;
  significatorsA: string[];
  significatorsB: string[];
  significatorsC: string[];
  significatorsD: string[];
  drishtiPlanets: string[];
  connectionPlanets: string[];
  subLordAbcdPlanets: string;
  subLordKaryeshBhav: string;
  subLordRahuKetuConnection: string;
  subLordDrishti: string;
  subLordConjunction: string;
  dashaChain: string;
  toolkitMatter: string;
  toolkitPrimaryHouse: string;
  toolkitSupportingHouses: string;
  toolkitOpposingHouses: string;
  cslRetrogradeStatus: string;
  cslStarLord: string;
  cslStarLordOwner: string;
  cslStarLordRetrogradeStatus: string;
  cslStarLordSignification: string;
  karyeshRuleResult: string;
  karyeshRuleConclusion: string;
  customMatters: Array<{ label: string; notes: string }>;
  positiveNotes: string;
  negativeNotes: string;
  dashaNotes: string;
  freeNotes: string;
  predictionOrder: number;
  includeInPrediction: boolean;
  predictionTemplate: PredictionTemplate;
}

function emptyAspectBlock(): AspectBlock {
  return { present: '', planet: '', planetRetrograde: '', starLordRetrograde: '', signification: '', favorable: '' };
}

function emptyPredictionTemplate(house: number): PredictionTemplate {
  return {
    primaryHouse: house,
    subLordRetrograde: '', subLordStar: '', starLord: '', starLordRetrograde: '',
    starLordHouses: '', starLordConnecting: '',
    subLordConjunct: emptyAspectBlock(),
    starLordConjunct: emptyAspectBlock(),
    subLordOpposed: emptyAspectBlock(),
    starLordOpposed: emptyAspectBlock(),
    summary: '', conclusion: '', rule: '',
  };
}

export function emptyBhavAnalysis(): BhavAnalysisRow[] {
  return Array.from({ length: 12 }, (_, i) => ({
    house: i + 1,
    subLord: '',
    significatorsA: [], significatorsB: [], significatorsC: [], significatorsD: [],
    drishtiPlanets: [], connectionPlanets: [],
    subLordAbcdPlanets: '', subLordKaryeshBhav: '', subLordRahuKetuConnection: '',
    subLordDrishti: '', subLordConjunction: '', dashaChain: '',
    toolkitMatter: '', toolkitPrimaryHouse: '', toolkitSupportingHouses: '', toolkitOpposingHouses: '',
    cslRetrogradeStatus: '', cslStarLord: '', cslStarLordOwner: '', cslStarLordRetrogradeStatus: '',
    cslStarLordSignification: '', karyeshRuleResult: '', karyeshRuleConclusion: '',
    customMatters: [],
    positiveNotes: '', negativeNotes: '', dashaNotes: '', freeNotes: '',
    predictionOrder: 0,
    includeInPrediction: true,
    predictionTemplate: emptyPredictionTemplate(i + 1),
  }));
}

function normalizeAspectBlock(found: any): AspectBlock {
  return {
    present: found?.present || '',
    planet: found?.planet || '',
    planetRetrograde: found?.planetRetrograde || '',
    starLordRetrograde: found?.starLordRetrograde || '',
    signification: found?.signification || '',
    favorable: found?.favorable || '',
  };
}

function normalizePredictionTemplate(found: any, house: number): PredictionTemplate {
  const pt = found?.predictionTemplate;
  const primaryHouse = Number(pt?.primaryHouse);
  return {
    primaryHouse: Number.isInteger(primaryHouse) && primaryHouse >= 1 && primaryHouse <= 12 ? primaryHouse : house,
    subLordRetrograde: pt?.subLordRetrograde || '',
    subLordStar: pt?.subLordStar || '',
    starLord: pt?.starLord || '',
    starLordRetrograde: pt?.starLordRetrograde || '',
    starLordHouses: pt?.starLordHouses || '',
    starLordConnecting: pt?.starLordConnecting || '',
    subLordConjunct: normalizeAspectBlock(pt?.subLordConjunct),
    starLordConjunct: normalizeAspectBlock(pt?.starLordConjunct),
    subLordOpposed: normalizeAspectBlock(pt?.subLordOpposed),
    starLordOpposed: normalizeAspectBlock(pt?.starLordOpposed),
    summary: pt?.summary || '',
    conclusion: pt?.conclusion || '',
    rule: pt?.rule || '',
  };
}

// Fills in missing houses / fields when loading a chart saved before this
// feature existed (or with a partially-filled array).
export function normalizeBhavAnalysis(rows: any[] | undefined): BhavAnalysisRow[] {
  const base = emptyBhavAnalysis();
  if (!Array.isArray(rows)) return base;
  return base.map((empty) => {
    const found = rows.find((r) => r?.house === empty.house);
    if (!found) return empty;
    return {
      house: empty.house,
      subLord: found.subLord || '',
      significatorsA: Array.isArray(found.significatorsA) ? found.significatorsA : [],
      significatorsB: Array.isArray(found.significatorsB) ? found.significatorsB : [],
      significatorsC: Array.isArray(found.significatorsC) ? found.significatorsC : [],
      significatorsD: Array.isArray(found.significatorsD) ? found.significatorsD : [],
      drishtiPlanets: Array.isArray(found.drishtiPlanets) ? found.drishtiPlanets : [],
      connectionPlanets: Array.isArray(found.connectionPlanets) ? found.connectionPlanets : [],
      subLordAbcdPlanets: found.subLordAbcdPlanets || '',
      subLordKaryeshBhav: found.subLordKaryeshBhav || '',
      subLordRahuKetuConnection: found.subLordRahuKetuConnection || '',
      subLordDrishti: found.subLordDrishti || '',
      subLordConjunction: found.subLordConjunction || '',
      dashaChain: found.dashaChain || '',
      toolkitMatter: found.toolkitMatter || '',
      toolkitPrimaryHouse: found.toolkitPrimaryHouse || '',
      toolkitSupportingHouses: found.toolkitSupportingHouses || '',
      toolkitOpposingHouses: found.toolkitOpposingHouses || '',
      cslRetrogradeStatus: found.cslRetrogradeStatus || '',
      cslStarLord: found.cslStarLord || '',
      cslStarLordOwner: found.cslStarLordOwner || '',
      cslStarLordRetrogradeStatus: found.cslStarLordRetrogradeStatus || '',
      cslStarLordSignification: found.cslStarLordSignification || '',
      karyeshRuleResult: found.karyeshRuleResult || '',
      karyeshRuleConclusion: found.karyeshRuleConclusion || '',
      customMatters: Array.isArray(found.customMatters) ? found.customMatters : [],
      positiveNotes: found.positiveNotes || '',
      negativeNotes: found.negativeNotes || '',
      dashaNotes: found.dashaNotes || '',
      freeNotes: found.freeNotes || '',
      predictionOrder: found.predictionOrder || 0,
      includeInPrediction: found.includeInPrediction !== false,
      predictionTemplate: normalizePredictionTemplate(found, empty.house),
    };
  });
}

const TOOLKIT_REFERENCE_CARDS = [
  {
    title: 'Fortuna Method',
    badge: 'Finance',
    lines: [
      'Formula: Lagna longitude + Moon longitude - Sun longitude.',
      'Fortuna improves the matters of the house it occupies.',
      'Good significators with good aspects to Fortuna give very good results.',
      'Bad significators with good aspects can give unfavorable results.',
      'Bad significators with bad aspects to Fortuna can reverse into good results.',
    ],
  },
  {
    title: 'Fortuna 12 Houses',
    badge: 'House results',
    lines: FORTUNA_HOUSE_MEANINGS,
  },
  {
    title: 'Malefic / Benefic',
    badge: 'Dasha filter',
    lines: [
      `Improving bhavas: ${IMPROVING_BHAVAS.join(', ')}.`,
      `Non-improving bhavas: ${HOUSE_NUMBERS.filter((h) => !IMPROVING_BHAVAS.includes(h)).join(', ')}.`,
      'Deposition is most important.',
      'A benefic Sun and Moon in a natal chart is an asset.',
      'Benefic planets can still do good in their periods even when linked to difficult houses.',
      'Malefic planets can still fail to give good results even when linked to improving houses.',
    ],
  },
  {
    title: 'Prediction Template',
    badge: 'CSL flow',
    lines: [
      'Select matter and primary house.',
      'Judge House Sub Lord, then CSL retrograde/direct.',
      'Check Star of CSL and Owner of Star of CSL.',
      'If CSL is retrograde, expect delay.',
      'If star owner is retrograde, treat as denial/weak delivery unless notes override.',
      'Use star-owner house signification for Result and Conclusion.',
    ],
  },
];

type KaryeshPlanet = SignificatorPlanet & { retrograde?: boolean; combust?: boolean };

function bhavLabel(house: number): string {
  return `${house}${house === 1 ? 'st' : house === 2 ? 'nd' : house === 3 ? 'rd' : 'th'} Bhav`;
}

// A row counts as "in use" only once the astrologer has actually typed into
// it — NOT once the chart's auto-fill has touched it. subLord, dashaChain,
// starLord, the aspect blocks' "present" flag, Rule, and now Summary (both
// auto-drafted, see composeBaseRule/composeBaseSummary in bhavAutoFill.ts)
// are all computed for every one of the 12 houses on every auto-fill pass
// regardless of which matter the astrologer cares about, so none of them can
// be used as the "in use" signal (that was the bug, three times now: it made
// every row look active). Matter/Conclusion/Favorable are the only fields
// auto-fill never touches.
function hasRowContent(row: BhavAnalysisRow): boolean {
  const pt = row.predictionTemplate;
  return Boolean(
    row.toolkitMatter.trim() || pt.conclusion.trim() ||
    [pt.subLordConjunct, pt.starLordConjunct, pt.subLordOpposed, pt.starLordOpposed].some((b) => b.favorable.trim())
  );
}

function ToolkitReferenceCards() {
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});

  return (
    <div className="border-b border-gray-200 bg-gray-50 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Toolkit Reference</div>
          <div className="text-[11px] text-gray-500">Small cards stay collapsed until needed.</div>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
      {TOOLKIT_REFERENCE_CARDS.map((card) => {
        const open = !!openCards[card.title];
        return (
          <div key={card.title} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setOpenCards((prev) => ({ ...prev, [card.title]: !open }))}
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-gray-50"
            >
              <div className="flex min-w-0 items-center gap-2">
                {open ? <ChevronDown className="h-4 w-4 shrink-0 text-indigo-600" /> : <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />}
                <span className="truncate text-sm font-semibold text-gray-900">{card.title}</span>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-bold text-white">
                {open ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {card.badge}
              </span>
            </button>
            {open && (
              <div className="max-h-72 overflow-y-auto border-t border-gray-200 px-4 py-3">
                <ul className="grid gap-2 text-xs leading-relaxed text-gray-600">
                  {card.lines.map((line) => <li key={line}>{line}</li>)}
                </ul>
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}

// One label/value row in the sheet-style template. `highlight` reproduces the
// astrologer's own reference sheet's color coding.
function SheetRow({
  label,
  children,
  hint,
  highlight,
}: {
  label: ReactNode;
  children: ReactNode;
  hint?: string;
  highlight?: 'yellow' | 'orange' | 'blue';
}) {
  const labelBg =
    highlight === 'yellow' ? 'bg-yellow-200' :
    highlight === 'orange' ? 'bg-amber-400' :
    highlight === 'blue' ? 'bg-sky-100' :
    'bg-gray-100';
  return (
    <div className="grid grid-cols-1 border-b border-gray-200 last:border-b-0 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className={`px-3 py-2.5 text-sm font-medium text-gray-800 ${labelBg}`}>{label}</div>
      <div className="px-3 py-2 bg-white">
        {children}
        {hint && <p className="mt-1 text-[11px] italic text-gray-400">{hint}</p>}
      </div>
    </div>
  );
}

function PlanetSelect({ value, onChange, className = '' }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 ${className}`}
    >
      <option value="">— select —</option>
      {KP_PLANETS.map((p) => <option key={p} value={p}>{p}</option>)}
      {value && !KP_PLANETS.includes(value) && <option value={value}>{value}</option>}
    </select>
  );
}

function StarSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
    >
      <option value="">— select —</option>
      {NAKSHATRAS.map((s) => <option key={s} value={s}>{s}</option>)}
      {value && !NAKSHATRAS.includes(value) && <option value={value}>{value}</option>}
    </select>
  );
}

function RetrogradeSelect({ value, onChange, className = '' }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 ${className}`}
    >
      <option value="">— select —</option>
      {RETROGRADE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
    </select>
  );
}

function YesNoSelect({ value, onChange, className = '' }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 ${className}`}
    >
      <option value="">— select —</option>
      <option value="Yes">Yes</option>
      <option value="No">No</option>
    </select>
  );
}

// The four repeated "Is X Conjunct/Opposed with any planet?" blocks — same
// shape, reused for sub lord's conjunctions, star lord's conjunctions, sub
// lord's oppositions, and star lord's oppositions.
function AspectBlockRows({
  subjectLabel,
  verb,
  block,
  onUpdate,
}: {
  subjectLabel: string; // e.g. "Sun" (the sub lord or star lord planet name), for the question text
  verb: 'Conjunct' | 'Opposed';
  block: AspectBlock;
  onUpdate: <K extends keyof AspectBlock>(field: K, value: AspectBlock[K]) => void;
}) {
  const questionText = verb === 'Conjunct'
    ? `Is ${subjectLabel || 'this planet'} Conjunct with any planet?`
    : `Is ${subjectLabel || 'this planet'} Opposed by any planet?`;
  return (
    <>
      <SheetRow label={questionText} highlight="yellow">
        <div className="flex flex-wrap items-center gap-2">
          <YesNoSelect value={block.present} onChange={(v) => onUpdate('present', v)} />
          {block.present === 'Yes' && (
            <PlanetSelect value={block.planet} onChange={(v) => onUpdate('planet', v)} />
          )}
        </div>
      </SheetRow>
      <SheetRow
        label={verb === 'Conjunct' ? 'Is the Conjunct planet retrograde?' : 'Is the opposed planet retrograde?'}
        hint="Matter will delay till planet turns direct. Safe to predict later."
      >
        <RetrogradeSelect value={block.planetRetrograde} onChange={(v) => onUpdate('planetRetrograde', v)} />
      </SheetRow>
      <SheetRow
        label={verb === 'Conjunct' ? 'Is the Star Lord of conjunct planet retrograde?' : "Is the Star Lord of the opposed planet retrograde?"}
        hint="Matter will deny. Safe to predict later."
      >
        <RetrogradeSelect value={block.starLordRetrograde} onChange={(v) => onUpdate('starLordRetrograde', v)} />
      </SheetRow>
      <SheetRow label={verb === 'Conjunct' ? 'Signification of Conjunct planet along with its starlord' : "Signification of the Opposed Planet and it's Star Lord"}>
        <input
          type="text"
          value={block.signification}
          onChange={(e) => onUpdate('signification', e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </SheetRow>
      <SheetRow label={verb === 'Conjunct' ? 'Is the Conjunct planet signifying favorable houses to the matter?' : "Is the signification of the opposed planet and it's star lord favorable?"}>
        <input
          type="text"
          value={block.favorable}
          onChange={(e) => onUpdate('favorable', e.target.value)}
          placeholder="Astrologer's judgment"
          className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </SheetRow>
    </>
  );
}

export default function BhavEditor({
  rows,
  onChange,
  houses = [],
  planets = [],
  matterRules = [],
  onMatterRulesChanged,
}: {
  rows: BhavAnalysisRow[];
  onChange: (rows: BhavAnalysisRow[]) => void;
  houses?: SignificatorHouse[];
  planets?: KaryeshPlanet[];
  matterRules?: MatterRule[];
  onMatterRulesChanged?: () => void;
}) {
  const [openHouse, setOpenHouse] = useState(1);
  // Slots the astrologer explicitly added this session but hasn't typed into
  // yet — kept visible until they either fill it in (then hasRowContent takes
  // over) or reload without saving anything into it.
  const [manuallyAdded, setManuallyAdded] = useState<Set<number>>(new Set());
  const [showRuleLibrary, setShowRuleLibrary] = useState(false);

  const contentHouses = rows.filter(hasRowContent).map((r) => r.house);
  const activeHouseSet = new Set<number>([...contentHouses, ...manuallyAdded]);
  if (activeHouseSet.size === 0) activeHouseSet.add(rows[0]?.house ?? 1);
  const activeRows = rows.filter((r) => activeHouseSet.has(r.house)).sort((a, b) => a.house - b.house);
  const unusedHouses = rows.map((r) => r.house).filter((h) => !activeHouseSet.has(h));

  const updateRow = <K extends keyof BhavAnalysisRow>(house: number, key: K, value: BhavAnalysisRow[K]) => {
    onChange(rows.map((r) => (r.house === house ? { ...r, [key]: value } : r)));
  };

  const updateTemplate = <K extends keyof PredictionTemplate>(house: number, key: K, value: PredictionTemplate[K]) => {
    onChange(rows.map((r) => (r.house === house ? { ...r, predictionTemplate: { ...r.predictionTemplate, [key]: value } } : r)));
  };

  // Changing the Primary House means the whole sub-lord/star-lord chain and
  // all four aspect blocks now describe a DIFFERENT house — recompute every
  // dependent field fresh instead of leaving the old house's values behind.
  const applyFreshTemplate = (house: number, newPrimaryHouse: number) => {
    const matter = rows.find((r) => r.house === house)?.toolkitMatter || '';
    const { subLord, predictionTemplate } = computeFreshTemplate(newPrimaryHouse, houses, planets, matter, matterRules);
    onChange(rows.map((r) => (r.house === house ? { ...r, subLord, predictionTemplate } : r)));
  };

  const updateAspectBlock = <K extends keyof AspectBlock>(
    house: number,
    blockKey: 'subLordConjunct' | 'starLordConjunct' | 'subLordOpposed' | 'starLordOpposed',
    field: K,
    value: AspectBlock[K]
  ) => {
    onChange(rows.map((r) => (r.house === house
      ? { ...r, predictionTemplate: { ...r.predictionTemplate, [blockKey]: { ...r.predictionTemplate[blockKey], [field]: value } } }
      : r)));
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Bhav Prediction Template</h3>
          <p className="mt-0.5 text-xs text-gray-500">Add a matter, complete the template, save, then generate final prediction.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRuleLibrary(true)}
            className="flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            <BookMarked className="h-3.5 w-3.5" /> Matter Rules
          </button>
          <div className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white">{activeRows.length} {activeRows.length === 1 ? 'matter' : 'matters'}</div>
        </div>
      </div>
      <ToolkitReferenceCards />
      <div className="space-y-2 p-3">
        {activeRows.map((row) => {
          const open = openHouse === row.house;
          const pt = row.predictionTemplate;
          const colors = HOUSE_COLORS[pt.primaryHouse] || HOUSE_COLORS[1];
          const hasConjOrOpp = [pt.subLordConjunct, pt.starLordConjunct, pt.subLordOpposed, pt.starLordOpposed].some((b) => b.present === 'Yes');

          return (
            <div key={row.house} className={`overflow-hidden rounded-xl border bg-white shadow-sm ${open ? colors.border : 'border-gray-200'}`}>
              <button
                type="button"
                onClick={() => setOpenHouse(open ? 0 : row.house)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {open ? <ChevronDown className="h-4 w-4 shrink-0 text-indigo-600" /> : <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />}
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${colors.badge}`}>{bhavLabel(pt.primaryHouse)}</span>
                  <span className="truncate text-sm font-medium text-gray-800">{row.toolkitMatter || 'Untitled matter'}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {row.predictionOrder > 0 && <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white">#{row.predictionOrder}</span>}
                  {row.subLord && <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">Sub: {row.subLord}</span>}
                  {hasConjOrOpp && <span className="hidden rounded-full bg-yellow-200 px-2.5 py-1 text-xs font-semibold text-yellow-800 sm:inline">Conj/Opp</span>}
                  {row.dashaChain && <span className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 sm:inline">{row.dashaChain}</span>}
                </div>
              </button>

              {open && (
                <div className="space-y-3 border-t border-gray-200 bg-white p-4">
                  {/* Utility bar — operational controls, not part of the sheet itself */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Maha-Antar-Vidasha</span>
                      <input
                        value={row.dashaChain}
                        onChange={(e) => updateRow(row.house, 'dashaChain', e.target.value)}
                        placeholder="Sun-Moon-Saturn"
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={row.includeInPrediction}
                        onChange={(e) => updateRow(row.house, 'includeInPrediction', e.target.checked)}
                        className="h-5 w-5 rounded border-gray-300 bg-white text-indigo-600 focus:ring-indigo-200"
                      />
                      <span className="text-sm text-gray-700">Use in prediction</span>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Order</span>
                      <input
                        type="number"
                        value={row.predictionOrder || ''}
                        onChange={(e) => updateRow(row.house, 'predictionOrder', Number(e.target.value) || 0)}
                        className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </label>
                  </div>

                  {/* The Prediction Template sheet — exact same row sequence as the reference spreadsheet */}
                  <div className="overflow-hidden rounded-xl border border-gray-300">
                    <SheetRow label="Matter">
                      <input
                        type="text"
                        value={row.toolkitMatter}
                        onChange={(e) => updateRow(row.house, 'toolkitMatter', e.target.value)}
                        placeholder="e.g. Marriage, Career, Health"
                        className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </SheetRow>
                    <SheetRow label="Primary House of Matter in Question" hint="Calculate fills the whole chain below from this house's chart data">
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={pt.primaryHouse}
                          onChange={(e) => applyFreshTemplate(row.house, Number(e.target.value))}
                          className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        >
                          {HOUSE_NUMBERS.map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={() => applyFreshTemplate(row.house, pt.primaryHouse)}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                        >
                          Calculate
                        </button>
                      </div>
                    </SheetRow>
                    <SheetRow label={`Sub Lord of the Primary House No.: ${pt.primaryHouse}`}>
                      <PlanetSelect value={row.subLord} onChange={(v) => updateRow(row.house, 'subLord', v)} />
                    </SheetRow>
                    <SheetRow label="Is Sub Lord Retrograde or Direct?">
                      <RetrogradeSelect value={pt.subLordRetrograde} onChange={(v) => updateTemplate(row.house, 'subLordRetrograde', v)} />
                    </SheetRow>
                    <SheetRow label="is deposited in which Star?">
                      <StarSelect value={pt.subLordStar} onChange={(v) => updateTemplate(row.house, 'subLordStar', v)} />
                    </SheetRow>
                    <SheetRow label="Star lord of the star?">
                      <PlanetSelect value={pt.starLord} onChange={(v) => updateTemplate(row.house, 'starLord', v)} />
                    </SheetRow>
                    <SheetRow label="Is retrograde?" hint="Matter will delay till planet turns direct. Safe to predict later.">
                      <RetrogradeSelect value={pt.starLordRetrograde} onChange={(v) => updateTemplate(row.house, 'starLordRetrograde', v)} />
                    </SheetRow>
                    <SheetRow label="is deposited in and owning houses?" hint="Deposition is more important than ownership">
                      <input
                        type="text"
                        value={pt.starLordHouses}
                        onChange={(e) => updateTemplate(row.house, 'starLordHouses', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </SheetRow>
                    <SheetRow label="Is connecting to 6, 8, 12?" hint="6, 8, 12 are afflicted houses">
                      <input
                        type="text"
                        value={pt.starLordConnecting}
                        onChange={(e) => updateTemplate(row.house, 'starLordConnecting', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </SheetRow>

                    <AspectBlockRows
                      subjectLabel={row.subLord}
                      verb="Conjunct"
                      block={pt.subLordConjunct}
                      onUpdate={(field, value) => updateAspectBlock(row.house, 'subLordConjunct', field, value)}
                    />
                    <AspectBlockRows
                      subjectLabel={pt.starLord}
                      verb="Conjunct"
                      block={pt.starLordConjunct}
                      onUpdate={(field, value) => updateAspectBlock(row.house, 'starLordConjunct', field, value)}
                    />
                    <AspectBlockRows
                      subjectLabel={row.subLord}
                      verb="Opposed"
                      block={pt.subLordOpposed}
                      onUpdate={(field, value) => updateAspectBlock(row.house, 'subLordOpposed', field, value)}
                    />
                    <AspectBlockRows
                      subjectLabel={pt.starLord}
                      verb="Opposed"
                      block={pt.starLordOpposed}
                      onUpdate={(field, value) => updateAspectBlock(row.house, 'starLordOpposed', field, value)}
                    />

                    <SheetRow label="Summary of the analysis" highlight="orange">
                      <textarea
                        value={pt.summary}
                        onChange={(e) => updateTemplate(row.house, 'summary', e.target.value)}
                        rows={2}
                        className="w-full resize-y rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </SheetRow>
                    <SheetRow label="Conclusion" highlight="blue">
                      <textarea
                        value={pt.conclusion}
                        onChange={(e) => updateTemplate(row.house, 'conclusion', e.target.value)}
                        rows={3}
                        className="w-full resize-y rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </SheetRow>
                    <SheetRow label="Rule" hint="Check rule book and enter rule below" highlight="blue">
                      <textarea
                        value={pt.rule}
                        onChange={(e) => updateTemplate(row.house, 'rule', e.target.value)}
                        rows={2}
                        className="w-full resize-y rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </SheetRow>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {unusedHouses.length > 0 && (
          <select
            value=""
            onChange={(e) => {
              const h = Number(e.target.value);
              if (!h) return;
              setManuallyAdded((prev) => new Set(prev).add(h));
              setOpenHouse(h);
            }}
            className="w-full rounded-xl border border-dashed border-indigo-300 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">+ Add Matter</option>
            {unusedHouses.map((h) => <option key={h} value={h}>{bhavLabel(h)}</option>)}
          </select>
        )}
      </div>
      <MatterRuleLibrary
        open={showRuleLibrary}
        onClose={() => setShowRuleLibrary(false)}
        rules={matterRules}
        onChanged={() => onMatterRulesChanged?.()}
      />
    </div>
  );
}
