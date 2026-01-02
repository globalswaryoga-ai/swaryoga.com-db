import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

function getStoredAdminToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
}

/**
 * Custom hook for authentication checks
 * Redirects to login if no token found
 * 
 * @example
 * export default function ProtectedPage() {
 *   const token = useAuth(); // Will redirect if no token
 *   // Safe to use token now
 * }
 */
export function useAuth() {
  const router = useRouter();

  // Keep token in state so callers get a stable value across renders.
  const [token, setToken] = useState<string | null>(() => getStoredAdminToken());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const t = getStoredAdminToken();
    setToken(t);

    if (!t) {
      router.push('/admin/login');
    }
  }, [router]);

  // When login/logout happens in the same tab (or another tab), keep token fresh.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = () => setToken(getStoredAdminToken());
    window.addEventListener('storage', sync);
    // Also run once after mount to catch late localStorage updates.
    sync();
    return () => window.removeEventListener('storage', sync);
  }, []);

  return token;
}

/**
 * Get token synchronously (for use outside of hooks)
 */
export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return getStoredAdminToken();
}

/**
 * Clear auth token on logout
 */
export function clearAuthToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('adminToken');
  localStorage.removeItem('admin_token');
}

/**
 * Set auth token on login
 */
export function setAuthToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('adminToken', token);
  localStorage.setItem('admin_token', token);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  if (typeof window === 'undefined') return false;
  return !!getStoredAdminToken();
}
