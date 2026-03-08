import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { tenantFilter, getViewerUserId } from '@/lib/crm-handlers';
import { getWhatsAppTemplate } from '@/lib/schemas/enterpriseSchemas';
import {
  fetchTemplatesFromMeta,
  getTemplateStatusFromMeta,
  mapMetaStatusToLocal,
  MetaTemplate,
} from '@/lib/meta-templates';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/templates/meta/sync
 * Fetch all templates from Meta and sync status
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tf = tenantFilter(decoded, 'createdBy');

    const url = new URL(request.url);
    const importNew = url.searchParams.get('import') === 'true';

    await connectDB();
    const WhatsAppTemplate = getWhatsAppTemplate();

    // Fetch all templates from Meta
    const result = await fetchTemplatesFromMeta(200);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to fetch templates from Meta',
      }, { status: 400 });
    }

    const metaTemplates = result.templates || [];
    const syncResults: Array<{
      name: string;
      action: 'updated' | 'imported' | 'skipped';
      metaStatus: string;
      localStatus?: string;
    }> = [];

    for (const metaTemplate of metaTemplates) {
      // Find existing local template by metaTemplateId or name
      const existing = await WhatsAppTemplate.findOne({
        $or: [
          { metaTemplateId: metaTemplate.id },
          { metaTemplateName: metaTemplate.name },
          { templateName: metaTemplate.name },
        ],
        ...tf,
      });

      if (existing) {
        // Update ONLY status fields - preserve local content (headerUrl, etc.)
        const localStatus = mapMetaStatusToLocal(metaTemplate.status);
        await WhatsAppTemplate.findOneAndUpdate({ _id: existing._id, ...tf }, {
          $set: {
            metaTemplateId: metaTemplate.id,
            metaTemplateName: metaTemplate.name,
            status: localStatus,
            metaStatus: metaTemplate.status,
            metaRejectionReason: metaTemplate.rejected_reason || null,
            metaQualityScore: metaTemplate.quality_score?.score || null,
            lastMetaSyncAt: new Date(),
            // NOTE: Don't overwrite templateContent, headerUrl, buttons, etc.
            // Those are managed locally and Meta doesn't return media URLs
          },
        });

        syncResults.push({
          name: metaTemplate.name,
          action: 'updated',
          metaStatus: metaTemplate.status,
          localStatus,
        });
      } else if (importNew) {
        // Import new template from Meta
        const bodyComponent = metaTemplate.components?.find(c => c.type === 'BODY');
        const headerComponent = metaTemplate.components?.find(c => c.type === 'HEADER');
        const footerComponent = metaTemplate.components?.find(c => c.type === 'FOOTER');
        const buttonsComponent = metaTemplate.components?.find(c => c.type === 'BUTTONS');

        const newTemplate = await WhatsAppTemplate.create({
          templateName: metaTemplate.name,
          metaTemplateId: metaTemplate.id,
          metaTemplateName: metaTemplate.name,
          category: mapMetaCategoryToLocal(metaTemplate.category),
          language: metaTemplate.language || 'en',
          templateContent: bodyComponent?.text || '',
          headerFormat: headerComponent?.format || 'NONE',
          headerContent: headerComponent?.text || '',
          footerText: footerComponent?.text || '',
          buttons: buttonsComponent?.buttons?.map(b => ({ title: b.text })) || [],
          status: mapMetaStatusToLocal(metaTemplate.status),
          metaStatus: metaTemplate.status,
          metaRejectionReason: metaTemplate.rejected_reason || null,
          metaQualityScore: metaTemplate.quality_score?.score || null,
          lastMetaSyncAt: new Date(),
          importedFromMeta: true,
          importedAt: new Date(),
          createdBy: new mongoose.Types.ObjectId(), // System import
          createdByUserId: getViewerUserId(decoded),
        });

        syncResults.push({
          name: metaTemplate.name,
          action: 'imported',
          metaStatus: metaTemplate.status,
          localStatus: mapMetaStatusToLocal(metaTemplate.status),
        });
      } else {
        syncResults.push({
          name: metaTemplate.name,
          action: 'skipped',
          metaStatus: metaTemplate.status,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${metaTemplates.length} templates from Meta`,
      totalFromMeta: metaTemplates.length,
      updated: syncResults.filter(r => r.action === 'updated').length,
      imported: syncResults.filter(r => r.action === 'imported').length,
      skipped: syncResults.filter(r => r.action === 'skipped').length,
      results: syncResults,
    });
  } catch (error) {
    console.error('[META SYNC] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to sync templates';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/crm/templates/meta/sync
 * Sync a single template's status from Meta
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tf = tenantFilter(decoded, 'createdBy');

    const body = await request.json().catch(() => null);
    if (!body?.templateId) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
    }

    const { templateId } = body;

    if (!mongoose.Types.ObjectId.isValid(templateId)) {
      return NextResponse.json({ error: 'Invalid templateId' }, { status: 400 });
    }

    await connectDB();
    const WhatsAppTemplate = getWhatsAppTemplate();

    const template = await WhatsAppTemplate.findOne({ _id: templateId, ...tf }).lean();
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const templateName = (template as any).metaTemplateName || (template as any).templateName;
    const language = (template as any).language || 'en';

    const result = await getTemplateStatusFromMeta(templateName, language);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to get template status from Meta',
      }, { status: 400 });
    }

    const metaTemplate = result.template!;
    const localStatus = mapMetaStatusToLocal(metaTemplate.status);

    const updated = await WhatsAppTemplate.findOneAndUpdate(
      { _id: templateId, ...tf },
      {
        $set: {
          metaTemplateId: metaTemplate.id,
          status: localStatus,
          metaStatus: metaTemplate.status,
          metaRejectionReason: metaTemplate.rejected_reason || null,
          metaQualityScore: metaTemplate.quality_score?.score || null,
          lastMetaSyncAt: new Date(),
        },
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Template status synced from Meta',
      metaStatus: metaTemplate.status,
      localStatus,
      rejectedReason: metaTemplate.rejected_reason,
      qualityScore: metaTemplate.quality_score?.score,
      data: updated,
    });
  } catch (error) {
    console.error('[META SYNC] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to sync template';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Map Meta category to local category
 */
function mapMetaCategoryToLocal(metaCategory: string): string {
  switch (metaCategory?.toUpperCase()) {
    case 'MARKETING':
      return 'MARKETING';
    case 'UTILITY':
      return 'UTILITY';
    case 'AUTHENTICATION':
      return 'OTP';
    default:
      return 'MARKETING';
  }
}
