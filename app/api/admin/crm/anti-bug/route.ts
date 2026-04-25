import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { apiError, apiSuccess } from '@/lib/api-error';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { connectDB } from '@/lib/db';
import { checkBridgeHealth, validateBridgeUrl } from '@/lib/bridge-health';
import { getErrorStats, getRecentErrors } from '@/lib/error-logger';
import { getCRMUserSettings, getQrWhatsAppChat, getQrWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

const SUPER_ADMIN_IDS = new Set(['admin', 'admincrm']);

type BridgeEndpointStatus = {
  path: string;
  status: number | null;
  ok: boolean;
  message: string;
  timeMs: number;
};

async function checkMongo() {
  const start = Date.now();
  try {
    await connectDB();
    await mongoose.connection.db?.admin().ping();
    return { ok: true, latencyMs: Date.now() - start };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'MongoDB ping failed',
    };
  }
}

async function checkBridgeEndpoint(
  bridgeUrl: string,
  bridgeSecret: string,
  endpoint: string,
  timeout = 5000
): Promise<BridgeEndpointStatus> {
  const started = Date.now();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${bridgeUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'x-bridge-secret': bridgeSecret,
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'SwarYoga-AntiBug/1.0',
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    return {
      path: endpoint,
      status: response.status,
      ok: response.ok || response.status === 400,
      message: response.ok ? 'OK' : response.status === 400 ? 'Endpoint exists (400)' : `HTTP ${response.status}`,
      timeMs: Date.now() - started,
    };
  } catch (error) {
    return {
      path: endpoint,
      status: null,
      ok: false,
      message: error instanceof Error ? error.message : 'Bridge request failed',
      timeMs: Date.now() - started,
    };
  }
}

async function getQrSettingsStats() {
  await connectDB();

  const CRMUserSettings = getCRMUserSettings();
  const QrWhatsAppChat = getQrWhatsAppChat();
  const QrWhatsAppMessage = getQrWhatsAppMessage();

  const [settings, chatCount, messageCount, distinctConnectedPhones] = await Promise.all([
    CRMUserSettings.find({}, {
      userId: 1,
      qrBridgeUrl: 1,
      qrBridgeSecret: 1,
      qrWhatsappEnabled: 1,
      permanentTenantId: 1,
      qrConnectedPhoneNumber: 1,
    }).lean(),
    QrWhatsAppChat.countDocuments({}),
    QrWhatsAppMessage.countDocuments({}),
    QrWhatsAppChat.distinct('connectedPhone', { connectedPhone: { $nin: ['', null] } }),
  ]);

  const ownBridgeCount = settings.filter((item: any) => item.qrBridgeUrl || item.permanentTenantId).length;
  const sharedEnabledCount = settings.filter((item: any) => item.qrWhatsappEnabled).length;
  const connectedPhoneCount = settings.filter((item: any) => item.qrConnectedPhoneNumber).length;
  const permanentTenantCount = settings.filter((item: any) => item.permanentTenantId).length;
  const missingSecretCount = settings.filter((item: any) => (item.qrBridgeUrl || item.permanentTenantId || item.qrWhatsappEnabled) && !item.qrBridgeSecret).length;
  const sharedWithoutBridgeCount = settings.filter((item: any) => item.qrWhatsappEnabled && !item.qrBridgeUrl && !item.permanentTenantId).length;

  return {
    totalSettingsDocs: settings.length,
    ownBridgeCount,
    sharedEnabledCount,
    connectedPhoneCount,
    permanentTenantCount,
    missingSecretCount,
    sharedWithoutBridgeCount,
    totalSessionChats: chatCount,
    totalSessionMessages: messageCount,
    uniqueConnectedPhones: distinctConnectedPhones.length,
  };
}

