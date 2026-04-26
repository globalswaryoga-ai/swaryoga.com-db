import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { tenantFilter, getViewerUserId } from '@/lib/crm-handlers';
import { getWhatsAppTemplate } from '@/lib/schemas/enterpriseSchemas';
import { deleteTemplateFilesFromS3 } from '@/lib/bunny-storage';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';


/**
 * GET /api/admin/crm/templates/[id]
 * Fetch a single template by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tf = tenantFilter(decoded, 'createdBy');

    const { id } = await params;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    await connectDB();
    const WhatsAppTemplate = getWhatsAppTemplate();

    const template = await WhatsAppTemplate.findOne({ _id: id, ...tf }).lean();
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: template }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch template';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/crm/templates/[id]
 * Update a template by ID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tf = tenantFilter(decoded, 'createdBy');

    const { id } = await params;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    await connectDB();
    const WhatsAppTemplate = getWhatsAppTemplate();

    const { action, ...updates } = body;

    // Handle special actions
    if (action === 'approve') {
      const template = await WhatsAppTemplate.findOneAndUpdate(
        { _id: id, ...tf },
        { $set: { status: 'approved', approvedBy: decoded.userId, approvalDate: new Date() } },
        { new: true }
      );
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: template }, { status: 200 });
    }

    if (action === 'reject') {
      const template = await WhatsAppTemplate.findOneAndUpdate(
        { _id: id, ...tf },
        {
          $set: {
            status: 'rejected',
            rejectionReason: updates.rejectionReason || 'No reason provided',
            rejectionDate: new Date(),
          },
        },
        { new: true }
      );
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: template }, { status: 200 });
    }

    // Generic update
    const headerFormatNorm = String(updates?.headerFormat || '').trim().toUpperCase();
    const headerUrl = String(updates?.headerContent || '').trim();
    const derivedHeaderMedia =
      (headerFormatNorm === 'IMAGE' || headerFormatNorm === 'VIDEO') && headerUrl
        ? { kind: headerFormatNorm === 'VIDEO' ? 'video' : 'image', url: headerUrl }
        : null;

    if (updates?.headerMedia == null && derivedHeaderMedia) {
      updates.headerMedia = derivedHeaderMedia;
    }

    // Normalize buttons preserving type, url, phoneNumber
    if (Array.isArray(updates?.buttons)) {
      updates.buttons = updates.buttons
        .map((b: any) => {
          if (!b || typeof b !== 'object') return null;
          const title = String(b.title || '').trim();
          if (!title) return null;
          const buttonObj: any = { title };
          if (b.type) buttonObj.type = String(b.type).toUpperCase();
          if (b.url) buttonObj.url = String(b.url).trim();
          if (b.phoneNumber) buttonObj.phoneNumber = String(b.phoneNumber).trim();
          return buttonObj;
        })
        .filter(Boolean);
    }

    // Handle templateContent alias
    if (updates.bodyText && !updates.templateContent) {
      updates.templateContent = updates.bodyText;
      delete updates.bodyText;
    }
    if (updates.content && !updates.templateContent) {
      updates.templateContent = updates.content;
      delete updates.content;
    }

    const template = await WhatsAppTemplate.findOneAndUpdate(
      { _id: id, ...tf },
      { $set: { ...updates, updatedAt: new Date() } },
      { new: true }
    );

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: template }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update template';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/crm/templates/[id]
 * Partial update a template by ID (alias for PUT)
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // PATCH is treated the same as PUT for partial updates
  return PUT(request, context);
}

/**
 * DELETE /api/admin/crm/templates/[id]
 * Delete a template by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tf = tenantFilter(decoded, 'createdBy');

    const { id } = await params;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    await connectDB();
    const WhatsAppTemplate = getWhatsAppTemplate();

    const template = await WhatsAppTemplate.findOne({ _id: id, ...tf });
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Delete associated S3 files
    try {
      await deleteTemplateFilesFromS3(template as any);
    } catch (s3Error) {
      console.warn('[Template Delete] S3 cleanup warning:', s3Error);
      // Continue with deletion even if S3 cleanup fails
    }

    await WhatsAppTemplate.deleteOne({ _id: id, ...tf });

    return NextResponse.json({ success: true, message: 'Template deleted' }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete template';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/crm/templates/[id]
 * Not supported - return 405 with helpful message
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Method Not Allowed. Use PUT or PATCH to update templates, or POST to /api/admin/crm/templates to create new ones.' },
    { status: 405 }
  );
}
