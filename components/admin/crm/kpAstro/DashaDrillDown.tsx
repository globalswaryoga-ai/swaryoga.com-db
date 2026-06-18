'use client';

// Vimshottari Dasha drill-down: Maha -> Antar -> Pratyantar -> (on-demand)
// Sookshma -> Prana. Breadcrumb navigation with the currently-active period
// highlighted, modeled on the standard professional KP software pattern
// (a flat clickable list per level, not one giant table).

import { useMemo, useState } from 'react';
import { Home, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export interface DashaRow {
  level: 'maha' | 'antar' | 'pratyantar' | 'sookshma' | 'prana';
  planet: string;
  parentPath: string;
  startDate: string;
  endDate: string;
}

const LEVEL_ORDER = ['maha', 'antar', 'pratyantar', 'sookshma', 'prana'] as const;
const LEVEL_LABEL: Record<string, string> = { maha: 'Mahadasha', antar: 'Antardasha', pratyantar: 'Pratyantar Dasha', sookshma: 'Sookshma Dasha', prana: 'Prana Dasha' };

function fullPathOf(row: DashaRow): string {
  return row.parentPath ? `${row.parentPath}-${row.planet}` : row.planet;
}

function durationLabel(startDate: string, endDate: string): string {
  const days = (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000;
  if (days >= 365) return `${(days / 365.25).toFixed(1)}y`;
  if (days >= 30) return `${(days / 30.44).toFixed(1)}m`;
  return `${Math.round(days)}d`;
}

function isActive(startDate: string, endDate: string): boolean {
  const now = Date.now();
  return now >= new Date(startDate).getTime() && now < new Date(endDate).getTime();
}

export default function DashaDrillDown({ rows, onLoadDeeper }: { rows: DashaRow[]; onLoadDeeper?: (rows: DashaRow[]) => void }) {
  const token = useAuth();
  const [breadcrumb, setBreadcrumb] = useState<DashaRow[]>([]);
  const [loadingDeeper, setLoadingDeeper] = useState(false);

  const currentLevel = breadcrumb.length === 0 ? 'maha' : LEVEL_ORDER[LEVEL_ORDER.indexOf(breadcrumb[breadcrumb.length - 1].level) + 1];
  const currentParentPath = breadcrumb.length === 0 ? '' : fullPathOf(breadcrumb[breadcrumb.length - 1]);

  const visibleRows = useMemo(() => {
    if (!currentLevel) return [];
    return rows
      .filter((r) => r.level === currentLevel && r.parentPath === currentParentPath)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [rows, currentLevel, currentParentPath]);

  const atDeepestLoaded = currentLevel === 'sookshma' || currentLevel === 'prana';
  const canDrillDeeper = breadcrumb.length > 0 && breadcrumb[breadcrumb.length - 1].level === 'pratyantar' && visibleRows.length === 0;

  const handleDrillDeeper = async () => {
    if (!token || breadcrumb.length === 0) return;
    const parent = breadcrumb[breadcrumb.length - 1];
    setLoadingDeeper(true);
    try {
      const res = await fetch('/api/admin/crm/kp-astro/dasha/sub-levels', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: parent.level, parentPath: parent.parentPath, planet: parent.planet, startDate: parent.startDate, endDate: parent.endDate, deepestLevel: 'prana' }),
      });
      const json = await res.json();
      if (res.ok && Array.isArray(json.data)) onLoadDeeper?.(json.data);
    } finally {
      setLoadingDeeper(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50 text-xs">
        <button type="button" onClick={() => setBreadcrumb([])} className="text-gray-400 hover:text-indigo-600"><Home className="h-3.5 w-3.5" /></button>
        {breadcrumb.map((b, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-gray-300" />
            <button type="button" onClick={() => setBreadcrumb(breadcrumb.slice(0, i + 1))} className="text-indigo-600 hover:underline">{b.planet}</button>
          </span>
        ))}
        <span className="ml-auto text-gray-400">{currentLevel ? LEVEL_LABEL[currentLevel] : ''}</span>
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
        {visibleRows.map((row, i) => {
          const active = isActive(row.startDate, row.endDate);
          return (
            <button
              key={i}
              type="button"
              onClick={() => !atDeepestLoaded && setBreadcrumb([...breadcrumb, row])}
              className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 ${active ? 'bg-emerald-50' : ''}`}
            >
              <span className={`font-medium ${active ? 'text-emerald-700' : 'text-gray-800'}`}>{row.planet}</span>
              <span className="text-xs text-gray-400">{new Date(row.startDate).toLocaleDateString('en-IN')} – {new Date(row.endDate).toLocaleDateString('en-IN')}</span>
              <span className="text-xs text-gray-400 w-12 text-right">{durationLabel(row.startDate, row.endDate)}</span>
            </button>
          );
        })}
        {visibleRows.length === 0 && !canDrillDeeper && (
          <p className="px-3 py-4 text-xs text-gray-400">No data at this level.</p>
        )}
        {canDrillDeeper && (
          <div className="p-3">
            <button type="button" onClick={handleDrillDeeper} disabled={loadingDeeper} className="flex items-center gap-2 text-xs text-indigo-600 hover:underline disabled:opacity-50">
              {loadingDeeper ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Compute Sookshma / Prana for this Pratyantar window
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
