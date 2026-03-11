/**
 * Client-side auth utilities
 * 
 * Provides consistent token retrieval and super admin detection
 * across all CRM pages. Use these instead of manual localStorage checks.
 */

/**
 * Get the auth token from localStorage (checks all three key variants)
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('crm_token') ||
    localStorage.getItem('adminToken') ||
    localStorage.getItem('admin_token') ||
    null
  );
}

/**
 * Check if current user is a super admin based on localStorage data.
 * 
 * Super Admin = ONLY userId 'admin' or 'admincrm' (hardcoded).
 * Do NOT check role or permissions — those can be set on tenant users
 * and would incorrectly grant super admin access.
 */
export function checkIsSuperAdmin(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const userStr = localStorage.getItem('admin_user');
    if (!userStr) return false;

    const u = JSON.parse(userStr);
    const userId = String(u?.userId || '').trim();

    return userId === 'admin' || userId === 'admincrm';
  } catch {
    return false;
  }
}

/**
 * Get basic user info from localStorage
 */
export function getStoredUser(): {
  userId: string;
  role: string;
  permissions: string[];
  permissionsV2: any;
  isSuperAdmin: boolean;
} {
  const defaults = { userId: '', role: 'admin', permissions: [], permissionsV2: null, isSuperAdmin: false };
  if (typeof window === 'undefined') return defaults;

  try {
    const userStr = localStorage.getItem('admin_user');
    if (!userStr) return defaults;

    const u = JSON.parse(userStr);
    const userId = (u?.userId as string) || localStorage.getItem('adminUser') || '';
    const role = u?.role || 'admin';
    const permissions: string[] = Array.isArray(u?.permissions) ? u.permissions : [];
    const permissionsV2 = u?.permissionsV2 || null;

    // Super Admin = ONLY userId 'admin' or 'admincrm' (hardcoded).
    // Do NOT use role or permissions — those can be set on tenant users.
    const isSuperAdmin =
      userId === 'admin' ||
      userId === 'admincrm';

    return { userId, role, permissions, permissionsV2, isSuperAdmin };
  } catch {
    return defaults;
  }
}
