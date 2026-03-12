const DEFAULT_BRIDGE_URL = 'http://localhost:3333';
const DEFAULT_BRIDGE_SECRET = 'swar-bridge-secret-2024';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function getWhatsAppBridgeUrl(): string {
  return trimTrailingSlash(
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
