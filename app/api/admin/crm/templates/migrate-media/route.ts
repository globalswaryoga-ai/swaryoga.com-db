/**
 * POST /api/admin/crm/templates/migrate-media
 * One-time migration: find all WhatsApp templates with Meta CDN URLs
 * and re-upload to Bunny CDN for permanent storage.
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getWhatsAppTemplate } from '@/lib/schemas/enterpriseSchemas';
import { ensurePermanentUrl, isMetaCdnUrl } from '@/lib/migrateMetaImageToBunny';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');

    await connectDB();
    const WhatsAppTemplate = getWhatsAppTemplate();

    // Find all templates with Meta CDN URLs
    const templates = await WhatsAppTemplate.find({
      $or: [
        { 'headerMedia.url': { $regex: 'scontent', $options: 'i' } },
        { 'headerMedia.url': { $regex: 'fbcdn', $options: 'i' } },
        { 'headerMedia.url': { $regex: 'whatsapp.net', $options: 'i' } },
        { 'imageFile.url': { $regex: 'scontent', $options: 'i' } },
      ],
    }).lean() as any[];

    const results = { migrated: 0, failed: 0, skipped: 0, templates: [] as any[] };

    for (const t of templates) {
      const url = t?.headerMedia?.url || t?.imageFile?.url || '';
      if (!url || !isMetaCdnUrl(url)) { results.skipped++; continue; }

      try {
        const bunnyUrl = await ensurePermanentUrl(url);
        if (bunnyUrl === url) { results.skipped++; continue; }

        await WhatsAppTemplate.findByIdAndUpdate(t._id, {
          $set: {
            'headerMedia.url': bunnyUrl,
            ...(t?.imageFile?.url ? { 'imageFile.url': bunnyUrl } : {}),
          },
        });

        results.migrated++;
        results.templates.push({ name: t.templateName, old: url.substring(0, 60), new: bunnyUrl.substring(0, 60) });
      } catch (err: any) {
        results.failed++;
        results.templates.push({ name: t.templateName, error: err.message });
      }
    }

    return apiSuccess({ ...results, total: templates.length });
  } catch (err: any) {
    return apiError('SERVER_ERROR', err.message);
  }
}
