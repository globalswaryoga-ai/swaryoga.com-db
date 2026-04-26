import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/crm/track-email
 * Track email sent and update subscription usage
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { getCRMSubscription } = await import('@/lib/db');
    const CRMSubscription = getCRMSubscription();

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = decoded.userId as string;
    const body = await request.json();
    const { count = 1 } = body;

    // Get current subscription
    let subscription = await CRMSubscription.findOne({ userId });
    if (!subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    }

    // Get email limit
    const emailLimit = subscription.emailLimitPerMonth;

    // Check if adding this would exceed limit
    const newTotal = subscription.emailsSentThisMonth + count;
    if (newTotal > emailLimit) {
      return NextResponse.json(
        {
          success: false,
          error: `Email limit exceeded. You have sent ${subscription.emailsSentThisMonth}/${emailLimit} emails this month.`,
          remaining: Math.max(0, emailLimit - subscription.emailsSentThisMonth),
        },
        { status: 429 }
      );
    }

    // Update subscription
    subscription = await CRMSubscription.findOneAndUpdate(
      { userId },
      {
        $inc: { emailsSentThisMonth: count },
        updatedAt: new Date(),
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      emailsSent: subscription.emailsSentThisMonth,
      emailLimit: emailLimit,
      remaining: emailLimit - subscription.emailsSentThisMonth,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to track email';
    console.error('Email tracking error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/admin/crm/track-email
 * Get email usage stats
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { getCRMSubscription } = await import('@/lib/db');
    const CRMSubscription = getCRMSubscription();

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = decoded.userId as string;
    const subscription = await CRMSubscription.findOne({ userId });

    if (!subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      emailsSent: subscription.emailsSentThisMonth,
      emailLimit: subscription.emailLimitPerMonth,
      remaining: subscription.emailLimitPerMonth - subscription.emailsSentThisMonth,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get email stats';
    console.error('Email stats error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
