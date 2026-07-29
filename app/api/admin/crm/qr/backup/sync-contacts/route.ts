import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { QRContactsSyncService } from '@/lib/qrContactsSync';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const db = (global as any).mongoClient?.db('swaryoga_admin_crm');
    if (!db) return NextResponse.json({ error: 'Database not connected' }, { status: 500 });

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (decoded as any).userId || (decoded as any).id;

    // Get user account with Google tokens
    const userAccount = await db.collection('qr_user_accounts').findOne({ _id: userId });
    if (!userAccount) {
      return NextResponse.json({ error: 'User account not found' }, { status: 404 });
    }

    if (!userAccount.googleDriveConnected || !userAccount.googleAccessToken) {
      return NextResponse.json(
        { error: 'Google Drive not connected. Connect first to sync contacts.' },
        { status: 400 }
      );
    }

    // Sync contacts
    const contactsSync = new QRContactsSyncService(db);

    try {
      // Fetch Google Contacts
      const googleContacts = await contactsSync.fetchGoogleContacts(userAccount.googleAccessToken);

      // Sync to database
      const syncedContacts = await contactsSync.syncContactsToWhatsApp(userId, googleContacts);

      return NextResponse.json({
        success: true,
        message: 'Contacts synced successfully',
        syncedCount: syncedContacts.length,
        contacts: syncedContacts.slice(0, 10), // Return first 10 as preview
      }, { status: 200 });
    } catch (error: any) {
      // Token might be expired, suggest reconnecting
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Google authorization expired. Please reconnect Google Drive.' },
          { status: 401 }
        );
      }

      throw error;
    }
  } catch (error: any) {
    console.error('[Sync Contacts] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Contact sync failed' },
      { status: 500 }
    );
  }
}

/**
 * GET - Get contacts sync status
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const db = (global as any).mongoClient?.db('swaryoga_admin_crm');
    if (!db) return NextResponse.json({ error: 'Database not connected' }, { status: 500 });

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (decoded as any).userId || (decoded as any).id;

    const contactsSync = new QRContactsSyncService(db);
    const status = await contactsSync.getSyncStatus(userId);

    return NextResponse.json({
      success: true,
      ...status,
    }, { status: 200 });
  } catch (error: any) {
    console.error('[Get Contacts Status] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get status' },
      { status: 500 }
    );
  }
}
