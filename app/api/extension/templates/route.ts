import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { getWhatsAppTemplate } from '@/lib/schemas/enterpriseSchemas';
import { extensionJson, extensionOptions, requireExtensionAccess } from '@/lib/extensionAccess';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return extensionOptions();
}

/** Flatten a stored template into the plain text dropped into the compose box — same shape as SocialComposer.tsx's renderTemplateText. */
function renderTemplateText(t: any): string {
  return [t.headerContent, t.templateContent, t.footerText]
    .map((part: any) => String(part || '').trim())
    .filter(Boolean)
    .join('\n\n');
}

/**
 * GET /api/extension/templates
 * This user's WhatsApp templates (QR + Meta), for click-to-insert in the
 * extension sidebar — the fuller template library, not just Quick Replies.
 */
export async function GET(req: NextRequest) {
  try {
    const decoded = await requireExtensionAccess(req);
    if (!decoded) {
      return extensionJson({ success: false, error: 'Extension access not approved for this user' }, 403);
    }

    await connectDB();
    const WhatsAppTemplate = getWhatsAppTemplate();
    const templates = await WhatsAppTemplate.find({ createdBy: decoded.userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return extensionJson({
      success: true,
      templates: templates
        .map((t: any) => ({
          _id: t._id,
          name: t.templateName,
          text: renderTemplateText(t),
          provider: t.provider || 'meta',
          headerFormat: t.headerFormat || 'NONE',
          imageUrl: t.imageFile?.url || (t.headerFormat === 'IMAGE' ? t.headerContent : '') || '',
        }))
        .filter((t: any) => t.text),
    });
  } catch (err) {
    console.error('[extension/templates]', err);
    return extensionJson({ success: false, error: 'Internal error' }, 500);
  }
}
