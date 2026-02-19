import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB, SocialMediaAccount, SocialMediaPost } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { decryptCredential } from '@/lib/encryption';
import { upsertMediaPostFromSocialPost } from '@/lib/socialToMediaPost';
import crypto from 'crypto';

function generateAppSecretProof(accessToken: string, appSecret?: string): string | undefined {
  if (!appSecret) return undefined;
  return crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
}

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
    return `❌ YOUTUBE: ${error}. Make sure you've connected via OAuth and included a video URL.`;
  }
  
  // Truncate long errors
  const shortError = error.length > 80 ? error.substring(0, 80) + '...' : error;
  return `❌ ${platform.toUpperCase()}: ${shortError}`;
}

async function graphPost(path: string, params: Record<string, string>): Promise<any> {
  const url = `https://graph.facebook.com/v24.0/${path}`;
  
  // Inject appsecret_proof if possible
  if (params.access_token) {
    const metaAppSecret = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET;
    const proof = generateAppSecretProof(params.access_token, metaAppSecret);
    if (proof) {
      params.appsecret_proof = proof;
    }
  }

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

async function waitForInstagramContainerReady(
  containerId: string,
  accessToken: string,
  maxWaitMs: number = 120000
): Promise<void> {
  const startTime = Date.now();
  const pollInterval = 5000; // 5 seconds

  while (Date.now() - startTime < maxWaitMs) {
    const url = `https://graph.facebook.com/v24.0/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(accessToken)}`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));

    const status = data?.status_code || data?.status;
    console.log(`[Instagram] Container ${containerId} status: ${status}`);

    if (status === 'FINISHED') {
      return; // Ready to publish
    }
    if (status === 'ERROR' || status === 'EXPIRED') {
      throw new Error(`Instagram container failed with status: ${status}`);
    }
    // IN_PROGRESS - wait and retry
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error('Instagram video processing timed out after 2 minutes. Try a shorter video.');
}

async function publishInstagramPost(args: {
  igUserId: string;
  accessToken: string;
  caption: string;
  imageUrls: string[];
  videoUrls: string[];
}): Promise<string> {
  const { igUserId, accessToken, caption, imageUrls, videoUrls } = args;

  // Instagram Graph API does not support text-only feed posts.
  if (imageUrls.length === 0 && videoUrls.length === 0) {
    throw new Error('Instagram publishing requires at least 1 image or video URL (text-only is not supported).');
  }

  // VIDEO/REELS posting
  if (videoUrls.length > 0) {
    if (videoUrls.length > 1) {
      throw new Error('Instagram Reels supports only 1 video per post.');
    }
    if (imageUrls.length > 0) {
      throw new Error('Instagram does not support mixing images and videos in one post. Use either images or a video.');
    }

    console.log(`[Instagram] Creating Reels container for video: ${videoUrls[0]}`);

    // Create video container (Reels)
    const createContainer = await graphPost(`${encodeURIComponent(igUserId)}/media`, {
      access_token: accessToken,
      media_type: 'REELS',
      video_url: videoUrls[0],
      caption,
    });

    const containerId = String(createContainer?.id || '').trim();
    if (!containerId) throw new Error('Instagram Reels container creation returned no id');

    console.log(`[Instagram] Container created: ${containerId}, waiting for processing...`);

    // Wait for video processing to complete
    await waitForInstagramContainerReady(containerId, accessToken);

    console.log(`[Instagram] Container ready, publishing Reel...`);

    // Publish the Reel
    const publish = await graphPost(`${encodeURIComponent(igUserId)}/media_publish`, {
      access_token: accessToken,
      creation_id: containerId,
    });

    const igPostId = String(publish?.id || '').trim();
    if (!igPostId) throw new Error('Instagram Reels publish returned no id');
    
    console.log(`[Instagram] ✅ Reel published: ${igPostId}`);
    return igPostId;
  }

  // IMAGE posting (existing logic)
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

/**
 * Refresh YouTube OAuth token if expired
 */
async function refreshYouTubeToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('YouTube OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(`Failed to refresh YouTube token: ${data.error_description || data.error || 'Unknown error'}`);
  }

  return { access_token: data.access_token, expires_in: data.expires_in };
}

/**
 * Upload video to YouTube using resumable upload protocol
 * Supports large files by uploading in chunks
 */
