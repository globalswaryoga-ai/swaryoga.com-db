/**
 * CRM Addons Registry
 * Centralized list of all available CRM features/addons
 */

import { CRMAddon } from './addons.types';

export const CRM_ADDONS: CRMAddon[] = [
  // Sales & Funnel Management
  {
    id: 'crm-funnel',
    name: 'Funnel Management',
    description: 'Organize and track leads through sales funnel stages',
    version: '1.0.0',
    enabled: true,
    icon: 'Funnel',
    category: 'sales',
    route: '/admin/crm/funnel/manage',
    permissions: ['crm:read', 'crm:write'],
  },

  // Lead Labels & Tagging
  {
    id: 'crm-labels',
    name: 'Lead Labels',
    description: 'Tag and organize leads with custom labels',
    version: '1.0.0',
    enabled: true,
    icon: 'Tags',
    category: 'sales',
    route: '/admin/crm/labels',
    permissions: ['crm:read', 'crm:write'],
  },

  // Scheduled Messaging
  {
    id: 'crm-scheduled-messages',
    name: 'Scheduled Messages',
    description: 'Schedule WhatsApp messages for future delivery',
    version: '1.0.0',
    enabled: true,
    icon: 'Clock',
    category: 'messaging',
    route: '/admin/crm/scheduled-messages',
    requiredEnvVars: ['WHATSAPP_ACCESS_TOKEN'],
    permissions: ['crm:read', 'crm:write', 'messaging:send'],
  },

  // Broadcast Messages (already exists)
  {
    id: 'crm-broadcast',
    name: 'Broadcast Manager',
    description: 'Send bulk messages to multiple leads',
    version: '1.0.0',
    enabled: true,
    icon: 'Send',
    category: 'messaging',
    route: '/admin/crm/broadcasts',
    requiredEnvVars: ['WHATSAPP_ACCESS_TOKEN'],
    permissions: ['crm:read', 'messaging:send'],
  },

  // Lead Analytics (future addon)
  {
    id: 'crm-analytics',
    name: 'Lead Analytics',
    description: 'View funnel analytics and conversion reports',
    version: '1.0.0',
    enabled: false,
    icon: 'BarChart3',
    category: 'analytics',
    route: '/admin/crm/analytics',
    permissions: ['crm:read', 'reports:view'],
  },

  // Lead Automation (future addon)
  {
    id: 'crm-automation',
    name: 'Lead Automation',
    description: 'Automate workflows and lead progression',
    version: '1.0.0',
    enabled: false,
    icon: 'Zap',
    category: 'workflow',
    route: '/admin/crm/automation',
    permissions: ['crm:read', 'crm:write'],
  },

  // SMS Integration (future addon)
  {
    id: 'crm-sms',
    name: 'SMS Messages',
    description: 'Send SMS messages alongside WhatsApp',
    version: '1.0.0',
    enabled: false,
    icon: 'MessageSquare',
    category: 'messaging',
    route: '/admin/crm/sms',
    requiredEnvVars: ['SMS_API_KEY'],
    permissions: ['messaging:send'],
  },
];

/**
 * Get addon by ID
 */
export function getAddonById(id: string): CRMAddon | undefined {
  return CRM_ADDONS.find((addon) => addon.id === id);
}

/**
 * Get all enabled addons
 */
export function getEnabledAddons(): CRMAddon[] {
  return CRM_ADDONS.filter((addon) => addon.enabled);
}

/**
 * Get addons by category
 */
export function getAddonsByCategory(category: CRMAddon['category']): CRMAddon[] {
  return CRM_ADDONS.filter((addon) => addon.category === category && addon.enabled);
}

/**
 * Check if addon is available (enabled and dependencies met)
 */
export function isAddonAvailable(id: string, availableAddons: string[] = []): boolean {
  const addon = getAddonById(id);
  if (!addon || !addon.enabled) return false;

  if (addon.dependencies) {
    return addon.dependencies.every((dep) => availableAddons.includes(dep));
  }

  return true;
}

/**
 * Validate addon environment (check required env vars)
 */
export function validateAddonEnv(addon: CRMAddon): boolean {
  if (!addon.requiredEnvVars) return true;

  return addon.requiredEnvVars.every((envVar) => {
    const value = process.env[envVar];
    return value !== undefined && value !== '';
  });
}
