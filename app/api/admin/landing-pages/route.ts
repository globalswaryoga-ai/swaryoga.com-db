import { NextRequest, NextResponse } from 'next/server';
import { connectDB, LandingPage } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';


// GET - List all landing pages
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    const filter: any = {};

    // Scope by ownerId for non-superadmins
    if (!isSuperAdmin(decoded)) {
      const viewerId = getViewerUserId(decoded);
      if (viewerId) {
        filter.$or = [
          { ownerId: viewerId },
          { createdBy: viewerId },
          { createdByUserId: viewerId },
        ];
      }
    }

    if (status && status !== 'all') {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { heroHeading: { $regex: search, $options: 'i' } },
      ];
    }

    const [pages, total] = await Promise.all([
      LandingPage.find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      LandingPage.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: pages,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Landing Pages GET]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch landing pages' },
      { status: 500 }
    );
  }
}

// POST - Create new landing page
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.name || !body.slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    // Sanitize slug
    const slug = body.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    await connectDB();

    // Check if slug exists
    const existing = await LandingPage.findOne({ slug });
    if (existing) {
      return NextResponse.json({ error: 'A landing page with this slug already exists' }, { status: 400 });
    }

    const landingPage = await LandingPage.create({
      ...body,
      slug,
      ownerId: getViewerUserId(decoded),
      createdBy: decoded.userId || decoded.username || 'admin',
      updatedBy: decoded.userId || decoded.username || 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, data: landingPage }, { status: 201 });
  } catch (error) {
    console.error('[Landing Pages POST]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create landing page' },
      { status: 500 }
    );
  }
}

// PUT - Update landing page
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'Landing page ID is required' }, { status: 400 });
    }

    await connectDB();

    // If slug is being updated, check for duplicates
    if (body.slug) {
      const slug = body.slug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      const existing = await LandingPage.findOne({ slug, _id: { $ne: body.id } });
      if (existing) {
        return NextResponse.json({ error: 'A landing page with this slug already exists' }, { status: 400 });
      }
      body.slug = slug;
    }

    const { id, ...updateData } = body;
    updateData.updatedBy = decoded.userId || decoded.username || 'admin';
    updateData.updatedAt = new Date();

    const landingPage = await LandingPage.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).lean();

    if (!landingPage) {
      return NextResponse.json({ error: 'Landing page not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: landingPage });
  } catch (error) {
    console.error('[Landing Pages PUT]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update landing page' },
      { status: 500 }
    );
  }
}

// DELETE - Delete landing page
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Landing page ID is required' }, { status: 400 });
    }

    await connectDB();

    const result = await LandingPage.findByIdAndDelete(id);
    if (!result) {
      return NextResponse.json({ error: 'Landing page not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Landing page deleted' });
  } catch (error) {
    console.error('[Landing Pages DELETE]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete landing page' },
      { status: 500 }
    );
  }
}
