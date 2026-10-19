/**
 * API Route: Manage Admin Settings
 * GET /api/admin/settings - Get current settings (SUPERADMIN ONLY)
 * POST /api/admin/settings - Save settings (SUPERADMIN ONLY)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAdminSettings } from '@/lib/schemas/adminSettingsSchema';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  try {
    // Verify superadmin access for GET too
    // Verify admin access
    const authHeader = request.headers.get('authorization') || '';
    const rawToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    if (!rawToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(rawToken);
    
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    await connectDB();

    const AdminSettings = getAdminSettings();
    const settings = await AdminSettings.findOne();

    if (!settings) {
      // Return default settings if none exist
      return NextResponse.json({
        companyName: 'Swar Yoga',
        companyAddress: '',
        companyPhone: '',
        companyEmail: '',
        adminName: '',
        adminTitle: '',
      });
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const authHeader = request.headers.get('authorization') || '';
    const rawToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const decoded = verifyToken(rawToken);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Only superadmins can modify admin settings
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json(
        { error: 'Access denied: Superadmin access required to modify settings' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();

    const AdminSettings = getAdminSettings();
    let settings = await AdminSettings.findOne();

    if (!settings) {
      // Create new settings
      settings = await AdminSettings.create({
        ...body,
        updatedBy: decoded._id,
        updatedAt: new Date(),
      });
    } else {
      // Update existing settings
      Object.assign(settings, body);
      settings.updatedBy = decoded._id;
      settings.updatedAt = new Date();
      await settings.save();
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save settings' },
      { status: 500 }
    );
  }
}
