import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/crm-site/branding
 * Get tenant branding settings
 * 
 * POST /api/crm-site/branding
 * Update tenant branding settings
 */

export interface BrandingSettings {
  logo: string;
  logoLight: string; // For dark backgrounds
  favicon: string;
  primaryColor: string;
  accentColor: string;
  textColor: string;
  backgroundColor: string;
  fontFamily: string;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  customCSS: string;
  emailFooter: string;
  companyName: string;
  supportEmail: string;
  websiteUrl: string;
  privacyUrl: string;
  termsUrl: string;
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };
  hidePoweredBy: boolean;
}

const DEFAULT_BRANDING: BrandingSettings = {
  logo: '',
  logoLight: '',
  favicon: '',
  primaryColor: '#667eea',
  accentColor: '#764ba2',
  textColor: '#1f2937',
  backgroundColor: '#ffffff',
  fontFamily: 'Inter',
  borderRadius: 'lg',
  customCSS: '',
  emailFooter: '',
  companyName: '',
  supportEmail: '',
  websiteUrl: '',
  privacyUrl: '',
  termsUrl: '',
  socialLinks: {},
  hidePoweredBy: false,
};

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const url = new URL(request.url);
    const tenantSlug = url.searchParams.get('tenant') || (decoded as any).tenantSlug;

    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    const tenant = await crmDb.collection('crm_tenants').findOne({ slug: tenantSlug });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Check if white-labeling is allowed for this plan
    const plansWithWhiteLabel = ['growth', 'professional'];
    const canWhiteLabel = plansWithWhiteLabel.includes(tenant.plan || 'free');

    const branding = {
      ...DEFAULT_BRANDING,
      ...(tenant.branding || {}),
      companyName: tenant.branding?.companyName || tenant.name,
    };

    return NextResponse.json({
      branding,
      canWhiteLabel,
      plan: tenant.plan || 'free',
    });
  } catch (err: any) {
    console.error('Branding GET error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch branding' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { tenantSlug, branding } = body;

    if (!tenantSlug) {
      return NextResponse.json({ error: 'tenantSlug required' }, { status: 400 });
    }

    await connectDB();

    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    // Check plan
    const tenant = await crmDb.collection('crm_tenants').findOne({ slug: tenantSlug });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const plansWithWhiteLabel = ['growth', 'professional'];
    const canWhiteLabel = plansWithWhiteLabel.includes(tenant.plan || 'free');

    // Filter out premium features if not on allowed plan
    const allowedBranding = { ...branding };
    if (!canWhiteLabel) {
      delete allowedBranding.hidePoweredBy;
      delete allowedBranding.customCSS;
    }

    await crmDb.collection('crm_tenants').updateOne(
      { slug: tenantSlug },
      {
        $set: {
          branding: allowedBranding,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Branding updated successfully',
      branding: allowedBranding,
    });
  } catch (err: any) {
    console.error('Branding POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update branding' }, { status: 500 });
  }
}
