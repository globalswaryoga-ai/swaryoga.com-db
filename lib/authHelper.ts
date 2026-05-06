/**
 * Authentication Helper - Safe token reading with hydration awareness
 * Prevents redirect loops by ensuring proper hydration before auth checks
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface UseProtectedPageOptions {
  redirectOnNoToken?: boolean;
  redirectPath?: string;
}

/**
 * Hook that safely checks for token with proper hydration
 * Returns: token, isLoading, isAuthenticated
 */
export function useProtectedPage(options: UseProtectedPageOptions = {}) {
  const {
    redirectOnNoToken = true,
    redirectPath = '/admin/login'
  } = options;

  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check token after hydration
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Read token from localStorage
    const storedToken = localStorage.getItem('admin_token') ||
                       localStorage.getItem('adminToken') ||
                       localStorage.getItem('crm_token') ||
                       null;

    if (storedToken) {
      setToken(storedToken);
      setIsAuthenticated(true);
    } else if (redirectOnNoToken) {
      // Redirect to login if no token found
      router.push(redirectPath);
      return;
    }

    setIsLoading(false);
  }, [redirectOnNoToken, redirectPath, router]);

  return {
    token,
    isLoading,
    isAuthenticated,
  };
}

/**
 * Simple token getter that doesn't redirect
 * Use this in components that don't need auto-redirect
 */
export function getTokenSafely(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token') ||
         localStorage.getItem('adminToken') ||
         localStorage.getItem('crm_token') ||
         null;
}

/**
 * Auth guard wrapper for pages that need protection
 * Shows loading state while checking auth
 */
export function AuthLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
        <p className="text-gray-600">Checking authentication...</p>
      </div>
    </div>
  );
}
