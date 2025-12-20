import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Session, Purchase, ViewTracking } from '@/lib/schemas/recordedSessionsSchemas';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/sessions
 * List all published sessions with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const category = searchParams.get('category');
    const level = searchParams.get('level');
    const search = searchParams.get('search');

    let query: any = { is_published: true };

    if (category) query.category = category;
    if (level) query.level = level;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const sessions = await Session.find(query)
      .select(
        'title description category level instructor duration thumbnail price average_rating views tags is_featured'
      )
      .sort({ is_featured: -1, created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Session.countDocuments(query);

    return NextResponse.json(
      {
        success: true,
        data: sessions,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      { status: 200, headers: { 'Cache-Control': 'public, s-maxage=300' } }
    );
  } catch (error: any) {
    console.error('GET /api/sessions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/sessions
 * Create new session (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token || "");

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    const body = await request.json();

    // Validate required fields
    const required = ['title', 'description', 'category', 'instructor', 'duration', 'video_url', 'thumbnail', 'price'];
    const missing = required.filter((field) => !body[field]);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    const session = await Session.create({
      ...body,
      views: 0,
      total_reviews: 0,
      average_rating: 0,
    });

    return NextResponse.json(
      { success: true, data: session },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('POST /api/sessions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
