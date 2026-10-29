/**
 * API Route: Update / Delete Investment (Admin CRM)
 * Backed strictly by Bunny Database (Edge SQL).
 * PUT    /api/admin/crm/investments/[id] - Update investment details
 * DELETE /api/admin/crm/investments/[id] - Delete investment
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import {
  updateInvestmentRecord,
  deleteInvestmentRecord,
  getInvestmentById,
} from '@/lib/bunnyInvestmentRepository';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : (request.cookies.get('adminToken')?.value || request.cookies.get('token')?.value || request.cookies.get('crm_token')?.value);

    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      name,
      investorName,
      phone,
      email,
      city,
      amount,
      totalInvestmentAmount,
      amountPaid,
      startDate,
      endDate,
      interestRate,
      annualDividendRatePct,
      status,
      paymentStatus,
      kycStatus,
    } = body;

    const updated = await updateInvestmentRecord(params.id, {
      investorName: (investorName || name || '').trim() || undefined,
      phone: (phone || '').trim() || undefined,
      email: (email || '').trim() || undefined,
      city: (city || '').trim() || undefined,
      totalInvestmentAmount: (totalInvestmentAmount || amount) !== undefined ? Number(totalInvestmentAmount || amount) : undefined,
      amountPaid: amountPaid !== undefined ? Number(amountPaid) : undefined,
      startDate,
      endDate,
      annualDividendRatePct: (annualDividendRatePct || interestRate) !== undefined ? Number(annualDividendRatePct || interestRate) : undefined,
      status,
      paymentStatus,
      kycStatus,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Investment updated successfully in Bunny Database',
        investment: updated,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating investment in Bunny:', error);
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
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : (request.cookies.get('adminToken')?.value || request.cookies.get('token')?.value || request.cookies.get('crm_token')?.value);

    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && decoded?.role !== 'admin' && decoded?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden: Superadmin/Admin role required to delete investments' }, { status: 403 });
    }

    const deleted = await deleteInvestmentRecord(params.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Investment not found or already deleted' }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Investment deleted successfully from Bunny Database',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting investment from Bunny:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete investment' },
      { status: 500 }
    );
  }
}
