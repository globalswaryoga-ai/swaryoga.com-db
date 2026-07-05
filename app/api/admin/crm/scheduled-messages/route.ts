import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import {
  verifyAdminAccess,
  parsePagination,
  handleCrmError,
  formatCrmSuccess,
  buildMetadata,
  isValidObjectId,
  toObjectId,
} from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';
import { WhatsAppScheduledJob } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone } from '@/lib/whatsapp';
import { resolveQrTenantBridge } from '@/lib/qrTenantBridge';
import { verifyToken } from '@/lib/auth';
import { resolveOwnerSessionKey } from '@/lib/qrTenantSession';

// Mark as dynamic since this route uses request.headers or request.url


export async function GET(request: NextRequest) {
  try {
    const userId = verifyAdminAccess(request);
    const { limit, skip } = parsePagination(request);
    const url = new URL(request.url);

    await connectDB();

    const status = url.searchParams.get('status');
    const q = url.searchParams.get('q');
    const phoneNumber = normalizePhone(url.searchParams.get('phoneNumber') || '');

    const filter: any = { createdByUserId: String(userId) };
    if (status && status !== 'all') filter.status = status;
    if (q && q.trim()) filter.name = { $regex: q.trim(), $options: 'i' };
    if (phoneNumber) filter.targetPhone = phoneNumber;

    const jobs = await WhatsAppScheduledJob.find(filter)
      .sort({ nextRunAt: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await WhatsAppScheduledJob.countDocuments(filter);
    const meta = buildMetadata(total, limit, skip);

    return formatCrmSuccess({ jobs, total }, meta);
  } catch (error) {
    return handleCrmError(error, 'GET scheduled-messages');
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = verifyAdminAccess(request);
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const {
      name,
      messageType,
      messageContent,
      templateId,
      templateVariables,
      targetType,
      targetLeadIds,
      targetFilter,
      targetPhone,
      provider,
      // Scheduling inputs
      sendAt,
      delayMinutes,
      recurrence,
      timezone,
      maxRuns,
      endAt,
    } = body;

    const normalizedType = String(messageType || 'text');
    if (normalizedType !== 'text' && normalizedType !== 'template') {
      // Support text and template message types
      return NextResponse.json({ error: 'messageType must be text or template' }, { status: 400 });
    }

    const content = String(messageContent || '').trim();
    if (!content && normalizedType === 'text') return NextResponse.json({ error: 'messageContent is required for text messages' }, { status: 400 });
    
    // For template messages, require templateId
    if (normalizedType === 'template' && !templateId) {
      return NextResponse.json({ error: 'templateId is required for template messages' }, { status: 400 });
    }

    let nextRunAt: Date | null = null;
    if (sendAt) nextRunAt = new Date(sendAt);
    if (!nextRunAt && typeof delayMinutes === 'number') {
      const mins = Math.max(0, Number(delayMinutes));
      nextRunAt = new Date(Date.now() + mins * 60 * 1000);
    }
    if (!nextRunAt) {
      return NextResponse.json({ error: 'Provide sendAt or delayMinutes' }, { status: 400 });
    }

    const tt = String(targetType || 'leadIds');
    if (!['leadIds', 'filter', 'phone'].includes(tt)) {
      return NextResponse.json({ error: 'Invalid targetType' }, { status: 400 });
    }

    const leadIds = Array.isArray(targetLeadIds) ? targetLeadIds : [];
    const filter = targetFilter && typeof targetFilter === 'object' ? targetFilter : undefined;

    if (tt === 'leadIds') {
      if (leadIds.length === 0) return NextResponse.json({ error: 'targetLeadIds is required' }, { status: 400 });
      for (const id of leadIds) {
        if (!isValidObjectId(String(id))) return NextResponse.json({ error: 'Invalid lead id in targetLeadIds' }, { status: 400 });
      }
    }

    if (tt === 'filter' && !filter) {
      return NextResponse.json({ error: 'targetFilter is required when targetType=filter' }, { status: 400 });
    }

    const normalizedPhone = tt === 'phone' ? normalizePhone(String(targetPhone || '')) : '';
    if (tt === 'phone' && (normalizedPhone.length < 10 || normalizedPhone.length > 15)) {
      return NextResponse.json({ error: 'A valid targetPhone is required when targetType=phone' }, { status: 400 });
    }

    const normalizedProvider = provider === 'qr' ? 'qr' : 'meta';
    if (tt === 'phone' && normalizedProvider !== 'qr') {
      return NextResponse.json({ error: 'Direct phone schedules require provider=qr' }, { status: 400 });
    }

    if (templateId && !isValidObjectId(String(templateId))) {
      return NextResponse.json({ error: 'Invalid templateId' }, { status: 400 });
    }

    await connectDB();

    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const decoded: any = verifyToken(token);
    const sharedOwnerKey = normalizedProvider === 'qr'
      ? await resolveOwnerSessionKey({ userId: String(userId), tenantSlug: decoded?.tenantSlug })
      : null;
    const qrSession = normalizedProvider === 'qr' ? await resolveQrTenantBridge(String(userId), sharedOwnerKey || undefined) : null;
    if (normalizedProvider === 'qr' && !qrSession) {
      return NextResponse.json({ error: 'QR WhatsApp session is not provisioned for this tenant' }, { status: 409 });
    }

    const job = await WhatsAppScheduledJob.create({
      name: String(name || 'Scheduled Message').trim(),
      createdByUserId: String(userId),
      status: 'active',
      targetType: tt,
      targetLeadIds: tt === 'leadIds' ? leadIds.map((id: any) => toObjectId(String(id))) : [],
      targetFilter: tt === 'filter' ? filter : undefined,
      targetPhone: tt === 'phone' ? normalizedPhone : undefined,
      provider: normalizedProvider,
      qrSessionKey: qrSession?.sessionKey,
      messageType: normalizedType,
      messageContent: content,
      templateId: templateId ? toObjectId(String(templateId)) : undefined,
      templateVariables: templateVariables || undefined,
      timezone: typeof timezone === 'string' && timezone.trim() ? timezone.trim() : 'Asia/Kolkata',
      nextRunAt,
      recurrence: recurrence || { frequency: 'none' },
      maxRuns: typeof maxRuns === 'number' ? Math.max(0, maxRuns) : 0,
      endAt: endAt ? new Date(endAt) : undefined,
    });

    return formatCrmSuccess(job);
  } catch (error) {
    return handleCrmError(error, 'POST scheduled-messages');
  }
}
