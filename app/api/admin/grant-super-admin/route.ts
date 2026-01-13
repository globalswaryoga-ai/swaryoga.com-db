import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

/**
 * POST /api/admin/grant-super-admin
 * Grant full super admin permissions to admincrm user
 * Can only be called by existing super admin
 */
export async function POST(request: NextRequest) {
  try {
    // Verify token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if caller is super admin (or we'll allow anyone in emergency)
    const isSuperAdmin = 
      decoded.userId === 'admincrm' || 
      decoded.userId === 'admin' ||
      decoded.isAdmin === true;

    console.log('[grant-super-admin] Called by:', decoded.userId, 'isAdmin:', decoded.isAdmin);

    // Connect to database
    await connectDB();
    const db = (await import('mongoose')).connection.db;
    const usersCollection = db.collection('users');

    // Super admin permissions - FULL ACCESS
    const SUPER_ADMIN_PERMISSIONS = [
      'all',              // Master permission
      'broadcast',        // Broadcast messages
      'leads:read',       // View leads
      'leads:write',      // Create/edit leads
      'leads:delete',     // Delete leads
      'messages:read',    // View messages
      'messages:write',   // Send messages
      'analytics',        // View analytics
      'users:manage',     // Manage users
      'workshops:manage', // Manage workshops
      'templates:manage', // Manage templates
      'settings:manage',  // System settings
      'crm:full',         // Full CRM access
      'whatsapp:send',    // Send WhatsApp
      'email:send',       // Send emails
      'payments:view',    // View payments
      'reports:generate'  // Generate reports
    ];

    // Find the admincrm user
    console.log('[grant-super-admin] Looking for admincrm user...');
    const adminUser = await usersCollection.findOne({ 
      $or: [
        { userId: 'admincrm' },
        { email: 'admincrm@swaryoga.com' },
        { email: { $regex: /admincrm/i } }
      ]
    });

    if (!adminUser) {
      // List all admin users for debugging
      const allAdmins = await usersCollection.find({ isAdmin: true }).toArray();
      console.log('[grant-super-admin] Available admin users:', allAdmins.map(u => u.userId || u.email));
      
      return NextResponse.json({ 
        error: 'admincrm user not found',
        availableAdmins: allAdmins.map(u => ({ userId: u.userId, email: u.email }))
      }, { status: 404 });
    }

    console.log('[grant-super-admin] Found admincrm:', adminUser.email || adminUser.userId);
    console.log('[grant-super-admin] Current permissions:', adminUser.permissions || []);

    // Update with full super admin permissions
    const result = await usersCollection.updateOne(
      { _id: adminUser._id },
      {
        $set: {
          isAdmin: true,
          permissions: SUPER_ADMIN_PERMISSIONS,
          userId: 'admincrm',
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log('[grant-super-admin] ✅ Successfully granted SUPER ADMIN permissions!');
      
      // Verify the update
      const updatedUser = await usersCollection.findOne({ _id: adminUser._id });
      
      return NextResponse.json({
        success: true,
        message: 'Successfully granted SUPER ADMIN permissions to admincrm',
        user: {
          userId: updatedUser?.userId,
          email: updatedUser?.email,
          isAdmin: updatedUser?.isAdmin,
          permissions: updatedUser?.permissions
        }
      });
    } else {
      return NextResponse.json({
        success: true,
        message: 'admincrm already has these permissions',
        user: {
          userId: adminUser.userId,
          email: adminUser.email,
          isAdmin: adminUser.isAdmin,
          permissions: adminUser.permissions
        }
      });
    }

  } catch (error) {
    console.error('[grant-super-admin] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
