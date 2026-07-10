'use client';

import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
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
  groupDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface GroupAddRequest {
  sessionKey: string;
  targetGroupId: string;
  participantIds: string[];
  operationType: 'add' | 'remove';
}

interface GroupChat {
  id: string;
  name: string;
}

interface GroupMember {
  id: string;
  admin: string | null;
}

export default function MergeGroupV2Page() {
  const [operations, setOperations] = useState<MergeOperation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  // Form states
  const [sessionKey, setSessionKey] = useState('');
  const [targetGroupId, setTargetGroupId] = useState('');

  // Group member picker
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [ownPhone, setOwnPhone] = useState('');
  const [memberError, setMemberError] = useState('');
  const [enqueuing, setEnqueuing] = useState(false);

  async function bridgeGet(path: string): Promise<any> {
    const token = await getToken();
    const url = new URL('/api/admin/crm/whatsapp/qr-bridge', window.location.origin);
    url.searchParams.append('path', path);
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || `Bridge request failed (${res.status})`);
    return json?.data ?? json;
  }

  // Load the tenant's groups for the dropdown + own phone + session key
  useEffect(() => {
    (async () => {
      try {
        const [chatsData, statusData, settingsData] = await Promise.all([
          bridgeGet('/chats').catch(() => null),
          bridgeGet('/status').catch(() => null),
          fetch('/api/admin/crm/settings', { headers: { Authorization: `Bearer ${await getToken()}` } })
            .then(r => r.json()).catch(() => null),
        ]);
        const chats: any[] = Array.isArray(chatsData) ? chatsData : chatsData?.chats || [];
        setGroups(
          chats
            .filter((c: any) => String(c.id || '').endsWith('@g.us'))
            .map((c: any) => ({ id: c.id, name: c.name || c.id.split('@')[0] }))
            .sort((a: GroupChat, b: GroupChat) => a.name.localeCompare(b.name))
        );
        const phone = String(statusData?.phone?.id || '').replace(/\D/g, '');
        if (phone) setOwnPhone(phone);
        const tenantId = settingsData?.data?.permanentTenantId || '';
        if (tenantId) setSessionKey(tenantId);
      } catch {
        // group dropdown is a convenience — the manual JID field still works
      }
    })();
  }, []);

  async function loadMembers(groupJid: string) {
    if (!groupJid.endsWith('@g.us')) {
      setMemberError('Enter or pick a group ID ending in @g.us first');
      return;
    }
    setLoadingMembers(true);
    setMemberError('');
    setMembers([]);
    setSelectedMembers(new Set());
    try {
      const info = await bridgeGet(`/group-info/${encodeURIComponent(groupJid)}`);
      const list: GroupMember[] = (info?.participants || [])
        .map((p: any) => ({ id: String(p.id || ''), admin: p.admin || null }))
        .filter((p: GroupMember) => {
          if (!p.id) return false;
          // Exclude the connected account itself — it can't remove itself; it
          // leaves automatically when the group is emptied (auto-delete).
          const digits = p.id.split('@')[0].replace(/\D/g, '');
          return !ownPhone || digits !== ownPhone;
        });
      setMembers(list);
      if (!list.length) setMemberError('No members visible in this group (besides your own account).');
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoadingMembers(false);
    }
  }

  async function enqueueRemoval(ids: string[], deleteGroupIntent: boolean) {
    if (!isAdmin) { setMemberError('Only an admin can remove members'); return; }
    if (ids.length === 0) return;
    if (ids.length > 300) {
      setMemberError(`WhatsApp safety cap: max 300 removals per job (15/hr over 20 hr). Select up to 300 (you picked ${ids.length}) and run again for the rest.`);
      return;
    }
    const label = deleteGroupIntent
      ? `Remove ALL ${ids.length} members? When the group is empty it will be deleted automatically.`
      : `Remove ${ids.length} member(s) from this group?`;
    const hrs = Math.ceil(ids.length / 15);
    if (!confirm(label + `\n\nRemovals are paced safely (~15/hr, ~${hrs} hr total) with random 2-5 min gaps to protect your WhatsApp number.`)) return;

    setEnqueuing(true);
    setMemberError('');
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/crm/qr/merge-group-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionKey, targetGroupId, participantIds: ids, operationType: 'remove' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to schedule removal');
      alert(`✅ ${data.message}${deleteGroupIntent ? '\n🗑️ The group will be deleted automatically once it is empty.' : ''}`);
      setSelectedMembers(new Set());
      await loadOperations();
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : 'Failed to schedule removal');
    } finally {
      setEnqueuing(false);
    }
  }

  // Load operations on mount
  useEffect(() => {
    loadOperations();
    const interval = setInterval(loadOperations, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  // Removing members (and the auto-delete-when-empty that follows) is admin-only.
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const decoded: any = jwtDecode(token);
        setIsAdmin(!!decoded?.isAdmin);
      } catch {
        setIsAdmin(false);
      }
    })();
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
            <li>✅ <strong>~15 participants per hour</strong> (30s × 2 warm-up, then 2–5 min random gaps)</li>
            <li>✅ <strong>Remove at the same safe ~15/hr pace</strong></li>
            <li>✅ <strong>No repeated gaps, irregular timing</strong> (100% human-like)</li>
            <li>✅ <strong>Auto-stops on 20%+ failures</strong> (prevents bans)</li>
            <li>✅ <strong>Randomized participant order</strong> (not systematic)</li>
          </ul>
        </div>

        {/* Delete Group Members */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">🗑️ Delete Group Members</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Target Group</label>
              <select
                value={groups.some((g) => g.id === targetGroupId) ? targetGroupId : ''}
                onChange={(e) => {
                  const jid = e.target.value;
                  if (!jid) return;
                  setTargetGroupId(jid);
                  loadMembers(jid);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded mb-2"
              >
                <option value="">— Pick a group —</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={targetGroupId}
                onChange={(e) => setTargetGroupId(e.target.value)}
                placeholder="…or paste a group ID (…@g.us)"
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>

            {/* Group Members panel */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">👥 Group Members {members.length > 0 && `(${members.length})`}</h3>
                <button
                  type="button"
                  onClick={() => loadMembers(targetGroupId)}
                  disabled={loadingMembers || !targetGroupId}
                  className="text-xs bg-gray-700 text-white px-3 py-1.5 rounded hover:bg-gray-600 disabled:bg-gray-300"
                >
                  {loadingMembers ? 'Loading…' : '🔄 Load members'}
                </button>
              </div>

              {memberError && <p className="text-xs text-red-600 mb-2">{memberError}</p>}

              {members.length > 0 && (
                <>
                  <label className="flex items-center gap-2 text-xs font-medium mb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMembers.size === members.length}
                      onChange={(e) =>
                        setSelectedMembers(e.target.checked ? new Set(members.map((m) => m.id)) : new Set())
                      }
                    />
                    Select all ({members.length})
                  </label>
                  <div className="max-h-56 overflow-y-auto space-y-1 mb-3 bg-white border rounded p-2">
                    {members.map((m) => {
                      const digits = m.id.split('@')[0].replace(/\D/g, '');
                      const display = digits.length >= 10 && digits.length <= 15 ? `+${digits}` : m.id.split('@')[0];
                      return (
                        <label key={m.id} className="flex items-center gap-2 text-xs py-1 px-1 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedMembers.has(m.id)}
                            onChange={(e) => {
                              setSelectedMembers((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(m.id);
                                else next.delete(m.id);
                                return next;
                              });
                            }}
                          />
                          <span className="font-mono">{display}</span>
                          {m.admin && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">{m.admin === 'superadmin' ? 'owner' : 'admin'}</span>}
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => enqueueRemoval(Array.from(selectedMembers), selectedMembers.size === members.length)}
                      disabled={!isAdmin || enqueuing || selectedMembers.size === 0}
                      className="text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-500 disabled:bg-gray-300"
                      title={!isAdmin ? 'Admin only' : ''}
                    >
                      {enqueuing ? 'Scheduling…' : `➖ Remove selected (${selectedMembers.size})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => enqueueRemoval(members.map((m) => m.id), true)}
                      disabled={!isAdmin || enqueuing || members.length === 0}
                      className="text-xs bg-red-800 text-white px-3 py-1.5 rounded hover:bg-red-700 disabled:bg-gray-300"
                      title={!isAdmin ? 'Admin only' : ''}
                    >
                      🗑️ Remove ALL &amp; delete group
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2">
                    Removals are paced ~15/hour for WhatsApp safety (max 300 per job). When the last member is
                    removed, the group is deleted automatically. {!isAdmin && '⚠️ Removal is admin-only.'}
                  </p>
                </>
              )}
            </div>
          </div>
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
                        {op.groupDeleted && (
                          <span className="ml-2 text-xs font-normal text-red-600">🗑️ group deleted (emptied out)</span>
                        )}
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
            <li>• Gap strategy: First 2 at 30s warm-up, rest at 2–5 min random (no repeats, irregular)</li>
            <li>• Max rate: ~15 operations per hour (2-5 min random gaps, non-robotic)</li>
            <li>• Max per job: 300 removals (~20 hours at 15/hr)</li>
            <li>• Auto-stops if 20%+ operations fail (prevents cascading bans)</li>
            <li>• Each operation fully isolated (not concurrent)</li>
            <li>• Participant order randomized (not systematic/bot-like)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
