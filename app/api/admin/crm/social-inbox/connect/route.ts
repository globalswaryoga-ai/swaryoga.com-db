import { NextRequest, NextResponse } from 'next/server';
import { connectDB, SocialMediaAccount } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { encryptCredential } from '@/lib/encryption';
import { resolveSocialMediaScope } from '@/lib/socialMediaScope';
import { getSocialInboxConversation } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

const FACEBOOK_GRAPH_API = 'https://graph.facebook.com/v24.0';
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || '';
const FACEBOOK_PAGE_ID = process.env.META_FACEBOOK_PAGE_ID || '';
const INSTAGRAM_ACCOUNT_ID = process.env.META_INSTAGRAM_ACCOUNT_ID || '';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { platform } = await request.json();
    if (!platform || !['facebook', 'instagram'].includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    if (!PAGE_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'Page access token not configured. Add META_PAGE_ACCESS_TOKEN to environment.' },
        { status: 400 }
      );
    }

    await connectDB();
    const scope = await resolveSocialMediaScope(decoded);

    let accountId: string;
    let accountName: string;
    let accountHandle: string;

    if (platform === 'facebook') {
      if (!FACEBOOK_PAGE_ID) {
        return NextResponse.json(
          { error: 'Facebook Page ID not configured. Add META_FACEBOOK_PAGE_ID to environment.' },
          { status: 400 }
        );
      }
      accountId = FACEBOOK_PAGE_ID;

      // Get page name from Graph API
      const pageRes = await fetch(`${FACEBOOK_GRAPH_API}/${FACEBOOK_PAGE_ID}?access_token=${PAGE_ACCESS_TOKEN}`);
      const pageData = await pageRes.json();
      accountName = pageData.name || 'Facebook Page';
      accountHandle = pageData.handle || '';
    } else {
      if (!INSTAGRAM_ACCOUNT_ID) {
        return NextResponse.json(
          { error: 'Instagram Account ID not configured. Add META_INSTAGRAM_ACCOUNT_ID to environment.' },
          { status: 400 }
        );
      }
      accountId = INSTAGRAM_ACCOUNT_ID;

      // Get Instagram account info from Graph API
      const igRes = await fetch(`${FACEBOOK_GRAPH_API}/${INSTAGRAM_ACCOUNT_ID}?fields=username,name&access_token=${PAGE_ACCESS_TOKEN}`);
      const igData = await igRes.json();
      accountName = igData.name || 'Instagram Account';
      accountHandle = igData.username || '';
    }

    const encryptedToken = encryptCredential(PAGE_ACCESS_TOKEN);

    // Find or create account
    const existingAccount = await SocialMediaAccount.findOne({
      platform,
    });

    if (existingAccount) {
      // Update existing
      await SocialMediaAccount.findByIdAndUpdate(existingAccount._id, {
        $set: {
          accountId,
          accountName,
          accountHandle,
          accessToken: encryptedToken,
          isConnected: true,
          accountScopeType: scope.scopeType,
          accountScopeKey: scope.scopeKey,
          connectedAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new
      await SocialMediaAccount.create({
        platform,
        accountId,
        accountName,
        accountHandle,
        accessToken: encryptedToken,
        isConnected: true,
        accountScopeType: scope.scopeType,
        accountScopeKey: scope.scopeKey,
        connectedAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Fetch historical conversations from Graph API
    try {
      const Conversation = getSocialInboxConversation();
      const conversationsUrl = platform === 'facebook'
        ? `${FACEBOOK_GRAPH_API}/${FACEBOOK_PAGE_ID}/conversations?access_token=${PAGE_ACCESS_TOKEN}&fields=id,senders,last_message,updated_time,messages.limit(1).fields(message,created_time,from),participants&limit=100`
        : `${FACEBOOK_GRAPH_API}/${INSTAGRAM_ACCOUNT_ID}/conversations?access_token=${PAGE_ACCESS_TOKEN}&fields=id,participants,last_message,updated_time&limit=100`;

      const convRes = await fetch(conversationsUrl);
      const convData = await convRes.json();

      if (convData.data && Array.isArray(convData.data)) {
        const now = new Date();
        for (const conv of convData.data) {
          if (!conv.participants || !Array.isArray(conv.participants.data) || conv.participants.data.length === 0) {
            continue;
          }

          const participant = conv.participants.data[0];
          const participantId = participant.id || participant.email || '';
          const participantName = participant.name || 'User';

          // Create conversation record if not exists
          const conversationKey = `${platform}#${accountId}#${participantId}`;
          await Conversation.updateOne(
            {
              conversationKey,
              accountScopeType: scope.scopeType,
              accountScopeKey: scope.scopeKey,
            },
            {
              $setOnInsert: {
                conversationKey,
                platform,
                accountId,
                accountName,
                accountHandle: accountHandle || '',
                accountScopeType: scope.scopeType,
                accountScopeKey: scope.scopeKey,
                participantId,
                participantName,
                participantUsername: '',
                participantProfilePic: '',
                status: 'new_lead',
                labels: [],
                notes: '',
                unreadCount: 0,
                isBlocked: false,
                createdByUserId: decoded.userId || 'admincrm',
                assignedToUserId: decoded.userId || 'admincrm',
                lastMessage: conv.last_message || '[Historical conversation]',
                lastMessageAt: conv.updated_time ? new Date(conv.updated_time) : now,
                lastMessageDirection: 'inbound',
                createdAt: now,
                updatedAt: now,
              },
            },
            { upsert: true }
          );
        }
        console.log(`[social-inbox] Created ${convData.data.length} historical ${platform} conversations`);
      }
    } catch (convErr) {
      console.warn(`[social-inbox] Could not fetch historical conversations for ${platform}:`, convErr);
      // Don't fail the connection if historical fetch fails
    }

    return NextResponse.json({
      success: true,
      message: `${platform} account connected successfully`,
      platform,
      accountName,
    });
  } catch (error) {
    console.error('[social-inbox connect]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Connection failed' },
      { status: 500 }
    );
  }
}
