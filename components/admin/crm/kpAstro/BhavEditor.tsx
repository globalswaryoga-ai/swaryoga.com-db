'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { computeConjunctions, computeDrishtiOnPlanets } from '@/lib/kpAstro/aspectAnalysis';
import { housesOccupiedBy, housesOwnedBy, starLordOf, type SignificatorHouse, type SignificatorPlanet } from '@/lib/kpAstro/significators';

// Per-bhav (per-house) astrologer working sheet. Each row stays editable so
// the astrologer can correct the auto-filled KP data before final prediction.

// The nine KP planets, in Vimshottari order — options for the Sub Lord dropdown.
const KP_PLANETS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];

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
  }));
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
    };
  });
}

const HOUSE_LABELS: Record<number, string> = {
  1: 'Self, personality, body', 2: 'Wealth, family, speech', 3: 'Siblings, courage, communication',
  4: 'Home, mother, property', 5: 'Children, education, romance', 6: 'Health, enemies, debts, service',
  7: 'Marriage, partnerships', 8: 'Longevity, obstacles, transformation', 9: 'Fortune, father, higher learning',
  10: 'Career, status, profession', 11: 'Gains, income, elder siblings', 12: 'Loss, expenditure, foreign, moksha',
};

const TOOLKIT_RULE_FIELDS = [
  'Matter',
  'Primary House of Matter',
  'House Sub Lord (CSL)',
  'CSL Retrograde or Direct',
  'Star of CSL',
  'Owner of Star of CSL',
  'Star of CSL Retrograde or Direct',
  'Signification by Owner of Star of CSL',
  'Result',
  'Conclusion',
];

const FORTUNA_HOUSE_MEANINGS = [
  '1: fortunate in enterprise, industry, effort, confidence, career',
  '2: property, business, bank balance, domestic happiness, status',
  '3: brothers, short journeys, agency, publication, advisory work',
  '4: patrimony, savings, landed property, mines, minerals, hidden treasure',
  '5: sports, cinema, music, children, speculation, share market',
  '6: cattle, pets, uncle/aunt support, small banking, overdraft facility',
  '7: partner, spouse, contracts, litigation, public organizations',
  '8: will, insurance, gratuity, bonus, partner lump sum money',
  '9: long journeys, foreign contracts, publishing, education, legal/spiritual service',
  '10: service gains, quick status rise, strong professional money',
  '11: friends, brothers, profitable business, high society support, fulfilled desires',
  '12: unknown sources, purchases/sales luck, investments, gains through hidden matters',
];

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
      'Improving bhavas: 1, 2, 3, 6, 10, 11.',
      'Non-improving bhavas: 4, 5, 7, 8, 9, 12.',
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

function TextCell({ value, onChange, placeholder, rows = 2 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full resize-y rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-xs leading-relaxed text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
    />
  );
}

function FieldBox({ label, children, tone = 'slate' }: { label: string; children: ReactNode; tone?: 'slate' | 'indigo' | 'emerald' | 'red' }) {
  const toneClass = {
    slate: 'bg-gray-50 border-gray-200 text-gray-600',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  }[tone];

  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide">{label}</div>
      {children}
    </div>
  );
}

