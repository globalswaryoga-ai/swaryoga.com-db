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
 * Checks all possible indicators:
 * - userId === 'admin' or 'admincrm'
 * - role === 'superadmin'
 * - legacy permissions includes 'all'
 * - permissionsV2.isSuperAdmin === true
 */
export function checkIsSuperAdmin(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const userStr = localStorage.getItem('admin_user');
    if (!userStr) return false;

    const u = JSON.parse(userStr);
    const userId = u?.userId || '';
    const role = u?.role || '';
    const perms: string[] = Array.isArray(u?.permissions) ? u.permissions : [];
    const pv2 = u?.permissionsV2;

    return (
      userId === 'admin' ||
      userId === 'admincrm' ||
      role === 'superadmin' ||
      perms.includes('all') ||
      pv2?.isSuperAdmin === true
    );
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

    const isSuperAdmin =
      userId === 'admin' ||
      userId === 'admincrm' ||
      role === 'superadmin' ||
      permissions.includes('all') ||
      permissionsV2?.isSuperAdmin === true;

    return { userId, role, permissions, permissionsV2, isSuperAdmin };
  } catch {
    return defaults;
  }
}
