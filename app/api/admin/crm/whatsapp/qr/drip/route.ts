/**
 * QR WhatsApp Drip Sequences — multi-step lead journeys.
 *
 * GET            → list this tenant's sequences with enrollment stats
 * POST           → create { name, stopOnReply?, steps: [{dayOffset, timeOfDay, messageText}] }
 * PUT            → update { id, name?, active?, stopOnReply?, steps? }
 * DELETE         → { id } — delete sequence and stop its active enrollments
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId } from '@/lib/crm-handlers';
import { getQrDripSequence, getQrDripEnrollment } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

function auth(req: NextRequest): { userId: string } | null {
  const decoded: any = verifyToken(req.headers.get('authorization') || '');
  if (!decoded || !decoded.isAdmin) return null;
  const userId = getViewerUserId(decoded);
  return userId ? { userId } : null;
}

function validateSteps(steps: any): string | null {
  if (!Array.isArray(steps) || steps.length === 0) return 'At least one step required';
  if (steps.length > 30) return 'Maximum 30 steps';
  for (const s of steps) {
    const day = Number(s.dayOffset);
    if (!Number.isInteger(day) || day < 0 || day > 365) return 'Each step needs a dayOffset between 0 and 365';
    if (!String(s.messageText || '').trim()) return 'Each step needs a message';
    if (s.timeOfDay && !/^\d{2}:\d{2}$/.test(String(s.timeOfDay))) return 'timeOfDay must be HH:mm';
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const caller = auth(req);
    if (!caller) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    await connectDB();

    const QrDripSequence = getQrDripSequence();
    const QrDripEnrollment = getQrDripEnrollment();

    const sequences = await QrDripSequence.find({ userId: caller.userId }).sort({ createdAt: -1 }).lean();
    const counts: any[] = await QrDripEnrollment.aggregate([
      { $match: { userId: caller.userId } },
      { $group: { _id: { sequenceId: '$sequenceId', status: '$status' }, n: { $sum: 1 } } },
    ]);
    const bySeq: Record<string, Record<string, number>> = {};
    for (const c of counts) {
      const sid = String(c._id.sequenceId);
      bySeq[sid] = bySeq[sid] || {};
      bySeq[sid][c._id.status] = c.n;
    }

    return NextResponse.json({
      success: true,
      sequences: sequences.map((s: any) => ({
        id: String(s._id),
        name: s.name,
        active: s.active,
        stopOnReply: s.stopOnReply,
        steps: (s.steps || []).map((st: any) => ({ dayOffset: st.dayOffset, timeOfDay: st.timeOfDay, messageText: st.messageText })),
        enrollments: {
          active: bySeq[String(s._id)]?.active || 0,
          completed: bySeq[String(s._id)]?.completed || 0,
          stopped: bySeq[String(s._id)]?.stopped || 0,
        },
        createdAt: s.createdAt,
      })),
    });
  } catch (err: any) {
    console.error('[QR DRIP] GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const caller = auth(req);
    if (!caller) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    await connectDB();

    const { name, stopOnReply, steps } = await req.json();
    if (!String(name || '').trim()) return NextResponse.json({ success: false, error: 'name required' }, { status: 400 });
    const stepErr = validateSteps(steps);
    if (stepErr) return NextResponse.json({ success: false, error: stepErr }, { status: 400 });

    const QrDripSequence = getQrDripSequence();
    const seq: any = await QrDripSequence.create({
      userId: caller.userId,
      name: String(name).trim().slice(0, 120),
      active: true,
      stopOnReply: stopOnReply !== false,
      steps: steps.map((s: any) => ({
        dayOffset: Number(s.dayOffset),
        timeOfDay: s.timeOfDay || '09:00',
        messageText: String(s.messageText).slice(0, 4000),
      })).sort((a: any, b: any) => a.dayOffset - b.dayOffset),
    });

    return NextResponse.json({ success: true, id: String(seq._id) });
  } catch (err: any) {
    console.error('[QR DRIP] POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const caller = auth(req);
    if (!caller) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    await connectDB();

    const { id, name, active, stopOnReply, steps } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

    const update: any = {};
    if (name !== undefined) update.name = String(name).trim().slice(0, 120);
    if (active !== undefined) update.active = !!active;
    if (stopOnReply !== undefined) update.stopOnReply = !!stopOnReply;
    if (steps !== undefined) {
      const stepErr = validateSteps(steps);
      if (stepErr) return NextResponse.json({ success: false, error: stepErr }, { status: 400 });
      update.steps = steps.map((s: any) => ({
        dayOffset: Number(s.dayOffset),
        timeOfDay: s.timeOfDay || '09:00',
        messageText: String(s.messageText).slice(0, 4000),
      })).sort((a: any, b: any) => a.dayOffset - b.dayOffset);
    }

    const QrDripSequence = getQrDripSequence();
    const result = await QrDripSequence.updateOne({ _id: id, userId: caller.userId }, { $set: update });
    if (result.matchedCount === 0) return NextResponse.json({ success: false, error: 'Sequence not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[QR DRIP] PUT error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const caller = auth(req);
    if (!caller) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    await connectDB();

    const { id } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

    const QrDripSequence = getQrDripSequence();
    const QrDripEnrollment = getQrDripEnrollment();
    const result = await QrDripSequence.deleteOne({ _id: id, userId: caller.userId });
    if (result.deletedCount === 0) return NextResponse.json({ success: false, error: 'Sequence not found' }, { status: 404 });

    await QrDripEnrollment.updateMany(
      { userId: caller.userId, sequenceId: id, status: 'active' },
      { $set: { status: 'stopped', stoppedReason: 'sequence_deleted' } }
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[QR DRIP] DELETE error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
