import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { connectDB } from '@/lib/db';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

const EDITABLE_FIELDS = [
  'name',
  'email',
  'phoneNumber',
  'phone',
  'status',
  'workshopName',
  'country',
  'state',
  'gender',
  'age',
  'profession',
  'workshopLanguage',
  'workshopMode',
  'batchPreference',
  'participantStatus',
  'city',
  'timeAvailable',
  'videoOnDuringClass',
  'regularAttendance',
  'healthIssues',
  'deviceForWorkshop',
  'donationReady',
];

function authorize(request: NextRequest) {
  const token = request.headers.get('authorization')?.slice('Bearer '.length);
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin && !decoded?.userId) return null;
  const viewerUserId = getViewerUserId(decoded);
  if (!viewerUserId) return null;
  return { decoded, viewerUserId, superAdmin: isSuperAdmin(decoded) };
}

function accessFilter(auth: { viewerUserId: string; superAdmin: boolean }) {
  if (auth.superAdmin) return {};
  return {
    $or: [
      { assignedToUserId: auth.viewerUserId },
      { createdByUserId: auth.viewerUserId },
    ],
  };
}

function formSubmissionFilter() {
  return {
    $or: [
      { 'metadata.formType': { $exists: true } },
      { labels: 'form-submission' },
      { source: { $regex: /form|website|workshop|signup/i } },
    ],
  };
}

function toPlainRow(lead: any) {
  const metadata = lead.metadata && typeof lead.metadata === 'object' ? lead.metadata : {};
  return {
    _id: String(lead._id),
    leadNumber: lead.leadNumber || '',
    name: lead.name || '',
    email: lead.email || '',
    phoneNumber: lead.phoneNumber || '',
    status: lead.status || '',
    source: lead.source || '',
    workshopName: lead.workshopName || metadata.workshopName || '',
    formType: metadata.formType || '',
    workshopLanguage: metadata.workshopLanguage || '',
    workshopMode: metadata.workshopMode || '',
    batchPreference: metadata.batchPreference || '',
    country: metadata.country || '',
    state: metadata.state || '',
    gender: metadata.gender || '',
    age: metadata.age ?? '',
    profession: metadata.profession || '',
    educationStatus: metadata.educationStatus || '',
    participantStatus: metadata.participantStatus || '',
    city: metadata.city || '',
    timeAvailable: metadata.timeAvailable || '',
    videoOnDuringClass: metadata.videoOnDuringClass || '',
    regularAttendance: metadata.regularAttendance || '',
    healthIssues: metadata.healthIssues || '',
    deviceForWorkshop: metadata.deviceForWorkshop || '',
    donationReady: metadata.donationReady || '',
    submittedAt: metadata.submittedAt || lead.createdAt || '',
    updatedAt: lead.updatedAt || '',
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = authorize(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 10000), 1), 10000);
    const q = String(url.searchParams.get('q') || '').trim();
    const filter: any = { $and: [formSubmissionFilter(), accessFilter(auth)] };

    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$and = [
        formSubmissionFilter(),
        accessFilter(auth),
        { $or: [
          { name: { $regex: safe, $options: 'i' } },
          { email: { $regex: safe, $options: 'i' } },
          { leadNumber: { $regex: safe, $options: 'i' } },
          { 'metadata.formType': { $regex: safe, $options: 'i' } },
        ] },
      ];
    }

    await connectDB();
    const Lead = getLead();
    const [leads, total] = await Promise.all([
      Lead.find(filter).sort({ createdAt: -1 }).limit(limit).lean(),
      Lead.countDocuments(filter),
    ]);

    return NextResponse.json({ success: true, data: leads.map(toPlainRow), total });
  } catch (error) {
    console.error('[form-submissions] GET failed:', error);
    return NextResponse.json({ error: 'Failed to load form submissions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = authorize(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Please upload an Excel file' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(Buffer.from(bytes), { type: 'buffer', cellDates: true });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
    if (!rows.length) return NextResponse.json({ success: true, updated: 0, skipped: 0, errors: [] });

    await connectDB();
    const Lead = getLead();
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const [index, row] of rows.entries()) {
      const rawId = String(row._id || row.id || '').trim();
      const id = /^[a-f\d]{24}$/i.test(rawId) ? rawId : '';
      const leadNumber = String(row.leadNumber || row['Lead Number'] || '').trim();
      const email = String(row.email || row.Email || '').trim().toLowerCase();
      const lookup: any = id ? { _id: id } : leadNumber ? { leadNumber } : email ? { email } : null;
      if (!lookup) {
        skipped++;
        errors.push(`Row ${index + 2}: missing _id, leadNumber, or email`);
        continue;
      }

      const existing: any = await Lead.findOne({ ...lookup, ...accessFilter(auth) }).lean();
      if (!existing) {
        skipped++;
        errors.push(`Row ${index + 2}: submission not found or not accessible`);
        continue;
      }

      const leadUpdate: Record<string, unknown> = {};
      const metadataUpdate: Record<string, unknown> = { ...(existing.metadata || {}) };
      for (const field of EDITABLE_FIELDS) {
        if (!(field in row)) continue;
        const value = row[field];
        if (field === 'phone') leadUpdate.phoneNumber = String(value || '').trim();
        else if (['name', 'email', 'phoneNumber', 'status', 'workshopName'].includes(field)) {
          leadUpdate[field] = String(value || '').trim();
        } else {
          metadataUpdate[field] = value;
        }
      }
      if ('workshopName' in row) metadataUpdate.workshopName = String(row.workshopName || '').trim();

      if (!Object.keys(leadUpdate).length && Object.keys(metadataUpdate).length === Object.keys(existing.metadata || {}).length) {
        skipped++;
        continue;
      }

      await Lead.updateOne(
        { _id: existing._id },
        { $set: { ...leadUpdate, metadata: metadataUpdate, updatedAt: new Date() } },
      );
      updated++;
    }

    return NextResponse.json({ success: true, updated, skipped, errors });
  } catch (error) {
    console.error('[form-submissions] POST failed:', error);
    return NextResponse.json({ error: 'Failed to import form submissions' }, { status: 500 });
  }
}
