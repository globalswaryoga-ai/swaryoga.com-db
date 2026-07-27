'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Loader2, Sparkles, ChevronDown, ChevronUp, Telescope } from 'lucide-react';
import { PageHeader } from '@/components/admin/crm';
import { useAuth } from '@/hooks/useAuth';
import DashaDrillDown, { type DashaRow } from '@/components/admin/crm/kpAstro/DashaDrillDown';
import EventTimingPanel from '@/components/admin/crm/kpAstro/EventTimingPanel';
import { computeFourStepSignificators, type SignificatorHouse, type SignificatorPlanet } from '@/lib/kpAstro/significators';

interface ChartListItem {
  _id: string;
  personName: string;
}

interface GocharMatch {
  date: string;
  matchStrength: number;
  sign: string;
}

const GOCHAR_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Rahu', 'Ketu'];

interface NatalCheck {
  verdict: 'promised' | 'denied' | 'mixed' | 'unclear' | 'no-csl';
  csl?: string;
  signifiedHouses: number[];
  promiseMatches: number[];
  denialMatches: number[];
}

type PlanetNature = 'Benefic' | 'Malefic' | 'Neutral';
type ObstructionSeverity = 'strong' | 'moderate' | 'mild';

interface DeepestLevelDenial {
  obstructed: boolean;
  planet?: string;
  planetNature?: PlanetNature;
  severity?: ObstructionSeverity;
  matchedDenialHouses: number[];
}

interface ConfirmingBhukti {
  planet: string;
  startDate: string;
  endDate: string;
}

interface MatterMatch {
  ruleId: string;
  category: string;
  subMatter: string;
  primaryHouse?: number | null;
  promiseHouses: number[];
  denialHouses: number[];
  natal: NatalCheck;
  chain: { matchedCount: number; totalLevels: number; matchedPlanets: string[]; matchedPlanetNatures: Record<string, PlanetNature> };
  deepestLevelDenial: DeepestLevelDenial;
  confirmingBhuktis?: ConfirmingBhukti[];
}

const SEVERITY_STYLE: Record<ObstructionSeverity, string> = {
  strong: 'bg-red-600 text-white',
  moderate: 'bg-orange-500 text-white',
  mild: 'bg-amber-100 text-amber-700',
};
const SEVERITY_LABEL: Record<ObstructionSeverity, string> = {
  strong: 'NOT possible this period',
  moderate: 'Obstructed this period',
  mild: 'Some obstruction (mild)',
};

interface MahaOverviewRow {
  planet: string;
  startDate: string;
  endDate: string;
  matches: MatterMatch[];
}

const VERDICT_STYLE: Record<NatalCheck['verdict'], string> = {
  promised: 'bg-emerald-100 text-emerald-700',
  denied: 'bg-red-100 text-red-700',
  mixed: 'bg-amber-100 text-amber-700',
  unclear: 'bg-gray-100 text-gray-500',
  'no-csl': 'bg-gray-100 text-gray-400',
};
const VERDICT_LABEL: Record<NatalCheck['verdict'], string> = {
  promised: 'Promised natally',
  denied: 'Denied natally',
  mixed: 'Mixed signal',
  unclear: 'Unclear',
  'no-csl': 'CSL not recorded',
};

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

const LEVEL_LABEL: Record<DashaRow['level'], string> = {
  maha: 'Dasha',
  antar: 'Bhukti',
  pratyantar: 'Antara',
  sookshma: 'Pran Antara (Sookshma)',
  prana: 'Pran Antara (Prana)',
};