async function publishYouTubeVideo(args: {
  accessToken: string;
  refreshToken?: string;
  videoUrl: string;
  title: string;
  description: string;
}): Promise<string> {
  const { accessToken, refreshToken, videoUrl, title, description } = args;

  // First, download the video from the provided URL
  console.log(`[YouTube] Fetching video from: ${videoUrl}`);
  const videoResponse = await fetch(videoUrl, { cache: 'no-store' });
  if (!videoResponse.ok) {
    throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
  }

  const contentType = videoResponse.headers.get('content-type') || 'video/mp4';
  const videoBuffer = await videoResponse.arrayBuffer();
  const videoSize = videoBuffer.byteLength;

  console.log(`[YouTube] Video size: ${(videoSize / 1024 / 1024).toFixed(2)} MB`);

  // Maximum video size: 128GB (YouTube limit), but we'll set a practical limit
  if (videoSize > 5 * 1024 * 1024 * 1024) { // 5GB practical limit
    throw new Error('Video file too large. Maximum size is 5GB for this upload method.');
  }

  // Step 1: Initialize resumable upload session
  const metadata = {
    snippet: {
      title: title || 'Untitled Video',
      description: description || '',
      categoryId: '22', // "People & Blogs" - generic category
    },
    status: {
      privacyStatus: 'public',
      selfDeclaredMadeForKids: false,
    },
  };

  const initResponse = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': contentType,
        'X-Upload-Content-Length': videoSize.toString(),
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!initResponse.ok) {
    const errorData = await initResponse.json().catch(() => ({}));
    const errorMsg = errorData?.error?.message || errorData?.error?.errors?.[0]?.message || 'Failed to initialize upload';
    
    // Check for token expiry
    if (initResponse.status === 401 && refreshToken) {
      console.log('[YouTube] Token expired, attempting refresh...');
      const newTokens = await refreshYouTubeToken(refreshToken);
      // Retry with new token
      return publishYouTubeVideo({
        accessToken: newTokens.access_token,
        refreshToken,
        videoUrl,
        title,
        description,
      });
    }
    
    throw new Error(`YouTube upload init failed: ${errorMsg}`);
  }

  const uploadUrl = initResponse.headers.get('location');
  if (!uploadUrl) {
    throw new Error('YouTube did not return an upload URL');
  }

  console.log(`[YouTube] Upload session initialized, uploading video...`);

  // Step 2: Upload the video content
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Content-Length': videoSize.toString(),
    },
    body: videoBuffer,
  });

  if (!uploadResponse.ok) {
    const errorData = await uploadResponse.json().catch(() => ({}));
    throw new Error(`YouTube video upload failed: ${errorData?.error?.message || uploadResponse.statusText}`);
  }

  const uploadResult = await uploadResponse.json();
  const videoId = uploadResult?.id;

  if (!videoId) {
    throw new Error('YouTube upload succeeded but no video ID returned');
  }

  console.log(`[YouTube] ✅ Video uploaded successfully: https://www.youtube.com/watch?v=${videoId}`);
  return videoId;
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
    
    // Allow internal scheduler token for automated publishing
    const internalToken = process.env.INTERNAL_API_TOKEN || process.env.CRON_SECRET;
    const isInternalCall = internalToken && token === internalToken;
    
    let decoded: any = null;
    if (!isInternalCall) {
      decoded = verifyToken(token);
      if (!decoded?.isAdmin) {
        return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
      }
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
          // Instagram supports images or Reels (videos)
          const igId = await publishInstagramPost({
            igUserId: accountId,
            accessToken,
            caption: text,
            imageUrls,
            videoUrls,
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
          // YouTube requires video URLs
          if (videoUrls.length === 0) {
            throw new Error('YouTube publishing requires at least one video URL. Text-only posts are not supported.');
          }
          if (videoUrls.length > 1) {
            throw new Error('YouTube publishing currently supports only 1 video per post.');
          }

          // Get refresh token for token renewal
          let refreshToken = '';
          try {
            if (acc.refreshToken) {
              refreshToken = decryptCredential(String(acc.refreshToken));
            }
          } catch {
            console.warn('[YouTube] Could not decrypt refresh token, proceeding without it');
          }

          const ytId = await publishYouTubeVideo({
            accessToken,
            refreshToken,
            videoUrl: videoUrls[0],
            title: text.slice(0, 100) || 'Video from Swar Yoga', // YouTube title limit
            description: text,
          });
          platformPostIds.youtube = ytId;
          results.push({ platform, ok: true, platformPostId: ytId });
          continue;
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
      author: decoded?.username || decoded?.userId || 'Scheduler',
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
