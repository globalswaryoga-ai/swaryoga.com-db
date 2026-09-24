const DEFAULT_BRIDGE_URL = 'http://localhost:3333';
const DEFAULT_BRIDGE_SECRET = 'swar-bridge-secret-2024';
const ACTIVE_BRIDGE_URL = 'https://wa-bridge.swaryoga.com';
const RETIRED_BRIDGE_HOSTS = new Set([
  '43.205.230.246',
  '52.91.198.23',
  '13.62.126.213',
  '3.109.154.61',
  '13.51.112.100',
]);

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function normalizeBridgeUrl(value: string): string {
  const trimmed = trimTrailingSlash(value);
  try {
    const parsed = new URL(trimmed);
    if (RETIRED_BRIDGE_HOSTS.has(parsed.hostname)) {
      return ACTIVE_BRIDGE_URL;
    }
  } catch {
    // Preserve the existing value so the caller can report a useful URL error.
  }
  return trimmed;
}

export function getWhatsAppBridgeUrl(): string {
  return normalizeBridgeUrl(
    (
      process.env.WHATSAPP_BRIDGE_HTTP_URL ||
      process.env.WHATSAPP_BRIDGE_URL ||
      process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL ||
      process.env.BRIDGE_URL ||
      DEFAULT_BRIDGE_URL
    ).trim()
  );
}

export function getWhatsAppBridgeSecret(): string {
  return (
    process.env.WHATSAPP_BRIDGE_SECRET ||
    process.env.WHATSAPP_WEB_BRIDGE_SECRET ||
    process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET ||
    process.env.BRIDGE_SECRET ||
    DEFAULT_BRIDGE_SECRET
  ).trim();
}

export function getWhatsAppBridgeConfig() {
  return {
    url: getWhatsAppBridgeUrl(),
    secret: getWhatsAppBridgeSecret(),
  };
}
