/**
 * Comprehensive Permission System for Swar Yoga Admin CRM
 * 
 * This module defines all permission categories and access levels
 * for granular role-based access control (RBAC).
 */

// Permission categories (modules)
export const PERMISSION_MODULES = {
  // Core CRM
  LEADS: 'leads',
  CONTACTS: 'contacts',
  CUSTOMERS: 'customers',
  
  // Communication
  WHATSAPP: 'whatsapp',
  EMAIL: 'email',
  MESSAGES: 'messages',
  BROADCASTS: 'broadcasts',
  TEMPLATES: 'templates',
  
  // AI & Calling
  CALLS: 'calls',
  CALL_SCRIPTS: 'callScripts',
  AI_AGENTS: 'aiAgents',
  
  // Business
  WORKSHOPS: 'workshops',
  PAYMENTS: 'payments',
  INVOICES: 'invoices',
  SALES_FUNNEL: 'salesFunnel',
  
  // Content & Community
  COMMUNITY: 'community',
  RECORDINGS: 'recordings',
  
  // Analytics & Reports
  ANALYTICS: 'analytics',
  REPORTS: 'reports',
  DASHBOARD: 'dashboard',
  
  // Accounting
  TALLY: 'tally',
  
  // System
  USERS: 'users',
  SETTINGS: 'settings',
  AUDIT_LOGS: 'audit_logs',
} as const;

// Permission actions (CRUD + special actions)
export const PERMISSION_ACTIONS = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  EXPORT: 'export',
  IMPORT: 'import',
  SEND: 'send',
  BROADCAST: 'broadcast',
} as const;

// Complete permission format: "module:action"
// Examples: "leads:read", "whatsapp:send", "users:delete"

/**
 * Permission structure for each admin user
 */
export interface UserPermissions {
  // Super admin flag (grants all permissions)
  isSuperAdmin?: boolean;
  
  // Granular permissions by module
  leads?: {
    read?: boolean;      // View lead list and details
    write?: boolean;     // Create/edit leads, assign to self
    delete?: boolean;    // Delete leads
    export?: boolean;    // Export lead data
    assignToOthers?: boolean; // Assign leads to other admins
    viewAll?: boolean;   // View leads assigned to others (super admin only)
  };
  
  contacts?: {
    read?: boolean;
    write?: boolean;
    delete?: boolean;
    export?: boolean;
  };
  
  customers?: {
    read?: boolean;
    write?: boolean;
    delete?: boolean;
    export?: boolean;
  };
  
  whatsapp?: {
    read?: boolean;      // View WhatsApp chats
    send?: boolean;      // Send individual messages
    broadcast?: boolean; // Send broadcast messages
    manageGroups?: boolean; // Manage WhatsApp groups
    viewMedia?: boolean; // View/download media
  };
  
  email?: {
    read?: boolean;
    send?: boolean;
    broadcast?: boolean;
    manageTemplates?: boolean;
  };
  
  messages?: {
    read?: boolean;
    send?: boolean;
    delete?: boolean;
  };
  
  broadcasts?: {
    read?: boolean;
    create?: boolean;
    send?: boolean;
    schedule?: boolean;
    delete?: boolean;
  };
  
  templates?: {
    read?: boolean;
    write?: boolean;
    delete?: boolean;
  };
  
  calls?: {
    read?: boolean;      // View call history and logs
    create?: boolean;    // Initiate AI calls to leads
    manage?: boolean;    // Manage call workflows and settings
  };
  
  callScripts?: {
    read?: boolean;      // View call scripts and templates
    write?: boolean;     // Create/edit call scripts
    approve?: boolean;   // Approve/reject scripts for use
    delete?: boolean;    // Delete call scripts
  };
  
  aiAgents?: {
    read?: boolean;      // View AI agents list and settings
    manage?: boolean;    // Set active agent, configure agents
    create?: boolean;    // Create new agents (via Retell)
  };
  
  workshops?: {
    read?: boolean;
    write?: boolean;
    delete?: boolean;
    manageRegistrations?: boolean;
    viewPayments?: boolean;
  };
  
  payments?: {
    read?: boolean;
    write?: boolean;
    refund?: boolean;
    export?: boolean;
  };
  
  invoices?: {
    read?: boolean;
    write?: boolean;
    delete?: boolean;
    export?: boolean;
  };
  
  salesFunnel?: {
    read?: boolean;      // View sales funnel and pipeline
    manage?: boolean;    // Manage funnel stages
    moveLeads?: boolean; // Move leads between stages
  };
  
