import type { Types } from 'mongoose';
import { MediaPost } from '@/lib/db';

type SocialPostDoc = {
  _id: Types.ObjectId | string;
  content?: {
    text?: string;
    images?: Array<{ url?: string; caption?: string; altText?: string }>;
    videos?: Array<{ url?: string; title?: string; thumbnail?: string; duration?: number }>;
    link?: string;
    hashtags?: string[];
  };
  platforms?: string[];
  status?: 'draft' | 'scheduled' | 'published' | 'failed' | 'archived';
  scheduledFor?: Date | string | null;
  publishedAt?: Date | string | null;
  platformPostIds?: Record<string, string>;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

function uniqStrings(values: Array<string | undefined | null>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    const s = String(v || '').trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

/**
 * Upserts a MediaPost that mirrors a SocialMediaPost.
 *
 * Design goal:
 * - Admin creates/publishes a SocialMediaPost
 * - Same text/media should appear on the public /media page
 * - Therefore persist a MediaPost with a stable linkage to the SocialMediaPost ID.
 */
export async function upsertMediaPostFromSocialPost(args: {
  socialPost: SocialPostDoc;
  status?: 'draft' | 'scheduled' | 'published';
  category?: 'update' | 'highlight' | 'testimony' | 'program' | 'event';
  author?: string;
}) {
  const { socialPost } = args;
  const status = args.status || (socialPost.status === 'published' ? 'published' : 'draft');

  const text = String(socialPost.content?.text || '').trim();
  const imageUrls = Array.isArray(socialPost.content?.images)
    ? socialPost.content!.images!
        .map((i) => String(i?.url || '').trim())
        .filter(Boolean)
    : [];
  const videoUrls = Array.isArray(socialPost.content?.videos)
    ? socialPost.content!.videos!
        .map((v) => String(v?.url || '').trim())
        .filter(Boolean)
    : [];

  // Minimal “blocks” representation compatible with the MediaPost schema.
  // MediaPost.blocks requires alternating layout types + a media object.
  // We'll create a single block that includes the text and a single media URL if available.
  const preferredMediaUrl = imageUrls[0] || videoUrls[0] || '';
  const preferredMediaType = imageUrls[0] ? 'image' : videoUrls[0] ? 'video' : 'image';

  const blocks: any[] = [
    {
      type: 'left-text-right-image',
      heading: '',
      text,
      media: {
        url: preferredMediaUrl,
        type: preferredMediaType,
        altText: '',
        caption: '',
      },
      order: 1,
    },
  ];

  const tags = uniqStrings([...(socialPost.content?.hashtags || []), ...(socialPost.platforms || [])]);
  const title = text ? (text.length > 80 ? `${text.slice(0, 77)}...` : text) : 'Social Post';

  const publishedAt = status === 'published' ? (socialPost.publishedAt ? new Date(socialPost.publishedAt) : new Date()) : undefined;
  const scheduledFor = status === 'scheduled' && socialPost.scheduledFor ? new Date(socialPost.scheduledFor) : undefined;

  // Links to platform posts (if available after publish)
  const platformPostIds = socialPost.platformPostIds || {};
  const socialMediaLinks: any = {
    facebookLink: platformPostIds.facebook ? String(platformPostIds.facebook) : '',
    instagramLink: platformPostIds.instagram ? String(platformPostIds.instagram) : '',
    twitterLink: platformPostIds.x ? String(platformPostIds.x) : '',
  };

  const linkage = {
    source: 'social-media' as const,
    socialPostId: String(socialPost._id),
  };

  // NOTE: We keep everything in MongoDB. Any AWS/S3 URLs are simply stored as URLs in the blocks.
  await MediaPost.updateOne(
    { 'metadata.source': linkage.source, 'metadata.socialPostId': linkage.socialPostId },
    {
      $set: {
        title,
        description: text,
        blocks,
        status,
        publishedAt,
        scheduledFor,
        category: args.category || 'update',
        tags,
        author: args.author || 'Admin',
        featured: false,
        socialMediaLinks,
        metadata: {
          source: linkage.source,
          socialPostId: linkage.socialPostId,
          platforms: socialPost.platforms || [],
          platformPostIds,
        },
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
}
