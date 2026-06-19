'use client';

// Per-bhav (per-house) astrologer working panel. Implements the user's
// explicit workflow: the astrologer must complete this for every house
// BEFORE any final prediction is generated. Each house carries: sub-lord,
// the traditional A/B/C/D significator categories (kept editable, not
// auto-derived with certainty — KP astrologers routinely override these),
// free-form custom matters the astrologer can add/rename at will, a
// positive/negative read, dasha cross-notes, free notes, and a
// prediction-order number the astrologer sets to control which house
// becomes prediction point 1st/2nd/3rd in the final write-up.

import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

export interface BhavAnalysisRow {
  house: number;
  subLord: string;
  significatorsA: string[];
  significatorsB: string[];
  significatorsC: string[];
  significatorsD: string[];
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

function ChipInput({ values, onChange, emptyHint }: { values: string[]; onChange: (v: string[]) => void; emptyHint?: string }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft('');
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {values.map((v, i) => (
        <span key={i} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5">
          {v}
          <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))} className="hover:text-indigo-900">×</button>
        </span>
      ))}
      {values.length === 0 && emptyHint && (
        <span className="text-xs text-gray-400 italic">{emptyHint}</span>
      )}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        onBlur={add}
        placeholder="+ planet"
        className="w-20 text-xs border-b border-dashed border-gray-300 focus:border-indigo-400 outline-none px-1"
      />
    </div>
  );
}

function BhavCard({ row, onChange }: { row: BhavAnalysisRow; onChange: (next: BhavAnalysisRow) => void }) {
  const [open, setOpen] = useState(false);

  const set = <K extends keyof BhavAnalysisRow>(key: K, value: BhavAnalysisRow[K]) => onChange({ ...row, [key]: value });

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-gray-50">
        <div className="flex items-center gap-3 min-w-0">
          {open ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
          <span className="font-semibold text-gray-900 shrink-0">House {row.house}</span>
          <span className="text-xs text-gray-400 truncate">{HOUSE_LABELS[row.house]}</span>
          {row.subLord && <span className="text-xs text-indigo-600 shrink-0">Sub: {row.subLord}</span>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <label className="flex items-center gap-1.5 text-xs text-gray-500" onClick={(e) => e.stopPropagation()}>
            <input type="checkbox" checked={row.includeInPrediction} onChange={(e) => set('includeInPrediction', e.target.checked)} />
            include
          </label>
          <input
            type="number"
            value={row.predictionOrder || ''}
            onChange={(e) => set('predictionOrder', Number(e.target.value) || 0)}
            onClick={(e) => e.stopPropagation()}
            placeholder="order"
            className="w-14 rounded border border-gray-200 px-1.5 py-1 text-xs"
          />
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Sub Lord</label>
              <input value={row.subLord} onChange={(e) => set('subLord', e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid sm:grid-cols-4 gap-3">
            {(['significatorsA', 'significatorsB', 'significatorsC', 'significatorsD'] as const).map((key, i) => {
              const emptyHints: Record<typeof key, string> = {
                significatorsA: row.significatorsB.length === 0 ? 'no occupant in this house' : "occupant's star lord not resolved",
                significatorsB: 'no occupant in this house',
                significatorsC: 'house owner not resolved',
                significatorsD: row.significatorsC.length === 0 ? 'no owner to resolve' : "owner's star lord not resolved",
              };
              return (
                <div key={key}>
                  <label className="text-xs font-medium text-gray-500">
                    {['A — Star lord of occupant', 'B — Occupant', 'C — Owner', 'D — Star lord of owner'][i]}
                  </label>
                  <div className="mt-1"><ChipInput values={row[key]} onChange={(v) => set(key, v)} emptyHint={emptyHints[key]} /></div>
                </div>
              );
            })}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-500">Custom Matters (Karyes)</label>
              <button
                type="button"
                onClick={() => set('customMatters', [...row.customMatters, { label: '', notes: '' }])}
                className="text-xs flex items-center gap-1 text-indigo-600 hover:underline"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
            <div className="mt-1 space-y-1.5">
              {row.customMatters.map((m, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    value={m.label}
                    onChange={(e) => set('customMatters', row.customMatters.map((x, j) => (j === idx ? { ...x, label: e.target.value } : x)))}
                    placeholder="Matter (e.g. 2nd marriage, foreign settlement)"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                  />
                  <input
                    value={m.notes}
                    onChange={(e) => set('customMatters', row.customMatters.map((x, j) => (j === idx ? { ...x, notes: e.target.value } : x)))}
                    placeholder="Notes"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                  />
                  <button type="button" onClick={() => set('customMatters', row.customMatters.filter((_, j) => j !== idx))} className="text-red-400 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {row.customMatters.length === 0 && <p className="text-xs text-gray-400">No custom matters added — use this for anything beyond the standard house meaning.</p>}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-emerald-600">Positive Notes</label>
              <textarea value={row.positiveNotes} onChange={(e) => set('positiveNotes', e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-red-600">Negative Notes</label>
              <textarea value={row.negativeNotes} onChange={(e) => set('negativeNotes', e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500">Mahadasha–Antardasha Cross-Notes</label>
            <textarea value={row.dashaNotes} onChange={(e) => set('dashaNotes', e.target.value)} rows={2} placeholder="e.g. Venus-Mercury supports this house; native already past this life stage so de-prioritize" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500">Free Notes</label>
            <textarea value={row.freeNotes} onChange={(e) => set('freeNotes', e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function BhavEditor({ rows, onChange }: { rows: BhavAnalysisRow[]; onChange: (rows: BhavAnalysisRow[]) => void }) {
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <BhavCard
          key={row.house}
          row={row}
          onChange={(next) => onChange(rows.map((r) => (r.house === next.house ? next : r)))}
        />
      ))}
    </div>
  );
}
