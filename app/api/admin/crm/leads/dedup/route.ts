import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { loadBunnyLeads, saveBunnyLead } from '@/lib/bunnyLeadsRepository';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Normalize a phone number for dedup comparison:
 * strip all non-digits, remove leading 0/00/+, etc.
 */
function normalizePhoneForDedup(phone: string): string {
  let digits = String(phone || '').replace(/\D/g, '');
  
  // Remove leading 00 (international prefix)
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length > 6) {
    // Remove single leading 0 (trunk prefix)
    digits = digits.slice(1);
  }

  // Common India normalization: 10 digits -> prefix 91
  if (digits.length === 10) {
    digits = `91${digits}`;
  }
  
  return digits;
}

/**
 * Merge data from a duplicate lead into the primary lead.
 * Only fills in fields that are empty/missing on the primary.
 */
function mergeLead(primary: any, duplicate: any): any {
  const merged = { ...primary };

  // Fill empty name
  if (!merged.name && duplicate.name) merged.name = duplicate.name;

  // Fill empty email
  if (!merged.email && duplicate.email) merged.email = duplicate.email;

  // Fill empty displayName
  if (!merged.displayName && duplicate.displayName) merged.displayName = duplicate.displayName;

  // Fill empty title
  if (!merged.title && duplicate.title) merged.title = duplicate.title;

  // Fill empty address
  if (!merged.address && duplicate.address) merged.address = duplicate.address;

  // Merge labels (union)
  const primaryLabels = new Set(Array.isArray(merged.labels) ? merged.labels : []);
  if (Array.isArray(duplicate.labels)) {
    duplicate.labels.forEach((l: string) => { if (l && l.trim()) primaryLabels.add(l.trim()); });
  }
  merged.labels = Array.from(primaryLabels);

  // Merge workshops array (union)
  const primaryWorkshops = new Set(Array.isArray(merged.workshops) ? merged.workshops : []);
  if (Array.isArray(duplicate.workshops)) {
    duplicate.workshops.forEach((w: string) => { if (w && w.trim()) primaryWorkshops.add(w.trim()); });
  }
  merged.workshops = Array.from(primaryWorkshops);

  // Fill empty workshopName
  if (!merged.workshopName && duplicate.workshopName) merged.workshopName = duplicate.workshopName;

  // Fill empty workshopId
  if (!merged.workshopId && duplicate.workshopId) merged.workshopId = duplicate.workshopId;

  // Keep the most recent lastMessageAt
  if (duplicate.lastMessageAt) {
    const dupTime = new Date(duplicate.lastMessageAt).getTime();
    const priTime = merged.lastMessageAt ? new Date(merged.lastMessageAt).getTime() : 0;
    if (dupTime > priTime) merged.lastMessageAt = duplicate.lastMessageAt;
  }

  // Fill empty metadata
  if (!merged.metadata && duplicate.metadata) merged.metadata = duplicate.metadata;
  else if (merged.metadata && duplicate.metadata && typeof merged.metadata === 'object' && typeof duplicate.metadata === 'object') {
    merged.metadata = { ...duplicate.metadata, ...merged.metadata };
  }

  return merged;
}

interface DuplicateGroup {
  key: string;
  matchType: 'phone' | 'email';
  leads: any[];
  primaryId: string;
  primaryName: string;
  duplicateCount: number;
}

