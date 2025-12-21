import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { WhatsAppTemplate } from '@/lib/schemas/enterpriseSchemas';

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
    const status = url.searchParams.get('status'); // pending, approved, rejected
    const limit = Math.min(Number(url.searchParams.get('limit') || 50) || 50, 200);
    const skip = Math.max(Number(url.searchParams.get('skip') || 0) || 0, 0);

    await connectDB();

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
      { success: true, data: { templates, total, limit, skip } },
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

    const { templateName, category, headerText, bodyText, footerText, buttons } = body;

    if (!templateName || !category || !bodyText) {
      return NextResponse.json(
        { error: 'Missing: templateName, category, bodyText' },
        { status: 400 }
      );
    }

    await connectDB();

    const template = await WhatsAppTemplate.create({
      templateName,
      category,
      headerText,
      bodyText,
      footerText,
      buttons: buttons || [],
      status: 'pending',
      createdBy: decoded.userId,
      createdAt: new Date(),
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

    await connectDB();

    if (action === 'approve') {
      const template = await WhatsAppTemplate.findByIdAndUpdate(
        templateId,
        { $set: { status: 'approved', approvedAt: new Date(), approvedBy: decoded.userId } },
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
            rejectedBy: decoded.userId,
            rejectedAt: new Date(),
          },
        },
        { new: true }
      );
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: template }, { status: 200 });
    } else {
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

    await connectDB();

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
