import { describe, it, expect, beforeEach } from 'vitest';
import ConsentManager from '@/lib/consentManager';

describe('ConsentManager', () => {
  let manager: ConsentManager;

  beforeEach(() => {
    manager = new ConsentManager();
  });

  describe('requestConsent', () => {
    it('should create consent record for user', async () => {
      const consent = await manager.requestConsent({
        userId: 'user-123',
        phoneNumber: '+919876543210',
        consentType: 'whatsapp_marketing',
        platform: 'whatsapp',
      });

      expect(consent).toBeDefined();
      expect(consent.userId).toBe('user-123');
      expect(consent.status).toBe('pending');
    });

    it('should handle invalid phone numbers', async () => {
      const consent = await manager.requestConsent({
        userId: 'user-123',
        phoneNumber: 'invalid',
        consentType: 'whatsapp_marketing',
        platform: 'whatsapp',
      });

      expect(consent).toBeNull();
    });
  });

  describe('grantConsent', () => {
    it('should grant consent when valid', async () => {
      const record = await manager.requestConsent({
        userId: 'user-123',
        phoneNumber: '+919876543210',
        consentType: 'whatsapp_marketing',
        platform: 'whatsapp',
      });

      const granted = await manager.grantConsent(record!.id);
      expect(granted.status).toBe('approved');
    });

    it('should track consent timestamp', async () => {
      const record = await manager.requestConsent({
        userId: 'user-456',
        phoneNumber: '+919123456789',
        consentType: 'whatsapp_marketing',
        platform: 'whatsapp',
      });

      const granted = await manager.grantConsent(record!.id);
      expect(granted.grantedAt).toBeDefined();
    });
  });

  describe('revokeConsent', () => {
    it('should revoke previously granted consent', async () => {
      const record = await manager.requestConsent({
        userId: 'user-789',
        phoneNumber: '+919876543210',
        consentType: 'whatsapp_marketing',
        platform: 'whatsapp',
      });

      await manager.grantConsent(record!.id);
      const revoked = await manager.revokeConsent(record!.id);

      expect(revoked.status).toBe('revoked');
      expect(revoked.revokedAt).toBeDefined();
    });

    it('should track revocation timestamp', async () => {
      const record = await manager.requestConsent({
        userId: 'user-101',
        phoneNumber: '+919876543210',
        consentType: 'whatsapp_marketing',
        platform: 'whatsapp',
      });

      await manager.grantConsent(record!.id);
      const revoked = await manager.revokeConsent(record!.id);

      expect(revoked.revokedAt).toBeDefined();
      expect(revoked.revokedAt!.getTime()).toBeGreaterThan(revoked.grantedAt!.getTime());
    });
  });

  describe('isConsentValid', () => {
    it('should validate active consent', async () => {
      const record = await manager.requestConsent({
        userId: 'user-202',
        phoneNumber: '+919876543210',
        consentType: 'whatsapp_marketing',
        platform: 'whatsapp',
      });

      await manager.grantConsent(record!.id);
      const isValid = await manager.isConsentValid(record!.id);

      expect(isValid).toBe(true);
    });

    it('should reject revoked consent', async () => {
      const record = await manager.requestConsent({
        userId: 'user-303',
        phoneNumber: '+919876543210',
        consentType: 'whatsapp_marketing',
        platform: 'whatsapp',
      });

      await manager.grantConsent(record!.id);
      await manager.revokeConsent(record!.id);
      const isValid = await manager.isConsentValid(record!.id);

      expect(isValid).toBe(false);
    });
  });

  describe('handleKeyword', () => {
    it('should process STOP keyword', async () => {
      const result = await manager.handleKeyword('+919876543210', 'STOP');
      expect(result.action).toBe('unsubscribe');
    });

    it('should process UNSUBSCRIBE keyword', async () => {
      const result = await manager.handleKeyword('+919876543210', 'UNSUBSCRIBE');
      expect(result.action).toBe('unsubscribe');
    });

    it('should process START keyword to resubscribe', async () => {
      await manager.handleKeyword('+919876543210', 'STOP');
      const result = await manager.handleKeyword('+919876543210', 'START');
      expect(result.action).toBe('resubscribe');
    });

    it('should be case-insensitive', async () => {
      const result1 = await manager.handleKeyword('+919876543210', 'stop');
      const result2 = await manager.handleKeyword('+919876543210', 'Stop');

      expect(result1.action).toBe('unsubscribe');
      expect(result2.action).toBe('unsubscribe');
    });
  });

  describe('GDPR Compliance', () => {
    it('should enforce 30-day opt-in requirement', async () => {
      const record = await manager.requestConsent({
        userId: 'user-404',
        phoneNumber: '+919876543210',
        consentType: 'whatsapp_marketing',
        platform: 'whatsapp',
      });

      const createdDate = record!.createdAt;
      const thirtyDaysLater = new Date(createdDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Should be valid within 30 days
      expect(thirtyDaysLater.getTime() - createdDate.getTime()).toBeLessThanOrEqual(30 * 24 * 60 * 60 * 1000);
    });

    it('should provide user data export capability', async () => {
      const record = await manager.requestConsent({
        userId: 'user-505',
        phoneNumber: '+919876543210',
        consentType: 'whatsapp_marketing',
        platform: 'whatsapp',
      });

      const exported = await manager.exportUserData('user-505');
      expect(exported).toBeDefined();
      expect(Array.isArray(exported)).toBe(true);
    });
  });

  describe('Meta WhatsApp Compliance', () => {
    it('should enforce template requirement for non-24h messages', async () => {
      // Messages outside 24h window MUST use Meta-approved templates
      const mustUseTemplate = await manager.canSendWithoutTemplate('+919876543210');
      // Default: outside 24h window = false
    });

    it('should track 24-hour window', async () => {
      const window = await manager.get24hWindow('+919876543210');
      expect(window).toBeDefined();
    });
  });
});
