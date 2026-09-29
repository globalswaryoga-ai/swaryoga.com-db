import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getTemplateById, updateTemplate, deleteTemplate } from '@/lib/bunnyTemplatesRepository';
import { deleteTemplateFilesFromS3 } from '@/lib/bunny-storage';

export const dynamic = 'force-dynamic';

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

    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    const template = await getTemplateById(id);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: template }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch template';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { action, ...updates } = body;

    if (action === 'approve') {
      const template = await updateTemplate(id, { status: 'approved', approvedBy: decoded.userId, approvalDate: new Date() });
      if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      return NextResponse.json({ success: true, data: template }, { status: 200 });
    }

    if (action === 'reject') {
      const template = await updateTemplate(id, {
        status: 'rejected',
        rejectionReason: updates.rejectionReason || 'No reason provided',
        rejectionDate: new Date(),
      });
      if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      return NextResponse.json({ success: true, data: template }, { status: 200 });
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

    const template = await updateTemplate(id, { ...updates, updatedAt: new Date() });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: template }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update template';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PUT(request, context);
}

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

    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    const template = await getTemplateById(id);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Delete associated S3 files
    try {
      const filesToDelete: string[] = [];
      if ((template as any)?.imageFile?.url) {
        filesToDelete.push((template as any).imageFile.url);
      }
      if (Array.isArray((template as any)?.documents)) {
        (template as any).documents.forEach((doc: any) => {
          if (doc?.url) filesToDelete.push(doc.url);
        });
      }

      if (filesToDelete.length > 0) {
        await deleteTemplateFilesFromS3(filesToDelete);
      }
    } catch (s3Error) {
      console.warn('[Template Delete] S3 cleanup warning:', s3Error);
    }

    await deleteTemplate(id);

    return NextResponse.json({ success: true, message: 'Template deleted' }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete template';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
