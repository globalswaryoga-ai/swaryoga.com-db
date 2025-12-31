import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { RecordedWorkshop } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/admin/workshops/recorded
 * Fetch all recorded workshops (paginated)
 * Query params: limit (default 50), skip (default 0), language, status, search
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    await connectDB();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const skip = parseInt(searchParams.get('skip') || '0');
    const language = searchParams.get('language');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Build query
    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { workshopSlug: { $regex: search, $options: 'i' } },
        { instructorName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Fetch paginated results
    const workshops = await RecordedWorkshop.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Count total
    const total = await RecordedWorkshop.countDocuments(query);

    // Process workshops to include language-specific data
    const processedWorkshops = workshops.map((ws: any) => {
      // If language filter is applied, return only that language variant
      if (language && ws.languages[language]) {
        return {
          ...ws,
          selectedLanguage: language,
          languageData: ws.languages[language],
          price: ws.pricing[language] || 0,
        };
      }

      // Return all languages
      return ws;
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          workshops: processedWorkshops,
          total,
          limit,
          skip,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Error fetching recorded workshops:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recorded workshops' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/workshops/recorded
 * Create a new recorded workshop
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    // Validate required fields
    if (!body.workshopSlug || !body.title || !body.instructorName) {
      return NextResponse.json(
        { error: 'Missing required fields: workshopSlug, title, instructorName' },
        { status: 400 }
      );
    }

    // Check if workshop already exists
    const existing = await RecordedWorkshop.findOne({ workshopSlug: body.workshopSlug });
    if (existing) {
      return NextResponse.json(
        { error: `Workshop with slug "${body.workshopSlug}" already exists` },
        { status: 409 }
      );
    }

    // Create new workshop
    const workshop = await RecordedWorkshop.create({
      workshopSlug: body.workshopSlug,
      title: body.title,
      instructorName: body.instructorName,
      description: body.description,
      instructorImage: body.instructorImage,
      languages: body.languages || {
        hindi: {},
        english: {},
        marathi: {},
      },
      pricing: body.pricing || {
        hindi: 0,
        english: 0,
        marathi: 0,
      },
      currency: body.currency || 'INR',
      accessControl: body.accessControl || {
        deviceLimit: 3,
        gapHours: 24,
        requiresDeviceFingerprint: true,
        maxDownloadsPerUser: 0,
      },
      thumbnailUrl: body.thumbnailUrl,
      duration: body.duration,
      status: body.status || 'draft',
      metadata: body.metadata,
    });

    console.log(`✅ Recorded workshop created: ${workshop.workshopSlug}`);

    return NextResponse.json(
      {
        success: true,
        data: workshop,
        message: 'Workshop created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ Error creating recorded workshop:', error);
    return NextResponse.json(
      { error: 'Failed to create recorded workshop' },
      { status: 500 }
    );
  }
}
