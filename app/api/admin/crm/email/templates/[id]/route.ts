import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { connectDB } from '@/lib/db';
import { getEmailTemplate } from '@/lib/schemas/enterpriseSchemas';
import { hasPermission } from '@/lib/permissions';
import { tenantFilter } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

// PUT /api/admin/crm/email/templates/[id] - Update email template
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    await connectDB();
    const EmailTemplate = getEmailTemplate();
    const tf = tenantFilter(decoded, 'createdBy');

    // Check if template exists
    const template = await EmailTemplate.findOne({ _id: params.id, ...tf });
    if (!template) {
      return apiError('NOT_FOUND', 'Email template not found');
    }

    // Check for duplicate name (excluding current template)
    if (name && name !== template.name) {
      const existing = await EmailTemplate.findOne({ 
        name, 
        _id: { $ne: params.id },
        ...tf,
      });
      if (existing) {
        return apiError('VALIDATION_ERROR', 'A template with this name already exists');
      }
    }

    // Update template
    const updateData: any = {};
    if (name) updateData.name = name;
    if (subject) updateData.subject = subject;
    if (emailBody) updateData.body = emailBody;
    if (category) updateData.category = category;
    if (variables !== undefined) updateData.variables = variables;
    if (attachments !== undefined) updateData.attachments = attachments;

    const updatedTemplate = await EmailTemplate.findOneAndUpdate(
      { _id: params.id, ...tf },
      { $set: updateData },
      { new: true }
    );

    return apiSuccess({
      template: updatedTemplate,
      message: 'Email template updated successfully',
    });
  } catch (error: any) {
    console.error('[PUT /api/admin/crm/email/templates/[id]] Error:', error);
    return apiError('SERVER_ERROR', error.message || 'Failed to update email template');
  }
}

// DELETE /api/admin/crm/email/templates/[id] - Delete email template

// Mark as dynamic since this route uses request.headers or request.url

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if template exists
    const template = await EmailTemplate.findOne({ _id: params.id, ...tf });
    if (!template) {
      return apiError('NOT_FOUND', 'Email template not found');
    }

    // Delete template
    await EmailTemplate.findOneAndDelete({ _id: params.id, ...tf });

    return apiSuccess({
      message: 'Email template deleted successfully',
    });
  } catch (error: any) {
    console.error('[DELETE /api/admin/crm/email/templates/[id]] Error:', error);
    return apiError('SERVER_ERROR', error.message || 'Failed to delete email template');
  }
}
