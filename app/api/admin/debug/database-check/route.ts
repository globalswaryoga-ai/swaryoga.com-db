import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to check which database has the leads
 * SUPERADMIN ONLY - exposes database internals
 */
export async function GET(request: NextRequest) {
  try {
    // Verify with proper token verification
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice('Bearer '.length);
    const decoded = verifyToken(token);
    
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    // Only superadmins can access debug endpoints
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json(
        { error: 'Access denied: Superadmin access required for debug endpoints' },
        { status: 403 }
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
