/**
 * POST /api/admin/crm/tenant/data-export
 *
 * Export all tenant data (leads, messages, settings) into a single JSON file
 * Includes: MongoDB data + Bunny file references
 *
 * Response: JSON file download with all tenant data
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';
import { getTenantFilter } from '@/lib/crm/tenantIsolation';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 1. AUTHENTICATION
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.userId && !decoded?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const tenantId = getViewerUserId(decoded);
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing tenant information' },
        { status: 401 }
      );
    }

    await connectDB();

    // 2. COLLECT ALL TENANT DATA
    const tenantFilter = getTenantFilter(decoded);

    // Get all leads
    const Lead = require('@/lib/schemas/enterpriseSchemas').getLead?.() || null;
    const leads = Lead ? await Lead.find(tenantFilter).lean() : [];

    // Get all messages
    const Message = require('@/lib/schemas/enterpriseSchemas').getWhatsAppMessage?.() || null;
    const messages = Message ? await Message.find(tenantFilter).lean() : [];

    // Get all broadcasts
    const db = require('mongoose').connection.db;
    const broadcastsCollection = db?.collection('broadcasts');
    const broadcasts = broadcastsCollection
      ? await broadcastsCollection.find(tenantFilter).toArray()
      : [];

    // Get all funnel data
    const funnelCollection = db?.collection('funneldata');
    const funnelData = funnelCollection
      ? await funnelCollection.find(tenantFilter).toArray()
      : [];

    // Get templates
    const templateCollection = db?.collection('templates');
    const templates = templateCollection
      ? await templateCollection.find(tenantFilter).toArray()
      : [];

    // Get tenant settings
    const adminCollection = db?.collection('admins');
    const adminSettings = adminCollection
      ? await adminCollection.findOne({ userId: tenantId })
      : null;

    // 3. BUILD EXPORT PACKAGE
    const exportData = {
      // Metadata
      exportMeta: {
        tenantId: tenantId,
        exportDate: new Date().toISOString(),
        dataVersion: '1.0',
        totalRecords: {
          leads: leads.length,
          messages: messages.length,
          broadcasts: broadcasts.length,
          templates: templates.length,
          funnelData: funnelData.length,
        },
      },

      // Data collections
      leads: leads,
      messages: messages,
      broadcasts: broadcasts,
      templates: templates,
      funnelData: funnelData,
      settings: adminSettings,

      // File references (for Bunny CDN files)
      fileReferences: {
        bunnyPath: `tenants/${tenantId}/`,
        templates: templates.map(t => ({
          templateId: t._id,
          headerMedia: t.headerMedia,
        })),
      },
    };

    // 4. CREATE JSON FILE
    const fileName = `tenant_data_${tenantId}_${new Date().toISOString().split('T')[0]}.json`;
    const jsonString = JSON.stringify(exportData, null, 2);
    const buffer = Buffer.from(jsonString, 'utf-8');

    // 5. RETURN AS FILE DOWNLOAD
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': buffer.length.toString(),
        'X-Tenant-Id': tenantId,
        'X-Export-Date': new Date().toISOString(),
        'X-Record-Count': exportData.exportMeta.totalRecords.leads.toString(),
      },
    });
  } catch (error: any) {
    console.error('[Data Export] Error:', error);
    return NextResponse.json(
      {
        error: 'Export failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
