import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { connectDB } from '@/lib/db';
import { getEmailTemplate } from '@/lib/schemas/enterpriseSchemas';
import { hasPermission } from '@/lib/permissions';
import { tenantFilter, getViewerUserId } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

// Mark as dynamic since this route uses request.headers and request.url

// GET /api/admin/crm/email/templates - List all email templates
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decoded = verifyToken(authHeader || '');

    if (!decoded?.isAdmin && !decoded?.userId) {
      return apiError('UNAUTHORIZED');
    }

    // Check granular permission (skip if permissionsV2 not configured – admin pass-through)
    if (decoded.permissionsV2 && !hasPermission(decoded.permissionsV2, 'email', 'manageTemplates')) {
      return apiError('FORBIDDEN', 'You do not have permission to manage email templates');
    }

    await connectDB();
    const EmailTemplate = getEmailTemplate();
    const tf = tenantFilter(decoded, 'createdBy');

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const filter: any = {};
    if (category) {
      filter.category = category;
    }

    const templates = await EmailTemplate.find({ ...filter, ...tf })
      .sort({ createdAt: -1 })
      .lean();

    return apiSuccess({
      templates,
      count: templates.length,
    });
  } catch (error: any) {
    console.error('[GET /api/admin/crm/email/templates] Error:', error);
    return apiError('SERVER_ERROR', error.message || 'Failed to fetch email templates');
  }
}

// POST /api/admin/crm/email/templates - Create new email template
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decoded = verifyToken(authHeader || '');

    if (!decoded?.isAdmin && !decoded?.userId) {
      return apiError('UNAUTHORIZED');
    }

    // Check granular permission (skip if permissionsV2 not configured – admin pass-through)
    if (decoded.permissionsV2 && !hasPermission(decoded.permissionsV2, 'email', 'manageTemplates')) {
      return apiError('FORBIDDEN', 'You do not have permission to manage email templates');
    }

    const body = await request.json();
    const { name, subject, body: emailBody, category, variables, attachments } = body;

    // Validation
    if (!name || !subject || !emailBody) {
      return apiError('VALIDATION_ERROR', 'Name, subject, and body are required');
    }

    await connectDB();
    const EmailTemplate = getEmailTemplate();
    const tf = tenantFilter(decoded, 'createdBy');

    // Check for duplicate template name
    const existing = await EmailTemplate.findOne({ name, ...tf });
    if (existing) {
      return apiError('VALIDATION_ERROR', 'A template with this name already exists');
    }

    const template = await EmailTemplate.create({
      name,
      subject,
      body: emailBody,
      category: category || 'general',
      variables: variables || [],
      attachments: Array.isArray(attachments) ? attachments : [],
      createdBy: decoded.userId || decoded.username,
      createdByUserId: getViewerUserId(decoded),
    });

    return apiSuccess(
      {
        template,
        message: 'Email template created successfully',
      },
      201
    );
  } catch (error: any) {
    console.error('[POST /api/admin/crm/email/templates] Error:', error);
    return apiError('SERVER_ERROR', error.message || 'Failed to create email template');
  }
}
