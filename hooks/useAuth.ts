import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

function parseJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function isValidAdminToken(token: string | null | undefined): boolean {
  if (!token || token === 'null' || token === 'undefined') return false;
  const payload = parseJwtPayload(token);
  if (!payload) return false;
  if (payload.exp && Date.now() / 1000 > payload.exp) return false;
  return Boolean(
    payload.isAdmin === true ||
    payload.role === 'admin' ||
    payload.role === 'superadmin' ||
    payload.role === 'manager' ||
    payload.userId === 'admin' ||
    payload.userId === 'admincrm' ||
    payload.username === 'admin' ||
    payload.username === 'admincrm'
  );
}

function getStoredAdminToken(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Check admin-specific keys first
  const adminKeys = ['adminToken', 'admin_token', 'crm_token'];
  for (const key of adminKeys) {
    const token = localStorage.getItem(key);
    if (token && token !== 'null' && token !== 'undefined') {
      const trimmed = token.trim();
      if (isValidAdminToken(trimmed)) {
        return trimmed;
      }
    }
  }

  // 2. Fallback to checking admin cookies
  if (typeof document !== 'undefined' && document.cookie) {
    const parts = document.cookie.split(';');
    for (const part of parts) {
      const [k, ...v] = part.trim().split('=');
      const key = k.trim();
      if (['admin_token', 'crm_token', 'adminToken'].includes(key)) {
        const val = decodeURIComponent(v.join('=')).trim();
        if (val && val !== 'null' && val !== 'undefined' && isValidAdminToken(val)) {
          return val;
        }
      }
    }
  }

  // 3. Only check generic token if it is explicitly an admin JWT
  const genericToken = localStorage.getItem('token');
  if (genericToken && genericToken !== 'null' && genericToken !== 'undefined') {
    const trimmed = genericToken.trim();
    if (isValidAdminToken(trimmed)) {
      return trimmed;
    }
  }

  return null;
}

function isCrmSubdomain(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return host === 'crm.swaryoga.com' || host.startsWith('crm.');
}

function getLoginPath(): string {
  return isCrmSubdomain() ? '/crm-site/login' : '/admin/login';
}

/**
 * Returns the stored admin token. Redirects to login on first mount if no token found.
 * Safe from infinite loops: both effects use [] dependency.
 */
export function useAuth(options?: { preventRedirect?: boolean }): string | null {
  const router = useRouter();
  const pathname = usePathname();
  const [token, setToken] = useState<string | null>(null);
  const redirectedRef = useRef(false);

  // Run once on mount: read token and redirect if missing
  useEffect(() => {
    const t = getStoredAdminToken();
    setToken(t);

    if (
      !t &&
      !options?.preventRedirect &&
      !redirectedRef.current &&
      !pathname?.includes('/login') &&
      !pathname?.includes('/signup')
    ) {
      redirectedRef.current = true;
      router.push(getLoginPath());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.preventRedirect]);

  // Keep token in sync when it changes in another tab
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = () => setToken(getStoredAdminToken());
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return token;
}

export function getAuthToken(): string | null {
  return getStoredAdminToken();
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('adminToken');
  localStorage.removeItem('admin_token');
  localStorage.removeItem('crm_token');
  if (typeof document !== 'undefined') {
    document.cookie = 'adminToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;';
    document.cookie = 'admin_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;';
    document.cookie = 'crm_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;';
  }
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('adminToken', token);
  localStorage.setItem('admin_token', token);
}

export function isAuthenticated(): boolean {
  return !!getStoredAdminToken();
}

export { isCrmSubdomain, getLoginPath };
