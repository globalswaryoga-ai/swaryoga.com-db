/**
 * CRM Auto-Scaling Configuration
 * 
 * System-wide capacity management for 100 → 1000+ users over 3 months
 * Includes usage monitoring, auto-upgrade triggers, and capacity alerts
 */

// Growth projection: 100 → 1000 users in 3 months
export const GROWTH_CONFIG = {
  currentCapacity: 100,
  targetCapacity: 1000,
  timeframeDays: 90,
  growthRatePerDay: 10, // ~10 new users/day average
};

// System-wide resource limits that auto-scale
export const SYSTEM_LIMITS = {
  // MongoDB limits (auto-scale with Atlas)
  maxTenants: 1000,
  maxTotalLeads: 5_000_000, // 5M total leads across all tenants
  maxTotalStorage: 500_000, // 500GB total
  
  // WhatsApp API limits
  maxWhatsAppMessagesPerDay: 100_000,
  maxBroadcastsPerDay: 10_000,
  
  // AI/Voice limits  
  maxAICallsPerDay: 5_000,
  maxChatbotSessions: 50_000,
};

// Auto-scaling thresholds (% of capacity)
export const SCALE_THRESHOLDS = {
  warning: 70,   // Yellow alert at 70%
  critical: 85,  // Red alert at 85%
  autoScale: 90, // Auto-increase at 90%
};

// Per-tenant auto-upgrade thresholds
export const UPGRADE_THRESHOLDS = {
  leads: 85,     // Suggest upgrade when 85% of lead limit used
  storage: 80,   // Suggest upgrade when 80% of storage used
  users: 90,     // Suggest upgrade when 90% of user limit used
};

// Plan upgrade paths
export const UPGRADE_PATHS: Record<string, string> = {
  free: 'basic',
  basic: 'starter', 
  starter: 'growth',
  growth: 'professional',
  professional: 'enterprise',
};

// Auto-increase quotas (add extra capacity when approaching limits)
export const AUTO_INCREASE_QUOTAS = {
  leadsBuffer: 500,     // Add 500 leads buffer on paid plans
  storageBufferMB: 256, // Add 256MB storage buffer
  usersBuffer: 1,       // Add 1 user buffer
};

// Notification settings
export const NOTIFICATION_CONFIG = {
  adminEmail: 'mohan@swaryoga.com',
  alertChannels: ['email', 'database'], // where to send alerts
  alertFrequencyHours: 24, // don't re-alert within 24 hours
};

/**
 * Calculate current system utilization
 */
export interface SystemUtilization {
  tenantCount: number;
  tenantPercent: number;
  totalLeads: number;
  leadsPercent: number;
  totalStorageMB: number;
  storagePercent: number;
  status: 'healthy' | 'warning' | 'critical';
}

/**
 * Calculate tenant utilization
 */
export interface TenantUtilization {
  tenantSlug: string;
  plan: string;
  leadsUsed: number;
  leadsLimit: number;
  leadsPercent: number;
  storageUsedMB: number;
  storageLimitMB: number;
  storagePercent: number;
  usersCount: number;
  usersLimit: number;
  usersPercent: number;
  shouldUpgrade: boolean;
  suggestedPlan: string | null;
  alerts: string[];
}

/**
 * Check if tenant should be prompted to upgrade
 */
export function shouldSuggestUpgrade(utilization: TenantUtilization): boolean {
  return (
    utilization.leadsPercent >= UPGRADE_THRESHOLDS.leads ||
    utilization.storagePercent >= UPGRADE_THRESHOLDS.storage ||
    utilization.usersPercent >= UPGRADE_THRESHOLDS.users
  );
}

/**
 * Get suggested upgrade plan
 */
export function getSuggestedPlan(currentPlan: string): string | null {
  return UPGRADE_PATHS[currentPlan] || null;
}

/**
 * Calculate auto-increased limits for a tenant
 */
