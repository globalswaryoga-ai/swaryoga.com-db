/**
 * Multi-Tenant SaaS — Encrypted API Key Vault (Pure BunnyDB: crm_tenant_api_keys_sql)
 *
 * Stores per-tenant secrets (WhatsApp tokens, Cashfree keys, etc.) encrypted
 * at rest with AES-256-GCM. The encryption master key is derived from the
 * environment variable `TENANT_VAULT_KEY` (must be a 64-char hex string,
 * i.e. 32 bytes).
 */

import crypto from 'crypto';
import { bunnyExecute } from '@/lib/bunnyDatabase';

// ---------------------------------------------------------------------------
// Encryption config
// ---------------------------------------------------------------------------

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;       // GCM standard
const TAG_BYTES = 16;      // GCM auth tag

function getMasterKey(): Buffer {
  const hex = process.env.TENANT_VAULT_KEY;
  if (!hex || hex.length !== 64) {
    // If not set, derive a fallback key from JWT secret or random persistent buffer
    const secret = process.env.JWT_SECRET || 'swaryoga-secure-tenant-vault-key-32bytes!';
    return crypto.createHash('sha256').update(secret).digest();
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
// Public API (Pure BunnyDB)
// ---------------------------------------------------------------------------

/**
 * Store (or update) an encrypted secret for a tenant.
 */
export async function setTenantKey(
  tenantId: string,
  keyName: string,
  plaintext: string,
): Promise<void> {
  const { encryptedValue, iv, authTag } = encrypt(plaintext);
  const id = crypto.randomBytes(12).toString('hex');

  await bunnyExecute({
    sql: `
      INSERT INTO crm_tenant_api_keys_sql (id, tenant_id, key_name, encrypted_value, iv, auth_tag, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(tenant_id, key_name) DO UPDATE SET
        encrypted_value = excluded.encrypted_value,
        iv = excluded.iv,
        auth_tag = excluded.auth_tag,
        updated_at = CURRENT_TIMESTAMP
    `,
    args: [id, tenantId, keyName, encryptedValue, iv, authTag],
  });
}

/**
 * Retrieve and decrypt a secret for a tenant.
 * Returns `null` if the key does not exist.
 */
export async function getTenantKey(
  tenantId: string,
  keyName: string,
): Promise<string | null> {
  const res = await bunnyExecute({
    sql: 'SELECT encrypted_value, iv, auth_tag FROM crm_tenant_api_keys_sql WHERE tenant_id = ? AND key_name = ? LIMIT 1',
    args: [tenantId, keyName],
  });

  if (!res.rows.length) return null;
  const d = res.rows[0];
  return decrypt(String(d.encrypted_value), String(d.iv), String(d.auth_tag));
}

/**
 * Delete a secret for a tenant.
 */
export async function deleteTenantKey(
  tenantId: string,
  keyName: string,
): Promise<boolean> {
  const result = await bunnyExecute({
    sql: 'DELETE FROM crm_tenant_api_keys_sql WHERE tenant_id = ? AND key_name = ?',
    args: [tenantId, keyName],
  });
  return Number(result.rowsAffected || 0) > 0;
}

/**
 * List all key names (NOT values) stored for a tenant.
 */
export async function listTenantKeyNames(tenantId: string): Promise<string[]> {
  const res = await bunnyExecute({
    sql: 'SELECT key_name FROM crm_tenant_api_keys_sql WHERE tenant_id = ?',
    args: [tenantId],
  });
  return res.rows.map((r: any) => String(r.key_name));
}

/**
 * Retrieve multiple secrets at once (bulk decrypt).
 * Returns a Record of keyName → plaintext. Missing keys are omitted.
 */
export async function getTenantKeys(
  tenantId: string,
  keyNames: string[],
): Promise<Record<string, string>> {
  if (!keyNames.length) return {};
  const placeholders = keyNames.map(() => '?').join(', ');
  const res = await bunnyExecute({
    sql: `SELECT key_name, encrypted_value, iv, auth_tag FROM crm_tenant_api_keys_sql WHERE tenant_id = ? AND key_name IN (${placeholders})`,
    args: [tenantId, ...keyNames],
  });

  const result: Record<string, string> = {};
  for (const doc of res.rows as any[]) {
    try {
      result[doc.key_name] = decrypt(String(doc.encrypted_value), String(doc.iv), String(doc.auth_tag));
    } catch (err) {
      console.error(`[vault] Failed to decrypt key "${doc.key_name}" for tenant "${tenantId}":`, err);
    }
  }
  return result;
}
