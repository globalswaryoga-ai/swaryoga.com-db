import { describe, it, expect, beforeEach } from 'vitest';
import PermissionManager from '@/lib/permissionManager';

describe('PermissionManager', () => {
  let manager: PermissionManager;

  beforeEach(() => {
    manager = new PermissionManager();
  });

  describe('checkPermission', () => {
    it('should grant admin all permissions', () => {
      const hasPermission = manager.checkPermission('admin', 'send_messages');
      expect(hasPermission).toBe(true);
    });

    it('should grant manager specific permissions', () => {
      expect(manager.checkPermission('manager', 'send_messages')).toBe(true);
      expect(manager.checkPermission('manager', 'view_analytics')).toBe(true);
      expect(manager.checkPermission('manager', 'delete_user')).toBe(false);
    });

    it('should grant team_lead permissions', () => {
      expect(manager.checkPermission('team_lead', 'send_messages')).toBe(true);
      expect(manager.checkPermission('team_lead', 'view_team_reports')).toBe(true);
      expect(manager.checkPermission('team_lead', 'view_analytics')).toBe(false);
    });

    it('should grant sales_rep permissions', () => {
      expect(manager.checkPermission('sales_rep', 'send_messages')).toBe(true);
      expect(manager.checkPermission('sales_rep', 'create_contact')).toBe(true);
      expect(manager.checkPermission('sales_rep', 'delete_user')).toBe(false);
    });

    it('should grant operator permissions', () => {
      expect(manager.checkPermission('operator', 'send_messages')).toBe(true);
      expect(manager.checkPermission('operator', 'view_contacts')).toBe(true);
    });

    it('should grant viewer read-only permissions', () => {
      expect(manager.checkPermission('viewer', 'view_contacts')).toBe(true);
      expect(manager.checkPermission('viewer', 'send_messages')).toBe(false);
    });
  });

  describe('assignPermissions', () => {
    it('should assign custom permissions to user', () => {
      manager.assignPermissions('user-123', ['send_messages', 'view_contacts']);
      const has = manager.checkPermission('custom:user-123', 'send_messages');
      expect(has).toBe(true);
    });

    it('should handle permission updates', () => {
      manager.assignPermissions('user-456', ['view_contacts']);
      manager.assignPermissions('user-456', ['view_contacts', 'create_contact']);
      // Should successfully update permissions
    });
  });

  describe('isAdmin', () => {
    it('should identify admin role', () => {
      expect(manager.isAdmin('admin')).toBe(true);
    });

    it('should identify non-admin roles', () => {
      expect(manager.isAdmin('viewer')).toBe(false);
      expect(manager.isAdmin('operator')).toBe(false);
    });
  });

  describe('getRoleLevel', () => {
    it('should return correct hierarchy levels', () => {
      expect(manager.getRoleLevel('viewer')).toBe(1);
      expect(manager.getRoleLevel('operator')).toBe(2);
      expect(manager.getRoleLevel('sales_rep')).toBe(3);
      expect(manager.getRoleLevel('team_lead')).toBe(4);
      expect(manager.getRoleLevel('manager')).toBe(5);
      expect(manager.getRoleLevel('admin')).toBe(6);
    });

    it('should return 0 for invalid role', () => {
      expect(manager.getRoleLevel('invalid-role')).toBe(0);
    });
  });

  describe('roleHierarchy', () => {
    it('should enforce role hierarchy', () => {
      // Admin has all permissions
      const adminPerms = ['send_messages', 'view_analytics', 'delete_user'];
      adminPerms.forEach((perm) => {
        expect(manager.checkPermission('admin', perm)).toBe(true);
      });

      // Operator has fewer permissions
      expect(manager.checkPermission('operator', 'delete_user')).toBe(false);
    });
  });

  describe('Permission sets', () => {
    it('should contain message permissions', () => {
      expect(manager.checkPermission('sales_rep', 'send_messages')).toBe(true);
      expect(manager.checkPermission('viewer', 'send_messages')).toBe(false);
    });

    it('should contain contact permissions', () => {
      expect(manager.checkPermission('sales_rep', 'create_contact')).toBe(true);
      expect(manager.checkPermission('viewer', 'create_contact')).toBe(false);
    });

    it('should contain admin permissions', () => {
      expect(manager.checkPermission('admin', 'delete_user')).toBe(true);
      expect(manager.checkPermission('manager', 'delete_user')).toBe(false);
    });
  });
});
