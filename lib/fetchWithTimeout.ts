// lib/fetchWithTimeout.ts
// Fetch utility with timeout and retry logic

export interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Fetch with timeout and automatic retry
 * @param url URL to fetch
 * @param options Fetch options with timeout and retry
 * @returns Fetch response
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    timeout = 5000,
    retries = 2,
    retryDelay = 1000,
    onRetry,
    ...fetchOptions
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok && attempt < retries && response.status >= 500) {
        // Retry on server errors
        if (onRetry) {
          onRetry(attempt + 1, new Error(`HTTP ${response.status}`));
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (lastError.name === 'AbortError') {
        lastError = new Error(`Request timeout after ${timeout}ms`);
      }

      if (attempt < retries) {
        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }
        // Exponential backoff
        await new Promise(resolve =>
          setTimeout(resolve, retryDelay * Math.pow(2, attempt))
        );
      }
    }
  }

  throw lastError || new Error('Failed to fetch');
}

/**
 * Helper for GET requests with timeout
 */
export async function getWithTimeout(url: string, options?: FetchOptions) {
  return fetchWithTimeout(url, {
    ...options,
    method: 'GET',
  });
}

/**
 * Helper for POST requests with timeout
 */
export async function postWithTimeout(
  url: string,
  data: any,
  options?: FetchOptions
) {
  return fetchWithTimeout(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify(data),
  });
}
