/**
 * API: Manage and fetch Ritucharya dietary recommendations
 * GET  - Fetch recommendations by ritu and phase
 * POST - Create/Update recommendations (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import RituDietaryRecommendation from '@/lib/schemas/rituDietaryRecommendations';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const ritu = searchParams.get('ritu');
    const phase = searchParams.get('phase');

    if (!ritu || !phase) {
      return NextResponse.json(
        { error: 'Missing ritu or phase parameter' },
        { status: 400 }
      );
    }

    const recommendation = await RituDietaryRecommendation.findOne({
      ritu,
      phase,
    }).lean();

    if (!recommendation) {
      return NextResponse.json(
        {
          error: 'Recommendations not found',
          ritu,
          phase,
          suggestion: 'Returning default recommendations',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: recommendation,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[Dietary Recommendations API] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Auth check - admin only
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    await connectDB();
    const body = await req.json();

    const { ritu, phase, title, tasteRecommendations, avoidRecommendations, additionalNotes } = body;

    if (!ritu || !phase) {
      return NextResponse.json(
        { error: 'Missing ritu or phase' },
        { status: 400 }
      );
    }

    // Upsert: Create or update
    const recommendation = await RituDietaryRecommendation.findOneAndUpdate(
      { ritu, phase },
      {
        title,
        tasteRecommendations,
        avoidRecommendations,
        additionalNotes,
        updatedAt: new Date(),
      },
      { upsert: true, new: true, runValidators: true }
    );

    return NextResponse.json(
      {
        success: true,
        data: recommendation,
        message: `Recommendations for ${ritu} ${phase} saved successfully`,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[Dietary Recommendations API] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
