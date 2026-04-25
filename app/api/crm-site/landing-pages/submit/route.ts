import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { validateSubmission, mapToLeadData, LANDING_PAGE_LIMITS } from '@/lib/crm-site/landingPageConfig';

export const dynamic = 'force-dynamic';


// POST - Submit form on landing page (public endpoint)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, data, utmParams } = body;

    if (!slug || !data) {
      return NextResponse.json({ error: 'Slug and form data required' }, { status: 400 });
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const pagesCol = crmDb.collection('crm_landing_pages');
    const submissionsCol = crmDb.collection('crm_form_submissions');
    const tenantsCol = crmDb.collection('crm_tenants');
    const leadsCol = crmDb.collection('crm_leads');

    // Find the landing page
    const page = await pagesCol.findOne({ slug, status: 'published' });
    if (!page) {
      return NextResponse.json({ error: 'Landing page not found' }, { status: 404 });
    }

    // Get tenant info for limits
    const tenant = await tenantsCol.findOne({ _id: new mongoose.Types.ObjectId(page.tenantId) });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const plan = tenant.subscription?.plan || 'free';
    const limits = LANDING_PAGE_LIMITS[plan] || LANDING_PAGE_LIMITS.free;

    // Check submission limits (this month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlySubmissions = await submissionsCol.countDocuments({
      tenantId: page.tenantId,
      createdAt: { $gte: startOfMonth },
    });

    if (monthlySubmissions >= limits.maxSubmissions) {
      return NextResponse.json({ error: 'Monthly submission limit reached' }, { status: 429 });
    }

    // Validate form data
    const validation = validateSubmission(page.form.fields, data);
    if (!validation.valid) {
      return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
    }

    // Get request metadata
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';
    const userAgent = request.headers.get('user-agent') || '';
    const referrer = request.headers.get('referer') || '';

    // Create submission record
    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const submission: any = {
      id: submissionId,
      tenantId: page.tenantId,
      landingPageId: page.id,
      data,
      ip: ip.split(',')[0].trim(),
      userAgent,
      referrer,
      utmParams: utmParams || {},
      createdAt: new Date(),
    };

    // Create lead from submission
    const leadData = mapToLeadData(page.form.fields, data);
    let leadId: string | null = null;

    if (leadData.email || leadData.phone) {
      // Check for existing lead
      const existingLead = await leadsCol.findOne({
        tenantId: page.tenantId,
        $or: [
          { email: leadData.email },
          { phone: leadData.phone },
        ].filter(q => Object.values(q)[0]),
      });

      if (existingLead) {
        // Update existing lead
        leadId = existingLead.id;
        await leadsCol.updateOne(
          { id: existingLead.id },
          {
            $set: {
              ...leadData,
              updatedAt: new Date(),
              lastActivity: new Date(),
            },
            $addToSet: {
              tags: { $each: page.leadSettings.addTags || [] },
              sources: `landing_page:${page.slug}`,
            },
          }
        );
      } else {
        // Create new lead
        leadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newLead = {
          id: leadId,
          tenantId: page.tenantId,
          name: leadData.name || 'Unknown',
          email: leadData.email || '',
          phone: leadData.phone || '',
          company: leadData.company || '',
          status: page.leadSettings.setStatus || 'new',
          tags: page.leadSettings.addTags || [],
          sources: [`landing_page:${page.slug}`],
          assignedTo: page.leadSettings.assignToUser || null,
          customFields: {},
          notes: [],
          score: 0,
          utmParams: utmParams || {},
          createdAt: new Date(),
          updatedAt: new Date(),
          lastActivity: new Date(),
        };

        await leadsCol.insertOne(newLead);
      }

      submission.leadId = leadId;
    }

    await submissionsCol.insertOne(submission);

    // Update page stats
    await pagesCol.updateOne(
      { id: page.id },
      {
        $inc: { 'stats.submissions': 1 },
        $set: {
          'stats.conversionRate': page.stats.views > 0
            ? ((page.stats.submissions + 1) / page.stats.views * 100)
            : 0,
        },
      }
    );

    // TODO: Trigger workflow if configured
    // if (page.leadSettings.triggerWorkflow) { ... }

    return NextResponse.json({
      message: page.form.successMessage || 'Thank you for your submission!',
      redirectUrl: page.form.redirectUrl || null,
      submissionId,
      leadId,
    });
  } catch (error: any) {
    console.error('Form submit error:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit form' }, { status: 500 });
  }
}

// GET - Get submissions for a landing page (authenticated)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    const { searchParams } = new URL(request.url);
    const tenant = searchParams.get('tenant');
    const pageId = searchParams.get('pageId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 });
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const tenantsCol = crmDb.collection('crm_tenants');
    const submissionsCol = crmDb.collection('crm_form_submissions');

    const tenantDoc = await tenantsCol.findOne({ slug: tenant });
    if (!tenantDoc) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const query: any = { tenantId: tenantDoc._id.toString() };
    if (pageId) {
      query.landingPageId = pageId;
    }

    const [submissions, total] = await Promise.all([
      submissionsCol.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      submissionsCol.countDocuments(query),
    ]);

    return NextResponse.json({ submissions, total, limit, skip });
  } catch (error: any) {
    console.error('Submissions GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch submissions' }, { status: 500 });
  }
}
