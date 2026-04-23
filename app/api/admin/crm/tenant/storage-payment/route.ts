import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { TenantTrial } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/crm/tenant/storage-payment
 * Process ₹50 storage payment on Day 2
 * Accepts payment intent ID from Razorpay/payment gateway
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { transactionId, method } = body;

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 });
    }

    await connectDB();

    // Update trial - mark storage payment as done
    const updatedTrial = await TenantTrial.findOneAndUpdate(
      { email: decoded.email },
      {
        $set: {
          storagePaymentPaid: true,
          storagePaymentDate: new Date(),
          day2PopupShown: true,
          lastActivityAt: new Date(),
        },
        $push: {
          paymentHistory: {
            date: new Date(),
            amount: 50,
            type: 'storage',
            method: method || 'razorpay',
            transactionId,
            status: 'completed',
          }
        }
      },
      { new: true }
    );

    if (!updatedTrial) {
      return NextResponse.json({ error: 'Trial not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: '₹50 storage payment completed',
      storagePaymentPaid: true,
      nextPopupAt: 'Day 10'
    });
  } catch (error: any) {
    console.error('[storage-payment]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/admin/crm/tenant/storage-payment/status
 * Check if storage payment has been made
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const trial = await TenantTrial.findOne({ email: decoded.email }).lean();
    if (!trial) {
      return NextResponse.json({
        storagePaymentPaid: false,
        message: 'Trial not found'
      });
    }

    return NextResponse.json({
      storagePaymentPaid: trial.storagePaymentPaid,
      storagePaymentDate: trial.storagePaymentDate,
      paymentHistory: trial.paymentHistory?.filter((p: any) => p.type === 'storage') || []
    });
  } catch (error: any) {
    console.error('[storage-payment GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
