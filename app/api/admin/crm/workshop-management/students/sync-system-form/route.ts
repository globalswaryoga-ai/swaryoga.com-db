import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { connectDB } from '@/lib/db';
import { upsertStudent } from '@/lib/workshopBunnyRepository';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const raw = request.headers.get('authorization') || request.cookies.get('token')?.value || '';
    const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
    const decoded = verifyToken(token);
    
    if (!decoded?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const body = await request.json();
    const { cohortId, formUrl } = body;
    if (!cohortId || !formUrl) {
      return NextResponse.json({ error: 'cohortId and formUrl are required' }, { status: 400 });
    }

    let formId = formUrl;
    if (formUrl.includes('/workshop-join/')) {
      formId = formUrl.split('/workshop-join/')[1].split('/')[0].split('?')[0];
    }

    await connectDB();
    const Lead = getLead();
    const leads = await Lead.find({ 'metadata.formId': formId });

    let enrolled = 0;
    for (const lead of leads) {
      await upsertStudent({
        cohortId,
        name: lead.name || 'Unknown',
        email: lead.email || '',
        phone: lead.phoneNumber || '',
        whatsappNumber: lead.phoneNumber || '',
        leadId: lead._id.toString(),
        leadNumber: lead.leadNumber || '',
        source: 'system-form',
        active: true
      });
      enrolled++;
    }

    return NextResponse.json({ success: true, enrolled });
  } catch (error: any) {
    console.error('[sync-system-form]', error);
    return NextResponse.json({ error: error?.message || 'Failed to sync form students' }, { status: 500 });
  }
}
