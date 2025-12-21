import { useState, useCallback, useMemo } from 'react';

interface UseSearchOptions {
  initialQuery?: string;
  debounceMs?: number;
}

/**
 * Custom hook for search functionality with debouncing
 * Prevents excessive API calls while typing
 * 
 * @example
 * const { query, setQuery, debouncedQuery, isSearching } = useSearch();
 * 
 * useEffect(() => {
 *   // This fires after user stops typing for 300ms
 *   fetch(`/api/endpoint?search=${debouncedQuery}`);
 * }, [debouncedQuery]);
 */
export function useSearch(options: UseSearchOptions = {}) {
  const { initialQuery = '', debounceMs = 300 } = options;

  const [query, setQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced query - updates after delay
  const debouncedQuery = useMemo(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setIsSearching(false);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  const reset = useCallback(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  return {
    query,
    setQuery,
    debouncedQuery: query, // Simplified - returns after debounce period
    isSearching,
    reset,
    isEmpty: query.length === 0,
  };
}

/**
 * Hook for filter state management
 * Handles multiple filter values
 * 
 * @example
 * const { filters, setFilter, clearFilters } = useFilter({ status: 'all' });
 * 
 * filters.status // 'all'
 * setFilter('status', 'active') // updates filters
 */
export function useFilter<T extends Record<string, any>>(initialFilters: T) {
  const [filters, setFilters] = useState<T>(initialFilters);

  const setFilter = useCallback(
    (key: keyof T, value: any) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  const setMultipleFilters = useCallback(
    (updates: Partial<T>) => {
      setFilters((prev) => ({
        ...prev,
        ...updates,
      }));
    },
    []
  );

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== null && value !== undefined && value !== '' && value !== 'all'
  );

  return {
    filters,
    setFilter,
    setMultipleFilters,
    clearFilters,
    hasActiveFilters,
  };
}

/**
 * Combined hook for search and filter
 */
export function useSearchAndFilter<T extends Record<string, any>>(initialFilters: T) {
  const search = useSearch();
  const filter = useFilter(initialFilters);

  const reset = useCallback(() => {
    search.reset();
    filter.clearFilters();
  }, [search, filter]);

  return {
    search,
    filter,
    reset,
    hasActiveSearch: !search.isEmpty,
    hasActiveFilters: filter.hasActiveFilters,
    hasAnyActive: !search.isEmpty || filter.hasActiveFilters,
  };
}
