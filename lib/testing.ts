/**
 * Testing utilities and helpers
 * Provides comprehensive testing infrastructure for API routes and utilities
 */

import { NextRequest } from 'next/server';

/**
 * Mock request builder for testing
 */
export class MockRequestBuilder {
  private method: string = 'GET';
  private url: string = 'http://localhost:3000/api/test';
  private headers: Record<string, string> = {};
  private body: unknown = null;

  setMethod(method: string): this {
    this.method = method;
    return this;
  }

  setUrl(url: string): this {
    this.url = url;
    return this;
  }

  addHeader(key: string, value: string): this {
    this.headers[key] = value;
    return this;
  }

  setAuthorization(token: string): this {
    this.headers['Authorization'] = `Bearer ${token}`;
    return this;
  }

  setBody(body: unknown): this {
    this.body = body;
    this.addHeader('Content-Type', 'application/json');
    return this;
  }

  async build(): Promise<NextRequest> {
    const init: any = {
      method: this.method,
      headers: this.headers,
    };

    if (this.body) {
      init.body = JSON.stringify(this.body);
    }

    return new NextRequest(new URL(this.url), init);
  }
}

/**
 * Test data generators
 */
export const testDataGenerators = {
  userId: () => '507f1f77bcf86cd799439011',
  email: () => `test${Math.random().toString(36).substr(2, 9)}@example.com`,
  phoneNumber: () => `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
  mongoObjectId: () => {
    const chars = '0123456789abcdef';
    let id = '';
    for (let i = 0; i < 24; i++) {
      id += chars[Math.floor(Math.random() * 16)];
    }
    return id;
  },
  uuid: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },
  timestamp: () => new Date().toISOString(),
  futureDate: (days: number = 7) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  },
  randomString: (length: number = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },
  randomNumber: (min: number = 0, max: number = 100) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  randomEmail: () => {
    return `${testDataGenerators.randomString(8)}@test.com`;
  },
};

/**
 * Assertion helpers for API testing
 */
export const assertions = {
  isValidResponse: (response: unknown): boolean => {
    return (
      typeof response === 'object' &&
      response !== null &&
      'success' in response &&
      'timestamp' in response
    );
  },

  isSuccessResponse: (response: unknown): boolean => {
    return (
      assertions.isValidResponse(response) &&
      (response as any).success === true &&
      'data' in (response as Record<string, unknown>)
    );
  },

  isErrorResponse: (response: unknown): boolean => {
    return (
      assertions.isValidResponse(response) &&
      (response as any).success === false &&
      'error' in (response as Record<string, unknown>)
    );
  },

  hasErrorCode: (response: unknown, code: string): boolean => {
    return (
      assertions.isErrorResponse(response) &&
      ((response as any).error as Record<string, unknown>)
        .code === code
    );
  },

  hasData: (response: unknown): boolean => {
    return (
      assertions.isSuccessResponse(response) &&
      (response as any).data !== null
    );
  },

  hasField: (obj: unknown, field: string): boolean => {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      field in obj
    );
  },

  fieldEquals: (obj: unknown, field: string, value: unknown): boolean => {
    return (
      assertions.hasField(obj, field) &&
      (obj as Record<string, unknown>)[field] === value
    );
  },

  isArray: (response: unknown): boolean => {
    return (
      assertions.isSuccessResponse(response) &&
      Array.isArray((response as Record<string, unknown>).data)
    );
  },

  arrayLength: (response: unknown, length: number): boolean => {
    return (
      assertions.isArray(response) &&
      ((response as Record<string, unknown>).data as unknown[]).length === length
    );
  },
};

/**
 * Performance measurement utilities
 */
export class PerformanceMonitor {
  private marks: Record<string, number> = {};
  private measurements: Record<string, number[]> = {};

  mark(name: string): void {
    this.marks[name] = performance.now();
  }

  measure(name: string, startMark: string, endMark?: string): number {
    const end = endMark ? this.marks[endMark] : performance.now();
    const start = this.marks[startMark];

    if (start === undefined) {
      throw new Error(`Start mark "${startMark}" not found`);
    }

    const duration = end - start;

    if (!this.measurements[name]) {
      this.measurements[name] = [];
    }

    this.measurements[name].push(duration);
    return duration;
  }

  getStats(name: string): {
    count: number;
    total: number;
    average: number;
    min: number;
    max: number;
  } {
    const measurements = this.measurements[name] || [];

    if (measurements.length === 0) {
      return { count: 0, total: 0, average: 0, min: 0, max: 0 };
    }

    const total = measurements.reduce((a, b) => a + b, 0);

    return {
      count: measurements.length,
      total,
      average: total / measurements.length,
      min: Math.min(...measurements),
      max: Math.max(...measurements),
    };
  }

  getAllStats(): Record<string, ReturnType<typeof this.getStats>> {
    const result: Record<string, ReturnType<typeof this.getStats>> = {};

    for (const name of Object.keys(this.measurements)) {
      result[name] = this.getStats(name);
    }

    return result;
  }

  reset(): void {
    this.marks = {};
    this.measurements = {};
  }
}

/**
 * Response time benchmark
 */
export const benchmarkResponseTime = async (
  fn: () => Promise<unknown>,
  iterations: number = 100
): Promise<{
  average: number;
  min: number;
  max: number;
  p95: number;
  p99: number;
}> => {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    times.push(end - start);
  }

  times.sort((a, b) => a - b);

  const average = times.reduce((a, b) => a + b, 0) / times.length;
  const min = times[0];
  const max = times[times.length - 1];
  const p95Index = Math.floor(times.length * 0.95);
  const p99Index = Math.floor(times.length * 0.99);

  return {
    average,
    min,
    max,
    p95: times[p95Index],
    p99: times[p99Index],
  };
};

/**
 * Memory usage monitor
 */
export const getMemoryUsage = (): {
  heapUsed: string;
  heapTotal: string;
  external: string;
  rss: string;
} => {
  const mem = process.memoryUsage();

  const formatBytes = (bytes: number): string => {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  return {
    heapUsed: formatBytes(mem.heapUsed),
    heapTotal: formatBytes(mem.heapTotal),
    external: formatBytes(mem.external),
    rss: formatBytes(mem.rss),
  };
};

/**
 * Mock database for testing
 */
export class MockDatabase<T extends { _id?: string }> {
  private data: Map<string, T> = new Map();
  private id: number = 1;

  create(item: T): T {
    const id = String(this.id++);
    const doc = { ...item, _id: id } as T;
    this.data.set(id, doc);
    return doc;
  }

  findById(id: string): T | null {
    return this.data.get(id) || null;
  }

  find(predicate: (item: T) => boolean): T[] {
    const results: T[] = [];
    this.data.forEach((item) => {
      if (predicate(item)) {
        results.push(item);
      }
    });
    return results;
  }

  update(id: string, updates: Partial<T>): T | null {
    const item = this.data.get(id);
    if (!item) return null;

    const updated = { ...item, ...updates };
    this.data.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.data.delete(id);
  }

  clear(): void {
    this.data.clear();
  }

  getAll(): T[] {
    return Array.from(this.data.values());
  }
}
