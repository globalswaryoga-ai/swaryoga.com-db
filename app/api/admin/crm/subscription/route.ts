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

    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = decoded.userId as string;
    let subscription = await CRMSubscription.findOne({ userId }).lean();

    // If no subscription exists, create one with Basic plan defaults
    if (!subscription) {
      const newSub = {
        userId,
        currentPlan: 'basic',
        trialStartedAt: new Date(),
        trialEndsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days free trial for Basic only
        trialDaysRemaining: 15,
        isTrialActive: true,
        status: 'trial',
        // Basic plan limits: 1 user, 1000 leads, ₹499/month
        leadsLimit: 1000,
        teamMembersLimit: 1,
        workflowsLimit: 5,
        emailLimitPerMonth: 2000,
        storageIncludedGB: 1, // 1GB for basic
        apiRequestsPerMonth: 2000,
        // Usage tracking
        leadsCount: 0,
        teamMembersCount: 1,
        workflowsCount: 0,
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

    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = decoded.userId as string;
    const body = await request.json();
    const { currentPlan, autoRenewal } = body;

    const updates: any = {};
    if (currentPlan) {
      updates.currentPlan = currentPlan;

      // Set plan-specific limits - 5-tier structure
      const planLimits = {
        basic: {
          leadsLimit: 1000,
          teamMembersLimit: 1,
          workflowsLimit: 5,
          emailLimitPerMonth: 2000,
          storageIncludedGB: 1,
          apiRequestsPerMonth: 2000,
        },
        copper: {
          leadsLimit: 3000,
          teamMembersLimit: 3,
          workflowsLimit: 10,
          emailLimitPerMonth: 5000,
          storageIncludedGB: 5,
          apiRequestsPerMonth: 5000,
        },
        silver: {
          leadsLimit: 7500,
          teamMembersLimit: 10,
          workflowsLimit: 999999,
          emailLimitPerMonth: 10000,
          storageIncludedGB: 20,
          apiRequestsPerMonth: 50000,
        },
        golden: {
          leadsLimit: 999999,
          teamMembersLimit: 25,
          workflowsLimit: 999999,
          emailLimitPerMonth: 50000,
          storageIncludedGB: 50,
          apiRequestsPerMonth: 500000,
        },
        diamond: {
          leadsLimit: 999999,
          teamMembersLimit: 50,
          workflowsLimit: 999999,
          emailLimitPerMonth: 999999,
          storageIncludedGB: 500,
          apiRequestsPerMonth: 1000000,
        },
      };

      const limits = planLimits[currentPlan as keyof typeof planLimits] || planLimits.basic;
      Object.assign(updates, limits);
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
