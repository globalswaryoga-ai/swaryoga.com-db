import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';
import {

  verifyAdminAccess,
  getViewerUserId,
  isSuperAdmin,
} from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';
import { verifyToken } from '@/lib/auth';
import { addLeadToMainBroadcastList } from '@/lib/crm/broadcast-automation';


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
 *   dryRun?: boolean;            // if true, just check duplicates without importing
 *   updateDuplicates?: boolean;  // if true, update existing leads with new CSV data
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
    const dryRun = body?.dryRun === true;
    const updateDuplicates = body?.updateDuplicates === true;

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
      skipped: 0, 
      duplicates: 0, 
      updated: 0,
      failed: 0, 
      errors: [] as any[],
      duplicateDetails: [] as any[],  // Details of what can be updated
    };
    const seenPhones = new Set<string>();

    for (const c of contacts) {
      try {
        const rawPhone = String(c.phoneNumber || c.phone || '').trim();
        
        // Simple normalization: just keep digits (supports all countries)
        let phoneNumber = rawPhone.replace(/\D/g, '');
        
        // Handle leading 00 (international prefix)
        if (phoneNumber.startsWith('00')) phoneNumber = phoneNumber.slice(2);
        
        // Skip empty or very short numbers
        if (phoneNumber.length < 6) {
          results.skipped++;
          results.errors.push({ phone: rawPhone, reason: `Phone too short: ${phoneNumber.length} digits` });
          continue;
        }

        if (seenPhones.has(phoneNumber)) {
          results.duplicates++;
          continue;
        }
        seenPhones.add(phoneNumber);

        // Check for existing lead - exact match only (no country code manipulation)
        const existing = await Lead.findOne({ phoneNumber });
        if (existing) {
          const csvName = String(c.name || '').trim();
          const csvEmail = String(c.email || '').trim();
          const csvWorkshop = String(c.workshopName || '').trim();
          const csvSource = String(c.source || '').trim();
          const csvAddress = String(c.address || '').trim();

          // Check what fields can be updated (CSV has value, existing is empty or different)
          const updatableFields: any = {};
          if (csvName && csvName !== existing.name) {
            updatableFields.name = { from: existing.name || '(empty)', to: csvName };
          }
          if (csvEmail && csvEmail !== existing.email) {
            updatableFields.email = { from: existing.email || '(empty)', to: csvEmail };
          }
          if (csvWorkshop && csvWorkshop !== existing.workshopName) {
            updatableFields.workshopName = { from: existing.workshopName || '(empty)', to: csvWorkshop };
          }
          if (csvSource && csvSource !== existing.source) {
            updatableFields.source = { from: existing.source || '(empty)', to: csvSource };
          }
          if (csvAddress && csvAddress !== existing.address) {
            updatableFields.address = { from: existing.address || '(empty)', to: csvAddress };
          }

          const hasUpdates = Object.keys(updatableFields).length > 0;

          if (hasUpdates) {
            results.duplicateDetails.push({
              phoneNumber,
              existingName: existing.name || '',
              csvName,
              updatableFields,
            });
          }

          // If not dry run and updateDuplicates is true, perform the update
          if (!dryRun && updateDuplicates && hasUpdates) {
            if (csvName && csvName !== existing.name) existing.name = csvName;
            if (csvEmail && csvEmail !== existing.email) existing.email = csvEmail;
            if (csvWorkshop && csvWorkshop !== existing.workshopName) existing.workshopName = csvWorkshop;
            if (csvSource && csvSource !== existing.source) existing.source = csvSource;
            if (csvAddress && csvAddress !== existing.address) existing.address = csvAddress;
            await existing.save();
            results.updated++;
          } else if (!dryRun && !updateDuplicates) {
            // Old behavior: only update empty fields
            let updated = false;
            if (csvName && !existing.name) { existing.name = csvName; updated = true; }
            if (csvEmail && !existing.email) { existing.email = csvEmail; updated = true; }
            if (csvWorkshop && !existing.workshopName) { existing.workshopName = csvWorkshop; updated = true; }
            if (updated) await existing.save();
          }

          results.duplicates++;
          continue;
        }

        // In dry run mode, don't create new leads
        if (dryRun) {
          results.imported++; // Count as would-be-imported
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
        const status = String(c.status || 'lead').trim().toLowerCase();
        const source = String(c.source || 'csv-import').trim().toLowerCase();
        const workshopName = String(c.workshopName || '').trim();
        const address = String(c.address || '').trim();

        if (name) {
          leadData.name = name;
        } else {
          // If name is missing, use phone number as name
          leadData.name = phoneNumber;
        }
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

    return NextResponse.json({ success: true, data: results, dryRun }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to bulk-import leads';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
