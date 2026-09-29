/**
 * POST /api/admin/crm/templates/migrate-media
 * One-time migration: find all WhatsApp templates with Meta CDN URLs
 * and re-upload to Bunny CDN for permanent storage.
 */
import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { ensurePermanentUrl, isMetaCdnUrl } from '@/lib/migrateMetaImageToBunny';
import { listTemplates, updateTemplate } from '@/lib/bunnyTemplatesRepository';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');

    // Fetch all templates (with a high limit) since we need to check in-memory
    const { templates } = await listTemplates({}, 10000, 0);

    const results = { migrated: 0, failed: 0, skipped: 0, templates: [] as any[] };

    for (const t of templates) {
      const url = (t as any)?.headerMedia?.url || (t as any)?.imageFile?.url || '';
      if (!url || !isMetaCdnUrl(url)) { results.skipped++; continue; }

      try {
        const bunnyUrl = await ensurePermanentUrl(url);
        if (bunnyUrl === url) { results.skipped++; continue; }

        const updates: any = {};
        if ((t as any)?.headerMedia?.url) {
            updates.headerMedia = { ...(t as any).headerMedia, url: bunnyUrl };
        }
        if ((t as any)?.imageFile?.url) {
            updates.imageFile = { ...(t as any).imageFile, url: bunnyUrl };
        }

        await updateTemplate(t._id, updates);

        results.migrated++;
        results.templates.push({ name: (t as any).templateName, old: url.substring(0, 60), new: bunnyUrl.substring(0, 60) });
      } catch (err: any) {
        results.failed++;
        results.templates.push({ name: (t as any).templateName, error: err.message });
      }
    }

    return apiSuccess({ ...results, total: templates.length });
  } catch (err: any) {
    return apiError('SERVER_ERROR', err.message);
  }
}
