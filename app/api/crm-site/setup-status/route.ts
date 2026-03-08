import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

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
    const isSuperAdmin = decoded.role === 'superadmin' || 
                         decoded.userId === 'admincrm' || 
                         decoded.userId === 'admin';

    if (isSuperAdmin) {
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

    await connectDB();

    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    const userId = decoded.userId || decoded.email;

    // Get user record
    const user = await crmDb.collection('admin_users').findOne({
      $or: [{ userId }, { email: decoded.email }],
    });

    // Check setup payment
    const paymentComplete = await crmDb.collection('setup_payments').findOne({
      userId,
      status: 'completed',
    });

    // Check WhatsApp integration
    const whatsappAccount = await crmDb.collection('whatsapp_accounts').findOne({
      $or: [
        { userId },
        { tenantSlug: user?.tenantSlug },
        { createdBy: userId },
      ],
      status: 'active',
    });

    // Check WhatsApp templates
    const templateCount = await crmDb.collection('whatsapp_templates').countDocuments({
      $or: [
        { userId },
        { tenantSlug: user?.tenantSlug },
      ],
      status: 'APPROVED',
    });

    // Check Retell AI connection
    const retellAccount = await crmDb.collection('retell_accounts').findOne({
      $or: [
        { userId },
        { tenantSlug: user?.tenantSlug },
      ],
      status: 'active',
    });

    // Check team invites
    const teamMembers = await crmDb.collection('admin_users').countDocuments({
      tenantSlug: user?.tenantSlug,
      _id: { $ne: user?._id },
    });

    // Check leads imported
    const leadsCount = await crmDb.collection('leads').countDocuments({
      $or: [
        { createdBy: userId },
        { tenantSlug: user?.tenantSlug },
      ],
    });

    // Return comprehensive status
    return jsonResponse({
      setupPaid: user?.setupComplete || !!paymentComplete,
      setupPaidAt: user?.setupPaidAt || paymentComplete?.paidAt || null,
      
      whatsappConnected: !!whatsappAccount,
      whatsappAccountId: whatsappAccount?._id?.toString() || null,
      
      whatsappTemplates: templateCount > 0,
      templateCount,
      
      retellConnected: !!retellAccount,
      retellAccountId: retellAccount?._id?.toString() || null,
      
      teamInvited: teamMembers > 0,
      teamMembersCount: teamMembers,
      
      leadsImported: leadsCount > 0,
      leadsCount,

      // First login detection
      isFirstLogin: !user?.lastLoginAt || user?.loginCount <= 1,
      loginCount: user?.loginCount || 1,
      
      // Storage info
      storageUsedMB: user?.storageUsedMB || 0,
      storageLimitMB: user?.storageLimitMB || 500, // Default 500MB
      planName: user?.planName || 'Free Trial',
      planId: user?.planId || '',

      // Overall progress
      overallProgress: calculateProgress({
        setupPaid: user?.setupComplete || !!paymentComplete,
        whatsappConnected: !!whatsappAccount,
        whatsappTemplates: templateCount > 0,
        retellConnected: !!retellAccount,
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