  community?: {
    read?: boolean;      // View community content
    write?: boolean;     // Create/edit community posts
    moderate?: boolean;  // Moderate community content
    delete?: boolean;    // Delete community content
  };
  
  recordings?: {
    read?: boolean;      // View recordings
    upload?: boolean;    // Upload new recordings
    delete?: boolean;    // Delete recordings
    manage?: boolean;    // Manage recording categories
  };
  
  analytics?: {
    read?: boolean;
    export?: boolean;
  };
  
  reports?: {
    read?: boolean;
    create?: boolean;
    export?: boolean;
  };
  
  dashboard?: {
    read?: boolean;
  };
  
  tally?: {
    read?: boolean;      // View tally/accounting data
    write?: boolean;     // Create/edit tally entries
    manage?: boolean;    // Manage tally settings
  };
  
  users?: {
    read?: boolean;      // View admin users list
    write?: boolean;     // Create/edit admin users
    delete?: boolean;    // Delete admin users
    managePermissions?: boolean; // Edit other users' permissions
  };
  
  settings?: {
    read?: boolean;
    write?: boolean;
  };
  
  auditLogs?: {
    read?: boolean;
    export?: boolean;
  };
}

/**
 * Default permission presets for common roles
 */
export const PERMISSION_PRESETS = {
  // Super Admin - full access to everything
  SUPER_ADMIN: {
    isSuperAdmin: true,
    leads: { read: true, write: true, delete: true, export: true, assignToOthers: true, viewAll: true },
    contacts: { read: true, write: true, delete: true, export: true },
    customers: { read: true, write: true, delete: true, export: true },
    whatsapp: { read: true, send: true, broadcast: true, manageGroups: true, viewMedia: true },
    email: { read: true, send: true, broadcast: true, manageTemplates: true },
    messages: { read: true, send: true, delete: true },
    broadcasts: { read: true, create: true, send: true, schedule: true, delete: true },
    templates: { read: true, write: true, delete: true },
    calls: { read: true, create: true, manage: true },
    callScripts: { read: true, write: true, approve: true, delete: true },
    aiAgents: { read: true, manage: true, create: true },
    workshops: { read: true, write: true, delete: true, manageRegistrations: true, viewPayments: true },
    payments: { read: true, write: true, refund: true, export: true },
    invoices: { read: true, write: true, delete: true, export: true },
    salesFunnel: { read: true, manage: true, moveLeads: true },
    community: { read: true, write: true, moderate: true, delete: true },
    recordings: { read: true, upload: true, delete: true, manage: true },
    analytics: { read: true, export: true },
    reports: { read: true, create: true, export: true },
    dashboard: { read: true },
    tally: { read: true, write: true, manage: true },
    users: { read: true, write: true, delete: true, managePermissions: true },
    settings: { read: true, write: true },
    auditLogs: { read: true, export: true },
  } as UserPermissions,
  
  // CRM Manager - full access EXCEPT settings, delete, and user management
  CRM_MANAGER: {
    isSuperAdmin: false,
    leads: { read: true, write: true, delete: false, export: true, assignToOthers: true, viewAll: true },
    contacts: { read: true, write: true, delete: false, export: true },
    customers: { read: true, write: true, delete: false, export: true },
    whatsapp: { read: true, send: true, broadcast: true, manageGroups: true, viewMedia: true },
    email: { read: true, send: true, broadcast: true, manageTemplates: true },
    messages: { read: true, send: true, delete: false },
    broadcasts: { read: true, create: true, send: true, schedule: true, delete: false },
    templates: { read: true, write: true, delete: false },
    calls: { read: true, create: true, manage: true },
    callScripts: { read: true, write: true, approve: true, delete: false },
    aiAgents: { read: true, manage: true, create: true },
    workshops: { read: true, write: true, delete: false, manageRegistrations: true, viewPayments: true },
    payments: { read: true, write: true, refund: false, export: true },
    invoices: { read: true, write: true, delete: false, export: true },
    salesFunnel: { read: true, manage: true, moveLeads: true },
    community: { read: true, write: true, moderate: true, delete: false },
    recordings: { read: true, upload: true, delete: false, manage: true },
    analytics: { read: true, export: true },
    reports: { read: true, create: true, export: true },
    dashboard: { read: true },
    users: { read: true, write: false, delete: false, managePermissions: false },
    // settings: NOT included - managers cannot access settings
    auditLogs: { read: true, export: false },
  } as UserPermissions,
  
  // Sales Representative - basic lead management
  SALES_REP: {
    isSuperAdmin: false,
    leads: { read: true, write: true, delete: false, export: false, assignToOthers: false, viewAll: false },
    contacts: { read: true, write: true, delete: false, export: false },
    whatsapp: { read: true, send: true, broadcast: false, manageGroups: false, viewMedia: true },
    email: { read: true, send: true, broadcast: false, manageTemplates: false },
    messages: { read: true, send: true, delete: false },
    calls: { read: true, create: true, manage: false },
    callScripts: { read: true, write: false, approve: false, delete: false },
    aiAgents: { read: true, manage: false, create: false },
    salesFunnel: { read: true, manage: false, moveLeads: true },
    dashboard: { read: true },
  } as UserPermissions,
  
  // Marketing Manager - broadcasts and campaigns
  MARKETING_MANAGER: {
    isSuperAdmin: false,
    leads: { read: true, write: true, delete: false, export: true, assignToOthers: false, viewAll: false },
    contacts: { read: true, write: false, delete: false, export: true },
    whatsapp: { read: true, send: true, broadcast: true, manageGroups: true, viewMedia: true },
    email: { read: true, send: true, broadcast: true, manageTemplates: true },
    messages: { read: true, send: true, delete: false },
    broadcasts: { read: true, create: true, send: true, schedule: true, delete: true },
    templates: { read: true, write: true, delete: true },
    analytics: { read: true, export: true },
    reports: { read: true, create: true, export: true },
    dashboard: { read: true },
  } as UserPermissions,
  
  // Analyst - read-only access to analytics
  ANALYST: {
    isSuperAdmin: false,
    leads: { read: true, write: false, delete: false, export: true, assignToOthers: false, viewAll: false },
    contacts: { read: true, write: false, delete: false, export: true },
    customers: { read: true, write: false, delete: false, export: true },
    workshops: { read: true, write: false, delete: false, manageRegistrations: false, viewPayments: true },
    payments: { read: true, write: false, refund: false, export: true },
    analytics: { read: true, export: true },
    reports: { read: true, create: true, export: true },
    dashboard: { read: true },
    auditLogs: { read: true, export: true },
  } as UserPermissions,

  // DM (District Manager) - View all, add new, assign, NO delete, NO edit
  DM: {
    isSuperAdmin: false,
    leads: { read: true, write: true, delete: false, export: true, assignToOthers: true, viewAll: true },
    contacts: { read: true, write: true, delete: false, export: true },
    customers: { read: true, write: true, delete: false, export: true },
    whatsapp: { read: true, send: true, broadcast: true, manageGroups: true, viewMedia: true },
    email: { read: true, send: true, broadcast: true, manageTemplates: true },
    messages: { read: true, send: true, delete: false },
    broadcasts: { read: true, create: true, send: true, schedule: true, delete: false },
    templates: { read: true, write: true, delete: false },
    calls: { read: true, create: true, manage: true },
    callScripts: { read: true, write: true, approve: true, delete: false },
    aiAgents: { read: true, manage: true, create: true },
    workshops: { read: true, write: true, delete: false, manageRegistrations: true, viewPayments: true },
    payments: { read: true, write: true, refund: false, export: true },
    invoices: { read: true, write: true, delete: false, export: true },
    salesFunnel: { read: true, manage: true, moveLeads: true },
    community: { read: true, write: true, moderate: true, delete: false },
    recordings: { read: true, upload: true, delete: false, manage: true },
    analytics: { read: true, export: true },
    reports: { read: true, create: true, export: true },
    dashboard: { read: true },
    tally: { read: true, write: true, manage: true },
    users: { read: true, write: true, delete: false, managePermissions: false },
    settings: { read: true, write: false },
    auditLogs: { read: true, export: true },
  } as UserPermissions,

  // ADMIN_USER - CRM, sales, payments, whatsapp, report, funnel, email, call
  // Can't see other admin data, can assign, no tally, no community, no settings
  ADMIN_USER: {
    isSuperAdmin: false,
    leads: { read: true, write: true, delete: false, export: true, assignToOthers: true, viewAll: false },
    contacts: { read: true, write: true, delete: false, export: true },
    customers: { read: true, write: true, delete: false, export: true },
    whatsapp: { read: true, send: true, broadcast: true, manageGroups: false, viewMedia: true },
    email: { read: true, send: true, broadcast: true, manageTemplates: false },
    messages: { read: true, send: true, delete: false },
    broadcasts: { read: true, create: true, send: true, schedule: true, delete: false },
    templates: { read: true, write: false, delete: false },
    calls: { read: true, create: true, manage: false },
    callScripts: { read: true, write: false, approve: false, delete: false },
    aiAgents: { read: true, manage: false, create: false },
    workshops: { read: true, write: true, delete: false, manageRegistrations: true, viewPayments: true },
    payments: { read: true, write: true, refund: false, export: true },
    invoices: { read: true, write: true, delete: false, export: true },
    salesFunnel: { read: true, manage: false, moveLeads: true },
    analytics: { read: true, export: false },
    reports: { read: true, create: true, export: false },
    dashboard: { read: true },
    // tally: NOT included - admin users cannot access tally
    // community: NOT included - admin users cannot access community
    // users: NOT included - admin users cannot manage other users
    // settings: NOT included - admin users cannot access settings
  } as UserPermissions,
};

