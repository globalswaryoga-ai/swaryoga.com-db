/**
 * Pure BunnyDB Tenant Repository
 * Replaces all MongoDB dependencies for multi-tenant management:
 * - crm_tenants_sql
 * - admin_users_sql
 * - crm_user_settings_sql
 * - leads_sql
 * - crm_tenant_plans_sql
 * - crm_promo_codes_sql
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { PLAN_DEFINITIONS } from '@/lib/tenant/plans';
import {
  PLAN_DEFAULT_GROUPS,
  ALL_GROUP_KEYS,
  sanitizeModuleKeys,
  expandGroups,
} from '@/lib/tenant/moduleCatalog';
import { PlanTier } from '@/lib/tenant/types';

export interface Pricing {
  monthlyPriceINR?: number | null;
  storageIncludedMB?: number | null;
  extraStoragePriceINR?: number;
  promoCode?: string;
  promoDiscountPercent?: number;
  billingCycle?: 'monthly' | 'quarterly' | 'half_yearly' | 'annual';
}

export interface Limits {
  maxLeads?: number;
  maxUsers?: number;
  maxStorageMB?: number;
  maxWhatsAppTemplates?: number;
  maxBroadcastsPerDay?: number;
  maxApiRequestsPerDay?: number;
}

export interface TenantRecord {
  _id: string;
  slug: string;
  name: string;
  ownerEmail: string;
  ownerUserId: string;
  ownerName?: string;
  ownerPhone?: string;
  plan: string;
  status: string;
  dbName: string;
  subdomain?: string;
  customDomain?: string;
  customDomainVerified?: boolean;
  enabledModules: string[];
  moduleKeys?: string[];
  pricing?: Pricing;
  customLimits?: Limits;
  currentLeadCount: number;
  currentUserCount: number;
  currentStorageMB: number;
  subscriptionEndsAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanRecord {
  tier: string;
  name: string;
  description: string;
  limits: Record<string, number>;
  enabledModules: string[];
  defaultGroups?: string[];
  monthlyPriceINR: number;
  annualPriceINR: number;
  quarterlyPriceINR?: number;
  halfYearlyPriceINR?: number;
  trialDays?: number;
  promoCode?: string;
  discountPercent?: number;
  order?: number;
  isCustom?: boolean;
}

export interface PromoCodeRecord {
  code: string;
  discountPercent: number;
  duration: 'month' | 'year';
  active: boolean;
  note?: string;
  updatedAt?: string;
}

// Ensure supporting tables exist in BunnyDB
export async function ensureTenantTables(): Promise<void> {
  try {
    await bunnyExecute(`
      CREATE TABLE IF NOT EXISTS crm_tenants_sql (
        tenant_slug TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        data_json TEXT NOT NULL,
        created_at TEXT,
        updated_at TEXT,
        migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await bunnyExecute(`
      CREATE TABLE IF NOT EXISTS crm_tenant_plans_sql (
        tier TEXT PRIMARY KEY,
        data_json TEXT NOT NULL,
        order_index INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await bunnyExecute(`
      CREATE TABLE IF NOT EXISTS crm_promo_codes_sql (
        code TEXT PRIMARY KEY,
        data_json TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) {
    console.error('[ensureTenantTables] Error:', err);
  }
}

// Normalizes date fields from MongoDB BSON or ISO string
function parseDateString(d: any): string {
  if (!d) return new Date().toISOString();
  if (typeof d === 'string') return d;
  if (d instanceof Date) return d.toISOString();
  if (d.$date) {
    if (d.$date.$numberLong) {
      return new Date(Number(d.$date.$numberLong)).toISOString();
    }
    return new Date(d.$date).toISOString();
  }
  return new Date().toISOString();
}

// Normalizes raw data_json into a clean TenantRecord
export function normalizeTenant(row: any): TenantRecord {
  let parsed: any = {};
  try {
    parsed = typeof row.data_json === 'string' ? JSON.parse(row.data_json) : (row.data_json || {});
  } catch {
    parsed = {};
  }

  const slug = String(row.tenant_slug || parsed.slug || parsed.tenantSlug || '').trim().toLowerCase();
  const docId = String(row.document_id || parsed._id?.$oid || parsed._id || slug);

  return {
    _id: docId,
    slug,
    name: parsed.name || slug,
    ownerEmail: parsed.ownerEmail || parsed.adminEmail || '',
    ownerUserId: parsed.ownerUserId || parsed.adminUserId || parsed.ownerEmail || '',
    ownerName: parsed.ownerName || '',
    ownerPhone: parsed.ownerPhone || '',
    plan: parsed.plan || 'free',
    status: parsed.status || 'active',
    dbName: parsed.dbName || `tenant_${slug.replace(/[^a-z0-9_]/g, '_')}`,
    subdomain: parsed.subdomain || slug,
    customDomain: parsed.customDomain || undefined,
    customDomainVerified: !!parsed.customDomainVerified,
    enabledModules: Array.isArray(parsed.enabledModules) ? parsed.enabledModules : [],
    moduleKeys: Array.isArray(parsed.moduleKeys) ? parsed.moduleKeys : undefined,
    pricing: parsed.pricing || undefined,
    customLimits: parsed.customLimits || undefined,
    currentLeadCount: Number(parsed.currentLeadCount) || 0,
    currentUserCount: Number(parsed.currentUserCount) || 0,
    currentStorageMB: Number(parsed.currentStorageMB) || 0,
    subscriptionEndsAt: parsed.subscriptionEndsAt ? parseDateString(parsed.subscriptionEndsAt) : undefined,
    createdAt: parseDateString(row.created_at || parsed.createdAt),
    updatedAt: parseDateString(row.updated_at || parsed.updatedAt),
  };
}

/**
 * List all tenants from BunnyDB with filtering, search, and pagination
 */
