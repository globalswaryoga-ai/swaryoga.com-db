import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { tenantFilter, getViewerUserId } from '@/lib/crm-handlers';
import { getWhatsAppTemplate } from '@/lib/schemas/enterpriseSchemas';
import {
  submitTemplateToMeta,
  convertToMetaFormat,
  getTemplateStatusFromMeta,
  mapMetaStatusToLocal,
  uploadMediaToMeta,
} from '@/lib/meta-templates';
import { getPublicMediaUrl } from '@/lib/whatsapp';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/crm/templates/meta/submit
 * Submit a local template to Meta for approval
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

    // Check if already submitted
    if ((template as any).metaTemplateId) {
      // Refresh status from Meta instead
      const statusResult = await getTemplateStatusFromMeta(
        (template as any).templateName,
        (template as any).language || 'en'
      );

      if (statusResult.success && statusResult.template) {
        const localStatus = mapMetaStatusToLocal(statusResult.template.status);
        
        await WhatsAppTemplate.findOneAndUpdate({ _id: templateId, ...tf }, {
          $set: {
            status: localStatus,
            metaStatus: statusResult.template.status,
            metaRejectionReason: statusResult.template.rejected_reason || null,
            metaQualityScore: statusResult.template.quality_score?.score || null,
            lastMetaSyncAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Template status refreshed from Meta',
          metaStatus: statusResult.template.status,
          localStatus,
          rejectedReason: statusResult.template.rejected_reason,
        });
      }

      return NextResponse.json({
        success: false,
        error: 'Template already submitted. Could not refresh status: ' + (statusResult.error || 'Unknown error'),
      }, { status: 400 });
    }

    // Check if template has media header that needs uploading
    let mediaHandle: string | undefined;
    const headerFormat = (template as any).headerFormat;
    
    if (headerFormat === 'IMAGE' || headerFormat === 'VIDEO' || headerFormat === 'DOCUMENT') {
      // Get the media URL
      let mediaUrl: string | undefined;
      let mimeType = 'image/jpeg';
      let fileName = 'media';
      
      if (headerFormat === 'IMAGE') {
        const imageFile = (template as any).imageFile;
        const headerMedia = (template as any).headerMedia;
        mediaUrl = imageFile?.url || headerMedia?.url;
        mimeType = imageFile?.mimeType || headerMedia?.mimeType || 'image/jpeg';
        fileName = imageFile?.fileName || headerMedia?.fileName || 'image.jpg';
      } else if (headerFormat === 'VIDEO') {
        const headerMedia = (template as any).headerMedia;
        mediaUrl = (template as any).videoUrl || headerMedia?.url;
        mimeType = headerMedia?.mimeType || 'video/mp4';
        fileName = headerMedia?.fileName || 'video.mp4';
      } else if (headerFormat === 'DOCUMENT') {
        const doc = (template as any).documents?.[0];
        mediaUrl = doc?.url;
        mimeType = doc?.mimeType || 'application/pdf';
        fileName = doc?.fileName || 'document.pdf';
      }
      
      if (mediaUrl) {
        console.log(`[META SUBMIT] Uploading ${headerFormat} to Meta: ${mediaUrl.substring(0, 50)}...`);
        
        // Get a signed URL if it's an S3 URL
        let downloadUrl = mediaUrl;
        if (mediaUrl.includes('s3.') || mediaUrl.includes('amazonaws.com')) {
          downloadUrl = await getPublicMediaUrl(mediaUrl);
        }
        
        const uploadResult = await uploadMediaToMeta(downloadUrl, mimeType, fileName);
        
        if (uploadResult.success && uploadResult.handle) {
          mediaHandle = uploadResult.handle;
          console.log(`[META SUBMIT] Media uploaded, handle: ${mediaHandle.substring(0, 30)}...`);
        } else {
          console.warn(`[META SUBMIT] Media upload failed: ${uploadResult.error}. Continuing without media header.`);
          // Continue without media header - Meta will still accept the template
        }
      }
    }

    // Convert to Meta format and submit
    const metaFormat = convertToMetaFormat({
      templateName: (template as any).templateName,
      category: (template as any).category,
      language: (template as any).language || 'en',
      templateContent: (template as any).templateContent,
      headerFormat: (template as any).headerFormat,
      headerContent: (template as any).headerContent,
      footerText: (template as any).footerText,
      buttons: (template as any).buttons,
      imageFile: (template as any).imageFile,
      documents: (template as any).documents,
      headerMedia: (template as any).headerMedia,
      videoUrl: (template as any).videoUrl,
    }, { mediaHandle });

    console.log('[META SUBMIT] Submitting template:', metaFormat.name);
    const result = await submitTemplateToMeta(metaFormat);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to submit template to Meta',
      }, { status: 400 });
    }

    // Update local template with Meta info
    const updated = await WhatsAppTemplate.findOneAndUpdate(
      { _id: templateId, ...tf },
      {
        $set: {
          metaTemplateId: result.metaTemplateId,
          metaTemplateName: metaFormat.name,
          status: 'pending_approval',
          metaStatus: result.status || 'PENDING',
          submittedToMetaAt: new Date(),
          submittedToMetaBy: decoded.userId,
        },
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Template submitted to Meta for approval',
      metaTemplateId: result.metaTemplateId,
      metaTemplateName: metaFormat.name,
      status: result.status,
      data: updated,
    });
  } catch (error) {
    console.error('[META SUBMIT] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to submit template';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