async function getProvisioningStats() {
  await connectDB();

  const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

  const [adminUsers, settingsDocs, compartmentDocs, tenantDocs, crmTenantDocs, tenantSetupDocs] = await Promise.all([
    crmDb.collection('admin_users').find(
      { isAdmin: true },
      { projection: { userId: 1, email: 1, tenantSlug: 1 } }
    ).toArray(),
    crmDb.collection('crm_user_settings').find({}, { projection: { userId: 1, permanentTenantId: 1, qrBridgeSecret: 1 } }).toArray(),
    crmDb.collection('user_compartments').find({}, { projection: { userId: 1, compartmentId: 1 } }).toArray(),
    crmDb.collection('tenants').find({}, { projection: { slug: 1 } }).toArray(),
    crmDb.collection('crm_tenants').find({}, { projection: { slug: 1 } }).toArray(),
    crmDb.collection('tenant_setup').find({}, { projection: { tenantSlug: 1 } }).toArray(),
  ]);

  const settingsMap = new Map(settingsDocs.map((doc: any) => [doc.userId, doc]));
  const compartmentSet = new Set(compartmentDocs.map((doc: any) => doc.userId));
  const tenantSet = new Set(tenantDocs.map((doc: any) => doc.slug).filter(Boolean));
  const crmTenantSet = new Set(crmTenantDocs.map((doc: any) => doc.slug).filter(Boolean));
  const tenantSetupSet = new Set(tenantSetupDocs.map((doc: any) => doc.tenantSlug).filter(Boolean));

  const missingSettingsUsers: string[] = [];
  const missingTenantSlugUsers: string[] = [];
  const missingPermanentIdUsers: string[] = [];
  const missingSecretUsers: string[] = [];
  const missingCompartmentUsers: string[] = [];
  const missingTenantSlugs: string[] = [];
  const missingCrmTenantSlugs: string[] = [];
  const missingTenantSetupSlugs: string[] = [];

  for (const user of adminUsers as any[]) {
    const id = user.userId || user.email;
    if (SUPER_ADMIN_IDS.has(id)) continue;
    const tenantSlug = user.tenantSlug;
    const settings = settingsMap.get(id);

    if (!tenantSlug && id !== 'admin' && id !== 'admincrm') missingTenantSlugUsers.push(id);
    if (!settings) missingSettingsUsers.push(id);
    if (!settings?.permanentTenantId) missingPermanentIdUsers.push(id);
    if (!settings?.qrBridgeSecret) missingSecretUsers.push(id);
    if (!compartmentSet.has(id)) missingCompartmentUsers.push(id);
    if (tenantSlug && !tenantSet.has(tenantSlug)) missingTenantSlugs.push(tenantSlug);
    if (tenantSlug && !crmTenantSet.has(tenantSlug)) missingCrmTenantSlugs.push(tenantSlug);
    if (tenantSlug && !tenantSetupSet.has(tenantSlug)) missingTenantSetupSlugs.push(tenantSlug);
  }

  return {
    totalAdminUsers: adminUsers.filter((user: any) => !SUPER_ADMIN_IDS.has(user.userId || user.email)).length,
    missingSettingsCount: missingSettingsUsers.length,
    missingTenantSlugCount: missingTenantSlugUsers.length,
    missingPermanentIdCount: missingPermanentIdUsers.length,
    missingSecretCount: missingSecretUsers.length,
    missingCompartmentCount: missingCompartmentUsers.length,
    missingTenantCount: missingTenantSlugs.length,
    missingCrmTenantCount: missingCrmTenantSlugs.length,
    missingTenantSetupCount: missingTenantSetupSlugs.length,
    sampleMissingSettingsUsers: missingSettingsUsers.slice(0, 10),
    sampleMissingTenantSlugUsers: missingTenantSlugUsers.slice(0, 10),
    sampleMissingPermanentIdUsers: missingPermanentIdUsers.slice(0, 10),
    sampleMissingCompartmentUsers: missingCompartmentUsers.slice(0, 10),
    sampleMissingCrmTenantSlugs: missingCrmTenantSlugs.slice(0, 10),
    sampleMissingTenantSetupSlugs: missingTenantSetupSlugs.slice(0, 10),
  };
}

