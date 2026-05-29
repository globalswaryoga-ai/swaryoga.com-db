import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { uploadToS3 } from '@/lib/bunny-storage';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isSuperAdmin(decoded)) return NextResponse.json({ error: 'Superadmin only' }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get('image') as File | null;
  if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 });

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const key = `enquiry-forms/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadToS3(buffer, key, { contentType: file.type || 'image/jpeg' });

  return NextResponse.json({ success: true, url });
}
