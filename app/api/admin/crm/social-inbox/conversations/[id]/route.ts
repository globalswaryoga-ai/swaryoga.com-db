import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { apiError, apiSuccess, logError } from '@/lib/api-error';
import { verifyToken } from '@/lib/auth';
import { buildSocialInboxScopeFilter, normalizeSocialInboxPlatform } from '@/lib/socialInbox';
import { resolveSocialMediaScope } from '@/lib/socialMediaScope';
import { getSocialInboxConversation } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return apiError('UNAUTHORIZED');
    }

    const platform = normalizeSocialInboxPlatform(new URL(request.url).searchParams.get('platform'));
    if (!platform) {
      return apiError('VALIDATION_ERROR', 'platform must be messenger or instagram');
    }

    const id = params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiError('VALIDATION_ERROR', 'Invalid conversation id');
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return apiError('BAD_REQUEST', 'Invalid JSON body');
    }

    await connectDB();
    const scope = await resolveSocialMediaScope(decoded);
    const Conversation = getSocialInboxConversation();

    const update: Record<string, any> = {};
    if (typeof body.status === 'string' && body.status.trim()) update.status = body.status.trim();
    if (typeof body.notes === 'string') update.notes = body.notes;
    if (Array.isArray(body.labels)) update.labels = body.labels.map((item: any) => String(item || '').trim()).filter(Boolean);
    if (typeof body.assignedToUserId === 'string') update.assignedToUserId = body.assignedToUserId.trim();
    if (typeof body.isBlocked === 'boolean') update.isBlocked = body.isBlocked;
    update.updatedAt = new Date();

    const conversation = await Conversation.findOneAndUpdate(
      {
        _id: id,
        ...buildSocialInboxScopeFilter(scope, platform),
      },
      { $set: update },
      { new: true }
    ).lean();

    if (!conversation) {
      return apiError('NOT_FOUND', 'Conversation not found');
    }

    return apiSuccess(conversation);
  } catch (error) {
    logError('social-inbox conversation PUT', error);
    return apiError('SERVER_ERROR', 'Failed to update social conversation');
  }
}
