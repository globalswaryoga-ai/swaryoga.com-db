import { NextRequest, NextResponse } from 'next/server';
import { resolveCrmSiteTenantAccess } from '@/lib/crm-site/tenantAccess';

export const dynamic = 'force-dynamic';


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
    const url = new URL(request.url);
    const access = await resolveCrmSiteTenantAccess(request, {
      requestedTenantSlug: url.searchParams.get('tenant'),
    });
    if (access instanceof NextResponse) {
      return access;
    }

    const { crmDb, tenant, tenantSlug } = access;

    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

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
    const body = await request.json();
    const access = await resolveCrmSiteTenantAccess(request, {
      requestedTenantSlug: body?.tenantSlug,
    });
    if (access instanceof NextResponse) {
      return access;
    }

    const { crmDb, tenant, tenantSlug } = access;
    const { branding } = body;

    if (!branding) {
      return NextResponse.json({ error: 'branding required' }, { status: 400 });
    }

    // Check plan
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
