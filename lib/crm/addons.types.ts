/**
 * CRM Addon System - Types & Interfaces
 * Simple addon architecture for feature management
 */

export interface CRMAddon {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  icon: string; // lucide icon name
  category: 'sales' | 'messaging' | 'analytics' | 'workflow' | 'tools';
  route: string;
  requiredEnvVars?: string[];
  dependencies?: string[]; // other addon IDs this depends on
  permissions?: string[]; // required admin permissions
}

export interface AddonConfig {
  id: string;
  enabled: boolean;
  settings?: Record<string, any>;
}

export interface AddonRegistry {
  addons: CRMAddon[];
  configs: Record<string, AddonConfig>;
  lastUpdated: Date;
}
