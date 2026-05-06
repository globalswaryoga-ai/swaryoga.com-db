import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

function getStoredAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token =
    localStorage.getItem('crm_token') ||
    localStorage.getItem('adminToken') ||
    localStorage.getItem('admin_token');
  if (!token || token === 'null' || token === 'undefined') return null;
  return token;
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
export function useAuth(): string | null {
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
      !redirectedRef.current &&
      !pathname?.includes('/login') &&
      !pathname?.includes('/signup')
    ) {
      redirectedRef.current = true;
      router.push(getLoginPath());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
