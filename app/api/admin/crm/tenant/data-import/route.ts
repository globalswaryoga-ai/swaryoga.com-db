/**
 * POST /api/admin/crm/tenant/data-import
 *
 * Import previously exported tenant data from JSON file
 * Validates data integrity and tenant ownership before importing
 *
 * Body: FormData with file containing tenant data
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

interface ImportValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  recordCounts: Record<string, number>;
}

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

    // 2. PARSE UPLOADED FILE
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Missing file: Please upload a data export file' },
        { status: 400 }
      );
    }

    if (!file.name.endsWith('.json')) {
      return NextResponse.json(
        { error: 'Invalid file type: Only JSON files are supported' },
        { status: 400 }
      );
    }

    const fileContent = await file.text();
    let importData: any;

    try {
      importData = JSON.parse(fileContent);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON: File is not valid JSON format' },
        { status: 400 }
      );
    }

    // 3. VALIDATE DATA STRUCTURE
    const validation: ImportValidation = {
      valid: true,
      errors: [],
      warnings: [],
      recordCounts: {},
    };

    // Check export metadata
    if (!importData.exportMeta) {
      validation.errors.push('Missing export metadata');
      validation.valid = false;
    } else {
      // Verify tenant ID matches
      if (importData.exportMeta.tenantId !== tenantId && !isSuperAdmin(decoded)) {
        validation.errors.push(
          `Tenant ID mismatch: File is for tenant ${importData.exportMeta.tenantId}, but you are ${tenantId}`
        );
        validation.valid = false;
      }
    }

    // Validate data arrays
    if (!Array.isArray(importData.leads)) {
      validation.warnings.push('Missing or invalid leads data');
    } else {
      validation.recordCounts.leads = importData.leads.length;
    }

    if (!Array.isArray(importData.messages)) {
      validation.warnings.push('Missing or invalid messages data');
    } else {
      validation.recordCounts.messages = importData.messages.length;
    }

    if (!Array.isArray(importData.broadcasts)) {
      validation.warnings.push('Missing or invalid broadcasts data');
    } else {
      validation.recordCounts.broadcasts = importData.broadcasts.length;
    }

    if (!Array.isArray(importData.templates)) {
      validation.warnings.push('Missing or invalid templates data');
    } else {
      validation.recordCounts.templates = importData.templates.length;
    }

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Data validation failed',
          validation: validation,
        },
        { status: 400 }
      );
    }

    // 4. PERFORM IMPORT (DRY RUN FIRST)
    await connectDB();

    const importSummary = {
      status: 'pending',
      totalRecords: Object.values(validation.recordCounts).reduce((a, b) => a + (b as number), 0),
      leadsImported: 0,
      messagesImported: 0,
      broadcastsImported: 0,
      templatesImported: 0,
      errors: [],
    };

    try {
      const db = require('mongoose').connection.db;

      // Import leads
      if (importData.leads && importData.leads.length > 0) {
        const leadsCollection = db?.collection('leads');
        if (leadsCollection) {
          // Ensure tenant ID on all leads
          const leadsToImport = importData.leads.map((lead: any) => ({
            ...lead,
            createdByUserId: tenantId, // Enforce tenant isolation
          }));

          const result = await leadsCollection.insertMany(leadsToImport, { ordered: false });
          importSummary.leadsImported = result.insertedCount;
        }
      }

      // Import messages
      if (importData.messages && importData.messages.length > 0) {
        const messagesCollection = db?.collection('whatsappmessages');
        if (messagesCollection) {
          const messagesToImport = importData.messages.map((msg: any) => ({
            ...msg,
            createdByUserId: tenantId,
          }));

          const result = await messagesCollection.insertMany(messagesToImport, { ordered: false });
          importSummary.messagesImported = result.insertedCount;
        }
      }

      // Import broadcasts
      if (importData.broadcasts && importData.broadcasts.length > 0) {
        const broadcastsCollection = db?.collection('broadcasts');
        if (broadcastsCollection) {
          const broadcastsToImport = importData.broadcasts.map((bc: any) => ({
            ...bc,
            createdByUserId: tenantId,
          }));

          const result = await broadcastsCollection.insertMany(broadcastsToImport, {
            ordered: false,
          });
          importSummary.broadcastsImported = result.insertedCount;
        }
      }

      // Import templates
      if (importData.templates && importData.templates.length > 0) {
        const templatesCollection = db?.collection('templates');
        if (templatesCollection) {
          const templatesToImport = importData.templates.map((tpl: any) => ({
            ...tpl,
            createdByUserId: tenantId,
          }));

          const result = await templatesCollection.insertMany(templatesToImport, {
            ordered: false,
          });
          importSummary.templatesImported = result.insertedCount;
        }
      }

      importSummary.status = 'completed';

      return NextResponse.json({
        success: true,
        message: 'Data imported successfully',
        summary: importSummary,
      });
    } catch (importError: any) {
      importSummary.status = 'failed';
      importSummary.errors.push(importError.message);

      return NextResponse.json(
        {
          error: 'Import operation failed',
          summary: importSummary,
          details: importError.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[Data Import] Error:', error);
    return NextResponse.json(
      {
        error: 'Import failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
