'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BookMarked, Copy, Check, Pencil, Trash2, Plus, Search, Loader2, Sparkles, Library } from 'lucide-react';
import { PageHeader } from '@/components/admin/crm';
import { useAuth } from '@/hooks/useAuth';
import RuleBookEntryModal from '@/components/admin/crm/kpAstro/RuleBookEntryModal';
import ToolkitReferenceView from '@/components/admin/crm/kpAstro/ToolkitReferenceView';
import {
  CATEGORY_ORDER,
  getCategoryMeta,
  buildCopyText,
  type RuleBookEntry,
} from '@/components/admin/crm/kpAstro/ruleBookMeta';

type PageTab = 'ruleBook' | 'toolkitReference';

export default function RuleBookPage() {
  const token = useAuth();
  const [pageTab, setPageTab] = useState<PageTab>('ruleBook');
  const [entries, setEntries] = useState<RuleBookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RuleBookEntry | null>(null);
  const [modalDefaultCategory, setModalDefaultCategory] = useState<string | undefined>(undefined);
  const [modalKey, setModalKey] = useState(0);
  const seedAttempted = useRef(false);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/crm/kp-astro/rule-book', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load rule book');
      let data: RuleBookEntry[] = json.data || [];

      if (data.length === 0 && !seedAttempted.current) {
        seedAttempted.current = true;
        const seedRes = await fetch('/api/admin/crm/kp-astro/rule-book/seed-draft', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const seedJson = await seedRes.json().catch(() => ({}));
        if (seedRes.ok && seedJson.seeded) {
          const res2 = await fetch('/api/admin/crm/kp-astro/rule-book', { headers: { Authorization: `Bearer ${token}` } });
          const json2 = await res2.json();
          data = json2.data || [];
        }
      }
      setEntries(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load rule book');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? entries.filter((e) =>
          [e.category, e.subMatter, e.promiseHouses, e.denialHouses, e.dashaBhuktiAntara, e.gocharNote, e.notes]
            .join(' ')
            .toLowerCase()
            .includes(q)
        )
      : entries;

    const byCategory = new Map<string, RuleBookEntry[]>();
    for (const e of filtered) {
      if (!byCategory.has(e.category)) byCategory.set(e.category, []);
      byCategory.get(e.category)!.push(e);
    }
    for (const list of byCategory.values()) list.sort((a, b) => a.order - b.order);

    const orderedCategories = [
      ...CATEGORY_ORDER.filter((c) => byCategory.has(c)),
      ...[...byCategory.keys()].filter((c) => !CATEGORY_ORDER.includes(c)).sort(),
    ];
    return orderedCategories.map((c) => ({ category: c, rows: byCategory.get(c)! }));
  }, [entries, search]);

  const totalCount = entries.length;
  const draftCount = entries.filter((e) => e.isDraft).length;

  const handleCopy = async (entry: RuleBookEntry) => {
    try {
      await navigator.clipboard.writeText(buildCopyText(entry));
      setCopiedId(entry._id);
      setTimeout(() => setCopiedId((id) => (id === entry._id ? null : id)), 1500);
    } catch {
      // clipboard not available — no-op, button just won't show the check state
    }
  };

  const handleDelete = async (entry: RuleBookEntry) => {
    if (!token) return;
    if (!confirm(`Delete "${entry.subMatter}"?`)) return;
    try {
      const res = await fetch(`/api/admin/crm/kp-astro/rule-book/${entry._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete');
      setEntries((prev) => prev.filter((e) => e._id !== entry._id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const openAdd = (category?: string) => {
    setEditing(null);
    setModalDefaultCategory(category);
    setModalKey((k) => k + 1);
    setModalOpen(true);
  };

  const openEdit = (entry: RuleBookEntry) => {
    setEditing(entry);
    setModalDefaultCategory(undefined);
    setModalKey((k) => k + 1);
    setModalOpen(true);
  };

  const cellCls = 'px-3 py-2.5 align-top text-xs text-gray-700';

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <PageHeader
        theme="light"
        title={
          <span className="flex items-center gap-2">
            <BookMarked className="h-6 w-6 text-indigo-500" />
            KP Rule Book
          </span>
        }
        subtitle="Promise / denial house combinations by life-matter — browse, edit and copy straight into the Prediction Template's Rule field"
        action={
          pageTab === 'ruleBook' ? (
            <button
              type="button"
              onClick={() => openAdd()}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Add Rule
            </button>
          ) : undefined
        }
      />

      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setPageTab('ruleBook')}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            pageTab === 'ruleBook' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <BookMarked className="h-4 w-4" />
          My Rule Book
        </button>
        <button
          type="button"
          onClick={() => setPageTab('toolkitReference')}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            pageTab === 'toolkitReference' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Library className="h-4 w-4" />
          Toolkit Reference
        </button>
      </div>

      {pageTab === 'toolkitReference' && <ToolkitReferenceView />}

      {pageTab === 'ruleBook' && draftCount > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>
            <strong>{draftCount}</strong> of {totalCount} rules are a standard-KP starting draft (marked <strong>DRAFT</strong>) — review and edit each
            one against your own toolkit. Editing a rule clears its DRAFT flag.
          </span>
        </div>
      )}

      {pageTab === 'ruleBook' && error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {pageTab === 'ruleBook' && (
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by category, matter, house numbers…"
          className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>
      )}

      {pageTab === 'ruleBook' && loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading rule book…</span>
        </div>
      )}

      {pageTab === 'ruleBook' && !loading && grouped.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-400">
          {search ? 'No rules match your search.' : 'No rules yet — add your first one.'}
        </div>
      )}

      {pageTab === 'ruleBook' && (
      <div className="space-y-6">
        {grouped.map(({ category, rows }) => {
          const meta = getCategoryMeta(category);
          const Icon = meta.icon;
          return (
            <div key={category} className={`overflow-hidden rounded-2xl border border-gray-200 shadow-sm ring-1 ${meta.ring}`}>
              <div className={`flex items-center justify-between gap-3 bg-gradient-to-r ${meta.grad} px-4 py-3`}>
                <div className="flex items-center gap-2 text-white">
                  <Icon className="h-5 w-5" />
                  <h3 className="text-sm font-bold tracking-wide">{category}</h3>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">{rows.length}</span>
                </div>
                <button
                  type="button"
                  onClick={() => openAdd(category)}
                  className="flex items-center gap-1 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/30"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add rule
                </button>
              </div>

              <div className="overflow-x-auto bg-white">
                <table className="w-full min-w-[900px] border-collapse">
                  <thead>
                    <tr className={`${meta.chip} bg-opacity-40`}>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Sub-Matter</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Promise Houses</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Denial / Opposite</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Dasha - Bhukti - Antara</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Gochar (Transit)</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Notes</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((entry, idx) => (
                      <tr key={entry._id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                        <td className={cellCls}>
                          <div className="flex items-center gap-1.5 font-semibold text-gray-900">
                            {entry.subMatter}
                            {entry.isDraft && (
                              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">DRAFT</span>
                            )}
                          </div>
                        </td>
                        <td className={cellCls}>
                          <span className={`inline-block rounded-md px-2 py-0.5 font-mono font-semibold ${meta.chip}`}>
                            {entry.promiseHouses || '—'}
                          </span>
                        </td>
                        <td className={cellCls}>
                          <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 font-mono font-semibold text-gray-600">
                            {entry.denialHouses || '—'}
                          </span>
                        </td>
                        <td className={`${cellCls} max-w-xs`}>{entry.dashaBhuktiAntara || '—'}</td>
                        <td className={`${cellCls} max-w-xs`}>{entry.gocharNote || '—'}</td>
                        <td className={`${cellCls} max-w-xs italic text-gray-500`}>{entry.notes || '—'}</td>
                        <td className={`${cellCls} text-right`}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleCopy(entry)}
                              title="Copy for Prediction Template"
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-indigo-600"
                            >
                              {copiedId === entry._id ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(entry)}
                              title="Edit"
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-indigo-600"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(entry)}
                              title="Delete"
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
      )}

      <RuleBookEntryModal
        key={modalKey}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
        editing={editing}
        defaultCategory={modalDefaultCategory}
      />
    </div>
  );
}
