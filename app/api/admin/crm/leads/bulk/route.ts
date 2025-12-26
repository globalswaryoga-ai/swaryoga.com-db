import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Lead } from '@/lib/schemas/enterpriseSchemas';
import mongoose from 'mongoose';

/**
 * Bulk operations for leads
 * POST: Bulk import leads
 * PUT: Bulk update status/labels
 * DELETE: Bulk delete leads
 * GET: Export leads as CSV/JSON
 */

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

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

      await connectDB();

      const results = {
        imported: 0,
        skipped: 0,
        failed: 0,
        errors: [] as any[],
      };

      // Deduplicate inside the same batch to avoid E11000 duplicate key errors.
      // (DB check alone is not enough when the file itself contains duplicates.)
      const seenPhones = new Set<string>();

      for (const leadData of leads) {
        try {
          const phoneNumber = String(leadData.phoneNumber || '').trim();
          if (!phoneNumber) {
            results.skipped++;
            results.errors.push({ phoneNumber: 'N/A', reason: 'Missing phone number' });
            continue;
          }

          if (seenPhones.has(phoneNumber)) {
            results.skipped++;
            results.errors.push({ phoneNumber, reason: 'Duplicate phone number in this import batch' });
            continue;
          }
          seenPhones.add(phoneNumber);

          const existing = await Lead.findOne({ phoneNumber });
          if (existing) {
            results.skipped++;
            continue;
          }

          await Lead.create({
            phoneNumber,
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

      if (!['lead', 'prospect', 'customer', 'inactive'].includes(newStatus)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }

      await connectDB();

      const objectIds = ids
        .map((id: any) => {
          try {
            return new mongoose.Types.ObjectId(id);
          } catch {
            return null;
          }
        })
        .filter((id: any) => id !== null);

      const result = await Lead.updateMany(
        { _id: { $in: objectIds } },
        { $set: { status: newStatus, updatedAt: new Date() } }
      );

      return NextResponse.json(
        { success: true, data: { modified: result.modifiedCount, matched: result.matchedCount } },
        { status: 200 }
      );
    }

    // BULK UPDATE LABELS
    if (operation === 'updateLabels') {
      const ids = body.ids || [];
      const labels = body.labels || [];
      const mode = body.mode || 'set'; // set, add, remove

      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: 'No lead IDs provided' }, { status: 400 });
      }

      await connectDB();

      const objectIds = ids
        .map((id: any) => {
          try {
            return new mongoose.Types.ObjectId(id);
          } catch {
            return null;
          }
        })
        .filter((id: any) => id !== null);

      let update = {};
      if (mode === 'set') {
        update = { $set: { labels, updatedAt: new Date() } };
      } else if (mode === 'add') {
        update = { $addToSet: { labels: { $each: labels } }, $set: { updatedAt: new Date() } };
      } else if (mode === 'remove') {
        update = { $pullAll: { labels }, $set: { updatedAt: new Date() } };
      }

      const result = await Lead.updateMany({ _id: { $in: objectIds } }, update);

      return NextResponse.json(
        { success: true, data: { modified: result.modifiedCount, matched: result.matchedCount } },
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
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const ids = body.ids || [];
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No lead IDs provided' }, { status: 400 });
    }

    await connectDB();

    const objectIds = ids
      .map((id: any) => {
        try {
          return new mongoose.Types.ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter((id: any) => id !== null);

    const result = await Lead.deleteMany({ _id: { $in: objectIds } });

    return NextResponse.json(
      { success: true, data: { deleted: result.deletedCount } },
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
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'json'; // json or csv
    const status = url.searchParams.get('status');
    const limit = Math.min(Number(url.searchParams.get('limit') || 500) || 500, 10000);

    await connectDB();

    const filter: any = {};
    if (status) filter.status = status;

    const leads = await Lead.find(filter).limit(limit).lean();

    if (format === 'csv') {
      // Convert to CSV format
      if (leads.length === 0) {
        return new NextResponse('No data', { status: 200, headers: { 'Content-Type': 'text/csv' } });
      }

      const headers = ['Phone Number', 'Name', 'Email', 'Status', 'Labels', 'Source', 'Last Message', 'Created At'];
      const rows = leads.map((lead: any) => [
        lead.phoneNumber,
        lead.name || '',
        lead.email || '',
        lead.status,
        (lead.labels || []).join(';'),
        lead.source,
        lead.lastMessageAt ? new Date(lead.lastMessageAt).toISOString() : '',
        new Date(lead.createdAt).toISOString(),
      ]);

      const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

      return new NextResponse(csv, {
        status: 200,
        headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="leads.csv"' },
      });
    } else {
      // JSON format
      return NextResponse.json({ success: true, data: { leads, count: leads.length } }, { status: 200 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export leads';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
