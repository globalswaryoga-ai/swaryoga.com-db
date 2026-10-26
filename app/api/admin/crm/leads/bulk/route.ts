import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { verifyToken } from '@/lib/auth';
import { normalizePhoneStrict } from '@/lib/crm/phone';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { loadBunnyLeads, saveBunnyLead, invalidateBunnyLeadsCache } from '@/lib/bunnyLeadsRepository';

export const dynamic = 'force-dynamic';

/**
 * Bulk operations for leads using Bunny Database
 * POST: Bulk import leads, bulk update status, bulk update labels
 * DELETE: Bulk delete leads
 * GET: Export leads as CSV/JSON
 */

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
    }
    const superAdmin = isSuperAdmin(decoded);

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const operation = body.operation;

    // BULK IMPORT
    if (operation === 'import') {
      const leads = Array.isArray(body.leads) ? body.leads : [];
      if (leads.length === 0) {
        return NextResponse.json({ error: 'No leads provided' }, { status: 400 });
      }

      const requestedAssignedTo = body?.assignedToUserId ? String(body.assignedToUserId).trim() : '';
      const assignedToUserId = superAdmin && requestedAssignedTo ? requestedAssignedTo : viewerUserId;

      const results = {
        imported: 0,
        skipped: 0,
        failed: 0,
        errors: [] as any[],
      };

      const seenPhones = new Set<string>();

      for (const leadData of leads) {
        try {
          const normalized = normalizePhoneStrict(leadData.phoneNumber, { defaultCountryCode: '91' });
          if (!normalized.ok) {
            results.skipped++;
            results.errors.push({ phoneNumber: String(leadData.phoneNumber ?? 'N/A'), reason: normalized.error });
            continue;
          }

          const phoneNumber = normalized.phone;
          if (seenPhones.has(phoneNumber)) {
            results.skipped++;
            results.errors.push({ phoneNumber, reason: 'Duplicate phone number in this import batch' });
            continue;
          }
          seenPhones.add(phoneNumber);

          // Check existing in Bunny DB
          const clean10 = phoneNumber.slice(-10);
          const existingRes = await bunnyExecute({
            sql: `SELECT document_id FROM leads_sql WHERE substr(COALESCE(json_extract(data_json, '$.phoneNumber'), ''), -10) = ? LIMIT 1`,
            args: [clean10],
          });
          if (existingRes.rows.length > 0) {
            results.skipped++;
            continue;
          }

          await saveBunnyLead({
            phoneNumber,
            assignedToUserId,
            createdByUserId: viewerUserId,
            name: leadData.name ? String(leadData.name).trim() : undefined,
            email: leadData.email ? String(leadData.email).trim() : undefined,
            status: leadData.status || 'lead',
            labels: Array.isArray(leadData.labels) ? leadData.labels : [],
            source: leadData.source || 'import',
          });

          results.imported++;
        } catch (err) {
          results.failed++;
          results.errors.push({
            phoneNumber: leadData.phoneNumber,
            reason: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      invalidateBunnyLeadsCache();

      return NextResponse.json(
        { success: true, data: results, message: `Imported ${results.imported}, skipped ${results.skipped}, failed ${results.failed}` },
        { status: 200 }
      );
    }

    // BULK UPDATE STATUS
    if (operation === 'updateStatus') {
      const ids = body.ids || [];
      const newStatus = body.status;

      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: 'No lead IDs provided' }, { status: 400 });
      }

      let modified = 0;
      const nowIso = new Date().toISOString();

      for (const id of ids) {
        const whereClause = superAdmin
          ? 'document_id = ?'
          : 'document_id = ? AND (json_extract(data_json, "$.assignedToUserId") = ? OR json_extract(data_json, "$.createdByUserId") = ?)';
        const args = superAdmin ? [newStatus, nowIso, String(id)] : [newStatus, nowIso, String(id), viewerUserId, viewerUserId];

        const res = await bunnyExecute({
          sql: `UPDATE leads_sql SET
            data_json = json_set(data_json, '$.status', ?),
            updated_at = ?
            WHERE ${whereClause}`,
          args,
        });
        if (res.rowsAffected) modified += res.rowsAffected;
      }

      invalidateBunnyLeadsCache();

      return NextResponse.json(
        { success: true, data: { modified, matched: ids.length } },
        { status: 200 }
      );
    }

    // BULK UPDATE LABELS
    if (operation === 'updateLabels') {
      const ids = body.ids || [];
      const labels = body.labels || [];
      const mode = body.mode || 'set';

      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: 'No lead IDs provided' }, { status: 400 });
      }

      let modified = 0;
      const nowIso = new Date().toISOString();

      for (const id of ids) {
        const whereClause = superAdmin
          ? 'document_id = ?'
          : 'document_id = ? AND (json_extract(data_json, "$.assignedToUserId") = ? OR json_extract(data_json, "$.createdByUserId") = ?)';

        let sql = '';
        let args: any[] = [];

        if (mode === 'set') {
          sql = `UPDATE leads_sql SET data_json = json_set(data_json, '$.labels', json(?)), updated_at = ? WHERE ${whereClause}`;
          args = superAdmin ? [JSON.stringify(labels), nowIso, String(id)] : [JSON.stringify(labels), nowIso, String(id), viewerUserId, viewerUserId];
        } else {
          // Add labels
          sql = `UPDATE leads_sql SET
            data_json = json_set(data_json, '$.labels', (
              SELECT json_group_array(DISTINCT value) FROM (
                SELECT value FROM json_each(COALESCE(json_extract(data_json, '$.labels'), '[]'))
                UNION ALL SELECT value FROM json_each(?)
              )
            )),
            updated_at = ?
            WHERE ${whereClause}`;
          args = superAdmin ? [JSON.stringify(labels), nowIso, String(id)] : [JSON.stringify(labels), nowIso, String(id), viewerUserId, viewerUserId];
        }

        const res = await bunnyExecute({ sql, args });
        if (res.rowsAffected) modified += res.rowsAffected;
      }

      invalidateBunnyLeadsCache();

      return NextResponse.json(
        { success: true, data: { modified, matched: ids.length } },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to perform bulk operation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
    }
    const superAdmin = isSuperAdmin(decoded);

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const ids = body.ids || [];
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No lead IDs provided' }, { status: 400 });
    }

    let deleted = 0;
    for (const id of ids) {
      const whereClause = superAdmin
        ? 'document_id = ?'
        : 'document_id = ? AND (json_extract(data_json, "$.assignedToUserId") = ? OR json_extract(data_json, "$.createdByUserId") = ?)';
      const args = superAdmin ? [String(id)] : [String(id), viewerUserId, viewerUserId];

      const res = await bunnyExecute({
        sql: `DELETE FROM leads_sql WHERE ${whereClause}`,
        args,
      });
      if (res.rowsAffected) deleted += res.rowsAffected;
    }

    invalidateBunnyLeadsCache();

    return NextResponse.json(
      { success: true, data: { deleted } },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete leads';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Unauthorized: Missing user identity' }, { status: 401 });
    }
    const superAdmin = isSuperAdmin(decoded);

    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'json';
    const status = url.searchParams.get('status');
    const limit = Math.min(Number(url.searchParams.get('limit') || 500) || 500, 10000);

    let leads = await loadBunnyLeads();
    if (!superAdmin) {
      leads = leads.filter(l => l.assignedToUserId === viewerUserId || l.createdByUserId === viewerUserId);
    }
    if (status) {
      leads = leads.filter(l => l.status === status);
    }
    leads = leads.slice(0, limit);

    if (format === 'csv') {
      if (leads.length === 0) {
        return new NextResponse('No data', { status: 200, headers: { 'Content-Type': 'text/csv' } });
      }

      const headers = ['User', 'Phone Number', 'Name', 'Email', 'Status', 'Labels', 'Source', 'Created At'];
      const rows = leads.map((lead: any) => [
        lead.assignedToUserId || '',
        lead.phoneNumber || '',
        lead.name || '',
        lead.email || '',
        lead.status || '',
        (lead.labels || []).join(';'),
        lead.source || '',
        lead.createdAt ? new Date(lead.createdAt).toISOString() : '',
      ]);

      const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

      return new NextResponse(csv, {
        status: 200,
        headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="leads.csv"' },
      });
    } else {
      return NextResponse.json({ success: true, data: { leads, count: leads.length } }, { status: 200 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export leads';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
