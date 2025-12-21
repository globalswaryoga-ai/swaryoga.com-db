import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { UserConsent } from '@/lib/schemas/enterpriseSchemas';
import mongoose from 'mongoose';

/**
 * User consent management for WhatsApp/SMS communications
 * GET: Fetch consent records
 * POST: Create/update consent record
 * PUT: Update consent status (opt-in, opt-out, pending)
 * DELETE: Remove consent record
 */

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const consentStatus = url.searchParams.get('status'); // opted_in, opted_out, pending
    const channel = url.searchParams.get('channel'); // whatsapp, sms, email
    const limit = Math.min(Number(url.searchParams.get('limit') || 50) || 50, 500);
    const skip = Math.max(Number(url.searchParams.get('skip') || 0) || 0, 0);

    await connectDB();

    const filter: any = {};
    if (consentStatus) filter.status = consentStatus;
    if (channel) filter.channel = channel;

    const consents = await UserConsent.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await UserConsent.countDocuments(filter);

    // Calculate stats
    const stats = await UserConsent.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { status: '$status', channel: '$channel' },
          count: { $sum: 1 },
        },
      },
    ]);

    return NextResponse.json(
      { success: true, data: { consents, total, limit, skip, stats } },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch consent records';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { phoneNumber, channel, status, consentMethod, leadId } = body;

    if (!phoneNumber || !channel) {
      return NextResponse.json({ error: 'Missing: phoneNumber, channel' }, { status: 400 });
    }

    if (!['whatsapp', 'sms', 'email'].includes(channel)) {
      return NextResponse.json({ error: 'Invalid channel: must be whatsapp, sms, or email' }, { status: 400 });
    }

    if (status && !['opted_in', 'opted_out', 'pending'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status: must be opted_in, opted_out, or pending' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if consent already exists
    const existing = await UserConsent.findOne({ phoneNumber, channel });

    if (existing) {
      if (leadId) existing.leadId = leadId;
      existing.status = status || existing.status;
      existing.consentStatus = (status || existing.status) === 'opted_in'
        ? 'opted-in'
        : (status || existing.status) === 'opted_out'
          ? 'opted-out'
          : 'pending';
      if (status === 'opted_in') {
        existing.consentDate = new Date();
        existing.consentMethod = consentMethod || existing.consentMethod;
      } else if (status === 'opted_out') {
        existing.optOutDate = new Date();
        existing.optOutKeyword = body.optOutKeyword || existing.optOutKeyword || 'STOP';
      }
      existing.updatedAt = new Date();
      await existing.save();
      return NextResponse.json({ success: true, data: existing }, { status: 200 });
    }

    const consent = await UserConsent.create({
      phoneNumber,
      channel,
      status: status || 'pending',
      consentStatus: status === 'opted_in' ? 'opted-in' : status === 'opted_out' ? 'opted-out' : 'pending',
      leadId: leadId || undefined,
      consentDate: status === 'opted_in' ? new Date() : undefined,
      consentMethod: consentMethod || (status === 'opted_in' ? 'manual' : undefined),
      optOutDate: status === 'opted_out' ? new Date() : undefined,
      optOutKeyword: status === 'opted_out' ? body.optOutKeyword || 'STOP' : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, data: consent }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create consent record';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { consentId, action, status } = body;

    if (!consentId) {
      return NextResponse.json({ error: 'Missing: consentId' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(String(consentId))) {
      return NextResponse.json({ error: 'Invalid consentId' }, { status: 400 });
    }

    await connectDB();

    if (action === 'opt-in') {
      const consent = await UserConsent.findByIdAndUpdate(
        consentId,
        {
          $set: {
            status: 'opted_in',
            consentStatus: 'opted-in',
            consentDate: new Date(),
            consentMethod: body.consentMethod || 'manual',
            updatedAt: new Date(),
          },
          $unset: { optOutDate: 1, optOutKeyword: 1 },
        },
        { new: true }
      );
      if (!consent) {
        return NextResponse.json({ error: 'Consent record not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: consent }, { status: 200 });
    } else if (action === 'opt-out') {
      const consent = await UserConsent.findByIdAndUpdate(
        consentId,
        {
          $set: {
            status: 'opted_out',
            consentStatus: 'opted-out',
            optOutDate: new Date(),
            optOutKeyword: body.optOutKeyword || 'STOP',
            updatedAt: new Date(),
          },
        },
        { new: true }
      );
      if (!consent) {
        return NextResponse.json({ error: 'Consent record not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: consent }, { status: 200 });
    } else {
      // Generic update
      const updateData: any = { updatedAt: new Date() };
      if (status) {
        if (!['opted_in', 'opted_out', 'pending'].includes(status)) {
          return NextResponse.json(
            { error: 'Invalid status: must be opted_in, opted_out, or pending' },
            { status: 400 }
          );
        }
        updateData.status = status;
        updateData.consentStatus = status === 'opted_in' ? 'opted-in' : status === 'opted_out' ? 'opted-out' : 'pending';
      }

      const consent = await UserConsent.findByIdAndUpdate(
        consentId,
        { $set: updateData },
        { new: true }
      );
      if (!consent) {
        return NextResponse.json({ error: 'Consent record not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: consent }, { status: 200 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update consent record';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const consentId = url.searchParams.get('consentId');

    if (!consentId) {
      return NextResponse.json({ error: 'consentId parameter required' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(consentId)) {
      return NextResponse.json({ error: 'Invalid consentId' }, { status: 400 });
    }

    await connectDB();

    const result = await UserConsent.findByIdAndDelete(consentId);

    if (!result) {
      return NextResponse.json({ error: 'Consent record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { deleted: true } }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete consent record';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