function buildRecommendations(input: {
  mongoOk: boolean;
  bridgeOk: boolean;
  bridgeUrlValid: boolean;
  bridgeUrlError?: string;
  critical24h: number;
  qrErrors24h: number;
  missingSecretCount: number;
  sharedWithoutBridgeCount: number;
  provisioningGapCount: number;
}) {
  const recommendations: string[] = [];

  if (!input.mongoOk) {
    recommendations.push('MongoDB health is degraded. Check Atlas connectivity and database latency immediately.');
  }

  if (!input.bridgeUrlValid) {
    recommendations.push(`Bridge URL configuration looks invalid: ${input.bridgeUrlError || 'Unknown validation error'}.`);
  }

  if (!input.bridgeOk) {
    recommendations.push('WhatsApp bridge is unhealthy. Inspect bridge service, secret, and network reachability.');
  }

  if (input.critical24h > 0) {
    recommendations.push(`There are ${input.critical24h} critical errors in the last 24 hours. Review Error Logs before changing production settings.`);
  }

  if (input.qrErrors24h > 10) {
    recommendations.push(`QR and bridge errors are elevated (${input.qrErrors24h} in 24h). Run the Anti-Bug smoke script and re-check the QR inbox.`);
  }

  if (input.missingSecretCount > 0) {
    recommendations.push(`${input.missingSecretCount} QR-enabled users appear to be missing bridge secrets. Re-provision or repair their bridge configuration.`);
  }

  if (input.sharedWithoutBridgeCount > 0) {
    recommendations.push(`${input.sharedWithoutBridgeCount} shared QR users rely on shared/fallback routing. Double-check privacy filters and access controls for those users.`);
  }

  if (input.provisioningGapCount > 0) {
    recommendations.push(`${input.provisioningGapCount} CRM tenant provisioning gaps were detected. Run the signup provisioning verification script and repair any missing settings/compartment/setup docs.`);
  }

  if (recommendations.length === 0) {
    recommendations.push('No major anti-bug warnings detected. System looks healthy — still keep an eye on fresh QR errors after deploys.');
  }

  return recommendations;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const decoded = verifyToken(authHeader);

    if (!decoded?.isAdmin) {
      return apiError('UNAUTHORIZED', 'Admin access required');
    }

    if (!isSuperAdmin(decoded)) {
      return apiError('FORBIDDEN', 'Super Admin access required');
    }

    const bridgeUrl =
      process.env.WHATSAPP_BRIDGE_HTTP_URL ||
      process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL ||
      process.env.WHATSAPP_BRIDGE_URL ||
      '';
    const bridgeSecret =
      process.env.WHATSAPP_BRIDGE_SECRET ||
      process.env.WHATSAPP_WEB_BRIDGE_SECRET ||
      'swar-bridge-secret-2024';

    const bridgeUrlValidation = validateBridgeUrl(bridgeUrl);
    const hours = Math.min(Math.max(Number(request.nextUrl.searchParams.get('hours') || '24'), 1), 168);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [mongo, bridge, endpointChecks, stats1h, stats24h, recentQrErrors, qrStats, provisioningStats] = await Promise.all([
      checkMongo(),
      bridgeUrlValidation.valid ? checkBridgeHealth(bridgeUrl, bridgeSecret) : Promise.resolve({ ok: false, status: 0, message: bridgeUrlValidation.error || 'Invalid bridge URL', connected: false, endpoints: {} }),
      bridgeUrlValidation.valid
        ? Promise.all([
            checkBridgeEndpoint(bridgeUrl, bridgeSecret, '/status'),
            checkBridgeEndpoint(bridgeUrl, bridgeSecret, '/chats'),
            checkBridgeEndpoint(bridgeUrl, bridgeSecret, '/qr'),
            checkBridgeEndpoint(bridgeUrl, bridgeSecret, '/messages/all'),
          ])
        : Promise.resolve([]),
      getErrorStats(new Date(Date.now() - 60 * 60 * 1000)),
      getErrorStats(new Date(Date.now() - 24 * 60 * 60 * 1000)),
      getRecentErrors({
        limit: 20,
        source: 'qr|bridge|whatsapp',
        since,
      }),
      getQrSettingsStats(),
      getProvisioningStats(),
    ]);

    const endpointMap = Object.fromEntries(endpointChecks.map((item) => [item.path, item]));
    const recentCriticalQrErrors = recentQrErrors.filter((item) => item.level === 'critical').length;
    const provisioningGapCount =
      provisioningStats.missingTenantSlugCount +
      provisioningStats.missingSettingsCount +
      provisioningStats.missingPermanentIdCount +
      provisioningStats.missingCompartmentCount +
      provisioningStats.missingCrmTenantCount +
      provisioningStats.missingTenantSetupCount;
    const overallStatus = !mongo.ok || !bridge.ok
      ? 'critical'
      : stats24h.critical > 0 || recentCriticalQrErrors > 0 || qrStats.missingSecretCount > 0 || provisioningGapCount > 0
      ? 'warning'
      : 'healthy';

    const recommendations = buildRecommendations({
      mongoOk: mongo.ok,
      bridgeOk: bridge.ok,
      bridgeUrlValid: bridgeUrlValidation.valid,
      bridgeUrlError: bridgeUrlValidation.error,
      critical24h: stats24h.critical,
      qrErrors24h: recentQrErrors.length,
      missingSecretCount: qrStats.missingSecretCount,
      sharedWithoutBridgeCount: qrStats.sharedWithoutBridgeCount,
      provisioningGapCount,
    });

    return apiSuccess({
      status: overallStatus,
      generatedAt: new Date().toISOString(),
      windowHours: hours,
      checks: {
        mongodb: mongo,
        bridge: {
          ok: bridge.ok,
          status: bridge.status,
          message: bridge.message,
          connected: bridge.connected,
          url: bridgeUrl,
          urlValid: bridgeUrlValidation.valid,
          urlError: bridgeUrlValidation.error,
          endpoints: endpointMap,
        },
        config: {
          hasMongoUri: !!(process.env.MONGODB_URI || process.env.MONGODB_URI_MAIN),
          hasJwtSecret: !!process.env.JWT_SECRET,
          hasBridgeUrl: !!bridgeUrl,
          hasBridgeSecret: !!bridgeSecret,
          hasWhatsAppToken: !!process.env.WHATSAPP_ACCESS_TOKEN,
        },
      },
      errorStats: {
        last1h: stats1h,
        last24h: stats24h,
        qrRecentCount: recentQrErrors.length,
        qrCriticalCount: recentCriticalQrErrors,
      },
      qrStats,
      provisioningStats,
      recommendations,
      recentQrErrors: recentQrErrors.map((item: any) => ({
        _id: String(item._id || ''),
        timestamp: item.timestamp,
        level: item.level,
        source: item.source,
        message: item.message,
        path: item.path,
        method: item.method,
        userId: item.userId,
      })),
    });
  } catch (error) {
    return apiError('SERVER_ERROR', 'Failed to build anti-bug report', error instanceof Error ? error.message : 'Unknown anti-bug error');
  }
}