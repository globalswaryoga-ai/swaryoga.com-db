'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { CANONICAL_LABELS, getLabelColor, normalizeLabel, type LabelColor } from '@/lib/crm/labels';

interface LabelStat {
  _id: string;
  count: number;
}

function getLabelBase(labelLike: string): string {
  return String(labelLike || '').split('|')[0];
}

type BadgeTone = {
  bg: string;
  text: string;
  border: string;
};

const COLOR_TOKENS: Record<LabelColor, BadgeTone> = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  green: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
};

const COLOR_OPTIONS: Array<{ value: LabelColor; label: string; swatch: string }> = [
  { value: 'blue', label: 'Blue (info)', swatch: 'bg-blue-500' },
  { value: 'yellow', label: 'Yellow (warm)', swatch: 'bg-yellow-500' },
  { value: 'green', label: 'Green (positive)', swatch: 'bg-emerald-500' },
  { value: 'red', label: 'Red (negative)', swatch: 'bg-red-500' },
];

export default function LabelsPage() {
  const router = useRouter();
  const token = useAuth();

  const [labels, setLabels] = useState<LabelStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [addingLabel, setAddingLabel] = useState(false);
  const [selectedColor, setSelectedColor] = useState<LabelColor>('blue');

  const existingLabelSet = useMemo(() => {
    return new Set(
      (labels || [])
        .map((l) => normalizeLabel(getLabelBase((l as any)?._id ?? (l as any)?.label)))
        .filter(Boolean)
    );
  }, [labels]);

  const suggestedCanonicalLabels = useMemo(() => {
    return (CANONICAL_LABELS || []).filter((l) => !existingLabelSet.has(normalizeLabel(l)));
  }, [existingLabelSet]);

  // Fetch labels
  const fetchLabels = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch('/api/admin/crm/labels', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch labels');

      const data = await response.json().catch(() => null);
      const list = (data?.data?.labels ?? data?.labels) as any;

      // API returns `{ label, count }` rows; legacy UI expects `{ _id, count }`.
      if (Array.isArray(list)) {
        const normalized: LabelStat[] = list
          .map((row: any) => {
            // Keep the original key from the API. It may embed a color, e.g. "hot-lead|red".
            const raw = String(row?._id ?? row?.label ?? '').trim();
            const count = row?.count ?? 0;
            if (!raw) return null;
            return { _id: raw, count: Number(count) || 0 };
          })
          .filter(Boolean) as LabelStat[];

        setLabels(normalized);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch labels');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  const handleAddLabel = async (labelName: string) => {
    if (!token || !labelName.trim()) return;

    const normalizedLabel = normalizeLabel(getLabelBase(labelName));
    if (!normalizedLabel) return;

    const derivedColor = selectedColor || getLabelColor(normalizedLabel);
    const labelTextToPersist = derivedColor ? `${normalizedLabel}|${derivedColor}` : normalizedLabel;

    try {
      setError(null);
      const response = await fetch('/api/admin/crm/labels', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadIds: [], label: labelTextToPersist }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add label');
      }

      // Refresh labels
      fetchLabels();
      setNewLabel('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add label');
    }
  };

  const handleDeleteLabel = async (label: string) => {
    if (!token || !confirm(`Delete label "${label}"?`)) return;

    const actualLabel = getLabelBase(label);
    const normalizedLabel = normalizeLabel(actualLabel);

    try {
      const response = await fetch('/api/admin/crm/labels', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ label: normalizedLabel || actualLabel }),
      });

      if (!response.ok) throw new Error('Failed to delete label');

      setLabels(labels.filter((l) => l._id !== label));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete label');
    }
  };

  const handleInitializeDefaults = async () => {
    if (!token) return;

    try {
      setError(null);
      setAddingLabel(true);

      for (const label of CANONICAL_LABELS) {
        const normalized = normalizeLabel(label);
        const exists = existingLabelSet.has(normalized);
        if (!exists) {
          const color = getLabelColor(normalized);
          const toPersist = `${normalized}|${color}`;
          await handleAddLabel(normalized);
        }
      }

      await fetchLabels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize labels');
    } finally {
      setAddingLabel(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Page Header - Professional */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/admin/crm')}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-600 hover:text-slate-900"
                title="Go to CRM Dashboard"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div>
                <h1 className="text-4xl font-bold text-slate-900">Label Management</h1>
                <p className="text-slate-600 text-lg">Organize and manage all lead labels</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Label Section */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Add New Label</h2>
          <div className="space-y-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Enter label name..."
                className="flex-1 px-4 py-3 border border-slate-300 rounded-lg text-slate-900 font-medium placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-400 transition-all"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddLabel(newLabel);
                  }
                }}
              />
              <button
                onClick={() => handleAddLabel(newLabel)}
                disabled={!newLabel.trim() || addingLabel}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all"
              >
                {addingLabel ? 'Adding...' : '+ Add Label'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-slate-700 font-semibold">Choose a color</p>
                <div className="grid grid-cols-2 gap-2">
                  {COLOR_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSelectedColor(opt.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                        selectedColor === opt.value
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                      }`}
                      title={opt.label}
                    >
                      <span className={`inline-block w-3 h-3 rounded-full ${opt.swatch}`} />
                      <span className="truncate">{opt.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  Tip: Canonical labels also have default colors. Your selection applies to new custom labels.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-slate-700 font-semibold">Quick add (recommended)</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedCanonicalLabels.slice(0, 12).map((l) => {
                    const color = getLabelColor(l);
                    const token = COLOR_TOKENS[color];
                    return (
                      <button
                        key={l}
                        type="button"
                        onClick={() => handleAddLabel(`${l}|${color}`)}
                        disabled={addingLabel}
                        className={`px-3 py-1.5 rounded-full border text-sm font-semibold ${token.bg} ${token.text} ${token.border} hover:opacity-90 disabled:opacity-50`}
                        title="Add label"
                      >
                        + {l}
                      </button>
                    );
                  })}

                  {suggestedCanonicalLabels.length === 0 && (
                    <span className="text-sm text-slate-500">All canonical labels already exist.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Initialize Defaults */}
            <div className="pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-600 mb-3 font-medium">Or initialize default labels for lead workflow:</p>
              <button
                onClick={handleInitializeDefaults}
                disabled={addingLabel || loading}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all text-sm"
              >
                {addingLabel ? 'Initializing...' : '🚀 Initialize Default Labels'}
              </button>
              <p className="text-xs text-slate-500 mt-2">
                Canonical labels will be added with their default colors.
              </p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Labels Grid */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 px-8 py-4">
            <h3 className="text-lg font-bold text-slate-900">All Labels ({labels.length})</h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full animate-spin">
                  <div className="w-10 h-10 bg-white rounded-full"></div>
                </div>
                <p className="text-slate-600 font-medium">Loading labels...</p>
              </div>
            </div>
          ) : labels.length === 0 ? (
            <div className="px-8 py-12 text-center">
              <div className="text-5xl mb-4">🏷️</div>
              <h4 className="text-xl font-semibold text-slate-900 mb-2">No labels yet</h4>
              <p className="text-slate-600">Start by adding your first label to organize your leads</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {labels.map((label) => (
                <div
                  key={label._id}
                  className="px-8 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {(() => {
                      const raw = String(label._id || '');
                      const [namePart, colorPartRaw] = raw.split('|');
                      const name = normalizeLabel(namePart);
                      const colorFromText = colorPartRaw as LabelColor | undefined;
                      const tone = COLOR_TOKENS[colorFromText && COLOR_TOKENS[colorFromText] ? colorFromText : getLabelColor(name)];

                      return (
                        <div className={`px-4 py-2 rounded-full font-semibold text-sm border ${tone.bg} ${tone.text} ${tone.border}`}>
                          {name}
                        </div>
                      );
                    })()}
                    <div>
                      <p className="text-sm text-slate-600 font-medium">Used in</p>
                      <p className="text-lg font-bold text-slate-900">{label.count} leads</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteLabel(label._id)}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-semibold transition-colors"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        {labels.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <p className="text-slate-600 text-sm font-semibold mb-1">Total Labels</p>
              <p className="text-3xl font-bold text-slate-900">{labels.length}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <p className="text-slate-600 text-sm font-semibold mb-1">Total Tagged Leads</p>
              <p className="text-3xl font-bold text-slate-900">{labels.reduce((sum, l) => sum + l.count, 0)}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <p className="text-slate-600 text-sm font-semibold mb-1">Most Used</p>
              <p className="text-3xl font-bold text-slate-900">{labels.length > 0 ? labels[0].count : 0}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
