import { getBunnyMetaCredentialsByPhoneNumberId, getBunnyMetaCredentialsForTenant } from '@/lib/bunnyWhatsAppAccounts';

// Credentials for a single Meta WhatsApp Business number — either a
// tenant's own connected WhatsAppAccount, or (when null is returned by the
// resolvers below) the caller should fall back to the global env-based
// getWhatsAppEnv() for the legacy/default number.
export type WhatsAppCredentials = {
  accessToken: string;
  phoneNumberId: string;
  phoneNumber: string;
  appSecret?: string;
  wabaId?: string;
};

// Resolve a tenant's own connected Meta WhatsApp account (for outbound
// sends — broadcasts, chatbot replies). Returns null if the tenant hasn't
// connected their own number, so callers fall back to the shared default.
export async function getMetaCredentialsForTenant(tenantUserId: string): Promise<WhatsAppCredentials | null> {
  if (!tenantUserId) return null;
  return getBunnyMetaCredentialsForTenant(tenantUserId);
}

// Resolve which tenant owns the Meta phone_number_id that received an
// inbound webhook message. Returns null for the legacy/default number
// (no matching WhatsAppAccount row) — callers keep current global-env
// behavior in that case.
export async function getMetaCredentialsByPhoneNumberId(
  phoneNumberId: string
): Promise<{ tenantUserId: string; creds: WhatsAppCredentials } | null> {
  if (!phoneNumberId) return null;
  return getBunnyMetaCredentialsByPhoneNumberId(phoneNumberId);
}
