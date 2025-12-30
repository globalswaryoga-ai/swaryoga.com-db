// lib/performance/caching.ts
// Intelligent caching strategy for common endpoints

export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  key: string;
  tags?: string[]; // For cache invalidation
}

class CacheManager {
  private cache: Map<string, { data: unknown; expiry: number; tags: string[] }> = new Map();
  private tags: Map<string, Set<string>> = new Map(); // For efficient invalidation

  set<T>(key: string, data: T, ttl: number, tags: string[] = []): void {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { data, expiry, tags });

    // Track tags
    for (const tag of tags) {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      this.tags.get(tag)!.add(key);
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check expiry
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  invalidate(tag: string): void {
    const keys = this.tags.get(tag);
    if (keys) {
      keys.forEach((key) => this.cache.delete(key));
      this.tags.delete(tag);
    }
  }

  invalidateAll(): void {
    this.cache.clear();
    this.tags.clear();
  }

  getSize(): number {
    return this.cache.size;
  }

  cleanup(): void {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
  }
}

export const cacheManager = new CacheManager();

// Cache configurations for different endpoints
export const CacheConfigs = {
  // Workshops list: 30 minutes
  workshopsList: {
    ttl: 30 * 60 * 1000,
    tags: ['workshops', 'schedules'],
  },

  // Workshop details: 1 hour
  workshopDetails: {
    ttl: 60 * 60 * 1000,
    tags: ['workshops'],
  },

  // User profile: 5 minutes
  userProfile: {
    ttl: 5 * 60 * 1000,
    tags: ['users'],
  },

  // Orders list: 1 minute
  ordersList: {
    ttl: 1 * 60 * 1000,
    tags: ['orders'],
  },

  // Availability: 5 minutes
  availability: {
    ttl: 5 * 60 * 1000,
    tags: ['availability', 'workshops'],
  },

  // Offers: 1 hour
  offers: {
    ttl: 60 * 60 * 1000,
    tags: ['offers'],
  },

  // Panchang: 24 hours
  panchang: {
    ttl: 24 * 60 * 60 * 1000,
    tags: ['panchang'],
  },
};

// Cleanup expired cache every 10 minutes
setInterval(() => cacheManager.cleanup(), 10 * 60 * 1000);

export default cacheManager;
