import crypto from 'node:crypto';
import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';

export interface WebsiteVisitor {
  id: string;
  sessionId: string;
  ip: string;
  pageUrl: string;
  referrer: string;
  userAgent: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  country: string;
  state: string;
  city: string;
  visitorName?: string;
  visitorEmail?: string;
  visitorPhone?: string;
  visitorGender?: string;
  source: string;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface VisitorInput {
  sessionId?: string;
  ip?: string;
  pageUrl: string;
  referrer?: string;
  userAgent?: string;
  deviceType?: string;
  country?: string;
  state?: string;
  city?: string;
  visitorName?: string;
  visitorEmail?: string;
  visitorPhone?: string;
  visitorGender?: string;
  source?: string;
  data?: Record<string, any>;
}

export async function initVisitorSchema(): Promise<void> {
  await bunnyExecute(`
    CREATE TABLE IF NOT EXISTS website_visitors_sql (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      ip TEXT,
      page_url TEXT,
      referrer TEXT,
      user_agent TEXT,
      device_type TEXT,
      country TEXT,
      state TEXT,
      city TEXT,
      visitor_name TEXT,
      visitor_email TEXT,
      visitor_phone TEXT,
      visitor_gender TEXT,
      source TEXT,
      data_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function parseJson<T>(val: unknown, fallback: T): T {
  try {
    return val ? (JSON.parse(String(val)) as T) : fallback;
  } catch {
    return fallback;
  }
}

function rowToVisitor(row: any): WebsiteVisitor {
  return {
    id: String(row.id),
    sessionId: String(row.session_id || ''),
    ip: String(row.ip || ''),
    pageUrl: String(row.page_url || ''),
    referrer: String(row.referrer || ''),
    userAgent: String(row.user_agent || ''),
    deviceType: (row.device_type as any) || 'desktop',
    country: String(row.country || ''),
    state: String(row.state || ''),
    city: String(row.city || ''),
    visitorName: row.visitor_name || undefined,
    visitorEmail: row.visitor_email || undefined,
    visitorPhone: row.visitor_phone || undefined,
    visitorGender: row.visitor_gender || undefined,
    source: String(row.source || ''),
    data: parseJson(row.data_json, {}),
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
  };
}

export async function recordVisitor(input: VisitorInput): Promise<WebsiteVisitor> {
  await initVisitorSchema();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const sessionId = input.sessionId || crypto.randomUUID();

  await bunnyExecute({
    sql: `INSERT INTO website_visitors_sql (
      id, session_id, ip, page_url, referrer, user_agent,
      device_type, country, state, city,
      visitor_name, visitor_email, visitor_phone, visitor_gender,
      source, data_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      sessionId,
      input.ip || '',
      input.pageUrl,
      input.referrer || '',
      input.userAgent || '',
      input.deviceType || 'desktop',
      input.country || '',
      input.state || '',
      input.city || '',
      input.visitorName || null,
      input.visitorEmail || null,
      input.visitorPhone || null,
      input.visitorGender || null,
      input.source || 'website',
      JSON.stringify(input.data || {}),
      now,
      now,
    ],
  });

