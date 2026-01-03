import { NextRequest, NextResponse } from 'next/server';
import { connectDB, MediaPost } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/media
 * Public endpoint: returns only published media posts for the frontend Media page.
 *
 * Query params:
 * - limit: number (default 20, max 50)
 * - skip: number (default 0)
 * - category: string
 * - featured: 'true' | 'false'
 * - q: search string (title/description/tags)
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const category = searchParams.get('category')?.trim();
    const featured = searchParams.get('featured');
    const q = searchParams.get('q')?.trim();

    const query: any = { status: 'published' };

    if (category) query.category = category;
    if (featured === 'true') query.featured = true;
    if (featured === 'false') query.featured = false;

    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } },
      ];
    }

    const posts = await MediaPost.find(query)
      .sort({ pinnedOn: -1, publishedAt: -1, createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await MediaPost.countDocuments(query);

    return NextResponse.json(
      {
        success: true,
        data: {
          posts,
          total,
          limit,
          skip,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Error fetching public media posts:', error);
    return NextResponse.json({ error: 'Failed to fetch media posts' }, { status: 500 });
  }
}
