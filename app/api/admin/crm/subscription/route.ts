import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = decoded.userId as string;

    const subscription = {
      userId,
      currentPlan: 'golden',
      trialStartedAt: new Date(),
      trialEndsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), 
      trialDaysRemaining: 15,
      isTrialActive: true,
      status: 'active',
      leadsLimit: 999999,
      teamMembersLimit: 25,
      workflowsLimit: 999999,
      emailLimitPerMonth: 50000,
      storageIncludedGB: 50, 
      apiRequestsPerMonth: 500000,
      leadsCount: 0,
      teamMembersCount: 1,
      workflowsCount: 0,
    };

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

export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: true,
    subscription: { currentPlan: 'golden' },
  });
}
