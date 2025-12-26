import { useEffect } from 'react';
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

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = getStoredAdminToken();
    if (!token) {
      router.push('/admin/login');
    }
  }, [router]);

  // Return token if available
  if (typeof window === 'undefined') return null;
  return getStoredAdminToken();
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
