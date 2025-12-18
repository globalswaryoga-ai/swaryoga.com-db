// app/api/offers/route.ts (OPTIMIZED VERSION)
import { NextResponse, NextRequest } from 'next/server';
import { connectDB, Offer } from '@/lib/db';
import { cacheManager } from '@/lib/cacheManager';
import { isRateLimited } from '@/lib/rateLimit';

export const revalidate = 300; // Revalidate every 5 minutes (ISR)

/**
 * GET /api/offers
 * Returns active offers with caching and rate limiting
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    if (!isRateLimited(ip, { max: 100, windowMs: 60000 })) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // Check cache first
    const cachedOffers = cacheManager.get('active_offers');
    if (cachedOffers) {
      return NextResponse.json(
        { data: cachedOffers, cached: true },
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, max-age=300',
            'X-Cache': 'HIT',
          },
        }
      );
    }

    // Fetch from database with optimization
    await connectDB();

    const now = new Date();
    const activeOffers = await Offer.find(
      {
        isActive: true,
        validFrom: { $lte: now },
        validUntil: { $gte: now },
      },
      // Only select necessary fields
      { _id: 1, title: 1, description: 1, discount: 1, code: 1, validUntil: 1 }
    )
      .lean() // Return plain objects (faster)
      .sort({ createdAt: -1 })
      .limit(20); // Limit results for performance

    // Cache for 5 minutes
    cacheManager.set('active_offers', activeOffers, 5 * 60 * 1000);

    return NextResponse.json(
      { data: activeOffers, cached: false },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
          'X-Cache': 'MISS',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching offers:', error);

    // Return cached data on error if available
    const fallback = cacheManager.get('active_offers');
    return NextResponse.json(
      { data: fallback || [], error: 'Failed to fetch offers', cached: true },
      {
        status: 200, // Return 200 to prevent client errors
        headers: {
          'Cache-Control': 'public, max-age=60',
          'X-Cache': 'FALLBACK',
        },
      }
    );
  }
}
