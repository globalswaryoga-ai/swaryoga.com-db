import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getUserCompartment } from '@/lib/schemas/enterpriseSchemas';
import {
  PlanTier,
  PLAN_LIMITS,
  PLAN_MODULES,
  TRIAL_CONFIG,
  isInTrial,
  getTrialDaysRemaining,
} from '@/lib/crm-site/planConfig';
import { resolveTenantPlanAccess } from '@/lib/crm-site/tenantPlanAccess';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

function json(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders });
}

/**
 * GET /api/crm-site/plan
 * 
 * Returns complete plan info for the current user:
 * - Current plan tier + limits + modules
 * - Trial status + days remaining
 * - Usage (leads, users, storage, chatbot flows)
 * - Subscription status
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const decoded = verifyToken(token);

    if (!decoded) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const isSuperAdmin = decoded.role === 'superadmin' ||
                         decoded.userId === 'admincrm' ||
                         decoded.userId === 'admin';

    // Superadmin: full access, professional plan
    if (isSuperAdmin) {
      return json({
        plan: 'professional',
        planName: 'Professional',
        billing: 'annual',
        status: 'active',
        isSuperAdmin: true,
        isTrialActive: false,
        trialDaysRemaining: 0,
        trialStartDate: null,
        limits: PLAN_LIMITS.professional,
        modules: PLAN_MODULES.professional,
        usage: { leads: 0, users: 0, storageMB: 0, chatbotFlows: 0 },
      });
    }

    await connectDB();

    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const userId = decoded.userId || decoded.email;

    // Get compartment (holds subscription data)
    const UserCompartment = getUserCompartment();
    const compartment = await UserCompartment.findOne({ userId }).lean();

    // Get user record
    const user = await crmDb.collection('admin_users').findOne({
      $or: [{ userId }, { email: decoded.email }],
    });
    const tenantSlug = user?.tenantSlug;
    const tenant = tenantSlug
      ? await crmDb.collection('crm_tenants').findOne({ slug: tenantSlug })
        || await crmDb.collection('tenants').findOne({ $or: [{ slug: tenantSlug }, { tenantSlug }] })
      : null;

    // Determine plan
    const sub = (compartment as any)?.subscription;
    let plan: PlanTier = (sub?.plan || user?.planId || user?.planName?.toLowerCase() || 'free') as PlanTier;
    
    // Validate plan is a known tier
    const validPlans: PlanTier[] = ['free', 'basic', 'starter', 'growth', 'professional'];
    if (!validPlans.includes(plan)) plan = 'free';

    // Trial status
    const trialStartDate = sub?.trialStartDate || compartment?.createdAt || user?.createdAt || null;
    const trialEndDate = sub?.trialEndDate || (trialStartDate
      ? new Date(new Date(trialStartDate).getTime() + TRIAL_CONFIG.durationDays * 24 * 60 * 60 * 1000)
      : null);
    const trialUsed = sub?.trialUsed ?? false;
    
    // Trial is active if: plan is free/basic, trial not used, and within trial period
    const isTrialActive = !trialUsed &&
      TRIAL_CONFIG.eligiblePlans.includes(plan) &&
      isInTrial(trialStartDate, TRIAL_CONFIG.durationDays);
    const trialDaysRemaining = isTrialActive
      ? getTrialDaysRemaining(trialStartDate, TRIAL_CONFIG.durationDays)
      : 0;

    // Subscription status
    const subStatus = sub?.status || (isTrialActive ? 'trial' : 'active');

    // Usage counts
    const userFilter = tenantSlug
      ? { $or: [{ tenantSlug }, { createdByUserId: userId }, { assignedToUserId: userId }] }
      : { $or: [{ createdByUserId: userId }, { assignedToUserId: userId }] };

    const [leadsCount, teamCount, chatbotCount] = await Promise.all([
      crmDb.collection('leads').countDocuments(userFilter),
      crmDb.collection('admin_users').countDocuments(
        tenantSlug ? { tenantSlug } : { _id: user?._id }
      ),
      crmDb.collection('chatbot_flows').countDocuments(
        tenantSlug ? { tenantSlug } : { createdBy: userId }
      ).catch(() => 0),
    ]);

    const storageMB = (compartment as any)?.storage?.usedMB || 0;

    const planAccess = resolveTenantPlanAccess(tenant || { plan });
    const limits = planAccess.limits || PLAN_LIMITS[plan] || PLAN_LIMITS.free;
    const modules = planAccess.modules || PLAN_MODULES[plan] || PLAN_MODULES.free;

    return json({
      plan: planAccess.plan,
      planName: planAccess.planName,
      billing: sub?.billing || 'monthly',
      status: subStatus,
      isSuperAdmin: false,

      // Trial
      isTrialActive,
      trialDaysRemaining,
      trialStartDate: trialStartDate?.toISOString?.() || trialStartDate || null,
      trialEndDate: trialEndDate?.toISOString?.() || trialEndDate || null,

      // Limits & modules
      limits,
      modules,
      pricing: planAccess.pricing,
      channelAccess: planAccess.channelAccess,

      // Usage
      usage: {
        leads: leadsCount,
        users: teamCount,
        storageMB,
        chatbotFlows: chatbotCount,
      },

      // Subscription dates
      subscriptionStartDate: sub?.startDate || null,
      subscriptionEndDate: sub?.endDate || null,
      lastPaymentDate: sub?.lastPaymentDate || null,
      lastPaymentAmount: sub?.lastPaymentAmount || null,
      paymentMethod: sub?.paymentMethod || null,
      autopayEnabled: sub?.autopayEnabled || false,
    });

  } catch (error: any) {
    console.error('[Plan API] Error:', error);
    return json({ error: error.message || 'Internal server error' }, 500);
  }
}
