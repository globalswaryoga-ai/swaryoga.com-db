'use client';

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import {
  PlanTier,
  CrmModule,
  PlanLimits,
  PlanDisplayInfo,
  hasModule,
  getPlanLimits,
  getPlanDisplay,
  getUpgradePlan,
  isPlanAtLeast,
  getMinimumPlan,
  isInTrial,
  getTrialDaysRemaining,
  formatLimit,
  PLAN_NAMES,
} from '@/lib/crm-site/planConfig';

// ============================================================================
// PLAN CONTEXT (share plan state across entire CRM)
// ============================================================================

export interface PlanState {
  // Plan info
  plan: PlanTier;
  planName: string;
  display: PlanDisplayInfo;
  limits: PlanLimits;

  // Trial
  isTrialActive: boolean;
  trialDaysRemaining: number;
  trialStartDate: string | null;

  // Usage
  usage: {
    leads: number;
    users: number;
    storageMB: number;
    chatbotFlows: number;
  };

  // Computed
  isSuperAdmin: boolean;
  upgradePlan: PlanTier | null;

  // Status
  loading: boolean;
  error: string | null;
}

export interface PlanContextValue extends PlanState {
  /** Check if a CRM module is unlocked for current plan */
  canAccess: (module: CrmModule) => boolean;
  /** Check if current plan is at least the required tier */
  isAtLeast: (required: PlanTier) => boolean;
  /** Get the minimum plan needed for a module */
  requiredPlanFor: (module: CrmModule) => PlanTier;
  /** Get usage percentage for a resource */
  usagePercent: (resource: 'leads' | 'users' | 'storageMB') => number;
  /** Format a limit for display */
  formatLimit: (n: number) => string;
  /** Refresh plan data from server */
  refresh: () => Promise<void>;
}

// Lazy initializer — avoids calling cross-module functions at module scope
// which can trigger TDZ errors when webpack concatenates modules.
function getDefaultState(): PlanState {
  return {
    plan: 'free',
    planName: 'Free',
    display: getPlanDisplay('free'),
    limits: getPlanLimits('free'),
    isTrialActive: false,
    trialDaysRemaining: 0,
    trialStartDate: null,
    usage: { leads: 0, users: 0, storageMB: 0, chatbotFlows: 0 },
    isSuperAdmin: false,
    upgradePlan: 'basic',
    loading: true,
    error: null,
  };
}

const PlanContext = createContext<PlanContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlanState>(getDefaultState);

  const fetchPlan = useCallback(async () => {
    try {
      const token =
        localStorage.getItem('crm_token') ||
        localStorage.getItem('adminToken') ||
        localStorage.getItem('admin_token');

      if (!token) {
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      const res = await fetch('/api/crm-site/plan', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        // Fallback to setup-status for backward compat
        const fallbackRes = await fetch('/api/crm-site/setup-status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          const plan = (data.planId || 'free') as PlanTier;
          setState({
            plan,
            planName: PLAN_NAMES[plan] || 'Free',
            display: getPlanDisplay(plan),
            limits: getPlanLimits(plan),
            isTrialActive: false,
            trialDaysRemaining: 0,
            trialStartDate: null,
            usage: {
              leads: data.leadsCount || 0,
              users: data.teamMembersCount || 0,
              storageMB: data.storageUsedMB || 0,
              chatbotFlows: 0,
            },
            isSuperAdmin: data.isSuperAdmin || false,
            upgradePlan: getUpgradePlan(plan),
            loading: false,
            error: null,
          });
          return;
        }
        throw new Error('Failed to fetch plan');
      }

      const data = await res.json();
      const plan = (data.plan || 'free') as PlanTier;

      setState({
        plan,
        planName: PLAN_NAMES[plan] || 'Free',
        display: getPlanDisplay(plan),
        limits: getPlanLimits(plan),
        isTrialActive: data.isTrialActive || false,
        trialDaysRemaining: data.trialDaysRemaining || 0,
        trialStartDate: data.trialStartDate || null,
        usage: {
          leads: data.usage?.leads || 0,
          users: data.usage?.users || 0,
          storageMB: data.usage?.storageMB || 0,
          chatbotFlows: data.usage?.chatbotFlows || 0,
        },
        isSuperAdmin: data.isSuperAdmin || false,
        upgradePlan: getUpgradePlan(plan),
        loading: false,
        error: null,
      });
    } catch (err: any) {
      console.error('[usePlan] Error:', err);
      setState(prev => ({ ...prev, loading: false, error: err.message }));
    }
  }, []);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const value: PlanContextValue = {
    ...state,
    canAccess: (module: CrmModule) => {
      if (state.isSuperAdmin) return true;
      // During trial, grant trial-level access
      if (state.isTrialActive) {
        const trialModules: CrmModule[] = ['leads', 'whatsapp', 'broadcasting', 'chatbot', 'templates'];
        if (trialModules.includes(module)) return true;
      }
      return hasModule(state.plan, module);
    },
    isAtLeast: (required: PlanTier) => {
      if (state.isSuperAdmin) return true;
      return isPlanAtLeast(state.plan, required);
    },
    requiredPlanFor: getMinimumPlan,
    usagePercent: (resource: 'leads' | 'users' | 'storageMB') => {
      const used = state.usage[resource] || 0;
      let limit = 0;
      switch (resource) {
        case 'leads': limit = state.limits.maxLeads; break;
        case 'users': limit = state.limits.maxUsers; break;
        case 'storageMB': limit = state.limits.storageQuotaMB; break;
      }
      if (limit <= 0 || limit >= 999999) return 0;
      return Math.min(100, (used / limit) * 100);
    },
    formatLimit,
    refresh: fetchPlan,
  };

  return React.createElement(PlanContext.Provider, { value }, children);
}