// Match the gochar (transit) planet's own cycle speed to how broad the
// currently-selected window is -- a planet can only discriminate "which part
// of this window" if it completes noticeably MORE than one full 12-house
// cycle within that window's span, otherwise every sub-part looks identical
// to it:
//   - Dasha alone selected (a broad ~6-20 YEAR window): Sun/Moon are far too
//     fast -- Sun repeats its full 12-sign cycle every single year regardless,
//     so it can't tell one year of a 15-year Dasha from another. Jupiter
//     (~1 year/sign, ~12-year full cycle) and Saturn (~2.5 years/sign,
//     ~29.5-year full cycle) are the correct slow-movers here -- each only
//     transits the SAME house once or twice across a typical Mahadasha, so
//     the year(s) it does so are the real candidates.
//   - Bhukti selected (narrowed to a window of MONTHS): Sun (a ~1-year cycle)
//     is now fine-grained enough to point at specific months within it.
//   - Antara or deeper selected (narrowed to WEEKS/DAYS): Moon (~27-28 day
//     cycle) narrows to specific days, and the transiting Lagna (~2 hours/
//     sign) narrows a chosen day down to the hour -- both already computed
//     by the Event Timing tool below.
function gocharGuidanceFor(levelCount: number): string {
  if (levelCount <= 1) return "This Dasha spans years, so Sun/Moon (which cycle yearly/monthly regardless) can't tell one year from another. Jupiter (~1 year per sign) and Saturn (~2.5 years per sign) are the correct check here — whichever year(s) they transit the karyesh houses below are the real candidate years within this Dasha.";
  if (levelCount === 2) return "Now narrowed to a Bhukti (months-scale) window — Sun's transit (cycles all 12 signs in ~1 year) is fine-grained enough to point at specific months within it.";
  return "Now narrowed to weeks/days — Moon's transit (cycles all 12 signs in ~27-28 days) narrows to specific days, and the transiting Lagna (changes sign every ~2 hours) narrows a chosen day down to the hour — both already run by the Event Timing tool below.";
}

interface RunningLevelInfo {
  row: DashaRow;
  A: number[];
  B: number[];
  C: number[];
  D: number[];
  combined: number[];
}

function formatHouses(list: number[]): string {
  return list.length ? [...new Set(list)].sort((a, b) => a - b).join(',') : '—';
}

