import { NextRequest, NextResponse } from 'next/server';
import { LANDING_PAGE_LIMITS, generateSlug, DEFAULT_FORM_FIELDS } from '@/lib/crm-site/landingPageConfig';
import { resolveCrmSiteTenantAccess } from '@/lib/crm-site/tenantAccess';
import { resolveLandingPagePlanAccess, resolveTenantPlanAccess } from '@/lib/crm-site/tenantPlanAccess';

// GET - List landing pages or get single page
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const access = await resolveCrmSiteTenantAccess(request, {
      requestedTenantSlug: searchParams.get('tenant'),
    });
    if (access instanceof NextResponse) {
      return access;
    }

    const { crmDb, tenant, tenantSlug } = access;
    const pageId = searchParams.get('id');
    const slug = searchParams.get('slug');

    const pagesCol = crmDb.collection('crm_landing_pages');

    const planAccess = resolveTenantPlanAccess(tenant);
    const plan = planAccess.plan;
    const limits = resolveLandingPagePlanAccess(tenant);

    if (!limits.enabled) {
      return NextResponse.json({ error: 'Landing pages are not enabled for this plan' }, { status: 403 });
    }

    // Get single page by ID or slug
    if (pageId || slug) {
      const query = pageId 
        ? { id: pageId, tenantId: tenant._id.toString() }
        : { slug, tenantId: tenant._id.toString() };
      
      const page = await pagesCol.findOne(query);
      if (!page) {
        return NextResponse.json({ error: 'Landing page not found' }, { status: 404 });
      }
      return NextResponse.json({ page, plan, limits });
    }

    // List all pages
    const pages = await pagesCol
      .find({ tenantId: tenant._id.toString() })
      .sort({ createdAt: -1 })
      .toArray();

    const usage = {
      pages: pages.length,
      maxPages: limits.maxPages,
      canCreate: pages.length < limits.maxPages,
    };

    return NextResponse.json({ pages, usage, plan, limits });
  } catch (error: any) {
    console.error('Landing pages GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch landing pages' }, { status: 500 });
  }
}

// POST - Create landing page
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const access = await resolveCrmSiteTenantAccess(request, {
      requestedTenantSlug: body?.tenantSlug,
    });
    if (access instanceof NextResponse) {
      return access;
    }

    const { crmDb, tenant } = access;
    const { name, template, title, subtitle } = body;

    if (!name) {
      return NextResponse.json({ error: 'name required' }, { status: 400 });
    }
    const pagesCol = crmDb.collection('crm_landing_pages');

    const limits = resolveLandingPagePlanAccess(tenant);

    if (!limits.enabled) {
      return NextResponse.json({ error: 'Landing pages are not enabled for this plan' }, { status: 403 });
    }

    // Check limits
    const existingCount = await pagesCol.countDocuments({ tenantId: tenant._id.toString() });
    if (existingCount >= limits.maxPages) {
      return NextResponse.json({ error: 'Plan limit reached. Upgrade to create more landing pages.' }, { status: 403 });
    }

    const pageId = `lp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const slug = generateSlug(name);

    const newPage = {
      id: pageId,
      tenantId: tenant._id.toString(),
      name,
      slug,
      status: 'draft',
      title: title || name,
      subtitle: subtitle || '',
      heroImage: '',
      backgroundColor: '#ffffff',
      primaryColor: '#3b82f6',
      form: {
        fields: DEFAULT_FORM_FIELDS,
        submitButtonText: 'Submit',
        successMessage: 'Thank you! We will be in touch soon.',
        redirectUrl: '',
      },
      leadSettings: {
        assignToUser: '',
        addTags: [],
        setStatus: 'new',
        triggerWorkflow: '',
      },
      seo: {
        metaTitle: title || name,
        metaDescription: subtitle || '',
        ogImage: '',
      },
      stats: {
        views: 0,
        submissions: 0,
        conversionRate: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await pagesCol.insertOne(newPage);

    return NextResponse.json({ page: newPage, message: 'Landing page created' });
  } catch (error: any) {
    console.error('Landing page POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create landing page' }, { status: 500 });
  }
}

// PATCH - Update landing page
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const access = await resolveCrmSiteTenantAccess(request, {
      requestedTenantSlug: body?.tenantSlug,
    });
    if (access instanceof NextResponse) {
      return access;
    }

    const { crmDb, tenant } = access;
    const { pageId, ...updates } = body;

    if (!pageId) {
      return NextResponse.json({ error: 'pageId required' }, { status: 400 });
    }
    const pagesCol = crmDb.collection('crm_landing_pages');

    // Allowed updates
    const allowedFields = [
      'name', 'title', 'subtitle', 'heroImage', 'backgroundColor', 'primaryColor',
      'form', 'leadSettings', 'seo', 'status'
    ];

    const updateData: Record<string, any> = { updatedAt: new Date() };
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    // If publishing, set publishedAt
    if (updates.status === 'published') {
      updateData.publishedAt = new Date();
    }

    const result = await pagesCol.updateOne(
      { id: pageId, tenantId: tenant._id.toString() },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Landing page not found' }, { status: 404 });
    }

    const updated = await pagesCol.findOne({ id: pageId });
    return NextResponse.json({ page: updated, message: 'Landing page updated' });
  } catch (error: any) {
    console.error('Landing page PATCH error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update landing page' }, { status: 500 });
  }
}

// DELETE - Delete landing page
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const access = await resolveCrmSiteTenantAccess(request, {
      requestedTenantSlug: body?.tenantSlug,
    });
    if (access instanceof NextResponse) {
      return access;
    }

    const { crmDb, tenant } = access;
    const { pageId } = body;

    if (!pageId) {
      return NextResponse.json({ error: 'pageId required' }, { status: 400 });
    }
    const pagesCol = crmDb.collection('crm_landing_pages');
    const submissionsCol = crmDb.collection('crm_form_submissions');

    // Delete page and its submissions
    await pagesCol.deleteOne({ id: pageId, tenantId: tenant._id.toString() });
    await submissionsCol.deleteMany({ landingPageId: pageId, tenantId: tenant._id.toString() });

    return NextResponse.json({ message: 'Landing page deleted' });
  } catch (error: any) {
    console.error('Landing page DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete landing page' }, { status: 500 });
  }
}