/**
 * Helper function to check if user has a specific permission
 */
export function hasPermission(
  userPermissions: UserPermissions | undefined,
  module: string,
  action: string
): boolean {
  if (!userPermissions) return false;
  
  // Super admin has all permissions
  if (userPermissions.isSuperAdmin) return true;
  
  // Check module-specific permission
  const modulePerms = (userPermissions as any)[module];
  if (!modulePerms) return false;
  
  return modulePerms[action] === true;
}

/**
 * Helper function to check if user can view all leads (not just assigned)
 */
export function canViewAllLeads(userPermissions: UserPermissions | undefined): boolean {
  if (!userPermissions) return false;
  return userPermissions.isSuperAdmin || userPermissions.leads?.viewAll === true;
}

/**
 * Helper function to check if user can assign leads to other admins
 */
export function canAssignLeadsToOthers(userPermissions: UserPermissions | undefined): boolean {
  if (!userPermissions) return false;
  return userPermissions.isSuperAdmin || userPermissions.leads?.assignToOthers === true;
}

/**
 * Helper function to get all permissions for a user as a flat array
 * Format: ["leads:read", "leads:write", "whatsapp:send", ...]
 */
export function getUserPermissionsList(userPermissions: UserPermissions): string[] {
  const permissions: string[] = [];
  
  if (userPermissions.isSuperAdmin) {
    return ['all'];
  }
  
  // Iterate through all modules
  Object.keys(userPermissions).forEach((module) => {
    if (module === 'isSuperAdmin') return;
    
    const modulePerms = (userPermissions as any)[module];
    if (!modulePerms || typeof modulePerms !== 'object') return;
    
    // Add each action that's enabled
    Object.keys(modulePerms).forEach((action) => {
      if (modulePerms[action] === true) {
        permissions.push(`${module}:${action}`);
      }
    });
  });
  
  return permissions;
}

