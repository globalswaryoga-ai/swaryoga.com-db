import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditLogger } from '@/lib/auditLogger';

const mockConnectDB = vi.fn(async () => undefined);
const mockCreate = vi.fn(async () => undefined);

function mockQueryChain(result: any[] = []) {
  return {
    sort: vi.fn(() => mockQueryChain(result)),
    limit: vi.fn(() => mockQueryChain(result)),
    skip: vi.fn(() => mockQueryChain(result)),
    select: vi.fn(() => mockQueryChain(result)),
    lean: vi.fn(async () => result),
  } as any;
}

const mockFind = vi.fn(() => mockQueryChain([]));

vi.mock('@/lib/db', () => ({
  connectDB: () => mockConnectDB(),
}));

vi.mock('@/lib/schemas/enterpriseSchemas', () => ({
  AuditLog: {
    create: (...args: any[]) => (mockCreate as any)(...args),
    find: (...args: any[]) => (mockFind as any)(...args),
  },
}));

describe('AuditLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('log', () => {
    it('should attempt to create an audit log entry', async () => {
      await expect(
        AuditLogger.log({
          userId: 'user-123',
          actionType: 'CREATE_POST',
          resourceType: 'posts',
          resourceId: 'post-456',
          status: 'success',
        })
      ).resolves.toBeUndefined();

      expect(mockConnectDB).toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should not throw even if create fails', async () => {
      mockCreate.mockRejectedValueOnce(new Error('DB down'));

      await expect(
        AuditLogger.log({
          userId: 'user-123',
          actionType: 'TEST',
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('getUserLogs', () => {
    it('should query user logs', async () => {
      mockFind.mockReturnValueOnce(mockQueryChain([{ userId: 'user-123' }]));

      const logs = await AuditLogger.getUserLogs('user-123');
      expect(Array.isArray(logs)).toBe(true);
      expect(mockFind).toHaveBeenCalledWith({ userId: 'user-123' });
    });
  });

  describe('getLogsByAction', () => {
    it('should query logs by action type', async () => {
      await AuditLogger.getLogsByAction('CREATE_POST');
      expect(mockFind).toHaveBeenCalledWith({ actionType: 'CREATE_POST' });
    });
  });

  describe('getResourceLogs', () => {
    it('should query logs for a resource', async () => {
      await AuditLogger.getResourceLogs('posts', 'post-1');
      expect(mockFind).toHaveBeenCalledWith({ resourceType: 'posts', resourceId: 'post-1' });
    });
  });

  describe('exportLogs', () => {
    it('should export logs as an array', async () => {
      mockFind.mockReturnValueOnce(mockQueryChain([{ userId: 'user-123', actionType: 'TEST' }]));
      const rows = await AuditLogger.exportLogs({ userId: 'user-123' });
      expect(Array.isArray(rows)).toBe(true);
    });
  });
});
