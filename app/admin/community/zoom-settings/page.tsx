'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Mapping {
  _id: string;
  zoomMeetingId: string;
  communityId: string;
  communityName?: string;
  zoomTopic?: string;
}

interface Community {
  _id: string;
  id: string;
  name: string;
}

export default function ZoomSettingsPage() {
  const token = useAuth();
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [zoomMeetingId, setZoomMeetingId] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState('');
  const [zoomTopic, setZoomTopic] = useState('');

  // Load mappings and communities
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mappingsRes, communitiesRes] = await Promise.all([
          fetch('/api/admin/community/zoom-settings', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/community/list', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!mappingsRes.ok || !communitiesRes.ok) throw new Error('Failed to load data');

        const mappingsData = await mappingsRes.json();
        const communitiesData = await communitiesRes.json();

        setMappings(mappingsData.mappings || []);
        setCommunities(communitiesData.communities || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchData();
  }, [token]);

  const handleAddMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoomMeetingId || !selectedCommunity) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/community/zoom-settings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          zoomMeetingId,
          communityId: selectedCommunity,
          zoomTopic: zoomTopic || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add mapping');
      }

      const data = await res.json();
      setMappings([data.mapping, ...mappings]);
      setSuccess('✅ Mapping added successfully');
      setZoomMeetingId('');
      setSelectedCommunity('');
      setZoomTopic('');

      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMapping = async (mappingId: string) => {
    if (!confirm('Delete this Zoom → Community mapping?')) return;

    try {
      const res = await fetch(
        `/api/admin/community/zoom-settings?id=${mappingId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error('Failed to delete');
      setMappings(mappings.filter((m) => m._id !== mappingId));
      setSuccess('✅ Mapping deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const getCommunityName = (id: string) => {
    return communities.find((c) => c._id === id)?.name || id;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Zoom → Community Settings</h1>
          <p className="text-gray-600 mt-2">
            Link Zoom meeting IDs to communities so recordings go to the right place
          </p>
        </div>

        {/* Messages */}
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
            Add Zoom Meeting Mapping
          </h2>

          <form onSubmit={handleAddMapping} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <p className="text-xs text-gray-500 mt-1">
                  Find in Zoom URL: zoom.us/j/MEETING_ID
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Community *
                </label>
                <select
                  value={selectedCommunity}
                  onChange={(e) => setSelectedCommunity(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">-- Select Community --</option>
                  {communities.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zoom Meeting Title (Optional)
              </label>
              <input
                type="text"
                value={zoomTopic}
                onChange={(e) => setZoomTopic(e.target.value)}
                placeholder="e.g., Sadhana Level 1 Class"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">For reference only</p>
            </div>

            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition font-medium flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Mapping
                </>
              )}
            </button>
          </form>
        </div>

        {/* Mappings List */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">
              Active Mappings ({mappings.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
            </div>
          ) : mappings.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No mappings yet. Add one above before starting a workshop.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {mappings.map((mapping) => (
                <div key={mapping._id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-mono text-sm text-indigo-600 font-bold">
                        {mapping.zoomMeetingId}
                      </p>
                      {mapping.zoomTopic && (
                        <p className="text-sm text-gray-600 mt-1">{mapping.zoomTopic}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteMapping(mapping._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                      title="Delete mapping"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">→</span>
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm font-medium rounded">
                      {mapping.communityName || getCommunityName(mapping.communityId)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-bold text-blue-900 mb-3">📌 How it works:</h3>
          <ol className="text-sm text-blue-800 space-y-2 ml-4">
            <li>1. Add a Zoom meeting ID here + select its community</li>
            <li>2. Before starting the workshop, note the Zoom meeting ID (from the Zoom URL)</li>
            <li>3. When the recording uploads to YouTube, it automatically goes to the selected community</li>
            <li>4. Members see the video in their community recordings immediately</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