export function getAutoIncreasedLimits(
  currentLimits: { maxLeads: number; maxStorageMB: number; maxUsers: number },
  plan: string,
  utilization: TenantUtilization
): { maxLeads: number; maxStorageMB: number; maxUsers: number } {
  // Only auto-increase for paid plans
  if (plan === 'free') return currentLimits;
  
  const result = { ...currentLimits };
  
  // Add buffer if approaching limits
  if (utilization.leadsPercent >= SCALE_THRESHOLDS.autoScale) {
    result.maxLeads += AUTO_INCREASE_QUOTAS.leadsBuffer;
  }
  if (utilization.storagePercent >= SCALE_THRESHOLDS.autoScale) {
    result.maxStorageMB += AUTO_INCREASE_QUOTAS.storageBufferMB;
  }
  if (utilization.usersPercent >= SCALE_THRESHOLDS.autoScale) {
    result.maxUsers += AUTO_INCREASE_QUOTAS.usersBuffer;
  }
  
  return result;
}

/**
 * Generate alerts for a tenant based on utilization
 */
export function generateTenantAlerts(utilization: TenantUtilization): string[] {
  const alerts: string[] = [];
  
  if (utilization.leadsPercent >= SCALE_THRESHOLDS.critical) {
    alerts.push(`⚠️ Lead limit almost reached (${utilization.leadsPercent.toFixed(0)}%)`);
  } else if (utilization.leadsPercent >= SCALE_THRESHOLDS.warning) {
    alerts.push(`📊 Lead usage at ${utilization.leadsPercent.toFixed(0)}%`);
  }
  
  if (utilization.storagePercent >= SCALE_THRESHOLDS.critical) {
    alerts.push(`⚠️ Storage almost full (${utilization.storagePercent.toFixed(0)}%)`);
  } else if (utilization.storagePercent >= SCALE_THRESHOLDS.warning) {
    alerts.push(`💾 Storage at ${utilization.storagePercent.toFixed(0)}%`);
  }
  
  if (utilization.usersPercent >= SCALE_THRESHOLDS.critical) {
    alerts.push(`⚠️ User limit almost reached (${utilization.usersPercent.toFixed(0)}%)`);
  }
  
  return alerts;
}

/**
 * Calculate projected growth based on current trajectory
 */
export function calculateGrowthProjection(
  currentUsers: number,
  daysElapsed: number
): {
  dailyGrowthRate: number;
  projectedAt30Days: number;
  projectedAt60Days: number;
  projectedAt90Days: number;
  willExceedCapacityAt: number | null;
} {
  const dailyGrowthRate = daysElapsed > 0 ? currentUsers / daysElapsed : GROWTH_CONFIG.growthRatePerDay;
  
  return {
    dailyGrowthRate,
    projectedAt30Days: Math.round(currentUsers + dailyGrowthRate * 30),
    projectedAt60Days: Math.round(currentUsers + dailyGrowthRate * 60),
    projectedAt90Days: Math.round(currentUsers + dailyGrowthRate * 90),
    willExceedCapacityAt: dailyGrowthRate > 0 
      ? Math.round((SYSTEM_LIMITS.maxTenants - currentUsers) / dailyGrowthRate)
      : null,
  };
}

/**
 * Get system health status
 */
export function getSystemHealthStatus(utilization: number): 'healthy' | 'warning' | 'critical' {
  if (utilization >= SCALE_THRESHOLDS.critical) return 'critical';
  if (utilization >= SCALE_THRESHOLDS.warning) return 'warning';
  return 'healthy';
}

// Monthly growth milestones for tracking
export const GROWTH_MILESTONES = [
  { month: 1, targetUsers: 350, targetLeads: 50_000 },
  { month: 2, targetUsers: 650, targetLeads: 150_000 },
  { month: 3, targetUsers: 1000, targetLeads: 300_000 },
];

// Cost projections per tier (monthly)
export const INFRASTRUCTURE_COSTS = {
  tier1: { users: 100, mongoAtlas: 57, vercel: 0, total: 57 },
  tier2: { users: 500, mongoAtlas: 95, vercel: 20, total: 115 },
  tier3: { users: 1000, mongoAtlas: 190, vercel: 20, total: 210 },
  tier4: { users: 2000, mongoAtlas: 380, vercel: 150, total: 530 },
};
