import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditLogger } from '@/lib/auditLogger';

describe('AuditLogger', () => {
  describe('log', () => {
    it('should log an action successfully', async () => {
      const result = await AuditLogger.log({
        userId: 'user-123',
        actionType: 'CREATE_POST',
        resourceType: 'posts',
        resourceId: 'post-456',
    });

    it('should handle errors gracefully', async () => {
      const invalidLog = await logger.log({
        userId: '',
        action: 'INVALID_ACTION',
        resource: 'posts',
        resourceId: 'post-456',
      } as any);

      expect(invalidLog).toBeNull();
    });

    it('should log failed actions', async () => {
      const failLog = await logger.log({
        userId: 'user-123',
        action: 'DELETE_POST',
        resource: 'posts',
        resourceId: 'post-999',
        status: 'failed',
        error: 'Post not found',
      });

      expect(failLog?.status).toBe('failed');
      expect(failLog?.error).toBe('Post not found');
    });
  });

  describe('getUserLogs', () => {
    it('should retrieve user logs', async () => {
      // Create sample logs
      await logger.log({
        userId: 'user-123',
        action: 'LOGIN',
        resource: 'auth',
        resourceId: 'session-1',
        status: 'success',
      });

      const logs = await logger.getUserLogs('user-123');
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should return empty array for non-existent user', async () => {
      const logs = await logger.getUserLogs('non-existent-user');
      expect(Array.isArray(logs)).toBe(true);
    });
  });

  describe('getLogsByAction', () => {
    it('should filter logs by action', async () => {
      await logger.log({
        userId: 'user-123',
        action: 'CREATE_POST',
        resource: 'posts',
        resourceId: 'post-1',
        status: 'success',
      });

      await logger.log({
        userId: 'user-123',
        action: 'DELETE_POST',
        resource: 'posts',
        resourceId: 'post-2',
        status: 'success',
      });

      const logs = await logger.getLogsByAction('CREATE_POST');
      expect(logs.every((l) => l.action === 'CREATE_POST')).toBe(true);
    });
  });

  describe('getResourceLogs', () => {
    it('should retrieve logs for a specific resource', async () => {
      await logger.log({
        userId: 'user-123',
        action: 'VIEW_RESOURCE',
        resource: 'videos',
        resourceId: 'video-1',
        status: 'success',
      });

      const logs = await logger.getResourceLogs('videos', 'video-1');
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].resourceId).toBe('video-1');
    });
  });

  describe('exportLogs', () => {
    it('should export logs in CSV format', async () => {
      await logger.log({
        userId: 'user-123',
        action: 'TEST_ACTION',
        resource: 'test',
        resourceId: 'test-1',
        status: 'success',
      });

      const csv = await logger.exportLogs('user-123');
      expect(typeof csv).toBe('string');
      expect(csv).toContain('userId,action,resource');
    });
  });
});