/**
 * Helper function to parse permission list back into UserPermissions object
 */
export function parsePermissionsList(permissions: string[]): UserPermissions {
  if (permissions.includes('all')) {
    return PERMISSION_PRESETS.SUPER_ADMIN;
  }
  
  const userPermissions: UserPermissions = { isSuperAdmin: false };
  
  permissions.forEach((perm) => {
    const [module, action] = perm.split(':');
    if (!module || !action) return;
    
    if (!(userPermissions as any)[module]) {
      (userPermissions as any)[module] = {};
    }
    
    (userPermissions as any)[module][action] = true;
  });
  
  return userPermissions;
}

/**
 * Backward compatibility: Convert old permission array to new structure
 */
export function migrateOldPermissions(oldPermissions: string[]): UserPermissions {
  if (oldPermissions.includes('all')) {
    return PERMISSION_PRESETS.SUPER_ADMIN;
  }
  
  const userPermissions: UserPermissions = { isSuperAdmin: false };
  
  // Map old permissions to new structure
  if (oldPermissions.includes('crm')) {
    userPermissions.leads = { read: true, write: true, delete: false, export: true };
    userPermissions.contacts = { read: true, write: true, delete: false, export: true };
  }
  
  if (oldPermissions.includes('whatsapp')) {
    userPermissions.whatsapp = { read: true, send: true, broadcast: true, manageGroups: true, viewMedia: true };
  }
  
  if (oldPermissions.includes('email')) {
    userPermissions.email = { read: true, send: true, broadcast: true, manageTemplates: true };
  }
  
  return userPermissions;
}
