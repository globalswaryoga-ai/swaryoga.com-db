import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { EMAIL_LIMITS, DEFAULT_TEMPLATES, TEMPLATE_CATEGORIES } from '@/lib/crm-site/emailMarketingConfig';
import { resolveCrmSiteTenantAccess } from '@/lib/crm-site/tenantAccess';
import { resolveEmailPlanAccess, resolveTenantPlanAccess } from '@/lib/crm-site/tenantPlanAccess';

export const dynamic = 'force-dynamic';

/**
 * Email Templates API
 * GET - List templates
 * POST - Create template
 * PATCH - Update template
 * DELETE - Delete template
 */

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const access = await resolveCrmSiteTenantAccess(request, {
      requestedTenantSlug: url.searchParams.get('tenant'),
    });
    if (access instanceof NextResponse) {
      return access;
    }

    const { crmDb, tenant, tenantSlug } = access;
    const templateId = url.searchParams.get('id');

    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    // Get tenant plan
    const plan = resolveTenantPlanAccess(tenant).plan;
    const limits = resolveEmailPlanAccess(tenant);

    if (!limits.enabled) {
      return NextResponse.json({ error: 'Email marketing is not enabled for this plan' }, { status: 403 });
    }

    if (templateId) {
      // Check default templates first
      const defaultTemplate = DEFAULT_TEMPLATES.find(t => t.id === templateId);
      if (defaultTemplate) {
        return NextResponse.json({ template: { ...defaultTemplate, isDefault: true } });
      }

      // Check custom templates
      const template = await crmDb.collection('email_templates').findOne({
        tenantSlug,
        id: templateId,
      });

      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      return NextResponse.json({ template });
    }

    // List custom templates
    const customTemplates = await crmDb.collection('email_templates')
      .find({ tenantSlug })
      .sort({ createdAt: -1 })
      .toArray();

    // Combine with default templates
    const allTemplates = [
      ...DEFAULT_TEMPLATES.map(t => ({ ...t, isDefault: true })),
      ...customTemplates.map(t => ({ ...t, isDefault: false })),
    ];

    return NextResponse.json({
      templates: allTemplates,
      defaultTemplates: DEFAULT_TEMPLATES,
      customTemplates,
      categories: TEMPLATE_CATEGORIES,
      plan,
      limits: {
        templates: limits.templates,
        used: customTemplates.length,
        canCreate: customTemplates.length < limits.templates,
      },
    });
  } catch (err: any) {
    console.error('Templates GET error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const access = await resolveCrmSiteTenantAccess(request, {
      requestedTenantSlug: body?.tenantSlug,
    });
    if (access instanceof NextResponse) {
      return access;
    }

    const { crmDb, decoded, tenant, tenantSlug } = access;
    const { name, category, subject, body: templateBody, previewText } = body;

    if (!name || !subject) {
      return NextResponse.json({ error: 'name and subject required' }, { status: 400 });
    }

    // Get tenant and check limits
    const plan = resolveTenantPlanAccess(tenant).plan;
    const limits = resolveEmailPlanAccess(tenant);

    if (!limits.enabled) {
      return NextResponse.json({ error: 'Email marketing is not enabled for this plan' }, { status: 403 });
    }

    const existingCount = await crmDb.collection('email_templates').countDocuments({ tenantSlug });
    if (existingCount >= limits.templates) {
      return NextResponse.json({
        error: `Maximum ${limits.templates} templates allowed on ${plan} plan`,
      }, { status: 403 });
    }

    const template = {
      id: uuidv4(),
      tenantSlug,
      name: name.trim(),
      category: category || 'custom',
      subject: subject.trim(),
      body: templateBody || '',
      previewText: previewText || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: (decoded as any).userId || (decoded as any).email,
    };

    await crmDb.collection('email_templates').insertOne(template);

    return NextResponse.json({ success: true, template });
  } catch (err: any) {
    console.error('Templates POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create template' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const access = await resolveCrmSiteTenantAccess(request, {
      requestedTenantSlug: body?.tenantSlug,
    });
    if (access instanceof NextResponse) {
      return access;
    }

    const { crmDb, tenantSlug } = access;
    const { templateId, ...updates } = body;

    if (!templateId) {
      return NextResponse.json({ error: 'templateId required' }, { status: 400 });
    }

    const updateFields: Record<string, any> = { updatedAt: new Date() };
    const allowedFields = ['name', 'category', 'subject', 'body', 'previewText'];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields[field] = updates[field];
      }
    }

    const result = await crmDb.collection('email_templates').findOneAndUpdate(
      { tenantSlug, id: templateId },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, template: result });
  } catch (err: any) {
    console.error('Templates PATCH error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update template' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const access = await resolveCrmSiteTenantAccess(request, {
      requestedTenantSlug: body?.tenantSlug,
    });
    if (access instanceof NextResponse) {
      return access;
    }

    const { crmDb, tenantSlug } = access;
    const { templateId } = body;

    if (!templateId) {
      return NextResponse.json({ error: 'templateId required' }, { status: 400 });
    }

    const result = await crmDb.collection('email_templates').deleteOne({
      tenantSlug,
      id: templateId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Templates DELETE error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete template' }, { status: 500 });
  }
}