export async function listTenants({
  status,
  plan,
  search,
  page = 1,
  limit = 20,
}: {
  status?: string | null;
  plan?: string | null;
  search?: string | null;
  page?: number;
  limit?: number;
}): Promise<{
  tenants: TenantRecord[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  await ensureTenantTables();

  const res = await bunnyExecute('SELECT * FROM crm_tenants_sql ORDER BY created_at DESC');
  let list: TenantRecord[] = res.rows.map(normalizeTenant);

  // Filters
  if (status) {
    const s = status.toLowerCase();
    list = list.filter((t) => t.status.toLowerCase() === s);
  }

  if (plan) {
    const p = plan.toLowerCase();
    list = list.filter((t) => t.plan.toLowerCase() === p);
  }

  if (search) {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.ownerEmail.toLowerCase().includes(q) ||
        (t.ownerName && t.ownerName.toLowerCase().includes(q)) ||
        (t.ownerPhone && t.ownerPhone.includes(q))
    );
  }

  const total = list.length;
  const skip = (page - 1) * limit;
  const paginated = list.slice(skip, skip + limit);

  return {
    tenants: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

/**
 * Get single tenant by slug from BunnyDB
 */
export async function getTenantBySlug(slug: string): Promise<TenantRecord | null> {
  await ensureTenantTables();
  const cleanSlug = slug.trim().toLowerCase();
  const res = await bunnyExecute({
    sql: 'SELECT * FROM crm_tenants_sql WHERE tenant_slug = ? LIMIT 1',
    args: [cleanSlug],
  });

  if (!res.rows.length) return null;
  return normalizeTenant(res.rows[0]);
}

/**
 * Create a new tenant in BunnyDB and provision admin user in admin_users_sql
 */
export async function createTenant(data: {
  slug: string;
  name: string;
  ownerEmail: string;
  ownerUserId: string;
  password?: string;
  plan?: string;
  moduleKeys?: string[];
  pricing?: any;
  customLimits?: any;
  subscriptionEndsAt?: string;
}): Promise<TenantRecord> {
  await ensureTenantTables();

  const slug = data.slug.trim().toLowerCase();
  const ownerEmail = data.ownerEmail.trim().toLowerCase();
  const ownerUserId = data.ownerUserId.trim().toLowerCase();
  const plan = data.plan && Object.values(PlanTier).includes(data.plan as PlanTier) ? data.plan : PlanTier.FREE;

  // Check if tenant slug already exists in BunnyDB
  const existing = await getTenantBySlug(slug);
  if (existing) {
    throw new Error(`Tenant with slug "${slug}" already exists`);
  }

  // Check if admin user email or userId already taken in admin_users_sql
  const userCheck = await bunnyExecute({
    sql: 'SELECT id, email, user_id FROM admin_users_sql WHERE LOWER(email) = ? OR LOWER(user_id) = ? LIMIT 1',
    args: [ownerEmail, ownerUserId],
  });
  if (userCheck.rows.length > 0) {
    throw new Error('An account with this owner email or user ID already exists');
  }

  const docId = crypto.randomBytes(12).toString('hex');
  const now = new Date().toISOString();

  const moduleKeys = Array.isArray(data.moduleKeys) && data.moduleKeys.length
    ? sanitizeModuleKeys(data.moduleKeys)
    : expandGroups(PLAN_DEFAULT_GROUPS[plan] || PLAN_DEFAULT_GROUPS.free);

  const tenantPayload = {
    _id: docId,
    slug,
    tenantSlug: slug,
    name: data.name.trim(),
    ownerEmail,
    ownerUserId,
    plan,
    status: 'active',
    dbName: `tenant_${slug.replace(/[^a-z0-9_]/g, '_')}`,
    subdomain: slug,
    enabledModules: [],
    moduleKeys,
    pricing: data.pricing,
    customLimits: data.customLimits,
    subscriptionEndsAt: data.subscriptionEndsAt,
    currentLeadCount: 0,
    currentUserCount: 0,
    currentStorageMB: 0,
    createdAt: now,
    updatedAt: now,
  };

  // 1. Insert into crm_tenants_sql
  await bunnyExecute({
    sql: `
      INSERT INTO crm_tenants_sql (tenant_slug, document_id, data_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    args: [slug, docId, JSON.stringify(tenantPayload), now, now],
  });

  // 2. Create login in admin_users_sql if password provided
  if (data.password) {
    const passwordHash = await bcrypt.hash(data.password, 12);
    const userIdRow = crypto.randomBytes(12).toString('hex');
    await bunnyExecute({
      sql: `
        INSERT INTO admin_users_sql (
          id, user_id, email, password_hash, is_admin, role, tenant_slug, name, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 1, 'admin', ?, ?, ?, ?)
      `,
      args: [userIdRow, ownerUserId, ownerEmail, passwordHash, slug, data.name.trim(), now, now],
    });
  }

  return normalizeTenant({
    tenant_slug: slug,
    document_id: docId,
    data_json: JSON.stringify(tenantPayload),
    created_at: now,
    updated_at: now,
  });
}

/**
 * Update an existing tenant in BunnyDB
 */
export async function updateTenant(
  slug: string,
  updates: Record<string, any>
): Promise<TenantRecord> {
  await ensureTenantTables();
  const cleanSlug = slug.trim().toLowerCase();

  const existingRes = await bunnyExecute({
    sql: 'SELECT * FROM crm_tenants_sql WHERE tenant_slug = ? LIMIT 1',
    args: [cleanSlug],
  });

  if (!existingRes.rows.length) {
    throw new Error(`Tenant "${slug}" not found`);
  }

  const existingRow = existingRes.rows[0];
  let currentData: any = {};
  try {
    currentData = JSON.parse(String(existingRow.data_json));
  } catch {
    currentData = {};
  }

  const allowedFields = [
    'name', 'plan', 'customDomain', 'customDomainVerified', 'status',
    'subscriptionEndsAt', 'ownerEmail', 'ownerName', 'ownerPhone', 'enabledModules',
    'moduleKeys', 'pricing', 'customLimits',
  ];

  for (const f of allowedFields) {
    if (updates[f] !== undefined) {
      if (f === 'customDomain' && !String(updates[f]).trim()) {
        delete currentData.customDomain;
      } else {
        currentData[f] = updates[f];
      }
    }
  }

  if (updates.moduleKeys !== undefined) {
    currentData.moduleKeys = sanitizeModuleKeys(updates.moduleKeys);
  }

  const now = new Date().toISOString();
  currentData.updatedAt = now;

  await bunnyExecute({
    sql: 'UPDATE crm_tenants_sql SET data_json = ?, updated_at = ? WHERE tenant_slug = ?',
    args: [JSON.stringify(currentData), now, cleanSlug],
  });

  // Sync admin_users_sql if email, name, or phone was updated
  const syncAccount =
    updates.ownerEmail !== undefined ||
    updates.ownerName !== undefined ||
    updates.ownerPhone !== undefined;

  if (syncAccount) {
    const newEmail = updates.ownerEmail ? String(updates.ownerEmail).trim().toLowerCase() : undefined;
    const newName = updates.ownerName ? String(updates.ownerName).trim() : undefined;
    const newPhone = updates.ownerPhone ? String(updates.ownerPhone).trim() : undefined;

    const sets: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const args: any[] = [];

    if (newEmail) {
      sets.push('email = ?');
      args.push(newEmail);
    }
    if (newName) {
      sets.push('name = ?');
      args.push(newName);
    }
    if (newPhone) {
      sets.push('phone = ?');
      args.push(newPhone);
    }

    args.push(cleanSlug);
    await bunnyExecute({
      sql: `UPDATE admin_users_sql SET ${sets.join(', ')} WHERE tenant_slug = ?`,
      args,
    });
  }

  return normalizeTenant({
    tenant_slug: cleanSlug,
    document_id: existingRow.document_id,
    data_json: JSON.stringify(currentData),
    created_at: existingRow.created_at,
    updated_at: now,
  });
}

/**
 * Delete a tenant from BunnyDB
 */
export async function deleteTenant(slug: string): Promise<{ deleted: boolean; slug: string; loginRemoved: number }> {
  await ensureTenantTables();
  const cleanSlug = slug.trim().toLowerCase();

  const tenant = await getTenantBySlug(cleanSlug);
  if (!tenant) {
    throw new Error(`Tenant "${slug}" not found`);
  }

  // Delete tenant row
  await bunnyExecute({
    sql: 'DELETE FROM crm_tenants_sql WHERE tenant_slug = ?',
    args: [cleanSlug],
  });

  // Delete login user from admin_users_sql
  const userDel = await bunnyExecute({
    sql: 'DELETE FROM admin_users_sql WHERE tenant_slug = ? OR LOWER(email) = ?',
    args: [cleanSlug, tenant.ownerEmail.toLowerCase()],
  });

  return {
    deleted: true,
    slug: cleanSlug,
    loginRemoved: Number(userDel.rowsAffected || 0),
  };
}

/**
 * Get tenant details from BunnyDB (login user, WhatsApp settings, lead counts)
 */
export async function getTenantDetails(
  email?: string | null,
  ownerUserId?: string | null
): Promise<any> {
  await ensureTenantTables();

  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanUserId = String(ownerUserId || '').trim().toLowerCase();

  // 1. Login Account from admin_users_sql
  let user: any = null;
  const userRes = await bunnyExecute({
    sql: `
      SELECT id, user_id, email, role, is_admin, tenant_slug, name, phone, last_login_at, created_at, password_hash
      FROM admin_users_sql
      WHERE LOWER(email) = ? OR LOWER(user_id) = ? OR LOWER(email) = ? OR LOWER(user_id) = ?
      LIMIT 1
    `,
    args: [cleanEmail, cleanUserId, cleanUserId, cleanEmail],
  });

  if (userRes.rows.length > 0) {
    const u = userRes.rows[0];
    user = {
      email: u.email,
      userId: u.user_id,
      role: u.role || 'admin',
      status: 'active',
      isActive: true,
      hasPassword: !!u.password_hash,
      lastLoginAt: u.last_login_at || null,
      createdAt: u.created_at || null,
    };
  }

  const lookupUserId = user?.userId || cleanUserId || cleanEmail;

  // 2. WhatsApp Settings from crm_user_settings_sql
  let whatsappSettings: any = null;
  const settingsRes = await bunnyExecute({
    sql: 'SELECT data_json FROM crm_user_settings_sql WHERE LOWER(user_id) = ? OR user_id = ? LIMIT 1',
    args: [lookupUserId.toLowerCase(), lookupUserId],
  });

  if (settingsRes.rows.length > 0) {
    try {
      const data = JSON.parse(String(settingsRes.rows[0].data_json));
      whatsappSettings = {
        connectedNumber: data.qrConnectedPhoneNumber || '',
        permanentTenantId: data.permanentTenantId || '',
        qrEnabled: !!data.qrWhatsappEnabled,
        senderName: data.senderDisplayName || '',
        customBridgeUrl: data.qrBridgeUrl || '',
        phoneChangedAt: data.qrPhoneChangedAt || null,
      };
    } catch {
      whatsappSettings = null;
    }
  }

  // 3. Lead counts from leads_sql
  const owners = Array.from(new Set([lookupUserId, cleanEmail, cleanUserId].filter(Boolean)));
  const placeholders = owners.map(() => '?').join(', ');

  const totalRes = await bunnyExecute({
    sql: `SELECT COUNT(*) as count FROM leads_sql WHERE owner_user_id IN (${placeholders})`,
    args: owners,
  });
  const totalCount = Number(totalRes.rows[0]?.count || 0);

  const qrRes = await bunnyExecute({
    sql: `
      SELECT COUNT(*) as count FROM leads_sql
      WHERE owner_user_id IN (${placeholders}) AND json_extract(data_json, '$.source') = 'qr_whatsapp'
    `,
    args: owners,
  });
  const qrCount = Number(qrRes.rows[0]?.count || 0);
  const metaCount = Math.max(0, totalCount - qrCount);

  // Status breakdown
  const statusRes = await bunnyExecute({
    sql: `
      SELECT json_extract(data_json, '$.status') as status, COUNT(*) as count
      FROM leads_sql
      WHERE owner_user_id IN (${placeholders})
      GROUP BY status
    `,
    args: owners,
  });
  const byStatus: Record<string, number> = {};
  for (const r of statusRes.rows) {
    const s = String(r.status || 'unknown');
    byStatus[s] = Number(r.count || 0);
  }

  // Last lead
  let lastLead: any = null;
  const lastLeadRes = await bunnyExecute({
    sql: `
      SELECT data_json FROM leads_sql
      WHERE owner_user_id IN (${placeholders})
      ORDER BY created_at DESC
      LIMIT 1
    `,
    args: owners,
  });
  if (lastLeadRes.rows.length > 0) {
    try {
      const ld = JSON.parse(String(lastLeadRes.rows[0].data_json));
      lastLead = {
        name: ld.name,
        phoneNumber: ld.phoneNumber,
        source: ld.source,
        createdAt: ld.createdAt ? parseDateString(ld.createdAt) : null,
      };
    } catch {
      lastLead = null;
    }
  }

  return {
    login: user,
    whatsapp: whatsappSettings || {
      connectedNumber: '',
      permanentTenantId: '',
      qrEnabled: false,
      senderName: '',
      customBridgeUrl: '',
      phoneChangedAt: null,
    },
    leads: {
      qr: qrCount,
      meta: metaCount,
      total: totalCount,
      byStatus,
    },
    activity: {
      lastLead,
      lastLoginAt: user?.lastLoginAt || null,
    },
  };
}

/**
 * Reset password in BunnyDB admin_users_sql (with safe auto-repair if user missing)
 */
export async function resetTenantPassword({
  email,
  ownerUserId,
  newPassword,
}: {
  email: string;
  ownerUserId?: string;
  newPassword: string;
}): Promise<{ success: boolean; repaired?: boolean; message: string }> {
  await ensureTenantTables();

  const cleanEmail = email.trim().toLowerCase();
  const cleanUserId = (ownerUserId || '').trim().toLowerCase();

  const hash = await bcrypt.hash(newPassword, 12);
  const now = new Date().toISOString();

  // Find existing account in admin_users_sql
  const userCheck = await bunnyExecute({
    sql: 'SELECT id, email, user_id FROM admin_users_sql WHERE LOWER(email) = ? OR LOWER(user_id) = ? LIMIT 1',
    args: [cleanEmail, cleanUserId || cleanEmail],
  });

  if (userCheck.rows.length > 0) {
    const row = userCheck.rows[0];
    await bunnyExecute({
      sql: 'UPDATE admin_users_sql SET password_hash = ?, updated_at = ? WHERE id = ?',
      args: [hash, now, String(row.id)],
    });
    return { success: true, message: `Password reset successfully for ${row.email || cleanEmail}` };
  }

  // If not found in admin_users_sql, look up in crm_tenants_sql and repair/create login
  const allTenants = await bunnyExecute('SELECT * FROM crm_tenants_sql');
  const tenant = allTenants.rows
    .map(normalizeTenant)
    .find((t) => t.ownerEmail.toLowerCase() === cleanEmail || (cleanUserId && t.ownerUserId.toLowerCase() === cleanUserId));

  if (!tenant) {
    throw new Error('No tenant login account found');
  }

  const repairedUserId = tenant.ownerUserId || cleanUserId || cleanEmail;
  const docId = crypto.randomBytes(12).toString('hex');

  await bunnyExecute({
    sql: `
      INSERT INTO admin_users_sql (
        id, user_id, email, password_hash, is_admin, role, tenant_slug, name, phone, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 1, 'admin', ?, ?, ?, ?, ?)
    `,
    args: [
      docId,
      repairedUserId,
      cleanEmail,
      hash,
      tenant.slug,
      tenant.ownerName || tenant.name,
      tenant.ownerPhone || '',
      now,
      now,
    ],
  });

  return {
    success: true,
    repaired: true,
    message: `Login created and password set for ${cleanEmail}`,
  };
}

/**
 * Plans Management in BunnyDB
 */
export async function getTenantPlans(): Promise<PlanRecord[]> {
  await ensureTenantTables();
  const res = await bunnyExecute('SELECT * FROM crm_tenant_plans_sql ORDER BY order_index ASC');

  if (res.rows.length > 0) {
    return res.rows.map((r: any) => {
      try {
        const p = JSON.parse(String(r.data_json));
        return {
          tier: p.tier,
          name: p.name,
          description: p.description || '',
          limits: p.limits || {},
          defaultGroups: p.defaultGroups || PLAN_DEFAULT_GROUPS[p.tier] || [],
          enabledModules: p.enabledModules || PLAN_DEFAULT_GROUPS[p.tier] || [],
          monthlyPriceINR: p.monthlyPriceINR || 0,
          annualPriceINR: p.annualPriceINR || 0,
          quarterlyPriceINR: p.quarterlyPriceINR || 0,
          halfYearlyPriceINR: p.halfYearlyPriceINR || 0,
          trialDays: p.trialDays ?? 0,
          promoCode: p.promoCode || '',
          discountPercent: p.discountPercent ?? 0,
          order: p.order ?? r.order_index ?? 0,
          isCustom: !!p.isCustom,
        };
      } catch {
        return null;
      }
    }).filter(Boolean) as PlanRecord[];
  }

  // Seed default 6 plans if empty
  const defaultPlans: PlanRecord[] = Object.values(PLAN_DEFINITIONS).map((p: any, idx: number) => ({
    tier: p.tier,
    name: p.name,
    description: p.description || '',
    limits: p.limits || {},
    defaultGroups: PLAN_DEFAULT_GROUPS[p.tier] || [],
    enabledModules: PLAN_DEFAULT_GROUPS[p.tier] || [],
    monthlyPriceINR: p.monthlyPriceINR || 0,
    annualPriceINR: p.annualPriceINR || 0,
    quarterlyPriceINR: p.quarterlyPriceINR || 0,
    halfYearlyPriceINR: p.halfYearlyPriceINR || 0,
    trialDays: p.trialDays ?? 0,
    promoCode: p.promoCode || '',
    discountPercent: p.discountPercent ?? 0,
    order: idx,
    isCustom: false,
  }));

  for (const dp of defaultPlans) {
    await bunnyExecute({
      sql: `
        INSERT INTO crm_tenant_plans_sql (tier, data_json, order_index, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(tier) DO UPDATE SET data_json = excluded.data_json
      `,
      args: [dp.tier, JSON.stringify(dp), dp.order || 0],
    });
  }

  return defaultPlans;
}

export async function saveTenantPlan(plan: PlanRecord): Promise<void> {
  await ensureTenantTables();
  await bunnyExecute({
    sql: `
      INSERT INTO crm_tenant_plans_sql (tier, data_json, order_index, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(tier) DO UPDATE SET data_json = excluded.data_json, order_index = excluded.order_index, updated_at = CURRENT_TIMESTAMP
    `,
    args: [plan.tier, JSON.stringify(plan), plan.order || 0],
  });
}

export async function deleteTenantPlan(tier: string): Promise<boolean> {
  await ensureTenantTables();
  const res = await bunnyExecute({
    sql: 'DELETE FROM crm_tenant_plans_sql WHERE tier = ?',
    args: [tier.trim().toLowerCase()],
  });
  return Number(res.rowsAffected || 0) > 0;
}

/**
 * Promo Codes Management in BunnyDB
 */
export async function getPromoCodes(): Promise<PromoCodeRecord[]> {
  await ensureTenantTables();
  const res = await bunnyExecute('SELECT data_json FROM crm_promo_codes_sql ORDER BY updated_at DESC');
  return res.rows.map((r: any) => {
    try {
      return JSON.parse(String(r.data_json));
    } catch {
      return null;
    }
  }).filter(Boolean);
}

export async function savePromoCode(entry: PromoCodeRecord): Promise<void> {
  await ensureTenantTables();
  await bunnyExecute({
    sql: `
      INSERT INTO crm_promo_codes_sql (code, data_json, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(code) DO UPDATE SET data_json = excluded.data_json, updated_at = CURRENT_TIMESTAMP
    `,
    args: [entry.code.toUpperCase(), JSON.stringify(entry)],
  });
}

export async function deletePromoCode(code: string): Promise<boolean> {
  await ensureTenantTables();
  const res = await bunnyExecute({
    sql: 'DELETE FROM crm_promo_codes_sql WHERE code = ?',
    args: [code.toUpperCase()],
  });
  return Number(res.rowsAffected || 0) > 0;
}
