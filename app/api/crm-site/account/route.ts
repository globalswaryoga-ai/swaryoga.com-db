import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-error';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/crm-site/account
 * Returns the logged-in CRM user's profile.
 */
export async function GET(req: NextRequest) {
  try {
    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.userId || !decoded?.isAdmin) {
      return apiError('Unauthorized', 401);
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    const user = await crmDb.collection('admin_users').findOne(
      { $or: [{ userId: decoded.userId }, { email: decoded.userId }] },
      {
        projection: {
          password: 0, // never return password
        },
      }
    );

    if (!user) {
      return apiError('User not found', 404);
    }

    return apiSuccess({
      profile: {
        userId: user.userId || user.email,
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'admin',
        profilePhoto: user.profilePhoto || '',
        company: user.company || '',
        designation: user.designation || '',
        tenantSlug: user.tenantSlug || '',
        bankDetails: user.bankDetails || null,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (err) {
    console.error('[account GET]', err);
    return apiError('Failed to fetch profile', 500);
  }
}

/**
 * PUT /api/crm-site/account
 * Updates the logged-in CRM user's profile (name, phone, profilePhoto, etc.).
 */
export async function PUT(req: NextRequest) {
  try {
    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.userId || !decoded?.isAdmin) {
      return apiError('Unauthorized', 401);
    }

    const body = await req.json();
    const { name, phone, profilePhoto, company, designation, bankDetails } = body;

    // Validate profilePhoto size (max ~500KB base64)
    if (profilePhoto && profilePhoto.length > 700_000) {
      return apiError('Profile photo is too large (max 500KB)', 400);
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    const update: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) update.name = name.trim();
    if (phone !== undefined) update.phone = phone.trim();
    if (profilePhoto !== undefined) update.profilePhoto = profilePhoto; // base64 or ''
    if (company !== undefined) update.company = company.trim();
    if (designation !== undefined) update.designation = designation.trim();
    if (bankDetails !== undefined) update.bankDetails = bankDetails;

    const result = await crmDb.collection('admin_users').findOneAndUpdate(
      { $or: [{ userId: decoded.userId }, { email: decoded.userId }] },
      { $set: update },
      { returnDocument: 'after', projection: { password: 0 } }
    );

    if (!result) {
      return apiError('User not found', 404);
    }

    return apiSuccess({
      profile: {
        userId: result.userId || result.email,
        name: result.name || '',
        email: result.email || '',
        phone: result.phone || '',
        role: result.role || 'admin',
        profilePhoto: result.profilePhoto || '',
        company: result.company || '',
        designation: result.designation || '',
        tenantSlug: result.tenantSlug || '',
      },
    });
  } catch (err) {
    console.error('[account PUT]', err);
    return apiError('Failed to update profile', 500);
  }
}
