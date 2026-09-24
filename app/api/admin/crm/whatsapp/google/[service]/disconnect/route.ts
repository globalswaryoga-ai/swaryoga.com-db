import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getQrWhatsappGoogleServiceConnection } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: { service: string } }) {
  const service = context.params.service;
  if (service !== 'contacts' && service !== 'gmail') return NextResponse.json({ error: 'Unknown Google service' }, { status: 404 });
  const decoded = verifyToken(request.headers.get('authorization')?.slice('Bearer '.length));
  if (!decoded?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  await getQrWhatsappGoogleServiceConnection().deleteOne({ userId: decoded.userId, service });
  return NextResponse.json({ success: true });
}
