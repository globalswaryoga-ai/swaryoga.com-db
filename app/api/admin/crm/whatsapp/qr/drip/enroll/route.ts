/**
 * POST   /api/admin/crm/whatsapp/qr/drip/enroll
 *        { sequenceId, phones: string[] } — enroll numbers into a sequence
 * DELETE { sequenceId, phones?: string[] } — stop enrollments (all when phones omitted)
 * GET    ?sequenceId=… — list enrollments for a sequence
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId } from '@/lib/crm-handlers';
import { getQrDripSequence, getQrDripEnrollment } from '@/lib/schemas/enterpriseSchemas';
import { computeStepSendAt, normalizePhoneDigits } from '@/lib/qrDrip';
import { isOptedOut } from '@/lib/qrOptOut';

export const dynamic = 'force-dynamic';

function auth(req: NextRequest): { userId: string } | null {
  const decoded: any = verifyToken(req.headers.get('authorization') || '');
  if (!decoded || !decoded.isAdmin) return null;
  const userId = getViewerUserId(decoded);
  return userId ? { userId } : null;
}

export async function GET(req: NextRequest) {
  try {
    const caller = auth(req);
    if (!caller) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    await connectDB();

    const sequenceId = req.nextUrl.searchParams.get('sequenceId') || '';
    if (!sequenceId) return NextResponse.json({ success: false, error: 'sequenceId required' }, { status: 400 });

    const QrDripEnrollment = getQrDripEnrollment();
    const enrollments = await QrDripEnrollment.find({ userId: caller.userId, sequenceId })
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    return NextResponse.json({
      success: true,
      enrollments: enrollments.map((e: any) => ({
        id: String(e._id),
        phone: e.phone,
        status: e.status,
        currentStep: e.currentStep,
        sentCount: e.sentCount,
        nextSendAt: e.nextSendAt,
        stoppedReason: e.stoppedReason || '',
        enrolledAt: e.enrolledAt,
      })),
    });
  } catch (err: any) {
    console.error('[QR DRIP ENROLL] GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const caller = auth(req);
    if (!caller) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    await connectDB();

    const { sequenceId, phones } = await req.json();
    if (!sequenceId || !Array.isArray(phones) || phones.length === 0) {
      return NextResponse.json({ success: false, error: 'sequenceId and phones[] required' }, { status: 400 });
    }
    if (phones.length > 500) {
      return NextResponse.json({ success: false, error: 'Maximum 500 phones per enrollment batch' }, { status: 400 });
    }

    const QrDripSequence = getQrDripSequence();
    const QrDripEnrollment = getQrDripEnrollment();
    const seq: any = await QrDripSequence.findOne({ _id: sequenceId, userId: caller.userId }).lean();
    if (!seq) return NextResponse.json({ success: false, error: 'Sequence not found' }, { status: 404 });
    if (!seq.steps?.length) return NextResponse.json({ success: false, error: 'Sequence has no steps' }, { status: 400 });

    const now = new Date();
    let enrolled = 0;
    let skippedOptedOut = 0;
    let skippedInvalid = 0;
    let skippedDuplicate = 0;

    for (const raw of phones) {
      const phone = normalizePhoneDigits(String(raw));
      if (!phone || phone.length < 10 || phone.length > 15) { skippedInvalid++; continue; }
      if (await isOptedOut(caller.userId, phone)) { skippedOptedOut++; continue; }

      try {
        await QrDripEnrollment.create({
          userId: caller.userId,
          sequenceId: seq._id,
          phone,
          chatJid: `${phone}@s.whatsapp.net`,
          enrolledAt: now,
          currentStep: 0,
          nextSendAt: computeStepSendAt(now, seq.steps[0]),
          stopOnReply: seq.stopOnReply !== false,
          status: 'active',
        });
        enrolled++;
      } catch (e: any) {
        if (e?.code === 11000) skippedDuplicate++; // already enrolled in this sequence
        else throw e;
      }
    }

    return NextResponse.json({ success: true, enrolled, skippedOptedOut, skippedInvalid, skippedDuplicate });
  } catch (err: any) {
    console.error('[QR DRIP ENROLL] POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const caller = auth(req);
    if (!caller) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    await connectDB();

    const { sequenceId, phones } = await req.json();
    if (!sequenceId) return NextResponse.json({ success: false, error: 'sequenceId required' }, { status: 400 });

    const filter: any = { userId: caller.userId, sequenceId, status: 'active' };
    if (Array.isArray(phones) && phones.length > 0) {
      filter.phone = { $in: phones.map((p: string) => normalizePhoneDigits(p)) };
    }

    const QrDripEnrollment = getQrDripEnrollment();
    const result = await QrDripEnrollment.updateMany(filter, {
      $set: { status: 'stopped', stoppedReason: 'manually_removed' },
    });

    return NextResponse.json({ success: true, stopped: result.modifiedCount });
  } catch (err: any) {
    console.error('[QR DRIP ENROLL] DELETE error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
