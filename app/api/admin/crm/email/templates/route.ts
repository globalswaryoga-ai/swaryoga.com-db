import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { connectDB } from '@/lib/db';
import { getEmailTemplate } from '@/lib/schemas/enterpriseSchemas';
import { hasPermission } from '@/lib/permissions';

// Mark as dynamic since this route uses request.headers and request.url
export const dynamic = 'force-dynamic';

// GET /api/admin/crm/email/templates - List all email templates
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decoded = verifyToken(authHeader || '');

    if (!decoded?.isAdmin) {
      return apiError('UNAUTHORIZED');
    }

    // Check permission
    if (!hasPermission(decoded?.permissionsV2, 'email', 'manageTemplates')) {
      return apiError('FORBIDDEN', 'You do not have permission to manage email templates');
    }

    await connectDB();
    const EmailTemplate = getEmailTemplate();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const filter: any = {};
    if (category) {
      filter.category = category;
    }

    const templates = await EmailTemplate.find(filter)
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

    if (!decoded?.isAdmin) {
      return apiError('UNAUTHORIZED');
    }

    // Check permission
    if (!hasPermission(decoded?.permissionsV2, 'email', 'manageTemplates')) {
      return apiError('FORBIDDEN', 'You do not have permission to manage email templates');
    }

    const body = await request.json();
    const { name, subject, body: emailBody, category, variables } = body;

    // Validation
    if (!name || !subject || !emailBody) {
      return apiError('VALIDATION_ERROR', 'Name, subject, and body are required');
    }

    await connectDB();
    const EmailTemplate = getEmailTemplate();

    // Check for duplicate template name
    const existing = await EmailTemplate.findOne({ name });
    if (existing) {
      return apiError('VALIDATION_ERROR', 'A template with this name already exists');
    }

    const template = await EmailTemplate.create({
      name,
      subject,
      body: emailBody,
      category: category || 'general',
      variables: variables || [],
      createdBy: decoded.userId || decoded.username,
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
