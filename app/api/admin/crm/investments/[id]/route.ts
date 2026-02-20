/**
 * API Route: Update/Delete Investment
 * PUT /api/admin/crm/investments/[id] - Update investment
 * DELETE /api/admin/crm/investments/[id] - Delete investment
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getInvestment } from '@/lib/schemas/investmentSchemas';
import { verifyToken } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check permissions - CS, CA, Admin can edit
    if (!['admin', 'CS', 'CA'].includes(decoded.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to edit investments' },
        { status: 403 }
      );
    }

    await connectDB();

    const Investment = getInvestment();
    const body = await request.json();

    const {
      entity,
      name,
      phone,
      amount,
      numberOfShares,
      shareType,
      sharePrice,
      interestRate,
      startDate,
      endDate,
      paidDividend,
      pendingDividend,
      leadId,
    } = body;

    // Find and update investment
    const investment = await Investment.findByIdAndUpdate(
      params.id,
      {
        entity,
        name,
        phone,
        amount,
        numberOfShares,
        shareType,
        sharePrice,
        interestRate,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        paidDividend: paidDividend || 0,
        pendingDividend: pendingDividend || 0,
        leadId,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!investment) {
      return NextResponse.json(
        { error: 'Investment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Investment updated successfully',
        investment,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating investment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update investment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check permissions - Only Admin can delete
    if (decoded.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to delete investments' },
        { status: 403 }
      );
    }

    await connectDB();

    const Investment = getInvestment();

    const investment = await Investment.findByIdAndDelete(params.id);

    if (!investment) {
      return NextResponse.json(
        { error: 'Investment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Investment deleted successfully',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting investment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete investment' },
      { status: 500 }
    );
  }
}
