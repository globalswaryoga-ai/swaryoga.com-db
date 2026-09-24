'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, CheckCircle2, Loader2, ArrowLeft, Pencil, Save, X, ListVideo } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Cohort {
  _id: string;
  name: string;
  zoomMeetingId?: string;
  youtubePlaylistName?: string;
}

export default function WorkshopZoomSettingsPage() {
  const router = useRouter();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') || localStorage.getItem('admin_token') : '';
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [zoomMeetingId, setZoomMeetingId] = useState('');
  const [selectedCohort, setSelectedCohort] = useState('');
  const [youtubePlaylistName, setYoutubePlaylistName] = useState('');

  // Inline edit state
  const [editingCohortId, setEditingCohortId] = useState<string | null>(null);
  const [editingZoomId, setEditingZoomId] = useState('');
  const [editingPlaylistValue, setEditingPlaylistValue] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/admin/crm/workshop-management', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load workshops');
        const data = await res.json();
        setCohorts(data.cohorts || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchData();
  }, [token]);

  const handleUpdateMapping = async (cohortId: string, zId: string, playlistName: string) => {
    const res = await fetch('/api/admin/crm/workshop-management', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cohortId,
        zoomMeetingId: zId,
        youtubePlaylistName: playlistName,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to update mapping');
    }
    return res.json();
  };

  const handleAddMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoomMeetingId || !selectedCohort) {
      setError('Please select a workshop and enter a Zoom Meeting ID');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await handleUpdateMapping(selectedCohort, zoomMeetingId, youtubePlaylistName);
      
      setCohorts(cohorts.map((c) => (c._id === selectedCohort ? { ...c, zoomMeetingId, youtubePlaylistName } : c)));
      setSuccess('✅ Zoom Mapping added to workshop successfully');
      setZoomMeetingId('');
      setSelectedCohort('');
      setYoutubePlaylistName('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearMapping = async (cohortId: string) => {
    if (!confirm('Remove Zoom mapping from this workshop?')) return;
    try {
      await handleUpdateMapping(cohortId, '', '');
      setCohorts(cohorts.map((c) => (c._id === cohortId ? { ...c, zoomMeetingId: '', youtubePlaylistName: '' } : c)));
      setSuccess('✅ Mapping removed');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const startEdit = (cohort: Cohort) => {
    setEditingCohortId(cohort._id);
    setEditingZoomId(cohort.zoomMeetingId || '');
    setEditingPlaylistValue(cohort.youtubePlaylistName || '');
  };

  const saveEdit = async (cohortId: string) => {
    setSavingEdit(true);
    setError(null);
    try {
      await handleUpdateMapping(cohortId, editingZoomId, editingPlaylistValue);
      setCohorts(cohorts.map((c) => (c._id === cohortId ? { ...c, zoomMeetingId: editingZoomId || undefined, youtubePlaylistName: editingPlaylistValue || undefined } : c)));
      setEditingCohortId(null);
      setSuccess('✅ Settings updated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const activeMappings = cohorts.filter(c => c.zoomMeetingId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/crm/workshop-management')}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              title="Back to Workshops"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-xs text-gray-500 font-semibold">WORKSHOPS</p>
              <h1 className="text-lg font-bold text-gray-900">Zoom Recording Setup</h1>
            </div>
          </div>
          <div className="text-xs text-gray-400">Zoom ID → Workshop</div>
        </div>
      </div>

      <div className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800">Workshop Zoom Settings</h2>
            <p className="text-gray-600 mt-2">
              Link Zoom meeting IDs to Workshops so AI auto-delivers recordings to absent students.
            </p>
          </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Add Mapping Form */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Assign Zoom Meeting to Workshop
          </h2>

          <form onSubmit={handleAddMapping} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Workshop *
                </label>
                <select
                  value={selectedCohort}
                  onChange={(e) => setSelectedCohort(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">-- Select Workshop --</option>
                  {cohorts.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zoom Meeting ID *
                </label>
                <input
                  type="text"
                  value={zoomMeetingId}
                  onChange={(e) => setZoomMeetingId(e.target.value)}
                  placeholder="e.g., 123456789 or UUID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                YouTube Playlist Name (Optional)
              </label>
              <input
                type="text"
                value={youtubePlaylistName}
                onChange={(e) => setYoutubePlaylistName(e.target.value)}
                placeholder="e.g., Swar Yoga 7 days {MONTH} {YEAR}"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Used to organize the automatically uploaded YouTube recordings.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition font-medium flex items-center justify-center gap-2"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</> : <><Plus className="w-4 h-4" /> Link Zoom to Workshop</>}
            </button>
          </form>
        </div>

        {/* Mappings List */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">
              Active Workshop Mappings ({activeMappings.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
            </div>
          ) : activeMappings.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No mappings found. Link a Zoom Meeting ID to a Workshop above.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {activeMappings.map((cohort) => (
                <div key={cohort._id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-mono text-lg text-indigo-600 font-bold flex items-center gap-2">
                          {editingCohortId === cohort._id ? (
                             <input type="text" value={editingZoomId} onChange={e => setEditingZoomId(e.target.value)} className="px-2 py-1 border rounded text-sm font-mono" placeholder="Zoom ID" />
                          ) : (
                             cohort.zoomMeetingId
                          )}
                        </p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">{cohort.name}</p>
                      </div>
                    </div>
                    {editingCohortId !== cohort._id && (
                        <button onClick={() => handleClearMapping(cohort._id)} className="p-2 text-red-600 hover:bg-red-50 rounded transition" title="Clear mapping"><Trash2 className="w-5 h-5" /></button>
                    )}
                  </div>

                  <div className="mt-3 flex items-start gap-2">
                    <ListVideo className="w-4 h-4 text-gray-400 mt-1.5 flex-shrink-0" />
                    {editingCohortId === cohort._id ? (
                      <div className="flex-1 flex flex-col gap-2 mt-1">
                        <input
                          type="text"
                          value={editingPlaylistValue}
                          onChange={(e) => setEditingPlaylistValue(e.target.value)}
                          placeholder="e.g., Swar Yoga 7 days {MONTH} {YEAR}"
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="flex gap-2">
                            <button onClick={() => saveEdit(cohort._id)} disabled={savingEdit} className="flex-1 py-1.5 text-white bg-green-600 hover:bg-green-700 rounded transition disabled:opacity-50 flex justify-center items-center gap-1 text-sm font-medium">
                              {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
                            </button>
                            <button onClick={() => setEditingCohortId(null)} className="flex-1 py-1.5 text-gray-600 bg-gray-200 hover:bg-gray-300 rounded transition flex justify-center items-center gap-1 text-sm font-medium">
                              <X className="w-4 h-4" /> Cancel
                            </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-between gap-2">
                        <p className="text-sm text-gray-600">
                          {cohort.youtubePlaylistName ? (
                            <>YouTube playlist: <span className="font-medium">{cohort.youtubePlaylistName}</span></>
                          ) : (
                            <span className="text-gray-400 italic">No YouTube playlist set</span>
                          )}
                        </p>
                        <button
                          onClick={() => startEdit(cohort)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition"
                          title="Edit Zoom & Playlist"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
