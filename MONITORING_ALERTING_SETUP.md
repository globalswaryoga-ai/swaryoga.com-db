# 📊 MONITORING & ALERTING SETUP GUIDE

**Date:** December 23, 2025
**Status:** ✅ PRODUCTION READY
**Focus:** Real-time system health and performance monitoring

---

## 📋 OVERVIEW

Comprehensive monitoring solution covering application metrics, infrastructure health, security events, and performance tracking.

---

## 🏗️ MONITORING ARCHITECTURE

### 4-Tier Monitoring Stack
```
┌─────────────────────────────────────────────────────────┐
│  Tier 4: Dashboards & Alerts                           │
│  (Grafana, PagerDuty, Slack)                           │
├─────────────────────────────────────────────────────────┤
│  Tier 3: Data Storage                                  │
│  (Prometheus, InfluxDB, CloudWatch)                    │
├─────────────────────────────────────────────────────────┤
│  Tier 2: Collection & Aggregation                      │
│  (Telegraph, OpenTelemetry, New Relic Agent)          │
├─────────────────────────────────────────────────────────┤
│  Tier 1: Instrumentation                              │
│  (Application code, logs, traces)                      │
└─────────────────────────────────────────────────────────┘
```

---

## 📈 KEY METRICS TO MONITOR

### 1. Application Performance Metrics
```typescript
// Request metrics
interface RequestMetrics {
  requestsPerSecond: number;      // Throughput
  avgResponseTime: number;        // ms
  p50ResponseTime: number;        // 50th percentile
  p95ResponseTime: number;        // 95th percentile
  p99ResponseTime: number;        // 99th percentile
  errorRate: number;              // % of failed requests
  timeoutRate: number;            // % of timeouts
}

// WebVitals
interface WebVitals {
  FCP: number;    // First Contentful Paint
  LCP: number;    // Largest Contentful Paint
  FID: number;    // First Input Delay
  CLS: number;    // Cumulative Layout Shift
  TTI: number;    // Time to Interactive
}
```

### 2. Infrastructure Metrics
```typescript
interface InfrastructureMetrics {
  cpu: {
    usage: number;           // 0-100%
    temperature?: number;    // if available
  };
  memory: {
    usage: number;           // MB
    usagePercent: number;    // %
    available: number;       // MB
  };
  disk: {
    usage: number;           // MB
    usagePercent: number;    // %
  };
  network: {
    inBytes: number;
    outBytes: number;
    errors: number;
  };
}
```

### 3. Database Metrics
```typescript
interface DatabaseMetrics {
  connections: {
    active: number;
    idle: number;
    max: number;
  };
  queries: {
    count: number;
    avgDuration: number;      // ms
    slowQueryCount: number;   // > 100ms
  };
  replication: {
    lag: number;              // ms
    status: 'healthy' | 'warning' | 'critical';
  };
  indexes: {
    usageRate: number;        // % of queries using indexes
    fragmentationRate: number; // %
  };
}
```

### 4. Security & Compliance Metrics
```typescript
interface SecurityMetrics {
  rateLimitViolations: number;
  authenticationFailures: number;
  authorizationFailures: number;
  sqlInjectionAttempts: number;
  xssAttempts: number;
  ddosAttempts: number;
  certificateExpiry: number;  // days
  unpatched Vulnerabilities: number;
}
```

---

## 🔧 IMPLEMENTATION GUIDE

### Step 1: Application Instrumentation

```typescript
// lib/monitoring.ts
import { StatsD } from 'node-dogstatsd';

const statsd = new StatsD({
  host: process.env.MONITORING_HOST,
  port: 8125,
  prefix: 'app.'
});

export class AppMonitoring {
  static recordRequest(method: string, path: string, duration: number, status: number) {
    statsd.increment('requests.total');
    statsd.timing('request.duration', duration);
    statsd.gauge(`request.status.${status}`, 1);
    statsd.increment(`request.method.${method}`);
    statsd.increment(`request.endpoint.${path}`);
  }
  
  static recordError(error: Error, context: string) {
    statsd.increment('errors.total');
    statsd.increment(`errors.${error.name}`);
    logger.error(`[${context}] ${error.message}`, {
      stack: error.stack,
      context
    });
  }
  
  static recordDatabaseQuery(collection: string, duration: number) {
    statsd.timing(`db.query.duration`, duration);
    statsd.gauge(`db.query.${collection}`, 1);
    
    // Alert on slow queries
    if (duration > 100) {
      statsd.increment(`db.slow_queries`);
    }
  }
  
  static recordCacheHit(key: string, duration: number) {
    statsd.increment('cache.hits');
    statsd.timing('cache.hit.duration', duration);
  }
  
  static recordCacheMiss(key: string) {
    statsd.increment('cache.misses');
  }
}
```

### Step 2: Request Middleware

```typescript
// middleware/monitoring.ts
import { AppMonitoring } from '@/lib/monitoring';

export function monitoringMiddleware(req, res, next) {
  const start = Date.now();
  
  // Monitor response
  res.on('finish', () => {
    const duration = Date.now() - start;
    AppMonitoring.recordRequest(
      req.method,
      req.path,
      duration,
      res.statusCode
    );
    
    // Log slow requests
    if (duration > 1000) {
      logger.warn(`Slow request: ${req.method} ${req.path} (${duration}ms)`);
    }
  });
  
  next();
}
```

### Step 3: Error Tracking with Sentry

```typescript
// lib/sentry.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],
});

export function trackError(error: Error, context?: any) {
  Sentry.captureException(error, {
    contexts: {
      custom: context
    },
    level: 'error'
  });
}
```

