import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import {
  verifyAdminAccess,
  parsePagination,
  handleCrmError,
  formatCrmSuccess,
  buildMetadata,
  isValidObjectId,
} from '@/lib/crm-handlers';
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
    verifyAdminAccess(request);
    const url = new URL(request.url);
    const consentStatus = url.searchParams.get('status');
    const channel = url.searchParams.get('channel');
    const { limit, skip } = parsePagination(request);

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

    const stats = await UserConsent.aggregate([
      { $match: filter },
      { $group: { _id: { status: '$status', channel: '$channel' }, count: { $sum: 1 } } },
    ]);

    const meta = buildMetadata(skip, limit, total);
    return formatCrmSuccess({ consents, stats }, meta);
  } catch (error) {
    return handleCrmError(error, 'GET consent');
  }
}

export async function POST(request: NextRequest) {
  try {
    verifyAdminAccess(request);
    const body = await request.json().catch(() => null);
    if (!body) throw new Error('Invalid JSON body');

    const { phoneNumber, channel, status, consentMethod, leadId } = body;
    if (!phoneNumber || !channel) throw new Error('Missing: phoneNumber, channel');
    if (!['whatsapp', 'sms', 'email'].includes(channel)) throw new Error('Invalid channel');

    await connectDB();

    const existing = await UserConsent.findOne({ phoneNumber, channel });
    if (existing) {
      existing.status = status || existing.status;
      existing.consentStatus = status === 'opted_in' ? 'opted-in' : status === 'opted_out' ? 'opted-out' : 'pending';
      if (status === 'opted_in') {
        existing.consentDate = new Date();
        existing.consentMethod = consentMethod || existing.consentMethod;
      } else if (status === 'opted_out') {
        existing.optOutDate = new Date();
        existing.optOutKeyword = body.optOutKeyword || 'STOP';
      }
      existing.updatedAt = new Date();
      await existing.save();
      return formatCrmSuccess({ consent: existing }, {});
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

    return formatCrmSuccess({ consent }, {});
  } catch (error) {
    return handleCrmError(error, 'POST consent');
  }
}

export async function PUT(request: NextRequest) {
  try {
    verifyAdminAccess(request);
    const body = await request.json().catch(() => null);
    if (!body) throw new Error('Invalid JSON body');

    const { consentId, action, status } = body;
    if (!consentId) throw new Error('Missing: consentId');
    if (!isValidObjectId(consentId)) throw new Error('Invalid consentId');

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
      if (!consent) throw new Error('Consent record not found');
      return formatCrmSuccess({ consent }, {});
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
      if (!consent) throw new Error('Consent record not found');
      return formatCrmSuccess({ consent }, {});
    } else {
      const updateData: any = { updatedAt: new Date() };
      if (status) {
        updateData.status = status;
        updateData.consentStatus = status === 'opted_in' ? 'opted-in' : status === 'opted_out' ? 'opted-out' : 'pending';
      }
      const consent = await UserConsent.findByIdAndUpdate(consentId, { $set: updateData }, { new: true });
      if (!consent) throw new Error('Consent record not found');
      return formatCrmSuccess({ consent }, {});
    }
  } catch (error) {
    return handleCrmError(error, 'PUT consent');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    verifyAdminAccess(request);
    const url = new URL(request.url);
    const consentId = url.searchParams.get('consentId');
    if (!consentId) throw new Error('consentId parameter required');
    if (!isValidObjectId(consentId)) throw new Error('Invalid consentId');

    await connectDB();
    const result = await UserConsent.findByIdAndDelete(consentId);
    if (!result) throw new Error('Consent record not found');
    return formatCrmSuccess({ deleted: true }, {});
  } catch (error) {
    return handleCrmError(error, 'DELETE consent');
  }
}
