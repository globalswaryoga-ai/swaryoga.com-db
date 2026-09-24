'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy, Check, Search, Loader2, Link2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface SubLordRow {
  subNo: number;
  sign: string;
  star: string;
  fromDeg: string;
  toDeg: string;
  signLord: string;
  starLord: string;
  subLord: string;
  diseases6th: string;
  mindset3rd: string;
  profession10th: string;
}
interface HouseMeaningRow {
  house: number;
  meaning: string;
}

type SubTab = 'subLordMaster' | 'housesMeaning' | 'aspect' | 'softwareList';

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'subLordMaster', label: '249 Sub-Lord Master' },
  { key: 'housesMeaning', label: 'Houses Meaning' },
  { key: 'aspect', label: 'Aspect Rules' },
  { key: 'softwareList', label: 'Recommended Software' },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // clipboard unavailable — no-op
        }
      }}
      title="Copy"
      className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-indigo-600"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

// Turns a bare URL inside a line of text into a clickable link; rest stays plain text.
function LinkedLine({ text }: { text: string }) {
  const urlMatch = text.match(/https?:\/\/[^\s)"']+/);
  if (!urlMatch) return <>{text}</>;
  const url = urlMatch[0];
  const idx = text.indexOf(url);
  return (
    <>
      {text.slice(0, idx)}
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline hover:text-indigo-800">
        {url}
      </a>
      {text.slice(idx + url.length)}
    </>
  );
}

export default function ToolkitReferenceView() {
  const token = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subLordMaster, setSubLordMaster] = useState<SubLordRow[]>([]);
  const [housesMeaning, setHousesMeaning] = useState<HouseMeaningRow[]>([]);
  const [aspect, setAspect] = useState<string[][]>([]);
  const [softwareList, setSoftwareList] = useState<string[]>([]);
  const [subTab, setSubTab] = useState<SubTab>('subLordMaster');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    fetch('/api/admin/crm/kp-astro/toolkit-reference', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setSubLordMaster(json.data?.subLordMaster || []);
        setHousesMeaning(json.data?.housesMeaning || []);
        setAspect(json.data?.aspect || []);
        setSoftwareList(json.data?.softwareList || []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load toolkit reference'))
      .finally(() => setLoading(false));
  }, [token]);

  const filteredSubLordMaster = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subLordMaster;
    return subLordMaster.filter((r) =>
      [r.sign, r.star, r.signLord, r.starLord, r.subLord, r.diseases6th, r.mindset3rd, r.profession10th]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [subLordMaster, search]);

  const filteredHousesMeaning = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return housesMeaning;
    return housesMeaning.filter((r) => `house ${r.house} ${r.meaning}`.toLowerCase().includes(q));
  }, [housesMeaning, search]);

  const filteredSoftwareList = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return softwareList;
    return softwareList.filter((line) => line.toLowerCase().includes(q));
  }, [softwareList, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading toolkit reference…</span>
      </div>
    );
  }

  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Reference material imported verbatim from your KP toolkit spreadsheet — read-only here; re-run the import to refresh from a newer file.
      </p>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setSubTab(t.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
              subTab === t.key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab !== 'aspect' && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      )}

      {subTab === 'subLordMaster' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
          <div className="overflow-x-auto bg-white">
            <table className="w-full min-w-[1100px] border-collapse">
              <thead>
                <tr className="bg-indigo-50">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">#</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Sign / Star</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Degree Range</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Sign / Star / Sub Lord</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">6th — Diseases</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">3rd — Mindset</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">10th — Profession</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Copy</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubLordMaster.map((r, idx) => {
                  const copyText = `Sub ${r.subNo}: ${r.sign} ${r.star} (${r.fromDeg}–${r.toDeg}) — Sign Lord: ${r.signLord}, Star Lord: ${r.starLord}, Sub Lord: ${r.subLord}\n6th (Diseases): ${r.diseases6th}\n3rd (Mindset): ${r.mindset3rd}\n10th (Profession): ${r.profession10th}`;
                  return (
                    <tr key={r.subNo} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                      <td className="px-3 py-2 align-top text-xs font-semibold text-gray-500">{r.subNo}</td>
                      <td className="px-3 py-2 align-top text-xs text-gray-800">
                        <div className="font-semibold">{r.sign}</div>
                        <div className="text-gray-500">{r.star}</div>
                      </td>
                      <td className="px-3 py-2 align-top text-xs font-mono text-gray-500">
                        {r.fromDeg} – {r.toDeg}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-gray-700">
                        <div>Sign: {r.signLord}</div>
                        <div>Star: {r.starLord}</div>
                        <div className="font-semibold text-indigo-700">Sub: {r.subLord}</div>
                      </td>
                      <td className="max-w-xs px-3 py-2 align-top text-xs text-gray-700">{r.diseases6th || '—'}</td>
                      <td className="max-w-xs px-3 py-2 align-top text-xs text-gray-700">{r.mindset3rd || '—'}</td>
                      <td className="max-w-xs px-3 py-2 align-top text-xs text-gray-700">{r.profession10th || '—'}</td>
                      <td className="px-3 py-2 align-top text-right">
                        <CopyButton text={copyText} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'housesMeaning' && (
        <div className="space-y-3">
          {filteredHousesMeaning.map((r) => {
            const copyText = `House ${r.house}: ${r.meaning}`;
            return (
              <div key={r.house} className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
                <div>
                  <div className="mb-1 text-sm font-bold text-indigo-700">House {r.house}</div>
                  <p className="text-xs leading-relaxed text-gray-700">{r.meaning}</p>
                </div>
                <CopyButton text={copyText} />
              </div>
            );
          })}
        </div>
      )}

      {subTab === 'aspect' && (
        <div className="space-y-3">
          {aspect.map((row, i) => (
            <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-xs text-gray-700">
                <span className="font-semibold text-gray-900">{row[0]}</span>
                {row.length > 1 && <span>: {row.slice(1).join(', ')}</span>}
              </div>
              <CopyButton text={row.join(' — ')} />
            </div>
          ))}
        </div>
      )}

      {subTab === 'softwareList' && (
        <div className="space-y-2">
          {filteredSoftwareList.map((line, i) => (
            <div key={i} className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3">
              <div className="flex items-start gap-2 text-xs text-gray-700">
                <Link2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                <span>
                  <LinkedLine text={line} />
                </span>
              </div>
              <CopyButton text={line} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
