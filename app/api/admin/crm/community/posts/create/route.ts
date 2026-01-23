import { NextRequest, NextResponse } from 'next/server';
import { connectDB, CommunityPost, MediaPost, SocialMediaPost, Community } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { CommunityMember } from '@/lib/db';
import { contentHasLink, enforceCommunityChatPolicy, getMyCommunityChatPolicy } from '@/lib/communityChatPolicy';
import { upsertMediaPostFromSocialPost } from '@/lib/socialToMediaPost';
import axios from 'axios';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type ButtonAction = {
  id: string;
  label: string;
  actionType: 'link' | 'phone' | 'text';
  url?: string;
  phoneNumber?: string;
};

type Body = {
  communityIds: string[];
  headerText?: string;
  content: string;
  footerText?: string;
  buttons?: ButtonAction[];
  type?: 'text' | 'image' | 'video' | 'document' | 'link';
  videoUrl?: string;
  docUrl?: string;
  links?: string[];
  imageUrls?: string[];
  scheduledAt?: string;
  category?: 'general' | 'experiences' | 'tips' | 'transformations' | 'questions';
  crossPost?: {
    media?: boolean;
    socialMedia?: boolean;
  };
};

function buildMessage(params: {
  headerText?: string;
  content: string;
  footerText?: string;
  buttons?: ButtonAction[];
  type?: string;
  videoUrl?: string;
  docUrl?: string;
  links?: string[];
}): string {
  const lines: string[] = [];
  const header = (params.headerText || '').trim();
  const body = (params.content || '').trim();
  const footer = (params.footerText || '').trim();

  if (header) lines.push(`*${header}*`);
  if (body) lines.push(body);

  if (params.videoUrl) lines.push(`\n🎥 Video: ${params.videoUrl}`);
  if (params.docUrl) lines.push(`\n📂 Document: ${params.docUrl}`);
  if (Array.isArray(params.links) && params.links.length > 0) {
    lines.push('\n🔗 Relevant Links:');
    params.links.forEach(l => lines.push(`- ${l}`));
  }

  if (footer) lines.push(`\n_${footer}_`);

  const btns = Array.isArray(params.buttons) ? params.buttons : [];
  const clean = btns
    .map((b) => ({
      label: String(b?.label || '').trim(),
      actionType: b?.actionType,
      url: b?.url ? String(b.url).trim() : undefined,
      phoneNumber: b?.phoneNumber ? String(b.phoneNumber).trim() : undefined,
    }))
    .filter((b) => b.label && b.actionType)
    .slice(0, 10);

  if (clean.length > 0) {
    lines.push('');
    lines.push('Buttons:');
    clean.forEach((b, idx) => {
      const suffix =
        b.actionType === 'link' && b.url
          ? ` → ${b.url}`
          : b.actionType === 'phone' && b.phoneNumber
            ? ` → ${b.phoneNumber}`
            : '';
      lines.push(`${idx + 1}. ${b.label}${suffix}`);
    });
  }

  return lines.join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as Body | null;
    const communityIds = Array.isArray(body?.communityIds)
      ? body!.communityIds.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean)
      : [];

    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    const headerText = typeof body?.headerText === 'string' ? body.headerText.trim() : '';
    const footerText = typeof body?.footerText === 'string' ? body.footerText.trim() : '';
    const buttons = Array.isArray(body?.buttons) ? (body!.buttons as ButtonAction[]) : [];
    
    // Multimedia fields
    const postType = body?.type || 'text';
    const imageUrls = Array.isArray(body?.imageUrls) ? body.imageUrls.filter(Boolean) : [];
    const videoUrl = body?.videoUrl || '';
    const docUrl = body?.docUrl || '';
    const extraLinks = Array.isArray(body?.links) ? body.links.filter(Boolean) : [];
    const scheduledFor = body?.scheduledAt ? new Date(body.scheduledAt) : undefined;
    const category = body?.category || 'general';

    if (communityIds.length === 0) {
      return NextResponse.json({ error: 'communityIds is required' }, { status: 400 });
    }
    if (!content && !headerText && !footerText && !videoUrl && !docUrl && imageUrls.length === 0) {
      return NextResponse.json({ error: 'Post content or files/links are required' }, { status: 400 });
    }

    const message = buildMessage({ headerText, content, footerText, buttons, type: postType, videoUrl, docUrl, links: extraLinks });
    if (message.length > 4000) {
      return NextResponse.json({ error: 'Message too long (max 4000 chars)' }, { status: 400 });
    }

    await connectDB();

    const userId = decoded.userId || decoded.username || 'admin';
    const now = new Date();

    const bridgeUrl = process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL || 'http://localhost:3333';
    const bridgeSecret = process.env.WHATSAPP_WEB_BRIDGE_SECRET;

    // Skip policy enforcement for admins creating campaigns
    
    // Optional cross-post:
    // - media: create a MediaPost (published) so it appears on /media immediately.
    // - socialMedia: create a SocialMediaPost (draft) and mirror into MediaPost via existing helper.
    // We store linkage in CommunityPost.metadata for traceability.
    const wantsMedia = Boolean(body?.crossPost?.media);
    const wantsSocial = Boolean(body?.crossPost?.socialMedia);

    let mediaPostId: string | undefined;
    let socialPostId: string | undefined;

    if (wantsMedia) {
      const title = headerText || (content ? (content.length > 80 ? `${content.slice(0, 77)}...` : content) : 'Community Post');
      const description = [headerText, content, footerText].filter(Boolean).join('\n').trim();

      const doc = await MediaPost.create({
        title,
        description,
        blocks: [
          {
            type: 'left-text-right-image',
            text: description,
            heading: headerText || '',
            media: { url: '', type: 'image', altText: '', caption: '' },
            order: 1,
          },
        ],
        leftSidebar: { title: '', items: [] },
        rightSidebar: { title: '', items: [] },
        status: 'published',
        publishedAt: now,
        scheduledFor: null,
        category: 'update',
        tags: ['community'],
        author: String(decoded.userId || decoded.username || 'Admin'),
        featured: true,
        pinnedOn: now,
        metadata: {
          source: 'community-admin',
          communityIds,
          createdByUserId: String(decoded.userId || decoded.username || 'admin'),
        },
      });
      mediaPostId = doc._id?.toString();
    }

    if (wantsSocial) {
      const text = [headerText, content, footerText].filter(Boolean).join('\n').trim();

      const sp = await SocialMediaPost.create({
        content: {
          text: text || '(community post)',
          images: [],
          videos: [],
          link: '',
          hashtags: [],
        },
        platforms: [],
        accountIds: [],
        status: 'draft',
        createdAt: now,
        updatedAt: now,
        tags: ['community'],
      });
      socialPostId = sp._id?.toString();

      // Mirror into MediaPost so it appears on /media (draft).
      await upsertMediaPostFromSocialPost({
        socialPost: sp.toObject(),
        status: 'draft',
        author: String(decoded.userId || decoded.username || 'Admin'),
      });
    }

    const postResults: any[] = [];
    for (const communityId of communityIds) {
      // 1. Save to Internal Community DB
      const dbPost = await CommunityPost.create({
        communityId,
        userId,
        content: message,
        type: postType,
        category,
        images: imageUrls,
        videos: videoUrl ? [videoUrl] : [],
        documents: docUrl ? [docUrl] : [],
        links: extraLinks,
        scheduledFor,
        status: scheduledFor ? 'scheduled' : 'published', // Explicitly set status
        metadata: {
          originalHeader: headerText,
          originalBody: content,
          originalFooter: footerText,
          buttons,
          mediaPostId,
          socialPostId,
          postId: postResults.length + 1,
        },
        createdAt: now,
        updatedAt: now,
      });

      // 2. Send to WhatsApp QR Group (if linked)
      try {
        const comm = await Community.findOne({ id: communityId });
        if (comm?.whatsappGroupId) {
          console.log(`[Campaign] Sending to WhatsApp Group: ${comm.whatsappGroupId}`);
          
          // Send main text message
          await axios.post(
            `${bridgeUrl}/groups/${comm.whatsappGroupId}/messages`,
            { 
              text: message,
              media: imageUrls.length > 0 ? imageUrls[0] : (videoUrl || docUrl || null)
            },
            {
              headers: { 'x-bridge-secret': bridgeSecret },
              timeout: 5000,
            }
          ).catch(e => console.error(`Failed to send campaign segment to ${comm.name}: ${e.message}`));
        }
      } catch (err) {
        console.error(`Error sending campaign to WhatsApp group ${communityId}:`, err);
      }

      postResults.push(dbPost);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully posted to ${communityIds.length} communities`,
      data: {
        postCount: postResults.length,
        communityIds,
      },
    });
  } catch (error) {
    console.error('Admin community multi-post error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Failed to create community post: ${errorMessage}` }, { status: 500 });
  }
}
