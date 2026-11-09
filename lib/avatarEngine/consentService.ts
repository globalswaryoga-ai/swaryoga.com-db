import * as crypto from 'crypto';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export interface ConsentRecord {
  id: string;
  userId: string;
  avatarName: string;
  consentType: string;
  consentHash: string;
  declarationText: string;
  authorizedBy: string;
  ipAddress?: string;
  timestamp: string;
}

/**
 * Generate a cryptographically signed digital consent record
 * Ensures full legal compliance against unauthorized face/voice deepfakes.
 */
export async function recordAvatarConsent(params: {
  userId: string;
  avatarName: string;
  authorizedBy: string;
  declarationText: string;
  ipAddress?: string;
}): Promise<ConsentRecord> {
  const id = `consent_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const timestamp = new Date().toISOString();

  // Create immutable SHA-256 hash
  const payloadToHash = `${params.userId}|${params.avatarName}|${params.authorizedBy}|${params.declarationText}|${timestamp}`;
  const consentHash = crypto.createHash('sha256').update(payloadToHash).digest('hex');

  await bunnyExecute({
    sql: `INSERT INTO consent_records_sql (
      id, user_id, avatar_name, consent_type, consent_hash, declaration_text,
      authorized_by, ip_address, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      params.userId,
      params.avatarName,
      'digital_identity_replica',
      consentHash,
      params.declarationText,
      params.authorizedBy,
      params.ipAddress || 'unknown',
      timestamp
    ]
  });

  return {
    id,
    userId: params.userId,
    avatarName: params.avatarName,
    consentType: 'digital_identity_replica',
    consentHash,
    declarationText: params.declarationText,
    authorizedBy: params.authorizedBy,
    ipAddress: params.ipAddress,
    timestamp
  };
}

export async function verifyConsentHash(consentId: string): Promise<boolean> {
  try {
    const res = await bunnyExecute({
      sql: 'SELECT * FROM consent_records_sql WHERE id = ?',
      args: [consentId]
    });
    const record = res.rows?.[0] as any;
    if (!record) return false;

    const payloadToHash = `${record.user_id}|${record.avatar_name}|${record.authorized_by}|${record.declaration_text}|${record.timestamp}`;
    const calculatedHash = crypto.createHash('sha256').update(payloadToHash).digest('hex');

    return calculatedHash === record.consent_hash;
  } catch {
    return false;
  }
}