  return {
    id,
    sessionId,
    ip: input.ip || '',
    pageUrl: input.pageUrl,
    referrer: input.referrer || '',
    userAgent: input.userAgent || '',
    deviceType: (input.deviceType as any) || 'desktop',
    country: input.country || '',
    state: input.state || '',
    city: input.city || '',
    visitorName: input.visitorName,
    visitorEmail: input.visitorEmail,
    visitorPhone: input.visitorPhone,
    visitorGender: input.visitorGender,
    source: input.source || 'website',
    data: input.data || {},
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateVisitorLeadInfo(input: {
  sessionId: string;
  name: string;
  email: string;
  phone: string;
  country?: string;
  state?: string;
  city?: string;
  gender?: string;
}): Promise<void> {
  await initVisitorSchema();
  const now = new Date().toISOString();

  await bunnyExecute({
    sql: `UPDATE website_visitors_sql SET
      visitor_name = COALESCE(?, visitor_name),
      visitor_email = COALESCE(?, visitor_email),
      visitor_phone = COALESCE(?, visitor_phone),
      visitor_gender = COALESCE(?, visitor_gender),
      country = CASE WHEN ? != '' THEN ? ELSE country END,
      state = CASE WHEN ? != '' THEN ? ELSE state END,
      city = CASE WHEN ? != '' THEN ? ELSE city END,
      updated_at = ?
    WHERE session_id = ?`,
    args: [
      input.name,
      input.email,
      input.phone,
      input.gender || null,
      input.country || '',
      input.country || '',
      input.state || '',
      input.state || '',
      input.city || '',
      input.city || '',
      now,
      input.sessionId,
    ],
  });
}

export async function getVisitorAnalytics(): Promise<{
  totalVisitors30d: number;
  totalPageViews: number;
  activeNow: number;
  leadsCaptured: number;
  mobilePercent: number;
  desktopPercent: number;
  topCountries: Array<{ name: string; count: number; percentage: number }>;
  topCities: Array<{ name: string; count: number }>;
  recentVisitors: WebsiteVisitor[];
}> {
  await initVisitorSchema();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const [
    totalCountRes,
    pageViewsRes,
    activeRes,
    leadsCountRes,
    devicesRes,
    countriesRes,
    citiesRes,
    recentRes,
  ] = await Promise.all([
    bunnyExecute({
      sql: 'SELECT COUNT(DISTINCT session_id) as cnt FROM website_visitors_sql WHERE created_at >= ?',
      args: [thirtyDaysAgo],
    }),
    bunnyExecute({
      sql: 'SELECT COUNT(*) as cnt FROM website_visitors_sql WHERE created_at >= ?',
      args: [thirtyDaysAgo],
    }),
    bunnyExecute({
      sql: 'SELECT COUNT(DISTINCT session_id) as cnt FROM website_visitors_sql WHERE created_at >= ?',
      args: [fifteenMinsAgo],
    }),
    bunnyExecute({
      sql: `SELECT COUNT(DISTINCT session_id) as cnt FROM website_visitors_sql WHERE visitor_email IS NOT NULL AND visitor_email != ''`,
      args: [],
    }),
    bunnyExecute({
      sql: `SELECT 
        SUM(CASE WHEN LOWER(device_type) = 'mobile' THEN 1 ELSE 0 END) as mobile_count,
        SUM(CASE WHEN LOWER(device_type) != 'mobile' THEN 1 ELSE 0 END) as desktop_count,
        COUNT(*) as total
      FROM website_visitors_sql WHERE created_at >= ?`,
      args: [thirtyDaysAgo],
    }),
    bunnyExecute({
      sql: `SELECT country, COUNT(*) as cnt 
      FROM website_visitors_sql 
      WHERE country IS NOT NULL AND country != '' AND created_at >= ? 
      GROUP BY country ORDER BY cnt DESC LIMIT 5`,
      args: [thirtyDaysAgo],
    }),
    bunnyExecute({
      sql: `SELECT city, country, COUNT(*) as cnt 
      FROM website_visitors_sql 
      WHERE city IS NOT NULL AND city != '' AND created_at >= ? 
      GROUP BY city, country ORDER BY cnt DESC LIMIT 8`,
      args: [thirtyDaysAgo],
    }),
    bunnyExecute({
      sql: 'SELECT * FROM website_visitors_sql ORDER BY created_at DESC LIMIT 100',
      args: [],
    }),
  ]);

  const totalVisitors30d = Number(totalCountRes.rows[0]?.cnt || 0);
  const totalPageViews = Number(pageViewsRes.rows[0]?.cnt || 0);
  const activeNow = Number(activeRes.rows[0]?.cnt || 0);
  const leadsCaptured = Number(leadsCountRes.rows[0]?.cnt || 0);

  const deviceTotal = Number(devicesRes.rows[0]?.total || 0);
  const mobileCount = Number(devicesRes.rows[0]?.mobile_count || 0);
  const desktopCount = Number(devicesRes.rows[0]?.desktop_count || 0);

  const mobilePercent = deviceTotal > 0 ? Math.round((mobileCount / deviceTotal) * 100) : 0;
  const desktopPercent = deviceTotal > 0 ? Math.round((desktopCount / deviceTotal) * 100) : (deviceTotal === 0 ? 0 : 100);

  const topCountries = countriesRes.rows.map((r: any) => ({
    name: String(r.country || 'Unknown'),
    count: Number(r.cnt || 0),
    percentage: totalPageViews > 0 ? Math.round((Number(r.cnt || 0) / totalPageViews) * 100) : 0,
  }));

  const topCities = citiesRes.rows.map((r: any) => ({
    name: `${r.city}${r.country ? `, ${r.country}` : ''}`,
    count: Number(r.cnt || 0),
  }));

  const recentVisitors = recentRes.rows.map(rowToVisitor);

  return {
    totalVisitors30d,
    totalPageViews,
    activeNow,
    leadsCaptured,
    mobilePercent,
    desktopPercent,
    topCountries,
    topCities,
    recentVisitors,
  };
}
