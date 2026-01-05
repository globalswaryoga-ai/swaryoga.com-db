import type { NextRequest } from 'next/server';
import { connectDB, CommunityMember } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/communityAuth';

export type CommunityMessageType = 'text' | 'link' | 'image' | 'video' | 'document';

export type CommunityChatPolicy = {
  canSend: boolean;
  allowText: boolean;
  allowLinks: boolean;
  allowImages: boolean;
  allowVideos: boolean;
  allowDocuments: boolean;
};

const DEFAULT_POLICY: CommunityChatPolicy = {
  canSend: true,
  allowText: true,
  allowLinks: true,
  allowImages: true,
  allowVideos: true,
  allowDocuments: true,
};

export async function getMyCommunityChatPolicy(params: {
  request: NextRequest;
  communityId: string;
}): Promise<CommunityChatPolicy> {
  const userId = getUserIdFromRequest(params.request);
  if (!userId) {
    const err = new Error('Unauthorized');
    (err as any).status = 401;
    throw err;
  }

  await connectDB();
  const member = await CommunityMember.findOne({ userId, communityId: params.communityId }).lean();
  if (!member) return DEFAULT_POLICY;

  const enabled = (member as any).chatEnabled !== false;
  const p = ((member as any).chatPermissions || {}) as Partial<CommunityChatPolicy>;

  // If chat is disabled, force canSend = false.
  const merged: CommunityChatPolicy = {
    ...DEFAULT_POLICY,
    ...p,
    canSend: enabled && (typeof p.canSend === 'boolean' ? p.canSend : true),
  };

  return merged;
}

export function enforceCommunityChatPolicy(params: {
  policy: CommunityChatPolicy;
  messageType: CommunityMessageType;
  hasLink: boolean;
}): void {
  const { policy } = params;
  if (!policy.canSend) {
    const err = new Error('Chat disabled for this user');
    (err as any).status = 403;
    throw err;
  }

  // Links are a special case: even in text messages, links can be prohibited.
  if (params.hasLink && !policy.allowLinks) {
    const err = new Error('Links are not allowed');
    (err as any).status = 403;
    throw err;
  }

  const allowedByType: Record<CommunityMessageType, boolean> = {
    text: policy.allowText,
    link: policy.allowLinks,
    image: policy.allowImages,
    video: policy.allowVideos,
    document: policy.allowDocuments,
  };

  if (!allowedByType[params.messageType]) {
    const err = new Error('This message type is not allowed');
    (err as any).status = 403;
    throw err;
  }
}

export function contentHasLink(content: string): boolean {
  const s = String(content || '');
  // Conservative detection: http(s)://, www., or bare domain.tld
  return /(https?:\/\/|www\.|\b[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\b)/.test(s);
}
