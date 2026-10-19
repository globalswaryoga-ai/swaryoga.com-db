import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

function jsonResponse(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders });
}

/**
 * GET /api/crm-site/setup-status
 * 
 * Returns the comprehensive setup status for the current user
 * Superadmins automatically bypass setup payment
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const decoded = verifyToken(token);

    if (!decoded) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // Superadmins bypass all setup requirements
    const superAdmin = isSuperAdmin(decoded);

    if (superAdmin) {
      return jsonResponse({
        setupPaid: true,
        setupPaidAt: new Date().toISOString(),
        whatsappConnected: true,
        whatsappAccountId: null,
        whatsappTemplates: true,
        templateCount: 0,
        retellConnected: true,
        retellAccountId: null,
        teamInvited: true,
        teamMembersCount: 0,
        leadsImported: true,
        leadsCount: 0,
        isFirstLogin: false,
        loginCount: 999,
        overallProgress: 100,
        isSuperAdmin: true,
      });
    }

    const userId = String(decoded.userId || decoded.email || '');
    const userEmail = String(decoded.email || '');

    // 1. Fetch user from BunnyDB admin_users_sql
    const userRes = await bunnyExecute({
      sql: 'SELECT * FROM admin_users_sql WHERE lower(user_id) = lower(?) OR lower(email) = lower(?) LIMIT 1',
      args: [userId, userEmail],
    });
    const user: any = userRes.rows[0] || {};
    const tenantSlug = String(user.tenant_slug || (decoded as any).tenantSlug || '').trim();

    // 2. Fetch compartment from BunnyDB user_compartments_sql
    const compRes = await bunnyExecute({
      sql: 'SELECT data_json FROM user_compartments_sql WHERE user_id = ? LIMIT 1',
      args: [userId],
    });
    let compartment: any = null;
    if (compRes.rows[0]?.data_json) {
      try {
        compartment = JSON.parse(String(compRes.rows[0].data_json));
      } catch {
        compartment = null;
      }
    }

    // 3. Fetch tenant from BunnyDB crm_tenants_sql
    let tenant: any = null;
    if (tenantSlug) {
      const tenantRes = await bunnyExecute({
        sql: 'SELECT data_json FROM crm_tenants_sql WHERE tenant_slug = ? LIMIT 1',
        args: [tenantSlug],
      });
      if (tenantRes.rows[0]?.data_json) {
        try {
          tenant = JSON.parse(String(tenantRes.rows[0].data_json));
        } catch {
          tenant = null;
        }
      }
    }

    // 4. Fetch leads count from BunnyDB leads_sql
    let leadsCount = 0;
    try {
      const leadsRes = await bunnyExecute({
        sql: 'SELECT count(*) as count FROM leads_sql WHERE tenant_slug = ? OR created_by_user_id = ?',
        args: [tenantSlug || userId, userId],
      });
      leadsCount = Number(leadsRes.rows[0]?.count) || 0;
    } catch {
      leadsCount = 0;
    }

    // 5. Fetch team members count from BunnyDB admin_users_sql
    let teamMembers = 0;
    if (tenantSlug) {
      try {
        const teamRes = await bunnyExecute({
          sql: 'SELECT count(*) as count FROM admin_users_sql WHERE tenant_slug = ? AND user_id != ?',
          args: [tenantSlug, userId],
        });
        teamMembers = Number(teamRes.rows[0]?.count) || 0;
      } catch {
        teamMembers = 0;
      }
    }

    const compartmentStatus = compartment ? {
      exists: true,
      isComplete: compartment.setup?.isComplete || true,
      folderName: compartment.folderName || null,
      compartmentId: compartment.compartmentId || null,
      bunnyFolderCreated: true,
      mongodbConfigured: false,
      storageQuotaMB: compartment.storage?.quotaMB || tenant?.customLimits?.maxStorageMB || 500,
      storageUsedMB: compartment.storage?.usedMB || 0,
      storagePlan: compartment.storage?.plan || tenant?.plan || 'basic',
      steps: compartment.setup?.steps || {
        folderNameChosen: true,
        storagePurchased: true,
        bunnyFolderCreated: true,
        mongodbConfigured: false,
        connectionVerified: true,
      },
    } : {
      exists: true,
      isComplete: true,
      folderName: tenantSlug || userId,
      compartmentId: tenantSlug || userId,
      bunnyFolderCreated: true,
      mongodbConfigured: false,
      storageQuotaMB: tenant?.customLimits?.maxStorageMB || 500,
      storageUsedMB: 0,
      storagePlan: tenant?.plan || 'basic',
      steps: {
        folderNameChosen: true,
        storagePurchased: true,
        bunnyFolderCreated: true,
        mongodbConfigured: false,
        connectionVerified: true,
      },
    };

    const hasWhatsApp = !!(tenant?.enabledModules?.includes?.('qr') || tenant?.moduleKeys?.includes?.('qr') || false);

    // Return comprehensive status from BunnyDB
    return jsonResponse({
      setupPaid: true,
      setupPaidAt: user?.created_at || new Date().toISOString(),
      
      whatsappConnected: hasWhatsApp,
      whatsappAccountId: null,
      
      whatsappTemplates: true,
      templateCount: 5,
      
      retellConnected: false,
      retellAccountId: null,
      
      teamInvited: teamMembers > 0,
      teamMembersCount: teamMembers,
      
      leadsImported: leadsCount > 0,
      leadsCount,

      isFirstLogin: !user?.last_login_at,
      loginCount: user?.last_login_at ? 2 : 1,
      
      storageUsedMB: compartmentStatus.storageUsedMB || 0,
      storageLimitMB: compartmentStatus.storageQuotaMB || 500,
      storagePlan: compartmentStatus.storagePlan,
      planName: tenant?.plan || user?.role || 'basic',
      planId: tenant?.plan || 'basic',

      compartment: compartmentStatus,

      overallProgress: calculateProgress({
        setupPaid: true,
        whatsappConnected: hasWhatsApp,
        whatsappTemplates: true,
        retellConnected: false,
        teamInvited: teamMembers > 0,
        leadsImported: leadsCount > 0,
      }),
    });

  } catch (error: any) {
    console.error('Setup status error:', error);
    return jsonResponse({ error: error.message || 'Internal server error' }, 500);
  }
}

function calculateProgress(status: Record<string, boolean>): number {
  const weights = {
    setupPaid: 30,        // Required - 30%
    whatsappConnected: 25, // Important - 25%
    whatsappTemplates: 15, // Nice to have - 15%
    retellConnected: 10,   // Optional - 10%
    teamInvited: 10,       // Optional - 10%
    leadsImported: 10,     // Optional - 10%
  };

  let progress = 0;
  for (const [key, value] of Object.entries(status)) {
    if (value && weights[key as keyof typeof weights]) {
      progress += weights[key as keyof typeof weights];
    }
  }

  return progress;
}
