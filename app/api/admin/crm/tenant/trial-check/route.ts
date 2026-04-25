import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { TenantTrial } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';


/**
 * GET /api/admin/crm/tenant/trial-check
 * Check trial status, return popup info needed
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
        hasActiveTrial: false,
        popup: null
      });
    }

    const now = new Date();
    const trialEnd = new Date(trial.trialStartDate);
    trialEnd.setDate(trialEnd.getDate() + 15);

    const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const daysSinceStart = Math.ceil((now.getTime() - new Date(trial.trialStartDate).getTime()) / (1000 * 60 * 60 * 24));

    // Determine which popup to show
    let popup = null;

    // Day 2: Storage payment popup
    if (daysSinceStart >= 2 && !trial.day2PopupShown && !trial.storagePaymentPaid) {
      popup = {
        type: 'storage-payment',
        title: '💾 Storage Payment Required',
        message: 'Pay ₹50 for 1GB monthly storage to continue your free trial',
        amount: 50,
        days: 'Day 2',
        action: 'Pay Now'
      };
    }
    // Day 10: Payment or Demo popup
    else if (daysSinceStart >= 10 && !trial.day10PopupShown && daysRemaining > 0) {
      popup = {
        type: 'upgrade-offer',
        title: '🎉 Upgrade Your Plan',
        message: `Your free trial ends in ${daysRemaining} days. Choose a plan or book a demo.`,
        days: 'Day 10',
        actions: ['Upgrade to Paid', 'Book Demo']
      };
    }
    // Day 15: Access blocked
    else if (daysRemaining <= 0 && trial.status !== 'converted-to-paid') {
      popup = {
        type: 'trial-expired',
        title: '⏰ Free Trial Expired',
        message: 'Your free trial has ended. Upgrade to continue using the platform.',
        days: 'Day 15+',
        action: 'Upgrade Now'
      };
    }

    return NextResponse.json({
      hasActiveTrial: true,
      trial: {
        trialStartDate: trial.trialStartDate,
        trialEndDate: trialEnd,
        daysRemaining,
        daysSinceStart,
        storagePaymentPaid: trial.storagePaymentPaid,
        status: trial.status,
        qrWhatsAppNumber: trial.qrWhatsAppNumber,
      },
      popup
    });
  } catch (error: any) {
    console.error('[trial-check]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
