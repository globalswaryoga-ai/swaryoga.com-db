import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getQrWhatsappGoogleServiceConnection } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: { service: string } }) {
  const service = context.params.service;
  if (service !== 'contacts' && service !== 'gmail') return NextResponse.json({ error: 'Unknown Google service' }, { status: 404 });
  const decoded = verifyToken(request.headers.get('authorization')?.slice('Bearer '.length));
  if (!decoded?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const Connection = getQrWhatsappGoogleServiceConnection();
  const connection = await Connection.findOne({ userId: decoded.userId, service }).lean() as any;
  return NextResponse.json(connection ? {
    connected: true, googleEmail: connection.googleEmail || '', needsReconnect: !!connection.needsReconnect,
    lastSyncedAt: connection.lastSyncedAt || null, lastError: connection.lastError || '',
  } : { connected: false });
}
