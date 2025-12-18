/**
 * PERMISSION MANAGER UTILITY
 * Role-based access control and permission checking
 * File: /lib/permissionManager.ts
 */

import { Permission } from './schemas/enterpriseSchemas';
import { connectDB } from './db';

export interface PermissionCheck {
  canSendBulkMessages?: boolean;
  canCreateLeads?: boolean;
  canDeleteLeads?: boolean;
  canExportData?: boolean;
  canManageWhatsAppAccounts?: boolean;
  canViewSalesReports?: boolean;
  canManageUsers?: boolean;
  canAssignPermissions?: boolean;
  canViewAuditLogs?: boolean;
  canManageBackups?: boolean;
  [key: string]: boolean | undefined;
}

export class PermissionManager {
  /**
   * Get user permissions
   */
  static async getUserPermissions(userId: string): Promise<any> {
    await connectDB();
    
    const permissions = await Permission.findOne({ userId }).lean();
    
    if (!permissions) {
      throw new Error(`No permissions found for user: ${userId}`);
    }
    
    return permissions;
  }

  /**
   * Check single permission
   */
  static async checkPermission(userId: string, permission: string): Promise<boolean> {
    try {
      const perms = await this.getUserPermissions(userId);
      
      // Navigate nested permissions object
      const keys = permission.split('.');
      let value: any = perms.permissions;
      
      for (const key of keys) {
        value = value?.[key];
      }
      
      return value === true;
    } catch {
      return false;
    }
  }

  /**
   * Check multiple permissions (AND logic)
   */
  static async checkPermissions(userId: string, permissions: string[]): Promise<boolean> {
    const results = await Promise.all(
      permissions.map(p => this.checkPermission(userId, p))
    );
    
    return results.every(r => r === true);
  }

  /**
   * Assign or update user permissions
   */
  static async assignPermissions(userId: string, role: string, permissions: PermissionCheck): Promise<void> {
    await connectDB();
    
    await Permission.findOneAndUpdate(
      { userId },
      {
        userId,
        role,
        permissions,
        assignedAt: new Date(),
      },
      { upsert: true }
    );
  }

  /**
   * Get all users with specific permission
   */
  static async getUsersWithPermission(permissionPath: string): Promise<any[]> {
    await connectDB();
    
    // This requires MongoDB aggregation pipeline
    return await Permission.aggregate([
      {
        $match: {
          [permissionPath]: true,
        },
      },
    ]);
  }

  /**
   * Revoke specific permission from user
   */
  static async revokePermission(userId: string, permissionPath: string): Promise<void> {
    await connectDB();
    
    const updateObj: any = {};
    updateObj[permissionPath] = false;
    
    await Permission.findOneAndUpdate({ userId }, { $set: updateObj });
  }

  /**
   * Check if user is admin
   */
  static async isAdmin(userId: string): Promise<boolean> {
    try {
      const perms = await this.getUserPermissions(userId);
      return perms.role === 'admin';
    } catch {
      return false;
    }
  }

  /**
   * Get role hierarchy level
   */
  static getRoleLevel(role: string): number {
    const levels: { [key: string]: number } = {
      'viewer': 1,
      'operator': 2,
      'sales_rep': 3,
      'team_lead': 4,
      'manager': 5,
      'admin': 6,
    };
    
    return levels[role] || 0;
  }
}
