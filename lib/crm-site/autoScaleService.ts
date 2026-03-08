/**
 * CRM Auto-Scaling Service
 * 
 * Monitors system and tenant usage, triggers auto-scaling,
 * sends upgrade suggestions, and manages capacity alerts.
 */

import {
  SYSTEM_LIMITS,
  SCALE_THRESHOLDS,
  UPGRADE_THRESHOLDS,
  NOTIFICATION_CONFIG,
  TenantUtilization,
  SystemUtilization,
  shouldSuggestUpgrade,
  getSuggestedPlan,
  getAutoIncreasedLimits,
  generateTenantAlerts,
  calculateGrowthProjection,
  getSystemHealthStatus,
} from './autoScaleConfig';

/**
 * Check system-wide utilization and return alerts
 */
export async function checkSystemUtilization(): Promise<SystemUtilization> {
  const mongoose = (await import('mongoose')).default;
  const mainDb = mongoose.connection.useDb(process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB');
  const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

  // Count tenants
  const tenantCount = await mainDb.collection('tenants').countDocuments();
  const tenantPercent = (tenantCount / SYSTEM_LIMITS.maxTenants) * 100;

  // Count total leads
  const totalLeads = await crmDb.collection('leads').countDocuments();
  const leadsPercent = (totalLeads / SYSTEM_LIMITS.maxTotalLeads) * 100;

  // Get total storage (approximate)
  let totalStorageMB = 0;
  try {
    const stats = await crmDb.db.stats();
    totalStorageMB = Math.round(stats.dataSize / (1024 * 1024));
  } catch {
    totalStorageMB = 0;
  }
  const storagePercent = (totalStorageMB / SYSTEM_LIMITS.maxTotalStorage) * 100;

  // Determine overall status
  const maxPercent = Math.max(tenantPercent, leadsPercent, storagePercent);
  const status = getSystemHealthStatus(maxPercent);

  return {
    tenantCount,
    tenantPercent,
    totalLeads,
    leadsPercent,
    totalStorageMB,
    storagePercent,
    status,
  };
}

/**
 * Check a single tenant's utilization
 */
export async function checkTenantUtilization(tenantSlug: string): Promise<TenantUtilization | null> {
  const mongoose = (await import('mongoose')).default;
  const mainDb = mongoose.connection.useDb(process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB');
  const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

  // Get tenant
  const tenant = await mainDb.collection('tenants').findOne({
    $or: [{ tenantSlug }, { slug: tenantSlug }],
  });

  if (!tenant) return null;

  const plan = tenant.subscriptionTier || tenant.plan || 'free';
  const limits = tenant.limits || { maxLeads: 250, storageQuotaMB: 100, maxUsers: 1 };

  // Count usage
  const leadsUsed = await crmDb.collection('leads').countDocuments({
    $or: [{ tenantSlug }, { tenantId: tenantSlug }],
  });

  const usersCount = await crmDb.collection('admin_users').countDocuments({ tenantSlug });

  // Estimate storage (simplified)
  const storageUsedMB = tenant.usage?.storageUsedMB || Math.round(leadsUsed * 0.01);

  // Calculate percentages
  const leadsPercent = (leadsUsed / limits.maxLeads) * 100;
  const storagePercent = (storageUsedMB / limits.storageQuotaMB) * 100;
  const usersPercent = (usersCount / limits.maxUsers) * 100;

  const utilization: TenantUtilization = {
    tenantSlug,
    plan,
    leadsUsed,
    leadsLimit: limits.maxLeads,
    leadsPercent,
    storageUsedMB,
    storageLimitMB: limits.storageQuotaMB,
    storagePercent,
    usersCount,
    usersLimit: limits.maxUsers,
    usersPercent,
    shouldUpgrade: false,
    suggestedPlan: null,
    alerts: [],
  };

  // Check upgrade suggestion
  utilization.shouldUpgrade = shouldSuggestUpgrade(utilization);
  utilization.suggestedPlan = utilization.shouldUpgrade ? getSuggestedPlan(plan) : null;
  utilization.alerts = generateTenantAlerts(utilization);

  return utilization;
}

/**
 * Auto-increase tenant limits if approaching capacity (for paid plans)
 */
export async function autoIncreaseTenantLimits(tenantSlug: string): Promise<boolean> {
  const mongoose = (await import('mongoose')).default;
  const mainDb = mongoose.connection.useDb(process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB');

  const utilization = await checkTenantUtilization(tenantSlug);
  if (!utilization || utilization.plan === 'free') return false;

  const currentLimits = {
    maxLeads: utilization.leadsLimit,
    maxStorageMB: utilization.storageLimitMB,
    maxUsers: utilization.usersLimit,
  };

  const newLimits = getAutoIncreasedLimits(currentLimits, utilization.plan, utilization);

  // Check if any limits actually changed
  if (
    newLimits.maxLeads === currentLimits.maxLeads &&
    newLimits.maxStorageMB === currentLimits.maxStorageMB &&
    newLimits.maxUsers === currentLimits.maxUsers
  ) {
    return false;
  }

  // Update tenant limits
  await mainDb.collection('tenants').updateOne(
    { $or: [{ tenantSlug }, { slug: tenantSlug }] },
    {
      $set: {
        'limits.maxLeads': newLimits.maxLeads,
        'limits.storageQuotaMB': newLimits.maxStorageMB,
        'limits.maxUsers': newLimits.maxUsers,
        autoScaledAt: new Date(),
      },
    }
  );

  // Log the auto-scale event
  await mainDb.collection('auto_scale_log').insertOne({
    tenantSlug,
    type: 'tenant_limits_increased',
    previousLimits: currentLimits,
    newLimits,
    utilization: {
      leadsPercent: utilization.leadsPercent,
      storagePercent: utilization.storagePercent,
      usersPercent: utilization.usersPercent,
    },
    createdAt: new Date(),
  });

  console.log(`✅ Auto-increased limits for ${tenantSlug}:`, newLimits);
  return true;
}

/**
 * Run system-wide capacity check and log alerts
 */
export async function runCapacityCheck(): Promise<{
  system: SystemUtilization;
  tenantsNeedingUpgrade: string[];
  alertsSent: number;
}> {
  const mongoose = (await import('mongoose')).default;
  const mainDb = mongoose.connection.useDb(process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB');
  const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

  // Check system utilization
  const system = await checkSystemUtilization();

  // Get all active tenants
  const tenants = await mainDb.collection('tenants')
    .find({ $or: [{ status: 'active' }, { subscriptionStatus: 'active' }] })
    .project({ tenantSlug: 1, slug: 1 })
    .toArray();

  const tenantsNeedingUpgrade: string[] = [];
  let alertsSent = 0;

  // Check each tenant
  for (const tenant of tenants) {
    const slug = tenant.tenantSlug || tenant.slug;
    if (!slug) continue;

    const utilization = await checkTenantUtilization(slug);
    if (!utilization) continue;

    // Auto-increase limits for paid plans
    if (utilization.plan !== 'free') {
      await autoIncreaseTenantLimits(slug);
    }

    // Track tenants needing upgrade
    if (utilization.shouldUpgrade) {
      tenantsNeedingUpgrade.push(slug);

      // Store upgrade suggestion (check if we already alerted recently)
      const recentAlert = await crmDb.collection('capacity_alerts').findOne({
        tenantSlug: slug,
        type: 'upgrade_suggestion',
        createdAt: { $gte: new Date(Date.now() - NOTIFICATION_CONFIG.alertFrequencyHours * 60 * 60 * 1000) },
      });

      if (!recentAlert) {
        await crmDb.collection('capacity_alerts').insertOne({
          tenantSlug: slug,
          type: 'upgrade_suggestion',
          currentPlan: utilization.plan,
          suggestedPlan: utilization.suggestedPlan,
          utilization: {
            leadsPercent: utilization.leadsPercent,
            storagePercent: utilization.storagePercent,
            usersPercent: utilization.usersPercent,
          },
          alerts: utilization.alerts,
          emailSent: false,
          createdAt: new Date(),
        });
        alertsSent++;
      }
    }
  }

  // Log system-level alert if needed
  if (system.status !== 'healthy') {
    await crmDb.collection('capacity_alerts').insertOne({
      type: 'system_capacity',
      status: system.status,
      tenantCount: system.tenantCount,
      totalLeads: system.totalLeads,
      totalStorageMB: system.totalStorageMB,
      percentages: {
        tenants: system.tenantPercent,
        leads: system.leadsPercent,
        storage: system.storagePercent,
      },
      createdAt: new Date(),
    });
    alertsSent++;
  }

  // Log the capacity check
  await mainDb.collection('auto_scale_log').insertOne({
    type: 'capacity_check',
    system,
    tenantsChecked: tenants.length,
    tenantsNeedingUpgrade: tenantsNeedingUpgrade.length,
    alertsSent,
    createdAt: new Date(),
  });

  return { system, tenantsNeedingUpgrade, alertsSent };
}

/**
 * Get growth dashboard data
 */
export async function getGrowthDashboard(): Promise<{
  system: SystemUtilization;
  projection: ReturnType<typeof calculateGrowthProjection>;
  recentAlerts: any[];
  topTenants: TenantUtilization[];
}> {
  const mongoose = (await import('mongoose')).default;
  const mainDb = mongoose.connection.useDb(process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB');
  const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

  const system = await checkSystemUtilization();

  // Calculate days since first tenant
  const firstTenant = await mainDb.collection('tenants')
    .findOne({}, { sort: { createdAt: 1 }, projection: { createdAt: 1 } });
  const daysElapsed = firstTenant?.createdAt 
    ? Math.floor((Date.now() - new Date(firstTenant.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 1;

  const projection = calculateGrowthProjection(system.tenantCount, daysElapsed);

  // Get recent alerts
  const recentAlerts = await crmDb.collection('capacity_alerts')
    .find({})
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();

  // Get top tenants by usage
  const topTenantDocs = await mainDb.collection('tenants')
    .find({ $or: [{ status: 'active' }, { subscriptionStatus: 'active' }] })
    .sort({ 'usage.leadsCount': -1 })
    .limit(5)
    .toArray();

  const topTenants: TenantUtilization[] = [];
  for (const t of topTenantDocs) {
    const slug = t.tenantSlug || t.slug;
    if (slug) {
      const util = await checkTenantUtilization(slug);
      if (util) topTenants.push(util);
    }
  }

  return { system, projection, recentAlerts, topTenants };
}
