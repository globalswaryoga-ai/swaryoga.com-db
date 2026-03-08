import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { LANDING_PAGE_LIMITS, generateSlug, DEFAULT_FORM_FIELDS } from '@/lib/crm-site/landingPageConfig';

// GET - List landing pages or get single page
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const tenant = searchParams.get('tenant');
    const pageId = searchParams.get('id');
    const slug = searchParams.get('slug');

    if (!tenant) {
      return apiError('Tenant required', 400);
    }

    const db = (await connectDB()).connection.db;
    const tenantsCol = db.collection('crm_tenants');
    const pagesCol = db.collection('crm_landing_pages');

    // Get tenant info
    const tenantDoc = await tenantsCol.findOne({ slug: tenant });
    if (!tenantDoc) {
      return apiError('Tenant not found', 404);
    }

    const plan = tenantDoc.subscription?.plan || 'free';
    const limits = LANDING_PAGE_LIMITS[plan] || LANDING_PAGE_LIMITS.free;

    // Get single page by ID or slug
    if (pageId || slug) {
      const query = pageId 
        ? { id: pageId, tenantId: tenantDoc._id.toString() }
        : { slug, tenantId: tenantDoc._id.toString() };
      
      const page = await pagesCol.findOne(query);
      if (!page) {
        return apiError('Landing page not found', 404);
      }
      return apiSuccess({ page, plan, limits });
    }

    // List all pages
    const pages = await pagesCol
      .find({ tenantId: tenantDoc._id.toString() })
      .sort({ createdAt: -1 })
      .toArray();

    const usage = {
      pages: pages.length,
      maxPages: limits.maxPages,
      canCreate: pages.length < limits.maxPages,
    };

    return apiSuccess({ pages, usage, plan, limits });
  } catch (error: any) {
    console.error('Landing pages GET error:', error);
    return apiError(error.message || 'Failed to fetch landing pages', 500);
  }
}

// POST - Create landing page
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return apiError('Unauthorized', 401);

    const decoded = verifyToken(token);
    if (!decoded) return apiError('Invalid token', 401);

    const body = await request.json();
    const { tenantSlug, name, template, title, subtitle } = body;

    if (!tenantSlug || !name) {
      return apiError('Tenant and name required', 400);
    }

    await connectDB();
    const db = (await connectDB()).connection.db;
    const tenantsCol = db.collection('crm_tenants');
    const pagesCol = db.collection('crm_landing_pages');

    const tenant = await tenantsCol.findOne({ slug: tenantSlug });
    if (!tenant) {
      return apiError('Tenant not found', 404);
    }

    const plan = tenant.subscription?.plan || 'free';
    const limits = LANDING_PAGE_LIMITS[plan] || LANDING_PAGE_LIMITS.free;

    // Check limits
    const existingCount = await pagesCol.countDocuments({ tenantId: tenant._id.toString() });
    if (existingCount >= limits.maxPages) {
      return apiError(`Plan limit reached. Upgrade to create more landing pages.`, 403);
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

    return apiSuccess({ page: newPage, message: 'Landing page created' });
  } catch (error: any) {
    console.error('Landing page POST error:', error);
    return apiError(error.message || 'Failed to create landing page', 500);
  }
}

// PATCH - Update landing page
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return apiError('Unauthorized', 401);

    const decoded = verifyToken(token);
    if (!decoded) return apiError('Invalid token', 401);

    const body = await request.json();
    const { tenantSlug, pageId, ...updates } = body;

    if (!tenantSlug || !pageId) {
      return apiError('Tenant and pageId required', 400);
    }

    await connectDB();
    const db = (await connectDB()).connection.db;
    const tenantsCol = db.collection('crm_tenants');
    const pagesCol = db.collection('crm_landing_pages');

    const tenant = await tenantsCol.findOne({ slug: tenantSlug });
    if (!tenant) {
      return apiError('Tenant not found', 404);
    }

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
      return apiError('Landing page not found', 404);
    }

    const updated = await pagesCol.findOne({ id: pageId });
    return apiSuccess({ page: updated, message: 'Landing page updated' });
  } catch (error: any) {
    console.error('Landing page PATCH error:', error);
    return apiError(error.message || 'Failed to update landing page', 500);
  }
}

// DELETE - Delete landing page
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return apiError('Unauthorized', 401);

    const decoded = verifyToken(token);
    if (!decoded) return apiError('Invalid token', 401);

    const body = await request.json();
    const { tenantSlug, pageId } = body;

    if (!tenantSlug || !pageId) {
      return apiError('Tenant and pageId required', 400);
    }

    await connectDB();
    const db = (await connectDB()).connection.db;
    const tenantsCol = db.collection('crm_tenants');
    const pagesCol = db.collection('crm_landing_pages');
    const submissionsCol = db.collection('crm_form_submissions');

    const tenant = await tenantsCol.findOne({ slug: tenantSlug });
    if (!tenant) {
      return apiError('Tenant not found', 404);
    }

    // Delete page and its submissions
    await pagesCol.deleteOne({ id: pageId, tenantId: tenant._id.toString() });
    await submissionsCol.deleteMany({ landingPageId: pageId, tenantId: tenant._id.toString() });

    return apiSuccess({ message: 'Landing page deleted' });
  } catch (error: any) {
    console.error('Landing page DELETE error:', error);
    return apiError(error.message || 'Failed to delete landing page', 500);
  }
}
