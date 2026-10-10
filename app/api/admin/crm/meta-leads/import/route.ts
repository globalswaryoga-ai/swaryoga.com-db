import { NextRequest, NextResponse } from 'next/server';
import { saveBunnyLead, getBunnyLeadByPhone, getBunnyLeadByEmail } from '@/lib/bunnyLeadsRepository';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const workshopId = formData.get('workshopId') as string;
    const workshopName = formData.get('workshopName') as string;
    const formId = formData.get('formId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    if (rawData.length === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    let imported = 0;
    let skipped = 0;
    const localCache = new Map<string, any>();

    for (const row of rawData as any[]) {
      const email = String(row.email || row.Email || row['e-mail'] || '').trim();
      let phone = String(row.phone || row.Phone || row['Phone Number'] || row.phone_number || '').trim();
      const name = String(row.name || row.Name || row.full_name || row['Full Name'] || '').trim();
      const cleanPhone = phone.replace(/\D/g, '');

      if (!cleanPhone && !email) {
        skipped++;
        continue;
      }

      let existing = null;
      if (cleanPhone) {
        existing = localCache.get(cleanPhone) || await getBunnyLeadByPhone(cleanPhone, 'system');
      }
      if (!existing && email) {
        existing = await getBunnyLeadByEmail(email);
      }

      if (existing) {
        skipped++;
        continue; // duplicate found, do not add
      }

      // Convert other row keys into rawFieldData format
      const rawFieldData = Object.keys(row).map(key => ({
        name: key,
        values: [String(row[key])]
      }));

      const savedLead = await saveBunnyLead({
        phoneNumber: cleanPhone,
        name: name || 'Unknown',
        email: email || '',
        source: 'meta_instant_form',
        status: 'stage_1_new',
        workshopId: workshopId || null,
        workshopName: workshopName || 'Unknown Workshop',
        formSource: 'facebook_instagram_ads',
        createdAt: new Date().toISOString(),
        labels: ['meta_instant_form', 'imported_csv', 'enquiry', workshopId ? `workshop_${workshopId}` : ''].filter(Boolean),
        metadata: {
          metaFormId: formId || 'imported',
          rawFieldData: rawFieldData,
          imported: true
        },
        createdByUserId: 'system',
      });
      localCache.set(cleanPhone, savedLead);
      imported++;
    }

    return NextResponse.json({ success: true, imported, skipped });
  } catch (err: any) {
    console.error('Import Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
