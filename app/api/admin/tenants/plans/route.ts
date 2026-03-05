/**
 * Plans Listing API
 *
 * GET /api/admin/tenants/plans — Returns all available plan tiers.
 * No auth required (can be used on pricing pages).
 */

import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/api-error';
import { PLAN_DEFINITIONS } from '@/lib/tenant/plans';

export async function GET(_request: NextRequest) {
  // Convert enabledModules Set-friendly arrays to plain arrays and return
  const plans = Object.values(PLAN_DEFINITIONS).map((p) => ({
    tier: p.tier,
    name: p.name,
    description: p.description,
    limits: p.limits,
    enabledModules: p.enabledModules,
    monthlyPriceINR: p.monthlyPriceINR,
    annualPriceINR: p.annualPriceINR,
  }));

  return apiSuccess({ plans });
}
