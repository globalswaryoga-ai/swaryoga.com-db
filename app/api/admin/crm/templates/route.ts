import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getWhatsAppTemplate } from '@/lib/schemas/enterpriseSchemas';
import { User } from '@/lib/db';
import { deleteTemplateFilesFromS3 } from '@/lib/aws-s3';
import mongoose from 'mongoose';

// Mark as dynamic since this route uses request.headers or request.url
export const dynamic = 'force-dynamic';


/**
 * WhatsApp message templates management
 * GET: Fetch templates
 * POST: Create template
 * PUT: Update template
 * DELETE: Delete template
 */

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const status = url.searchParams.get('status'); // draft, pending_approval, approved, rejected, disabled
    const limit = Math.min(Number(url.searchParams.get('limit') || 50) || 50, 200);
    const skip = Math.max(Number(url.searchParams.get('skip') || 0) || 0, 0);

    await connectDB();
    const WhatsAppTemplate = getWhatsAppTemplate();

    const filter: any = {};
    if (category) filter.category = category;
    if (status) filter.status = status;

    const templates = await WhatsAppTemplate.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await WhatsAppTemplate.countDocuments(filter);

    return NextResponse.json(
      { success: true, templates, total, data: { templates, total, limit, skip } },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch templates';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
      templateName,
      category,
      language,
      templateContent,
      bodyText,
      content,
      headerFormat,
      headerContent,
      footerText,
      buttons,
      headerMedia,
      variables,
      status,
      imageFile,
      documents,
      videoUrl,
    } = body;

    const resolvedTemplateContent = templateContent || bodyText || content;

    if (!templateName || !category || !resolvedTemplateContent) {
      return NextResponse.json(
        { error: 'Missing: templateName, category, templateContent' },
        { status: 400 }
      );
    }

    await connectDB();
    const WhatsAppTemplate = getWhatsAppTemplate();

    // WhatsAppTemplate schema expects createdBy as an ObjectId reference.
    // Our admin JWT contains decoded.userId (e.g., "admincrm") which is NOT an ObjectId.
    // Resolve it to a User._id.
    let createdBy: any = null;
    const decodedUserId = String(decoded?.userId || '').trim();
    const decodedEmail = String((decoded as any)?.email || '').trim();
    if (decodedUserId && mongoose.Types.ObjectId.isValid(decodedUserId)) {
      createdBy = new mongoose.Types.ObjectId(decodedUserId);
    } else {
      const userDoc: any =
        (decodedUserId ? await User.findOne({ userId: decodedUserId }).select('_id').lean() : null) ||
        (decodedEmail ? await User.findOne({ email: decodedEmail }).select('_id').lean() : null);
      createdBy = userDoc && userDoc._id ? new mongoose.Types.ObjectId(String(userDoc._id)) : null;
    }

    if (!createdBy) {
      return NextResponse.json(
        { error: 'Unable to resolve template creator (createdBy). Please login again.' },
        { status: 401 }
      );
    }

    const allowedStatuses = ['draft', 'pending_approval', 'approved', 'rejected', 'disabled'];
    const safeStatus = allowedStatuses.includes(status) ? status : 'draft';

    // If UI provided headerFormat+headerContent (URL), auto-derive headerMedia.
    // This is important because Cloud API template sending uses headerMedia.url,
    // while some UIs only store the URL in headerContent.
    const headerFormatNorm = String(headerFormat || '').trim().toUpperCase();
    const headerUrl = String(headerContent || '').trim();
    const derivedHeaderMedia =
      (headerFormatNorm === 'IMAGE' || headerFormatNorm === 'VIDEO') && headerUrl
        ? {
            kind: headerFormatNorm === 'VIDEO' ? 'video' : 'image',
            url: headerUrl,
          }
        : null;

    // Normalize buttons to schema: [{ title }]
    const normalizedButtons = Array.isArray(buttons)
      ? buttons
          .map((b: any) => {
            if (!b) return null;
            const title = String(b.title || b.label || b.text || '').trim();
            return title ? ({ title } as any) : null;
          })
          .filter(Boolean)
      : undefined;

    const template = await WhatsAppTemplate.create({
      templateName,
      category,
      language: language || 'en',
      templateContent: resolvedTemplateContent,
      headerFormat: headerFormat || undefined,
      headerContent: headerContent || undefined,
      footerText: footerText || undefined,
      buttons: normalizedButtons,
      headerMedia:
        (headerMedia && typeof headerMedia === 'object' ? headerMedia : null) ||
        derivedHeaderMedia ||
        undefined,
      variables: Array.isArray(variables) ? variables : [],
      status: safeStatus,
      createdBy,
      // New file fields
      imageFile: (imageFile && typeof imageFile === 'object') ? imageFile : undefined,
      documents: Array.isArray(documents) ? documents.filter((d: any) => d && typeof d === 'object') : [],
      videoUrl: videoUrl && typeof videoUrl === 'string' ? videoUrl.trim() : undefined,
    });

    return NextResponse.json({ success: true, data: template }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create template';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

  const { templateId, action, ...updates } = body;

    if (!templateId) {
      return NextResponse.json({ error: 'Missing: templateId' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(String(templateId))) {
      return NextResponse.json({ error: 'Invalid templateId' }, { status: 400 });
    }

    await connectDB();
    const WhatsAppTemplate = getWhatsAppTemplate();

    if (action === 'approve') {
      const template = await WhatsAppTemplate.findByIdAndUpdate(
        templateId,
        { $set: { status: 'approved', approvedBy: decoded.userId, approvalDate: new Date() } },
        { new: true }
      );
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: template }, { status: 200 });
    } else if (action === 'reject') {
      const template = await WhatsAppTemplate.findByIdAndUpdate(
        templateId,
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
    } else {
      // Generic update: keep schema consistent for header media + buttons.
      const headerFormatNorm = String((updates as any)?.headerFormat || '').trim().toUpperCase();
      const headerUrl = String((updates as any)?.headerContent || '').trim();
      const derivedHeaderMedia =
        (headerFormatNorm === 'IMAGE' || headerFormatNorm === 'VIDEO') && headerUrl
          ? {
              kind: headerFormatNorm === 'VIDEO' ? 'video' : 'image',
              url: headerUrl,
            }
          : null;

      if ((updates as any)?.headerMedia == null && derivedHeaderMedia) {
        (updates as any).headerMedia = derivedHeaderMedia;
      }

      if (Array.isArray((updates as any)?.buttons)) {
        (updates as any).buttons = (updates as any).buttons
          .map((b: any) => {
            if (!b) return null;
            const title = String(b.title || b.label || b.text || '').trim();
            return title ? ({ title } as any) : null;
          })
          .filter(Boolean);
      }

      // Handle file updates (imageFile, documents, videoUrl)
      // If imageFile is being updated, delete old file from S3
      if ((updates as any)?.imageFile !== undefined) {
        const oldTemplate = await WhatsAppTemplate.findById(templateId).lean();
        if (oldTemplate && (oldTemplate as any)?.imageFile?.url) {
          try {
            await deleteTemplateFilesFromS3([(oldTemplate as any).imageFile.url]);
          } catch (err) {
            console.warn('Failed to delete old image from S3:', err);
          }
        }
        // Validate new imageFile if provided
        if ((updates as any)?.imageFile && !(typeof (updates as any).imageFile === 'object')) {
          return NextResponse.json({ error: 'Invalid imageFile format' }, { status: 400 });
        }
      }

      // If documents are being updated, delete old documents from S3
      if ((updates as any)?.documents !== undefined) {
        const oldTemplate = await WhatsAppTemplate.findById(templateId).lean();
        if (oldTemplate && Array.isArray((oldTemplate as any)?.documents)) {
          const oldUrls = (oldTemplate as any).documents
            .map((d: any) => d?.url)
            .filter(Boolean);
          if (oldUrls.length > 0) {
            try {
              await deleteTemplateFilesFromS3(oldUrls);
            } catch (err) {
              console.warn('Failed to delete old documents from S3:', err);
            }
          }
        }
        // Validate new documents if provided
        if ((updates as any)?.documents && !Array.isArray((updates as any).documents)) {
          return NextResponse.json({ error: 'Invalid documents format' }, { status: 400 });
        }
        if (Array.isArray((updates as any)?.documents)) {
          (updates as any).documents = (updates as any).documents.filter(
            (d: any) => d && typeof d === 'object'
          );
        }
      }

      // Validate videoUrl if provided
      if ((updates as any)?.videoUrl !== undefined) {
        if ((updates as any)?.videoUrl && typeof (updates as any).videoUrl !== 'string') {
          return NextResponse.json({ error: 'Invalid videoUrl format' }, { status: 400 });
        }
      }

      // Generic update
      const template = await WhatsAppTemplate.findByIdAndUpdate(
        templateId,
        { $set: { ...updates, updatedAt: new Date() } },
        { new: true }
      );
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: template }, { status: 200 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update template';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const templateId = url.searchParams.get('templateId');

    if (!templateId) {
      return NextResponse.json({ error: 'templateId parameter required' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(templateId)) {
      return NextResponse.json({ error: 'Invalid templateId' }, { status: 400 });
    }

    await connectDB();

    // Get template before deleting to clean up S3 files
    const template = await WhatsAppTemplate.findById(templateId).lean();
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Delete files from S3
    const filesToDelete: string[] = [];
    if ((template as any)?.imageFile?.url) {
      filesToDelete.push((template as any).imageFile.url);
    }
    if (Array.isArray((template as any)?.documents)) {
      (template as any).documents.forEach((doc: any) => {
        if (doc?.url) {
          filesToDelete.push(doc.url);
        }
      });
    }

    if (filesToDelete.length > 0) {
      try {
        await deleteTemplateFilesFromS3(filesToDelete);
      } catch (err) {
        console.warn('Failed to delete template files from S3:', err);
      }
    }

    const result = await WhatsAppTemplate.findByIdAndDelete(templateId);

    if (!result) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { deleted: true } }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete template';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
