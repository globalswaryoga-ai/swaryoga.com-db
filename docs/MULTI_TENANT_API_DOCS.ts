/**
 * Multi-Tenant SaaS API Documentation
 * Complete guide to all multi-tenant endpoints
 */

// ============================================================================
// TENANT ONBOARDING FLOW
// ============================================================================

/**
 * 1. POST /api/tenants - Create new tenant (public)
 *
 * Request:
 * {
 *   "tenantSlug": "my-studio",
 *   "organizationName": "My Yoga Studio",
 *   "adminEmail": "admin@mystudio.com",
 *   "billingEmail": "billing@mystudio.com",
 *   "initialTier": "free"  // optional, defaults to "free"
 * }
 *
 * Response (201):
 * {
 *   "success": true,
 *   "tenantId": "507f1f77bcf86cd799439011",
 *   "tenantSlug": "my-studio",
 *   "organizationName": "My Yoga Studio",
 *   "subscriptionTier": "free",
 *   "subscriptionStatus": "active",
 *   "apiKey": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
 *   "apiKeyNote": "Save this API key securely. You cannot view it again."
 * }
 */

// ============================================================================
// TENANT MANAGEMENT
// ============================================================================

/**
 * 2. GET /api/tenants/:slug - Get tenant details
 *
 * Public info:
 * $ curl https://app.swaryoga.com/api/tenants/my-studio
 *
 * Response (200):
 * {
 *   "success": true,
 *   "tenant": {
 *     "tenantSlug": "my-studio",
 *     "organizationName": "My Yoga Studio",
 *     "subscriptionTier": "plan2",
 *     "subscriptionStatus": "active"
 *   }
 * }
 *
 * Admin/Full info (requires auth):
 * $ curl -H "Authorization: Bearer token" https://app.swaryoga.com/api/tenants/my-studio
 *
 * Response (200):
 * {
 *   "success": true,
 *   "tenant": {
 *     "tenantId": "507f1f77bcf86cd799439011",
 *     "tenantSlug": "my-studio",
 *     "organizationName": "My Yoga Studio",
 *     "subscriptionTier": "plan2",
 *     "subscriptionStatus": "active",
 *     "trialEndsAt": "2024-02-15T10:30:00Z",
 *     "subscriptionStartDate": "2024-01-05T10:30:00Z",
 *     "billingEmail": "billing@mystudio.com",
 *     "customDomain": "yoga.mystudio.com",
 *     "customDomainVerified": true,
 *     "enabledModules": {
 *       "leads": true,
 *       "whatsapp": true,
 *       "aiCalls": true,
 *       "broadcasting": false,
 *       "reports": true,
 *       "community": false,
 *       "templates": true,
 *       "callRecording": false
 *     },
 *     "usage": {
 *       "leadsCount": 1250,
 *       "messagesCount": 5600,
 *       "callsCount": 120,
 *       "storageUsedMB": 450,
 *       "teamMembersCount": 3
 *     },
 *     "limits": {
 *       "maxLeads": 2000,
 *       "maxUsers": 3,
 *       "storageQuotaMB": 5000
 *     }
 *   }
 * }
 */

/**
 * 3. PUT /api/tenants/:slug - Update tenant (admin only)
 *
 * Upgrade subscription:
 * $ curl -X PUT \
 *   -H "Authorization: Bearer token" \
 *   -H "Content-Type: application/json" \
 *   -d '{"subscriptionTier": "plan3"}' \
 *   https://app.swaryoga.com/api/tenants/my-studio
 *
 * Response (200):
 * {
 *   "success": true,
 *   "message": "Subscription updated",
 *   "tenant": { ... }
 * }
 *
 * Set custom domain:
 * $ curl -X PUT \
 *   -H "Authorization: Bearer token" \
 *   -H "Content-Type: application/json" \
 *   -d '{"customDomain": "yoga.mystudio.com"}' \
 *   https://app.swaryoga.com/api/tenants/my-studio
 *
 * Response (200):
 * {
 *   "success": true,
 *   "message": "Custom domain set. Please add CNAME record...",
 *   "tenant": { ... }
 * }
 */

/**
 * 4. DELETE /api/tenants/:slug - Delete tenant (superadmin only)
 *
 * $ curl -X DELETE \
 *   -H "Authorization: Bearer superadmin_token" \
 *   https://app.swaryoga.com/api/tenants/my-studio
 *
 * Response (200):
 * {
 *   "success": true,
 *   "message": "Tenant deleted successfully"
 * }
 */

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

