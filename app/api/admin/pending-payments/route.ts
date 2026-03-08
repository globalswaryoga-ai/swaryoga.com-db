import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getPendingPayment, getLead } from '@/lib/schemas/enterpriseSchemas';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

/**
 * GET /api/admin/pending-payments
 * Fetch all pending payments for admin approval (SUPERADMIN ONLY)
 */
export async function GET(req: NextRequest) {
  try {
    // Verify admin
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Only superadmins can see all pending payments
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json(
        { error: 'Access denied: Superadmin access required for payment data' },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const PendingPayment = getPendingPayment();

    const query: any = {};
    if (status !== 'all') {
      query.status = status;
    }

    const [payments, total] = await Promise.all([
      PendingPayment.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PendingPayment.countDocuments(query),
    ]);

    // Get stats
    const stats = await PendingPayment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: stats.reduce((acc, s) => {
        acc[s._id] = { count: s.count, totalAmount: s.totalAmount };
        return acc;
      }, {} as Record<string, { count: number; totalAmount: number }>),
    });
  } catch (error: any) {
    console.error('[GET /api/admin/pending-payments] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pending payments' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/pending-payments
 * Approve or reject a pending payment
 */
export async function PUT(req: NextRequest) {
  try {
    // Verify admin
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    const body = await req.json();
    const { paymentId, action, reason, notes } = body;

    if (!paymentId || !action) {
      return NextResponse.json({ error: 'paymentId and action required' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Use approve or reject' }, { status: 400 });
    }

    const PendingPayment = getPendingPayment();
    const Lead = getLead();

    const payment = await PendingPayment.findById(paymentId);
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.status !== 'pending') {
      return NextResponse.json({ error: `Payment already ${payment.status}` }, { status: 400 });
    }

    const adminName = decoded.name || decoded.email || decoded.userId || 'Admin';

    if (action === 'approve') {
      payment.status = 'approved';
      payment.approvedBy = adminName;
      payment.approvedAt = new Date();
      payment.adminNotes = notes || '';

      // Update lead status
      if (payment.linkedLeadId) {
        await Lead.findByIdAndUpdate(payment.linkedLeadId, {
          status: 'enrolled',
          $addToSet: { labels: 'nepal-paid' },
        });
      }

      // TODO: Add user to course/workshop access (implement course enrollment logic)

    } else if (action === 'reject') {
      payment.status = 'rejected';
      payment.rejectedBy = adminName;
      payment.rejectedAt = new Date();
      payment.rejectionReason = reason || '';
      payment.adminNotes = notes || '';
    }

    await payment.save();

    return NextResponse.json({
      success: true,
      message: `Payment ${action}d successfully`,
      payment: {
        _id: payment._id,
        status: payment.status,
        name: payment.name,
        productName: payment.productName,
        amount: payment.amount,
      },
    });
  } catch (error: any) {
    console.error('[PUT /api/admin/pending-payments] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update payment' },
      { status: 500 }
    );
  }
}
