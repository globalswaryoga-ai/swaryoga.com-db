/**
 * API route to fetch Meta Instant Form leads from CRM
 * GET /api/meta-forms/leads
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  try {
    // Verify authentication (optional - remove if public)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = await connectDB();
    const crmDb = db.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const leadsCollection = crmDb.collection('leads');

    // Get pagination params
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Get workshop filter
    const workshopId = searchParams.get('workshopId');
    const status = searchParams.get('status');

    // Build filter
    const filter: any = { source: 'meta_instant_form' };
    if (workshopId) {
      filter.workshopId = new ObjectId(workshopId);
    }
    if (status) {
      filter.status = status;
    }

    // Fetch leads
    const [leads, total] = await Promise.all([
      leadsCollection
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .toArray(),
      leadsCollection.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      leads: leads.map(lead => ({
        ...lead,
        _id: lead._id.toString(),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching Meta form leads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/meta-forms/leads
 * Update lead status or assignment
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, status, assignedTo, tags } = body;

    if (!leadId) {
      return NextResponse.json(
        { error: 'leadId required' },
        { status: 400 }
      );
    }

    const db = await connectDB();
    const crmDb = db.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const leadsCollection = crmDb.collection('leads');

    const updateData: any = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (assignedTo) {
      updateData.assignedTo = assignedTo;
      updateData.assignedAt = new Date();
    }
    if (tags) updateData.tags = tags;

    const result = await leadsCollection.updateOne(
      { _id: new ObjectId(leadId) } as any,
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Lead updated successfully',
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json(
      { error: 'Failed to update lead' },
      { status: 500 }
    );
  }
}