/**
 * 5. GET /api/tenants/:slug/api-keys - List API keys (admin only)
 *
 * $ curl -H "Authorization: Bearer token" \
 *   https://app.swaryoga.com/api/tenants/my-studio/api-keys
 *
 * Response (200):
 * {
 *   "success": true,
 *   "tenantSlug": "my-studio",
 *   "keys": [
 *     {
 *       "_id": "507f1f77bcf86cd799439012",
 *       "name": "Production",
 *       "permissions": ["leads:read", "leads:write", "messages:*"],
 *       "lastUsedAt": "2024-01-10T15:30:00Z",
 *       "callCount": 1250,
 *       "isActive": true,
 *       "expiresAt": "2025-01-10T00:00:00Z"
 *     }
 *   ]
 * }
 */

/**
 * 6. POST /api/tenants/:slug/api-keys - Create API key (admin only)
 *
 * $ curl -X POST \
 *   -H "Authorization: Bearer token" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "name": "Mobile App Integration",
 *     "permissions": [
 *       "leads:read",
 *       "leads:write",
 *       "messages:read",
 *       "messages:write"
 *     ]
 *   }' \
 *   https://app.swaryoga.com/api/tenants/my-studio/api-keys
 *
 * Response (201):
 * {
 *   "success": true,
 *   "message": "API key created successfully",
 *   "keyId": "507f1f77bcf86cd799439013",
 *   "name": "Mobile App Integration",
 *   "plainKey": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9",
 *   "warning": "Save this key securely. You will not be able to view it again."
 * }
 */

/**
 * 7. DELETE /api/tenants/:slug/api-keys/:keyId - Revoke API key (admin only)
 *
 * $ curl -X DELETE \
 *   -H "Authorization: Bearer token" \
 *   https://app.swaryoga.com/api/tenants/my-studio/api-keys/507f1f77bcf86cd799439013
 *
 * Response (200):
 * {
 *   "success": true,
 *   "message": "API key revoked successfully",
 *   "keyId": "507f1f77bcf86cd799439013",
 *   "revokedAt": "2024-01-10T16:45:00Z"
 * }
 */

// ============================================================================
// ANALYTICS & USAGE
// ============================================================================

/**
 * 8. GET /api/tenants/:slug/analytics - Get usage analytics (admin only)
 *
 * Default: Last 30 days
 * $ curl -H "Authorization: Bearer token" \
 *   https://app.swaryoga.com/api/tenants/my-studio/analytics
 *
 * Custom date range:
 * $ curl -H "Authorization: Bearer token" \
 *   "https://app.swaryoga.com/api/tenants/my-studio/analytics?startDate=2024-01-01&endDate=2024-01-31"
 *
 * Response (200):
 * {
 *   "success": true,
 *   "tenantSlug": "my-studio",
 *   "period": {
 *     "startDate": "2024-01-01T00:00:00Z",
 *     "endDate": "2024-01-31T23:59:59Z"
 *   },
 *   "totals": {
 *     "leadsCreated": 150,
 *     "messagesSent": 2500,
 *     "callsPlaced": 45,
 *     "logins": 120,
 *     "apiCalls": 5600
 *   },
 *   "currentUsage": {
 *     "leadsCount": 1250,
 *     "messagesCount": 5600,
 *     "callsCount": 120,
 *     "storageUsedMB": 450,
 *     "teamMembersCount": 3
 *   },
 *   "limits": {
 *     "maxLeads": 2000,
 *     "maxUsers": 3,
 *     "storageQuotaMB": 5000
 *   },
 *   "dailyMetrics": [
 *     {
 *       "_id": "507f...",
 *       "date": "2024-01-31T00:00:00Z",
 *       "leadsCreated": 10,
 *       "messagesSent": 150,
 *       "callsPlaced": 5,
 *       "logins": 8,
 *       "apiCalls": 250
 *     },
 *     ...
 *   ]
 * }
 */

// ============================================================================
// CRM ROUTES WITH TENANT CONTEXT (EXAMPLES)
// ============================================================================

/**
 * Get leads for current tenant (with browser auth)
 *
 * $ curl -H "x-tenant-slug: my-studio" \
 *   -H "Authorization: Bearer user_token" \
 *   https://app.swaryoga.com/api/admin/crm/leads
 *
 * Response:
 * {
 *   "success": true,
 *   "leads": [ { _id, name, phone, tenantId, ... }, ...]
 * }
 */

/**
 * Create new lead with API key (programmatic access)
 *
 * $ curl -X POST \
 *   -H "Authorization: Bearer a1b2c3d4e5f6..." \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "name": "John Yoga",
 *     "phone": "9876543210",
 *     "email": "john@yoga.com",
 *     "source": "website"
 *   }' \
 *   https://app.swaryoga.com/api/admin/crm/leads
 *
 * Response (201):
 * {
 *   "success": true,
 *   "lead": {
 *     "_id": "507f...",
 *     "tenantId": "507f1f77bcf86cd799439011",
 *     "name": "John Yoga",
 *     "phone": "9876543210",
 *     "createdAt": "2024-01-10T16:45:00Z"
 *   }
 * }
 */

