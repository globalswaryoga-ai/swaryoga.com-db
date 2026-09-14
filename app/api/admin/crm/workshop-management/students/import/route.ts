import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getWorkshopCohort, getWorkshopStudent } from '@/lib/schemas/workshopStudentManagementSchemas';

export const dynamic = 'force-dynamic';

function isAdmin(request: NextRequest) {
  const raw = request.headers.get('authorization') || request.cookies.get('token')?.value || '';
  return verifyToken(raw.startsWith('Bearer ') ? raw.slice(7) : raw)?.isAdmin;
}

function normalizeHeader(value: unknown) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getColumn(row: Record<string, unknown>, names: string[]) {
  const wanted = names.map(normalizeHeader);
  const key = Object.keys(row).find((candidate) => wanted.includes(normalizeHeader(candidate)));
  return key ? String(row[key] || '').trim() : '';
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  try {
    const formData = await request.formData();
    const cohortId = String(formData.get('cohortId') || '').trim();
    const action = String(formData.get('action') || 'import');
    const file = formData.get('file');
    if (!cohortId) return NextResponse.json({ error: 'cohortId is required' }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ error: 'Please upload an Excel file' }, { status: 400 });

    const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: 'buffer', cellDates: true });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
    const columns = rows.length ? Object.keys(rows[0]) : [];
    if (action === 'preview') return NextResponse.json({ success: true, columns, sample: rows.slice(0, 3) });
    if (!rows.length) return NextResponse.json({ success: true, imported: 0, skipped: 0, errors: [] });

    const mappingRaw = String(formData.get('mapping') || '{}');
    const mapping = JSON.parse(mappingRaw) as { name?: string; email?: string; phone?: string; whatsappNumber?: string; whatsappJid?: string };
    const selectedFieldsRaw = String(formData.get('selectedFields') || '["name","email","phone","whatsappNumber","whatsappJid"]');
    const selectedFields = new Set<string>(JSON.parse(selectedFieldsRaw));
    const googleFormLink = String(formData.get('googleFormLink') || '').trim();
    if (googleFormLink) {
      await connectDB();
      await getWorkshopCohort().findByIdAndUpdate(cohortId, { $set: { googleFormLink } });
    }

    await connectDB();
    const Student = getWorkshopStudent();
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const [index, row] of rows.entries()) {
      const mapped = (column?: string) => column ? String(row[column] || '').trim() : '';
      const name = selectedFields.has('name') ? (mapped(mapping.name) || getColumn(row, ['name', 'student name', 'full name', 'participant name', 'your name'])) : '';
      const email = selectedFields.has('email') ? (mapped(mapping.email) || getColumn(row, ['email', 'email address', 'gmail', 'gmail address'])).toLowerCase() : '';
      const phone = selectedFields.has('phone') ? (mapped(mapping.phone) || getColumn(row, ['phone', 'phone number', 'mobile', 'mobile number', 'contact number'])) : '';
      const whatsappNumber = selectedFields.has('whatsappNumber') ? (mapped(mapping.whatsappNumber) || getColumn(row, ['whatsapp', 'whatsapp number', 'whatsapp mobile', 'whatsapp phone'])) : '';
      const whatsappJid = selectedFields.has('whatsappJid') ? (mapped(mapping.whatsappJid) || getColumn(row, ['whatsapp jid', 'jid', 'whatsapp id'])) : '';

      if (!name) {
        skipped++;
        errors.push(`Row ${index + 2}: missing student name`);
        continue;
      }
      if (!email && !phone && !whatsappNumber && !whatsappJid) {
        skipped++;
        errors.push(`Row ${index + 2}: add an email, phone, WhatsApp number, or WhatsApp JID`);
        continue;
      }

      const identity = whatsappJid
        ? { whatsappJid }
        : email
          ? { email }
          : { $or: [{ phone }, { whatsappNumber }] };

      await Student.findOneAndUpdate(
        { cohortId, ...identity },
        { $set: { cohortId, name, ...(email ? { email } : {}), ...(phone ? { phone } : {}), ...(whatsappNumber ? { whatsappNumber } : {}), ...(whatsappJid ? { whatsappJid } : {}), source: 'form', active: true } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      imported++;
    }

    return NextResponse.json({ success: true, imported, skipped, errors });
  } catch (error) {
    console.error('[workshop-students-import] POST failed:', error);
    return NextResponse.json({ error: 'Failed to import students' }, { status: 500 });
  }
}