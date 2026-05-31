'use client';

import { useState, useEffect } from 'react';
import { getToken } from '@/lib/auth-client';

interface MergeOperation {
  id: string;
  operationType: 'add' | 'remove';
  status: string;
  targetGroupId: string;
  totalParticipants: number;
  completed: number;
  failed: number;
  successRate: number;
  createdAt: string;
  updatedAt: string;
}

interface GroupAddRequest {
  sessionKey: string;
  targetGroupId: string;
  participantIds: string[];
  operationType: 'add' | 'remove';
}

export default function MergeGroupV2Page() {
  const [operations, setOperations] = useState<MergeOperation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [sessionKey, setSessionKey] = useState('');
  const [targetGroupId, setTargetGroupId] = useState('');
  const [participantText, setParticipantText] = useState('');
  const [operationType, setOperationType] = useState<'add' | 'remove'>('add');
  const [submitting, setSubmitting] = useState(false);

  // Load operations on mount
  useEffect(() => {
    loadOperations();
    const interval = setInterval(loadOperations, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  async function loadOperations() {
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/crm/qr/merge-group-v2', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to load operations');

      const data = await response.json();
      setOperations(data.operations || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading operations');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const participantIds = participantText
        .split(/[\n,]+/)
        .map((p) => p.trim())
        .filter((p) => p);

      if (!sessionKey || !targetGroupId || participantIds.length === 0) {
        throw new Error('Fill all fields');
      }

      const token = await getToken();
      const response = await fetch('/api/admin/crm/qr/merge-group-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionKey,
          targetGroupId,
          participantIds,
          operationType,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create operation');
      }

      const result = await response.json();
      alert(`✅ ${result.message}\nGap strategy: ${result.gapStrategy}`);

      // Reset form
      setSessionKey('');
      setTargetGroupId('');
      setParticipantText('');

      // Reload operations
      await loadOperations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating operation');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm('Cancel this operation?')) return;

    try {
      const token = await getToken();
      const response = await fetch(`/api/admin/crm/qr/merge-group-v2/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to cancel');

      await loadOperations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cancelling operation');
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'blocked':
        return 'text-red-800';
      case 'in-progress':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔄 Group Merge V2 (~15/hour Safe)</h1>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="font-bold mb-2">📋 How It Works</h2>
          <ul className="text-sm space-y-1 text-gray-700">
            <li>✅ <strong>~15 participants per hour</strong> (30s × 2 warm-up, then 2–6 min random gaps)</li>
            <li>✅ <strong>Remove at the same safe ~15/hr pace</strong></li>
            <li>✅ <strong>No repeated gaps, irregular timing</strong> (100% human-like)</li>
            <li>✅ <strong>Auto-stops on 20%+ failures</strong> (prevents bans)</li>
            <li>✅ <strong>Randomized participant order</strong> (not systematic)</li>
          </ul>
        </div>

        {/* Create New Operation */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">📝 Create New Operation</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Session Key</label>
                <input
                  type="text"
                  value={sessionKey}
                  onChange={(e) => setSessionKey(e.target.value)}
                  placeholder="WhatsApp session key"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Target Group ID</label>
                <input
                  type="text"
                  value={targetGroupId}
                  onChange={(e) => setTargetGroupId(e.target.value)}
                  placeholder="Group ID to add/remove from"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Operation Type</label>
              <select
                value={operationType}
                onChange={(e) => setOperationType(e.target.value as 'add' | 'remove')}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              >
                <option value="add">➕ Add Participants</option>
                <option value="remove">➖ Remove Participants</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Participant IDs (one per line or comma-separated)
              </label>
              <textarea
                value={participantText}
                onChange={(e) => setParticipantText(e.target.value)}
                placeholder="123456789
987654321
..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                {participantText.split(/[\n,]+/).filter((p) => p.trim()).length} participants
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:bg-gray-400"
            >
              {submitting ? 'Creating...' : '✅ Create Operation'}
            </button>
          </form>
        </div>

        {/* Operations List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold">📊 Active Operations ({operations.length})</h2>
          </div>

          {operations.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No operations yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Type</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Target Group</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Progress</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Success Rate</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Updated</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {operations.map((op) => (
                    <tr key={op.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm">
                        {op.operationType === 'add' ? '➕' : '➖'} {op.operationType}
                      </td>
                      <td className="px-6 py-3 text-sm font-mono text-gray-600">
                        {op.targetGroupId.slice(0, 20)}...
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${((op.completed + op.failed) / op.totalParticipants) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs">
                            {op.completed + op.failed}/{op.totalParticipants}
                          </span>
                        </div>
                      </td>
                      <td className={`px-6 py-3 text-sm font-semibold ${statusColor(op.status)}`}>
                        {op.status}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        {op.successRate}% ({op.completed}✓ {op.failed}✗)
                      </td>
                      <td className="px-6 py-3 text-xs text-gray-500">
                        {new Date(op.updatedAt).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        {(op.status === 'pending' || op.status === 'in-progress') && (
                          <button
                            onClick={() => handleCancel(op.id)}
                            className="text-red-600 hover:text-red-800 text-xs font-medium"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Safety Info */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-bold mb-2">⚠️ Safety Notes</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Gap strategy: First 2 at 30s warm-up, rest at 2–6 min random (no repeats, irregular)</li>
            <li>• Max rate: ~15 operations per hour (matches QR message-send pace)</li>
            <li>• Auto-stops if 20%+ operations fail (prevents cascading bans)</li>
            <li>• Each operation fully isolated (not concurrent)</li>
            <li>• Participant order randomized (not systematic/bot-like)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
