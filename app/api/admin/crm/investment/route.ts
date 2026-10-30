import { NextRequest, NextResponse } from 'next/server';
import {
  listAllInvestments,
  getInvestmentStats,
  setKYCStatus,
  recordRemainingPayment,
  getInvestmentById,
} from '@/lib/bunnyInvestmentRepository';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/admin/crm/investment
 * Admin View: Roster of all 150 investment slots, status, and stats
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : (request.cookies.get('adminToken')?.value || request.cookies.get('token')?.value || request.cookies.get('crm_token')?.value);

    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || undefined;
    const paymentStatus = searchParams.get('paymentStatus') || 'all';
    const kycStatus = searchParams.get('kycStatus') || 'all';
    const limit = parseInt(searchParams.get('limit') || '150', 10);
    const skip = parseInt(searchParams.get('skip') || '0', 10);

    const [stats, listData] = await Promise.all([
      getInvestmentStats(),
      listAllInvestments({ search, paymentStatus, kycStatus, limit, skip }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        stats,
        total: listData.total,
        investments: listData.investments,
        limit,
        skip,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/crm/investment:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/crm/investment
 * Admin: Approve/Reject KYC or Record Manual Payment
 */
export async function PATCH(request: NextRequest) {
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
    const { investmentId, action } = body;

    if (!investmentId) {
      return NextResponse.json({ error: 'investmentId is required' }, { status: 400 });
    }

    // 1. Approve KYC
    if (action === 'approve_kyc') {
      const updated = await setKYCStatus({
        investmentId,
        kycStatus: 'verified',
        verifiedBy: decoded.email || decoded.id || 'admin',
      });
      return NextResponse.json({
        success: true,
        data: updated,
        message: `✅ KYC for ${updated?.investorName} (${updated?.certificateNumber}) has been VERIFIED.`,
      });
    }

    // 2. Reject KYC
    if (action === 'reject_kyc') {
      const updated = await setKYCStatus({
        investmentId,
        kycStatus: 'rejected',
        verifiedBy: decoded.email || decoded.id || 'admin',
      });
      return NextResponse.json({
        success: true,
        data: updated,
        message: `⚠️ KYC for ${updated?.investorName} rejected. User will be notified to re-upload.`,
      });
    }

    // 3. Record Offline Payment (Cash, NEFT, Cheque)
    if (action === 'record_payment') {
      const { amount, txnid, paymentMethod = 'offline_bank_transfer' } = body;
      if (!amount || Number(amount) <= 0) {
        return NextResponse.json({ error: 'Valid payment amount is required' }, { status: 400 });
      }

      const updated = await recordRemainingPayment({
        investmentId,
        amountPaid: Number(amount),
        txnid: txnid || `MANUAL_${Date.now()}`,
        paymentMethod,
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: `✅ Offline payment of ₹${amount} recorded! Status: ${updated?.paymentStatus}.`,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('Error in PATCH /api/admin/crm/investment:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

