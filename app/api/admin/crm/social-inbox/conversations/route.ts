import { NextRequest } from 'next/server';
import { apiError, apiSuccess, logError } from '@/lib/api-error';
import { verifyToken } from '@/lib/auth';
import { buildSocialInboxScopeFilter, normalizeSocialInboxPlatform, resolveSocialInboxAccount } from '@/lib/socialInbox';
import { resolveSocialMediaScope } from '@/lib/socialMediaScope';
import { listBunnySocialConversations } from '@/lib/bunnySocialInboxRepository';

export const dynamic = 'force-dynamic';


function escapeRegexLiteral(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return apiError('UNAUTHORIZED');
    }

    const url = new URL(request.url);
    const platform = normalizeSocialInboxPlatform(url.searchParams.get('platform'));
    if (!platform) {
      return apiError('VALIDATION_ERROR', 'platform must be messenger or instagram');
    }

    const q = (url.searchParams.get('q') || '').trim();
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 200), 1), 500);

    const scope = await resolveSocialMediaScope(decoded);

    // Resolve account for response metadata — failures here must NOT crash the route
    // (e.g. decryption mismatch after key rotation). Conversations are still queryable.
    let resolvedAccount: any = null;
    try {
      resolvedAccount = await resolveSocialInboxAccount(decoded, platform);
    } catch (accountErr) {
      console.warn('[social-inbox] resolveSocialInboxAccount failed — returning conversations without account metadata:', accountErr);
    }

    const conversations = await listBunnySocialConversations({
      platform,
      scopeType: scope.scopeType,
      scopeKey: scope.scopeKey,
      search: q,
      limit,
    });

    return apiSuccess({
      conversations,
      total: conversations.length,
      scope: {
        type: scope.scopeType,
        key: scope.scopeKey,
        label: scope.scopeLabel,
      },
      account: resolvedAccount
        ? {
            id: resolvedAccount.accountId,
            name: resolvedAccount.accountName,
            handle: resolvedAccount.accountHandle,
          }
        : null,
    });
  } catch (error) {
    logError('social-inbox conversations GET', error);
    return apiError('SERVER_ERROR', 'Failed to fetch social inbox conversations');
  }
}
