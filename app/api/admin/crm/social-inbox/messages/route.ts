import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { apiError, apiSuccess, logError } from '@/lib/api-error';
import { verifyToken } from '@/lib/auth';
import {

export const dynamic = 'force-dynamic';
  buildSocialInboxScopeFilter,
  createOutboundSocialMessage,
  markSocialConversationRead,
  normalizeSocialInboxPlatform,
  resolveSocialInboxAccount,
} from '@/lib/socialInbox';
import { resolveSocialMediaScope } from '@/lib/socialMediaScope';
import { getSocialInboxConversation, getSocialInboxMessage } from '@/lib/schemas/enterpriseSchemas';


export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return apiError('UNAUTHORIZED');
    }

    const url = new URL(request.url);
    const platform = normalizeSocialInboxPlatform(url.searchParams.get('platform'));
    const conversationId = String(url.searchParams.get('conversationId') || '').trim();
    if (!platform) {
      return apiError('VALIDATION_ERROR', 'platform must be messenger or instagram');
    }
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return apiError('VALIDATION_ERROR', 'conversationId is required');
    }

    await connectDB();
    const scope = await resolveSocialMediaScope(decoded);
    const Conversation = getSocialInboxConversation();
    const Message = getSocialInboxMessage();

    const conversation = await Conversation.findOne({
      _id: conversationId,
      ...buildSocialInboxScopeFilter(scope, platform),
    }).lean();

    if (!conversation) {
      return apiError('NOT_FOUND', 'Conversation not found');
    }

    const messages = await Message.find({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      ...buildSocialInboxScopeFilter(scope, platform),
    })
      .sort({ sentAt: 1, createdAt: 1 })
      .limit(500)
      .lean();

    await markSocialConversationRead(scope, platform, conversationId);

    return apiSuccess({ conversation, messages });
  } catch (error) {
    logError('social-inbox messages GET', error);
    return apiError('SERVER_ERROR', 'Failed to fetch social inbox messages');
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return apiError('UNAUTHORIZED');
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return apiError('BAD_REQUEST', 'Invalid JSON body');
    }

    const platform = normalizeSocialInboxPlatform(body.platform);
    const conversationId = String(body.conversationId || '').trim();
    const messageContent = String(body.messageContent || '').trim();

    if (!platform) {
      return apiError('VALIDATION_ERROR', 'platform must be messenger or instagram');
    }
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return apiError('VALIDATION_ERROR', 'conversationId is required');
    }
    if (!messageContent) {
      return apiError('VALIDATION_ERROR', 'messageContent is required');
    }

    await connectDB();
    const scope = await resolveSocialMediaScope(decoded);
    const account = await resolveSocialInboxAccount(decoded, platform);
    if (!account) {
      return apiError('NOT_FOUND', 'No connected social account found for this scope/platform');
    }

    const createdMessage = await createOutboundSocialMessage({
      scope,
      platform,
      account,
      conversationId,
      message: messageContent,
    });

    return apiSuccess(createdMessage, 201);
  } catch (error) {
    logError('social-inbox messages POST', error);
    return apiError('SERVER_ERROR', error instanceof Error ? error.message : 'Failed to send social inbox message');
  }
}
