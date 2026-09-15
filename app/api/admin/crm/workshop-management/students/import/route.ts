import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { verifyToken } from '@/lib/auth';
import { upsertStudent, updateCohort } from '@/lib/workshopBunnyRepository';

export const dynamic = 'force-dynamic';
function isAdmin(request: NextRequest) { const raw = request.headers.get('authorization') || request.cookies.get('token')?.value || ''; return Boolean(verifyToken(raw.startsWith('Bearer ') ? raw.slice(7) : raw)?.isAdmin); }
function normalize(value: unknown) { return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function column(row: Record<string, unknown>, names: string[]) { const wanted = names.map(normalize); const key = Object.keys(row).find((x) => wanted.includes(normalize(x))); return key ? String(row[key] || '').trim() : ''; }

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  try {
    const form = await request.formData();
    const cohortId = String(form.get('cohortId') || '').trim();
    const action = String(form.get('action') || 'import');
    const file = form.get('file');
    if (!cohortId || !file || typeof file === 'string') return NextResponse.json({ error: 'cohortId and file are required' }, { status: 400 });
    const bytes = Buffer.from(await (file as File).arrayBuffer());
    const workbook = (file as File).name.toLowerCase().endsWith('.csv') ? XLSX.read(new TextDecoder().decode(bytes), { type: 'string', raw: false }) : XLSX.read(bytes, { type: 'buffer', cellDates: true });
    const rows = workbook.SheetNames.length ? XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]], { defval: '' }) : [];
    const columns = rows.length ? Object.keys(rows[0]) : [];
    if (action === 'preview') return NextResponse.json({ success: true, columns, sample: rows.slice(0, 3) });
    const mapping = JSON.parse(String(form.get('mapping') || '{}')) as Record<string, string>;
    const selected = new Set<string>(JSON.parse(String(form.get('selectedFields') || '["name","email","phone","whatsappNumber","whatsappJid"]')));
    const mapped = (row: Record<string, unknown>, key: string, aliases: string[]) => selected.has(key) ? String(row[mapping[key]] || '').trim() || column(row, aliases) : '';
    const errors: string[] = []; let imported = 0; let skipped = 0;
    for (const [index, row] of rows.entries()) {
      const name = mapped(row, 'name', ['name', 'student name', 'full name', 'participant name']);
      const email = mapped(row, 'email', ['email', 'email address', 'gmail']).toLowerCase();
      const phone = mapped(row, 'phone', ['phone', 'phone number', 'mobile', 'mobile number']);
      const whatsappNumber = mapped(row, 'whatsappNumber', ['whatsapp', 'whatsapp number', 'whatsapp mobile']);
      const whatsappJid = mapped(row, 'whatsappJid', ['whatsapp jid', 'jid', 'whatsapp id']);
      if (!name || (!email && !phone && !whatsappNumber && !whatsappJid)) { skipped++; errors.push(`Row ${index + 2}: name and one contact field are required`); continue; }
      try { await upsertStudent({ cohortId, name, email, phone, whatsappNumber, whatsappJid, source: 'form', active: true, metadata: row }); imported++; }
      catch (error) { skipped++; errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'could not save student'}`); }
    }
    const googleFormLink = String(form.get('googleFormLink') || '').trim();
    if (googleFormLink) await updateCohort(cohortId, { googleFormLink });
    return NextResponse.json({ success: true, imported, skipped, errors, message: `Imported ${imported} student(s); skipped ${skipped} row(s).` });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to import students' }, { status: 500 }); }
}
