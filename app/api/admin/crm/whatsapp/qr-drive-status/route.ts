import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getQrWhatsappDriveConnection } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const DriveConn = getQrWhatsappDriveConnection();
    const conn = await DriveConn.findOne({ userId: decoded.userId }).lean();

    if (!conn) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      googleEmail: (conn as any).googleEmail || '',
      needsReconnect: !!(conn as any).needsReconnect,
      lastSyncedAt: (conn as any).lastSyncedAt || null,
      lastError: (conn as any).lastError || '',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load status' }, { status: 500 });
  }
}