/**
 * GET — Scan leads and return duplicate groups
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const superAdmin = isSuperAdmin(decoded);
    if (!superAdmin) {
      return NextResponse.json({ error: 'Only super admin can scan for duplicates' }, { status: 403 });
    }

    const allLeads = await loadBunnyLeads();

    // --- Group by phone ---
    const phoneGroups = new Map<string, any[]>();
    for (const lead of allLeads) {
      const phone = normalizePhoneForDedup(lead.phoneNumber);
      if (!phone || phone.length < 6) continue;
      if (!phoneGroups.has(phone)) phoneGroups.set(phone, []);
      phoneGroups.get(phone)!.push(lead);
    }

    // --- Group by email ---
    const emailGroups = new Map<string, any[]>();
    for (const lead of allLeads) {
      const email = String(lead.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) continue;
      if (!emailGroups.has(email)) emailGroups.set(email, []);
      emailGroups.get(email)!.push(lead);
    }

    const duplicateGroups: DuplicateGroup[] = [];
    const seenIds = new Set<string>();

    // Phone duplicates first (higher priority)
    for (const [phone, leads] of phoneGroups) {
      if (leads.length < 2) continue;
      leads.sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return aTime - bTime;
      });
      const primary = leads[0];
      duplicateGroups.push({
        key: phone,
        matchType: 'phone',
        leads: leads.map(l => ({
          _id: l._id,
          name: l.name || '',
          email: l.email || '',
          phoneNumber: l.phoneNumber || '',
          status: l.status || '',
          source: l.source || '',
          leadNumber: l.leadNumber || '',
          assignedToUserId: l.assignedToUserId || '',
          createdByUserId: l.createdByUserId || '',
          createdAt: l.createdAt || '',
        })),
        primaryId: primary._id,
        primaryName: primary.name || primary.phoneNumber || '',
        duplicateCount: leads.length - 1,
      });
      leads.forEach(l => seenIds.add(l._id));
    }

    // Email duplicates (skip if already covered by phone group)
    for (const [email, leads] of emailGroups) {
      if (leads.length < 2) continue;
      const uncovered = leads.filter(l => !seenIds.has(l._id));
      if (uncovered.length < 1) continue;

      leads.sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return aTime - bTime;
      });
      const primary = leads[0];
      duplicateGroups.push({
        key: email,
        matchType: 'email',
        leads: leads.map(l => ({
          _id: l._id,
          name: l.name || '',
          email: l.email || '',
          phoneNumber: l.phoneNumber || '',
          status: l.status || '',
          source: l.source || '',
          leadNumber: l.leadNumber || '',
          assignedToUserId: l.assignedToUserId || '',
          createdByUserId: l.createdByUserId || '',
          createdAt: l.createdAt || '',
        })),
        primaryId: primary._id,
        primaryName: primary.name || primary.email || '',
        duplicateCount: leads.length - 1,
      });
    }

    const totalDuplicates = duplicateGroups.reduce((sum, g) => sum + g.duplicateCount, 0);

    return NextResponse.json({
      success: true,
      data: {
        totalLeads: allLeads.length,
        duplicateGroups: duplicateGroups.length,
        totalDuplicates,
        groups: duplicateGroups,
      }
    }, { status: 200 });
  } catch (error) {
    logger.error('dedup', 'GET /api/admin/crm/leads/dedup failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to scan duplicates' }, { status: 500 });
  }
}

/**
 * POST — Merge duplicates
 * Body: { action: 'merge' } or { action: 'merge', groupKeys: ['phone1','phone2'] }
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const superAdmin = isSuperAdmin(decoded);
    if (!superAdmin) {
      return NextResponse.json({ error: 'Only super admin can merge duplicates' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || body.action !== 'merge') {
      return NextResponse.json({ error: 'Invalid action. Use { action: "merge" }' }, { status: 400 });
    }

    const allLeads = await loadBunnyLeads();

    // Group by phone
    const phoneGroups = new Map<string, any[]>();
    for (const lead of allLeads) {
      const phone = normalizePhoneForDedup(lead.phoneNumber);
      if (!phone || phone.length < 6) continue;
      if (!phoneGroups.has(phone)) phoneGroups.set(phone, []);
      phoneGroups.get(phone)!.push(lead);
    }

    let mergedGroups = 0;
    let deletedLeads = 0;
    const errors: string[] = [];

    const selectedKeys = Array.isArray(body.groupKeys) ? new Set(body.groupKeys) : null;

    for (const [phone, leads] of phoneGroups) {
      if (leads.length < 2) continue;
      if (selectedKeys && !selectedKeys.has(phone)) continue;

      try {
        leads.sort((a, b) => {
          const aTime = new Date(a.createdAt || 0).getTime();
          const bTime = new Date(b.createdAt || 0).getTime();
          return aTime - bTime;
        });

        let primary = leads[0];
        const duplicates = leads.slice(1);

        for (const dup of duplicates) {
          primary = mergeLead(primary, dup);
        }

        await saveBunnyLead(primary, primary._id);

        for (const dup of duplicates) {
          await bunnyExecute({
            sql: 'DELETE FROM leads_sql WHERE document_id = ?',
            args: [dup._id]
          });
          deletedLeads++;
        }

        mergedGroups++;
      } catch (err) {
        errors.push(`Failed to merge group ${phone}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // Also handle email-only duplicates (same email, different phones)
    const emailGroups = new Map<string, any[]>();
    const refreshedLeads = await loadBunnyLeads();
    for (const lead of refreshedLeads) {
      const email = String(lead.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) continue;
      if (!emailGroups.has(email)) emailGroups.set(email, []);
      emailGroups.get(email)!.push(lead);
    }

    for (const [email, leads] of emailGroups) {
      if (leads.length < 2) continue;
      if (selectedKeys && !selectedKeys.has(email)) continue;

      // Only merge email groups if they also share the same normalized phone
      const phones = new Set(leads.map(l => normalizePhoneForDedup(l.phoneNumber)));
      if (phones.size > 1) continue;

      try {
        leads.sort((a, b) => {
          const aTime = new Date(a.createdAt || 0).getTime();
          const bTime = new Date(b.createdAt || 0).getTime();
          return aTime - bTime;
        });

        let primary = leads[0];
        const duplicates = leads.slice(1);

        for (const dup of duplicates) {
          primary = mergeLead(primary, dup);
        }

        await saveBunnyLead(primary, primary._id);

        for (const dup of duplicates) {
          await bunnyExecute({
            sql: 'DELETE FROM leads_sql WHERE document_id = ?',
            args: [dup._id]
          });
          deletedLeads++;
        }

        mergedGroups++;
      } catch (err) {
        errors.push(`Failed to merge email group ${email}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    logger.info('dedup', `Merged ${mergedGroups} groups, deleted ${deletedLeads} duplicate leads`);

    return NextResponse.json({
      success: true,
      data: {
        mergedGroups,
        deletedLeads,
        errors: errors.length ? errors : undefined,
      }
    }, { status: 200 });
  } catch (error) {
    logger.error('dedup', 'POST /api/admin/crm/leads/dedup failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to merge duplicates' }, { status: 500 });
  }
}
