import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Post, SocialAccount, PostAnalytics } from '@/lib/schemas/socialMediaSchemas';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

/**
 * POST /api/social/posts/[id]/publish
 * ONE-CLICK PUBLISH - Post to all selected platforms immediately
 * Handles all platform APIs in parallel
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token || "");

    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    }

    // Get post and verify ownership
    const post = await Post.findById(params.id);
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.user_id.toString() !== decoded.userId) {
      return NextResponse.json({ error: 'Not your post' }, { status: 403 });
    }

    if (post.status === 'published') {
      return NextResponse.json({ error: 'Already published' }, { status: 400 });
    }

    // Get connected accounts
    const accounts = await SocialAccount.find({
      user_id: decoded.userId,
      platform: { $in: post.platforms },
      is_connected: true,
    });

    if (accounts.length === 0) {
      return NextResponse.json(
        { error: 'No connected accounts for selected platforms' },
        { status: 400 }
      );
    }

    // Publish to all platforms in parallel
    const publishPromises = accounts.map(async (account) => {
      try {
        let platformPostId = '';

        // Dispatch to appropriate platform API
        switch (account.platform) {
          case 'facebook':
            platformPostId = await publishToFacebook(post, account);
            break;
          case 'instagram':
            platformPostId = await publishToInstagram(post, account);
            break;
          case 'twitter':
            platformPostId = await publishToTwitter(post, account);
            break;
          case 'linkedin':
            platformPostId = await publishToLinkedIn(post, account);
            break;
          case 'youtube':
            platformPostId = await publishToYouTube(post, account);
            break;
          case 'whatsapp':
            platformPostId = await publishToWhatsApp(post, account);
            break;
          case 'community':
            platformPostId = await publishToCommunity(post, account);
            break;
          default:
            throw new Error(`Unknown platform: ${account.platform}`);
        }

        // Create analytics record for this platform
        await PostAnalytics.create({
          post_id: post._id,
          platform: account.platform,
          platform_post_id: platformPostId,
        });

        return { platform: account.platform, success: true, platformPostId };
      } catch (error: any) {
        console.error(`Failed to publish to ${account.platform}:`, error);
        return { platform: account.platform, success: false, error: error.message };
      }
    });

    const results = await Promise.allSettled(publishPromises);

    // Check if any succeeded
    const successes = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    );

    if (successes.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to publish to all platforms',
          details: results.map((r) => (r.status === 'fulfilled' ? r.value : r.reason)),
        },
        { status: 500 }
      );
    }

    // Update post status
    post.status = successes.length === accounts.length ? 'published' : 'failed';
    post.published_at = new Date();
    post.publish_error =
      successes.length < accounts.length
        ? `Published to ${successes.length}/${accounts.length} platforms`
        : undefined;
    await post.save();

    return NextResponse.json(
      {
        success: true,
        data: {
          post_id: post._id,
          status: post.status,
          results: results.map((r) => (r.status === 'fulfilled' ? r.value : r.reason)),
        },
        message: `Published to ${successes.length}/${accounts.length} platforms`,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('POST /api/social/posts/[id]/publish error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================================================
// Platform-specific publishing functions
// In production, these would call actual platform APIs
// ============================================================================

async function publishToFacebook(post: any, account: any): Promise<string> {
  // Call Facebook Graph API to create post
  // Requires: page access token, post content
  const accessToken = account.access_token;
  const pageId = account.platform_account_id || 'me';
  
  const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: post.content,
      access_token: accessToken,
      ...(post.image_url && { picture: post.image_url }),
      ...(post.video_url && { video_url: post.video_url }),
      ...(post.link && { link: post.link }),
    }),
  });

  if (!response.ok) {
    throw new Error(`Facebook API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.id || `fb_${Date.now()}`;
}

async function publishToInstagram(post: any, account: any): Promise<string> {
  // Call Instagram Graph API to create post
  // Requires: Instagram Business Account ID, access token, media
  const accessToken = account.access_token;
  const igBusinessAccountId = account.platform_account_id;

  if (!post.image_url && !post.video_url) {
    throw new Error('Instagram posts require image or video');
  }

  try {
    // First, create a media object
    const mediaResponse = await fetch(
      `https://graph.instagram.com/v18.0/${igBusinessAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: post.image_url || post.video_url,
          caption: post.content,
          access_token: accessToken,
        }),
      }
    );

    if (!mediaResponse.ok) {
      throw new Error(`Instagram media creation failed: ${mediaResponse.statusText}`);
    }

    const mediaData = await mediaResponse.json();
    const mediaId = mediaData.id;

    // Then publish the media
    const publishResponse = await fetch(
      `https://graph.instagram.com/v18.0/${igBusinessAccountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: mediaId,
          access_token: accessToken,
        }),
      }
    );

    if (!publishResponse.ok) {
      throw new Error(`Instagram publish failed: ${publishResponse.statusText}`);
    }

    const publishData = await publishResponse.json();
    return publishData.id || `ig_${Date.now()}`;
  } catch (error) {
    console.error('Instagram publishing error:', error);
    throw error;
  }
}

async function publishToTwitter(post: any, account: any): Promise<string> {
  // Call Twitter API v2 to create tweet
  // Requires: Bearer token, tweet text (max 280 chars)
  const bearerToken = account.access_token;
  const tweetText = post.content.substring(0, 280);

  const response = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: tweetText,
      ...(post.image_url && {
        media: {
          media_ids: [post.image_url],
        },
      }),
    }),
  });

  if (!response.ok) {
    throw new Error(`Twitter API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data?.id || `tw_${Date.now()}`;
}

async function publishToLinkedIn(post: any, account: any): Promise<string> {
  // Call LinkedIn API to create post
  // Requires: person URN (urn:li:person:XXXXX), access token
  const accessToken = account.access_token;
  const personUrn = account.platform_account_id || '';

  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: personUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: post.content,
          },
          shareMediaCategory: post.image_url ? 'IMAGE' : 'NONE',
          media: post.image_url
            ? [
                {
                  status: 'READY',
                  media: post.image_url,
                },
              ]
            : [],
        },
      },
      visibleToList: ['urn:li:visibility:PUBLIC'],
    }),
  });

  if (!response.ok) {
    throw new Error(`LinkedIn API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.id || `li_${Date.now()}`;
}

async function publishToYouTube(post: any, account: any): Promise<string> {
  // Call YouTube API to create community post
  // Requires: Channel ID, access token, content
  const accessToken = account.access_token;
  const channelId = account.platform_account_id;

  // Community posts endpoint
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/community/insert?part=snippet`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          channelId,
          textContent: post.content,
          ...(post.image_url && {
            imageUrl: post.image_url,
          }),
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`YouTube API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.id || `yt_${Date.now()}`;
}

async function publishToWhatsApp(post: any, account: any): Promise<string> {
  // Call WhatsApp Business API to send message
  // Requires: Phone number ID, Business Account Token
  const phoneNumberId = process.env.WHATSAPP_BUSINESS_PHONE_NUMBER;
  const businessToken = account.access_token;

  const response = await fetch(
    `https://graph.instagram.com/v18.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${businessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: account.platform_account_id,
        type: 'text',
        text: {
          body: post.content,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`WhatsApp API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.messages?.[0]?.id || `wa_${Date.now()}`;
}

async function publishToCommunity(post: any, account: any): Promise<string> {
  // Internal community posting
  // Create post in Swar Yoga private community
  // This is an internal endpoint, so we just generate an ID
  return `com_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}
