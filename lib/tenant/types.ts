/**
 * Multi-Tenant SaaS — Core Type Definitions
 *
 * Defines the data structures shared across the tenant subsystem:
 *   - Plan tiers & limits
 *   - Tenant document shape (master registry)
 *   - Module gating
 *   - Request-scoped tenant context
 */

// ---------------------------------------------------------------------------
// Plan Tiers
// ---------------------------------------------------------------------------

export enum PlanTier {
  FREE       = 'free',
  BASIC      = 'basic',       // Plan 0.5 - ₹999/mo
  STARTER    = 'starter',     // Plan 1 - ₹1,999/mo
  GROWTH     = 'growth',      // Plan 2 - ₹4,999/mo
  PROFESSIONAL = 'professional', // Plan 3 - ₹9,999/mo
  ENTERPRISE = 'enterprise',  // Plan 4 - Custom
}

// ---------------------------------------------------------------------------
// Gated Modules — features that can be enabled/disabled per plan/tenant
// ---------------------------------------------------------------------------

export enum TenantModule {
  CRM             = 'crm',
  WHATSAPP        = 'whatsapp',
  VOICE_AI        = 'voice_ai',
  PAYMENTS        = 'payments',
  CERTIFICATES    = 'certificates',
  LIFE_PLANNER    = 'life_planner',
  WORKSHOPS       = 'workshops',
  BROADCASTS      = 'broadcasts',
  CHATBOT         = 'chatbot',
  META_FORMS      = 'meta_forms',
  TALLY           = 'tally',
  COMMUNITY       = 'community',
  ANALYTICS       = 'analytics',
  CUSTOM_DOMAIN   = 'custom_domain',
  API_ACCESS      = 'api_access',
}

// ---------------------------------------------------------------------------
// Plan Limits — numeric caps enforced at runtime
// ---------------------------------------------------------------------------

export interface PlanLimits {
  maxLeads: number;           // e.g. 250, 5000, …100 000
  maxUsers: number;           // admin/agent seats
  maxWhatsAppTemplates: number;
  maxBroadcastsPerDay: number;
  maxStorageMB: number;       // media / certificate uploads
  maxApiRequestsPerDay: number;
}

// ---------------------------------------------------------------------------
// Plan Definition (static config — see plans.ts)
// ---------------------------------------------------------------------------

export interface PlanDefinition {
  tier: PlanTier;
  name: string;               // human-friendly label
  description: string;
  limits: PlanLimits;
  enabledModules: TenantModule[];
  monthlyPriceINR: number;    // 0 for free tier
  annualPriceINR: number;
}

// ---------------------------------------------------------------------------
// Tenant Document — stored in master registry (swaryogaDB.tenants)
// ---------------------------------------------------------------------------

export interface ITenant {
  _id?: string;
  /** URL-safe unique slug, e.g. "acme-yoga" */
  slug: string;
  /** Display name */
  name: string;
  /** Primary contact email for the org owner */
  ownerEmail: string;
  /** Owner's user ID (links to admin user who created the tenant) */
  ownerUserId: string;

  // ---- Plan & billing ----
  plan: PlanTier;
  /** Per-tenant overrides (e.g. custom lead limit above plan default) */
  customLimits?: Partial<PlanLimits>;
  /** Modules explicitly enabled — merged with plan defaults */
  enabledModules: TenantModule[];

  // ---- Database isolation ----
  /** Mongo database name for this tenant, e.g. "tenant_acme_yoga_crm" */
  dbName: string;

  // ---- Domain routing ----
  /** Subdomain prefix, e.g. "acme" → acme.app.swaryoga.com */
  subdomain?: string;
  /** Custom domain (CNAME verified), e.g. "crm.acme-yoga.com" */
  customDomain?: string;
  /** Whether the custom domain's DNS has been verified */
  customDomainVerified?: boolean;

  // ---- Status ----
  status: 'active' | 'suspended' | 'pending' | 'archived';
  /** ISO date strings */
  createdAt?: string;
  updatedAt?: string;
  /** When the current subscription period ends */
  subscriptionEndsAt?: string;

  // ---- Usage counters (updated daily by cron/aggregation) ----
  currentLeadCount?: number;
  currentUserCount?: number;
  currentStorageMB?: number;
}

// ---------------------------------------------------------------------------
// Encrypted API Key Vault Entry
// ---------------------------------------------------------------------------

export interface ITenantApiKey {
  _id?: string;
  tenantId: string;
  /** Identifier, e.g. "whatsapp_access_token", "cashfree_secret" */
  keyName: string;
  /** AES-256-GCM encrypted value */
  encryptedValue: string;
  /** Hex IV for AES-GCM */
  iv: string;
  /** Hex auth tag */
  authTag: string;
  createdAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Tenant Usage Snapshot (daily aggregation)
// ---------------------------------------------------------------------------

export interface ITenantUsage {
  _id?: string;
  tenantId: string;
  /** YYYY-MM-DD */
  date: string;
  /** Counts accumulated during this day */
  leadsCreated: number;
  messagesSent: number;
  broadcastsSent: number;
  apiRequests: number;
  storageDeltaMB: number;
}

// ---------------------------------------------------------------------------
// Request-scoped Tenant Context (set by middleware, consumed by API routes)
// ---------------------------------------------------------------------------

export interface TenantContext {
  /** Tenant slug (always present once resolved) */
  tenantId: string;
  /** Full tenant document */
  tenant: ITenant;
  /** Resolved effective limits (plan defaults + custom overrides) */
  limits: PlanLimits;
  /** Convenience set for O(1) module check */
  modules: Set<TenantModule>;
  /** Tenant-specific CRM database connection (mongoose Connection) */
  dbName: string;
}

// ---------------------------------------------------------------------------
// Tenant Onboarding Request (API payload)
// ---------------------------------------------------------------------------

export interface CreateTenantRequest {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerUserId: string;
  plan?: PlanTier;
  customDomain?: string;
}
