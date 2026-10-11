import { verifyToken } from '@/lib/auth';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';

export function registrationViewer(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  const decoded = authorization.startsWith('Bearer ') ? verifyToken(authorization.slice(7)) : null;
  if (!decoded?.isAdmin) return null;
  return { userId: getViewerUserId(decoded), superAdmin: isSuperAdmin(decoded) };
}

export function registrationLeadOwned(lead: { createdByUserId?: string; assignedToUserId?: string }, viewer: NonNullable<ReturnType<typeof registrationViewer>>) {
  return viewer.superAdmin || lead.createdByUserId === viewer.userId || lead.assignedToUserId === viewer.userId;
}
