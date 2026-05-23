/**
 * Admin API: Manage Ritucharya Dietary Recommendations
 * GET - Fetch all recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import RituDietaryRecommendation from '@/lib/schemas/rituDietaryRecommendations';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
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

    const recommendations = await RituDietaryRecommendation.find().lean();

    return NextResponse.json(
      {
        success: true,
        data: recommendations,
        count: recommendations.length,
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
