import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getWhatsAppTemplate } from '@/lib/schemas/enterpriseSchemas';
import { deleteTemplateFilesFromS3 } from '@/lib/aws-s3';
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
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    await connectDB();
    const WhatsAppTemplate = getWhatsAppTemplate();

    const template = await WhatsAppTemplate.findById(id).lean();
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
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      const template = await WhatsAppTemplate.findByIdAndUpdate(
        id,
        { $set: { status: 'approved', approvedBy: decoded.userId, approvalDate: new Date() } },
        { new: true }
      );
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: template }, { status: 200 });
    }

    if (action === 'reject') {
      const template = await WhatsAppTemplate.findByIdAndUpdate(
        id,
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

    if (Array.isArray(updates?.buttons)) {
      updates.buttons = updates.buttons
        .map((b: any) =>
          b && typeof b === 'object' ? { title: String(b.title || '').trim() || 'Button' } : null
        )
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

    const template = await WhatsAppTemplate.findByIdAndUpdate(
      id,
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
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    await connectDB();
    const WhatsAppTemplate = getWhatsAppTemplate();

    const template = await WhatsAppTemplate.findById(id);
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

    await WhatsAppTemplate.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Template deleted' }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete template';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
