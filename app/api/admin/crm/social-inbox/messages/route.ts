import { NextRequest } from 'next/server';


import { apiError, apiSuccess, logError } from '@/lib/api-error';
import { verifyToken } from '@/lib/auth';
import {
  buildSocialInboxScopeFilter,
  createOutboundSocialMessage,
  markSocialConversationRead,
  normalizeSocialInboxPlatform,
  resolveSocialInboxAccount,
} from '@/lib/socialInbox';

export const dynamic = 'force-dynamic';
import { resolveSocialMediaScope } from '@/lib/socialMediaScope';
import { listBunnySocialMessages, listBunnySocialConversations } from '@/lib/bunnySocialInboxRepository';


export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return apiError('UNAUTHORIZED');
    }

    const url = new URL(request.url);
    const platform = normalizeSocialInboxPlatform(url.searchParams.get('platform'));
    const conversationId = String(url.searchParams.get('conversationId') || '').trim();
    if (!platform) {
      return apiError('VALIDATION_ERROR', 'platform must be messenger or instagram');
    }
    if (!conversationId) {
      return apiError('VALIDATION_ERROR', 'conversationId is required');
    }

    const scope = await resolveSocialMediaScope(decoded);
    const conversations = await listBunnySocialConversations({ platform, scopeType: scope.scopeType, scopeKey: scope.scopeKey, limit: 1000 });
    const conversation = conversations.find((c) => String(c._id) === conversationId);

    if (!conversation) {
      return apiError('NOT_FOUND', 'Conversation not found');
    }

    let messages = await listBunnySocialMessages(conversationId, 500);
    // listBunnySocialMessages returns them reversed for us, but let's ensure sentAt ascending
    messages = messages.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

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
    if (!decoded?.isAdmin && !decoded?.userId) {
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
    if (!conversationId) {
      return apiError('VALIDATION_ERROR', 'conversationId is required');
    }
    if (!messageContent) {
      return apiError('VALIDATION_ERROR', 'messageContent is required');
    }

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
