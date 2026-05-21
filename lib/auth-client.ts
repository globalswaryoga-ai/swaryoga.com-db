/**
 * Client-side auth utilities for reading JWT tokens from localStorage
 * Used by admin pages to get authentication token for API calls
 */

/**
 * Get stored JWT token from localStorage
 * Checks multiple possible keys for compatibility
 */
export async function getToken(): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('getToken() can only be called on client side');
  }

  const token =
    localStorage.getItem('admin_token') ||
    localStorage.getItem('adminToken') ||
    localStorage.getItem('crm_token') ||
    localStorage.getItem('token') ||
    null;

  if (!token) {
    throw new Error('No authentication token found. Please login first.');
  }

  return token;
}

/**
 * Get token without throwing error
 * Returns null if not found instead of throwing
 */
export function getTokenSafely(): string | null {
  if (typeof window === 'undefined') return null;

  return (
    localStorage.getItem('admin_token') ||
    localStorage.getItem('adminToken') ||
    localStorage.getItem('crm_token') ||
    localStorage.getItem('token') ||
    null
  );
}

/**
 * Clear stored token (logout)
 */
export function clearToken(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('admin_token');
  localStorage.removeItem('adminToken');
  localStorage.removeItem('crm_token');
  localStorage.removeItem('token');
}

/**
 * Store token (login)
 */
export function setToken(token: string): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem('admin_token', token);
  localStorage.setItem('adminToken', token); // Backup key
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getTokenSafely() !== null;
}