/**
 * Send WhatsApp message via API key
 *
 * $ curl -X POST \
 *   -H "Authorization: Bearer api_key" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "leadId": "507f...",
 *     "message": "Hi! Check out our yoga classes",
 *     "mediaUrl": "https://example.com/image.jpg"
 *   }' \
 *   https://app.swaryoga.com/api/admin/crm/messages
 *
 * Response (201):
 * {
 *   "success": true,
 *   "result": { messageId, tenantId, status, ... }
 * }
 */

// ============================================================================
// SUBSCRIPTION TIERS
// ============================================================================

/**
 * Free Tier ✅
 * - 250 leads
 * - 1 team member
 * - Modules: leads, whatsapp
 * - $0/month
 *
 * Plan 1 (Small Studio) ✅
 * - 500 leads
 * - 2 team members
 * - Modules: leads, whatsapp, broadcasting
 * - $99/month
 *
 * Plan 2 (Growing Studio) ✅
 * - 2,000 leads
 * - 3 team members
 * - Modules: leads, whatsapp, broadcasting, aiCalls, reports
 * - $299/month
 *
 * Plan 3 (Pro Studio) ✅
 * - 10,000 leads
 * - 5 team members
 * - Modules: all except callRecording
 * - $799/month
 *
 * Plan 4 (Enterprise) ✅
 * - 100,000 leads
 * - 10 team members
 * - Modules: all features including callRecording
 * - $1999/month
 */

// ============================================================================
// ERROR RESPONSES
// ============================================================================

/**
 * 400 Bad Request
 * {
 *   "success": false,
 *   "error": "Missing required fields: tenantSlug, organizationName, adminEmail"
 * }
 *
 * 401 Unauthorized
 * {
 *   "success": false,
 *   "error": "Authorization required"
 * }
 *
 * 403 Forbidden
 * {
 *   "success": false,
 *   "error": "Unauthorized to update this tenant"
 * }
 *
 * 404 Not Found
 * {
 *   "success": false,
 *   "error": "Tenant not found"
 * }
 *
 * 402 Payment Required (Usage Limit Exceeded)
 * {
 *   "success": false,
 *   "error": "Lead limit exceeded for your plan",
 *   "currentLimit": 2000,
 *   "upgrade": "https://app.swaryoga.com/upgrade"
 * }
 *
 * 429 Too Many Requests (Rate Limited)
 * {
 *   "error": "Too many requests. Please try again later.",
 *   "retryAfter": 45
 * }
 */

// ============================================================================
// AUTHENTICATION METHODS
// ============================================================================

/**
 * Method 1: Browser Auth (User Token)
 * POST /api/auth/login → returns JWT token
 * Use with: x-tenant-slug header or subdomain
 *
 * $ curl -H "x-tenant-slug: my-studio" \
 *        -H "Authorization: Bearer eyJ..." \
 *        https://app.swaryoga.com/api/admin/crm/leads
 *
 * Method 2: API Key Auth (Programmatic)
 * Generate key via: POST /api/tenants/:slug/api-keys
 * Use with: Authorization: Bearer <api_key>
 *
 * $ curl -H "Authorization: Bearer a1b2c3d4..." \
 *        https://app.swaryoga.com/api/admin/crm/leads
 *
 * Method 3: Tenant Slug Header
 * Explicit tenant routing in multi-domain setup
 *
 * $ curl -H "x-tenant-slug: my-studio" \
 *        -H "Authorization: Bearer eyJ..." \
 *        https://api.swaryoga.com/api/admin/crm/leads
 *
 * Method 4: Subdomain
 * Automatic from hostname (my-studio.app.swaryoga.com)
 * Next.js middleware extracts automatically
 */

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Global Rate Limits (per IP, per minute):
 * - General API: 30 requests/min
 * - CRM Admin: 180 requests/min (with auth: 240)
 * - WhatsApp: 60 requests/min (with auth: 600)
 * - Messages: 60 requests/min (with auth: 240)
 * - Auth: 30 requests/min
 *
 * Per-Tenant Limits:
 * - Configurable via tenant.rateLimitPerHour
 * - Default: 1000 API calls/hour
 * - Returns 429 if exceeded
 *
 * Response Headers:
 * - RateLimit-Limit: 180
 * - RateLimit-Remaining: 45
 * - Retry-After: 30
 * - X-RateLimit-Bucket: crm_admin
 */

export {};
