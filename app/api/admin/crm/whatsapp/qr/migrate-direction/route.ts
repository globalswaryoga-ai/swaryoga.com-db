/**
 * Migration endpoint to backfill 'direction' field for QR WhatsApp messages
 *
 * GET /api/admin/crm/whatsapp/qr/migrate-direction
 *
 * Backfills the 'direction' field for messages that don't have it set.
 * This is a one-time operation to fix messages saved with older code.
 *
 * Requires admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getQrWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Verify admin auth
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];
    if (!token) return apiError('Unauthorized', 401);

    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) return apiError('Forbidden', 403);

    await connectDB();
    const QrMsg = getQrWhatsAppMessage();

    // Count messages before migration
    const countBefore = await QrMsg.countDocuments({
      $or: [
        { direction: { $exists: false } },
        { direction: null },
      ],
    });

    console.log(`[QR Migration] Starting migration for ${countBefore} messages`);

    if (countBefore === 0) {
      return apiSuccess({
        message: 'No messages need migration',
        messagesUpdated: 0,
        messagesAlready: await QrMsg.countDocuments({ direction: { $exists: true, $ne: null } }),
        skipped: true,
      });
    }

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

    const messagesUpdated = updateResult.modifiedCount || 0;
    const messagesAlready = await QrMsg.countDocuments({
      direction: { $exists: true, $ne: null },
    });

    console.log(`[QR Migration] ✅ Completed:
      - Updated: ${messagesUpdated}
      - Already had direction: ${messagesAlready}`);

    return apiSuccess({
      message: 'QR message direction migration completed successfully',
      success: true,
      messagesUpdated,
      messagesAlready,
      totalWithDirection: messagesUpdated + messagesAlready,
    });
  } catch (err: any) {
    console.error('[QR Migration] Error:', err.message);
    return apiError(err.message, 500);
  }
}
