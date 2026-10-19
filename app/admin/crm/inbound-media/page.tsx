'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Image as ImageIcon,
  Video,
  FileText,
  Layers,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle,
  Calendar,
  Phone,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface MediaItem {
  _id: string;
  phoneNumber: string;
  url: string;
  kind: string;
  mimeType: string;
  createdAt: string;
  caption?: string;
}

interface Stats {
  image?: number;
  video?: number;
  document?: number;
  audio?: number;
}

export default function InboundMediaPage() {
  const router = useRouter();
  const hookToken = useAuth();
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    const active =
      hookToken ||
      localStorage.getItem('crm_token') ||
      localStorage.getItem('adminToken') ||
      localStorage.getItem('admin_token') ||
      '';
    setToken(active);
  }, [hookToken]);

  const [loading, setLoading] = useState(true);
  const [mediaByDate, setMediaByDate] = useState<Record<string, MediaItem[]>>({});
  const [stats, setStats] = useState<Stats>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedKind, setSelectedKind] = useState('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);

  useEffect(() => {
    const day = new Date().getDate();
    const reminderDismissed = localStorage.getItem('media-cleanup-reminder-dismissed');
    const dismissedMonth = reminderDismissed ? new Date(reminderDismissed).getMonth() : -1;
    const currentMonth = new Date().getMonth();

    if (day >= 1 && day <= 5 && dismissedMonth !== currentMonth && total > 0) {
      setShowReminderModal(true);
    }
  }, [total]);

  const fetchMedia = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        kind: selectedKind,
      });

      const res = await fetch(`/api/admin/crm/inbound-media?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch media');

      const data = await res.json();
      setMediaByDate(data.media || {});
      setStats(data.stats || {});
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [token, page, selectedKind]);

  useEffect(() => {
    if (token) {
      fetchMedia();
    }
  }, [fetchMedia, token]);

  const toggleSelect = (id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const allIds: string[] = [];
    Object.values(mediaByDate).forEach((items) => {
      items.forEach((item) => allIds.push(item._id));
    });
    setSelectedItems(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const handleDelete = async () => {
    if (selectedItems.size === 0) return;
    setDeleting(true);

    try {
      const res = await fetch('/api/admin/crm/inbound-media', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messageIds: Array.from(selectedItems),
          deleteFromS3: true,
        }),
      });

      if (!res.ok) throw new Error('Delete failed');

      const data = await res.json();
      alert(`Deleted ${data.deletedCount} files (${data.deletedFromS3} from S3)`);

      setSelectedItems(new Set());
      setShowDeleteModal(false);
      fetchMedia();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete files');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Vibrant Gradient Line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link
                href="/admin/crm/social-hub"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Social Hub
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-medium text-emerald-600">Inbound WhatsApp Files</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Inbound Media Manager
              </h1>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                WhatsApp Storage
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Review and clean up incoming customer photos, documents, and videos sent via WhatsApp.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchMedia()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-sm font-semibold rounded-xl shadow-2xs transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inbound Images</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.image || 0}</h3>
              <p className="text-xs text-indigo-600 font-semibold mt-0.5">Payment receipts & proofs</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <ImageIcon className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inbound Videos</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.video || 0}</h3>
              <p className="text-xs text-purple-600 font-semibold mt-0.5">Asana & posture clips</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <Video className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Documents</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.document || 0}</h3>
              <p className="text-xs text-teal-600 font-semibold mt-0.5">PDFs & health reports</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Stored Files</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{total}</h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">Across WhatsApp Inboxes</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Toolbar & Controls */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase">Filter:</span>
            <select
              value={selectedKind}
              onChange={(e) => {
                setSelectedKind(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All File Types</option>
              <option value="image">Images Only</option>
              <option value="video">Videos Only</option>
              <option value="document">Documents Only</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition"
            >
              <CheckSquare className="w-3.5 h-3.5" /> Select All
            </button>
            <button
              onClick={clearSelection}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition"
            >
              <Square className="w-3.5 h-3.5" /> Clear
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={selectedItems.size === 0}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition shadow-xs ${
                selectedItems.size > 0
                  ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete ({selectedItems.size})
            </button>
          </div>
        </div>

        {/* Gallery Content */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">Loading inbound media assets...</p>
          </div>
        ) : Object.keys(mediaByDate).length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center text-slate-400 space-y-2">
            <ImageIcon className="w-12 h-12 mx-auto opacity-40 text-slate-300" />
            <h3 className="text-base font-bold text-slate-700">No Inbound Media Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Media attachments received in WhatsApp chat flows will be archived and presented here for bulk review.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(mediaByDate).map(([date, items]) => (
              <div key={date} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-bold text-sm text-slate-900">{formatDate(date)}</h3>
                  </div>
                  <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2.5 py-0.5 rounded-full">
                    {items.length} files
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {items.map((item) => {
                    const isSelected = selectedItems.has(item._id);
                    return (
                      <div
                        key={item._id}
                        onClick={() => toggleSelect(item._id)}
                        className={`group relative rounded-xl overflow-hidden border cursor-pointer transition ${
                          isSelected
                            ? 'ring-2 ring-emerald-500 border-emerald-500 scale-[0.98]'
                            : 'border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        {/* Checkbox indicator */}
                        <div className="absolute top-2 left-2 z-10">
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white/80 backdrop-blur text-transparent border border-slate-300'
                            }`}
                          >
                            ✓
                          </div>
                        </div>

                        {/* Media Thumbnail */}
                        <div className="aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
                          {item.kind === 'image' || item.kind === 'sticker' ? (
                            <img src={item.url} alt="" className="w-full h-full object-cover" />
                          ) : item.kind === 'video' ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-purple-50 text-purple-600">
                              <Video className="w-8 h-8" />
                              <span className="text-[10px] font-bold mt-1 uppercase">Video</span>
                            </div>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-teal-50 text-teal-600">
                              <FileText className="w-8 h-8" />
                              <span className="text-[10px] font-bold mt-1 uppercase">Doc</span>
                            </div>
                          )}
                        </div>

                        {/* Caption & Timestamp footer */}
                        <div className="p-2 bg-white text-[11px] space-y-0.5 border-t border-slate-100">
                          <p className="font-semibold text-slate-800 truncate flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {item.phoneNumber}
                          </p>
                          <p className="text-[10px] text-slate-400">{formatTime(item.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 pt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 disabled:opacity-50 hover:bg-slate-50 transition"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 disabled:opacity-50 hover:bg-slate-50 transition"
            >
              Next
            </button>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Delete Media Files</h2>
              <p className="text-sm text-slate-600 mt-1">
                Are you sure you want to delete <strong>{selectedItems.size}</strong> selected file(s)?
              </p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              ⚠️ This will permanently remove files from Cloud Storage (S3). This action cannot be reversed.
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Confirm & Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
