import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-error';
import { verifyToken } from '@/lib/auth';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';


/**
 * GET /api/crm-site/account
 * Returns the logged-in CRM user's profile.
 */
export async function GET(req: NextRequest) {
  try {
    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.isAdmin && !decoded?.userId) {
      return apiError('Unauthorized', 401);
    }

    const identity = String(decoded.userId || '');
    const result = await bunnyExecute({ sql: 'SELECT * FROM admin_users_sql WHERE lower(user_id)=lower(?) OR lower(email)=lower(?) LIMIT 1', args: [identity, identity] });
    const user: any = result.rows[0] || null;

    if (!user) {
      return apiError('User not found', 404);
    }

    return apiSuccess({
      profile: {
        userId: user.user_id || user.email,
        name: user.name || '', email: user.email || '', phone: user.phone || '', role: user.role || 'admin',
        profilePhoto: user.metadata_json ? JSON.parse(user.metadata_json).profilePhoto || '' : '',
        company: user.metadata_json ? JSON.parse(user.metadata_json).company || '' : '',
        designation: user.metadata_json ? JSON.parse(user.metadata_json).designation || '' : '',
        tenantSlug: user.tenant_slug || '', bankDetails: user.metadata_json ? JSON.parse(user.metadata_json).bankDetails || null : null,
        createdAt: user.created_at, lastLoginAt: user.last_login_at,
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
    if (!decoded?.isAdmin && !decoded?.userId) {
      return apiError('Unauthorized', 401);
    }

    const body = await req.json();
    const { name, phone, profilePhoto, company, designation, bankDetails } = body;

    // Validate profilePhoto size (max ~500KB base64)
    if (profilePhoto && profilePhoto.length > 700_000) {
      return apiError('Profile photo is too large (max 500KB)', 400);
    }

    const update: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) update.name = name.trim();
    if (phone !== undefined) update.phone = phone.trim();
    if (profilePhoto !== undefined) update.profilePhoto = profilePhoto; // base64 or ''
    if (company !== undefined) update.company = company.trim();
    if (designation !== undefined) update.designation = designation.trim();
    if (bankDetails !== undefined) update.bankDetails = bankDetails;

    const identity = String(decoded.userId || '');
    const current = await bunnyExecute({ sql: 'SELECT * FROM admin_users_sql WHERE lower(user_id)=lower(?) OR lower(email)=lower(?) LIMIT 1', args: [identity, identity] });
    const currentUser: any = current.rows[0];
    if (!currentUser) return apiError('User not found', 404);
    let metadata: any = {}; try { metadata = currentUser.metadata_json ? JSON.parse(currentUser.metadata_json) : {}; } catch {}
    Object.assign(metadata, update);
    const saved: any = await bunnyExecute({ sql: 'UPDATE admin_users_sql SET name=?,phone=?,metadata_json=?,updated_at=? WHERE user_id=?', args: [update.name ?? currentUser.name, update.phone ?? currentUser.phone, JSON.stringify(metadata), new Date().toISOString(), currentUser.user_id] });
    const result: any = { ...currentUser, name: update.name ?? currentUser.name, phone: update.phone ?? currentUser.phone, metadata_json: JSON.stringify(metadata) };

    if (!result) {
      return apiError('User not found', 404);
    }

    return apiSuccess({
      profile: {
        userId: result.user_id || result.email,
        name: result.name || '',
        email: result.email || '',
        phone: result.phone || '',
        role: result.role || 'admin',
        profilePhoto: result.profilePhoto || '',
        company: result.company || '',
        designation: result.designation || '',
        tenantSlug: result.tenant_slug || '',
      },
    });
  } catch (err) {
    console.error('[account PUT]', err);
    return apiError('Failed to update profile', 500);
  }
}
