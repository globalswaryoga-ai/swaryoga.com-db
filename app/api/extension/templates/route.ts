import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { getWhatsAppTemplate } from '@/lib/schemas/enterpriseSchemas';
import { extensionJson, extensionOptions, requireExtensionAccess } from '@/lib/extensionAccess';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return extensionOptions();
}

/**
 * Flatten a stored template into the plain text dropped into the compose
 * box. headerContent is only real header TEXT when headerFormat is 'TEXT' —
 * for IMAGE/VIDEO/DOCUMENT headers (especially legacy QR templates), it
 * instead holds the raw media URL, and including it here was dumping that
 * URL straight into the message body, jammed against whatever followed it
 * with no separator. Same "doesn't start with http" guard already used for
 * this exact ambiguity in app/admin/crm/qr/templates/page.tsx.
 */
function renderTemplateText(t: any): string {
  const headerFormat = String(t.headerFormat || '').toUpperCase();
  const headerText = headerFormat === 'TEXT' && t.headerContent && !String(t.headerContent).startsWith('http')
    ? t.headerContent
    : '';
  return [headerText, t.templateContent, t.footerText]
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
        .map((t: any) => {
          const headerFormat = String(t.headerFormat || '').toUpperCase();
          const headerText = headerFormat === 'TEXT' && t.headerContent && !String(t.headerContent).startsWith('http')
            ? t.headerContent
            : '';
          return {
            _id: t._id,
            name: t.templateName,
            // Flattened string, still used for the actual click-to-insert.
            text: renderTemplateText(t),
            // Structured pieces, used for the sidebar's block-by-block preview.
            headerText,
            body: String(t.templateContent || '').trim(),
            footer: String(t.footerText || '').trim(),
            buttons: Array.isArray(t.buttons) ? t.buttons.map((b: any) => b.title).filter(Boolean) : [],
            provider: t.provider || 'meta',
            headerFormat: headerFormat || 'NONE',
            imageUrl: t.imageFile?.url || (headerFormat === 'IMAGE' ? t.headerContent : '') || '',
          };
        })
        .filter((t: any) => t.text),
    });
  } catch (err) {
    console.error('[extension/templates]', err);
    return extensionJson({ success: false, error: 'Internal error' }, 500);
  }
}
