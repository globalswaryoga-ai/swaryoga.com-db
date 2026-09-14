import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getWorkshopCohort, getWorkshopStudent } from '@/lib/schemas/workshopStudentManagementSchemas';
import { syncWorkshopStudentLead } from '@/lib/workshopStudentLeadSync';

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

function getFirstDataValue(row: Record<string, unknown>) {
  const entry = Object.entries(row).find(([column, value]) => {
    const header = normalizeHeader(column);
    return header !== 'timestamp' && header !== 'date' && String(value || '').trim();
  });
  return entry ? String(entry[1]).trim() : '';
}

async function ensureStudentIndexes() {
  const collection = getWorkshopStudent().collection;
  const indexes = await collection.listIndexes().toArray();
  const conflicting = indexes.find((index) => index.name === 'cohortId_1_whatsappJid_1');
  if (conflicting) {
    const partial = conflicting.partialFilterExpression?.whatsappJid;
    const isSafe = partial && typeof partial === 'object' && '$type' in partial;
    if (!isSafe) {
      await collection.dropIndex('cohortId_1_whatsappJid_1');
      await collection.createIndex(
        { cohortId: 1, whatsappJid: 1 },
        { name: 'cohortId_1_whatsappJid_1', unique: true, partialFilterExpression: { whatsappJid: { $type: 'string', $ne: '' } } },
      );
    }
  }
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  try {
    const decoded: any = verifyToken((request.headers.get('authorization') || '').replace(/^Bearer\s+/i, ''));
    const formData = await request.formData();
    const cohortId = String(formData.get('cohortId') || '').trim();
    const action = String(formData.get('action') || 'import');
    const file = formData.get('file');
    if (!cohortId) return NextResponse.json({ error: 'cohortId is required' }, { status: 400 });
    if (!file || typeof file === 'string' || typeof (file as File).arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'Please upload an Excel or CSV file' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    if (!/\.(xlsx|xls|csv)$/.test(fileName)) {
      return NextResponse.json({ error: 'Please upload an .xlsx, .xls, or .csv file' }, { status: 400 });
    }

    const fileBytes = await (file as File).arrayBuffer();
    const binary = Buffer.from(fileBytes);
    let workbook;
    if (fileName.endsWith('.csv')) {
      // Google Forms may export UTF-8 CSV or UTF-16LE CSV depending on the
      // browser/Sheets download path. Detect both so regional column names stay readable.
      const csvText = binary[0] === 0xff && binary[1] === 0xfe
        ? new TextDecoder('utf-16le').decode(binary).replace(/^\uFEFF/, '')
        : new TextDecoder('utf-8').decode(binary).replace(/^\uFEFF/, '');
      workbook = XLSX.read(csvText, { type: 'string', cellDates: true, raw: false });
    } else {
      workbook = XLSX.read(binary, { type: 'buffer', cellDates: true });
    }
    if (!workbook.SheetNames.length) return NextResponse.json({ error: 'The uploaded file has no worksheet or CSV data' }, { status: 400 });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
    const columns = rows.length ? Object.keys(rows[0]) : [];
    if (action === 'preview') return NextResponse.json({ success: true, columns, sample: rows.slice(0, 3) });
    if (!rows.length) return NextResponse.json({ success: true, imported: 0, skipped: 0, errors: [] });

    const mappingRaw = String(formData.get('mapping') || '{}');
    let mapping: { name?: string; email?: string; phone?: string; whatsappNumber?: string; whatsappJid?: string };
    try {
      mapping = JSON.parse(mappingRaw);
    } catch {
      return NextResponse.json({ error: 'Invalid column mapping. Please choose the columns again.' }, { status: 400 });
    }
    const selectedFieldsRaw = String(formData.get('selectedFields') || '["name","email","phone","whatsappNumber","whatsappJid"]');
    let selectedFields: Set<string>;
    try {
      selectedFields = new Set<string>(JSON.parse(selectedFieldsRaw));
    } catch {
      return NextResponse.json({ error: 'Invalid selected fields. Please select the fields again.' }, { status: 400 });
    }
    const googleFormLink = String(formData.get('googleFormLink') || '').trim();
    if (googleFormLink) {
      await connectDB();
      await getWorkshopCohort().findByIdAndUpdate(cohortId, { $set: { googleFormLink } });
    }

    await connectDB();
    const Student = getWorkshopStudent();
    await ensureStudentIndexes();
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const [index, row] of rows.entries()) {
      const mapped = (column?: string) => column ? String(row[column] || '').trim() : '';
      const name = selectedFields.has('name') ? (mapped(mapping.name) || getColumn(row, ['name', 'student name', 'full name', 'participant name', 'your name']) || getFirstDataValue(row)) : '';
      const email = selectedFields.has('email') ? (mapped(mapping.email) || getColumn(row, ['email', 'email address', 'gmail', 'gmail address'])).toLowerCase() : '';
      const phone = selectedFields.has('phone') ? (mapped(mapping.phone) || getColumn(row, ['phone', 'phone number', 'mobile', 'mobile number', 'contact number'])) : '';
      const whatsappNumber = selectedFields.has('whatsappNumber') ? (mapped(mapping.whatsappNumber) || getColumn(row, ['whatsapp', 'whatsapp number', 'whatsapp mobile', 'whatsapp phone'])) : '';
      const whatsappJid = selectedFields.has('whatsappJid') ? (mapped(mapping.whatsappJid) || getColumn(row, ['whatsapp jid', 'jid', 'whatsapp id'])) : '';
      const knownColumns = new Set(Object.values(mapping).filter(Boolean));
      const extraData = Object.fromEntries(Object.entries(row).filter(([column]) => !knownColumns.has(column)));

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

      try {
        const lead = await syncWorkshopStudentLead({ name, email, phone, whatsappNumber, ownerUserId: decoded?.userId });
        await Student.findOneAndUpdate(
          { cohortId, ...identity },
          { $set: { cohortId, name, ...(email ? { email } : {}), ...(phone ? { phone } : {}), ...(whatsappNumber ? { whatsappNumber } : {}), ...(whatsappJid ? { whatsappJid } : {}), ...lead, source: 'form', active: true, ...(Object.keys(extraData).length ? { metadata: { ...extraData, ...lead } } : {}) } },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
        imported++;
      } catch (rowError) {
        skipped++;
        errors.push(`Row ${index + 2}: ${rowError instanceof Error ? rowError.message : 'duplicate or invalid student record'}`);
      }
    }

    return NextResponse.json({ success: true, imported, skipped, errors, message: `Imported ${imported} student(s); skipped ${skipped} row(s).` });
  } catch (error) {
    console.error('[workshop-students-import] POST failed:', error);
    return NextResponse.json({ error: error instanceof Error ? `Failed to import students: ${error.message}` : 'Failed to import students' }, { status: 500 });
  }
}