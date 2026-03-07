import { NextRequest, NextResponse } from 'next/server';
import { connectDB, LandingPage } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Fetch public landing page by slug
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const { searchParams } = new URL(request.url);
    const preview = searchParams.get('preview') === 'true';

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    await connectDB();

    // Allow preview of draft pages (for admins)
    const query: any = { slug: slug.toLowerCase() };
    if (!preview) {
      query.status = 'published';
    }

    const landingPage = await LandingPage.findOneAndUpdate(
      query,
      { $inc: { views: preview ? 0 : 1 } }, // Don't count preview views
      { new: true }
    ).lean();

    if (!landingPage) {
      return NextResponse.json({ error: 'Landing page not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: landingPage });
  } catch (error) {
    console.error('[Landing Page GET]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch landing page' },
      { status: 500 }
    );
  }
}
