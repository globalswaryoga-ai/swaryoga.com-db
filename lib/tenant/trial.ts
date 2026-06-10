/**
 * Trial / subscription state resolution.
 *
 * Flow: on Upgrade the tenant pays the DATA payment (1st), which starts a free
 * trial (status 'trial', trialEndsAt = now + plan.trialDays). When the trial
 * window passes and the SUBSCRIPTION payment hasn't been made, the tenant is
 * effectively 'trial_expired' and locked to read-only until they pay.
 *
 * The effective status is computed on read (no write needed) so a tenant whose
 * trial just lapsed is treated as expired immediately.
 */

export interface TrialState {
  /** Effective status after evaluating the trial window. */
  status: 'active' | 'trial' | 'trial_expired' | 'suspended' | 'pending' | 'archived';
  isTrialActive: boolean;
  /** Whole days left in the trial (0 once expired). */
  trialDaysRemaining: number;
  trialEndsAt: string | null;
  dataPaid: boolean;
  subscriptionPaid: boolean;
  /** True → app is read-only and a "pay to continue" paywall should show. */
  isLocked: boolean;
}

export function computeTrialState(tenant: any): TrialState {
  const now = Date.now();
  const trialEndsAt = tenant?.trialEndsAt ? new Date(tenant.trialEndsAt) : null;
  const subscriptionPaid = !!tenant?.subscriptionPaid;
  const dataPaid = !!tenant?.dataPaid;
  const rawStatus: string = tenant?.status || 'pending';

  // Hard states win.
  if (rawStatus === 'suspended' || rawStatus === 'archived') {
    return { status: rawStatus as TrialState['status'], isTrialActive: false, trialDaysRemaining: 0, trialEndsAt: trialEndsAt?.toISOString() || null, dataPaid, subscriptionPaid, isLocked: rawStatus === 'suspended' };
  }

  // A paid subscription is always active.
  if (subscriptionPaid) {
    return { status: 'active', isTrialActive: false, trialDaysRemaining: 0, trialEndsAt: trialEndsAt?.toISOString() || null, dataPaid, subscriptionPaid, isLocked: false };
  }

  // In a trial (or trial that may have just lapsed).
  if (rawStatus === 'trial' || rawStatus === 'trial_expired') {
    const msLeft = trialEndsAt ? trialEndsAt.getTime() - now : 0;
    const active = msLeft > 0;
    return {
      status: active ? 'trial' : 'trial_expired',
      isTrialActive: active,
      trialDaysRemaining: active ? Math.max(1, Math.ceil(msLeft / 86_400_000)) : 0,
      trialEndsAt: trialEndsAt?.toISOString() || null,
      dataPaid,
      subscriptionPaid,
      isLocked: !active, // trial lapsed & unpaid → read-only paywall
    };
  }

  // Free / pending — full (free) access, no lock.
  return { status: rawStatus as TrialState['status'], isTrialActive: false, trialDaysRemaining: 0, trialEndsAt: null, dataPaid, subscriptionPaid, isLocked: false };
}
