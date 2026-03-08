/**
 * Tenant Setup API
 * Complete CRUD for tenant onboarding checklist
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import {
  TenantSetup,
  createDefaultSetup,
  validateBusinessDetails,
  validateDomainSetup,
  validateWhatsAppSetup,
  validatePaymentSetup,
  validateTeamMember,
  calculateSetupProgress,
  SETUP_SECTIONS_BY_PLAN,
} from '@/lib/crm-site/tenantSetupConfig';

// GET - Get tenant setup data
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

    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get('tenant') || (decoded as any).tenantSlug;

    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 });
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    
    const tenantsCol = crmDb.collection('crm_tenants');
    const setupCol = crmDb.collection('tenant_setup');

    // Get tenant info
    const tenant = await tenantsCol.findOne({ slug: tenantSlug });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const plan = tenant.subscription?.plan || 'free';

    // Get or create setup
    let setup = await setupCol.findOne({ tenantSlug });
    
    if (!setup) {
      // Create default setup
      const defaultSetup = createDefaultSetup(tenantSlug, plan);
      defaultSetup.tenantId = tenant._id.toString();
      await setupCol.insertOne(defaultSetup as any);
      setup = defaultSetup as any;
    }

    // Calculate progress
    const progress = calculateSetupProgress(setup as any, plan);

    return NextResponse.json({
      setup,
      progress,
      plan,
      planConfig: SETUP_SECTIONS_BY_PLAN[plan] || SETUP_SECTIONS_BY_PLAN.free,
    });
  } catch (error: any) {
    console.error('Tenant setup GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch setup' }, { status: 500 });
  }
}

// POST - Update a specific section
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
    const { tenantSlug, section, data, markComplete } = body;

    if (!tenantSlug || !section) {
      return NextResponse.json({ error: 'tenantSlug and section required' }, { status: 400 });
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    
    const tenantsCol = crmDb.collection('crm_tenants');
    const setupCol = crmDb.collection('tenant_setup');

    // Get tenant
    const tenant = await tenantsCol.findOne({ slug: tenantSlug });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const plan = tenant.subscription?.plan || 'free';
    const planConfig = SETUP_SECTIONS_BY_PLAN[plan] || SETUP_SECTIONS_BY_PLAN.free;

    // Check if section is available
    if (planConfig.locked.includes(section)) {
      return NextResponse.json({ 
        error: `${section} is not available in your plan. Please upgrade.` 
      }, { status: 403 });
    }

    // Validate section data
    let validation = { valid: true, errors: [] as string[] };
    switch (section) {
      case 'business':
        validation = validateBusinessDetails(data);
        break;
      case 'domain':
        validation = validateDomainSetup(data);
        // Check subdomain availability
        if (validation.valid && data.subdomain) {
          const existing = await tenantsCol.findOne({ 
            slug: data.subdomain, 
            _id: { $ne: tenant._id } 
          });
          if (existing) {
            validation.valid = false;
            validation.errors.push('Subdomain already taken');
          }
        }
        break;
      case 'whatsapp':
        validation = validateWhatsAppSetup(data);
        break;
      case 'payments':
        validation = validatePaymentSetup(data);
        break;
      case 'team':
        // Validate each team member
        if (data.members) {
          for (const member of data.members) {
            const mv = validateTeamMember(member);
            if (!mv.valid) {
              validation.valid = false;
              validation.errors.push(...mv.errors.map((e: string) => `${member.name || 'Member'}: ${e}`));
            }
          }
        }
        break;
    }

    if (!validation.valid && markComplete) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validation.errors 
      }, { status: 400 });
    }

    // Build update
    const update: any = {
      $set: {
        [section]: data,
        updatedAt: new Date(),
      },
    };

    if (markComplete) {
      update.$set[`setupProgress.${section}`] = {
        completed: true,
        required: planConfig.required.includes(section),
        availableInPlan: true,
        completedAt: new Date(),
      };
    }

    // Upsert the setup document
    await setupCol.updateOne(
      { tenantSlug },
      update,
      { upsert: true }
    );

    // If business details, also update tenant document
    if (section === 'business' && markComplete) {
      await tenantsCol.updateOne(
        { slug: tenantSlug },
        {
          $set: {
            name: data.businessName,
            branding: {
              primaryColor: data.primaryColor,
              secondaryColor: data.secondaryColor,
              logo: data.logo,
            },
            adminEmail: data.adminEmail,
            updatedAt: new Date(),
          },
        }
      );
    }

    // If domain, update tenant slug if changed
    if (section === 'domain' && markComplete && data.subdomain !== tenantSlug) {
      // Update slug in tenant
      await tenantsCol.updateOne(
        { slug: tenantSlug },
        {
          $set: {
            slug: data.subdomain,
            customDomain: data.useCustomDomain ? data.customDomain : null,
            updatedAt: new Date(),
          },
        }
      );
      // Update slug in setup
      await setupCol.updateOne(
        { tenantSlug },
        { $set: { tenantSlug: data.subdomain } }
      );
    }

    // If WhatsApp, store credentials securely
    if (section === 'whatsapp' && markComplete) {
      const credentialsCol = crmDb.collection('tenant_credentials');
      await credentialsCol.updateOne(
        { tenantSlug, type: 'whatsapp' },
        {
          $set: {
            tenantSlug,
            type: 'whatsapp',
            phoneNumberId: data.phoneNumberId,
            accessToken: data.accessToken,
            metaAppId: data.metaAppId,
            metaAppSecret: data.metaAppSecret,
            businessAccountId: data.businessAccountId,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    // If payments, store credentials
    if (section === 'payments' && markComplete) {
      const credentialsCol = crmDb.collection('tenant_credentials');
      await credentialsCol.updateOne(
        { tenantSlug, type: 'payment' },
        {
          $set: {
            tenantSlug,
            type: 'payment',
            provider: data.provider,
            cashfree: data.cashfree,
            payu: data.payu,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    // Get updated setup
    const updatedSetup = await setupCol.findOne({ tenantSlug: data.subdomain || tenantSlug });
    const progress = calculateSetupProgress(updatedSetup as any, plan);

    return NextResponse.json({
      success: true,
      message: markComplete ? `${section} setup completed` : `${section} data saved`,
      setup: updatedSetup,
      progress,
      validation,
    });
  } catch (error: any) {
    console.error('Tenant setup POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update setup' }, { status: 500 });
  }
}

// PATCH - Test/verify integrations
export async function PATCH(request: NextRequest) {
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
    const { tenantSlug, action, data } = body;

    if (!tenantSlug || !action) {
      return NextResponse.json({ error: 'tenantSlug and action required' }, { status: 400 });
    }

    await connectDB();

    switch (action) {
      case 'test-whatsapp': {
        // Test WhatsApp API connection
        const { phoneNumberId, accessToken } = data;
        try {
          const res = await fetch(
            `https://graph.facebook.com/v18.0/${phoneNumberId}`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
          const result = await res.json();
          
          if (result.error) {
            return NextResponse.json({ 
              success: false, 
              error: result.error.message 
            });
          }
          
          return NextResponse.json({ 
            success: true, 
            data: {
              verifiedName: result.verified_name,
              displayPhoneNumber: result.display_phone_number,
              qualityRating: result.quality_rating,
            }
          });
        } catch (err: any) {
          return NextResponse.json({ success: false, error: err.message });
        }
      }

      case 'fetch-templates': {
        // Fetch WhatsApp message templates
        const { businessAccountId, accessToken: waToken } = data;
        try {
          const res = await fetch(
            `https://graph.facebook.com/v18.0/${businessAccountId}/message_templates`,
            {
              headers: { Authorization: `Bearer ${waToken}` },
            }
          );
          const result = await res.json();
          
          if (result.error) {
            return NextResponse.json({ 
              success: false, 
              error: result.error.message 
            });
          }
          
          return NextResponse.json({ 
            success: true, 
            templates: result.data || []
          });
        } catch (err: any) {
          return NextResponse.json({ success: false, error: err.message });
        }
      }

      case 'test-cashfree': {
        // Test Cashfree credentials
        const { clientId, clientSecret, environment } = data;
        const baseUrl = environment === 'production' 
          ? 'https://api.cashfree.com/pg' 
          : 'https://sandbox.cashfree.com/pg';
        
        try {
          const res = await fetch(`${baseUrl}/orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-client-id': clientId,
              'x-client-secret': clientSecret,
              'x-api-version': '2023-08-01',
            },
            body: JSON.stringify({
              order_id: `test_${Date.now()}`,
              order_amount: 1,
              order_currency: 'INR',
              customer_details: {
                customer_id: 'test_customer',
                customer_email: 'test@test.com',
                customer_phone: '9999999999',
              },
            }),
          });
          
          const result = await res.json();
          // If we get order_status or no auth error, credentials work
          if (result.order_id || result.order_status) {
            return NextResponse.json({ success: true, message: 'Credentials verified' });
          }
          
          return NextResponse.json({ 
            success: false, 
            error: result.message || 'Invalid credentials'
          });
        } catch (err: any) {
          return NextResponse.json({ success: false, error: err.message });
        }
      }

      case 'verify-domain': {
        // Check if custom domain DNS is configured
        const { customDomain } = data;
        // In production, you'd check DNS records here
        return NextResponse.json({ 
          success: true, 
          message: 'Domain verification initiated',
          dnsRecords: [
            { type: 'CNAME', name: customDomain, value: 'crm.swaryoga.com', verified: false },
          ]
        });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Tenant setup PATCH error:', error);
    return NextResponse.json({ error: error.message || 'Action failed' }, { status: 500 });
  }
}

// DELETE - Reset a section
export async function DELETE(request: NextRequest) {
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
    const { tenantSlug, section } = body;

    if (!tenantSlug || !section) {
      return NextResponse.json({ error: 'tenantSlug and section required' }, { status: 400 });
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    
    const setupCol = crmDb.collection('tenant_setup');

    // Reset section to default
    const tenantsCol = crmDb.collection('crm_tenants');
    const tenant = await tenantsCol.findOne({ slug: tenantSlug });
    const plan = tenant?.subscription?.plan || 'free';
    const planConfig = SETUP_SECTIONS_BY_PLAN[plan] || SETUP_SECTIONS_BY_PLAN.free;

    const defaultSetup = createDefaultSetup(tenantSlug, plan);
    const defaultSection = (defaultSetup as any)[section];
    const defaultProgress = (defaultSetup.setupProgress as any)[section];

    await setupCol.updateOne(
      { tenantSlug },
      {
        $set: {
          [section]: defaultSection,
          [`setupProgress.${section}`]: defaultProgress,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({ 
      success: true, 
      message: `${section} has been reset`
    });
  } catch (error: any) {
    console.error('Tenant setup DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Failed to reset' }, { status: 500 });
  }
}