function InputCell({ value, onChange, placeholder, accent = 'slate' }: { value: string; onChange: (v: string) => void; placeholder?: string; accent?: 'slate' | 'yellow' | 'red' }) {
  const accentClass = {
    slate: 'border-gray-300 text-gray-800 focus:border-indigo-400',
    yellow: 'border-amber-300 text-gray-800 focus:border-amber-400',
    red: 'border-red-300 text-gray-800 focus:border-red-400',
  }[accent];

  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 ${accentClass}`}
    />
  );
}

function bhavLabel(house: number): string {
  return `${house}${house === 1 ? 'st' : house === 2 ? 'nd' : house === 3 ? 'rd' : 'th'} Bhav`;
}

function rowProgress(row: BhavAnalysisRow): { done: number; total: number } {
  const fields = [
    row.subLord,
    row.subLordKaryeshBhav,
    row.toolkitMatter,
    row.cslRetrogradeStatus,
    row.cslStarLord,
    row.cslStarLordOwner,
    row.cslStarLordSignification,
    row.karyeshRuleResult,
    row.karyeshRuleConclusion,
  ];
  return { done: fields.filter(Boolean).length, total: fields.length };
}

function houseList(values: number[]): string {
  return values.length ? values.join(', ') : '-';
}

function parseHouseNumbers(value: string): number[] {
  return [...value.matchAll(/\d+/g)]
    .map((match) => Number(match[0]))
    .filter((n) => n >= 1 && n <= 12);
}

function intersect(a: number[], b: number[]): number[] {
  const bSet = new Set(b);
  return [...new Set(a.filter((value) => bSet.has(value)))].sort((x, y) => x - y);
}

function KaryeshDataPill({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'yellow' | 'emerald' | 'red' }) {
  const toneClass = {
    slate: 'border-gray-200 bg-gray-50 text-gray-700',
    yellow: 'border-amber-200 bg-amber-50 text-amber-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    red: 'border-red-200 bg-red-50 text-red-800',
  }[tone];

  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClass}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1 min-h-[18px] text-xs font-semibold leading-snug">{value || '-'}</div>
    </div>
  );
}

function ManagedKaryeshView({
  row,
  houses,
  planets,
  onApplySuggestion,
}: {
  row: BhavAnalysisRow;
  houses: SignificatorHouse[];
  planets: KaryeshPlanet[];
  onApplySuggestion: (result: string) => void;
}) {
  const house = houses.find((h) => h.house === row.house);
  const subLordPlanet = planets.find((p) => p.planet === row.subLord);
  const derivedStarOwner = subLordPlanet ? starLordOf(subLordPlanet) : undefined;
  const starOwner = row.cslStarLordOwner || derivedStarOwner || '';
  const starOwnerPlanet = planets.find((p) => p.planet === starOwner);
  const subLordOccupied = housesOccupiedBy(planets, row.subLord);
  const subLordOwned = housesOwnedBy(houses, row.subLord);
  const starOwnerOccupied = housesOccupiedBy(planets, starOwner);
  const starOwnerOwned = housesOwnedBy(houses, starOwner);
  const starOwnerHouses = [...new Set([...starOwnerOccupied, ...starOwnerOwned])].sort((a, b) => a - b);
  const supporting = parseHouseNumbers(row.toolkitSupportingHouses);
  const opposing = parseHouseNumbers(row.toolkitOpposingHouses);
  const supportingHits = intersect(starOwnerHouses, supporting);
  const opposingHits = intersect(starOwnerHouses, opposing);
  const conjunctions = computeConjunctions(planets)
    .filter((c) => c.planetA === row.subLord || c.planetB === row.subLord)
    .map((c) => `${c.planetA === row.subLord ? c.planetB : c.planetA} (${c.separation.toFixed(1)} deg)`);
  const drishti = computeDrishtiOnPlanets(planets)
    .filter((d) => d.from === row.subLord || d.to === row.subLord)
    .map((d) => d.from === row.subLord ? `${d.from} -> ${d.to} (H${d.toHouse})` : `${d.from} -> ${d.to} (H${d.toHouse})`);
  const suggestedResult = supportingHits.length && !opposingHits.length
    ? `Supports matter through houses ${houseList(supportingHits)}`
    : opposingHits.length && !supportingHits.length
      ? `Denial/delay through houses ${houseList(opposingHits)}`
      : supportingHits.length && opposingHits.length
        ? `Mixed: supports ${houseList(supportingHits)}, opposes ${houseList(opposingHits)}`
        : starOwnerHouses.length
          ? `Judge manually from star-owner houses ${houseList(starOwnerHouses)}`
          : 'Need CSL/star-owner data';

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Managed Karyesh View</div>
          <div className="text-[11px] text-gray-500">Generated from saved chart data and editable Bhav fields.</div>
        </div>
        <span className="rounded-full border border-gray-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600">Bhav {row.house}</span>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <KaryeshDataPill label="Bhav Sign" value={house?.sign || '-'} />
        <KaryeshDataPill label="Bhav Sub Lord" value={row.subLord || house?.subLord || '-'} tone="yellow" />
        <KaryeshDataPill label="Sub Lord R/D" value={row.cslRetrogradeStatus || (subLordPlanet ? (subLordPlanet.retrograde ? 'Retrograde' : 'Direct') : '-')} />
        <KaryeshDataPill label="CSL Star Lord" value={row.cslStarLord || subLordPlanet?.star || '-'} />
        <KaryeshDataPill label="Owner of Star" value={starOwner || '-'} tone="yellow" />
        <KaryeshDataPill label="Star Owner R/D" value={row.cslStarLordRetrogradeStatus || (starOwnerPlanet ? (starOwnerPlanet.retrograde ? 'Retrograde' : 'Direct') : '-')} />
        <KaryeshDataPill label="Sub Lord In / Owns" value={`In ${houseList(subLordOccupied)}; owns ${houseList(subLordOwned)}`} />
        <KaryeshDataPill label="Star Owner In / Owns" value={`In ${houseList(starOwnerOccupied)}; owns ${houseList(starOwnerOwned)}`} />
        <KaryeshDataPill label="Conjunction" value={conjunctions.join('; ') || row.subLordConjunction || '-'} />
        <KaryeshDataPill label="Opposition / Drishti" value={drishti.join('; ') || row.subLordDrishti || '-'} />
        <KaryeshDataPill label="Favorable Hits" value={houseList(supportingHits)} tone={supportingHits.length ? 'emerald' : 'slate'} />
        <KaryeshDataPill label="Denial Hits" value={houseList(opposingHits)} tone={opposingHits.length ? 'red' : 'slate'} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
        <div>
          <span className="font-semibold text-indigo-700">Suggested result: </span>{suggestedResult}
        </div>
        <button
          type="button"
          onClick={() => onApplySuggestion(suggestedResult)}
          className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-700"
        >
          Apply
        </button>
      </div>
    </div>
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

export default function BhavEditor({
  rows,
  onChange,
  houses = [],
  planets = [],
}: {
  rows: BhavAnalysisRow[];
  onChange: (rows: BhavAnalysisRow[]) => void;
  houses?: SignificatorHouse[];
  planets?: KaryeshPlanet[];
}) {
  const [openHouse, setOpenHouse] = useState(1);

  const updateRow = <K extends keyof BhavAnalysisRow>(house: number, key: K, value: BhavAnalysisRow[K]) => {
    onChange(rows.map((r) => (r.house === house ? { ...r, [key]: value } : r)));
  };

  const applyKaryeshSuggestion = (house: number, result: string) => {
    onChange(rows.map((r) => (r.house === house ? { ...r, karyeshRuleResult: result, karyeshRuleConclusion: r.karyeshRuleConclusion || result } : r)));
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">12 Bhav Working Dropdowns</h3>
          <p className="mt-0.5 text-xs text-gray-500">Open one Bhav, complete Karyesh logic, save, then generate final prediction.</p>
        </div>
        <div className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white">12 bhavs</div>
      </div>
      <ToolkitReferenceCards />
      <div className="space-y-2 p-3">
        {rows.map((row) => {
          const open = openHouse === row.house;
          const progress = rowProgress(row);
          const isReady = progress.done >= 7 || Boolean(row.karyeshRuleConclusion);

          const colors = HOUSE_COLORS[row.house] || HOUSE_COLORS[1];

          return (
            <div key={row.house} className={`overflow-hidden rounded-xl border bg-white shadow-sm ${open ? colors.border : 'border-gray-200'}`}>
              <button
                type="button"
                onClick={() => setOpenHouse(open ? 0 : row.house)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {open ? <ChevronDown className="h-4 w-4 shrink-0 text-indigo-600" /> : <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />}
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${colors.badge}`}>{bhavLabel(row.house)}</span>
                  <span className="truncate text-sm font-medium text-gray-800">{HOUSE_LABELS[row.house]}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`hidden rounded-full px-2.5 py-1 text-xs font-bold sm:inline ${isReady ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {progress.done}/{progress.total}
                  </span>
                  {row.predictionOrder > 0 && <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white">#{row.predictionOrder}</span>}
                  {row.subLord && <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">Sub: {row.subLord}</span>}
                  {row.dashaChain && <span className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 sm:inline">{row.dashaChain}</span>}
                </div>
              </button>

              {open && (
                <div className="space-y-3 border-t border-gray-200 bg-white p-4">
                  <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
                    <FieldBox label="Sub Lord Planet" tone="indigo">
                      <select
                        value={row.subLord}
                        onChange={(e) => updateRow(row.house, 'subLord', e.target.value)}
                        className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      >
                        <option value="">— select —</option>
                        {KP_PLANETS.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                        {row.subLord && !KP_PLANETS.includes(row.subLord) && (
                          <option value={row.subLord}>{row.subLord}</option>
                        )}
                      </select>
                    </FieldBox>
                    <FieldBox label="Maha-Antar-Vidasha">
                      <InputCell
                        value={row.dashaChain}
                        onChange={(v) => updateRow(row.house, 'dashaChain', v)}
                        placeholder="Sun-Moon-Saturn"
                      />
                    </FieldBox>
                    <FieldBox label="Use">
                      <div className="flex h-[38px] items-center justify-center">
                        <input
                          type="checkbox"
                          checked={row.includeInPrediction}
                          onChange={(e) => updateRow(row.house, 'includeInPrediction', e.target.checked)}
                          className="h-5 w-5 rounded border-gray-300 bg-white text-indigo-600 focus:ring-indigo-200"
                        />
                      </div>
                    </FieldBox>
                    <FieldBox label="Order">
                      <input
                        type="number"
                        value={row.predictionOrder || ''}
                        onChange={(e) => updateRow(row.house, 'predictionOrder', Number(e.target.value) || 0)}
                        className="w-20 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </FieldBox>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    <FieldBox label="Sub Lord ABCD Planets" tone="indigo">
                      <TextCell value={row.subLordAbcdPlanets} onChange={(v) => updateRow(row.house, 'subLordAbcdPlanets', v)} rows={3} />
                    </FieldBox>
                    <FieldBox label="Sub Lord Karyesh Bhav - ABCD" tone="indigo">
                      <TextCell value={row.subLordKaryeshBhav} onChange={(v) => updateRow(row.house, 'subLordKaryeshBhav', v)} rows={3} />
                    </FieldBox>
                  </div>

                  <ManagedKaryeshView row={row} houses={houses} planets={planets} onApplySuggestion={(result) => applyKaryeshSuggestion(row.house, result)} />

                  <div className="overflow-hidden rounded-xl border border-indigo-200 bg-indigo-50/40">
                    <div className="border-b border-indigo-100 bg-indigo-50 px-3 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Toolkit Rule Template</div>
                        <div className="mt-1 text-[11px] text-gray-500">{TOOLKIT_RULE_FIELDS.join(' -> ')}</div>
                      </div>
                      <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white">Karyesh logic</span>
                    </div>
                    </div>
                    <div className="space-y-3 p-3">
                    <div className="grid gap-3 lg:grid-cols-3">
                      <FieldBox label="Matter / Event" tone="indigo">
                        <InputCell
                          value={row.toolkitMatter}
                          onChange={(v) => updateRow(row.house, 'toolkitMatter', v)}
                          placeholder="Marriage, Job, Stock, Health..."
                          accent="yellow"
                        />
                      </FieldBox>
                      <FieldBox label="Primary House">
                        <InputCell
                          value={row.toolkitPrimaryHouse}
                          onChange={(v) => updateRow(row.house, 'toolkitPrimaryHouse', v)}
                          placeholder={`${row.house}`}
                        />
                      </FieldBox>
                      <FieldBox label="Supporting Houses">
                        <InputCell
                          value={row.toolkitSupportingHouses}
                          onChange={(v) => updateRow(row.house, 'toolkitSupportingHouses', v)}
                          placeholder="2, 7, 11"
                        />
                      </FieldBox>
                    </div>
                    <div className="mt-3 grid gap-3 lg:grid-cols-4">
                      <FieldBox label="Opposing / Denial Houses" tone="red">
                        <InputCell
                          value={row.toolkitOpposingHouses}
                          onChange={(v) => updateRow(row.house, 'toolkitOpposingHouses', v)}
                          placeholder="1, 6, 10, 12"
                          accent="red"
                        />
                      </FieldBox>
                      <FieldBox label="CSL R/D">
                        <InputCell
                          value={row.cslRetrogradeStatus}
                          onChange={(v) => updateRow(row.house, 'cslRetrogradeStatus', v)}
                          placeholder="Direct / Retrograde"
                        />
                      </FieldBox>
                      <FieldBox label="Star of CSL">
                        <InputCell
                          value={row.cslStarLord}
                          onChange={(v) => updateRow(row.house, 'cslStarLord', v)}
                        />
                      </FieldBox>
                      <FieldBox label="Owner of Star">
                        <InputCell
                          value={row.cslStarLordOwner}
                          onChange={(v) => updateRow(row.house, 'cslStarLordOwner', v)}
                        />
                      </FieldBox>
                    </div>
                    <div className="mt-3 grid gap-3 lg:grid-cols-3">
                      <FieldBox label="Star Owner R/D">
                        <InputCell
                          value={row.cslStarLordRetrogradeStatus}
                          onChange={(v) => updateRow(row.house, 'cslStarLordRetrogradeStatus', v)}
                          placeholder="Direct / Retrograde"
                        />
                      </FieldBox>
                      <FieldBox label="Owner Signification">
                        <TextCell value={row.cslStarLordSignification} onChange={(v) => updateRow(row.house, 'cslStarLordSignification', v)} rows={3} />
                      </FieldBox>
                      <FieldBox label="Rule Result" tone="emerald">
                        <TextCell value={row.karyeshRuleResult} onChange={(v) => updateRow(row.house, 'karyeshRuleResult', v)} rows={3} />
                      </FieldBox>
                    </div>
                    <div className="mt-3">
                      <FieldBox label="Rule Conclusion" tone="emerald">
                        <TextCell value={row.karyeshRuleConclusion} onChange={(v) => updateRow(row.house, 'karyeshRuleConclusion', v)} rows={3} />
                      </FieldBox>
                    </div>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-3">
                    <FieldBox label="Rahu/Ketu Connection">
                      <TextCell value={row.subLordRahuKetuConnection} onChange={(v) => updateRow(row.house, 'subLordRahuKetuConnection', v)} rows={3} />
                    </FieldBox>
                    <FieldBox label="Sub Lord Drishti">
                      <TextCell value={row.subLordDrishti} onChange={(v) => updateRow(row.house, 'subLordDrishti', v)} rows={3} />
                    </FieldBox>
                    <FieldBox label="Conjunction - Planet & Degree">
                      <TextCell value={row.subLordConjunction} onChange={(v) => updateRow(row.house, 'subLordConjunction', v)} rows={3} />
                    </FieldBox>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-3">
                    <FieldBox label="Positive Notes" tone="emerald">
                      <TextCell value={row.positiveNotes} onChange={(v) => updateRow(row.house, 'positiveNotes', v)} rows={3} />
                    </FieldBox>
                    <FieldBox label="Negative Notes" tone="red">
                      <TextCell value={row.negativeNotes} onChange={(v) => updateRow(row.house, 'negativeNotes', v)} rows={3} />
                    </FieldBox>
                    <FieldBox label="Dasha Cross Notes">
                      <TextCell value={row.dashaNotes} onChange={(v) => updateRow(row.house, 'dashaNotes', v)} rows={3} />
                    </FieldBox>
                  </div>

                  <FieldBox label="Prediction Notes">
                    <TextCell value={row.freeNotes} onChange={(v) => updateRow(row.house, 'freeNotes', v)} rows={4} />
                  </FieldBox>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
