/**
 * API route to get Meta Instant Form statistics using Bunny Database
 * GET /api/meta-forms/stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7');
    const dateFilter = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const lastWeekDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const allLeads = await loadBunnyLeads();
    const metaLeads = allLeads.filter(l => l.source === 'meta_instant_form' || l.source === 'meta_forms' || l.source === 'facebook');

    const totalLeads = metaLeads.length;
    const inRange = metaLeads.filter(l => new Date(l.createdAt || 0) >= dateFilter);
    const lastWeek = metaLeads.filter(l => new Date(l.createdAt || 0) >= lastWeekDate).length;

    const byStatus: Record<string, number> = {};
    const byWorkshop: Record<string, number> = {};
    const byCampaign: Record<string, number> = {};

    for (const lead of inRange) {
      const st = String(lead.status || 'new');
      byStatus[st] = (byStatus[st] || 0) + 1;

      const ws = String(lead.workshopName || 'Unspecified');
      byWorkshop[ws] = (byWorkshop[ws] || 0) + 1;

      const cp = String(lead.campaignName || lead.campaign || 'Direct');
      byCampaign[cp] = (byCampaign[cp] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalLeads,
        lastWeek,
        byStatus,
        byWorkshop,
        byCampaign,
      },
    });
  } catch (error) {
    console.error('Error fetching Meta form stats from Bunny DB:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
