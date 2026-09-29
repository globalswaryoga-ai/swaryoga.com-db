import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { WhatsAppAccount } from '@/lib/schemas/enterpriseSchemas';
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function verifyAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.slice('Bearer '.length);
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin) throw new Error('Unauthorized');
  return decoded;
}

/**
 * POST /api/admin/migrate/whatsapp-accounts
 * Migrates all WhatsApp accounts from MongoDB → BunnyDB (whatsapp_accounts_sql).
 * Safe to run multiple times — uses INSERT OR REPLACE so duplicates are overwritten.
 */
export async function POST(request: NextRequest) {
  try {
    verifyAdmin(request);
    await connectDB();

    // Fetch all accounts from MongoDB
    const accounts = await WhatsAppAccount.find({}).lean() as any[];
    console.log(`[WA Migration] Found ${accounts.length} accounts in MongoDB`);

    if (accounts.length === 0) {
      return NextResponse.json({ success: true, migrated: 0, message: 'No accounts found in MongoDB' });
    }

    // Ensure the table exists
    await bunnyExecute({
      sql: `CREATE TABLE IF NOT EXISTS whatsapp_accounts_sql (
        document_id TEXT PRIMARY KEY,
        account_type TEXT NOT NULL DEFAULT 'meta',
        created_by_user_id TEXT NOT NULL,
        meta_phone_number_id TEXT,
        meta_phone_number TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        status TEXT,
        data_json TEXT NOT NULL,
        created_at TEXT,
        updated_at TEXT
      )`,
      args: [],
    });

    const now = new Date().toISOString();
    let migrated = 0;
    let skipped = 0;

    const statements = accounts
      .filter((a: any) => a.accountType === 'meta' || !a.accountType) // only Meta accounts
      .map((a: any) => {
        const documentId = String(a._id);
        const tenantUserId = String(a.createdByUserId || '');
        if (!tenantUserId) { skipped++; return null; }

        // Store full document in data_json for credential retrieval
        const dataJson = JSON.stringify({
          _id: documentId,
          accountName: a.accountName || '',
          accountType: a.accountType || 'meta',
          metaPhoneNumberId: a.metaPhoneNumberId || null,
          metaPhoneNumber: a.metaPhoneNumber || null,
          metaBusinessAccountId: a.metaBusinessAccountId || null,
          metaAccessToken: a.metaAccessToken || null,
          metaVerifyToken: a.metaVerifyToken || null,
          status: a.status || 'disconnected',
          isActive: a.isActive !== false,
          isDefault: a.isDefault || false,
          createdByUserId: tenantUserId,
          tenantUserId,
          createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : now,
          updatedAt: a.updatedAt ? new Date(a.updatedAt).toISOString() : now,
        });

        migrated++;
        return {
          sql: `INSERT OR REPLACE INTO whatsapp_accounts_sql
            (document_id, account_type, created_by_user_id, meta_phone_number_id, meta_phone_number, is_active, status, data_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            documentId,
            'meta',
            tenantUserId,
            a.metaPhoneNumberId || null,
            a.metaPhoneNumber || null,
            a.isActive !== false ? 1 : 0,
            a.status || 'disconnected',
            dataJson,
            a.createdAt ? new Date(a.createdAt).toISOString() : now,
            a.updatedAt ? new Date(a.updatedAt).toISOString() : now,
          ],
        };
      })
      .filter(Boolean) as any[];

    if (statements.length > 0) {
      await bunnyBatch(statements);
    }

    // Verify
    const countResult = await bunnyExecute('SELECT COUNT(*) as count FROM whatsapp_accounts_sql');
    const totalInBunny = Number(countResult.rows[0]?.count ?? 0);

    console.log(`[WA Migration] Done. Migrated: ${migrated}, Skipped: ${skipped}, Total in BunnyDB: ${totalInBunny}`);

    return NextResponse.json({
      success: true,
      migrated,
      skipped,
      totalInBunny,
      message: `Migrated ${migrated} WhatsApp account(s) to BunnyDB`,
    });
  } catch (error: any) {
    console.error('[WA Migration] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * GET — Check current state without migrating
 */
export async function GET(request: NextRequest) {
  try {
    verifyAdmin(request);

    const countResult = await bunnyExecute('SELECT COUNT(*) as count FROM whatsapp_accounts_sql');
    const rows = await bunnyExecute('SELECT document_id, created_by_user_id, meta_phone_number_id, meta_phone_number, is_active, status FROM whatsapp_accounts_sql');

    return NextResponse.json({
      success: true,
      count: Number(countResult.rows[0]?.count ?? 0),
      accounts: rows.rows,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
