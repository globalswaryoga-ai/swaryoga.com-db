import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

function getStoredAdminToken() {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
  if (token === 'null' || token === 'undefined' || !token) return null;
  return token;
}

/** Check if running on CRM subdomain */
function isCrmSubdomain() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return host === 'crm.swaryoga.com' || host.startsWith('crm.');
}

/** Get the correct login path based on domain */
function getLoginPath() {
  return isCrmSubdomain() ? '/crm-site/login' : '/admin/login';
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
  const pathname = usePathname();
  const hasCheckedRef = useRef(false);
  const [isClient, setIsClient] = useState(false);

  // Keep token in state so callers get a stable value across renders.
  const [token, setToken] = useState<string | null>(null);

  // First, mark that we're on client side
  useEffect(() => {
    setIsClient(true);
    // Immediately read the token on client
    const t = getStoredAdminToken();
    setToken(t);
  }, []);

  // Then check auth and redirect if needed
  useEffect(() => {
    if (!isClient) return;
    if (typeof window === 'undefined') return;
    
    // Don't redirect if we're already on a login page
    if (pathname?.includes('/login') || pathname?.includes('/signup')) {
      return;
    }
    
    // Only check once per mount
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    // Check token with a small delay to handle any timing issues
    const checkAuth = () => {
      const currentToken = getStoredAdminToken();
      
      if (!currentToken) {
        // One more retry after 200ms (handles slow storage reads)
        setTimeout(() => {
          const retryToken = getStoredAdminToken();
          if (!retryToken) {
            console.log('[useAuth] No token found, redirecting to login');
            router.push(getLoginPath());
          } else {
            setToken(retryToken);
          }
        }, 200);
      } else {
        setToken(currentToken);
      }
    };
    
    // Small delay on initial check
    setTimeout(checkAuth, 50);
  }, [isClient, router, pathname]);

  // When login/logout happens in the same tab (or another tab), keep token fresh.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = () => setToken(getStoredAdminToken());
    window.addEventListener('storage', sync);
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

/**
 * Check if running on CRM subdomain (exported for use in other components)
 */
export { isCrmSubdomain, getLoginPath };
