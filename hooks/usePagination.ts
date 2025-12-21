import { useState, useCallback } from 'react';

interface UsePaginationOptions {
  initialPage?: number;
  pageSize?: number;
}

/**
 * Custom hook for pagination state management
 * Handles page navigation and offset calculation
 * 
 * @example
 * const { page, pageSize, skip, goToPage, nextPage, previousPage } = usePagination();
 * 
 * // In fetch: /api/endpoint?limit=${pageSize}&skip=${skip}
 * // In UI: Show current page, total items
 * // In buttons: onClick={() => nextPage()} / onClick={() => previousPage()}
 */
export function usePagination(options: UsePaginationOptions = {}) {
  const { initialPage = 1, pageSize = 20 } = options;

  const [page, setPage] = useState(initialPage);

  const skip = (page - 1) * pageSize;

  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1) {
      setPage(newPage);
    }
  }, []);

  const nextPage = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  const previousPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const reset = useCallback(() => {
    setPage(initialPage);
  }, [initialPage]);

  return {
    page,
    pageSize,
    skip,
    goToPage,
    nextPage,
    previousPage,
    reset,
    hasNextPage: (total: number) => page * pageSize < total,
    hasPreviousPage: page > 1,
    totalPages: (total: number) => Math.ceil(total / pageSize),
  };
}

/**
 * Hook for handling pagination with total items count
 */
export function usePaginationWithTotal(options: UsePaginationOptions = {}) {
  const pagination = usePagination(options);
  const [total, setTotal] = useState(0);

  return {
    ...pagination,
    total,
    setTotal,
    startIndex: pagination.skip + 1,
    endIndex: Math.min(pagination.skip + pagination.pageSize, total),
    canGoNext: pagination.skip + pagination.pageSize < total,
    canGoPrevious: pagination.hasPreviousPage,
  };
}
