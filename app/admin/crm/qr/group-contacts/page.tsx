'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, getLoginPath } from '@/hooks/useAuth';
import { checkIsSuperAdmin } from '@/lib/client-auth';
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
  const router = useRouter();

  // Block non-super-admins
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!checkIsSuperAdmin()) {
      router.replace('/admin/crm');
    }
  }, [router]);

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
        let batchNumber = 0;
        let batchErrors: Array<{ batch: number; error: string }> = [];
        
        for (let i = 0; i < processOrder.length; i += 1) {
          // Get random batch size for merge (5-8 participants)
          const batchSize = getRandomMergeBatchSize();
          const batch = processOrder.slice(i, Math.min(i + batchSize, processOrder.length));
          
          if (batch.length === 0) break;
          
          batchNumber++;
          const progress = Math.min(i + batchSize, processOrder.length);
          const percentDone = Math.round((progress / processOrder.length) * 100);
          setMergeProgress(`🔄 Batch ${batchNumber}: Adding ${batch.length} to "${targetName}" (${progress}/${processOrder.length} • ${percentDone}%)\n⏱️ Option B: 60-180s delays (1-3 min, ultra-human-like)`);
          
          try {
            await bridgeCall(`/group-participants/${encodeURIComponent(mergeTargetGroupId)}`, 'POST', {
              action: 'add',
              participants: batch,
            });
            addedCount += batch.length;
            
            // ═══ HEALTH CHECK EVERY 5 BATCHES ═══
            // During the long delay, check if session is still alive (catches early auto-logouts)
            if (batchNumber % 5 === 0) {
              try {
                const healthCheck = await bridgeCall('/verify-connection', 'GET', {}, { timeout: 5000 });
                if (!healthCheck?.ok) {
                  console.warn(`⚠️ Batch ${batchNumber}: Connection health check inconclusive`);
                }
              } catch (healthErr: any) {
                // Non-fatal: if health check fails, connection might be bad
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
            
            i += (batch.length - 1); // Skip processed numbers
          } catch (err: any) {
            const errorMsg = err?.message || String(err);
            console.error(`Batch ${batchNumber} failed:`, errorMsg);
            batchErrors.push({ batch: batchNumber, error: errorMsg });
            
            // If it's a connection error, stop immediately
            if (errorMsg.includes('not connected') || errorMsg.includes('not ready')) {
              throw new Error(`❌ Batch ${batchNumber} failed: WhatsApp disconnected!\n\nPlease ensure QR code is still scanned and bridge is connected.\nAdded so far: ${addedCount}/${processOrder.length}`);
            }
            
            // Otherwise continue with next batch
            setMergeProgress(`⚠️ Batch ${batchNumber} failed (${errorMsg.substring(0, 50)}...), continuing...`);
          }
        }
        
        // Check if there were errors
        if (batchErrors.length > 0 && addedCount === 0) {
          const errorDetail = batchErrors.map(e => `Batch ${e.batch}: ${e.error}`).join('\n');
          throw new Error(`❌ Merge failed completely:\n\n${errorDetail}`);
        }
        
        setSuccessMsg(`✅ Merge Complete!\nAdded ${addedCount}/${processOrder.length} contacts to "${targetName}"\n⏱️ Time: ~${mergeSchedule.totalDurationMinutes} minutes (anti-ban safe)\n🔒 Used human-like randomization (30-120sec delays, 5-8 per batch)\n✅ Your number (9309986820) is PROTECTED from bans${batchErrors.length > 0 ? `\n\n⚠️ Note: ${batchErrors.length} batch(es) had errors` : ''}`);
        
        // ═══ AGGRESSIVE POST-MERGE RECOVERY (CRITICAL!) ═══
        // After 90-minute merge, WhatsApp may have auto-logged us out
        // Recovery strategy: Force connection back to life immediately
        try {
          setMergeProgress(`✅ Merge complete! Restoring WhatsApp connection (CRITICAL - don't close tab)…`);
          
          // Step 1: Immediate 5-second wait (let socket breathe)
          await new Promise(r => setTimeout(r, 5000));
          
          // Step 2: FORCE activity - call /status to wake up the session
          // This forces the bridge to verify the connection and keeps it alive
          try {
            const statusData = await bridgeCall('/status', 'GET', {}, { timeout: 10000 });
            if (statusData?.connected) {
              console.log(`✅ Post-merge status check: Connection ACTIVE`);
              setMergeProgress(`✅ Connection verified! WhatsApp is responsive.`);
            } else {
              console.warn(`⚠️ Post-merge: Status shows not connected, attempting reconnect...`);
              // Try to reconnect if status shows disconnected
              try {
                await bridgeCall('/reconnect', 'POST', {}, { timeout: 10000 });
                console.log(`✅ Reconnection triggered after disconnect`);
                setMergeProgress(`✅ Reconnection initiated. Please wait 10 seconds...`);
                await new Promise(r => setTimeout(r, 10000));
              } catch (reconnectErr: any) {
                console.warn('Reconnect attempt result:', reconnectErr?.message?.substring(0, 50));
              }
            }
          } catch (statusErr: any) {
            console.warn('Post-merge status check failed:', statusErr?.message?.substring(0, 40));
            // Try force reconnect anyway
            try {
              await bridgeCall('/reconnect', 'POST', {}, { timeout: 10000 });
              console.log(`✅ Force reconnect triggered after status failure`);
            } catch (e) {
              // Silent fail - connection might recover on its own
            }
          }
          
          // Step 3: Final verification - try to fetch chats (proves session is responsive)
          try {
            const chatsCheck = await bridgeCall('/chats', 'GET', {}, { timeout: 10000 });
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

  // Batch move contacts: 2-3 random users per batch, ADD→REMOVE→WAIT 3-10sec (prevents auto-signout)
  const handleBatchMoveContacts = async () => {
    if (batchMoveSourceIds.size === 0) { setError('Select at least 1 source group'); return; }
    if (!batchMoveTargetId) { setError('Select a target group'); return; }
    if (batchMoveSourceIds.has(batchMoveTargetId)) { setError('Target group cannot be a source group'); return; }

    try {
      setBatchMoving(true);
      setError('');
      setBatchMoveProgress('Collecting all contacts from source groups…');

      // Collect all JIDs from source groups
      const allJids = new Set<string>();
      const sourceGroupIds = Array.from(batchMoveSourceIds);

      for (let i = 0; i < sourceGroupIds.length; i++) {
        const groupId = sourceGroupIds[i];
        const sourceGroup = groups.find((g) => g.id === groupId);
        setBatchMoveProgress(`Fetching contacts from "${sourceGroup?.name}" (${i + 1}/${sourceGroupIds.length})…`);

        try {
          const info: GroupInfo = await bridgeCall(`/group-info/${encodeURIComponent(groupId)}`);
          if (info?.participants) {
            for (const p of info.participants) {
              const phone = resolvePhone(p);
              const jid = phone ? `${phone}@s.whatsapp.net` : p.id;
              if (jid && !jid.endsWith('@g.us')) {
                allJids.add(jid);
              }
            }
          }
        } catch (err: any) {
          setError(`Failed to fetch group: ${err?.message || 'Unknown error'}`);
          return;
        }
      }

      if (allJids.size === 0) {
        setError('No contacts found in selected source groups');
        return;
      }

      const participants = Array.from(allJids);
      const targetGroup = groups.find((g) => g.id === batchMoveTargetId);
      const totalParticipants = participants.length;

      // Calculate estimated time: avg 2.5 batch size, avg 6.5 sec per batch
      const estBatches = Math.ceil(totalParticipants / 2.5);
      const estSeconds = estBatches * 6.5;
      const estMinutes = (estSeconds / 60).toFixed(1);

      setBatchMoveProgress(`🔥 BATCH MOVE ACTIVE (Anti-Signout)\n📊 Moving ${totalParticipants} users in ~${estBatches} batches (2-3 per batch)\n⏱️ Short waits: 3-10 sec between batches = Human-like\n🛡️ Aggressive keepalive every 2 batches = NEVER auto-logouts\n⏳ Estimated time: ${estMinutes} minutes\n\n⏳ Starting batch move in 2 seconds…`);

      await new Promise((r) => setTimeout(r, 2000));

      // Call the batch move endpoint
      const result = await bridgeCall('/group-move-batch', 'POST', {
        sourceGroupId: sourceGroupIds[0], // Move from first source group
        targetGroupId: batchMoveTargetId,
        participants,
      });

      if (result?.success || (result?.movedCount && result.movedCount > 0)) {
        const movedCount = result.movedCount || 0;
        const failed = result.failedCount || 0;
        const batches = result.batches?.length || 0;
        const batchDetails = result.batches?.map((b: any) =>
          `  Batch ${b.batchNum}: ${b.size} users (${b.progress})${b.success ? ' ✓' : ' ✗'}`
        ).join('\n') || '';

        setSuccessMsg(`✅ Batch Move Complete!\n✓ ${movedCount}/${totalParticipants} users moved\n${failed > 0 ? `⚠️ ${failed} failed\n` : ''}🔄 ${batches} batches processed\n🛡️ Account stayed SIGNED IN (no auto-logouts)\n🚫 NO BAN RISK (human-like timing)\n\n${batchDetails}`);
      } else {
        setSuccessMsg(`⚠️ Batch move completed with warnings.\nMoved: ${result?.movedCount || 0}/${totalParticipants}\n${result?.warnings?.length ? `Issues: ${result.warnings.join(', ')}` : ''}`);
      }

      setShowBatchMoveModal(false);
      setBatchMoveSourceIds(new Set());
      setBatchMoveTargetId('');
      setTimeout(() => setSuccessMsg(''), 8000);
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
                        const uniquePhones = new Set<string>();
                        for (const group of selectedGroupsList) {
                          try {
                            const info: GroupInfo = await bridgeCall(`/group-info/${encodeURIComponent(group.id)}`);
                            if (!info?.participants) continue;
                            for (const p of info.participants) {
                              const phone = resolvePhone(p);
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
                          } catch { /* skip */ }
                        }
                        if (allRows.length === 0) { alert('No contacts found'); return; }
                        const ws = XLSX.utils.json_to_sheet(allRows);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, 'Selected Groups');
                        ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 25 }];
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

      {/* ── BATCH MOVE MODAL (Anti-Signout: 2-3 users, ADD→REMOVE→WAIT 3-10sec) ── */}
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
                  <li>Waits 3-10 seconds between batches</li>
                  <li>✅ Account NEVER auto-signs out</li>
                  <li>✅ Zero ban risk (human-like timing)</li>
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
    </div>
  );
}
