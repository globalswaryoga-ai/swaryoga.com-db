// lib/performance/queryOptimization.ts
// Database query optimization strategies

export interface QueryStats {
  query: string;
  executionTime: number;
  documentCount: number;
  indexed: boolean;
  recommendedIndex?: string;
}

class QueryProfiler {
  private stats: QueryStats[] = [];
  private slowQueryThreshold: number = 100; // ms

  async profileQuery<T>(
    name: string,
    query: () => { lean?: () => unknown; exec?: () => Promise<unknown> } | Promise<{ lean?: () => unknown; exec?: () => Promise<unknown> }>,
    shouldLean: boolean = true
  ): Promise<{ data: T; stats: QueryStats }> {
    const startTime = performance.now();

    try {
      const q = await query();
      // Support both Mongoose Query objects and promise-returning query factories.
      const maybeLeaned = shouldLean ? (q.lean ? q.lean() : q) : q;
      const data = (maybeLeaned as any).exec ? await (maybeLeaned as any).exec() : await (maybeLeaned as any);

      const executionTime = performance.now() - startTime;
      const stats: QueryStats = {
        query: name,
        executionTime,
        documentCount: Array.isArray(data) ? data.length : 1,
        indexed: executionTime < this.slowQueryThreshold,
      };

      if (executionTime > this.slowQueryThreshold) {
        stats.recommendedIndex = `Create index for: ${name}`;
      }

      this.stats.push(stats);
      return { data: data as T, stats };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      throw new Error(`Query failed after ${executionTime}ms: ${error}`);
    }
  }

  getSlowQueries(threshold?: number): QueryStats[] {
    const limit = threshold || this.slowQueryThreshold;
    return this.stats.filter((s) => s.executionTime > limit);
  }

  getAverageExecutionTime(): number {
    if (this.stats.length === 0) return 0;
    const total = this.stats.reduce((sum, s) => sum + s.executionTime, 0);
    return total / this.stats.length;
  }

  getReport(): string {
    const slowQueries = this.getSlowQueries();
    const avgTime = this.getAverageExecutionTime();

    let report = `
╔════════════════════════════════════════════════════════════════════════╗
║                 QUERY PERFORMANCE REPORT                              ║
╚════════════════════════════════════════════════════════════════════════╝

📊 STATISTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Total Queries:     ${this.stats.length}
  Average Time:      ${avgTime.toFixed(2)}ms
  Slow Queries:      ${slowQueries.length}

`;

    if (slowQueries.length > 0) {
      report += `⚠️  SLOW QUERIES (> ${this.slowQueryThreshold}ms)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      slowQueries.forEach((q) => {
        report += `\n${q.query}\n  Time: ${q.executionTime.toFixed(2)}ms\n  Documents: ${q.documentCount}\n`;
        if (q.recommendedIndex) {
          report += `  ✓ Recommendation: ${q.recommendedIndex}\n`;
        }
      });
    }

    report += `\n═══════════════════════════════════════════════════════════════════════════\n`;
    return report;
  }

  clear(): void {
    this.stats = [];
  }
}

export const queryProfiler = new QueryProfiler();

// Recommended indexes for common queries
export const RecommendedIndexes = {
  users: [
    { fields: { email: 1 }, name: 'email_index', unique: true },
    { fields: { userId: 1 }, name: 'userId_index', unique: true },
    { fields: { createdAt: -1 }, name: 'createdAt_index' },
  ],

  orders: [
    { fields: { userId: 1, createdAt: -1 }, name: 'user_orders_index' },
    { fields: { paymentStatus: 1 }, name: 'payment_status_index' },
    { fields: { createdAt: -1 }, name: 'orders_date_index' },
  ],

  workshops: [
    { fields: { slug: 1 }, name: 'workshop_slug_index', unique: true },
    { fields: { status: 1 }, name: 'workshop_status_index' },
    { fields: { updatedAt: -1 }, name: 'workshop_date_index' },
  ],

  schedules: [
    { fields: { workshopId: 1, startDate: 1 }, name: 'workshop_schedule_index' },
    { fields: { startDate: 1, endDate: 1 }, name: 'schedule_date_index' },
    { fields: { availableSeats: 1 }, name: 'available_seats_index' },
  ],

  lifeplannerTasks: [
    { fields: { userId: 1, date: -1 }, name: 'user_tasks_index' },
    { fields: { completed: 1 }, name: 'task_status_index' },
    { fields: { createdAt: -1 }, name: 'tasks_date_index' },
  ],

  leads: [
    { fields: { phoneNumber: 1 }, name: 'phone_index', unique: true },
    { fields: { status: 1, lastMessageAt: -1 }, name: 'lead_status_index' },
    { fields: { source: 1 }, name: 'source_index' },
  ],
};

// Query optimization tips
export const QueryOptimizationTips = {
  selectFields: 'Use .select() to only fetch needed fields',
  lean: 'Use .lean() for read-only queries to skip Mongoose overhead',
  batchFetching: 'Batch multiple queries instead of N+1 queries',
  indexing: 'Add indexes for frequently filtered/sorted fields',
  caching: 'Cache frequently accessed data',
  pagination: 'Use pagination for large result sets',
  aggregation: 'Use aggregation pipeline for complex queries',
  denormalization: 'Consider denormalizing frequently accessed data',
};

export default queryProfiler;
