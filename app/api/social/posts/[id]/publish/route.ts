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
  // TODO: Call Facebook Graph API
  // POST /me/feed with post.content, media, etc.
  return `fb_${Date.now()}_${Math.random()}`;
}

async function publishToInstagram(post: any, account: any): Promise<string> {
  // TODO: Call Instagram Graph API
  // Requires carousel/single image first
  return `ig_${Date.now()}_${Math.random()}`;
}

async function publishToTwitter(post: any, account: any): Promise<string> {
  // TODO: Call Twitter API v2
  // Create tweet with truncated content (max 280 chars)
  return `tw_${Date.now()}_${Math.random()}`;
}

async function publishToLinkedIn(post: any, account: any): Promise<string> {
  // TODO: Call LinkedIn API
  // POST share with professional tone
  return `li_${Date.now()}_${Math.random()}`;
}

async function publishToYouTube(post: any, account: any): Promise<string> {
  // TODO: Call YouTube API
  // Upload to community tab or as community post
  return `yt_${Date.now()}_${Math.random()}`;
}

async function publishToWhatsApp(post: any, account: any): Promise<string> {
  // TODO: Call WhatsApp Business API
  // Send to broadcast list or community
  return `wa_${Date.now()}_${Math.random()}`;
}

async function publishToCommunity(post: any, account: any): Promise<string> {
  // TODO: Internal community posting
  // Create post in private community
  return `com_${Date.now()}_${Math.random()}`;
}
