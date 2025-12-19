import { describe, it, expect, beforeEach, vi } from 'vitest';
import RateLimitManager from '@/lib/rateLimitManager';

describe('RateLimitManager', () => {
  let manager: RateLimitManager;

  beforeEach(() => {
    manager = new RateLimitManager();
    vi.useFakeTimers();
  });

  describe('checkLimit', () => {
    it('should allow requests within limit', async () => {
      const allowed = await manager.checkLimit('user-123', 'messages');
      expect(allowed).toBe(true);
    });

    it('should enforce hourly limit (1000 messages)', async () => {
      for (let i = 0; i < 1000; i++) {
        await manager.checkLimit('user-456', 'messages');
      }

      const blocked = await manager.checkLimit('user-456', 'messages');
      expect(blocked).toBe(false);
    });

    it('should enforce daily limit (10000 messages)', async () => {
      // Simulate 10000 messages
      for (let i = 0; i < 10000; i++) {
        await manager.checkLimit('user-789', 'messages');
      }

      const blocked = await manager.checkLimit('user-789', 'messages');
      expect(blocked).toBe(false);
    });

    it('should enforce per-phone limit (5 messages/day)', async () => {
      for (let i = 0; i < 5; i++) {
        await manager.checkLimit('user-101', 'messages_to_+919876543210');
      }

      const blocked = await manager.checkLimit('user-101', 'messages_to_+919876543210');
      expect(blocked).toBe(false);
    });
  });

  describe('getRetryAfter', () => {
    it('should return retry time for rate-limited requests', async () => {
      for (let i = 0; i < 1000; i++) {
        await manager.checkLimit('user-202', 'messages');
      }

      const retryAfter = await manager.getRetryAfter('user-202', 'messages');
      expect(retryAfter).toBeGreaterThan(0);
    });

    it('should have realistic retry times', async () => {
      for (let i = 0; i < 500; i++) {
        await manager.checkLimit('user-303', 'messages');
      }

      const retryAfter = await manager.getRetryAfter('user-303', 'messages');
      // Should be less than 1 hour
      expect(retryAfter).toBeLessThanOrEqual(3600);
    });
  });

  describe('reset', () => {
    it('should reset rate limits for user', async () => {
      for (let i = 0; i < 500; i++) {
        await manager.checkLimit('user-404', 'messages');
      }

      let blocked = await manager.checkLimit('user-404', 'messages');
      expect(blocked).toBe(true); // Assuming 500 is enough to block

      await manager.reset('user-404', 'messages');

      const allowed = await manager.checkLimit('user-404', 'messages');
      expect(allowed).toBe(true);
    });

    it('should reset specific limit type', async () => {
      for (let i = 0; i < 500; i++) {
        await manager.checkLimit('user-505', 'messages');
      }

      await manager.reset('user-505', 'messages');
      const allowed = await manager.checkLimit('user-505', 'messages');
      expect(allowed).toBe(true);
    });
  });

  describe('Exponential Backoff', () => {
    it('should calculate exponential backoff', async () => {
      const backoff1 = await manager.getExponentialBackoff(1);
      const backoff2 = await manager.getExponentialBackoff(2);
      const backoff3 = await manager.getExponentialBackoff(3);

      expect(backoff2).toBeGreaterThan(backoff1);
      expect(backoff3).toBeGreaterThan(backoff2);
    });

    it('should have maximum backoff cap', async () => {
      const backoff10 = await manager.getExponentialBackoff(10);
      const maxBackoff = 5 * 60; // 5 minutes max

      expect(backoff10).toBeLessThanOrEqual(maxBackoff);
    });
  });

  describe('Warning Alerts', () => {
    it('should alert at 80% capacity', async () => {
      const limit = 1000;
      const warningThreshold = 800;

      for (let i = 0; i < warningThreshold - 1; i++) {
        await manager.checkLimit('user-606', 'messages');
      }

      const warning = await manager.checkLimit('user-606', 'messages');
      // Should return true but may include warning flag
      expect(warning).toBeDefined();
    });

    it('should track usage percentage', async () => {
      for (let i = 0; i < 500; i++) {
        await manager.checkLimit('user-707', 'messages');
      }

      const usage = await manager.getUsagePercentage('user-707', 'messages');
      expect(usage).toBeGreaterThan(0);
      expect(usage).toBeLessThanOrEqual(100);
    });
  });

  describe('Multi-limit Scenarios', () => {
    it('should track multiple limits independently', async () => {
      // Different limit types
      for (let i = 0; i < 500; i++) {
        await manager.checkLimit('user-808', 'messages');
      }

      // Other limit type should not be affected
      const otherAllowed = await manager.checkLimit('user-808', 'api_calls');
      expect(otherAllowed).toBe(true);
    });

    it('should handle per-phone limits separately', async () => {
      for (let i = 0; i < 5; i++) {
        await manager.checkLimit('user-909', 'messages_to_+919876543210');
      }

      // Different phone should not be affected
      const otherPhone = await manager.checkLimit('user-909', 'messages_to_+919876543211');
      expect(otherPhone).toBe(true);
    });
  });

  describe('Limit Tiers', () => {
    it('should support different plan tiers', async () => {
      // Assuming free tier = 100/day
      // Pro tier = 1000/day

      const freeTierLimit = await manager.getLimit('free', 'messages');
      const proTierLimit = await manager.getLimit('pro', 'messages');

      expect(proTierLimit).toBeGreaterThan(freeTierLimit);
    });
  });

  describe('Auto-reset', () => {
    it('should auto-reset hourly limits', async () => {
      for (let i = 0; i < 500; i++) {
        await manager.checkLimit('user-1010', 'messages');
      }

      // Advance time by 1 hour
      vi.advanceTimersByTime(60 * 60 * 1000 + 1);

      const allowed = await manager.checkLimit('user-1010', 'messages');
      expect(allowed).toBe(true);
    });

    it('should auto-reset daily limits', async () => {
      for (let i = 0; i < 5000; i++) {
        await manager.checkLimit('user-1111', 'messages');
      }

      // Advance time by 24 hours
      vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);

      const allowed = await manager.checkLimit('user-1111', 'messages');
      expect(allowed).toBe(true);
    });
  });
});
