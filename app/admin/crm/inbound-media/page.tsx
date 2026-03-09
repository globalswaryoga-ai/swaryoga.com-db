'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  const token = useAuth();
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

  // Check if we should show monthly reminder (1st-5th of month)
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
      
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      
      setMediaByDate(data.data || {});
      setStats(data.stats || {});
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Error fetching media:', err);
    } finally {
      setLoading(false);
    }
  }, [token, page, selectedKind]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    const allIds = Object.values(mediaByDate).flat().map(m => m._id);
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

  const dismissReminder = () => {
    localStorage.setItem('media-cleanup-reminder-dismissed', new Date().toISOString());
    setShowReminderModal(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">📁 Inbound Media Manager</h1>
            <p className="text-gray-400 text-sm mt-1">
              Manage WhatsApp inbound images, videos, and documents
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/crm')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
          >
            ← Back to CRM
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-gray-800/50 px-6 py-4 border-b border-gray-700">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4">
            <div className="bg-indigo-600/20 px-4 py-2 rounded-lg">
              <span className="text-indigo-400 font-semibold">🖼️ {stats.image || 0}</span>
              <span className="text-gray-400 ml-1">Images</span>
            </div>
            <div className="bg-purple-600/20 px-4 py-2 rounded-lg">
              <span className="text-purple-400 font-semibold">🎬 {stats.video || 0}</span>
              <span className="text-gray-400 ml-1">Videos</span>
            </div>
            <div className="bg-green-600/20 px-4 py-2 rounded-lg">
              <span className="text-green-400 font-semibold">📄 {stats.document || 0}</span>
              <span className="text-gray-400 ml-1">Documents</span>
            </div>
            <div className="bg-gray-600/20 px-4 py-2 rounded-lg">
              <span className="text-gray-300 font-semibold">📊 {total}</span>
              <span className="text-gray-400 ml-1">Total Files</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            {/* Filter */}
            <select
              value={selectedKind}
              onChange={(e) => { setSelectedKind(e.target.value); setPage(1); }}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
            >
              <option value="all">All Types</option>
              <option value="image">Images Only</option>
              <option value="video">Videos Only</option>
              <option value="document">Documents Only</option>
            </select>
            
            {/* Actions */}
            <button onClick={selectAll} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
              Select All
            </button>
            <button onClick={clearSelection} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
              Clear
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={selectedItems.size === 0}
              className={`px-4 py-2 rounded-lg ${
                selectedItems.size > 0 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              🗑️ Delete ({selectedItems.size})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        ) : Object.keys(mediaByDate).length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-6xl mb-4">📭</p>
            <p className="text-xl">No inbound media found</p>
            <p className="mt-2">When users send images/videos via WhatsApp, they will appear here</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(mediaByDate).map(([date, items]) => (
              <div key={date}>
                <h3 className="text-lg font-semibold text-gray-300 mb-4 sticky top-0 bg-gray-900 py-2">
                  📅 {formatDate(date)} ({items.length} files)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {items.map((item) => (
                    <div
                      key={item._id}
                      onClick={() => toggleSelect(item._id)}
                      className={`relative rounded-xl overflow-hidden cursor-pointer transition-all ${
                        selectedItems.has(item._id) 
                          ? 'ring-4 ring-indigo-500 scale-95' 
                          : 'hover:ring-2 hover:ring-gray-500'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className="absolute top-2 left-2 z-10">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          selectedItems.has(item._id) 
                            ? 'bg-indigo-500 border-indigo-500' 
                            : 'border-white bg-black/50'
                        }`}>
                          {selectedItems.has(item._id) && <span>✓</span>}
                        </div>
                      </div>
                      
                      {/* Media Preview */}
                      <div className="aspect-square bg-gray-800">
                        {item.kind === 'image' || item.kind === 'sticker' ? (
                          <img
                            src={item.url}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-image.png'; }}
                          />
                        ) : item.kind === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center bg-purple-900/50">
                            <span className="text-4xl">🎬</span>
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-green-900/50">
                            <span className="text-4xl">📄</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <p className="text-xs text-gray-300 truncate">📱 {item.phoneNumber}</p>
                        <p className="text-xs text-gray-400">{formatTime(item.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-700 rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 bg-gray-800 rounded-lg">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-gray-700 rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">🗑️ Delete Media Files</h2>
            <p className="text-gray-300 mb-4">
              Are you sure you want to delete <strong>{selectedItems.size}</strong> files?
            </p>
            <p className="text-yellow-400 text-sm mb-6">
              ⚠️ This will permanently delete files from AWS S3. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-yellow-500/30">
            <h2 className="text-xl font-bold mb-4">🧹 Monthly Cleanup Reminder</h2>
            <p className="text-gray-300 mb-4">
              It's the beginning of the month! Consider reviewing and deleting unwanted inbound media to:
            </p>
            <ul className="text-gray-400 text-sm mb-6 space-y-2">
              <li>✓ Save AWS S3 storage costs</li>
              <li>✓ Keep your media library organized</li>
              <li>✓ Remove unnecessary files</li>
            </ul>
            <p className="text-indigo-400 text-sm mb-6">
              📊 You have <strong>{total}</strong> inbound media files stored.
            </p>
            <div className="flex gap-3">
              <button
                onClick={dismissReminder}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                Remind Me Later
              </button>
              <button
                onClick={() => { dismissReminder(); }}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                Start Cleanup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
