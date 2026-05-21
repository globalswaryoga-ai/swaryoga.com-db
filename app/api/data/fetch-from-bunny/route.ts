/**
 * API Route: Fetch data from Bunny CDN (Primary)
 * 
 * This endpoint allows your frontend to fetch data from Bunny
 * instead of directly querying MongoDB Atlas.
 * 
 * Benefits:
 * - Global CDN distribution (fast worldwide)
 * - Cheaper bandwidth
 * - Reduced Atlas load
 * - Better performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { BunnyStorageClient } from '@/lib/backup/bunny-client';

export async function GET(request: NextRequest) {
  try {
    const bunnyKey = process.env.BUNNY_STORAGE_KEY;
    if (!bunnyKey) {
      return NextResponse.json(
        { error: 'Bunny storage not configured' },
        { status: 500 }
      );
    }

    const bunny = new BunnyStorageClient(bunnyKey, 'backupmobgo');

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const collection = searchParams.get('collection');
    const query = searchParams.get('query');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!collection) {
      return NextResponse.json(
        { error: 'collection parameter required' },
        { status: 400 }
      );
    }

    // Fetch from Bunny (JSON file)
    const dataPath = `/data/${collection}.json`;
    
    try {
      const fileContent = await bunny.download(dataPath);
      const data = JSON.parse(fileContent.toString());

      // Apply filtering if query provided
      let filtered = data;
      if (query) {
        const queryLower = query.toLowerCase();
        filtered = data.filter((item: any) =>
          JSON.stringify(item).toLowerCase().includes(queryLower)
        );
      }

      // Apply limit
      const paginated = filtered.slice(0, limit);

      return NextResponse.json({
        success: true,
        collection,
        total: filtered.length,
        returned: paginated.length,
        data: paginated,
        source: 'Bunny CDN (Primary)',
      });

    } catch (error) {
      console.warn(`⚠️  Data not found in Bunny (${collection})`);
      
      return NextResponse.json({
        success: false,
        error: 'Data not available in primary storage',
      }, { status: 503 });
    }

  } catch (error) {
    console.error('Error fetching from Bunny:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
