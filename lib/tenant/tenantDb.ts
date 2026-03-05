/**
 * Multi-Tenant SaaS — Per-Tenant Database Manager
 *
 * Provides `getTenantDb(slug)` which returns a Mongoose Connection object
 * pointing at the tenant's isolated database (e.g. `tenant_acme_yoga_crm`).
 *
 * The implementation mirrors the existing `getCrmDb()` pattern in
 * enterpriseSchemas.ts but extends it with:
 *   - Per-tenant connection cache (global, survives hot reloads)
 *   - Database naming convention enforcement
 *   - Model registration helpers scoped to a tenant DB
 *   - Tenant provisioning (create DB + seed collections)
 *
 * IMPORTANT: `connectDB()` from `@/lib/db` MUST be called before using
 * any function in this module.
 */

import mongoose from 'mongoose';

// ---------------------------------------------------------------------------
// Global cache for tenant DB connections (survives Next.js hot reloads)
// ---------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line no-var
  var _tenantDbCache: Record<string, mongoose.Connection>;
}

if (!global._tenantDbCache) {
  global._tenantDbCache = {};
}

// ---------------------------------------------------------------------------
// Naming convention
// ---------------------------------------------------------------------------

/** Default tenant slug used for the original/master Swar Yoga data. */
export const MASTER_TENANT_SLUG = 'swaryoga';

/** CRM DB name used before multi-tenancy (backward compat). */
const LEGACY_CRM_DB = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

/**
 * Derive the MongoDB database name for a tenant slug.
 *
 * Convention: `tenant_{slug}_crm`
 * The master tenant (slug `swaryoga`) maps to the existing `swaryoga_admin_crm`
 * database to maintain perfect backward compatibility.
 */
export function tenantDbName(slug: string): string {
  if (slug === MASTER_TENANT_SLUG) {
    return LEGACY_CRM_DB;
  }
  // Sanitise: only lowercase alphanumerics and hyphens → underscores
  const safe = slug.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `tenant_${safe}_crm`;
}

// ---------------------------------------------------------------------------
// Connection getter
// ---------------------------------------------------------------------------

/**
 * Returns a Mongoose Connection scoped to the tenant's CRM database.
 *
 * The connection is cached globally so subsequent calls for the same tenant
 * reuse the same handle (just like `getCrmDb()` in enterpriseSchemas.ts).
 *
 * @param slug – Tenant slug (string, e.g. "acme-yoga")
 * @returns mongoose.Connection to tenant's database
 */
export function getTenantDb(slug: string): mongoose.Connection {
  const dbName = tenantDbName(slug);

  // Check cache first
  if (global._tenantDbCache[dbName]) {
    return global._tenantDbCache[dbName];
  }

  // Create a new useDb handle that shares the underlying connection pool.
  // `useCache: true` tells Mongoose to reuse if it already has one for this name.
  const conn = mongoose.connection.useDb(dbName, { useCache: true });
  global._tenantDbCache[dbName] = conn;
  console.log(`[tenantDb] Created connection for tenant "${slug}" → db "${dbName}"`);
  return conn;
}

// ---------------------------------------------------------------------------
// Model helper (tenant-scoped)
// ---------------------------------------------------------------------------

/**
 * Get or register a Mongoose model on a tenant's database connection.
 *
 * This is the tenant-scoped equivalent of `getModel()` in enterpriseSchemas.ts.
 * It ensures each tenant's DB has its own model instance (different underlying
 * collection namespace) while sharing the same schema definitions.
 *
 * ```ts
 * const tenantDb = getTenantDb('acme');
 * const Lead = getTenantModel(tenantDb, 'Lead', LeadSchema);
 * ```
 */
export function getTenantModel<T = any>(
  conn: mongoose.Connection,
  modelName: string,
  schema: mongoose.Schema,
): mongoose.Model<T> {
  // Reuse existing model if already registered on this connection
  if (conn.models[modelName]) {
    return conn.models[modelName] as mongoose.Model<T>;
  }
  return conn.model<T>(modelName, schema);
}

// ---------------------------------------------------------------------------
// Provisioning
// ---------------------------------------------------------------------------

/**
 * Provision a brand-new tenant database.
 *
 * Steps:
 *   1. Create the database (implicitly via first write).
 *   2. Create initial collections + indexes.
 *   3. Seed a default AutoConfig document.
 *
 * This function is idempotent — safe to call even if the DB already exists.
 */
export async function provisionTenantDb(slug: string): Promise<{ dbName: string; ok: boolean }> {
  const dbName = tenantDbName(slug);
  const conn = getTenantDb(slug);

  try {
    // Create a sentinel collection to ensure the database is created on disk
    const db = conn.db;
    if (!db) {
      throw new Error('Underlying db handle is null. Was connectDB() called first?');
    }

    // Ensure base collections exist (creates them if absent)
    const requiredCollections = [
      'leads',
      'whatsappmessages',
      'whatsappwebhookevents',
      'auditlogs',
      'autoconfigs',
      'messagestatuses',
    ];

    const existing = await db.listCollections().toArray();
    const existingNames = new Set(existing.map((c) => c.name));

    for (const colName of requiredCollections) {
      if (!existingNames.has(colName)) {
        await db.createCollection(colName);
        console.log(`[tenantDb] Created collection "${colName}" in ${dbName}`);
      }
    }

    // Seed a default AutoConfig document (like the one in enterpriseSchemas)
    const autoConfigCol = db.collection('autoconfigs');
    const existingConfig = await autoConfigCol.findOne({ _type: 'default' });
    if (!existingConfig) {
      await autoConfigCol.insertOne({
        _type: 'default',
        autoReplyEnabled: false,
        autoReplyDelaySec: 0,
        businessHoursStart: '09:00',
        businessHoursEnd: '18:00',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`[tenantDb] Seeded default AutoConfig in ${dbName}`);
    }

    console.log(`[tenantDb] Provisioning complete for tenant "${slug}" → ${dbName}`);
    return { dbName, ok: true };
  } catch (err) {
    console.error(`[tenantDb] Provisioning failed for "${slug}":`, err);
    return { dbName, ok: false };
  }
}

// ---------------------------------------------------------------------------
// Cleanup (for testing / tenant archival)
// ---------------------------------------------------------------------------

/**
 * Drop a tenant's database entirely. **Destructive!**
 * Use only for test teardown or permanent tenant removal.
 */
export async function dropTenantDb(slug: string): Promise<void> {
  const dbName = tenantDbName(slug);
  const conn = getTenantDb(slug);
  const db = conn.db;
  if (db) {
    await db.dropDatabase();
    console.log(`[tenantDb] Dropped database "${dbName}" for tenant "${slug}"`);
  }
  // Remove from cache
  delete global._tenantDbCache[dbName];
}

// ---------------------------------------------------------------------------
// Backward compat — drop-in for existing getCrmDb() callers
// ---------------------------------------------------------------------------

/**
 * Returns the CRM database for the **master** tenant.
 *
 * Existing code that calls `getCrmDb()` can be migrated to call this instead,
 * and it will behave identically for the original Swar Yoga instance.
 */
export function getMasterCrmDb(): mongoose.Connection {
  return getTenantDb(MASTER_TENANT_SLUG);
}
