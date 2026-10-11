import { NextResponse } from 'next/server';
import { listForms } from '@/lib/bunny-forms-db';
import { registrationViewer } from '@/lib/registrationAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });

  try {
    const forms = await listForms();
    const visibleForms = forms.filter(form => form.isActive && (viewer.superAdmin || form.createdBy === viewer.userId));
    return NextResponse.json({ success: true, data: visibleForms }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Failed to load form-link registration options:', error);
    return NextResponse.json({ error: 'Registration forms are unavailable. Please retry.' }, { status: 503 });
  }
}
