import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/admin/crm/cleanup/demo-contacts
 * Remove test/demo contacts from the system
 * Requires admin auth
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];
    if (!token) return apiError('Unauthorized', 401);

    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) return apiError('Unauthorized', 401);

    await connectDB();

    // Import schemas
    const { getLead, getQrWhatsAppChat, getQrWhatsAppMessage } = await import('@/lib/schemas/enterpriseSchemas');
    const Lead = getLead();
    const QrChat = getQrWhatsAppChat();
    const QrMsg = getQrWhatsAppMessage();

    // Demo/test numbers to clean up
    const demoNumbers = ['1606351380725', '160 6351380725', '1606351380725@lid'];

    // Delete from leads
    const leadResult = await Lead.deleteMany({
      $or: demoNumbers.map(num => ({ phoneNumber: num }))
    });

    // Delete from QR chats
    const chatResult = await QrChat.deleteMany({
      $or: [
        ...demoNumbers.map(num => ({ connectedPhone: num })),
        ...demoNumbers.map(num => ({ chatJid: { $regex: num } }))
      ]
    });

    // Delete from QR messages
    const msgResult = await QrMsg.deleteMany({
      $or: [
        ...demoNumbers.map(num => ({ connectedPhone: num })),
        ...demoNumbers.map(num => ({ chatJid: { $regex: num } }))
      ]
    });

    return apiSuccess({
      message: 'Demo contacts cleaned up',
      deleted: {
        leads: leadResult.deletedCount,
        chats: chatResult.deletedCount,
        messages: msgResult.deletedCount,
      }
    });
  } catch (err: any) {
    console.error('[Cleanup Demo Contacts]', err.message);
    return apiError(err.message, 500);
  }
}
