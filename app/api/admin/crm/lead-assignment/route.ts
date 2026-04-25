import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getLeadAssignmentSettings } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

// GET - Fetch lead assignment settings
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    const LeadAssignmentSettings = getLeadAssignmentSettings();

    // Get or create singleton settings
    let settings = await LeadAssignmentSettings.findOne({ settingKey: 'lead_assignment' });
    
    if (!settings) {
      // Create default settings
      settings = await LeadAssignmentSettings.create({
        settingKey: 'lead_assignment',
        enabled: false,
        batchSize: 5,
        adminUsers: [],
        currentAdminIndex: 0,
        currentBatchCount: 0,
        totalAssigned: 0,
      });
    }

    return NextResponse.json({ 
      success: true, 
      data: settings 
    });
  } catch (error: any) {
    console.error('[LeadAssignment GET] Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch settings' 
    }, { status: 500 });
  }
}

// POST - Update lead assignment settings
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check for super admin
    const isSuperAdmin = 
      decoded.userId === 'admin' || 
      decoded.userId === 'admincrm' || 
      decoded.permissions?.includes('all') ||
      Boolean((decoded.permissionsV2 as any)?.isSuperAdmin);

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { enabled, batchSize, adminUsers, resetCounters } = body;

    await connectDB();
    const LeadAssignmentSettings = getLeadAssignmentSettings();

    const updateData: any = {
      updatedBy: decoded.userId,
    };

    if (typeof enabled === 'boolean') {
      updateData.enabled = enabled;
    }

    if (typeof batchSize === 'number' && batchSize >= 1 && batchSize <= 100) {
      updateData.batchSize = batchSize;
    }

    if (Array.isArray(adminUsers)) {
      updateData.adminUsers = adminUsers.map((u: any) => ({
        userId: String(u.userId || '').trim(),
        name: String(u.name || '').trim(),
        email: String(u.email || '').trim(),
        isActive: u.isActive !== false,
      })).filter((u: any) => u.userId); // Remove empty userIds
    }

    // Option to reset counters
    if (resetCounters === true) {
      updateData.currentAdminIndex = 0;
      updateData.currentBatchCount = 0;
    }

    const settings = await LeadAssignmentSettings.findOneAndUpdate(
      { settingKey: 'lead_assignment' },
      { $set: updateData },
      { new: true, upsert: true }
    );

    return NextResponse.json({ 
      success: true, 
      data: settings,
      message: 'Settings updated successfully'
    });
  } catch (error: any) {
    console.error('[LeadAssignment POST] Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to update settings' 
    }, { status: 500 });
  }
}
