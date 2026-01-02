import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB, SocialMediaAccount, SocialMediaPost } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { decryptCredential } from '@/lib/encryption';
import { upsertMediaPostFromSocialPost } from '@/lib/socialToMediaPost';

type PublishResult = {
  platform: string;
  ok: boolean;
  platformPostId?: string;
  error?: string;
};

function createFriendlyPublishErrorMessage(error: string, platform: string): string {
  // Common error patterns with friendly explanations
  if (error.includes('token') || error.includes('unauthorized') || error.includes('401')) {
    return `❌ ${platform.toUpperCase()}: Token expired or invalid. Please reconnect this account in Admin → Social Media Setup.`;
  }
  if (error.includes('permission') || error.includes('scope')) {
    return `❌ ${platform.toUpperCase()}: Missing permissions. Reconnect the account with proper scopes.`;
  }
  if (error.includes('rate limit') || error.includes('429')) {
    return `❌ ${platform.toUpperCase()}: Rate limit exceeded. Wait a few minutes and retry.`;
  }
  if (error.includes('image') || error.includes('media') || error.includes('photo')) {
    return `❌ ${platform.toUpperCase()}: Image/media upload failed. Ensure images are valid URLs and accessible. Max file size varies by platform (typically 100MB).`;
  }
  if (error.includes('text') || error.includes('caption') || error.includes('message')) {
    return `❌ ${platform.toUpperCase()}: Text/caption issue. ${error}. Keep messages concise and remove special characters if needed.`;
  }
  if (error.includes('account') || error.includes('page') || error.includes('company')) {
    return `❌ ${platform.toUpperCase()}: Account/Page ID invalid or inaccessible. Verify the account is connected and active.`;
  }
  if (error.includes('video') || error.includes('youtube')) {
    return `❌ YOUTUBE: Video upload not yet supported through this interface. Please upload videos directly to YouTube.`;
  }
  
  // Truncate long errors
  const shortError = error.length > 80 ? error.substring(0, 80) + '...' : error;
  return `❌ ${platform.toUpperCase()}: ${shortError}`;
}

async function graphPost(path: string, params: Record<string, string>): Promise<any> {
  const url = `https://graph.facebook.com/v20.0/${path}`;
  const body = new URLSearchParams(params);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || data?.error?.error_user_msg || data?.error || 'Graph API error';
    throw new Error(message);
  }
  return data;
}

async function publishFacebookPagePost(args: {
  pageId: string;
  accessToken: string;
  message: string;
  imageUrls: string[];
  videoUrls: string[];
}): Promise<string> {
  const { pageId, accessToken, message, imageUrls, videoUrls } = args;

  if (imageUrls.length > 0 && videoUrls.length > 0) {
    throw new Error('Facebook publishing currently supports either images or videos (not both in one post).');
  }

  if (videoUrls.length > 0) {
    if (videoUrls.length > 1) {
      throw new Error('Facebook publishing currently supports only 1 video URL per post.');
    }

    const data = await graphPost(`${encodeURIComponent(pageId)}/videos`, {
      access_token: accessToken,
      file_url: videoUrls[0],
      description: message,
    });

    const id = String(data?.id || '').trim();
    if (!id) throw new Error('Facebook video publish succeeded but returned no id');
    return id;
  }

  if (imageUrls.length > 0) {
    // Upload each photo as unpublished, then attach them in a feed post.
    const mediaFbIds: string[] = [];
    for (const url of imageUrls) {
      const photo = await graphPost(`${encodeURIComponent(pageId)}/photos`, {
        access_token: accessToken,
        url,
        published: 'false',
      });
      const fbid = String(photo?.id || '').trim();
      if (!fbid) throw new Error('Facebook photo upload returned no id');
      mediaFbIds.push(fbid);
    }

    const feedParams: Record<string, string> = {
      access_token: accessToken,
      message,
    };

    mediaFbIds.forEach((fbid, idx) => {
      feedParams[`attached_media[${idx}]`] = JSON.stringify({ media_fbid: fbid });
    });

    const post = await graphPost(`${encodeURIComponent(pageId)}/feed`, feedParams);
    const postId = String(post?.id || '').trim();
    if (!postId) throw new Error('Facebook feed publish succeeded but returned no id');
    return postId;
  }

  // Text-only feed post.
  const post = await graphPost(`${encodeURIComponent(pageId)}/feed`, {
    access_token: accessToken,
    message,
  });

  const postId = String(post?.id || '').trim();
  if (!postId) throw new Error('Facebook publish succeeded but returned no id');
  return postId;
}