function MatterMatchRow({ m, onJumpToBhukti }: { m: MatterMatch; onJumpToBhukti?: (bhukti: ConfirmingBhukti) => void }) {
  const denial = m.deepestLevelDenial;
  return (
    <div className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 ${denial.obstructed && denial.severity === 'strong' ? 'border-red-200 bg-red-50/60' : 'border-gray-100 bg-gray-50/60'}`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-800">{m.subMatter}</span>
          <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-400 ring-1 ring-gray-200">{m.category}</span>
          {m.chain.matchedCount >= 2 && (
            <span className="flex items-center gap-0.5 text-amber-500" title={`${m.chain.matchedCount}/${m.chain.totalLevels} running levels agree`}>
              {Array.from({ length: m.chain.matchedCount }).map((_, i) => <Sparkles key={i} className="h-3 w-3" />)}
            </span>
          )}
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${VERDICT_STYLE[m.natal.verdict]}`}>
            {VERDICT_LABEL[m.natal.verdict]}
          </span>
          {denial.obstructed && denial.severity && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${SEVERITY_STYLE[denial.severity]}`}>
              ⚠ {SEVERITY_LABEL[denial.severity]}
            </span>
          )}
        </div>
        <p className="mt-1 text-[11px] text-gray-500">
          Promise: <span className="font-mono">{m.promiseHouses.join(',')}</span>
          {m.denialHouses.length > 0 && <> · Denial: <span className="font-mono">{m.denialHouses.join(',')}</span></>}
          {' · '}Running match: <span className="font-mono">
            {m.chain.matchedPlanets.map((p) => `${p}${m.chain.matchedPlanetNatures[p] ? ` (${m.chain.matchedPlanetNatures[p]})` : ''}`).join(', ') || '—'}
          </span>
          {m.natal.csl && <> · {m.primaryHouse}H CSL: <span className="font-mono">{m.natal.csl}</span></>}
        </p>
        {denial.obstructed && (
          <p className="mt-1 text-[11px] font-medium text-red-700">
            {denial.planet} (deepest selected level, {denial.planetNature}) also signifies denial house(s) {denial.matchedDenialHouses.join(',')} —
            {denial.severity === 'strong' ? ' a malefic on the denial houses blocks this matter in this specific period even though it is promised overall.' : ' a caution flag, not a hard block.'}
          </p>
        )}
        {m.confirmingBhuktis && (
          m.confirmingBhuktis.length > 0 ? (
            <p className="mt-1 text-[11px] text-emerald-700">
              <span className="font-semibold">Confirmed in Bhukti:</span>{' '}
              {m.confirmingBhuktis.map((b, i) => (
                <span key={i}>
                  {i > 0 && ', '}
                  {onJumpToBhukti ? (
                    <button
                      type="button"
                      onClick={() => onJumpToBhukti(b)}
                      className="font-semibold underline decoration-dotted hover:text-emerald-900"
                      title="Jump to this Bhukti in the drill-down below"
                    >
                      {b.planet}
                    </button>
                  ) : (
                    b.planet
                  )}{' '}
                  ({formatDate(b.startDate)}–{formatDate(b.endDate)})
                </span>
              ))}
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-gray-400">
              No specific Bhukti within this Mahadasha confirms it yet — drill into Antara/Pran Antara below to check further.
            </p>
          )
        )}
      </div>
    </div>
  );
}

// Per-level time window + karyesh (A/B/C/D significator) breakdown for the
// currently drilled-into chain, plus the combined houses across all selected
// levels and level-appropriate gochar guidance.
function RunningChainCard({ levels }: { levels: RunningLevelInfo[] }) {
  if (levels.length === 0) return null;
  const combinedHouses = [...new Set(levels.flatMap((l) => l.combined))].sort((a, b) => a - b);

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800">
        <Telescope className="h-4 w-4 text-indigo-500" />
        Running Chain — Time Period &amp; Karyesh Houses
      </h3>
      <div className="space-y-2">
        {levels.map(({ row, A, B, C, D, combined }) => (
          <div key={`${row.level}-${row.planet}-${row.parentPath}`} className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-bold text-indigo-700">{LEVEL_LABEL[row.level]}: {row.planet}</span>
              <span className="text-xs text-gray-500">{formatDate(row.startDate)} – {formatDate(row.endDate)}</span>
            </div>
            <p className="mt-1 font-mono text-xs text-gray-600">
              A:{formatHouses(A)} &nbsp; B:{formatHouses(B)} &nbsp; C:{formatHouses(C)} &nbsp; D:{formatHouses(D)}
              <span className="ml-2 text-gray-400">→ combined: {formatHouses(combined)}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-xl bg-white p-3">
        <p className="text-xs font-semibold text-gray-700">Combined karyesh houses (all selected levels together): <span className="font-mono text-indigo-700">{formatHouses(combinedHouses)}</span></p>
        <p className="mt-1 text-[11px] text-gray-500">Compare this against a Rule Book matter&apos;s Promise houses in the panel on the right — the possibility strengthens where they overlap.</p>
      </div>

      <div className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-[11px] text-amber-800">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        <span>{gocharGuidanceFor(levels.length)}</span>
      </div>
    </div>
  );
}

export default function DashaPredictionPage() {
  const token = useAuth();
  const [chartList, setChartList] = useState<ChartListItem[]>([]);
  const [chartId, setChartId] = useState('');
  const [houses, setHouses] = useState<SignificatorHouse[]>([]);
  const [planets, setPlanets] = useState<SignificatorPlanet[]>([]);
  const [dashaPeriods, setDashaPeriods] = useState<DashaRow[]>([]);
  const [overview, setOverview] = useState<MahaOverviewRow[]>([]);
  const [expandedMaha, setExpandedMaha] = useState<Set<string>>(new Set());
  const [currentBreadcrumb, setCurrentBreadcrumb] = useState<DashaRow[]>([]);
  const [jumpTarget, setJumpTarget] = useState<DashaRow[] | undefined>(undefined);
  const [chainMatches, setChainMatches] = useState<MatterMatch[] | null>(null);
  const [loadingChart, setLoadingChart] = useState(false);
  const [loadingChain, setLoadingChain] = useState(false);
  const [error, setError] = useState('');

  // Per-Mahadasha-card Bhukti dropdown: which Bhukti is selected, and its
  // fetched real predictions, keyed by the Mahadasha's overview key so each
  // of the 9 cards keeps its own independent selection.
  const [selectedBhuktiPlanet, setSelectedBhuktiPlanet] = useState<Record<string, string>>({});
  const [bhuktiPredictions, setBhuktiPredictions] = useState<Record<string, { loading: boolean; matches: MatterMatch[] | null; error?: string }>>({});

  // Gochar planet the astrologer picks (any of the 9 grahas) to check
  // against the selected Bhukti, keyed the same way as the Bhukti selection.
  const [selectedGocharPlanet, setSelectedGocharPlanet] = useState<Record<string, string>>({});
  const [gocharResults, setGocharResults] = useState<Record<string, { loading: boolean; matches: GocharMatch[] | null; error?: string }>>({});

  const allSignificators = useMemo(() => computeFourStepSignificators(houses, planets), [houses, planets]);
  const runningLevels: RunningLevelInfo[] = useMemo(
    () =>
      currentBreadcrumb.map((row) => {
        const sig = allSignificators.find((s) => s.planet === row.planet);
        const A = sig?.A || [];
        const B = sig?.B || [];
        const C = sig?.C || [];
        const D = sig?.D || [];
        return { row, A, B, C, D, combined: [...A, ...B, ...C, ...D] };
      }),
    [currentBreadcrumb, allSignificators]
  );
  const combinedKaryeshHouses = useMemo(
    () => [...new Set(runningLevels.flatMap((l) => l.combined))].sort((a, b) => a - b),
    [runningLevels]
  );
  const deepestSelected = currentBreadcrumb[currentBreadcrumb.length - 1];
  const eventTimingAutoSearchKey = deepestSelected
    ? `${currentBreadcrumb.map((b) => b.planet).join('-')}|${deepestSelected.startDate}|${deepestSelected.endDate}`
    : undefined;

  useEffect(() => {
    if (!token) return;
    fetch('/api/admin/crm/kp-astro/charts', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((j) => setChartList(Array.isArray(j.data) ? j.data : []))
      .catch(() => setChartList([]));
  }, [token]);

  useEffect(() => {
    if (!token || !chartId) return;
    setLoadingChart(true);
    setError('');
    setChainMatches(null);
    Promise.all([
      fetch(`/api/admin/crm/kp-astro/charts/${chartId}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`/api/admin/crm/kp-astro/charts/${chartId}/dasha-prediction`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([chartJson, overviewJson]) => {
        if (chartJson.error) throw new Error(chartJson.error);
        if (overviewJson.error) throw new Error(overviewJson.error);
        setHouses(chartJson.data?.houses || []);
        setPlanets(chartJson.data?.planets || []);
        setDashaPeriods(chartJson.data?.dashaPeriods || []);
        setOverview(overviewJson.data?.overview || []);
        setCurrentBreadcrumb([]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load chart'))
      .finally(() => setLoadingChart(false));
  }, [token, chartId]);

  const handleBreadcrumbChange = async (breadcrumb: DashaRow[]) => {
    setCurrentBreadcrumb(breadcrumb);
    if (!token || !chartId || breadcrumb.length === 0) {
      setChainMatches(null);
      return;
    }
    setLoadingChain(true);
    try {
      const deepest = breadcrumb[breadcrumb.length - 1];
      const res = await fetch(`/api/admin/crm/kp-astro/charts/${chartId}/dasha-prediction`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ chainPlanets: breadcrumb.map((b) => b.planet), periodStart: deepest.startDate, periodEnd: deepest.endDate }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to evaluate period');
      setChainMatches(json.data?.matches || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to evaluate period');
    } finally {
      setLoadingChain(false);
    }
  };

  const toggleMaha = (planet: string, idx: number) => {
    const key = `${planet}-${idx}`;
    setExpandedMaha((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Clicking a "Confirmed in Bhukti: X" name in the Overview jumps the
  // drill-down below straight to that Mahadasha -> Bhukti chain, instead of
  // making the astrologer re-click through the levels to find it themselves.
  const jumpToBhukti = (maha: MahaOverviewRow, bhukti: ConfirmingBhukti) => {
    setJumpTarget([
      { level: 'maha', planet: maha.planet, parentPath: '', startDate: maha.startDate, endDate: maha.endDate },
      { level: 'antar', planet: bhukti.planet, parentPath: maha.planet, startDate: bhukti.startDate, endDate: bhukti.endDate },
    ]);
    document.getElementById('dasha-drilldown-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // The Bhukti dropdown inside each Mahadasha card -- picking one fetches
  // real predictions for that exact [Dasha, Bhukti] chain right there,
  // instead of requiring a trip down to the separate drill-down section.
  const selectBhukti = async (mahaKey: string, mahaPlanet: string, antarRow: DashaRow | undefined) => {
    setSelectedBhuktiPlanet((prev) => ({ ...prev, [mahaKey]: antarRow?.planet || '' }));
    if (!antarRow) return;
    setBhuktiPredictions((prev) => ({ ...prev, [mahaKey]: { loading: true, matches: null } }));
    try {
      const res = await fetch(`/api/admin/crm/kp-astro/charts/${chartId}/dasha-prediction`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ chainPlanets: [mahaPlanet, antarRow.planet], periodStart: antarRow.startDate, periodEnd: antarRow.endDate }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to evaluate Bhukti');
      setBhuktiPredictions((prev) => ({ ...prev, [mahaKey]: { loading: false, matches: json.data?.matches || [] } }));
    } catch (e) {
      setBhuktiPredictions((prev) => ({ ...prev, [mahaKey]: { loading: false, matches: null, error: e instanceof Error ? e.message : 'Failed to evaluate Bhukti' } }));
    }
  };

  // Astrologer-chosen gochar planet for the currently-selected Bhukti --
  // scans that planet's own transit across the Bhukti's exact date range.
  const selectGochar = async (mahaKey: string, mahaPlanet: string, antarRow: DashaRow, gocharPlanet: string) => {
    setSelectedGocharPlanet((prev) => ({ ...prev, [mahaKey]: gocharPlanet }));
    if (!gocharPlanet) return;
    setGocharResults((prev) => ({ ...prev, [mahaKey]: { loading: true, matches: null } }));
    try {
      const res = await fetch(`/api/admin/crm/kp-astro/charts/${chartId}/dasha-prediction/gochar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chainPlanets: [mahaPlanet, antarRow.planet],
          periodStart: antarRow.startDate,
          periodEnd: antarRow.endDate,
          gocharPlanet,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to evaluate gochar');
      setGocharResults((prev) => ({ ...prev, [mahaKey]: { loading: false, matches: json.data?.matches || [] } }));
    } catch (e) {
      setGocharResults((prev) => ({ ...prev, [mahaKey]: { loading: false, matches: null, error: e instanceof Error ? e.message : 'Failed to evaluate gochar' } }));
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <PageHeader
        theme="light"
        title={
          <span className="flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-indigo-500" />
            Dasha Prediction
          </span>
        }
        subtitle="For each Mahadasha, Antardasha, Pratyantardasha (and Sookshma/Prana) — which Rule Book matters are indicated, natally green-signalled first"
      />

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <label className="mb-1 block text-xs font-semibold text-gray-500">Chart</label>
        <select
          value={chartId}
          onChange={(e) => setChartId(e.target.value)}
          className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">— select a birth chart —</option>
          {chartList.map((c) => (
            <option key={c._id} value={c._id}>{c.personName}</option>
          ))}
        </select>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loadingChart && (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading chart…</span>
        </div>
      )}

      {!loadingChart && chartId && (
        <>
          {/* Mahadasha overview — broad "which ~10-year chapter shows what" view */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-bold text-gray-800">Mahadasha Overview (10-year chapters)</h3>
            <div className="space-y-2">
              {overview.map((m, i) => {
                const key = `${m.planet}-${i}`;
                const expanded = expandedMaha.has(key);
                const promisedCount = m.matches.filter((x) => x.natal.verdict === 'promised').length;
                const sig = allSignificators.find((s) => s.planet === m.planet);
                const combined = sig ? [...sig.A, ...sig.B, ...sig.C, ...sig.D] : [];
                return (
                  <div key={key} className="overflow-hidden rounded-xl border border-gray-200">
                    <div className="bg-gradient-to-r from-indigo-500 to-violet-600">
                      <button
                        type="button"
                        onClick={() => toggleMaha(m.planet, i)}
                        className="flex w-full items-center justify-between gap-3 px-4 pb-1 pt-2.5 text-left text-white"
                      >
                        <span className="flex items-center gap-2 text-sm font-bold">
                          {m.planet}
                          <span className="font-normal text-indigo-100">{formatDate(m.startDate)} – {formatDate(m.endDate)}</span>
                        </span>
                        <span className="flex items-center gap-2 text-xs">
                          <span className="rounded-full bg-white/20 px-2 py-0.5 font-semibold">{m.matches.length} matters, {promisedCount} promised</span>
                          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </span>
                      </button>
                      {sig && (
                        <p className="px-4 pb-2.5 font-mono text-[11px] text-indigo-100">
                          A:{formatHouses(sig.A)} &nbsp; B:{formatHouses(sig.B)} &nbsp; C:{formatHouses(sig.C)} &nbsp; D:{formatHouses(sig.D)}
                          <span className="ml-2 text-white/70">→ combined: {formatHouses(combined)}</span>
                        </p>
                      )}
                    </div>
                    {expanded && (
                      <div className="space-y-1.5 bg-white p-3">
                        {(() => {
                          const antarRows = dashaPeriods
                            .filter((r) => r.level === 'antar' && r.parentPath === m.planet)
                            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
                          const selectedPlanet = selectedBhuktiPlanet[key] || '';
                          const selectedAntarRow = antarRows.find((r) => r.planet === selectedPlanet);
                          const pred = bhuktiPredictions[key];
                          const gochar = gocharResults[key];
                          const bhuktiSig = selectedAntarRow ? allSignificators.find((s) => s.planet === selectedAntarRow.planet) : undefined;
                          const bhuktiCombined = bhuktiSig ? [...bhuktiSig.A, ...bhuktiSig.B, ...bhuktiSig.C, ...bhuktiSig.D] : [];
                          return (
                            <div className="mb-2 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
                              <label className="mb-1 block text-xs font-semibold text-indigo-800">
                                Bhukti — all {antarRows.length} Antardashas within this Mahadasha
                              </label>
                              <select
                                value={selectedPlanet}
                                onChange={(e) => selectBhukti(key, m.planet, antarRows.find((r) => r.planet === e.target.value))}
                                className="w-full max-w-md rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm"
                              >
                                <option value="">— select a Bhukti —</option>
                                {antarRows.map((r) => (
                                  <option key={r.planet} value={r.planet}>
                                    {r.planet} ({formatDate(r.startDate)} – {formatDate(r.endDate)})
                                  </option>
                                ))}
                              </select>

                              {selectedAntarRow && bhuktiSig && (
                                <p className="mt-2 font-mono text-[11px] text-indigo-700">
                                  {selectedAntarRow.planet} karyesh — A:{formatHouses(bhuktiSig.A)} &nbsp; B:{formatHouses(bhuktiSig.B)} &nbsp; C:{formatHouses(bhuktiSig.C)} &nbsp; D:{formatHouses(bhuktiSig.D)}
                                  <span className="ml-2 text-indigo-400">→ combined: {formatHouses(bhuktiCombined)}</span>
                                </p>
                              )}
                              {selectedAntarRow && (
                                <div className="mt-2 rounded-lg bg-amber-50 p-2">
                                  <label className="mb-1 block text-[11px] font-semibold text-amber-800">
                                    Gochar planet — pick any of the 9 to check against this Bhukti&apos;s exact dates
                                  </label>
                                  <select
                                    value={selectedGocharPlanet[key] || ''}
                                    onChange={(e) => selectGochar(key, m.planet, selectedAntarRow, e.target.value)}
                                    className="w-full max-w-xs rounded-lg border border-amber-300 bg-white px-2 py-1 text-xs"
                                  >
                                    <option value="">— select a gochar planet —</option>
                                    {GOCHAR_PLANETS.map((p) => (
                                      <option key={p} value={p}>{p}</option>
                                    ))}
                                  </select>

                                  {gochar?.loading && (
                                    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-400">
                                      <Loader2 className="h-3 w-3 animate-spin" /> Scanning transit day-by-day…
                                    </p>
                                  )}
                                  {gochar?.error && <p className="mt-1 text-[11px] text-red-600">{gochar.error}</p>}
                                  {gochar && !gochar.loading && gochar.matches && (
                                    <div className="mt-1">
                                      {gochar.matches.length === 0 && (
                                        <p className="text-[11px] text-gray-400">No matching transit days found in this window.</p>
                                      )}
                                      {gochar.matches.length > 0 && (
                                        <>
                                          <div className="flex max-h-32 flex-wrap gap-1 overflow-y-auto">
                                            {[...gochar.matches]
                                              .sort((a, b) => b.matchStrength - a.matchStrength || a.date.localeCompare(b.date))
                                              .slice(0, 30)
                                              .map((gm, i) => (
                                                <span
                                                  key={i}
                                                  title={`${gm.sign} — ${gm.matchStrength}/3 (sign/star/sub-lord matching)`}
                                                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-mono ${
                                                    gm.matchStrength === 3 ? 'bg-emerald-600 text-white' : gm.matchStrength === 2 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                                  }`}
                                                >
                                                  {formatDate(gm.date)} ×{gm.matchStrength}
                                                </span>
                                              ))}
                                          </div>
                                          {gochar.matches.length > 30 && (
                                            <p className="mt-1 text-[10px] text-gray-400">Showing strongest 30 of {gochar.matches.length} matching days.</p>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {pred?.loading && (
                                <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
                                  <Loader2 className="h-3 w-3 animate-spin" /> Evaluating…
                                </p>
                              )}
                              {pred?.error && <p className="mt-2 text-xs text-red-600">{pred.error}</p>}
                              {pred && !pred.loading && pred.matches && (
                                <div className="mt-2 space-y-1.5">
                                  {pred.matches.length === 0 && (
                                    <p className="text-xs text-gray-400">No Rule Book matter&apos;s significators match this Dasha+Bhukti chain.</p>
                                  )}
                                  {pred.matches.map((mm) => <MatterMatchRow key={mm.ruleId} m={mm} />)}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        {m.matches.length === 0 && <p className="text-xs text-gray-400">No Rule Book matter's significators match this Mahadasha lord.</p>}
                        {m.matches.map((mm) => (
                          <MatterMatchRow key={mm.ruleId} m={mm} onJumpToBhukti={(b) => jumpToBhukti(m, b)} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive drill-down: Dasha -> Bhukti -> Antara -> Pran Antara (Sookshma/Prana) */}
          <RunningChainCard levels={runningLevels} />

          <div id="dasha-drilldown-section" className="grid grid-cols-1 gap-4 lg:grid-cols-2 scroll-mt-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-bold text-gray-800">Select Dasha → Bhukti → Antara → Pran Antara</h3>
              <DashaDrillDown
                rows={dashaPeriods}
                onLoadDeeper={(rows) => setDashaPeriods((prev) => [...prev, ...rows])}
                onBreadcrumbChange={handleBreadcrumbChange}
                jumpTo={jumpTarget}
              />
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-bold text-gray-800">Matched Matters for Selected Period</h3>
              {loadingChain && (
                <div className="flex items-center gap-2 py-8 text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Evaluating…</span>
                </div>
              )}
              {!loadingChain && chainMatches === null && (
                <p className="text-xs text-gray-400">Click a Mahadasha (and optionally drill deeper) on the left to see matching matters here.</p>
              )}
              {!loadingChain && chainMatches !== null && chainMatches.length === 0 && (
                <p className="text-xs text-gray-400">No Rule Book matter's significators match this running period.</p>
              )}
              {!loadingChain && chainMatches && chainMatches.length > 0 && (
                <div className="max-h-[28rem] space-y-1.5 overflow-y-auto">
                  {chainMatches.map((mm) => <MatterMatchRow key={mm.ruleId} m={mm} />)}
                </div>
              )}
            </div>
          </div>

          {/* Exact-date narrowing via transit/gochar — auto-driven by whatever is selected in the drill-down above */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <h3 className="mb-1 text-sm font-bold text-gray-800">Refine to an Exact Date (Gochar / Transit)</h3>
            <p className="mb-3 text-xs text-gray-500">
              {deepestSelected
                ? `Auto-filled from the selected ${LEVEL_LABEL[deepestSelected.level]} (${deepestSelected.planet}) — combined karyesh houses ${formatHouses(combinedKaryeshHouses)}. Adjust the houses below for a specific matter if needed.`
                : "Select a Dasha/Bhukti/Antara above to auto-fill this, or enter house numbers manually."}
            </p>
            {token && (
              <EventTimingPanel
                chartId={chartId}
                token={token}
                initialHouses={combinedKaryeshHouses.length ? combinedKaryeshHouses.join(', ') : undefined}
                initialSearchFrom={deepestSelected?.startDate}
                initialSearchUntil={deepestSelected?.endDate}
                autoSearchKey={eventTimingAutoSearchKey}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
