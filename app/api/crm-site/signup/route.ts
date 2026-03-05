import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * POST /api/crm-site/signup
 *
 * Creates a new CRM tenant account:
 * 1. Validates input
 * 2. Creates admin user in the main database
 * 3. Creates a tenant record
 * 4. Optionally stores encrypted API keys (WhatsApp, Cashfree, Retell)
 * 5. Returns JWT for immediate login
 *
 * Does NOT disturb existing site or CRM — uses separate collections.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      businessName,
      fullName,
      email,
      phone,
      password,
      whatsappPhoneId,
      whatsappAccessToken,
      cashfreeClientId,
      cashfreeClientSecret,
      retellApiKey,
      plan = 'free',
    } = body;

    /* ─── Validate required fields ─── */
    const fieldErrors: { field: string; message: string }[] = [];

    if (!businessName?.trim()) fieldErrors.push({ field: 'businessName', message: 'Business name is required' });
    if (!fullName?.trim()) fieldErrors.push({ field: 'fullName', message: 'Full name is required' });
    if (!email?.trim()) fieldErrors.push({ field: 'email', message: 'Email is required' });
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.push({ field: 'email', message: 'Invalid email' });
    if (!phone?.trim()) fieldErrors.push({ field: 'phone', message: 'Phone is required' });
    if (!password || password.length < 6) fieldErrors.push({ field: 'password', message: 'Password must be at least 6 characters' });

    if (fieldErrors.length > 0) {
      return NextResponse.json({ error: 'Validation failed', fieldErrors }, { status: 400 });
    }

    await connectDB();

    const mongoose = (await import('mongoose')).default;
    const mainDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    /* ─── Check duplicate email ─── */
    const existingUser = await mainDb.collection('admin_users').findOne({
      $or: [
        { email: email.trim().toLowerCase() },
        { userId: email.trim().toLowerCase() },
      ],
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: 'An account with this email already exists. Please log in instead.',
          fieldErrors: [{ field: 'email', message: 'Email already registered' }],
        },
        { status: 409 }
      );
    }

    /* ─── Create slug from business name ─── */
    const slug = businessName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);

    // Check slug uniqueness
    const existingTenant = await mainDb.collection('tenants').findOne({ slug });
    const finalSlug = existingTenant ? `${slug}-${Date.now().toString(36)}` : slug;

    /* ─── Hash password ─── */
    const hashedPassword = await bcrypt.hash(password, 12);

    /* ─── Create admin user ─── */
    const now = new Date();
    const userId = email.trim().toLowerCase();

    await mainDb.collection('admin_users').insertOne({
      userId,
      email: userId,
      password: hashedPassword,
      name: fullName.trim(),
      phone: phone.trim(),
      role: 'admin',
      isAdmin: true,
      tenantSlug: finalSlug,
      createdAt: now,
      updatedAt: now,
    });

    /* ─── Create tenant record ─── */
    const validPlans = ['free', 'starter', 'growth', 'professional', 'enterprise'];
    const selectedPlan = validPlans.includes(plan) ? plan : 'free';

    await mainDb.collection('tenants').insertOne({
      slug: finalSlug,
      name: businessName.trim(),
      plan: selectedPlan,
      ownerEmail: userId,
      ownerName: fullName.trim(),
      ownerPhone: phone.trim(),
      status: 'active',
      enabledModules: ['crm'], // base module
      customLimits: {},
      createdAt: now,
      updatedAt: now,
    });

    /* ─── Store API keys (encrypted) if provided ─── */
    const keysToStore: { keyName: string; keyValue: string }[] = [];

    if (whatsappPhoneId?.trim()) keysToStore.push({ keyName: 'WHATSAPP_PHONE_NUMBER_ID', keyValue: whatsappPhoneId.trim() });
    if (whatsappAccessToken?.trim()) keysToStore.push({ keyName: 'WHATSAPP_ACCESS_TOKEN', keyValue: whatsappAccessToken.trim() });
    if (cashfreeClientId?.trim()) keysToStore.push({ keyName: 'CASHFREE_CLIENT_ID', keyValue: cashfreeClientId.trim() });
    if (cashfreeClientSecret?.trim()) keysToStore.push({ keyName: 'CASHFREE_CLIENT_SECRET', keyValue: cashfreeClientSecret.trim() });
    if (retellApiKey?.trim()) keysToStore.push({ keyName: 'RETELL_API_KEY', keyValue: retellApiKey.trim() });

    if (keysToStore.length > 0) {
      try {
        // Use the apiKeyVault for encrypted storage
        const { setTenantKey } = await import('@/lib/tenant/apiKeyVault');
        for (const k of keysToStore) {
          await setTenantKey(finalSlug, k.keyName, k.keyValue);
        }
      } catch (vaultErr) {
        // Non-fatal — keys can be added later from Settings
        console.warn('Failed to store some API keys (non-fatal):', vaultErr);
      }
    }

    /* ─── Generate JWT ─── */
    const jwtSecret = process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || 'swar-yoga-default-secret';
    const token = jwt.sign(
      {
        userId,
        email: userId,
        name: fullName.trim(),
        role: 'admin',
        isAdmin: true,
        tenantSlug: finalSlug,
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      success: true,
      token,
      userId,
      user: {
        userId,
        email: userId,
        name: fullName.trim(),
        role: 'admin',
        isAdmin: true,
        tenantSlug: finalSlug,
        plan: selectedPlan,
      },
    });
  } catch (err: any) {
    console.error('CRM Site Signup Error:', err);
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}
