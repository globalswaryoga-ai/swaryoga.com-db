import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB, SocialMediaAccount, SocialMediaPost } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { decryptCredential } from '@/lib/encryption';

type PublishResult = {
  platform: string;
  ok: boolean;
  platformPostId?: string;
  error?: string;
};

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

        results.push({
          platform,
          ok: false,
          error: 'Publishing not implemented for this platform yet.',
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Publish failed';
        results.push({ platform, ok: false, error: message });
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
