import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/subscription
 * Fetch current user's subscription status
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { getCRMSubscription } = await import('@/lib/db');
    const CRMSubscription = getCRMSubscription();

    // Get user from token
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = decoded.userId as string;
    let subscription = await CRMSubscription.findOne({ userId }).lean();

    // If no subscription exists, create one
    if (!subscription) {
      const newSub = {
        userId,
        currentPlan: 'basic',
        trialStartedAt: new Date(),
        trialEndsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        trialDaysRemaining: 15,
        isTrialActive: true,
        status: 'trial',
        emailLimitPerMonth: 1000,
        storageIncludedGB: 5,
      };

      const created = await CRMSubscription.create(newSub);
      subscription = created.toObject();
    }

    // Check if trial has expired
    if (subscription.isTrialActive && subscription.trialEndsAt) {
      const now = new Date();
      if (now > subscription.trialEndsAt) {
        // Trial expired - mark as expired
        await CRMSubscription.updateOne(
          { userId },
          {
            isTrialActive: false,
            status: 'expired',
            trialDaysRemaining: 0,
          }
        );
        subscription.isTrialActive = false;
        subscription.status = 'expired';
        subscription.trialDaysRemaining = 0;
      } else {
        // Calculate remaining days
        const daysRemaining = Math.ceil(
          (subscription.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (subscription.trialDaysRemaining !== daysRemaining) {
          await CRMSubscription.updateOne({ userId }, { trialDaysRemaining: daysRemaining });
          subscription.trialDaysRemaining = daysRemaining;
        }
      }
    }

    // Reset email count if it's a new month
    if (subscription.lastEmailResetDate) {
      const lastReset = new Date(subscription.lastEmailResetDate);
      const now = new Date();
      if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
        await CRMSubscription.updateOne(
          { userId },
          {
            emailsSentThisMonth: 0,
            lastEmailResetDate: now,
          }
        );
        subscription.emailsSentThisMonth = 0;
        subscription.lastEmailResetDate = now;
      }
    }

    return NextResponse.json({
      success: true,
      subscription,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch subscription';
    console.error('Subscription fetch error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/crm/subscription
 * Update subscription (upgrade plan, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { getCRMSubscription } = await import('@/lib/db');
    const CRMSubscription = getCRMSubscription();

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = decoded.userId as string;
    const body = await request.json();
    const { currentPlan, autoRenewal } = body;

    const updates: any = {};
    if (currentPlan) {
      updates.currentPlan = currentPlan;
      // Update email limit based on plan
      const emailLimits = {
        basic: 1000,
        professional: 5000,
        enterprise: 999999, // Unlimited
      };
      updates.emailLimitPerMonth = emailLimits[currentPlan as keyof typeof emailLimits] || 1000;
    }
    if (typeof autoRenewal === 'boolean') {
      updates.autoRenewal = autoRenewal;
    }

    const subscription = await CRMSubscription.findOneAndUpdate(
      { userId },
      { ...updates, updatedAt: new Date() },
      { new: true }
    ).lean();

    return NextResponse.json({
      success: true,
      subscription,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update subscription';
    console.error('Subscription update error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
