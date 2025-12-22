/**
 * Caching and performance utilities
 */

/**
 * Simple LRU Cache implementation
 */
export class LRUCache<K, V> {
  private cache: Map<K, V> = new Map();
  private readonly maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * TTL Cache with expiration
 */
export class TTLCache<K, V> {
  private cache: Map<K, { value: V; expires: number }> = new Map();
  private readonly ttlMs: number;

  constructor(ttlMs: number = 60000) {
    this.ttlMs = ttlMs;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: K, value: V): void {
    this.cache.set(key, {
      value,
      expires: Date.now() + this.ttlMs,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): void {
    const now = Date.now();
    const keysToDelete: K[] = [];

    this.cache.forEach((entry, key) => {
      if (now > entry.expires) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));
  }
}

/**
 * Memoization helper
 */
export const memoize = <Args extends unknown[], Return>(
  fn: (...args: Args) => Return,
  ttlMs: number = 60000
): ((...args: Args) => Return) => {
  const cache = new TTLCache<string, Return>(ttlMs);

  return (...args: Args): Return => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

/**
 * Async memoization
 */
export const memoizeAsync = <Args extends unknown[], Return>(
  fn: (...args: Args) => Promise<Return>,
  ttlMs: number = 60000
): ((...args: Args) => Promise<Return>) => {
  const cache = new TTLCache<string, Promise<Return>>(ttlMs);

  return (...args: Args): Promise<Return> => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const promise = fn(...args);
    cache.set(key, promise);
    return promise;
  };
};

/**
 * Debounce function calls
 */
export const debounce = <Args extends unknown[]>(
  fn: (...args: Args) => void,
  delayMs: number
): ((...args: Args) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Args) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delayMs);
  };
};

/**
 * Throttle function calls
 */
export const throttle = <Args extends unknown[]>(
  fn: (...args: Args) => void,
  delayMs: number
): ((...args: Args) => void) => {
  let lastCall = 0;

  return (...args: Args) => {
    const now = Date.now();
    if (now - lastCall >= delayMs) {
      fn(...args);
      lastCall = now;
    }
  };
};

/**
 * Retry with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries - 1) {
        const delay = initialDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};
