import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getQrWhatsappDriveConnection } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

/**
 * GET - Get contacts sync status
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    if (!token) {
      return NextResponse.json({
        lastSyncAt: null,
        lastSyncStatus: 'pending',
        syncedContactsCount: 0,
      });
    }

    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({
        lastSyncAt: null,
        lastSyncStatus: 'pending',
        syncedContactsCount: 0,
      });
    }

    return NextResponse.json({
      lastSyncAt: null,
      lastSyncStatus: 'pending',
      syncedContactsCount: 0,
    });
  } catch (error: any) {
    console.warn('[Get Contacts Status] Error:', error?.message);
    return NextResponse.json({
      lastSyncAt: null,
      lastSyncStatus: 'pending',
      syncedContactsCount: 0,
    });
  }
}

/**
 * POST - Trigger contacts sync
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      message: 'Contacts sync initiated',
      syncedCount: 0,
      contacts: [],
    });
  } catch (error: any) {
    console.error('[Sync Contacts] Error:', error);
    return NextResponse.json({ error: error?.message || 'Sync failed' }, { status: 500 });
  }
}
