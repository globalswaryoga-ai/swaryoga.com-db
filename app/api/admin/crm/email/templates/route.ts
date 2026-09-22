import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';

import { listEmailTemplates, saveEmailTemplate, getEmailTemplate } from '@/lib/emailBunnyRepository';
import { hasPermission } from '@/lib/permissions';
import { tenantFilter, getViewerUserId } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decoded = verifyToken(authHeader || '');

    if (!decoded?.isAdmin && !decoded?.userId) {
      return apiError('UNAUTHORIZED');
    }

    if (decoded.permissionsV2 && !hasPermission(decoded.permissionsV2, 'email', 'manageTemplates')) {
      return apiError('FORBIDDEN', 'You do not have permission to manage email templates');
    }

    const tf = tenantFilter(decoded, 'createdBy');

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let templates = await listEmailTemplates();
    
    if (category) {
      templates = templates.filter(t => t.category === category);
    }
    if (tf.createdBy) {
      templates = templates.filter(t => t.createdBy === tf.createdBy);
    }

    return apiSuccess({
      templates,
      count: templates.length,
    });
  } catch (error: any) {
    console.error('[GET /api/admin/crm/email/templates] Error:', error);
    return apiError('SERVER_ERROR', error.message || 'Failed to fetch email templates');
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decoded = verifyToken(authHeader || '');

    if (!decoded?.isAdmin && !decoded?.userId) {
      return apiError('UNAUTHORIZED');
    }

    if (decoded.permissionsV2 && !hasPermission(decoded.permissionsV2, 'email', 'manageTemplates')) {
      return apiError('FORBIDDEN', 'You do not have permission to manage email templates');
    }

    const body = await request.json();
    const { name, subject, body: emailBody, category, variables, attachments } = body;

    if (!name || !subject || !emailBody) {
      return apiError('VALIDATION_ERROR', 'Name, subject, and body are required');
    }

    const tf = tenantFilter(decoded, 'createdBy');
    const templates = await listEmailTemplates();

    const existing = templates.find(t => t.name === name && (!tf.createdBy || t.createdBy === tf.createdBy));
    if (existing) {
      return apiError('VALIDATION_ERROR', 'A template with this name already exists');
    }

    const template = await saveEmailTemplate({
      name,
      subject,
      body: emailBody,
      category: category || 'general',
      variables: variables || [],
      attachments: Array.isArray(attachments) ? attachments : [],
      createdBy: decoded.userId || decoded.username
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
