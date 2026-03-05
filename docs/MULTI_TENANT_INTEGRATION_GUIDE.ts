/**
 * Multi-Tenant CRM Integration Guide
 * Shows how to update existing CRM routes to support multi-tenancy
 */

// ============================================================================
// EXAMPLE 1: Update Leads Route
// ============================================================================

// OLD (Single-tenant):
// app/api/admin/crm/leads/route.ts
// 
// export async function GET(request: NextRequest) {
//   const { decoded } = await getAuth(request);
//   const leads = await Lead.find({ createdByUserId: decoded.userId });
//   return NextResponse.json(leads);
// }

// NEW (Multi-tenant):
/*
import { withTenantContext } from '@/lib/multiTenant/middleware';
import { buildTenantFilter, buildUserAccessFilter } from '@/lib/multiTenant/middleware';

export const GET = withTenantContext(async (request: any) => {
  const { decoded } = await getAuth(request);
  const { tenantId, isAdmin } = request.tenantContext;

  // Build filter combining tenant + user access
  const filter = buildUserAccessFilter(tenantId, decoded.userId, isAdmin);

  const leads = await Lead.find(filter);
  return NextResponse.json({ success: true, leads });
});

export const POST = withTenantContext(async (request: any) => {
  const { decoded } = await getAuth(request);
  const { tenantId } = request.tenantContext;
  const body = await request.json();

  // Always add tenantId to new records
  const newLead = await Lead.create({
    ...body,
    tenantId,
    createdByUserId: decoded.userId,
  });

  return NextResponse.json({ success: true, lead: newLead }, { status: 201 });
});
*/

// ============================================================================
// EXAMPLE 2: Update WhatsApp Messages Route
// ============================================================================

// OLD:
// app/api/admin/crm/messages/route.ts
//
// export async function GET(request: NextRequest) {
//   const messages = await WhatsAppMessage.find({ leadId }).limit(50);
//   return NextResponse.json(messages);
// }

// NEW (Multi-tenant with API key support):
/*
import { withTenantContext, withAPIKeyAuth } from '@/lib/multiTenant/middleware';
import { buildTenantFilter } from '@/lib/multiTenant/middleware';

// For browser-based CRM dashboard
export const GET = withTenantContext(async (request: any) => {
  const { tenantId } = request.tenantContext;
  const leadId = request.nextUrl.searchParams.get('leadId');

  const messages = await WhatsAppMessage.find({
    ...buildTenantFilter(tenantId),
    leadId,
  })
    .sort({ timestamp: -1 })
    .limit(100);

  return NextResponse.json({ success: true, messages });
});

// For API clients (programmatic access)
export const POST = withAPIKeyAuth(async (request: any) => {
  const { tenantId, limits, enabledModules } = request.tenantContext;

  // Check if module is enabled
  if (!enabledModules.whatsapp) {
    return NextResponse.json(
      { error: 'WhatsApp module not enabled for your plan' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { leadId, message, mediaUrl } = body;

  // Send message via WhatsApp bridge
  const result = await sendWhatsAppMessage({
    ...body,
    tenantId,
  });

  return NextResponse.json({ success: true, result }, { status: 201 });
});
*/

// ============================================================================
// EXAMPLE 3: Update Sales/Funnel Route with Usage Limits
// ============================================================================

// NEW (with usage enforcement):
/*
import {
  withTenantContext,
  checkUsageLimit,
  recordUsage,
  enforceModule,
} from '@/lib/multiTenant/middleware';

export const POST = withTenantContext(async (request: any) => {
  const { tenantId, limits, enabledModules } = request.tenantContext;
  const body = await request.json();

  // Check if leads module is enabled
  enforceModule(enabledModules, 'leads', 'Leads module not enabled');

  // Check if tenant has reached lead limit
  const withinLimit = await checkUsageLimit(
    tenantId,
    'leads',
    body.contacts.length
  );

  if (!withinLimit) {
    return NextResponse.json(
      {
        error: 'Lead limit exceeded for your plan',
        currentLimit: limits.maxLeads,
        upgrade: 'https://app.swaryoga.com/upgrade',
      },
      { status: 402 }
    );
  }

  // Create leads
  const results = [];
  for (const contact of body.contacts) {
    const lead = await Lead.create({
      ...contact,
      tenantId,
      createdByUserId: decoded.userId,
    });
    results.push(lead);
  }

  // Record usage
  await recordUsage(tenantId, 'leads', body.contacts.length);

  return NextResponse.json({ success: true, created: results.length });
});
*/

