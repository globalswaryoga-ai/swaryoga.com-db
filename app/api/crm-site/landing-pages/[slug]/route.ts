import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';

// Public landing page view - tracks page views
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    await connectDB();
    const db = (await connectDB()).connection.db;
    const pagesCol = db.collection('crm_landing_pages');
    const tenantsCol = db.collection('crm_tenants');

    // Find the landing page
    const page = await pagesCol.findOne({ slug, status: 'published' });
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Get tenant for branding
    const tenant = await tenantsCol.findOne({ _id: new (require('mongodb').ObjectId)(page.tenantId) });

    // Increment view count
    await pagesCol.updateOne(
      { id: page.id },
      {
        $inc: { 'stats.views': 1 },
        $set: {
          'stats.conversionRate': page.stats.submissions / ((page.stats.views || 0) + 1) * 100,
        },
      }
    );

    // Return page data for rendering
    return NextResponse.json({
      page: {
        id: page.id,
        slug: page.slug,
        title: page.title,
        subtitle: page.subtitle,
        heroImage: page.heroImage,
        backgroundColor: page.backgroundColor,
        primaryColor: page.primaryColor,
        form: page.form,
        seo: page.seo,
      },
      tenant: tenant ? {
        name: tenant.companyName || tenant.name,
        logo: tenant.branding?.logo || '',
      } : null,
    });
  } catch (error: any) {
    console.error('Landing page view error:', error);
    return NextResponse.json({ error: 'Failed to load page' }, { status: 500 });
  }
}
