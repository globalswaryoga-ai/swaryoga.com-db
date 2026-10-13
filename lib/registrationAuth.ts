import { verifyToken } from '@/lib/auth';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';

export function registrationViewer(request: Request) {
  let authorization = request.headers.get('authorization') || '';
  let token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : authorization.trim();
  if (!token) {
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, decodeURIComponent(v.join('='))];
    }));
    token = cookies.admin_token || cookies.adminToken || cookies.crm_token || cookies.token || cookies.auth_token || '';
  }
  const decoded = token ? verifyToken(token) : null;
  if (!decoded?.isAdmin) return null;
  return { userId: getViewerUserId(decoded), superAdmin: isSuperAdmin(decoded) };
}

export function registrationLeadOwned(lead: { createdByUserId?: string; assignedToUserId?: string }, viewer: NonNullable<ReturnType<typeof registrationViewer>>) {
  return viewer.superAdmin || lead.createdByUserId === viewer.userId || lead.assignedToUserId === viewer.userId;
}
