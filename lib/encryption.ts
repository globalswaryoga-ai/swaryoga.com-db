// Encryption utility for secure credential storage
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-32-character-encryption-key';

// Ensure key is exactly 32 bytes
const getEncryptionKey = (): Buffer => {
  let key = ENCRYPTION_KEY;
  if (key.length < 32) {
    key = key.padEnd(32, '0');
  } else if (key.length > 32) {
    key = key.substring(0, 32);
  }
  return Buffer.from(key, 'utf-8');
};

/**
 * Encrypt sensitive data (tokens, secrets)
 */
export const encryptCredential = (credential: string): string => {
  try {
    const algorithm = 'aes-256-gcm';
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(credential, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // Combine iv + authTag + encrypted data
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt credential');
  }
};

/**
 * Decrypt sensitive data (tokens, secrets)
 */
export const decryptCredential = (encryptedData: string): string => {
  try {
    const algorithm = 'aes-256-gcm';
    const key = getEncryptionKey();
    const parts = encryptedData.split(':');

    // If not in iv:authTag:data format, the value was likely stored as plain text
    // (before encryption was introduced). Return as-is so callers still work.
    if (parts.length !== 3) {
      return encryptedData;
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');

    return decrypted;
  } catch (error) {
    // Wrong ENCRYPTION_KEY or corrupted data — return the raw value so callers
    // can still attempt to use it (e.g. plain-text token stored before encryption).
    console.error('Decryption error (returning raw value):', error);
    return encryptedData;
  }
};

/**
 * Safely mask credential for logging (show only first and last 4 chars)
 */
export const maskCredential = (credential: string): string => {
  if (credential.length <= 8) {
    return '****';
  }
  return `${credential.substring(0, 4)}...${credential.substring(credential.length - 4)}`;
};

const encryptionUtils = {
  encryptCredential,
  decryptCredential,
  maskCredential,
};

export default encryptionUtils;
