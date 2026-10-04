import { NextRequest, NextResponse } from 'next/server';
import { listForms } from '@/lib/bunny-forms-db';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const vercelCronSecret = process.env.CRON_SECRET;
  
  if (vercelCronSecret && authHeader !== `Bearer ${vercelCronSecret}`) {
    if (!request.headers.get('user-agent')?.includes('vercel-cron')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const forms = await listForms();
    const results = [];
    
    // Use the absolute URL for the fetch call
    const host = request.headers.get('host') || 'swaryoga.com';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    for (const form of forms) {
      if (!form.isActive) continue;
      
      // Try to sync every form. The sync API will gracefully skip non-Google forms.
      try {
        const syncUrl = `${baseUrl}/api/admin/google-forms/sync?url=${encodeURIComponent(form.formId)}`;
        const res = await fetch(syncUrl);
        const data = await res.json();
        results.push({ formId: form.formId, status: res.status, data });
      } catch (err: any) {
        results.push({ formId: form.formId, error: err.message });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