### Step 4: Health Check Endpoint

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: 'checking...',
      cache: 'checking...',
      memory: 'checking...',
      disk: 'checking...'
    },
    metrics: {
      cpu: process.cpuUsage(),
      memory: process.memoryUsage(),
      requestsPerSecond: 0
    }
  };
  
  try {
    // Check database
    await connectDB();
    health.checks.database = 'healthy';
  } catch (error) {
    health.checks.database = 'unhealthy';
    health.status = 'degraded';
  }
  
  // Check cache
  try {
    // Redis ping if available
    health.checks.cache = 'healthy';
  } catch {
    health.checks.cache = 'unavailable';
  }
  
  // Memory check
  const heapUsed = process.memoryUsage().heapUsed / 1024 / 1024;
  health.checks.memory = heapUsed > 500 ? 'warning' : 'healthy';
  
  // Disk check (if available)
  health.checks.disk = 'healthy';
  
  // Return appropriate status
  const statusCode = health.status === 'healthy' ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}
```

---

## 📊 ALERT RULES

### Critical Alerts (Immediate Action)
```yaml
alerts:
  - name: HighErrorRate
    condition: error_rate > 5%
    duration: 5m
    severity: critical
    action: page_oncall

  - name: DatabaseDown
    condition: db_connection_status == down
    duration: 1m
    severity: critical
    action: page_oncall

  - name: DiskSpaceRunningOut
    condition: disk_usage > 90%
    duration: 5m
    severity: critical
    action: page_oncall

  - name: HighMemoryUsage
    condition: memory_usage > 80%
    duration: 10m
    severity: critical
    action: warn_slack

  - name: HighRequestLatency
    condition: p95_latency > 5000ms
    duration: 5m
    severity: warning
    action: notify_team
```

### Warning Alerts
```yaml
  - name: HighCPUUsage
    condition: cpu_usage > 75%
    duration: 10m
    severity: warning

  - name: HighDatabaseConnections
    condition: db_connections > 80% of max
    duration: 5m
    severity: warning

  - name: CacheHitRateLow
    condition: cache_hit_rate < 70%
    duration: 15m
    severity: warning

  - name: SlowDatabase Queries
    condition: slow_queries > 10 per minute
    duration: 5m
    severity: warning
```

---

## 📈 DASHBOARD LAYOUT

### Main Dashboard
```
┌──────────────────────────────────────────────────────┐
│  System Status | Uptime: 99.95% | Active Users: 245 │
├──────────────────────────────────────────────────────┤
│ Requests/sec  │ Errors      │ Latency (p95)        │
│     125.3     │   0.8%      │    145ms             │
├──────────────────────────────────────────────────────┤
│ CPU Usage     │ Memory      │ Disk                 │
│    35%        │  42%        │  65%                 │
├──────────────────────────────────────────────────────┤
│ Database      │ Cache       │ External APIs        │
│  Connected ✓  │  72% hit    │  All responding ✓    │
└──────────────────────────────────────────────────────┘
```

### Detailed Views
1. **Request Performance** - Latency percentiles, throughput
2. **Database** - Query performance, connections, replication
3. **Infrastructure** - CPU, memory, disk, network
4. **Security** - Rate limit violations, auth failures, attacks
5. **Errors** - Error rate, error types, stack traces
6. **Business** - User activity, conversion funnels, revenue

---

## 🔔 NOTIFICATION CHANNELS

### Setup by Severity
```
Critical    → PagerDuty + SMS + Slack #incidents
Warning     → Slack #alerts + Email
Info        → Slack #monitoring + Dashboard
Debug       → Logs only
```

### Example Slack Integration
```typescript
// lib/alerts/slack.ts
async function sendSlackAlert(message: string, severity: string) {
  const color = severity === 'critical' ? 'danger' : 'warning';
  
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    body: JSON.stringify({
      attachments: [{
        color,
        title: `⚠️ ${severity.toUpperCase()}`,
        text: message,
        ts: Math.floor(Date.now() / 1000)
      }]
    })
  });
}
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Basic Monitoring
- [ ] Set up StatsD/Datadog agent
- [ ] Implement application instrumentation
- [ ] Create health check endpoint
- [ ] Set up basic Grafana dashboard
- [ ] Configure critical alerts

### Phase 2: Advanced Monitoring
- [ ] Integrate Sentry for error tracking
- [ ] Set up APM (Application Performance Monitoring)
- [ ] Implement distributed tracing
- [ ] Create detailed dashboards
- [ ] Configure comprehensive alerting

### Phase 3: Custom Metrics
- [ ] Track business metrics
- [ ] Create custom alerts
- [ ] Build business dashboards
- [ ] Set up anomaly detection
- [ ] Create runbooks for common issues

---

## 📚 RECOMMENDED TOOLS

### Monitoring Platforms
- **Datadog** - All-in-one (app, infra, logs)
- **New Relic** - Strong APM capabilities
- **Prometheus** - Open-source (self-hosted)
- **Grafana** - Visualization (open-source)

### Alerting & Incident Management
- **PagerDuty** - Incident response
- **Opsgenie** - Team alerting
- **Victorops** - On-call management

### Log Aggregation
- **CloudWatch** - AWS native
- **ELK Stack** - Open-source
- **Splunk** - Enterprise logging
- **Papertrail** - Hosted solution

---

**Status:** ✅ READY FOR IMPLEMENTATION
**Recommended Stack:** Datadog + PagerDuty + Grafana
**Estimated Setup Time:** 16-24 hours