// ============================================================================
// HOOK
// ============================================================================

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) {
    // Fallback for components not wrapped in PlanProvider
    // Return a safe default that loads plan independently
    return usePlanStandalone();
  }
  return ctx;
}

/**
 * Standalone hook for when PlanProvider is not available.
 * Fetches plan data independently.
 */
function usePlanStandalone(): PlanContextValue {
  const [state, setState] = useState<PlanState>(getDefaultState);

  const fetchPlan = useCallback(async () => {
    try {
      const token =
        localStorage.getItem('crm_token') ||
        localStorage.getItem('adminToken') ||
        localStorage.getItem('admin_token');

      if (!token) {
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      const res = await fetch('/api/crm-site/setup-status', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const plan = (data.planId || 'free') as PlanTier;

      setState({
        plan,
        planName: PLAN_NAMES[plan] || 'Free',
        display: getPlanDisplay(plan),
        limits: getPlanLimits(plan),
        isTrialActive: false,
        trialDaysRemaining: 0,
        trialStartDate: null,
        usage: {
          leads: data.leadsCount || 0,
          users: data.teamMembersCount || 0,
          storageMB: data.storageUsedMB || 0,
          chatbotFlows: 0,
        },
        isSuperAdmin: data.isSuperAdmin || false,
        upgradePlan: getUpgradePlan(plan),
        loading: false,
        error: null,
      });
    } catch (err: any) {
      setState(prev => ({ ...prev, loading: false, error: err.message }));
    }
  }, []);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  return {
    ...state,
    canAccess: (module: CrmModule) => {
      if (state.isSuperAdmin) return true;
      return hasModule(state.plan, module);
    },
    isAtLeast: (required: PlanTier) => {
      if (state.isSuperAdmin) return true;
      return isPlanAtLeast(state.plan, required);
    },
    requiredPlanFor: getMinimumPlan,
    usagePercent: (resource) => {
      const used = state.usage[resource] || 0;
      let limit = 0;
      switch (resource) {
        case 'leads': limit = state.limits.maxLeads; break;
        case 'users': limit = state.limits.maxUsers; break;
        case 'storageMB': limit = state.limits.storageQuotaMB; break;
      }
      if (limit <= 0 || limit >= 999999) return 0;
      return Math.min(100, (used / limit) * 100);
    },
    formatLimit,
    refresh: fetchPlan,
  };
}

export default usePlan;
