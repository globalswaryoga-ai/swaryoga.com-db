/**
 * Life Planner Image Upload Helper
 * Handles image uploads to Bunny Storage with folder structure:
 * Life Planner/
 *   - admin/
 *   - user/
 *     - {userId}/
 */

export function buildLifePlannerPath(userId: string | null, fileName: string, isAdmin: boolean = false): string {
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 9);
  const finalName = `${timestamp}-${randomStr}-${sanitizedName}`;

  if (isAdmin) {
    return `Life Planner/admin/${finalName}`;
  }

  if (!userId) {
    throw new Error('userId is required for user uploads');
  }

  return `Life Planner/user/${userId}/${finalName}`;
}

export function parseLifePlannerPath(path: string): {
  isAdmin: boolean;
  userId?: string;
  fileName: string;
} {
  if (path.includes('Life Planner/admin/')) {
    const fileName = path.split('Life Planner/admin/')[1];
    return { isAdmin: true, fileName };
  }

  if (path.includes('Life Planner/user/')) {
    const parts = path.split('Life Planner/user/')[1].split('/');
    const userId = parts[0];
    const fileName = parts.slice(1).join('/');
    return { isAdmin: false, userId, fileName };
  }

  throw new Error('Invalid Life Planner image path');
}
