/**
 * Life Planner Image Upload Helper
 * Handles image uploads to Bunny Storage with folder structure:
 * Life Planner/
 *   - {tenantId}/
 *     - admin/
 *     - user/
 *       - {userId}/
 */

export function buildLifePlannerPath(userId: string | null, fileName: string, isAdmin: boolean = false, tenantId?: string): string {
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 9);
  const finalName = `${timestamp}-${randomStr}-${sanitizedName}`;

  const tenant = tenantId || 'default';

  if (isAdmin) {
    return `Life Planner/${tenant}/admin/${finalName}`;
  }

  if (!userId) {
    throw new Error('userId is required for user uploads');
  }

  return `Life Planner/${tenant}/user/${userId}/${finalName}`;
}

export function parseLifePlannerPath(path: string): {
  isAdmin: boolean;
  tenantId: string;
  userId?: string;
  fileName: string;
} {
  // New format: Life Planner/{tenantId}/admin/ or Life Planner/{tenantId}/user/{userId}/
  const parts = path.split('/');
  if (!parts[0].includes('Life Planner')) {
    throw new Error('Invalid Life Planner image path');
  }

  const tenantId = parts[1] || 'default';

  if (parts[2] === 'admin') {
    const fileName = parts.slice(3).join('/');
    return { isAdmin: true, tenantId, fileName };
  }

  if (parts[2] === 'user') {
    const userId = parts[3];
    const fileName = parts.slice(4).join('/');
    if (!userId) {
      throw new Error('Invalid Life Planner user image path - missing userId');
    }
    return { isAdmin: false, tenantId, userId, fileName };
  }

  throw new Error('Invalid Life Planner image path format');
}
