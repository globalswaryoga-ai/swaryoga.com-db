/**
 * API Route: Get All Investments (for Admin CRM)
 * GET /api/admin/crm/investments
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getInvestment } from '@/lib/schemas/investmentSchemas';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const Investment = getInvestment();

    // Get all investments, sorted by newest first
    const investments = await Investment.find({})
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
