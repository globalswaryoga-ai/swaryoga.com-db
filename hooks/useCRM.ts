import { useCallback, useState } from 'react';

interface UseCRMOptions {
  token?: string | null;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  params?: Record<string, any>;
}

/**
 * Custom hook for CRM API calls
 * Handles authentication, error handling, and loading states
 * 
 * @example
 * const { data, loading, error, fetch } = useCRM({ token });
 * 
 * // GET request
 * await fetch('/api/admin/crm/leads?limit=20');
 * 
 * // POST request
 * await fetch('/api/admin/crm/leads', { 
 *   method: 'POST', 
 *   body: { name: 'John' } 
 * });
 */
export function useCRM(options: UseCRMOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const handleUnauthorized = () => {
    if (typeof window === 'undefined') return;
    // Clear both legacy + current token keys used across the repo.
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('admin_user');
    // Force user back to login.
    window.location.href = '/admin/login';
  };

  const fetch = useCallback(
    async (endpoint: string, fetchOptions: FetchOptions = {}) => {
      const {
        method = 'GET',
        body = null,
        params = {},
      } = fetchOptions;

      try {
        setLoading(true);
        setError(null);

        // Build URL with query params
        const url = new URL(endpoint, typeof window !== 'undefined' ? window.location.origin : '');
        Object.entries(params).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            url.searchParams.append(key, String(value));
          }
        });

        const response = await window.fetch(url.toString(), {
          method,
          headers: {
            'Authorization': `Bearer ${options.token || ''}`,
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
          if (response.status === 401) {
            // Token missing/expired/invalid. Clear local storage and redirect.
            handleUnauthorized();
            throw new Error('Session expired. Please login again.');
          }
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `API error: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success || result.data) {
          setData(result.data || result);
          options.onSuccess?.(result.data || result);
          return result.data || result;
        } else {
          throw new Error(result.error || 'API returned unsuccessful response');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        options.onError?.(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // IMPORTANT: do not depend on the `options` object identity because callers often
    // pass a new object literal on every render. That would recreate `fetch` and can
    // trigger re-fetch loops + UI "vibration".
    [options.token, options.onSuccess, options.onError]
  );

  return {
    data,
    loading,
    error,
    fetch,
    reset: () => {
      setData(null);
      setError(null);
      setLoading(false);
    },
  };
}

/**
 * Get request helper
 */
export async function crmGet(endpoint: string, token: string | null, params?: Record<string, any>) {
  const url = new URL(endpoint, typeof window !== 'undefined' ? window.location.origin : '');
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token || ''}` },
  });

  if (!response.ok) throw new Error(`API error: ${response.statusText}`);
  const result = await response.json();
  return result.data || result;
}

/**
 * Post request helper
 */
export async function crmPost(endpoint: string, token: string | null, body: any) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token || ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(`API error: ${response.statusText}`);
  const result = await response.json();
  return result.data || result;
}

/**
 * Put request helper
 */
export async function crmPut(endpoint: string, token: string | null, body?: any) {
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token || ''}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) throw new Error(`API error: ${response.statusText}`);
  const result = await response.json();
  return result.data || result;
}

/**
 * Delete request helper
 */
export async function crmDelete(endpoint: string, token: string | null) {
  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token || ''}` },
  });

  if (!response.ok) throw new Error(`API error: ${response.statusText}`);
  const result = await response.json();
  return result.data || result;
}

/**
 * Patch request helper
 */
export async function crmPatch(endpoint: string, token: string | null, body: any) {
  const response = await fetch(endpoint, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token || ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(`API error: ${response.statusText}`);
  const result = await response.json();
  return result.data || result;
}
