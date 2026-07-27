import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { apiError, apiSuccess, logError } from '@/lib/api-error';
import { verifyToken } from '@/lib/auth';
import {
  createOutboundSocialMessage,
  normalizeSocialInboxPlatform,
  resolveSocialInboxAccount,
} from '@/lib/socialInbox';
import { resolveSocialMediaScope } from '@/lib/socialMediaScope';
import { getWhatsAppTemplate } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

/** Cap per request so one click can't fan out into a rate-limit ban. */
const MAX_RECIPIENTS = 50;
/** Gap between sends — Meta throttles bursts on Messenger/Instagram. */
const SEND_GAP_MS = 400;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Flatten a stored template into the text we actually send. A non-TEXT header
 * stores a media URL in headerContent, which must not be pasted into the body —
 * it is sent separately as an attachment.
 */
function renderTemplateText(t: any): string {
  const header = t?.headerFormat === 'TEXT' ? t?.headerContent : '';
  return [header, t?.templateContent, t?.footerText]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Send one message (optionally with the template's header image) to many
 * Messenger/Instagram conversations at once.
 *
 * Body: {
 *   platform: 'messenger' | 'instagram',
 *   conversationIds: string[],
 *   templateId?: string,     // uses the template's text + header image
 *   messageContent?: string, // free text, used when no templateId
 *   mediaUrl?: string,       // explicit image override
 * }
 *
 * Meta only permits replying inside the 24-hour window since the contact's
 * last message, so per-recipient failures are expected and are reported
 * individually rather than failing the whole batch.
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return apiError('UNAUTHORIZED');
    }

    const body = await request.json().catch(() => ({}));
    const platform = normalizeSocialInboxPlatform(body?.platform);
    if (!platform) {
      return apiError('VALIDATION_ERROR', 'platform must be messenger or instagram');
    }

    const conversationIds: string[] = Array.isArray(body?.conversationIds)
      ? body.conversationIds.map((id: any) => String(id)).filter((id: string) => mongoose.Types.ObjectId.isValid(id))
      : [];
    if (conversationIds.length === 0) {
      return apiError('VALIDATION_ERROR', 'conversationIds is required');
    }
    if (conversationIds.length > MAX_RECIPIENTS) {
      return apiError('VALIDATION_ERROR', `Select at most ${MAX_RECIPIENTS} conversations per send`);
    }

    await connectDB();
    const scope = await resolveSocialMediaScope(decoded);
    const account = await resolveSocialInboxAccount(decoded, platform);
    if (!account) {
      return apiError('NOT_FOUND', 'No connected social account found for this scope/platform');
    }

    // Resolve what we're sending: a saved template, or free text.
    let messageContent = String(body?.messageContent || '').trim();
    let mediaUrl = String(body?.mediaUrl || '').trim();
    const templateId = String(body?.templateId || '').trim();

    if (templateId) {
      if (!mongoose.Types.ObjectId.isValid(templateId)) {
        return apiError('VALIDATION_ERROR', 'Invalid templateId');
      }
      const template = await getWhatsAppTemplate().findById(templateId).lean<any>();
      if (!template) {
        return apiError('NOT_FOUND', 'Template not found');
      }
      messageContent = renderTemplateText(template);
      // An IMAGE header stores its URL in headerContent; send it as an attachment.
      if (!mediaUrl && template.headerFormat === 'IMAGE') {
        mediaUrl = String(template.headerContent || '').trim();
      }
    }

    if (!messageContent && !mediaUrl) {
      return apiError('VALIDATION_ERROR', 'Nothing to send — provide templateId, messageContent or mediaUrl');
    }

    const results: Array<{ conversationId: string; ok: boolean; error?: string }> = [];
    for (const conversationId of conversationIds) {
      try {
        await createOutboundSocialMessage({
          scope,
          platform,
          account,
          conversationId,
          message: messageContent,
          mediaUrl: mediaUrl || undefined,
          mediaType: mediaUrl ? 'image' : undefined,
        });
        results.push({ conversationId, ok: true });
      } catch (err) {
        results.push({
          conversationId,
          ok: false,
          error: err instanceof Error ? err.message : 'Send failed',
        });
      }
      if (SEND_GAP_MS > 0) await sleep(SEND_GAP_MS);
    }

    const sent = results.filter((r) => r.ok).length;
    return apiSuccess({
      sent,
      failed: results.length - sent,
      total: results.length,
      withImage: Boolean(mediaUrl),
      results,
    });
  } catch (error) {
    logError('social-inbox bulk-send POST', error);
    return apiError('SERVER_ERROR', error instanceof Error ? error.message : 'Bulk send failed');
  }
}
