'use client';

import { useState } from 'react';
import { X, Plus, Pencil } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { CATEGORY_ORDER, type RuleBookEntry } from './ruleBookMeta';

const emptyForm = {
  category: '',
  subMatter: '',
  primaryHouse: '',
  promiseHouses: '',
  denialHouses: '',
  dashaBhuktiAntara: '',
  gocharNote: '',
  notes: '',
};

export default function RuleBookEntryModal({
  open,
  onClose,
  onSaved,
  editing,
  defaultCategory,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: RuleBookEntry | null;
  defaultCategory?: string;
}) {
  const token = useAuth();
  const [form, setForm] = useState(() =>
    editing
      ? {
          category: editing.category,
          subMatter: editing.subMatter,
          primaryHouse: editing.primaryHouse ? String(editing.primaryHouse) : '',
          promiseHouses: editing.promiseHouses,
          denialHouses: editing.denialHouses,
          dashaBhuktiAntara: editing.dashaBhuktiAntara,
          gocharNote: editing.gocharNote,
          notes: editing.notes,
        }
      : { ...emptyForm, category: defaultCategory || '' }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const save = async () => {
    if (!token || !form.category.trim() || !form.subMatter.trim()) return;
    setSaving(true);
    setError('');
    try {
      const url = editing
        ? `/api/admin/crm/kp-astro/rule-book/${editing._id}`
        : '/api/admin/crm/kp-astro/rule-book';
      const payload = {
        ...form,
        primaryHouse: form.primaryHouse.trim() ? Number(form.primaryHouse) : null,
      };
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save rule');
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100';
  const labelCls = 'mb-1 block text-xs font-semibold text-gray-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{editing ? 'Edit Rule Book entry' : 'Add Rule Book entry'}</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              {editing ? 'Saving clears the DRAFT flag — this is now your verified rule.' : 'Add a life-matter rule with its promise, denial and dasha pattern.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Category</label>
              <input
                list="rule-book-categories"
                type="text"
                value={form.category}
                onChange={set('category')}
                placeholder="e.g. Marriage"
                className={inputCls}
              />
              <datalist id="rule-book-categories">
                {CATEGORY_ORDER.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label className={labelCls}>Sub-Matter</label>
              <input
                type="text"
                value={form.subMatter}
                onChange={set('subMatter')}
                placeholder="e.g. Marriage — Arranged"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Primary House (whose CSL gates the Dasha Prediction tool&apos;s natal check)</label>
            <input
              type="number"
              min={1}
              max={12}
              value={form.primaryHouse}
              onChange={set('primaryHouse')}
              placeholder="e.g. 7 (for Marriage)"
              className={`${inputCls} max-w-[10rem]`}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Promise Houses</label>
              <input type="text" value={form.promiseHouses} onChange={set('promiseHouses')} placeholder="e.g. 2, 7, 11" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Denial / Opposite Houses</label>
              <input type="text" value={form.denialHouses} onChange={set('denialHouses')} placeholder="e.g. 1, 6, 8, 10, 12" className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Dasha - Bhukti - Antara pattern</label>
            <textarea
              value={form.dashaBhuktiAntara}
              onChange={set('dashaBhuktiAntara')}
              rows={2}
              placeholder="e.g. Dasha, Bhukti and Antara lords should each be significators of 2, 7 or 11"
              className={`${inputCls} resize-y`}
            />
          </div>

          <div>
            <label className={labelCls}>Gochar (Transit) note</label>
            <textarea
              value={form.gocharNote}
              onChange={set('gocharNote')}
              rows={2}
              placeholder="e.g. Transit of Jupiter/Venus over the 7th house confirms timing"
              className={`${inputCls} resize-y`}
            />
          </div>

          <div>
            <label className={labelCls}>Notes</label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              rows={2}
              placeholder="Any extra clarifying detail"
              className={`${inputCls} resize-y`}
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={save}
              disabled={saving || !form.category.trim() || !form.subMatter.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {editing ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {editing ? 'Save changes' : 'Add rule'}
            </button>
            <button type="button" onClick={onClose} className="text-sm text-gray-500 hover:underline">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
