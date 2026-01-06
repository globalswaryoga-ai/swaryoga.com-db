import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';

/**
 * Debug endpoint to check which database has the leads
 * Use only for diagnosis - should be deleted before production
 */
export async function GET(request: NextRequest) {
  try {
    // Check if accessing is authorized (basic check)
    const token = request.headers.get('authorization');
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - provide Authorization header' },
        { status: 401 }
      );
    }

    await connectDB();

    const mainDb = mongoose.connection.db;
    const mainDbName = mainDb?.databaseName || 'unknown';

    // Try to get collection stats from main database
    const collections = await mainDb?.listCollections().toArray();
    const collectionNames = (collections || []).map((c: any) => c.name);
    
    // Count leads if collection exists
    let leadsCount = 0;
    if (collectionNames.includes('leads')) {
      const LeadCollection = mainDb?.collection('leads');
      leadsCount = await LeadCollection?.countDocuments() || 0;
    }

    return NextResponse.json(
      {
        currentDatabase: mainDbName,
        collections: collectionNames,
        leads_count: leadsCount,
        info: leadsCount === 0 
          ? 'WARNING: No leads found in current database! They may be in another database.'
          : `Found ${leadsCount} leads in ${mainDbName}`,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
