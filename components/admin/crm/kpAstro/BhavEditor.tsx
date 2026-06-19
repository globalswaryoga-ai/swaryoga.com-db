'use client';

// Per-bhav (per-house) astrologer working sheet. Each row stays editable so
// the astrologer can correct the auto-filled KP data before final prediction.

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

function TextCell({ value, onChange, placeholder, rows = 2 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="min-w-[190px] w-full resize-y rounded-lg border border-slate-200 bg-white/90 px-2.5 py-2 text-xs leading-relaxed text-slate-700 shadow-sm shadow-slate-100/60 placeholder:text-slate-300 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
    />
  );
}

export default function BhavEditor({ rows, onChange }: { rows: BhavAnalysisRow[]; onChange: (rows: BhavAnalysisRow[]) => void }) {
  const updateRow = <K extends keyof BhavAnalysisRow>(house: number, key: K, value: BhavAnalysisRow[K]) => {
    onChange(rows.map((r) => (r.house === house ? { ...r, [key]: value } : r)));
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">12 Bhav Working Table</h3>
        </div>
        <div className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600">12 rows</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-xs">
          <thead className="text-left text-[11px] uppercase tracking-wide text-slate-400">
            <tr>
              <th className="sticky left-0 z-20 min-w-[120px] border-b border-slate-100 bg-slate-50/95 p-3">Bhav</th>
              <th className="min-w-[135px] border-b border-slate-100 bg-slate-50/80 p-3">Sub Lord</th>
              <th className="min-w-[235px] border-b border-slate-100 bg-slate-50/80 p-3">ABCD Planets</th>
              <th className="min-w-[235px] border-b border-slate-100 bg-slate-50/80 p-3">Karyesh Bhav ABCD</th>
              <th className="min-w-[235px] border-b border-slate-100 bg-slate-50/80 p-3">Rahu/Ketu</th>
              <th className="min-w-[235px] border-b border-slate-100 bg-slate-50/80 p-3">Drishti</th>
              <th className="min-w-[255px] border-b border-slate-100 bg-slate-50/80 p-3">Conjunction Degree</th>
              <th className="min-w-[185px] border-b border-slate-100 bg-slate-50/80 p-3">Maha-Antar-Vidasha</th>
              <th className="min-w-[280px] border-b border-slate-100 bg-slate-50/80 p-3">Notes</th>
              <th className="min-w-[80px] border-b border-slate-100 bg-slate-50/80 p-3 text-center">Use</th>
              <th className="min-w-[80px] border-b border-slate-100 bg-slate-50/80 p-3">Order</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.house} className="group align-top">
                <td className="sticky left-0 z-10 border-b border-slate-100 bg-white/95 p-3 group-hover:bg-indigo-50/80">
                  <div className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
                    {row.house}{row.house === 1 ? 'st' : row.house === 2 ? 'nd' : row.house === 3 ? 'rd' : 'th'} Bhav
                  </div>
                  <div className="mt-2 max-w-[110px] text-[11px] leading-snug text-slate-400">{HOUSE_LABELS[row.house]}</div>
                </td>
                <td className="border-b border-slate-100 p-3 group-hover:bg-indigo-50/30">
                  <input
                    value={row.subLord}
                    onChange={(e) => updateRow(row.house, 'subLord', e.target.value)}
                    className="w-full rounded-lg border border-indigo-100 bg-indigo-50/50 px-2.5 py-2 text-xs font-semibold text-indigo-700 shadow-sm shadow-indigo-50 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </td>
                <td className="border-b border-slate-100 p-3 group-hover:bg-indigo-50/30"><TextCell value={row.subLordAbcdPlanets} onChange={(v) => updateRow(row.house, 'subLordAbcdPlanets', v)} /></td>
                <td className="border-b border-slate-100 p-3 group-hover:bg-indigo-50/30"><TextCell value={row.subLordKaryeshBhav} onChange={(v) => updateRow(row.house, 'subLordKaryeshBhav', v)} /></td>
                <td className="border-b border-slate-100 p-3 group-hover:bg-indigo-50/30"><TextCell value={row.subLordRahuKetuConnection} onChange={(v) => updateRow(row.house, 'subLordRahuKetuConnection', v)} /></td>
                <td className="border-b border-slate-100 p-3 group-hover:bg-indigo-50/30"><TextCell value={row.subLordDrishti} onChange={(v) => updateRow(row.house, 'subLordDrishti', v)} /></td>
                <td className="border-b border-slate-100 p-3 group-hover:bg-indigo-50/30"><TextCell value={row.subLordConjunction} onChange={(v) => updateRow(row.house, 'subLordConjunction', v)} /></td>
                <td className="border-b border-slate-100 p-3 group-hover:bg-indigo-50/30">
                  <input
                    value={row.dashaChain}
                    onChange={(e) => updateRow(row.house, 'dashaChain', e.target.value)}
                    placeholder="Sun-Moon-Saturn"
                    className="w-full rounded-lg border border-slate-200 bg-white/90 px-2.5 py-2 text-xs text-slate-700 shadow-sm shadow-slate-100/60 placeholder:text-slate-300 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </td>
                <td className="border-b border-slate-100 p-3 group-hover:bg-indigo-50/30">
                  <TextCell value={row.freeNotes} onChange={(v) => updateRow(row.house, 'freeNotes', v)} placeholder="Prediction notes, positives, negatives, timing..." rows={3} />
                </td>
                <td className="border-b border-slate-100 p-3 text-center group-hover:bg-indigo-50/30">
                  <input
                    type="checkbox"
                    checked={row.includeInPrediction}
                    onChange={(e) => updateRow(row.house, 'includeInPrediction', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
                  />
                </td>
                <td className="border-b border-slate-100 p-3 group-hover:bg-indigo-50/30">
                  <input
                    type="number"
                    value={row.predictionOrder || ''}
                    onChange={(e) => updateRow(row.house, 'predictionOrder', Number(e.target.value) || 0)}
                    className="w-16 rounded-lg border border-slate-200 bg-white/90 px-2 py-2 text-xs text-slate-700 shadow-sm shadow-slate-100/60 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
