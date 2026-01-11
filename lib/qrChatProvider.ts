import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

export type QRChatEnv = {
  enabled: boolean;
  baseUrl: string;
  accessToken: string;
  instanceId?: string;
};

export function getQRChatEnv(): QRChatEnv | null {
  const enabled = String(process.env.QR_CHAT_ENABLED || '').toLowerCase() === 'true';
  const baseUrl = (process.env.QR_CHAT_BASE_URL || 'https://wa.waofficialapi.in').trim();
  const accessToken = (process.env.QR_CHAT_ACCESS_TOKEN || '').trim();
  const instanceId = (process.env.QR_CHAT_INSTANCE_ID || '').trim() || undefined;

  if (!enabled) return null;
  if (!accessToken) return null;

  return { enabled, baseUrl, accessToken, instanceId };
}

function buildUrl(baseUrl: string, path: string, params: Record<string, string | undefined>): string {
  const url = new URL(path, baseUrl);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    url.searchParams.set(k, v);
  }
  return url.toString();
}

async function postJson<T>(url: string, body?: any): Promise<T> {
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  } as any);

  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg = (data && (data.message || data.error)) ? String(data.message || data.error) : `HTTP ${res.status}`;
    throw new Error(`QR chat provider request failed: ${msg}`);
  }
  return data as T;
}

export async function qrCreateInstance(): Promise<any> {
  const env = getQRChatEnv();
  if (!env) throw new Error('QR chat is not enabled or missing credentials');

  const url = buildUrl(env.baseUrl, '/api/create_instance', {
    access_token: env.accessToken,
  });

  return postJson(url);
}

export async function qrGetQrCode(instanceId?: string): Promise<any> {
  const env = getQRChatEnv();
  if (!env) throw new Error('QR chat is not enabled or missing credentials');

  const id = instanceId || env.instanceId;
  if (!id) throw new Error('Missing QR chat instance id');

  const url = buildUrl(env.baseUrl, '/api/get_qrcode', {
    instance_id: id,
    access_token: env.accessToken,
  });

  return postJson(url);
}

export async function qrSetWebhook(webhookUrl: string, instanceId?: string, enable = true): Promise<any> {
  const env = getQRChatEnv();
  if (!env) throw new Error('QR chat is not enabled or missing credentials');

  const id = instanceId || env.instanceId;
  if (!id) throw new Error('Missing QR chat instance id');

  const url = buildUrl(env.baseUrl, '/api/set_webhook', {
    webhook_url: webhookUrl,
    enable: enable ? 'true' : 'false',
    instance_id: id,
    access_token: env.accessToken,
  });

  return postJson(url);
}

export async function qrSendText(numberRaw: string, message: string, instanceId?: string): Promise<any> {
  const env = getQRChatEnv();
  if (!env) throw new Error('QR chat is not enabled or missing credentials');

  const id = instanceId || env.instanceId;
  if (!id) throw new Error('Missing QR chat instance id');

  const number = String(numberRaw).replace(/\D/g, '');
  const url = buildUrl(env.baseUrl, '/api/send', {
    access_token: env.accessToken,
  });

  return postJson(url, {
    number,
    type: 'text',
    message,
    instance_id: id,
    access_token: env.accessToken,
  });
}

export async function qrSendMedia(numberRaw: string, message: string, mediaUrl: string, filename?: string, instanceId?: string): Promise<any> {
  const env = getQRChatEnv();
  if (!env) throw new Error('QR chat is not enabled or missing credentials');

  const id = instanceId || env.instanceId;
  if (!id) throw new Error('Missing QR chat instance id');

  const number = String(numberRaw).replace(/\D/g, '');
  const url = buildUrl(env.baseUrl, '/api/send', {
    access_token: env.accessToken,
  });

  return postJson(url, {
    number,
    type: 'media',
    message,
    media_url: mediaUrl,
    filename,
    instance_id: id,
    access_token: env.accessToken,
  });
}
