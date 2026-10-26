/**
 * API route to fetch Meta Instant Form leads from Bunny Database
 * GET /api/meta-forms/leads
 * PUT /api/meta-forms/leads
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadBunnyLeads, invalidateBunnyLeadsCache } from '@/lib/bunnyLeadsRepository';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const workshopId = searchParams.get('workshopId');
    const status = searchParams.get('status');

    const allLeads = await loadBunnyLeads();
    let filtered = allLeads.filter(l => l.source === 'meta_instant_form' || l.source === 'meta_forms' || l.source === 'facebook');

    if (workshopId) {
      filtered = filtered.filter(l => String(l.workshopId || '') === workshopId);
    }
    if (status) {
      filtered = filtered.filter(l => String(l.status || '') === status);
    }

    filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      leads: paginated,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching Meta form leads from Bunny DB:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, status, assignedTo, tags } = body;

    if (!leadId) {
      return NextResponse.json({ error: 'leadId required' }, { status: 400 });
    }

    const res = await bunnyExecute({
      sql: 'SELECT document_id, data_json FROM leads_sql WHERE document_id = ? LIMIT 1',
      args: [leadId]
    });

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const currentData = JSON.parse(String(res.rows[0].data_json || '{}'));
    if (status) currentData.status = status;
    if (assignedTo) {
      currentData.assignedToUserId = assignedTo;
      currentData.assignedAt = new Date().toISOString();
    }
    if (tags) currentData.labels = tags;
    currentData.updatedAt = new Date().toISOString();

    await bunnyExecute({
      sql: 'UPDATE leads_sql SET data_json = ?, updated_at = ? WHERE document_id = ?',
      args: [JSON.stringify(currentData), currentData.updatedAt, leadId]
    });

    invalidateBunnyLeadsCache();

    return NextResponse.json({
      success: true,
      message: 'Lead updated successfully in Bunny Database',
    });
  } catch (error) {
    console.error('Error updating lead in Bunny DB:', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}
