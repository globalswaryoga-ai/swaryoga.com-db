/**
 * API route to get Meta Instant Form statistics
 * GET /api/meta-forms/stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = await connectDB();
    const crmDb = db.getDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const leadsCollection = crmDb.collection('leads');

    // Get time range filter
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7');
    const dateFilter = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const baseMatch = {
      source: 'meta_instant_form',
      createdAt: { $gte: dateFilter },
    };

    // Get stats concurrently
    const [totalLeads, byStatus, byWorkshop, byCampaign] = await Promise.all([
      leadsCollection.countDocuments({ source: 'meta_instant_form' }),
      leadsCollection
        .aggregate([
          { $match: baseMatch },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ])
        .toArray(),
      leadsCollection
        .aggregate([
          { $match: baseMatch },
          { $group: { _id: '$workshopName', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ])
        .toArray(),
      leadsCollection
        .aggregate([
          { $match: baseMatch },
          { $group: { _id: '$campaignName', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ])
        .toArray(),
    ]);

    const lastWeek = await leadsCollection.countDocuments({
      source: 'meta_instant_form',
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalLeads,
        lastWeek,
        byStatus: Object.fromEntries(byStatus.map(s => [s._id, s.count])),
        byWorkshop: Object.fromEntries(byWorkshop.map(w => [w._id, w.count])),
        byCampaign: Object.fromEntries(byCampaign.map(c => [c._id, c.count])),
      },
    });
  } catch (error) {
    console.error('Error fetching Meta form stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
