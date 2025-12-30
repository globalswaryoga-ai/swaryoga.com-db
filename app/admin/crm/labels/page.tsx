'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface LabelStat {
  _id: string;
  count: number;
}

export default function LabelsPage() {
  const router = useRouter();
  const token = useAuth();

  const [labels, setLabels] = useState<LabelStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [addingLabel, setAddingLabel] = useState(false);

  // Default labels for lead workflow
  const defaultLabels = [
    'New Lead',
    'Whatsapp sent',
    'Sadhak replied',
    'Ready to call',
    'Call complet',
    'Redy to workshop',
    'Pending',
    'No any Reply',
  ];

  // Fetch labels
  const fetchLabels = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch('/api/admin/crm/labels', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch labels');

      const data = await response.json();
      if (data.success && data.data.labels) {
        setLabels(data.data.labels);
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

    try {
      setError(null);
      const response = await fetch('/api/admin/crm/labels', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadIds: [], label: labelName.trim() }),
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

    try {
      const response = await fetch('/api/admin/crm/labels', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ label }),
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
      
      for (const label of defaultLabels) {
        // Check if label already exists
        const exists = labels.some((l) => l._id.toLowerCase() === label.toLowerCase());
        if (!exists) {
          await handleAddLabel(label);
        }
      }
      
      // Refresh all labels
      await fetchLabels();
      setAddingLabel(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize labels');
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
                Default labels: New Lead, Whatsapp sent, Sadhak replied, Ready to call, Call complet, Redy to workshop, Pending, No any Reply
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
                    <div className="bg-orange-100 text-orange-700 px-4 py-2 rounded-full font-semibold text-sm border border-orange-300">
                      {label._id}
                    </div>
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
