import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';
import { normalizePhone } from '@/lib/whatsapp';
import { addLeadToMainBroadcastList } from '@/lib/crm/broadcast-automation';
import { createSubmission } from '@/lib/bunny-forms-db';

export const dynamic = 'force-dynamic';
function normalize(value: unknown) { return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function column(row: Record<string, unknown>, names: string[]) { const wanted = names.map(normalize); const key = Object.keys(row).find((x) => wanted.includes(normalize(x))); return key ? String(row[key] || '').trim() : ''; }

export async function POST(request: NextRequest) {
  const decoded = verifyToken(request.headers.get('authorization')?.slice(7) || request.cookies.get('token')?.value || '');
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  try {
    const form = await request.formData();
    const workshopId = String(form.get('workshopId') || '').trim();
    const workshopName = String(form.get('workshopName') || 'Imported Form Data').trim();
    const action = String(form.get('action') || 'import');
    const file = form.get('file');

    if (!workshopId || !file || typeof file === 'string') {
      return NextResponse.json({ error: 'workshopId and file are required' }, { status: 400 });
    }

    const bytes = Buffer.from(await (file as File).arrayBuffer());
    const workbook = (file as File).name.toLowerCase().endsWith('.csv') ? XLSX.read(new TextDecoder().decode(bytes), { type: 'string', raw: false }) : XLSX.read(bytes, { type: 'buffer', cellDates: true });
    const rows = workbook.SheetNames.length ? XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]], { defval: '' }) : [];
    const columns = rows.length ? Object.keys(rows[0]) : [];

    if (action === 'preview') {
      return NextResponse.json({ success: true, columns, sample: rows.slice(0, 3) });
    }

    const mapping = JSON.parse(String(form.get('mapping') || '{}')) as Record<string, string>;
    const selected = new Set<string>(JSON.parse(String(form.get('selectedFields') || '[]')));
    const dynamicFields = JSON.parse(String(form.get('dynamicFields') || '[]')) as string[];
    
    const mapped = (row: Record<string, unknown>, key: string, aliases: string[]) => selected.has(key) ? String(row[mapping[key]] || '').trim() || column(row, aliases) : '';

    const errors: string[] = []; 
    let imported = 0; 
    let skipped = 0;

    await connectDB();
    const Lead = getLead();

    for (const [index, row] of rows.entries()) {
      const name = mapped(row, 'name', ['name', 'full name', 'first name']);
      const mobile = mapped(row, 'mobile', ['phone', 'mobile', 'whatsapp', 'number']);
      const email = mapped(row, 'email', ['email', 'gmail', 'mail']);
      const gender = mapped(row, 'gender', ['gender', 'sex']);
      const city = mapped(row, 'city', ['city', 'location', 'town']);

      if (!name && !mobile && !email) { 
        skipped++; 
        errors.push(`Row ${index + 2}: missing name/contact info`); 
        continue; 
      }

      // Build dynamic answers
      const dynamicAnswers: Record<string, any> = {};
      for (const df of dynamicFields) {
        if (mapping[df]) {
          dynamicAnswers[df] = String(row[mapping[df]] || '').trim();
        }
      }

      try { 
        // 1. Save to BunnyDB form_submissions
        try {
          await createSubmission({
            formId: workshopId,
            name: name,
            mobile: mobile,
            email: email,
            gender: gender,
            city: city,
            dynamicAnswers,
          });
        } catch (bErr) {
          console.error('[enquiries import] BunnyDB save failed:', bErr);
        }

        // 2. Save to CRM Lead
        const cleanedPhone = normalizePhone(mobile);
        const cleanedName = String(name || '').trim();

        if (cleanedPhone) {
          const existingLead = await Lead.findOne({ phoneNumber: cleanedPhone });

          if (existingLead) {
            if (!existingLead.leadNumber) {
              const { leadNumber: num } = await allocateNextLeadNumber();
              existingLead.leadNumber = num;
            }
            if (cleanedName && !existingLead.name) existingLead.name = cleanedName;
            existingLead.labels = Array.from(new Set([...(existingLead.labels || []), 'enquiry', 'admin-form', workshopName]));
            existingLead.metadata = {
              ...(existingLead.metadata || {}),
              lastEnquiry: { workshopId, workshopName, gender, city, submittedAt: new Date(), dynamicAnswers },
            };
            await existingLead.save();
            await addLeadToMainBroadcastList(existingLead);
          } else {
            const { leadNumber: allocatedLeadNumber } = await allocateNextLeadNumber();
            const newLead = await Lead.create({
              leadNumber: allocatedLeadNumber,
              name: cleanedName || 'Unknown User',
              phoneNumber: cleanedPhone,
              status: 'lead',
              source: 'website',
              workshopName: workshopName,
              labels: ['enquiry', 'admin-form', workshopName],
              createdByUserId: 'system',
              assignedToUserId: 'system',
              metadata: {
                formType: 'admin-enquiry',
                workshopId,
                workshopName,
                gender,
                city,
                submittedAt: new Date(),
                dynamicAnswers,
              },
            });
            await addLeadToMainBroadcastList(newLead);
          }
        }
        
        imported++; 
      }
      catch (error) { 
        skipped++; 
        errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'could not save enquiry'}`); 
      }
    }
    
    return NextResponse.json({ success: true, imported, skipped, errors, message: `Imported ${imported} form submissions; skipped ${skipped} row(s).` });
  } catch (error) { 
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to import form data' }, { status: 500 }); 
  }
}
