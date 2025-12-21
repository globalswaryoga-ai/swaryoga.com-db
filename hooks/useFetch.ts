import { useState, useEffect, useCallback, useRef } from 'react';

interface UseFetchOptions {
  token?: string;
  skip?: boolean;
  cache?: number; // Cache duration in ms
}

interface UseFetchReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const fetchCache = new Map<string, { data: any; timestamp: number }>();

/**
 * Custom hook for fetching data from API endpoints
 * Includes optional caching to reduce redundant API calls
 * 
 * @example
 * const { data, loading, error, refetch } = useFetch<Lead[]>(
 *   '/api/admin/crm/leads',
 *   { token: authToken }
 * );
 */
export function useFetch<T = any>(
  url: string | null,
  options: UseFetchOptions = {}
): UseFetchReturn<T> {
  const { token, skip = false, cache = 0 } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!skip && !!url);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!url || skip) return;

    // Check cache
    if (cache > 0) {
      const cached = fetchCache.get(url);
      if (cached && Date.now() - cached.timestamp < cache) {
        setData(cached.data);
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      abortControllerRef.current = new AbortController();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // Cache the result
      if (cache > 0) {
        fetchCache.set(url, {
          data: result,
          timestamp: Date.now(),
        });
      }

      setData(result);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [url, token, skip, cache]);

  useEffect(() => {
    fetchData();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchData]);

  const refetch = useCallback(async () => {
    // Clear cache for this URL
    if (cache > 0) {
      fetchCache.delete(url || '');
    }
    await fetchData();
  }, [fetchData, url, cache]);

  return { data, loading, error, refetch };
}

/**
 * Hook for infinite scroll / pagination data fetching
 * Accumulates data as user scrolls
 */
interface UseInfiniteFetchOptions extends UseFetchOptions {
  pageSize?: number;
}

interface UseInfiniteFetchReturn<T> {
  items: T[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

export function useInfiniteFetch<T = any>(
  urlBuilder: (page: number) => string,
  options: UseInfiniteFetchOptions = {}
): UseInfiniteFetchReturn<T> {
  const { token, pageSize = 20 } = options;

  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    try {
      setLoading(true);
      const url = urlBuilder(page);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      const newItems = Array.isArray(result) ? result : result.data || [];

      if (newItems.length < pageSize) {
        setHasMore(false);
      }

      setItems((prev) => [...prev, ...newItems]);
      setPage((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore, token, urlBuilder, pageSize]);

  return { items, loading, error, hasMore, loadMore };
}

/**
 * Clear all cached data
 */
export function clearFetchCache() {
  fetchCache.clear();
}

/**
 * Clear specific cache entry
 */
export function clearFetchCacheEntry(url: string) {
  fetchCache.delete(url);
}
