import { createHash } from 'node:crypto';
import { getBunnyCrmUserSettings } from '@/lib/bunnyCrmSettings';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { registrationPhone } from '@/lib/registrationLeads';
import { registrationLeadOwned } from '@/lib/registrationAuth';
import { getWhatsAppBridgeConfig } from '@/lib/whatsappBridgeConfig';
import { getCohort, listStudents, updateCohort, updateWorkshopGroupStudents, insertWorkshopGroupStudents } from '@/lib/workshopBunnyRepository';

type Participant = { id?: string; jid?: string; lid?: string; resolvedPhone?: string; phone?: string; number?: string; name?: string; notify?: string };
type Viewer = { userId: string; superAdmin: boolean };

export function workshopParticipantPhone(participant: Participant): string {
  for (const value of [participant.resolvedPhone, participant.phone, participant.number, participant.jid, participant.id]) {
    if (!value || value.endsWith('@lid') || value.endsWith('@g.us')) continue;
    const phone = registrationPhone(value);
    if (/^\d{10,15}$/.test(phone)) return phone;
  }
  return '';
}

export async function syncWorkshopWhatsappStudents(cohortId: string, viewer: Viewer, supplied?: Participant[]) {
  const cohort = await getCohort(cohortId);
  if (!cohort) throw new Error('Workshop not found');
  if (!viewer.superAdmin && cohort.createdByUserId !== viewer.userId) throw new Error('This workshop belongs to another admin');
  const owner = String(cohort.createdByUserId || '');
  if (!owner) throw new Error('Workshop has no saved owner; set its owner before syncing');
  const ownerViewer = { userId: owner, superAdmin: ['admin', 'admincrm'].includes(owner) };
  let participants = supplied;
  if (!participants) {
    const link = String(cohort.whatsappGroupLink || '').trim();
    if (!link) throw new Error('Save a WhatsApp group link in Workshop Settings first');
    const settings = await getBunnyCrmUserSettings(owner);
    const config = getWhatsAppBridgeConfig();
    const sessionId = settings?.permanentTenantId || (settings?.qrBridgeUrl ? owner : ownerViewer.superAdmin ? '0002456' : '');
    if (!sessionId) throw new Error('Connect the workshop owner to an isolated QR WhatsApp session first');
    const custom = !settings?.permanentTenantId && settings?.qrBridgeUrl;
    const bridgeUrl = custom || config.url;
    const bridgeSecret = custom ? settings?.qrBridgeSecret || config.secret : config.secret;
    const deadline = Date.now() + 90000;
    const bridge = async (path: string) => {
      if (Date.now() >= deadline) throw new Error('WhatsApp group lookup timed out. Retry or save the exact group JID.');
      const response = await fetch(`${String(bridgeUrl).replace(/\/+$/, '')}${path}`, {
        headers: { 'x-bridge-secret': bridgeSecret, 'x-user-id': owner, 'x-session-key': sessionId, 'x-tenant-id': sessionId },
        signal: AbortSignal.timeout(15000), cache: 'no-store',
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`WhatsApp group lookup failed (${response.status}): ${text.slice(0, 200)}`);
      return JSON.parse(text);
    };
    let groupId = /^\d+@g\.us$/.test(link) ? link : '';
    if (!groupId) {
      const url = new URL(link);
      if (url.hostname !== 'chat.whatsapp.com') throw new Error('Use a chat.whatsapp.com group invitation link');
      const code = url.pathname.split('/').filter(Boolean)[0];
      if (!code || !/^[A-Za-z0-9]+$/.test(code)) throw new Error('Invalid WhatsApp group invitation');
      const cached = cohort.metadata?.whatsappStudentGroup;
      if (cached?.link === link && /^\d+@g\.us$/.test(cached.id)) groupId = cached.id;
      else {
        const chats = await bridge('/chats');
        const rows = Array.isArray(chats) ? chats : chats.chats || chats.data?.chats;
        if (!Array.isArray(rows)) throw new Error('Bridge returned no chat list');
        const groups = rows.filter(row => String(row.id || row.jid || '').endsWith('@g.us'));
        const words = String(cohort.name).toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 3);
        const score = (row: { name?: string; subject?: string }) => words.filter(word => String(row.name || row.subject || '').toLowerCase().includes(word)).length;
        groups.sort((a, b) => score(b) - score(a));
        const errors: string[] = [];
        // Invite codes are not included in /chats; resolve them once, then cache the exact link+JID.
        for (const group of groups.slice(0, 60)) {
          if (Date.now() >= deadline) break;
          const id = String(group.id || group.jid);
          try {
            const invite = await bridge(`/group-invite/${encodeURIComponent(id)}`);
            if (invite.code === code) { groupId = id; break; }
          } catch (error) {
            errors.push(error instanceof Error ? error.message : 'Group invitation lookup failed');
          }
        }
        if (!groupId) throw new Error(`Saved group link could not be resolved. The owner's QR account must be a group admin; alternatively save the exact group JID. Checked ${Math.min(groups.length, 60)} groups.${errors.length ? ` ${errors[0]}` : ''}`);
        const saved = await updateCohort(cohortId, { metadata: { ...cohort.metadata, whatsappStudentGroup: { link, id: groupId } } }, { metadata: cohort.metadata });
        if (!saved) throw new Error('Workshop settings changed while resolving the group. Retry.');
      }
    }
    const info = await bridge(`/group-info/${encodeURIComponent(groupId)}`);
    participants = info.participants || info.data?.participants;
    if (!Array.isArray(participants)) throw new Error('Bridge returned no group participants');
  }

  const [leads, students] = await Promise.all([loadBunnyLeads(), listStudents(cohortId)]);
  const leadByPhone = new Map<string, (typeof leads)[number]>();
  for (const lead of leads.filter(lead => registrationLeadOwned(lead, ownerViewer))) {
    for (const value of [lead.phoneNumber, lead.whatsappNumber, lead.mobile, ...(lead.contactPhones || [])]) {
      const phone = registrationPhone(value || '');
      if (phone && !leadByPhone.has(phone)) leadByPhone.set(phone, lead);
    }
  }
  const existingByPhone = new Map(students.map(student => [registrationPhone(student.whatsappNumber || student.phone || ''), student]));
  const seen = new Set<string>();
  const newStudents: Array<Record<string, unknown>> = [];
  const changedStudents: Array<Record<string, unknown>> = [];
  let imported = 0, matchedLeads = 0, unresolved = 0, preservedRemoved = 0;
  for (const participant of participants!) {
    const phone = workshopParticipantPhone(participant);
    if (!phone) { unresolved++; continue; }
    if (seen.has(phone)) continue;
    seen.add(phone);
    const existing = existingByPhone.get(phone);
    if (existing?.active === false) { preservedRemoved++; continue; }
    const lead = leadByPhone.get(phone);
    if (lead) matchedLeads++;
    const metadata = { ...(existing?.metadata || {}) };
    for (const field of ['city', 'state', 'country']) {
      const value = lead?.[field] || lead?.metadata?.[field] || lead?.profile?.[field];
      if (!metadata[field] && value) metadata[field] = value;
    }
    const input = {
      _id: existing?._id, cohortId,
      name: existing?.name && existing.name !== phone ? existing.name : lead?.name || participant.name || participant.notify || phone,
      phone, whatsappNumber: phone, whatsappJid: `${phone}@s.whatsapp.net`,
      ...(lead?.email && !existing?.email ? { email: lead.email } : {}),
      ...(lead ? { leadId: lead._id, leadNumber: lead.leadNumber || existing?.leadNumber } : {}),
      metadata, source: existing?.source || 'whatsapp_group', active: true,
    };
    if (existing) {
      const fields = { name: input.name, email: input.email || existing.email, phone, whatsappNumber: phone,
        leadId: input.leadId || existing.leadId, leadNumber: input.leadNumber || existing.leadNumber, metadata };
      if (Object.entries(fields).some(([key, value]) => value !== undefined && JSON.stringify(value) !== JSON.stringify(existing[key]))) {
        changedStudents.push({ ...fields, _id: existing._id, cohortId, expectedUpdatedAt: existing.updated_at });
      }
      await updateWorkshopGroupStudents(changedStudents);
    } else {
      newStudents.push({ ...input, _id: createHash('sha256').update(`${cohortId}:${phone}`).digest('hex') });
    }
    await insertWorkshopGroupStudents(newStudents);
    imported++;
  }
  return { imported, matchedLeads, unresolved, preservedRemoved, totalParticipants: participants!.length };
}
