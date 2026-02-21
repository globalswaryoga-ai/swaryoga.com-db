import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';
import { normalizePhoneStrict } from '@/lib/crm/phone';
import {
  verifyAdminAccess,
  getViewerUserId,
  isSuperAdmin,
} from '@/lib/crm-handlers';
import { verifyToken } from '@/lib/auth';
import { addLeadToMainBroadcastList } from '@/lib/crm/broadcast-automation';

export const dynamic = 'force-dynamic';

/**
 * POST: Bulk-import leads from a pre-parsed JSON array (CSV upload path).
 *
 * Body: {
 *   contacts: Array<{
 *     phoneNumber: string;       // required — already normalised by client
 *     name?: string;
 *     email?: string;
 *     status?: string;
 *     source?: string;
 *     workshopName?: string;
 *     labels?: string[];
 *     address?: string;
 *   }>;
 *   assignedToUserId?: string;   // super-admin override
 *   updateExisting?: boolean;    // if true, update existing leads instead of skipping
 * }
 */
export async function POST(request: NextRequest) {
  try {
    verifyAdminAccess(request);
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
    }

    const superAdmin = isSuperAdmin(decoded);
    const body = await request.json();
    const contacts: any[] = Array.isArray(body?.contacts) ? body.contacts : [];
    const updateExisting = Boolean(body?.updateExisting);

    if (contacts.length === 0) {
      return NextResponse.json({ error: 'No contacts provided' }, { status: 400 });
    }

    const assignedToParam = body?.assignedToUserId;
    const assignedToUserId =
      superAdmin && assignedToParam && String(assignedToParam).trim()
        ? String(assignedToParam).trim()
        : viewerUserId;

    await connectDB();
    const Lead = getLead();

    const results = { 
      imported: 0, 
      updated: 0,
      skipped: 0, 
      failed: 0, 
      errors: [] as any[],
      details: {
        duplicatesSkipped: 0,
        duplicatesUpdated: 0,
        invalidPhones: 0,
        batchDuplicates: 0,
      }
    };
    const seenPhones = new Set<string>();

    for (const c of contacts) {
      try {
        const rawPhone = String(c.phoneNumber || c.phone || '').trim();
        const normalized = normalizePhoneStrict(rawPhone, { defaultCountryCode: '91' });
        if (!normalized.ok) {
          results.failed++;
          results.details.invalidPhones++;
          results.errors.push({ phone: rawPhone, reason: `Invalid phone: ${normalized.error}` });
          continue;
        }

        const phoneNumber = normalized.phone;
        if (seenPhones.has(phoneNumber)) {
          results.skipped++;
          results.details.batchDuplicates++;
          results.errors.push({ phone: phoneNumber, reason: 'Duplicate in this batch' });
          continue;
        }
        seenPhones.add(phoneNumber);

        // Check for existing lead
        const existing = await Lead.findOne({ phoneNumber });
        if (existing) {
          if (updateExisting) {
            // Update existing lead with new data
            let updated = false;
            const name = String(c.name || '').trim();
            const email = String(c.email || '').trim();
            const workshopName = String(c.workshopName || '').trim();
            const source = String(c.source || '').trim();
            const address = String(c.address || '').trim();
            const status = String(c.status || '').trim();
            
            // Update empty fields OR overwrite with new values
            if (name && name !== existing.name) { existing.name = name; updated = true; }
            if (email && email !== existing.email) { existing.email = email; updated = true; }
            if (workshopName && workshopName !== existing.workshopName) { existing.workshopName = workshopName; updated = true; }
            if (source && !existing.source) { existing.source = source; updated = true; }
            if (address && !existing.address) { existing.address = address; updated = true; }
            if (status && status !== existing.status) { existing.status = status; updated = true; }
            
            if (Array.isArray(c.labels) && c.labels.length) {
              const newLabels = c.labels.map((l: any) => String(l).trim()).filter(Boolean);
              const existingLabels = existing.labels || [];
              const merged = [...new Set([...existingLabels, ...newLabels])];
              if (merged.length !== existingLabels.length) {
                existing.labels = merged;
                updated = true;
              }
            }
            
            if (updated) {
              await existing.save();
              results.updated++;
              results.details.duplicatesUpdated++;
            } else {
              results.skipped++;
              results.details.duplicatesSkipped++;
            }
          } else {
            // Just update empty fields (original behavior)
            let updated = false;
            const name = String(c.name || '').trim();
            const email = String(c.email || '').trim();
            const workshopName = String(c.workshopName || '').trim();
            if (name && !existing.name) { existing.name = name; updated = true; }
            if (email && !existing.email) { existing.email = email; updated = true; }
            if (workshopName && !existing.workshopName) { existing.workshopName = workshopName; updated = true; }
            if (updated) await existing.save();
            results.skipped++;
            results.details.duplicatesSkipped++;
          }
          continue;
        }

        const { leadNumber } = await allocateNextLeadNumber();

        const leadData: any = {
          leadNumber,
          phoneNumber,
          assignedToUserId,
          createdByUserId: viewerUserId,
        };

        const name = String(c.name || '').trim();
        const email = String(c.email || '').trim();
        const status = String(c.status || 'lead').trim();
        const source = String(c.source || 'csv-import').trim();
        const workshopName = String(c.workshopName || '').trim();
        const address = String(c.address || '').trim();

        if (name) leadData.name = name;
        if (email) leadData.email = email;
        if (status) leadData.status = status;
        if (source) leadData.source = source;
        if (workshopName) leadData.workshopName = workshopName;
        if (address) leadData.address = address;
        if (Array.isArray(c.labels) && c.labels.length) {
          leadData.labels = c.labels.map((l: any) => String(l).trim()).filter(Boolean);
        }

        const createdLead = await Lead.create(leadData);
        await addLeadToMainBroadcastList(createdLead);
        results.imported++;
      } catch (err) {
        results.failed++;
        results.errors.push({
          phone: c.phoneNumber,
          reason: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({ success: true, data: results }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to bulk-import leads';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
