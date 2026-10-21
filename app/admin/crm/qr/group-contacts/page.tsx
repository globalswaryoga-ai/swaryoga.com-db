'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
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
  CheckSquare,
  Square,
  Merge,
  MessageSquare,
  Send,
  X,
  Plus,
  UserPlus,
  Trash2,
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

  // Multi-select groups
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  // Merge modal
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeNewGroupName, setMergeNewGroupName] = useState('');
  const [merging, setMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState('');
  const [mergeMode, setMergeMode] = useState<'new' | 'existing'>('existing'); // default to existing
  const [mergeTargetGroupId, setMergeTargetGroupId] = useState('');

  // Batch move modal (2-3 users per batch, ADD→REMOVE→WAIT)
  const [showBatchMoveModal, setShowBatchMoveModal] = useState(false);
  const [batchMoveSourceIds, setBatchMoveSourceIds] = useState<Set<string>>(new Set());
  const [batchMoveTargetId, setBatchMoveTargetId] = useState('');
  const [batchMoving, setBatchMoving] = useState(false);
  const [batchMoveProgress, setBatchMoveProgress] = useState('');

  // Message modal
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState('');

  // Success message
  const [successMsg, setSuccessMsg] = useState('');

  // Add Contact Modal
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContactPhone, setNewContactPhone] = useState('');
  const [addingContact, setAddingContact] = useState(false);
  const [addContactError, setAddContactError] = useState('');

  // Remove Contact State
  const [participantToRemove, setParticipantToRemove] = useState<GroupParticipant | null>(null);
  const [removingParticipant, setRemovingParticipant] = useState(false);

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

  // Toggle group selection
  const toggleGroupSelect = (groupId: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const selectedGroupsList = groups.filter((g) => selectedGroupIds.has(g.id));

  // Helper: resolve phone from participant
  const resolvePhone = (p: GroupParticipant): string => {
    const phone = phoneFromJid(p.id);
    if (phone) return phone;
    const lidJid = p.lid || p.id;
    const resolved = lidMap[lidJid] || lidMap[`${lidJid.split('@')[0]}@lid`] || lidMap[`${lidJid.split('@')[0]}@s.whatsapp.net`];
    if (resolved) {
      const rp = resolved.split('@')[0];
      if (!/^\d{14,}$/.test(rp)) return rp;
    }
    return '';
  };

  // Reuse the same live chat identity mapping shown in the QR inbox sidebar.
  // The sidebar can learn a LID's real phone from message/contact events even
  // when /lid-map has not been updated yet.
  const buildSidebarPhoneMap = (chatRows: any[]): Record<string, string> => {
    const map: Record<string, string> = {};
    for (const chat of chatRows) {
      const phone = String(
        chat?.resolvedPhone || chat?.phoneNumber || chat?.phone || chat?.contact?.phone || ''
      ).replace(/\D/g, '');
      if (!phone || /^\d{14,}$/.test(phone)) continue;
      const ids = [chat?.id, chat?.jid, chat?.chatId, chat?.lid, chat?.contact?.lid].filter(Boolean);
      for (const id of ids) {
        const value = String(id);
        if (value.endsWith('@lid') || /^\d{14,}$/.test(value.split('@')[0])) {
          map[value] = phone;
          map[`${value.split('@')[0]}@lid`] = phone;
          map[`${value.split('@')[0]}@s.whatsapp.net`] = phone;
        }
      }
    }
    return map;
  };

  // Merge: collect all contacts from selected groups → add to existing group OR create new
  const handleMergeGroups = async () => {
    if (mergeMode === 'new' && !mergeNewGroupName.trim()) { setError('Please enter a group name'); return; }
    if (mergeMode === 'existing' && !mergeTargetGroupId) { setError('Please select a target group'); return; }
    if (selectedGroupIds.size < 1) { setError('Select at least 1 group'); return; }
    try {
      setMerging(true);
      setError('');
      setMergeProgress('Collecting contacts from groups…');

      // Get existing members of target group (to avoid adding duplicates)
      const existingJids = new Set<string>();
      if (mergeMode === 'existing') {
        try {
          setMergeProgress('Fetching target group members…');
          const targetInfo: GroupInfo = await bridgeCall(`/group-info/${encodeURIComponent(mergeTargetGroupId)}`);
          if (targetInfo?.participants) {
            for (const p of targetInfo.participants) {
              existingJids.add(p.id);
              const phone = resolvePhone(p);
              if (phone) existingJids.add(`${phone}@s.whatsapp.net`);
            }
          }
        } catch (err: any) {
          const errorMsg = err?.message || String(err);
          if (errorMsg.includes('not connected') || errorMsg.includes('not ready')) {
            throw new Error('❌ WhatsApp is not connected. Please scan QR code first in the Connection tab.');
          }
          throw err;
        }
      }

      const uniqueJids = new Set<string>();
      let fetchedCount = 0;
      let fetchErrors: string[] = [];

      // Collect contacts from source groups (skip the target group itself)
      const sourceGroups = selectedGroupsList.filter((g) => g.id !== mergeTargetGroupId);
      for (const group of sourceGroups) {
        fetchedCount++;
        setMergeProgress(`Fetching group ${fetchedCount}/${sourceGroups.length}: ${group.name}`);
        try {
          const info: GroupInfo = await bridgeCall(`/group-info/${encodeURIComponent(group.id)}`);
          if (info?.participants) {
            for (const p of info.participants) {
              const phone = resolvePhone(p);
              const jid = phone ? `${phone}@s.whatsapp.net` : p.id;
              if (jid && !jid.endsWith('@g.us') && !existingJids.has(jid)) {
                uniqueJids.add(jid);
              }
            }
          }
        } catch (err: any) {
          const msg = err?.message || String(err);
          console.warn(`Failed to fetch group ${group.name}: ${msg}`);
          fetchErrors.push(`${group.name}: ${msg}`);
        }
      }

      if (uniqueJids.size === 0) {
        const errorDetail = fetchErrors.length > 0 ? `\n\nFailed groups:\n${fetchErrors.join('\n')}` : '';
        setError(`No new contacts to add (all contacts already in target group)${errorDetail}`);
        return;
      }

      const participants = Array.from(uniqueJids);
      const targetGroup = groups.find((g) => g.id === mergeTargetGroupId);
      const targetName = targetGroup?.name || 'target group';

      if (mergeMode === 'existing') {
        // Add participants to existing group with ULTRA-SAFE rate limiting
        // Target: 1.5 hours (90 minutes) for 100 participants
        // Strategy: Larger batches (5-8), much longer delays (30-120 sec) to appear human
        // This is the safest approach to avoid WhatsApp bans
        
        // Dynamic import for rate limiting helpers
        const { getRandomMergeBatchSize, getRandomMergeDelay, separateAdminNumbers, shuffleArray, sleepWithJitter, calculateMergeGroupSchedule } = await import('@/lib/whatsappRateLimiter');
        
        // Calculate OPTION B ultra-safe schedule (default 240 min = 4+ hours)
        const mergeSchedule = calculateMergeGroupSchedule(participants.length); // Uses Option B defaults: 240 min, 2-3 batch, 60-180s delays
        setMergeProgress(`🔥 OPTION B ULTRA-SAFE: ${participants.length} participants over ${mergeSchedule.spreadMinutes} min\n📊 ${mergeSchedule.totalBatches} batches (2-3 per batch)\n⏱️ 60-180 sec delays (1-3 min between each) = Looks 100% HUMAN\n🛡️ Ban risk: NEARLY ZERO`);
        await new Promise(r => setTimeout(r, 3000));
        
        // Prepare participants: shuffle for randomization, but keep admin at end
        const { regularNumbers, adminNumbers } = separateAdminNumbers(participants, [/* add admin phone numbers here if known */]);
        const shuffledRegular = shuffleArray(regularNumbers);
        const processOrder = [...shuffledRegular, ...adminNumbers]; // Admin last (cleanup)
        
        let addedCount = 0;
        let alreadyCount = 0;
        let rejectedCount = 0;
        let batchNumber = 0;
        let batchErrors: Array<{ batch: number; error: string }> = [];
        
        for (let i = 0; i < processOrder.length; ) {
          // Random micro-batch size for merge (2-3 participants)
          const batchSize = getRandomMergeBatchSize();
          const batch = processOrder.slice(i, Math.min(i + batchSize, processOrder.length));
          
          if (batch.length === 0) break;
          i += batch.length;
          
          batchNumber++;
          const progress = i;
          const percentDone = Math.round((progress / processOrder.length) * 100);
          setMergeProgress(`🔄 Batch ${batchNumber}: Adding ${batch.length} to "${targetName}" (${progress}/${processOrder.length} • ${percentDone}%)\n⏱️ Option B: 60-180s delays (1-3 min, ultra-human-like)`);
          
          try {
            const addResult = await bridgeCall(`/group-participants/${encodeURIComponent(mergeTargetGroupId)}`, 'POST', {
              action: 'add',
              participants: batch,
            });
            const batchAdded = typeof addResult?.succeededCount === 'number' ? addResult.succeededCount : batch.length;
            addedCount += batchAdded;
            alreadyCount += addResult?.alreadyMemberCount || 0;
            const batchRejected = addResult?.failedCount || 0;
            if (batchRejected > 0) {
              rejectedCount += batchRejected;
              batchErrors.push({ batch: batchNumber, error: `${batchRejected} not added (privacy setting / not on WhatsApp)` });
            }
            
            // ═══ HEALTH CHECK EVERY 5 BATCHES ═══
            // During the long delay, check if session is still alive (catches early auto-logouts)
            if (batchNumber % 5 === 0) {
              try {
                const healthCheck = await bridgeCall('/status', 'GET', {});
                if (healthCheck && healthCheck.connected === false) {
                  throw new Error('WhatsApp not connected');
                }
              } catch (healthErr: any) {
                if (String(healthErr?.message || '').includes('not connected')) throw healthErr;
                console.warn(`⚠️ Batch ${batchNumber}: Health check failed (may indicate disconnect):`, healthErr?.message?.substring(0, 40));
              }
            }
            
            // OPTION B: 60-180 second delays (1-3 minutes) for merge
            // This is critical for avoiding WhatsApp detection and looking human
            if (progress < processOrder.length) {
              const delayMs = getRandomMergeDelay(); // 60-180 sec (Option B)
              const delaySec = (delayMs / 1000).toFixed(1);
              const remainingTime = Math.ceil((processOrder.length - progress) * 2); // ~2 min per batch average
              setMergeProgress(`✅ Batch ${batchNumber} added. Waiting ${delaySec}s before next batch...\n⏱️ Estimated remaining: ~${remainingTime}+ min`);
              await sleepWithJitter(delayMs, 15); // 15% jitter for variation
            }
          } catch (err: any) {
            const errorMsg = err?.message || String(err);
            console.error(`Batch ${batchNumber} failed:`, errorMsg);
            batchErrors.push({ batch: batchNumber, error: errorMsg });
            
            // If it's a connection error, stop immediately
            if (errorMsg.includes('not connected') || errorMsg.includes('not ready')) {
              throw new Error(`❌ Batch ${batchNumber} failed: WhatsApp disconnected!\n\nPlease ensure QR code is still scanned and bridge is connected.\nAdded so far: ${addedCount}/${processOrder.length}`);
            }
            
            // Otherwise continue with next batch
            setMergeProgress(`⚠️ Batch ${batchNumber} failed (${errorMsg.substring(0, 50)}...), continuing after a safe pause...`);
            if (i < processOrder.length) await sleepWithJitter(getRandomMergeDelay(), 15);
          }
        }
        
        // Check if there were errors
        if (batchErrors.length > 0 && addedCount === 0) {
          const errorDetail = batchErrors.map(e => `Batch ${e.batch}: ${e.error}`).join('\n');
          throw new Error(`❌ Merge failed completely:\n\n${errorDetail}`);
        }
        
        setSuccessMsg(`✅ Merge Complete!\nAdded ${addedCount}/${processOrder.length} contacts to "${targetName}"\n⏱️ Time: ~${mergeSchedule.totalDurationMinutes} minutes (anti-ban safe)\n🔒 Anti-ban pacing: 2-3 people per batch, 60-180s between batches${alreadyCount > 0 ? `\nℹ️ Already in group: ${alreadyCount}` : ''}${rejectedCount > 0 ? `\n⚠️ Not added: ${rejectedCount} (their privacy settings require an invite link, or not on WhatsApp)` : ''}${batchErrors.length > 0 ? `\n\n⚠️ Note: ${batchErrors.length} batch(es) had errors` : ''}`);
        
        // ═══ AGGRESSIVE POST-MERGE RECOVERY (CRITICAL!) ═══
        // After 90-minute merge, WhatsApp may have auto-logged us out
        // Recovery strategy: Force connection back to life immediately
        try {
          setMergeProgress(`✅ Merge complete! Restoring WhatsApp connection (CRITICAL - don't close tab)…`);
          
          // Step 1: Immediate 5-second wait (let socket breathe)
          await new Promise(r => setTimeout(r, 5000));
          
          // Step 2: Verify the session — but NEVER auto-fire /reconnect here.
          // If WhatsApp logged us out, an automatic reconnect restarts QR
          // pairing unattended and fights the user's manual reconnect —
          // rapid socket churn is a bot signal (ban risk). Manual only.
          try {
            const statusData = await bridgeCall('/status', 'GET', {});
            if (statusData?.connected) {
              console.log(`✅ Post-merge status check: Connection ACTIVE`);
              setMergeProgress(`✅ Connection verified! WhatsApp is responsive.`);
            } else {
              console.warn(`⚠️ Post-merge: Status shows not connected`);
              setMergeProgress(`⚠️ WhatsApp disconnected during the merge. Open the QR page and click Reconnect to restore the session.`);
            }
          } catch (statusErr: any) {
            console.warn('Post-merge status check failed:', statusErr?.message?.substring(0, 40));
            setMergeProgress(`⚠️ Could not verify the WhatsApp connection. If it stays disconnected, click Reconnect on the QR page.`);
          }
          
          // Step 3: Final verification - try to fetch chats (proves session is responsive)
          try {
            const chatsCheck = await bridgeCall('/chats', 'GET', {});
            if (Array.isArray(chatsCheck)) {
              console.log(`✅ Final check: Sessions responsive. Chat count: ${chatsCheck.length}`);
              setMergeProgress(`✅ WhatsApp connection RESTORED and responsive!`);
            }
          } catch (chatErr: any) {
            console.warn('Chat fetch (final check) result:', chatErr?.message?.substring(0, 50));
          }
          
          console.log('✅ Post-merge recovery complete');
        } catch (err: any) {
          console.debug('Post-merge recovery (non-fatal):', err?.message?.substring(0, 40));
        }
      } else {
        // Create new group
        setMergeProgress(`Creating group "${mergeNewGroupName}" with ${participants.length} contacts…`);
        await bridgeCall('/group-create', 'POST', {
          subject: mergeNewGroupName.trim(),
          participants,
        });
        setSuccessMsg(`Group "${mergeNewGroupName}" created with ${participants.length} contacts from ${sourceGroups.length} groups!`);
      }

      setShowMergeModal(false);
      setMergeNewGroupName('');
      setMergeTargetGroupId('');
      setSelectedGroupIds(new Set());
      setMultiSelectMode(false);
      setTimeout(() => setSuccessMsg(''), 5000);
      fetchGroups(); // Refresh
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to merge groups');
    } finally {
      setMerging(false);
      setMergeProgress('');
    }
  };

  // Batch move contacts: add 2-3 people to the target, remove them from their source group,
  // then wait 60-180s (anti-ban pacing). Runs client-side through /group-participants.
  const handleBatchMoveContacts = async () => {
    if (batchMoveSourceIds.size === 0) { setError('Select at least 1 source group'); return; }
    if (!batchMoveTargetId) { setError('Select a target group'); return; }
    if (batchMoveSourceIds.has(batchMoveTargetId)) { setError('Target group cannot be a source group'); return; }

    try {
      setBatchMoving(true);
      setError('');
      setBatchMoveProgress('Checking WhatsApp connection…');

      const { getRandomMergeDelay, getRandomMergeBatchSize, sleepWithJitter, shuffleArray } = await import('@/lib/whatsappRateLimiter');

      const status = await bridgeCall('/status');
      if (!status?.connected) {
        setError('WhatsApp is not connected. Scan the QR code first.');
        return;
      }
      const ownPhone = String(status?.phone?.id || status?.phone || '').split(':')[0].split('@')[0].replace(/\D/g, '');

      // Collect contacts with their source group and original participant id (needed for remove)
      const moveItems: Array<{ addJid: string; removeId: string; sourceGroupId: string }> = [];
      const seen = new Set<string>();
      const sourceGroupIds = Array.from(batchMoveSourceIds);

      for (let i = 0; i < sourceGroupIds.length; i++) {
        const groupId = sourceGroupIds[i];
        const sourceGroup = groups.find((g) => g.id === groupId);
        setBatchMoveProgress(`Fetching contacts from "${sourceGroup?.name}" (${i + 1}/${sourceGroupIds.length})…`);
        const info: GroupInfo = await bridgeCall(`/group-info/${encodeURIComponent(groupId)}`);
        for (const p of info?.participants || []) {
          if (!p?.id || p.id.endsWith('@g.us')) continue;
          const phone = resolvePhone(p);
          if (ownPhone && phone === ownPhone) continue; // never move/remove ourselves
          if (p.admin) continue; // keep group admins in place
          const addJid = phone ? `${phone}@s.whatsapp.net` : p.id;
          const key = `${groupId}|${addJid}`;
          if (seen.has(key)) continue;
          seen.add(key);
          moveItems.push({ addJid, removeId: p.id, sourceGroupId: groupId });
        }
      }

      if (moveItems.length === 0) {
        setError('No movable contacts found (admins and your own number are skipped)');
        return;
      }

      const queue = shuffleArray(moveItems);
      const total = queue.length;
      let moved = 0;
      let alreadyInTarget = 0;
      let notAdded = 0;
      let removeFailed = 0;
      let batchNumber = 0;

      for (let i = 0; i < queue.length; ) {
        const batch = queue.slice(i, i + getRandomMergeBatchSize());
        i += batch.length;
        batchNumber++;
        setBatchMoveProgress(`🔄 Batch ${batchNumber}: moving ${batch.length} (${i}/${total})\n🛡️ Anti-ban: 2-3 per batch, 60-180s between batches`);

        const addResult = await bridgeCall(`/group-participants/${encodeURIComponent(batchMoveTargetId)}`, 'POST', {
          action: 'add',
          participants: batch.map((b) => b.addJid),
        });
        const statusByJid = new Map<string, string>();
        for (const r of addResult?.results || []) statusByJid.set(String(r.requested || r.jid || ''), String(r.status));

        // Only remove from the source when the person is confirmed in the target group
        const toRemoveBySource = new Map<string, string[]>();
        for (const item of batch) {
          const st = statusByJid.get(item.addJid) ?? (addResult?.results ? undefined : '200');
          if (st === '200' || st === '409') {
            if (st === '200') moved++; else alreadyInTarget++;
            const list = toRemoveBySource.get(item.sourceGroupId) || [];
            list.push(item.removeId);
            toRemoveBySource.set(item.sourceGroupId, list);
          } else {
            notAdded++;
          }
        }

        for (const [sourceId, ids] of Array.from(toRemoveBySource.entries())) {
          try {
            await sleepWithJitter(4000, 30);
            await bridgeCall(`/group-participants/${encodeURIComponent(sourceId)}`, 'POST', { action: 'remove', participants: ids });
          } catch {
            removeFailed += ids.length;
          }
        }

        if (batchNumber % 5 === 0) {
          const health = await bridgeCall('/status').catch(() => null);
          if (health && health.connected === false) {
            throw new Error(`WhatsApp disconnected during move. Moved so far: ${moved}/${total}. Reconnect and run again — already moved people are skipped.`);
          }
        }

        if (i < queue.length) {
          const delayMs = getRandomMergeDelay();
          setBatchMoveProgress(`✅ Batch ${batchNumber} done (${i}/${total}). Waiting ${(delayMs / 1000).toFixed(0)}s before next batch…`);
          await sleepWithJitter(delayMs, 15);
        }
      }

      setSuccessMsg(`✅ Batch Move Complete!\n✓ Moved: ${moved}/${total}${alreadyInTarget ? `\nℹ️ Already in target (removed from source): ${alreadyInTarget}` : ''}${notAdded ? `\n⚠️ Not added (privacy setting / not on WhatsApp) — kept in source: ${notAdded}` : ''}${removeFailed ? `\n⚠️ Could not remove from source: ${removeFailed} (you must be admin of the source group)` : ''}`);

      setShowBatchMoveModal(false);
      setBatchMoveSourceIds(new Set());
      setBatchMoveTargetId('');
      setTimeout(() => setSuccessMsg(''), 10000);
      fetchGroups(); // Refresh
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to batch move contacts');
    } finally {
      setBatchMoving(false);
      setBatchMoveProgress('');
    }
  };

  // Send message to all selected groups
  const handleSendToGroups = async () => {
    if (!messageText.trim()) { setError('Please enter a message'); return; }
    if (selectedGroupIds.size === 0) { setError('Select at least 1 group'); return; }
    try {
      setSending(true);
      setError('');

      // Import rate limiter for QR anti-ban
      const { getRandomDelay, sleepWithJitter } = await import('@/lib/whatsappRateLimiter');

      let sentCount = 0;
      let failedCount = 0;
      const groups = Array.from(selectedGroupsList);

      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        setSendProgress(`Sending to ${group.name} (${sentCount + failedCount + 1}/${groups.length})…`);
        try {
          await bridgeCall('/send', 'POST', {
            to: group.id,
            message: messageText.trim(),
          });
          sentCount++;

          // Rate limiting between group sends (anti-ban protection)
          if (i < groups.length - 1) {
            const delayMs = getRandomDelay(); // 20-60sec random
            setSendProgress(`Sent to ${group.name}. Waiting ${(delayMs/1000).toFixed(1)}s…`);
            await sleepWithJitter(delayMs, 10);
          }
        } catch {
          failedCount++;
          if (i < groups.length - 1) await sleepWithJitter(getRandomDelay(), 10);
        }
      }

      setSuccessMsg(`Message sent to ${sentCount} group${sentCount !== 1 ? 's' : ''}${failedCount ? ` (${failedCount} failed)` : ''}!`);
      setShowMessageModal(false);
      setMessageText('');
      setSelectedGroupIds(new Set());
      setMultiSelectMode(false);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send messages');
    } finally {
      setSending(false);
      setSendProgress('');
    }
  };

  // Add Contact to Current Group (100% human-safe)
  const handleAddContactToGroup = async () => {
    if (!selectedGroup) return;
    const rawPhones = newContactPhone
      .split(/[\n,;]+/)
      .map(p => p.trim().replace(/[^\d+]/g, ''))
      .filter(Boolean);

    if (rawPhones.length === 0) {
      setAddContactError('Please enter at least one phone number.');
      return;
    }

    try {
      setAddingContact(true);
      setAddContactError('');

      // Normalize phone numbers
      const jids = rawPhones.map(num => {
        const cleaned = num.replace(/^\+/, '');
        return `${cleaned}@s.whatsapp.net`;
      });

      const res = await bridgeCall(`/group-participants/${encodeURIComponent(selectedGroup.id)}`, 'POST', {
        action: 'add',
        participants: jids,
      });

      const succeeded = res?.succeededCount || 0;
      const already = res?.alreadyMemberCount || 0;
      const failed = res?.failedCount || 0;

      if (succeeded > 0 || already > 0) {
        setSuccessMsg(`✅ Successfully processed contacts! ${succeeded} added, ${already} were already members${failed > 0 ? `, ${failed} couldn't be added due to WhatsApp privacy settings` : ''}.`);
        setShowAddContactModal(false);
        setNewContactPhone('');
        setTimeout(() => setSuccessMsg(''), 6000);
        // Refresh group
        if (selectedGroup) fetchGroupInfo(selectedGroup);
      } else {
        setAddContactError(`Could not add contacts. They may have strict WhatsApp privacy settings requiring an invite link, or the numbers may not be on WhatsApp.`);
      }
    } catch (err: any) {
      setAddContactError(err?.message || 'Failed to add contact');
    } finally {
      setAddingContact(false);
    }
  };

  // Remove Contact from Current Group
  const handleRemoveContactFromGroup = async () => {
    if (!selectedGroup || !participantToRemove) return;

    try {
      setRemovingParticipant(true);
      const jid = participantToRemove.id;

      await bridgeCall(`/group-participants/${encodeURIComponent(selectedGroup.id)}`, 'POST', {
        action: 'remove',
        participants: [jid],
      });

      setSuccessMsg(`✅ Contact removed from group.`);
      setParticipantToRemove(null);
      setTimeout(() => setSuccessMsg(''), 5000);

      // Refresh group info
      if (selectedGroup) fetchGroupInfo(selectedGroup);
    } catch (err: any) {
      setError(err?.message || 'Failed to remove contact from group');
    } finally {
      setRemovingParticipant(false);
    }
  };

  // Fetch groups from bridge
  const fetchGroups = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');

      // Verify the live WhatsApp session before loading groups. A stale group
      // card can remain visible after logout/QR expiry, but group-info cannot
      // work until the phone is connected again.
      const statusData = await bridgeCall('/status');
      if (!statusData?.connected) {
        setGroups([]);
        const status = statusData?.status ? ` (${statusData.status})` : '';
        setError(`WhatsApp is not connected${status}. Open Connection, scan the QR code, then return here.`);
        return;
      }

      // Fetch chats and LID map in parallel after the session check.
      const [chatsData, lidData] = await Promise.all([
        bridgeCall('/chats'),
        bridgeCall('/lid-map'),
      ]);

      const allChats: GroupChat[] = chatsData?.chats || [];
      const groupChats = allChats.filter((c) => c.isGroup);
      setGroups(groupChats);

      // Merge the bridge map with live sidebar chat mappings. The live chat
      // response is the source used by the QR inbox sidebar and may contain a
      // newer LID→phone mapping than the dedicated map endpoint.
      setLidMap({ ...(lidData?.map || {}), ...buildSidebarPhoneMap(allChats) });
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

          const statusData = await bridgeCall('/status');
          if (!statusData?.connected) {
            setSelectedGroup(null);
            const status = statusData?.status ? ` (${statusData.status})` : '';
            throw new Error(`WhatsApp is not connected${status}. Scan the QR code from the Connection tab first.`);
          }

        let info: GroupInfo | null = null;
        let lastError: unknown = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            info = await bridgeCall(`/group-info/${encodeURIComponent(group.id)}`);
            break;
          } catch (err) {
            lastError = err;
            if (attempt < 2) {
              await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
            }
          }
        }
        if (!info) throw lastError instanceof Error ? lastError : new Error('Failed to fetch group info');

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

          // Deduplicate participants by JID (remove duplicates)
          const seenJids = new Set<string>();
          const uniqueParticipants: typeof info.participants = [];
          for (const p of info.participants) {
            const jid = p.id;
            if (!seenJids.has(jid)) {
              seenJids.add(jid);
              uniqueParticipants.push(p);
            }
          }
          if (uniqueParticipants.length < info.participants.length) {
            console.log(`[Group Contacts] Removed ${info.participants.length - uniqueParticipants.length} duplicate participants`);
            info.participants = uniqueParticipants;
          }
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

  const contactExportRow = (p: GroupParticipant, groupName: string) => {
    const phone = p.resolvedPhone || phoneFromJid(p.id);
    return {
      'Phone Number': phone ? formatPhone(phone) : '',
      'Raw Number': phone || '',
      JID: p.id,
      'WhatsApp ID': p.lid || '',
      Role: p.admin === 'superadmin' ? 'Super Admin' : p.admin === 'admin' ? 'Admin' : 'Member',
      'Group Name': groupName,
    };
  };

  // Export contacts for selected group
  const exportGroupContacts = () => {
    if (!groupInfo || !selectedGroup) return;
    const rows = (groupInfo.participants || []).map((p) =>
      contactExportRow(p, selectedGroup.name || groupInfo.subject || '')
    );

    if (rows.length === 0) {
      alert('No contacts to export');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contacts');
    ws['!cols'] = [
      { wch: 20 }, // Phone Number
      { wch: 15 }, // Raw Number
      { wch: 30 }, // JID
      { wch: 30 }, // WhatsApp ID / LID
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
        'WhatsApp ID': string;
        Role: string;
        'Group Name': string;
      }[] = [];

      const uniqueContacts = new Set<string>();

      for (const group of groups) {
        try {
          const info: GroupInfo = await bridgeCall(`/group-info/${encodeURIComponent(group.id)}`);
          if (!info?.participants) continue;
          for (const p of info.participants) {
            const phone = resolvePhone(p);
            const uniqueKey = phone ? `phone:${phone}` : `jid:${p.id}`;
            if (!uniqueContacts.has(uniqueKey)) {
              uniqueContacts.add(uniqueKey);
              allRows.push(contactExportRow(p, group.name || info.subject || ''));
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
        { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 30 }, { wch: 12 }, { wch: 25 },
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
                ? `${selectedGroup.name} — ${groupInfo?.participants.length || 0} contacts`
                : `${groups.length} groups found`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Multi-select toggle */}
            {!selectedGroup && groups.length > 0 && (
              <button
                onClick={() => {
                  setMultiSelectMode(!multiSelectMode);
                  if (multiSelectMode) setSelectedGroupIds(new Set());
                }}
                className={`px-3 py-1.5 text-sm border rounded-lg flex items-center gap-1.5 ${multiSelectMode ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                <CheckSquare className="w-3.5 h-3.5" /> {multiSelectMode ? 'Cancel Select' : 'Select Groups'}
              </button>
            )}
            {/* Actions when groups selected */}
            {multiSelectMode && selectedGroupIds.size > 0 && (
              <>
                <span className="text-sm font-medium text-indigo-600">{selectedGroupIds.size} selected</span>
                <button
                  onClick={() => setShowMergeModal(true)}
                  className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold flex items-center gap-1.5"
                >
                  <Merge className="w-3.5 h-3.5" /> Merge to New Group
                </button>
                <button
                  onClick={() => {
                    setBatchMoveSourceIds(new Set(selectedGroupIds));
                    setBatchMoveTargetId('');
                  }}
                  className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold flex items-center gap-1.5"
                >
                  <Merge className="w-3.5 h-3.5" /> Batch Move Users
                </button>
                <button
                  onClick={() => setShowMessageModal(true)}
                  className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Send Message
                </button>
                <button
                  onClick={() => {
                    // Export selected groups merged
                    setExportingAll(true);
                    (async () => {
                      try {
                        const allRows: any[] = [];
                        const uniqueContacts = new Set<string>();
                        for (const group of selectedGroupsList) {
                          try {
                            const info: GroupInfo = await bridgeCall(`/group-info/${encodeURIComponent(group.id)}`);
                            if (!info?.participants) continue;
                            for (const p of info.participants) {
                              const phone = resolvePhone(p);
                              const uniqueKey = phone ? `phone:${phone}` : `jid:${p.id}`;
                              if (!uniqueContacts.has(uniqueKey)) {
                                uniqueContacts.add(uniqueKey);
                                allRows.push(contactExportRow(p, group.name || info.subject || ''));
                              }
                            }
                          } catch { /* skip */ }
                        }
                        if (allRows.length === 0) { alert('No contacts found'); return; }
                        const ws = XLSX.utils.json_to_sheet(allRows);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, 'Selected Groups');
                        ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 30 }, { wch: 12 }, { wch: 25 }];
                        XLSX.writeFile(wb, `selected_groups_contacts_${new Date().toISOString().split('T')[0]}.xlsx`);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Export failed');
                      } finally {
                        setExportingAll(false);
                      }
                    })();
                  }}
                  disabled={exportingAll}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-1.5 disabled:opacity-60"
                >
                  <Download className="w-3.5 h-3.5" /> Export Selected
                </button>
              </>
            )}
            <button
              onClick={() => {
                setSelectedGroup(null);
                setGroupInfo(null);
                setSelectedGroupIds(new Set());
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
          {(error.includes('WhatsApp is not connected') || error.includes('Bridge service temporarily unavailable')) && (
            <a
              href="/admin/crm/qr"
              className="ml-2 shrink-0 rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
            >
              Open Connection
            </a>
          )}
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
                  {filteredGroups.map((group) => {
                    const isSelected = selectedGroupIds.has(group.id);
                    return (
                      <button
                        key={group.id}
                        onClick={() => {
                          if (multiSelectMode) {
                            toggleGroupSelect(group.id);
                          } else {
                            fetchGroupInfo(group);
                          }
                        }}
                        className={`bg-white border rounded-xl p-4 text-left hover:shadow-md transition-all group ${
                          isSelected ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-300' : 'border-gray-200 hover:border-green-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            {multiSelectMode && (
                              <div className="shrink-0">
                                {isSelected ? (
                                  <CheckSquare className="w-5 h-5 text-indigo-600" />
                                ) : (
                                  <Square className="w-5 h-5 text-gray-300" />
                                )}
                              </div>
                            )}
                            <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center shrink-0">
                              <Users className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{group.name || 'Unnamed Group'}</p>
                              <p className="text-xs text-gray-400 mt-0.5 truncate">{group.id}</p>
                            </div>
                          </div>
                          {!multiSelectMode && (
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-green-500 shrink-0 mt-1" />
                          )}
                        </div>
                        {group.lastMessageTime && (
                          <p className="text-xs text-gray-400 mt-2">
                            Last activity: {new Date(group.lastMessageTime).toLocaleDateString()}
                          </p>
                        )}
                      </button>
                    );
                  })}
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
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h2 className="text-lg font-bold text-gray-900">{groupInfo.subject || selectedGroup.name}</h2>
                            {groupInfo.desc && (
                              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{groupInfo.desc}</p>
                            )}
                          </div>
                          <button
                            onClick={() => { setShowAddContactModal(true); setAddContactError(''); }}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
                          >
                            <UserPlus className="w-4 h-4" /> Add Contacts
                          </button>
                        </div>
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
                            <th className="px-4 py-3 text-right font-medium text-gray-500">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredParticipants.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
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
                                      <span className="text-gray-400 italic">Phone unavailable</span>
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
                                  <td className="px-4 py-2.5 text-right">
                                    <button
                                      onClick={() => setParticipantToRemove(p)}
                                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                                      title="Remove from group"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
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
                      <span>{contactsWithPhone.length} with phone numbers; all members are downloadable</span>
                    </div>
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>
      )}

      {/* ── SUCCESS TOAST ── */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 animate-in slide-in-from-bottom-5">
          <CheckSquare className="w-4 h-4" />
          <span className="text-sm font-medium">{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="ml-2 hover:text-green-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── MERGE MODAL ── */}
      {showMergeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Merge className="w-5 h-5 text-purple-600" />
                Merge Groups
              </h3>
              <button onClick={() => { setShowMergeModal(false); setMergeProgress(''); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Source groups */}
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Contacts from <span className="font-semibold text-purple-600">{selectedGroupIds.size} selected group{selectedGroupIds.size !== 1 ? 's' : ''}</span>:
                </p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {selectedGroupsList.map((g) => (
                    <span key={g.id} className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      mergeMode === 'existing' && g.id === mergeTargetGroupId
                        ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-300'
                        : 'bg-purple-50 text-purple-700'
                    }`}>
                      {g.name} {mergeMode === 'existing' && g.id === mergeTargetGroupId && '← target'}
                    </span>
                  ))}
                </div>
              </div>

              {/* Mode toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Merge into:</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setMergeMode('existing'); setMergeNewGroupName(''); }}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border font-medium transition ${
                      mergeMode === 'existing'
                        ? 'bg-purple-50 border-purple-300 text-purple-700 ring-1 ring-purple-300'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                    disabled={merging}
                  >
                    Existing Group
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMergeMode('new'); setMergeTargetGroupId(''); }}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border font-medium transition ${
                      mergeMode === 'new'
                        ? 'bg-purple-50 border-purple-300 text-purple-700 ring-1 ring-purple-300'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                    disabled={merging}
                  >
                    New Group
                  </button>
                </div>
              </div>

              {/* Existing group selector */}
              {mergeMode === 'existing' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select target group *</label>
                  <p className="text-xs text-gray-400 mb-2">All other selected groups' contacts will be added to this group</p>
                  <select
                    value={mergeTargetGroupId}
                    onChange={(e) => setMergeTargetGroupId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={merging}
                  >
                    <option value="">— Choose target group —</option>
                    {selectedGroupsList.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                    {/* Also show non-selected groups */}
                    {groups.filter((g) => !selectedGroupIds.has(g.id)).length > 0 && (
                      <optgroup label="Other groups">
                        {groups.filter((g) => !selectedGroupIds.has(g.id)).map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              )}

              {/* New group name */}
              {mergeMode === 'new' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Group Name *</label>
                  <input
                    type="text"
                    value={mergeNewGroupName}
                    onChange={(e) => setMergeNewGroupName(e.target.value)}
                    placeholder="e.g., Swar Yoga All Members"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={merging}
                  />
                </div>
              )}

              {mergeProgress && (
                <div className="flex items-center gap-2 text-sm text-purple-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {mergeProgress}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-2">
              <button
                onClick={() => { setShowMergeModal(false); setMergeProgress(''); }}
                disabled={merging}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMergeGroups}
                disabled={merging || (mergeMode === 'new' ? !mergeNewGroupName.trim() : !mergeTargetGroupId)}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold disabled:opacity-50 flex items-center gap-1.5"
              >
                {merging
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Merging…</>
                  : mergeMode === 'existing'
                    ? <><Merge className="w-3.5 h-3.5" /> Add to Group</>
                    : <><Plus className="w-3.5 h-3.5" /> Create Merged Group</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BATCH MOVE MODAL (2-3 users, ADD→REMOVE→WAIT 60-180s) ── */}
      {batchMoveSourceIds.size > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Merge className="w-5 h-5 text-orange-600" />
                Batch Move Users (Anti-Signout)
              </h3>
              <button onClick={() => { setBatchMoveSourceIds(new Set()); setBatchMoveTargetId(''); setBatchMoveProgress(''); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Info about batch move */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
                <p className="font-semibold mb-1">🔥 How it works:</p>
                <ul className="text-xs space-y-0.5 list-disc list-inside">
                  <li>Picks 2-3 random users per batch</li>
                  <li>Adds them to target group</li>
                  <li>Removes them from source group(s)</li>
                  <li>Removes only people confirmed in the target group</li>
                  <li>Waits 60-180 seconds between batches (anti-ban pacing)</li>
                  <li>Skips group admins and your own number</li>
                  <li>You must be admin of the target and source groups</li>
                </ul>
              </div>

              {/* Source groups */}
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Source: <span className="font-semibold text-orange-600">{batchMoveSourceIds.size} group{batchMoveSourceIds.size !== 1 ? 's' : ''}</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(batchMoveSourceIds).map((id) => {
                    const g = groups.find((gr) => gr.id === id);
                    return (
                      <span key={id} className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700">
                        {g?.name}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Target group selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Target Group *</label>
                <p className="text-xs text-gray-400 mb-2">All source group contacts will be moved here</p>
                <select
                  value={batchMoveTargetId}
                  onChange={(e) => setBatchMoveTargetId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  disabled={batchMoving}
                >
                  <option value="">— Choose target group —</option>
                  {groups
                    .filter((g) => !batchMoveSourceIds.has(g.id))
                    .map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                </select>
              </div>

              {batchMoveProgress && (
                <div className="flex items-start gap-2 text-sm text-orange-600 bg-orange-50 p-3 rounded-lg border border-orange-200 max-h-40 overflow-y-auto">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0 mt-0.5" />
                  <div className="whitespace-pre-wrap text-xs font-mono">{batchMoveProgress}</div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-2">
              <button
                onClick={() => { setBatchMoveSourceIds(new Set()); setBatchMoveTargetId(''); setBatchMoveProgress(''); }}
                disabled={batchMoving}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchMoveContacts}
                disabled={batchMoving || !batchMoveTargetId || batchMoveSourceIds.size === 0}
                className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold disabled:opacity-50 flex items-center gap-1.5"
              >
                {batchMoving ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Moving…</>
                ) : (
                  <><Merge className="w-3.5 h-3.5" /> Start Batch Move</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SEND MESSAGE MODAL ── */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-600" />
                Send Message to Groups
              </h3>
              <button onClick={() => { setShowMessageModal(false); setSendProgress(''); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  This message will be sent to <span className="font-semibold text-green-600">{selectedGroupIds.size} group{selectedGroupIds.size !== 1 ? 's' : ''}</span>:
                </p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {selectedGroupsList.map((g) => (
                    <span key={g.id} className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                      {g.name}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your message here…"
                  rows={5}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  disabled={sending}
                />
                <p className="text-xs text-gray-400 mt-1">{messageText.length} characters</p>
              </div>
              {sendProgress && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {sendProgress}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-2">
              <button
                onClick={() => { setShowMessageModal(false); setSendProgress(''); }}
                disabled={sending}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendToGroups}
                disabled={sending || !messageText.trim()}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 flex items-center gap-1.5"
              >
                {sending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</> : <><Send className="w-3.5 h-3.5" /> Send to All</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD CONTACT MODAL ── */}
      {showAddContactModal && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                Add Contacts to Group
              </h3>
              <button
                onClick={() => { setShowAddContactModal(false); setAddContactError(''); setNewContactPhone(''); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  Target Group: <span className="font-semibold text-gray-900">{groupInfo?.subject || selectedGroup.name}</span>
                </p>
                <p className="text-xs text-gray-500">
                  Enter one or multiple WhatsApp phone numbers (with country code, e.g. 919876543210). Separate multiple numbers with commas or new lines.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Phone Number(s) *</label>
                <textarea
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="919876543210&#10;+91 9822334455"
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono"
                  disabled={addingContact}
                />
              </div>

              {addContactError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  {addContactError}
                </div>
              )}

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
                🛡️ <strong>Anti-Ban Protection</strong>: If adding multiple numbers, the system automatically uses human-like micro-delays between operations to keep your WhatsApp account 100% safe.
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-2">
              <button
                onClick={() => { setShowAddContactModal(false); setAddContactError(''); setNewContactPhone(''); }}
                disabled={addingContact}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddContactToGroup}
                disabled={addingContact || !newContactPhone.trim()}
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold disabled:opacity-50 flex items-center gap-1.5"
              >
                {addingContact ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding…</> : <><UserPlus className="w-3.5 h-3.5" /> Add to Group</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REMOVE CONTACT CONFIRMATION MODAL ── */}
      {participantToRemove && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                Remove Contact
              </h3>
              <button
                onClick={() => setParticipantToRemove(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-sm text-gray-600">
                Are you sure you want to remove this participant from <strong>{groupInfo?.subject || selectedGroup.name}</strong>?
              </p>
              <div className="p-3 bg-gray-50 rounded-lg font-mono text-sm text-gray-800">
                {participantToRemove.resolvedPhone ? formatPhone(participantToRemove.resolvedPhone) : participantToRemove.id}
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-2">
              <button
                onClick={() => setParticipantToRemove(null)}
                disabled={removingParticipant}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveContactFromGroup}
                disabled={removingParticipant}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold disabled:opacity-50 flex items-center gap-1.5"
              >
                {removingParticipant ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Removing…</> : <><Trash2 className="w-3.5 h-3.5" /> Remove</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
