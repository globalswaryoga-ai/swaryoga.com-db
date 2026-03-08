/**
 * API Route: Get All Investments (for Admin CRM)
 * GET /api/admin/crm/investments
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { tenantFilter, getViewerUserId } from '@/lib/crm-handlers';
import { getInvestment } from '@/lib/schemas/investmentSchemas';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tf = tenantFilter(decoded, 'ownerId');

    await connectDB();

    const Investment = getInvestment();

    // Get all investments, sorted by newest first
    const investments = await Investment.find({ ...tf })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return NextResponse.json(
      {
        success: true,
        count: investments.length,
        investments,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching investments:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch investments' },
      { status: 500 }
    );
  }
}
