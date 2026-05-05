/**
 * Migrate QR WhatsApp messages to ensure direction field is set
 *
 * This utility backfills the 'direction' field for messages that only have 'fromMe' field.
 * It should be called once to fix existing messages in the database.
 */

import { connectDB } from '@/lib/db';
import { getQrWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';

export async function migrateQrMessageDirection(): Promise<{
  success: boolean;
  messagesUpdated: number;
  messagesAlready: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let messagesUpdated = 0;
  let messagesAlready = 0;

  try {
    await connectDB();
    const QrMsg = getQrWhatsAppMessage();

    // Find messages without direction field
    const messagesToMigrate = await QrMsg.find({
      $or: [
        { direction: { $exists: false } },
        { direction: null },
      ],
    }).lean();

    console.log(`[QR Migration] Found ${messagesToMigrate.length} messages to migrate`);

    // Check if already has direction field
    const messagesWithDirection = await QrMsg.countDocuments({
      direction: { $exists: true, $ne: null },
    });

    messagesAlready = messagesWithDirection;

    // Batch update: set direction based on fromMe field
    const updateResult = await QrMsg.updateMany(
      {
        $or: [
          { direction: { $exists: false } },
          { direction: null },
        ],
      },
      [
        {
          $set: {
            direction: {
              $cond: [{ $eq: ['$fromMe', true] }, 'outbound', 'inbound'],
            },
          },
        },
      ]
    );

    messagesUpdated = updateResult.modifiedCount || 0;

    console.log(`[QR Migration] ✅ Migration complete:
      - Updated: ${messagesUpdated}
      - Already had direction: ${messagesAlready}
      - Errors: ${errors.length}`);

    return {
      success: errors.length === 0,
      messagesUpdated,
      messagesAlready,
      errors,
    };
  } catch (err: any) {
    const errMsg = err instanceof Error ? err.message : String(err);
    errors.push(errMsg);
    console.error('[QR Migration] Error:', errMsg);
    return {
      success: false,
      messagesUpdated,
      messagesAlready,
      errors,
    };
  }
}

/**
 * API endpoint to trigger migration
 * GET /api/admin/crm/whatsapp/qr/migrate-direction
 */
export async function createMigrationEndpoint() {
  return `
    import { NextRequest, NextResponse } from 'next/server';
    import { verifyToken } from '@/lib/auth';
    import { migrateQrMessageDirection } from '@/lib/qr/migrateMessageDirection';

    export async function GET(req: NextRequest) {
      try {
        // Verify admin auth
        const authHeader = req.headers.get('authorization');
        const token = authHeader?.split('Bearer ')[1];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = verifyToken(token);
        if (!decoded?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const result = await migrateQrMessageDirection();

        return NextResponse.json({
          success: result.success,
          message: 'QR message direction migration completed',
          ...result,
        });
      } catch (err: any) {
        return NextResponse.json({
          error: err.message,
          success: false
        }, { status: 500 });
      }
    }
  `;
}
