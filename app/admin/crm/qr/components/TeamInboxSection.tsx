'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Lock, Unlock, StickyNote, Trash2, UserCircle, Send, Star } from 'lucide-react';

interface TeamNote {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
  mine: boolean;
}

interface TeamMember {
  userId: string;
  name: string;
}

interface TeamInboxSectionProps {
  chatJid: string;
  token: string | null;
}

/**
 * Team-inbox controls for one chat: assign to an agent, claim/release the
 * conversation (soft lock so two agents don't reply at once), and internal
 * notes that are never sent to the contact.
 */
export function TeamInboxSection({ chatJid, token }: TeamInboxSectionProps) {
  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<{ userId: string; name: string } | null>(null);
  const [claim, setClaim] = useState<{ userId: string; name: string } | null>(null);
  const [claimMine, setClaimMine] = useState(false);
  const [notes, setNotes] = useState<TeamNote[]>([]);
  const [noteText, setNoteText] = useState('');
  const [busy, setBusy] = useState('');
  const [team, setTeam] = useState<TeamMember[]>([]);

  const api = useCallback(
    async (method: 'GET' | 'POST' | 'DELETE', body?: any) => {
      const url = new URL('/api/admin/crm/whatsapp/qr/team-inbox', window.location.origin);
      if (method === 'GET') url.searchParams.set('chatJid', chatJid);
      const res = await fetch(url.toString(), {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: method === 'GET' ? undefined : JSON.stringify(body),
      });
      return res.json();
    },
    [chatJid, token]
  );

  useEffect(() => {
    if (!token || !chatJid) return;
    let cancelled = false;
    setLoading(true);
    api('GET')
      .then((d) => {
        if (cancelled || !d.success) return;
        setAssignment(d.assignment);
        setClaim(d.claim);
        setClaimMine(false);
        setNotes(d.notes || []);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    // Team list for the assignment dropdown (cached per mount)
    fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d.success || !Array.isArray(d.users)) return;
        setTeam(d.users.map((u: any) => ({ userId: u.userId || u._id, name: u.name || u.email || u.userId })));
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [chatJid, token, api]);

  const handleAssign = async (assignToUserId: string) => {
    setBusy('assign');
    try {
      const member = team.find((t) => t.userId === assignToUserId);
      const d = await api('POST', { action: 'assign', chatJid, assignToUserId, assignToName: member?.name || assignToUserId });
      if (d.success) setAssignment(d.assignment);
    } finally { setBusy(''); }
  };

  const handleClaim = async () => {
    setBusy('claim');
    try {
      const d = await api('POST', { action: claimMine ? 'release' : 'claim', chatJid });
      if (d.success) {
        setClaim(d.claim);
        setClaimMine(!!d.mine);
      }
    } finally { setBusy(''); }
  };

  const handleAddNote = async () => {
    const text = noteText.trim();
    if (!text) return;
    setBusy('note');
    try {
      const d = await api('POST', { action: 'note', chatJid, text });
      if (d.success && d.note) {
        setNotes((prev) => [d.note, ...prev]);
        setNoteText('');
      }
    } finally { setBusy(''); }
  };

  const handleDeleteNote = async (noteId: string) => {
    const d = await api('DELETE', { noteId });
    if (d.success) setNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const [csatStatus, setCsatStatus] = useState('');
  const handleSendCsat = async () => {
    if (busy === 'csat') return;
    setBusy('csat');
    setCsatStatus('');
    try {
      const res = await fetch('/api/admin/crm/whatsapp/qr/csat', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatJid }),
      });
      const d = await res.json();
      setCsatStatus(d.success ? '✅ Rating request sent' : `❌ ${d.error || 'Failed'}`);
      setTimeout(() => setCsatStatus(''), 4000);
    } catch (e: any) {
      setCsatStatus(`❌ ${e.message}`);
    } finally { setBusy(''); }
  };

  if (!token) return null;

  return (
    <div className="px-4 py-4 border-b space-y-4">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
        <UserCircle className="w-3.5 h-3.5" /> Team
      </h4>

      {loading ? (
        <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
      ) : (
        <>
          {/* Assignment */}
          <div>
            <label className="text-[11px] text-gray-500 block mb-1">Assigned to</label>
            <select
              value={assignment?.userId || ''}
              onChange={(e) => handleAssign(e.target.value)}
              disabled={busy === 'assign'}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
            >
              <option value="">— Unassigned —</option>
              {team.map((t) => (
                <option key={t.userId} value={t.userId}>{t.name}</option>
              ))}
              {assignment && !team.some((t) => t.userId === assignment.userId) && (
                <option value={assignment.userId}>{assignment.name}</option>
              )}
            </select>
          </div>

          {/* Claim / lock */}
          <div>
            {claim && !claimMine ? (
              <div className="flex items-center gap-2 text-[11px] bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-2.5 py-2">
                <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="flex-1">Being handled by <b>{claim.name}</b></span>
                <button onClick={handleClaim} disabled={busy === 'claim'} className="underline hover:no-underline">take over</button>
              </div>
            ) : (
              <button
                onClick={handleClaim}
                disabled={busy === 'claim'}
                className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium border transition ${
                  claimMine
                    ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {busy === 'claim' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : claimMine ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                {claimMine ? 'Handling this chat — release' : 'Claim this chat'}
              </button>
            )}
          </div>

          {/* CSAT rating request (individual chats only) */}
          {!chatJid.endsWith('@g.us') && (
            <div>
              <button
                onClick={handleSendCsat}
                disabled={busy === 'csat'}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition"
              >
                {busy === 'csat' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" />}
                Ask for a 1–5 rating
              </button>
              {csatStatus && <p className="text-[11px] mt-1 text-gray-600">{csatStatus}</p>}
            </div>
          )}

          {/* Internal notes */}
          <div>
            <label className="text-[11px] text-gray-500 mb-1 flex items-center gap-1">
              <StickyNote className="w-3 h-3" /> Internal notes (team only — never sent)
            </label>
            <div className="flex items-center gap-1.5 mb-2">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                placeholder="Add a note for your team…"
                maxLength={2000}
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              <button
                onClick={handleAddNote}
                disabled={busy === 'note' || !noteText.trim()}
                className="p-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 transition"
              >
                {busy === 'note' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
            {notes.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {notes.map((n) => (
                  <div key={n.id} className="bg-yellow-50 border border-yellow-200 rounded-lg px-2.5 py-1.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-gray-800 whitespace-pre-wrap break-words flex-1">{n.text}</p>
                      {n.mine && (
                        <button onClick={() => handleDeleteNote(n.id)} className="text-gray-400 hover:text-red-500 flex-shrink-0" title="Delete note">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {n.authorName} · {new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
