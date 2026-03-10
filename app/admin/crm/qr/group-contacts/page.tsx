'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth, getLoginPath } from '@/hooks/useAuth';
import {
  Users,
  RefreshCw,
  Download,
  Search,
  ChevronRight,
  ArrowLeft,
  Phone,
  Shield,
  ShieldCheck,
  UserCircle,
  Loader2,
  AlertCircle,
  UsersRound,
  Hash,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface GroupChat {
  id: string;
  name: string;
  isGroup: boolean;
  lastMessageTime?: string;
  unreadCount?: number;
}

interface GroupParticipant {
  id: string;       // jid e.g. "919876543210@s.whatsapp.net"
  lid?: string;
  admin: string | null; // "admin" | "superadmin" | null
  resolvedPhone?: string;
}

interface GroupInfo {
  id: string;
  subject: string;
  desc?: string;
  owner?: string;
  size: number;
  creation?: number;
  participants: GroupParticipant[];
}

// Extract phone number from JID
function phoneFromJid(jid: string): string {
  if (!jid) return '';
  const num = jid.split('@')[0];
  // Filter out LID numbers (14+ digits)
  if (/^\d{14,}$/.test(num)) return '';
  return num;
}

function formatPhone(num: string): string {
  if (!num) return '';
  // If starts with 91 and is 12 digits, format as Indian number
  if (num.startsWith('91') && num.length === 12) {
    return `+91 ${num.slice(2, 7)} ${num.slice(7)}`;
  }
  return `+${num}`;
}

export default function QRGroupContactsPage() {
  const token = useAuth();
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groupSearch, setGroupSearch] = useState('');

  // Selected group
  const [selectedGroup, setSelectedGroup] = useState<GroupChat | null>(null);
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

  // LID map for resolving phone numbers
  const [lidMap, setLidMap] = useState<Record<string, string>>({});

  // Bridge proxy helper
  const bridgeCall = useCallback(
    async (path: string, method = 'GET', body?: any) => {
      if (!token) throw new Error('Not authenticated');
      const res = await fetch('/api/admin/crm/whatsapp/qr-bridge', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: method, path, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Bridge error');
      return data?.data || data;
    },
    [token]
  );

  // Fetch groups from bridge
  const fetchGroups = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');

      // Fetch chats and LID map in parallel
      const [chatsData, lidData] = await Promise.all([
        bridgeCall('/chats'),
        bridgeCall('/lid-map'),
      ]);

      const allChats: GroupChat[] = chatsData?.chats || [];
      const groupChats = allChats.filter((c) => c.isGroup);
      setGroups(groupChats);

      // Store LID map
      if (lidData?.map) {
        setLidMap(lidData.map);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch groups');
    } finally {
      setLoading(false);
    }
  }, [token, bridgeCall]);

  useEffect(() => {
    if (token) fetchGroups();
  }, [token, fetchGroups]);

  // Fetch group info (participants)
  const fetchGroupInfo = useCallback(
    async (group: GroupChat) => {
      try {
        setLoadingGroup(true);
        setError('');
        setSelectedGroup(group);
        setGroupInfo(null);

        const info: GroupInfo = await bridgeCall(`/group-info/${encodeURIComponent(group.id)}`);

        // Resolve LID participants to phone numbers
        if (info?.participants) {
          info.participants = info.participants.map((p) => {
            const phone = phoneFromJid(p.id);
            if (phone) return { ...p, resolvedPhone: phone };

            // Try LID map
            const lidJid = p.lid || p.id;
            const resolved = lidMap[lidJid] || lidMap[`${lidJid.split('@')[0]}@lid`] || lidMap[`${lidJid.split('@')[0]}@s.whatsapp.net`];
            if (resolved) {
              const resolvedPhone = resolved.split('@')[0];
              if (!/^\d{14,}$/.test(resolvedPhone)) {
                return { ...p, resolvedPhone };
              }
            }
            return p;
          });
        }

        setGroupInfo(info);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch group info');
      } finally {
        setLoadingGroup(false);
      }
    },
    [bridgeCall, lidMap]
  );

  // Filter groups
  const filteredGroups = groups.filter((g) =>
    g.name?.toLowerCase().includes(groupSearch.toLowerCase())
  );

  // Filter participants
  const filteredParticipants = (groupInfo?.participants || []).filter((p) => {
    const phone = p.resolvedPhone || phoneFromJid(p.id);
    const q = contactSearch.toLowerCase();
    return phone.includes(q) || p.id.toLowerCase().includes(q) || (p.admin || '').includes(q);
  });

  // Count contacts with phone numbers
  const contactsWithPhone = (groupInfo?.participants || []).filter(
    (p) => !!(p.resolvedPhone || phoneFromJid(p.id))
  );

  // Export contacts for selected group
  const exportGroupContacts = () => {
    if (!groupInfo || !selectedGroup) return;
    const rows = (groupInfo.participants || [])
      .map((p) => {
        const phone = p.resolvedPhone || phoneFromJid(p.id);
        return {
          'Phone Number': phone ? formatPhone(phone) : '',
          'Raw Number': phone || '',
          JID: p.id,
          Role: p.admin === 'superadmin' ? 'Super Admin' : p.admin === 'admin' ? 'Admin' : 'Member',
          'Group Name': selectedGroup.name || groupInfo.subject || '',
        };
      })
      .filter((r) => r['Raw Number']); // Only rows with phone numbers

    if (rows.length === 0) {
      alert('No contacts with phone numbers to export');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contacts');
    ws['!cols'] = [
      { wch: 20 }, // Phone Number
      { wch: 15 }, // Raw Number
      { wch: 30 }, // JID
      { wch: 12 }, // Role
      { wch: 25 }, // Group Name
    ];
    const safeName = (selectedGroup.name || 'group').replace(/[^a-zA-Z0-9-_ ]/g, '').slice(0, 30);
    XLSX.writeFile(wb, `group_contacts_${safeName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export ALL contacts from ALL groups
  const [exportingAll, setExportingAll] = useState(false);
  const exportAllGroupContacts = async () => {
    if (groups.length === 0) return;
    try {
      setExportingAll(true);
      setError('');

      const allRows: {
        'Phone Number': string;
        'Raw Number': string;
        JID: string;
        Role: string;
        'Group Name': string;
      }[] = [];

      const uniquePhones = new Set<string>();

      for (const group of groups) {
        try {
          const info: GroupInfo = await bridgeCall(`/group-info/${encodeURIComponent(group.id)}`);
          if (!info?.participants) continue;
          for (const p of info.participants) {
            let phone = phoneFromJid(p.id);
            if (!phone) {
              const lidJid = p.lid || p.id;
              const resolved = lidMap[lidJid] || lidMap[`${lidJid.split('@')[0]}@lid`] || lidMap[`${lidJid.split('@')[0]}@s.whatsapp.net`];
              if (resolved) {
                const rp = resolved.split('@')[0];
                if (!/^\d{14,}$/.test(rp)) phone = rp;
              }
            }
            if (phone && !uniquePhones.has(phone)) {
              uniquePhones.add(phone);
              allRows.push({
                'Phone Number': formatPhone(phone),
                'Raw Number': phone,
                JID: p.id,
                Role: p.admin === 'superadmin' ? 'Super Admin' : p.admin === 'admin' ? 'Admin' : 'Member',
                'Group Name': group.name || info.subject || '',
              });
            }
          }
        } catch {
          // Skip groups that fail
        }
      }

      if (allRows.length === 0) {
        alert('No contacts found across groups');
        return;
      }

      const ws = XLSX.utils.json_to_sheet(allRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'All Group Contacts');
      ws['!cols'] = [
        { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 25 },
      ];
      XLSX.writeFile(wb, `all_group_contacts_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExportingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <UsersRound className="w-5 h-5 text-green-600" />
              QR WhatsApp Group Contacts
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {selectedGroup
                ? `${selectedGroup.name} — ${contactsWithPhone.length} contacts`
                : `${groups.length} groups found`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setSelectedGroup(null);
                setGroupInfo(null);
                fetchGroups();
              }}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            {selectedGroup && groupInfo && (
              <button
                onClick={exportGroupContacts}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Export This Group
              </button>
            )}
            {!selectedGroup && groups.length > 0 && (
              <button
                onClick={exportAllGroupContacts}
                disabled={exportingAll}
                className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold flex items-center gap-1.5 disabled:opacity-60"
              >
                {exportingAll ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Exporting…</>
                ) : (
                  <><Download className="w-3.5 h-3.5" /> Export All Groups</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          <span className="ml-3 text-gray-500">Loading WhatsApp groups…</span>
        </div>
      )}

      {/* Main Content */}
      {!loading && (
        <div className="p-6">
          {/* ── GROUP LIST VIEW ── */}
          {!selectedGroup && (
            <>
              {/* Group search */}
              <div className="mb-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search groups…"
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              {filteredGroups.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <UsersRound className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No WhatsApp groups found</p>
                  <p className="text-sm mt-1">Make sure your QR WhatsApp is connected</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredGroups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => fetchGroupInfo(group)}
                      className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-green-300 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center shrink-0">
                            <Users className="w-5 h-5 text-green-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{group.name || 'Unnamed Group'}</p>
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{group.id}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-green-500 shrink-0 mt-1" />
                      </div>
                      {group.lastMessageTime && (
                        <p className="text-xs text-gray-400 mt-2">
                          Last activity: {new Date(group.lastMessageTime).toLocaleDateString()}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── GROUP DETAIL / CONTACTS VIEW ── */}
          {selectedGroup && (
            <>
              {/* Back button */}
              <button
                onClick={() => {
                  setSelectedGroup(null);
                  setGroupInfo(null);
                  setContactSearch('');
                }}
                className="mb-4 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Back to groups
              </button>

              {loadingGroup ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                  <span className="ml-3 text-gray-500">Fetching group contacts…</span>
                </div>
              ) : groupInfo ? (
                <>
                  {/* Group info header */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center shrink-0">
                        <Users className="w-7 h-7 text-green-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-bold text-gray-900">{groupInfo.subject || selectedGroup.name}</h2>
                        {groupInfo.desc && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{groupInfo.desc}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Hash className="w-3.5 h-3.5" /> {groupInfo.size} members
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" /> {contactsWithPhone.length} with phone
                          </span>
                          {groupInfo.creation && (
                            <span>
                              Created {new Date(groupInfo.creation * 1000).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact search */}
                  <div className="mb-4">
                    <div className="relative max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search contacts by phone…"
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Contacts table */}
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 w-12">#</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Phone Number</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">JID</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredParticipants.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-4 py-10 text-center text-gray-400">
                                No contacts found
                              </td>
                            </tr>
                          ) : (
                            filteredParticipants.map((p, idx) => {
                              const phone = p.resolvedPhone || phoneFromJid(p.id);
                              return (
                                <tr key={p.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-2.5 text-gray-400">{idx + 1}</td>
                                  <td className="px-4 py-2.5">
                                    {phone ? (
                                      <span className="flex items-center gap-1.5">
                                        <Phone className="w-3.5 h-3.5 text-green-500" />
                                        <span className="font-mono text-gray-900">{formatPhone(phone)}</span>
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 italic">LID (no phone)</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5 text-gray-400 font-mono text-xs truncate max-w-[200px]">
                                    {p.id}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    {p.admin === 'superadmin' ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                                        <ShieldCheck className="w-3 h-3" /> Super Admin
                                      </span>
                                    ) : p.admin === 'admin' ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                                        <Shield className="w-3 h-3" /> Admin
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 text-xs">
                                        <UserCircle className="w-3 h-3" /> Member
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                    {/* Summary footer */}
                    <div className="bg-gray-50 border-t px-4 py-2.5 text-xs text-gray-500 flex justify-between">
                      <span>
                        Showing {filteredParticipants.length} of {groupInfo.participants?.length || 0} members
                      </span>
                      <span>{contactsWithPhone.length} with resolved phone numbers</span>
                    </div>
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}
