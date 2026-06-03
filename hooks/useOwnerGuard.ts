'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to check if the current user is the account owner or a super-admin.
 * Used to protect sensitive pages like QR WhatsApp (personal WhatsApp connection).
 *
 * Returns:
 * - `isOwner`: true if user is owner/super-admin, false otherwise
 * - `checking`: true while reading localStorage
 * - `userName`: the user's display name
 *
 * Owner criteria (any of):
 *   - role === 'owner'
 *   - userId === 'admin' or 'admincrm' (legacy super-admin)
 *   - permissionsV2?.isSuperAdmin === true
 *   - permissions includes 'all'
 */
export function useOwnerGuard() {
  const [isOwner, setIsOwner] = useState(false);
  const [checking, setChecking] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const userStr = localStorage.getItem('admin_user');
        const resolvedUserId =
          localStorage.getItem('adminUser') ||
          localStorage.getItem('adminUserId') ||
          '';
      if (userStr) {
        const u = JSON.parse(userStr);
        const userId = (u?.userId as string) || resolvedUserId;
        const role = u?.role || 'admin';
        const legacyPerms: string[] = Array.isArray(u?.permissions) ? u.permissions : [];
        const pv2 = u?.permissionsV2 || null;

        // Super Admin = ONLY userId 'admin' or 'admincrm' (hardcoded).
        // Do NOT use role or permissions — those can be set on tenant users.
        const ownerOrSuper =
          role === 'owner' ||
          userId === 'admin' ||
          userId === 'admincrm';

        setIsOwner(ownerOrSuper);
        setUserName(u?.name || u?.email || userId || '');
      } else {
        // No user data at all — legacy admin scenario
        const legacyId = resolvedUserId;
        setIsOwner(legacyId === 'admin' || legacyId === 'admincrm');
      }
    } catch {
      setIsOwner(false);
    } finally {
      setChecking(false);
    }
  }, []);

  return { isOwner, checking, userName };
}
