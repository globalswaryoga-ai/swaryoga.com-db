import { assembleRegistrationLeads, registrationBatchRows } from '@/lib/registrationLeads';
import { readRegistrationState, registrationWorkshops, saveRegistrationGate, type RegistrationState } from '@/lib/registrationState';
import { readRegistrationDecisions, registrationDecisionKey } from '@/lib/registrationAiConfig';
import { registrationGatePatch } from '@/lib/registrationGates';
import { getWhatsAppBridgeConfig } from '@/lib/whatsappBridgeConfig';
import { getBunnyCrmUserSettings } from '@/lib/bunnyCrmSettings';

export interface AutoAddGroupOptions {
  state: RegistrationState;
  leads: any[];
  forms: any[];
  submissions: any[];
  viewer: { userId: string; superAdmin: boolean };
  batchId?: string;
  force?: boolean;
}

export async function processAutoAddGroups({
  state,
  leads,
  forms,
  submissions,
  viewer,
  batchId,
  force = false,
}: AutoAddGroupOptions) {
  const scope = viewer.superAdmin ? 'shared' : viewer.userId;
  const workshops = registrationWorkshops(state);
  const targetWorkshops = batchId
    ? workshops.filter(w => String(w.id) === String(batchId))
    : workshops.filter(w => Boolean(w.whatsappGroupLink || w.metadata?.whatsappGroupLink));

  const formIds = new Set(forms.map(form => form.formId));
  const rows = assembleRegistrationLeads(leads, submissions.filter(sub => viewer.superAdmin || formIds.has(sub.formId)), forms);

  const now = Date.now();
  const results: Array<{
    batchId: string;
    batchName: string;
    eligibleCount: number;
    addedCount: number;
    skippedCount: number;
    leadResults: Array<{ id: string; name: string; phone: string; status: string; reason?: string }>;
  }> = [];

  const owner = viewer.userId || 'admin';
  const settings = await getBunnyCrmUserSettings(owner);
  const config = getWhatsAppBridgeConfig();
  const sessionId = settings?.permanentTenantId || (settings?.qrBridgeUrl ? owner : viewer.superAdmin ? '0002456' : '');
  const custom = !settings?.permanentTenantId && settings?.qrBridgeUrl;
  const bridgeUrl = custom || config.url;
  const bridgeSecret = custom ? (settings?.qrBridgeSecret || config.secret) : config.secret;

  for (const workshop of targetWorkshops) {
    const link = String(workshop.whatsappGroupLink || workshop.metadata?.whatsappGroupLink || '').trim();
    if (!link) continue;

    // Check if autoAddGroupAfter24h is explicitly disabled
    if (workshop.metadata?.autoAddGroupAfter24h === false && !force) continue;

    const decisions = readRegistrationDecisions(state, String(workshop.id));
    const batchRows = registrationBatchRows(rows, workshop);
    const eligibleToGroupAdd: Array<{ row: (typeof batchRows)[number]; phone: string }> = [];

    for (const row of batchRows) {
      const decision = decisions[row.id] || {};
      const isApproved = decision.isRegistered === true ||
        String(decision.status || '').toLowerCase().startsWith('approval') ||
        (Array.isArray(decision.copies) && decision.copies.some((c: string) => String(c).toLowerCase().startsWith('approval')));

      if (!isApproved || decision.isRejected) continue;

      // Skip if already joined or explicitly resolved
      if (['joined', 'added_manually', 'auto_added', 'skipped'].includes(String(decision.groupStatus || ''))) {
        continue;
      }

      const phone = String(row.phoneNumber || row.mobile || '').replace(/\D/g, '');
      if (phone.length < 10) continue;

      // 24-hour verification
      const auditTime = decision.finalApprovalAudit?.at || decision.zoomGateAudit?.at || row.createdAt;
      const approvalTimestamp = auditTime ? new Date(auditTime).getTime() : 0;
      const hoursPassed = approvalTimestamp ? (now - approvalTimestamp) / (60 * 60 * 1000) : 0;

      if (!force && hoursPassed < 24) {
        continue; // Not yet 24 hours
      }

      eligibleToGroupAdd.push({ row, phone });
    }

    const batchSummary = {
      batchId: String(workshop.id),
      batchName: String(workshop.name),
      eligibleCount: eligibleToGroupAdd.length,
      addedCount: 0,
      skippedCount: 0,
      leadResults: [] as Array<{ id: string; name: string; phone: string; status: string; reason?: string }>,
    };

    // Resolve WhatsApp Group JID if needed
    let groupId = /^\d+@g\.us$/.test(link) ? link : (workshop.metadata?.whatsappStudentGroup?.id || '');
    if (!groupId && sessionId) {
      try {
        const urlObj = new URL(link);
        const inviteCode = urlObj.pathname.split('/').filter(Boolean)[0];
        if (inviteCode) {
          const chatsRes = await fetch(`${String(bridgeUrl).replace(/\/+$/, '')}/chats`, {
            headers: { 'x-bridge-secret': bridgeSecret, 'x-user-id': owner, 'x-session-key': sessionId, 'x-tenant-id': sessionId },
            signal: AbortSignal.timeout(10000),
          }).catch(() => null);
          if (chatsRes?.ok) {
            const chatsData = await chatsRes.json();
            const rowsList = Array.isArray(chatsData) ? chatsData : (chatsData.chats || chatsData.data?.chats || []);
            const groups = rowsList.filter((r: any) => String(r.id || r.jid || '').endsWith('@g.us'));
            for (const g of groups.slice(0, 40)) {
              const gId = String(g.id || g.jid);
              const inv = await fetch(`${String(bridgeUrl).replace(/\/+$/, '')}/group-invite/${encodeURIComponent(gId)}`, {
                headers: { 'x-bridge-secret': bridgeSecret, 'x-user-id': owner, 'x-session-key': sessionId, 'x-tenant-id': sessionId },
                signal: AbortSignal.timeout(5000),
              }).then(r => r.json()).catch(() => null);
              if (inv?.code === inviteCode) {
                groupId = gId;
                break;
              }
            }
          }
        }
      } catch (err) {
        console.warn('Could not auto-resolve group JID from invite link:', err);
      }
    }

    for (const item of eligibleToGroupAdd) {
      const { row, phone } = item;
      const formattedPhone = phone.length === 10 ? `91${phone}` : phone;
      const participantJid = `${formattedPhone}@s.whatsapp.net`;

      let bridgeSuccess = false;
      let failureReason = '';

      if (groupId && sessionId) {
        try {
          const res = await fetch(`${String(bridgeUrl).replace(/\/+$/, '')}/group-participants`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-bridge-secret': bridgeSecret,
              'x-user-id': owner,
              'x-session-key': sessionId,
              'x-tenant-id': sessionId,
            },
            body: JSON.stringify({ groupId, participants: [participantJid], action: 'add' }),
            signal: AbortSignal.timeout(15000),
          });
          const resData = await res.json().catch(() => ({}));
          if (res.ok) {
            bridgeSuccess = true;
          } else {
            failureReason = resData.error || `HTTP ${res.status}`;
          }
        } catch (e: any) {
          failureReason = e.message || 'Bridge request failed';
        }
      }

      try {
        const previous = decisions[row.id] || {};
        const patch = registrationGatePatch(
          previous.isRegistered ? previous : { ...previous, isRegistered: true },
          'auto_added',
          viewer.userId
        );
        const key = registrationDecisionKey(String(workshop.id), String(row.id));
        await saveRegistrationGate(key, { ...previous, ...patch, autoAddedAt: new Date().toISOString() }, state[key], scope);
        batchSummary.addedCount++;
        batchSummary.leadResults.push({
          id: String(row.id),
          name: String(row.name || phone),
          phone,
          status: bridgeSuccess ? 'auto_added_to_whatsapp' : 'marked_auto_added',
          reason: failureReason || undefined,
        });
      } catch (gateErr: any) {
        batchSummary.skippedCount++;
        batchSummary.leadResults.push({
          id: String(row.id),
          name: String(row.name || phone),
          phone,
          status: 'failed',
          reason: gateErr.message,
        });
      }
    }

    results.push(batchSummary);
  }

  return results;
}
