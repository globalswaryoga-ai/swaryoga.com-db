const { MongoClient } = require('mongodb');
const crypto = require('crypto');

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hashValue(value) {
  if (!value) return '';
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
}

async function fetchJson(url, headers) {
  try {
    const response = await fetch(url, { headers });
    const json = await response.json().catch(() => ({}));
    return { status: response.status, json };
  } catch (error) {
    return { status: 0, json: { error: error.message } };
  }
}

(async () => {
  const bridgeUrl = ((process.env.WHATSAPP_BRIDGE_HTTP_URL || process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL || '')).replace(/\/$/, '');
  const bridgeSecret = process.env.WHATSAPP_BRIDGE_SECRET || process.env.WHATSAPP_WEB_BRIDGE_SECRET || process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET || '';
  const mongo = await MongoClient.connect(process.env.MONGODB_URI_MAIN);
  const db = mongo.db(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
  const users = ['admincrm', 'test1@swaryoga.com'];
  const results = [];

  for (const userId of users) {
    const settings = await db.collection('crm_user_settings').findOne(
      { userId },
      { projection: { userId: 1, permanentTenantId: 1, qrConnectedPhoneNumber: 1, qrPhoneChangedAt: 1 } }
    );

    const tenantId = settings?.permanentTenantId || '';
    const headers = {
      'x-bridge-secret': bridgeSecret,
      'x-user-id': userId,
      'x-session-key': tenantId,
      ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
    };

    const [statusRes, chatsRes, qrRes, sessionsRes] = await Promise.all([
      fetchJson(`${bridgeUrl}/status`, headers),
      fetchJson(`${bridgeUrl}/chats`, headers),
      fetchJson(`${bridgeUrl}/qr`, headers),
      fetchJson(`${bridgeUrl}/sessions`, headers),
    ]);

    const sessionsList = Array.isArray(sessionsRes.json?.sessions) ? sessionsRes.json.sessions : [];
    const matchedSession = sessionsList.find((session) => session.sessionKey === tenantId || session.userId === userId) || null;
    const chatArray = Array.isArray(chatsRes.json?.chats)
      ? chatsRes.json.chats
      : (Array.isArray(chatsRes.json) ? chatsRes.json : []);

    results.push({
      userId,
      tenantId,
      statusHttp: statusRes.status,
      chatsHttp: chatsRes.status,
      qrHttp: qrRes.status,
      connected: !!statusRes.json?.connected,
      livePhone: statusRes.json?.phone?.id || statusRes.json?.phone?.name || statusRes.json?.me?.id || statusRes.json?.phoneNumber || '',
      chatCount: chatArray.length,
      firstChats: chatArray.slice(0, 3).map((chat) => ({
        id: chat?.id || null,
        name: chat?.name || null,
        isGroup: !!chat?.isGroup,
      })),
      qr: {
        connected: !!qrRes.json?.connected,
        hasQr: !!qrRes.json?.qr,
        message: qrRes.json?.message || null,
        qrHash: hashValue(qrRes.json?.qr || qrRes.json?.qrString || ''),
      },
      sessionsTotal: sessionsList.length,
      allSessions: sessionsList.map((session) => ({
        userId: session.userId,
        sessionKey: session.sessionKey,
        tenantId: session.tenantId,
        status: session.status,
      })),
      sessionRecord: matchedSession,
      mongo: {
        storedPhone: settings?.qrConnectedPhoneNumber || '',
        phoneChangedAt: settings?.qrPhoneChangedAt || null,
        qrChats: await db.collection('qr_whatsapp_chats').countDocuments({ userId }),
        qrMessages: await db.collection('qr_whatsapp_messages').countDocuments({ userId }),
        authByTenant: tenantId
          ? await db.collection('baileys_auth_state').countDocuments({ key: { $regex: `^${escapeRegex(tenantId)}:` } })
          : 0,
        authByUser: await db.collection('baileys_auth_state').countDocuments({ key: { $regex: `^${escapeRegex(userId)}:` } }),
      },
    });
  }

  await mongo.close();
  console.log(JSON.stringify({ bridgeUrl, results }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
