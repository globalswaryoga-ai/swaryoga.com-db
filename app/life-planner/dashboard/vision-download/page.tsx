'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, Printer } from 'lucide-react';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';
import { useRouter } from 'next/navigation';
import type { Vision } from '@/lib/types/lifePlanner';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export default function VisionDownloadPage() {
  const router = useRouter();
  const [visions, setVisions] = useState<Vision[]>([]);
  const [selectedVisionId, setSelectedVisionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const storedVisions = await lifePlannerStorage.getVisions();

      if (cancelled) return;

      setVisions(Array.isArray(storedVisions) ? (storedVisions as Vision[]) : []);

      if (Array.isArray(storedVisions) && storedVisions.length > 0) {
        setSelectedVisionId((prev) => prev || storedVisions[0].id);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedVision = visions.find((v) => v.id === selectedVisionId) || null;

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredVisions = useMemo(() => {
    return visions.filter((v) => {
      const haystack = `${v.title || ''} ${v.description || ''} ${String(v.category || '')}`.toLowerCase();
      const matchesSearch = normalizedSearch.length === 0 || haystack.includes(normalizedSearch);

      const matchesCategory = filterCategory === 'all' || String(v.category) === filterCategory;
      const matchesStatus = filterStatus === 'all' || String(v.status || '') === filterStatus;

      const monthIdx = filterMonth === 'all' ? null : MONTHS.indexOf(filterMonth as any);
      if (monthIdx === null) return matchesSearch && matchesCategory && matchesStatus;

      const raw = (v.startDate || v.createdAt || '').toString();
      const d = raw ? new Date(raw) : null;
      const matchesMonth = !!d && !Number.isNaN(d.getTime()) && d.getMonth() === monthIdx;
      return matchesSearch && matchesCategory && matchesStatus && matchesMonth;
    });
  }, [visions, normalizedSearch, filterCategory, filterStatus, filterMonth]);

  const stats = useMemo(() => {
    const total = visions.length;
    const completed = visions.filter((v) => v.status === 'completed').length;
    const inProgress = visions.filter((v) => v.status === 'in-progress').length;
    const categories = new Set(visions.map((v) => String(v.category || ''))).size;
    return { total, completed, inProgress, categories };
  }, [visions]);

  const openPreview = () => {
    if (!selectedVisionId) return;
    router.push(`/life-planner/dashboard/vision/print?visionId=${encodeURIComponent(selectedVisionId)}`);
  };

  const openPreviewFor = (visionId: string) => {
    router.push(`/life-planner/dashboard/vision/print?visionId=${encodeURIComponent(visionId)}`);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-swar-text mb-2">Vision PDF Download</h1>
          <p className="text-swar-text-secondary">Select a vision → open A4 preview → Download PDF</p>
        </div>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => selectedVisionId && openPreview()}
            disabled={!selectedVisionId}
            className="flex items-center space-x-2 bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Printer className="h-4 w-4" />
            <span>Preview</span>
          </button>
          <button
            type="button"
            onClick={() => selectedVisionId && openPreview()}
            disabled={!selectedVisionId}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Download className="h-5 w-5" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-emerald-600 mb-1">{stats.total}</div>
          <div className="text-swar-text-secondary text-sm">Total Visions</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-blue-600 mb-1">{stats.inProgress}</div>
          <div className="text-swar-text-secondary text-sm">In Progress</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-purple-600 mb-1">{stats.completed}</div>
          <div className="text-swar-text-secondary text-sm">Completed</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="text-2xl font-bold text-orange-600 mb-1">{stats.categories}</div>
          <div className="text-swar-text-secondary text-sm">Vision Heads</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-bold text-swar-text mb-1">Search</label>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search title / description"
              className="w-full px-3 py-2 rounded-lg border border-swar-border focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-swar-text mb-1">Vision Head</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-swar-border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="all">All</option>
              {Array.from(new Set(visions.map((v) => String(v.category || '')).filter(Boolean))).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-swar-text mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-swar-border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="all">All</option>
              <option value="not-started">Not Started</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on-hold">On Hold</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-swar-text mb-1">Month</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-swar-border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="all">All</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilterCategory('all');
                setFilterStatus('all');
                setFilterMonth('all');
              }}
              className="w-full px-3 py-2 rounded-lg bg-swar-primary-light text-swar-text font-bold hover:bg-swar-primary-light transition"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <p className="mt-3 text-sm text-swar-text-secondary">Showing {filteredVisions.length} of {visions.length} visions</p>
      </div>

      {/* Vision Grid (same card style as Diamond People) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max justify-items-center">
        {filteredVisions.map((v) => (
          <div
            key={v.id}
            className={
              `w-80 bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col h-full ` +
              (v.id === selectedVisionId ? 'ring-2 ring-emerald-300' : '')
            }
          >
            <div
              className="relative h-40 overflow-hidden bg-emerald-600 flex items-center justify-center"
              style={{
                backgroundImage: `url('${v.imageUrl || (v as any).categoryImageUrl || DEFAULT_IMAGE}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="absolute top-3 right-3">
                <div className="bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                  {(v.status ? String(v.status) : 'VISION').toUpperCase()}
                </div>
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col">
              <h3 className="text-xl font-bold text-swar-text mb-1 line-clamp-2">{v.title}</h3>
              <p className="text-sm text-swar-text-secondary mb-4 line-clamp-2">{v.description || '—'}</p>

              <div className="space-y-2 text-xs text-swar-text mb-auto">
                <div className="flex items-center gap-2">🎯 {String(v.category || '')}</div>
                {(v.startDate || v.endDate) ? (
                  <div className="flex items-center gap-2">📅 {(v.startDate || '—')} → {(v.endDate || v.startDate || '—')}</div>
                ) : null}
              </div>

              <div className="mt-3">
                {v.category ? (
                  <span className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                    {String(v.category)}
                  </span>
                ) : null}
                {v.status ? (
                  <span className="ml-2 inline-block bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-medium">
                    {String(v.status)}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex gap-2 p-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setSelectedVisionId(v.id);
                  openPreviewFor(v.id);
                }}
                className="flex-1 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition inline-flex items-center justify-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Preview
              </button>
              <button
                type="button"
                onClick={() => setSelectedVisionId(v.id)}
                className="flex-1 px-3 py-2 bg-gray-600 text-white text-xs font-bold rounded-lg hover:bg-gray-700 transition"
              >
                Select
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredVisions.length === 0 && (
        <div className="text-center py-12">
          <div className="text-swar-text-secondary mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h8l6 6v10a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-swar-text mb-2">No visions found</h3>
          <p className="text-swar-text-secondary mb-4">Create a vision first, then you can download it as PDF.</p>
        </div>
      )}

      {/* Note */}
      <div className="mt-8 rounded-2xl border border-swar-border bg-swar-primary-light p-4 text-sm text-swar-text">
        <p className="mb-0">
          PDF download happens from the A4 preview page (one vision at a time) so it prints cleanly and shows images reliably.
        </p>
      </div>
    </div>
  );
}