// ============================================================================
// EXAMPLE 4: Create Tenant-Scoped User Route
// ============================================================================

/*
import { withTenantContext } from '@/lib/multiTenant/middleware';
import { getTenantById } from '@/lib/multiTenant/handlers';

export const GET = withTenantContext(async (request: any) => {
  const { tenantId, isAdmin } = request.tenantContext;

  if (!isAdmin) {
    return NextResponse.json(
      { error: 'Only admins can view team members' },
      { status: 403 }
    );
  }

  const tenant = await getTenantById(tenantId);
  const users = await User.find({
    tenantId,
  });

  return NextResponse.json({
    success: true,
    tenantSlug: tenant.tenantSlug,
    maxUsers: tenant.limits.maxUsers,
    currentUsers: users.length,
    users,
  });
});

export const POST = withTenantContext(async (request: any) => {
  const { tenantId, limits, isAdmin } = request.tenantContext;

  if (!isAdmin) {
    return NextResponse.json(
      { error: 'Only admins can add team members' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const currentUsers = await User.countDocuments({ tenantId });

  if (currentUsers >= limits.maxUsers) {
    return NextResponse.json(
      {
        error: 'User limit reached for your plan',
        maxUsers: limits.maxUsers,
      },
      { status: 402 }
    );
  }

  // Add user to tenant and send invite
  const newUser = await User.create({
    ...body,
    tenantId,
    role: 'user',
  });

  return NextResponse.json(
    { success: true, user: newUser },
    { status: 201 }
  );
});
*/

// ============================================================================
// INTEGRATION CHECKLIST
// ============================================================================

/*
For each existing CRM route, follow this checklist:

1. Import withTenantContext or withAPIKeyAuth:
   ```
   import { withTenantContext } from '@/lib/multiTenant/middleware';
   ```

2. Wrap handler:
   ```
   export const GET = withTenantContext(async (request: any) => {
     const { tenantId, isAdmin } = request.tenantContext;
     // ... rest of handler
   });
   ```

3. Add tenantId to all queries:
   ```
   const { buildTenantFilter } = await import('@/lib/multiTenant/middleware');
   const filter = buildTenantFilter(tenantId);
   await Model.find({ ...filter, otherConditions });
   ```

4. For user access control:
   ```
   const { buildUserAccessFilter } = await import('@/lib/multiTenant/middleware');
   const filter = buildUserAccessFilter(tenantId, userId, isAdmin);
   ```

5. For POST/CREATE operations, add tenantId:
   ```
   await Model.create({
     ...body,
     tenantId,
     createdByUserId: decoded.userId,
   });
   ```

6. For module-gated features:
   ```
   const { enforceModule } = await import('@/lib/multiTenant/middleware');
   enforceModule(enabledModules, 'aiCalls', 'AI Calls not enabled');
   ```

7. For routes with usage limits:
   ```
   const { checkUsageLimit, recordUsage } = await import('@/lib/multiTenant/middleware');
   
   if (!checkUsageLimit(tenantId, 'leads', count)) {
     return error('Limit exceeded');
   }
   await recordUsage(tenantId, 'leads', count);
   ```

Routes needing updates (~30 files):
□ app/api/admin/crm/leads/route.ts
□ app/api/admin/crm/sales/route.ts
□ app/api/admin/crm/messages/route.ts
□ app/api/admin/crm/whatsapp-accounts/route.ts
□ app/api/admin/crm/whatsapp/add-account/route.ts
□ app/api/admin/crm/whatsapp/qr/route.ts
□ app/api/admin/crm/members/route.ts
□ app/api/admin/crm/member-details/route.ts
□ app/api/admin/crm/promote-member/route.ts
□ app/api/admin/crm/retell-webrtc/route.ts
□ app/api/admin/crm/retell/[route]/route.ts (all retell routes)
□ app/api/admin/crm/broadcasts/route.ts
□ app/api/admin/crm/templates/route.ts
□ app/api/admin/crm/reports/route.ts
... and all others

Priority order for migration:
1. Core: leads, sales, messages (highest usage)
2. Integration: whatsapp, ai-calls/retell
3. Management: members, broadcasts, templates
4. Analytics: reports, analytics
*/

export {};
