import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Lead } from '@/lib/schemas/enterpriseSchemas';
import * as XLSX from 'xlsx';

/**
 * POST: Upload bulk leads from Excel file
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    if (rawData.length === 0) {
      return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 });
    }

    await connectDB();

    const results = {
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [] as any[],
    };

    for (const row of rawData) {
      try {
        // Handle different column names
        const phoneNumber = String(
          (row as any).Phone ||
          (row as any)['Phone Number'] ||
          (row as any).phone ||
          (row as any)['phone number'] ||
          ''
        ).trim();

        if (!phoneNumber) {
          results.skipped++;
          results.errors.push({ phone: 'N/A', reason: 'Missing phone number' });
          continue;
        }

        // Check for duplicate
        const existing = await Lead.findOne({ phoneNumber });
        if (existing) {
          results.skipped++;
          continue;
        }

        const name = String(
          (row as any).Name || (row as any).name || ''
        ).trim();

        const email = String(
          (row as any).Email || (row as any).email || ''
        ).trim();

        const status = String(
          (row as any).Status || (row as any).status || 'lead'
        ).trim();

        const source = String(
          (row as any).Source || (row as any).source || 'import'
        ).trim();

        const workshopName = String(
          (row as any).Workshop ||
          (row as any)['Workshop/Program'] ||
          (row as any).Program ||
          (row as any)['Program/Workshop'] ||
          (row as any).workshop ||
          (row as any).program ||
          ''
        ).trim();

        const leadData: any = {
          phoneNumber,
        };

        if (name) leadData.name = name;
        if (email) leadData.email = email;
        if (status) leadData.status = status;
        if (source) leadData.source = source;
        if (workshopName) leadData.workshopName = workshopName;

        await Lead.create(leadData);
        results.imported++;
      } catch (err) {
        results.failed++;
        results.errors.push({
          phone: (row as any)['Phone Number'] || (row as any).Phone,
          reason: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json(
      { success: true, data: results },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload leads';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
