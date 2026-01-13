import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { connectDB } from '@/lib/db';
import { getEmailTemplate } from '@/lib/schemas/enterpriseSchemas';
import { hasPermission } from '@/lib/permissions';

// PUT /api/admin/crm/email/templates/[id] - Update email template
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    await connectDB();
    const EmailTemplate = getEmailTemplate();

    // Check if template exists
    const template = await EmailTemplate.findById(params.id);
    if (!template) {
      return apiError('NOT_FOUND', 'Email template not found');
    }

    // Check for duplicate name (excluding current template)
    if (name && name !== template.name) {
      const existing = await EmailTemplate.findOne({ 
        name, 
        _id: { $ne: params.id } 
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

    const updatedTemplate = await EmailTemplate.findByIdAndUpdate(
      params.id,
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
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if template exists
    const template = await EmailTemplate.findById(params.id);
    if (!template) {
      return apiError('NOT_FOUND', 'Email template not found');
    }

    // Delete template
    await EmailTemplate.findByIdAndDelete(params.id);

    return apiSuccess({
      message: 'Email template deleted successfully',
    });
  } catch (error: any) {
    console.error('[DELETE /api/admin/crm/email/templates/[id]] Error:', error);
    return apiError('SERVER_ERROR', error.message || 'Failed to delete email template');
  }
}
