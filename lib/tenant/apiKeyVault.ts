/**
 * Multi-Tenant SaaS — Encrypted API Key Vault
 *
 * Stores per-tenant secrets (WhatsApp tokens, Cashfree keys, etc.) encrypted
 * at rest with AES-256-GCM. The encryption master key is derived from the
 * environment variable `TENANT_VAULT_KEY` (must be a 64-char hex string,
 * i.e. 32 bytes).
 *
 * Usage:
 *   await setTenantKey(tenantId, 'whatsapp_access_token', 'EAA...');
 *   const token = await getTenantKey(tenantId, 'whatsapp_access_token');
 */

import crypto from 'crypto';
import { getTenantApiKeyModel } from './tenantSchemas';

// ---------------------------------------------------------------------------
// Encryption config
// ---------------------------------------------------------------------------

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;       // GCM standard
const TAG_BYTES = 16;      // GCM auth tag

function getMasterKey(): Buffer {
  const hex = process.env.TENANT_VAULT_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'TENANT_VAULT_KEY must be set to a 64-character hex string (32 bytes). ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  return Buffer.from(hex, 'hex');
}

// ---------------------------------------------------------------------------
// Encrypt / Decrypt helpers
// ---------------------------------------------------------------------------

function encrypt(plaintext: string): { encryptedValue: string; iv: string; authTag: string } {
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encryptedValue: encrypted,
    iv: iv.toString('hex'),
    authTag,
  };
}

function decrypt(encryptedValue: string, ivHex: string, authTagHex: string): string {
  const key = getMasterKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedValue, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Store (or update) an encrypted secret for a tenant.
 */
export async function setTenantKey(
  tenantId: string,
  keyName: string,
  plaintext: string,
): Promise<void> {
  const TenantApiKey = getTenantApiKeyModel();
  const { encryptedValue, iv, authTag } = encrypt(plaintext);

  await TenantApiKey.findOneAndUpdate(
    { tenantId, keyName },
    { encryptedValue, iv, authTag },
    { upsert: true, new: true },
  );
}

/**
 * Retrieve and decrypt a secret for a tenant.
 * Returns `null` if the key does not exist.
 */
export async function getTenantKey(
  tenantId: string,
  keyName: string,
): Promise<string | null> {
  const TenantApiKey = getTenantApiKeyModel();
  const doc = await TenantApiKey.findOne({ tenantId, keyName }).lean();
  if (!doc) return null;
  const d = doc as any;
  return decrypt(d.encryptedValue, d.iv, d.authTag);
}

/**
 * Delete a secret for a tenant.
 */
export async function deleteTenantKey(
  tenantId: string,
  keyName: string,
): Promise<boolean> {
  const TenantApiKey = getTenantApiKeyModel();
  const result = await TenantApiKey.deleteOne({ tenantId, keyName });
  return result.deletedCount > 0;
}

/**
 * List all key names (NOT values) stored for a tenant.
 */
export async function listTenantKeyNames(tenantId: string): Promise<string[]> {
  const TenantApiKey = getTenantApiKeyModel();
  const docs = await TenantApiKey.find({ tenantId }).select('keyName').lean();
  return docs.map((d: any) => d.keyName);
}

/**
 * Retrieve multiple secrets at once (bulk decrypt).
 * Returns a Record of keyName → plaintext. Missing keys are omitted.
 */
export async function getTenantKeys(
  tenantId: string,
  keyNames: string[],
): Promise<Record<string, string>> {
  const TenantApiKey = getTenantApiKeyModel();
  const docs = await TenantApiKey.find({ tenantId, keyName: { $in: keyNames } }).lean();
  const result: Record<string, string> = {};
  for (const doc of docs as any[]) {
    try {
      result[doc.keyName] = decrypt(doc.encryptedValue, doc.iv, doc.authTag);
    } catch (err) {
      console.error(`[vault] Failed to decrypt key "${doc.keyName}" for tenant "${tenantId}":`, err);
    }
  }
  return result;
}
