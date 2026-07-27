/**
 * Vercel Cron Job: Social Inbox Sync (Messenger + Instagram)
 * Schedule: every 5 minutes
 *
 * Meta's webhook push for Messenger/Instagram has proven unreliable for real
 * (non-tester) accounts even with a fully correct subscription + Live mode +
 * permissions setup — confirmed by direct testing where our own webhook code
 * works perfectly when fed a payload directly, yet zero real events ever
 * arrived. This job polls the Graph API Conversations endpoint directly
 * (proven to work) for every connected account, so new conversations/messages
 * get pulled in regardless of whether the webhook ever fires.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAllConnectedSocialInboxAccounts, importFacebookConversationHistory } from '@/lib/socialInbox';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const accounts = await getAllConnectedSocialInboxAccounts();

    const results: Array<{ platform: string; accountName: string; scope: string; conversations: number; messages: number; error?: string }> = [];

    for (const account of accounts) {
      try {
        const history = await importFacebookConversationHistory(account, { maxConversations: 20, messagesPerConv: 10 });
        results.push({
          platform: account.platform,
          accountName: account.accountName,
          scope: `${account.scope.scopeType}/${account.scope.scopeKey}`,
          conversations: history.conversations,
          messages: history.messages,
        });
      } catch (err) {
        results.push({
          platform: account.platform,
          accountName: account.accountName,
          scope: `${account.scope.scopeType}/${account.scope.scopeKey}`,
          conversations: 0,
          messages: 0,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({ success: true, accountsChecked: accounts.length, results });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Social inbox sync failed' },
      { status: 500 },
    );
  }
}
