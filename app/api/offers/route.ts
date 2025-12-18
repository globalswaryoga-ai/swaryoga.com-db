import { NextResponse } from 'next/server';
import { connectDB, Offer } from '@/lib/db';

// This route depends on MongoDB; ensure it's never pre-rendered at build time.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Get active offers for users
export async function GET() {
  try {
    await connectDB();

    // Get current date
    const now = new Date();

    // Find active offers that are valid for today
    const activeOffers = await Offer.find({
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(activeOffers || [], {
      status: 200,
      headers: {
        // Allow CDN caching while ensuring we don't bake DB data into build output.
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('Error fetching active offers:', error);
    // Return empty array on error instead of error response
    // This prevents blocking UI if database is temporarily unavailable
    return NextResponse.json([], {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60',
      },
    });
  }
}

