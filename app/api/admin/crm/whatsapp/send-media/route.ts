import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { normalizePhone, sendWhatsAppMedia } from '@/lib/whatsapp';
import { getMetaCredentialsForTenant } from '@/lib/whatsappAccounts';
import { getBunnyLeadByPhone, saveBunnyLead } from '@/lib/bunnyLeadsRepository';
import { upsertBunnyMetaMessage, updateBunnyMetaMessage } from '@/lib/bunnyMetaWhatsAppRepository';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1] || '';
    const decoded: any = verifyToken(token);
    if (!decoded || (!decoded.isAdmin && !decoded.userId)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { to, mediaUrl, kind, caption } = body;
    if (!to || !mediaUrl || !kind) {
      return NextResponse.json({ success: false, error: 'to, mediaUrl, and kind are required' }, { status: 400 });
    }

    const userId = decoded.userId || decoded.username || 'unknown';
    const superAdmin = userId === 'admincrm' || userId === 'admin';
    const phone = normalizePhone(String(to));

    let lead = await getBunnyLeadByPhone(phone, superAdmin ? null : userId);
    
    if (!lead) {
      lead = await saveBunnyLead({
        phoneNumber: phone,
        name: `WhatsApp ${phone}`,
        source: 'manual',
        status: 'lead',
        assignedToUserId: userId,
        createdByUserId: userId,
      });
    }

    const creds = (await getMetaCredentialsForTenant(userId)) || undefined;

    const messageRecordId = 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

    await upsertBunnyMetaMessage({
      _id: messageRecordId,
      documentId: messageRecordId,
      leadId: lead?._id ? String(lead._id) : undefined,
      phoneNumber: phone,
      messageType: 'media',
      messageContent: caption || '(media)',
      direction: 'outbound',
      status: 'queued',
      sentAt: new Date().toISOString(),
      provider: 'meta',
      sentByUserId: userId,
      sentByLabel: decoded.name || decoded.username || userId,
      media: {
        url: mediaUrl,
        kind: kind,
      }
    });

    try {
      const result = await sendWhatsAppMedia(phone, mediaUrl, kind, caption, creds);
      await updateBunnyMetaMessage(messageRecordId, {
        status: 'sent',
        waMessageId: result.waMessageId,
      });
      return NextResponse.json({ success: true, waMessageId: result.waMessageId });
    } catch (sendErr: any) {
      await updateBunnyMetaMessage(messageRecordId, {
        status: 'failed',
        failureReason: sendErr.message,
      });
      throw sendErr;
    }
  } catch (err: any) {
    console.error('[META SEND-MEDIA] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