async function publishInstagramPost(args: {
  igUserId: string;
  accessToken: string;
  caption: string;
  imageUrls: string[];
}): Promise<string> {
  const { igUserId, accessToken, caption, imageUrls } = args;

  // Instagram Graph API does not support text-only feed posts.
  if (imageUrls.length === 0) {
    throw new Error('Instagram publishing requires at least 1 image URL (text-only is not supported).');
  }
  if (imageUrls.length > 1) {
    throw new Error('Instagram publishing currently supports only 1 image per post (carousel support not added yet).');
  }

  const createContainer = await graphPost(`${encodeURIComponent(igUserId)}/media`, {
    access_token: accessToken,
    image_url: imageUrls[0],
    caption,
  });

  const creationId = String(createContainer?.id || '').trim();
  if (!creationId) throw new Error('Instagram media creation returned no id');

  const publish = await graphPost(`${encodeURIComponent(igUserId)}/media_publish`, {
    access_token: accessToken,
    creation_id: creationId,
  });

  const igPostId = String(publish?.id || '').trim();
  if (!igPostId) throw new Error('Instagram publish returned no id');
  return igPostId;
}

async function publishXPost(args: {
  bearerToken: string;
  text: string;
  imageUrls: string[];
}): Promise<string> {
  const { bearerToken, text, imageUrls } = args;

  // Check token format
  if (!bearerToken.startsWith('AAAA')) {
    throw new Error('Invalid X/Twitter Bearer token. Must start with "AAAA".');
  }

  // X/Twitter API v2 text length limit
  if (text.length > 280) {
    throw new Error(`X/Twitter post exceeds 280 characters (${text.length} chars). Please shorten the text.`);
  }

  let mediaData: any = undefined;

  // If there are images, upload them first and get media IDs
  if (imageUrls.length > 0) {
    const mediaIds: string[] = [];

    for (const imageUrl of imageUrls) {
      try {
        // Fetch image as buffer
        const imgRes = await fetch(imageUrl, { cache: 'no-store' });
        if (!imgRes.ok) {
          throw new Error(`Failed to fetch image: ${imgRes.statusText}`);
        }

        const imageBuffer = await imgRes.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString('base64');

        // Upload media using v1.1 endpoint (v2 media upload is limited)
        const mediaRes = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
          body: new URLSearchParams({
            media_data: base64Image,
          }),
          cache: 'no-store',
        });

        const mediaJson = await mediaRes.json().catch(() => ({}));
        if (!mediaRes.ok) {
          const err = mediaJson?.errors?.[0]?.message || mediaJson?.error || 'Media upload failed';
          throw new Error(err);
        }

        const mediaId = String(mediaJson?.media_id_string || '').trim();
        if (!mediaId) throw new Error('X/Twitter media upload returned no media_id');
        mediaIds.push(mediaId);
      } catch (e) {
        throw new Error(`Failed to upload image to X/Twitter: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    mediaData = { media: { media_ids: mediaIds } };
  }

  // Post tweet using v2 API
  const postBody: any = { text };
  if (mediaData?.media?.media_ids?.length > 0) {
    postBody.media = mediaData.media;
  }

  const postRes = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(postBody),
    cache: 'no-store',
  });

  const postJson = await postRes.json().catch(() => ({}));
  if (!postRes.ok) {
    const err =
      postJson?.errors?.[0]?.message ||
      postJson?.detail ||
      postJson?.error ||
      'Post failed';
    throw new Error(err);
  }

  const tweetId = String(postJson?.data?.id || '').trim();
  if (!tweetId) throw new Error('X/Twitter post succeeded but returned no tweet ID');
  return tweetId;
}

async function publishLinkedInPost(args: {
  accessToken: string;
  companyId: string;
  text: string;
  imageUrls: string[];
}): Promise<string> {
  const { accessToken, companyId, text, imageUrls } = args;

  if (!companyId || !/^\d+$/.test(companyId)) {
    throw new Error('Invalid LinkedIn Company ID (must be numeric).');
  }

  const liHeaders = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'LinkedIn-Version': '202312',
  };

  let mediaAssets: any[] = [];

  // Upload images if present
  if (imageUrls.length > 0) {
    for (const imageUrl of imageUrls) {
      try {
        // Register upload and get signed URL
        const registerRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
          method: 'POST',
          headers: liHeaders,
          body: JSON.stringify({
            registerUploadRequest: {
              recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
              owner: `urn:li:organization:${companyId}`,
              serviceRelationships: [{ relationshipType: 'OWNER', identifier: `urn:li:organization:${companyId}` }],
            },
          }),
          cache: 'no-store',
        });

        const registerJson = await registerRes.json().catch(() => ({}));
        if (!registerRes.ok) {
          throw new Error(registerJson?.message || 'LinkedIn asset registration failed');
        }

        const uploadUrl = registerJson?.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
        const assetUrn = registerJson?.value?.asset;

        if (!uploadUrl || !assetUrn) {
          throw new Error('LinkedIn registration returned no upload URL or asset URN');
        }

        // Fetch and upload image
        const imgRes = await fetch(imageUrl, { cache: 'no-store' });
        if (!imgRes.ok) throw new Error(`Failed to fetch image: ${imgRes.statusText}`);

        const imageBuffer = await imgRes.arrayBuffer();

        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': imgRes.headers.get('content-type') || 'image/jpeg',
          },
          body: imageBuffer,
          cache: 'no-store',
        });

        if (!uploadRes.ok) {
          throw new Error(`LinkedIn image upload failed: ${uploadRes.statusText}`);
        }

        mediaAssets.push({
          status: 'READY',
          media: assetUrn,
        });
      } catch (e) {
        throw new Error(`Failed to upload image to LinkedIn: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  // Create post
  const postPayload: any = {
    author: `urn:li:organization:${companyId}`,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.share': {
        shareCommentary: {
          text,
        },
        shareMediaCategory: mediaAssets.length > 0 ? 'IMAGE' : 'NONE',
      },
    },
    visibility: {
      'com.linkedin.ugc.share': {
        visibilityType: 'PUBLIC',
      },
    },
  };

  if (mediaAssets.length > 0) {
    postPayload.specificContent['com.linkedin.ugc.share'].media = mediaAssets;
  }

  const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: liHeaders,
    body: JSON.stringify(postPayload),
    cache: 'no-store',
  });

  const postJson = await postRes.json().catch(() => ({}));
  if (!postRes.ok) {
    const err = postJson?.message || postJson?.error?.message || 'LinkedIn post failed';
    throw new Error(err);
  }

  const linkedInPostId = String(postJson?.id || '').trim();
  if (!linkedInPostId) throw new Error('LinkedIn post succeeded but returned no post ID');
  return linkedInPostId;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const postId = params?.id;
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return NextResponse.json({ error: 'Invalid post id' }, { status: 400 });
    }

    await connectDB();

    const postDoc = (await SocialMediaPost.findById(postId).lean()) as any | null;
    if (!postDoc) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const platforms: string[] = Array.isArray(postDoc.platforms) ? postDoc.platforms.map(String) : [];
    if (platforms.length === 0) {
      return NextResponse.json({ error: 'Post has no platforms selected' }, { status: 400 });
    }

    const accountObjectIds = Array.isArray(postDoc.accountIds) ? postDoc.accountIds : [];
    const accounts = await SocialMediaAccount.find({
      _id: { $in: accountObjectIds },
      isConnected: true,
      platform: { $in: platforms },
    }).lean();

    const results: PublishResult[] = [];
    const now = new Date();

    // Keep track of per-platform IDs we successfully published.
    const platformPostIds: Record<string, string> = {};

    for (const platform of platforms) {
      const acc = accounts.find((a) => String(a.platform) === platform);
      if (!acc) {
        results.push({ platform, ok: false, error: 'No connected account found for this platform' });
        continue;
      }

      const accountId = String(acc.accountId || '').trim();
      if (!accountId) {
        results.push({ platform, ok: false, error: 'Missing Account/Page ID for this platform' });
        continue;
      }

      let accessToken = '';
      try {
        accessToken = decryptCredential(String(acc.accessToken || ''));
      } catch {
        results.push({
          platform,
          ok: false,
          error: 'Token could not be decrypted. Ensure ENCRYPTION_KEY is set and unchanged.',
        });
        continue;
      }

      try {
        const text = String(postDoc?.content?.text || '').trim();
        const imageUrls = Array.isArray(postDoc?.content?.images)
          ? postDoc.content.images.map((i: any) => String(i?.url || '').trim()).filter(Boolean)
          : [];
        const videoUrls = Array.isArray(postDoc?.content?.videos)
          ? postDoc.content.videos.map((v: any) => String(v?.url || '').trim()).filter(Boolean)
          : [];

        if (platform === 'facebook') {
          const fbId = await publishFacebookPagePost({
            pageId: accountId,
            accessToken,
            message: text,
            imageUrls,
            videoUrls,
          });
          platformPostIds.facebook = fbId;
          results.push({ platform, ok: true, platformPostId: fbId });
          continue;
        }

        if (platform === 'instagram') {
          // Instagram requires media. For now we only support 1 image.
          const igId = await publishInstagramPost({
            igUserId: accountId,
            accessToken,
            caption: text,
            imageUrls,
          });
          platformPostIds.instagram = igId;
          results.push({ platform, ok: true, platformPostId: igId });
          continue;
        }

        if (platform === 'x') {
          const xId = await publishXPost({
            bearerToken: accessToken,
            text,
            imageUrls,
          });
          platformPostIds.x = xId;
          results.push({ platform, ok: true, platformPostId: xId });
          continue;
        }

        if (platform === 'youtube') {
          // YouTube posting is complex (requires video processing). For now, mark as not implemented.
          throw new Error('YouTube publishing not implemented yet. Video upload requires special handling.');
        }

        if (platform === 'linkedin') {
          const liId = await publishLinkedInPost({
            accessToken,
            companyId: accountId,
            text,
            imageUrls,
          });
          platformPostIds.linkedin = liId;
          results.push({ platform, ok: true, platformPostId: liId });
          continue;
        }

        results.push({
          platform,
          ok: false,
          error: 'Publishing not implemented for this platform yet.',
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Publish failed';
        const friendlyError = createFriendlyPublishErrorMessage(message, platform);
        results.push({ platform, ok: false, error: friendlyError });
      }
    }

    const okAll = results.every((r) => r.ok);
    const okAny = results.some((r) => r.ok);

    await SocialMediaPost.updateOne(
      { _id: postId },
      {
        $set: {
          status: okAll ? 'published' : 'failed',
          publishedAt: okAny ? now : null,
          updatedAt: now,
          failureReason: okAll ? '' : JSON.stringify(results),
          ...(Object.keys(platformPostIds).length
            ? {
                platformPostIds: {
                  ...(postDoc.platformPostIds || {}),
                  ...platformPostIds,
                },
              }
            : {}),
        },
      }
    );

    // Mirror into MediaPost (published only if we managed to publish to at least one platform).
    // If everything failed, mark draft so it doesn't appear publicly.
    await upsertMediaPostFromSocialPost({
      socialPost: {
        ...postDoc,
        status: okAny ? 'published' : 'failed',
        publishedAt: okAny ? now : null,
        platformPostIds: {
          ...(postDoc.platformPostIds || {}),
          ...platformPostIds,
        },
      },
      status: okAny ? 'published' : 'draft',
      author: decoded.username || decoded.userId || 'Admin',
    });

    return NextResponse.json({
      success: true,
      data: {
        postId,
        status: okAll ? 'published' : 'failed',
        results,
      },
    });
  } catch (error) {
    console.error('Error publishing social media post:', error);
    return NextResponse.json({ error: 'Failed to publish post' }, { status: 500 });
  }
}
