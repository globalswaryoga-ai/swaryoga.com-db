import { bunnyExecute } from '@/lib/bunnyDatabase';

function parse(value: unknown): any | null { try { return JSON.parse(String(value)); } catch { return null; } }
function dateValue(value: any) { const raw = value?.$date || value; const time = new Date(raw || 0).getTime(); return Number.isFinite(time) ? time : 0; }

async function archived(collection: string) {
  const result = await bunnyExecute({ sql: 'SELECT document_json FROM mongo_documents WHERE collection_name = ?', args: [collection] });
  return result.rows.map((row: any) => parse(row.document_json)).filter(Boolean);
}

let storageConfig: { key: string; zone: string } | null | undefined;
function getStorageConfig() {
  if (storageConfig !== undefined) return storageConfig;
  const key = process.env.BUNNY_STORAGE_KEY || process.env.BUNNY_STORAGE_API_KEY || process.env.BUNNY_STORAGE_READONLY_KEY;
  const zone = process.env.BUNNY_STORAGE_ZONE_BACKUP || process.env.BUNNY_STORAGE_ZONE;
  storageConfig = key && zone ? { key, zone } : null;
  return storageConfig;
}

async function latestExport(collection: string) {
  const config = getStorageConfig();
  if (!config) return null;
  try {
    const response = await fetch(`https://storage.bunnycdn.com/${config.zone}/data/latest/${collection}.json`, {
      headers: { AccessKey: config.key },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const parsed = await response.json();
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function latestSqlSnapshot(table: string) {
  const config = getStorageConfig();
  if (!config) return null;
  try {
    const response = await fetch(`https://storage.bunnycdn.com/${config.zone}/sql/latest/${table}.json`, {
      headers: { AccessKey: config.key },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const parsed = await response.json();
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function preferred(collection: string, fallbackCollection = collection) {
  return (await latestExport(collection)) || await archived(fallbackCollection);
}

export async function getBunnyAnalyticsOverview(input: { visibleUserIds: string[] | null; viewerUserId: string; superAdmin: boolean; startDate?: string | null; endDate?: string | null }) {
  const leadSnapshot = await latestSqlSnapshot('leads_sql') || await preferred('Lead');
  const rows = leadSnapshot
    ? { rows: leadSnapshot.map((lead: any) => ({ data_json: JSON.stringify(lead) })) }
    : await bunnyExecute('SELECT data_json FROM leads_sql');
  const start = input.startDate ? new Date(input.startDate).getTime() : 0;
  const end = input.endDate ? new Date(input.endDate).getTime() : Number.MAX_SAFE_INTEGER;
  const leads = rows.rows.map((row: any) => parse(row.data_json)).filter((lead: any) => {
    if (!lead) return false;
    const owner = lead.assignedToUserId || lead.createdByUserId;
    const visible = input.visibleUserIds === null || input.visibleUserIds.includes(String(lead.assignedToUserId)) || input.visibleUserIds.includes(String(lead.createdByUserId));
    const created = dateValue(lead.createdAt);
    return visible && created >= start && created <= end;
  });
  const statusCounts: Record<string, number> = {};
  for (const lead of leads) { const status = String(lead.status || 'unknown'); statusCounts[status] = (statusCounts[status] || 0) + 1; }
  const [messages, broadcasts] = await Promise.all([preferred('Message', 'messages'), archived('whatsapp_messages')]);
  const messageCount = input.superAdmin ? messages.length + broadcasts.length : messages.filter((m: any) => String(m.senderId || m.sentByUserId || '') === input.viewerUserId).length;
  const runs = await archived('broadcast_runs');
  return { totalLeads: leads.length, leadsByStatus: statusCounts, totalSales: 0, totalMessages: messageCount, metaMessagesSent: 0, qrWhatsappMessagesSent: 0, avgResponseTime: 0, broadcast: { byStatus: { completed: runs.length }, byReason: {} } };
}

export async function getBunnyAdminDashboard() {
  const [userSnapshot, signinSnapshot, messages, orders] = await Promise.all([latestSqlSnapshot('admin_users_sql'), latestSqlSnapshot('admin_signins_sql'), preferred('Message', 'messages'), preferred('Order', 'orders')]);
  const users = userSnapshot || await preferred('User', 'users');
  const signins = signinSnapshot || await archived('signins');
  const completed = orders.filter((order: any) => order.paymentStatus === 'completed');
  const currencyBreakdown = { INR: 0, USD: 0, NPR: 0 };
  let totalAmountUSD = 0;
  for (const order of completed) { const amount = Number(order.total || 0); const currency = order.currency || 'INR'; if (currency in currencyBreakdown) (currencyBreakdown as any)[currency] += amount; totalAmountUSD += currency === 'USD' ? amount : currency === 'NPR' ? amount / 137 : amount / 86; }
  return { totalUsers: users.length, totalSignins: signins.length, totalMessages: messages.length, totalOrders: orders.length, pendingOrders: orders.length - completed.length, completedOrders: completed.length, totalAmountUSD: Math.round(totalAmountUSD * 100) / 100, currencyBreakdown: { INR: Math.round(currencyBreakdown.INR * 100) / 100, USD: Math.round(currencyBreakdown.USD * 100) / 100, NPR: Math.round(currencyBreakdown.NPR * 100) / 100 }, orders: completed.map((order: any) => ({ id: String(order._id?.$oid || order._id || ''), amount: order.total, currency: order.currency || 'INR', status: order.paymentStatus, transactionId: order.transactionId, createdAt: order.createdAt })) };
}
