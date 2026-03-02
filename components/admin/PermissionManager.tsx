/**
 * Permission Manager Component
 * 
 * UI for managing granular admin user permissions
 * Supports both legacy permission array and new permissionsV2 structure
 */

'use client';

import React, { useState } from 'react';
import { 
  PERMISSION_MODULES, 
  PERMISSION_PRESETS, 
  UserPermissions 
} from '@/lib/permissions';
import { Shield, Check, X, Users, Mail, MessageSquare, TrendingUp, Settings, DollarSign, FileText, Calendar, Phone, Bot, BarChart3, Video, Globe, Filter } from 'lucide-react';

interface PermissionManagerProps {
  initialPermissions?: UserPermissions;
  onChange: (permissions: UserPermissions) => void;
  disabled?: boolean;
}

// Icon mapping for modules
const MODULE_ICONS: Record<string, React.ComponentType<any>> = {
  leads: Users,
  contacts: Users,
  customers: Users,
  whatsapp: MessageSquare,
  email: Mail,
  messages: MessageSquare,
  broadcasts: Mail,
  templates: FileText,
  calls: Phone,
  callScripts: Bot,
  aiAgents: Bot,
  workshops: Calendar,
  payments: DollarSign,
  invoices: FileText,
  salesFunnel: Filter,
  community: Globe,
  recordings: Video,
  analytics: TrendingUp,
  reports: FileText,
  dashboard: BarChart3,
  tally: DollarSign,
  users: Users,
  settings: Settings,
  auditLogs: FileText,
};

// Friendly labels for modules
const MODULE_LABELS: Record<string, string> = {
  leads: 'Leads',
  contacts: 'Contacts',
  customers: 'Customers',
  whatsapp: 'WhatsApp',
  email: 'Email',
  messages: 'Messages',
  broadcasts: 'Broadcasts',
  templates: 'Templates',
  calls: 'Call Workflows',
  callScripts: 'Call Scripts',
  aiAgents: 'AI Agents',
  workshops: 'Workshops',
  payments: 'Payments',
  invoices: 'Invoices',
  salesFunnel: 'Sales Funnel',
  community: 'Community',
  recordings: 'Recordings',
  analytics: 'Analytics',
  reports: 'Reports',
  dashboard: 'Dashboard',
  tally: 'Tally Prime',
  users: 'Admin Users',
  settings: 'Settings',
  auditLogs: 'Audit Logs',
};

// Action labels
const ACTION_LABELS: Record<string, string> = {
  read: 'View',
  write: 'Create/Edit',
  delete: 'Delete',
  export: 'Export',
  import: 'Import',
  send: 'Send',
  broadcast: 'Broadcast',
  manageGroups: 'Manage Groups',
  viewMedia: 'View Media',
  manageTemplates: 'Manage Templates',
  manageRegistrations: 'Manage Registrations',
  viewPayments: 'View Payments',
  refund: 'Refund',
  create: 'Create',
  schedule: 'Schedule',
  assignToOthers: 'Assign to Others',
  viewAll: 'View All (Not Just Assigned)',
  managePermissions: 'Manage Permissions',
  manage: 'Manage',
  approve: 'Approve/Reject',
  moderate: 'Moderate',
  upload: 'Upload',
  moveLeads: 'Move Leads',
};

export default function PermissionManager({ 
  initialPermissions, 
  onChange, 
  disabled = false 
}: PermissionManagerProps) {
  const [permissions, setPermissions] = useState<UserPermissions>(
    initialPermissions || { isSuperAdmin: false }
  );
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const handleSuperAdminToggle = () => {
    const newPerms: UserPermissions = permissions.isSuperAdmin 
      ? { isSuperAdmin: false }
      : PERMISSION_PRESETS.SUPER_ADMIN;
    
    setPermissions(newPerms);
    onChange(newPerms);
    setActivePreset(permissions.isSuperAdmin ? null : 'SUPER_ADMIN');
  };

  const applyPreset = (presetName: keyof typeof PERMISSION_PRESETS) => {
    const preset = PERMISSION_PRESETS[presetName];
    setPermissions(preset);
    onChange(preset);
    setActivePreset(presetName);
  };

  const toggleModuleAction = (module: string, action: string) => {
    if (permissions.isSuperAdmin) return; // Can't edit super admin
    
    const newPerms = { ...permissions };
    
    if (!(newPerms as any)[module]) {
      (newPerms as any)[module] = {};
    }
    
    const currentValue = (newPerms as any)[module][action];
    (newPerms as any)[module][action] = !currentValue;
    
    setPermissions(newPerms);
    onChange(newPerms);
    setActivePreset(null);
  };

  const toggleAllModuleActions = (module: string, enabled: boolean) => {
    if (permissions.isSuperAdmin) return;
    
    const newPerms = { ...permissions };
    const modulePerms = (newPerms as any)[module] || {};
    
    // Get all possible actions for this module from presets
    const superAdminModule = (PERMISSION_PRESETS.SUPER_ADMIN as any)[module];
    if (superAdminModule) {
      Object.keys(superAdminModule).forEach(action => {
        modulePerms[action] = enabled;
      });
    }
    
    (newPerms as any)[module] = modulePerms;
    setPermissions(newPerms);
    onChange(newPerms);
    setActivePreset(null);
  };

  const getModuleActions = (module: string): string[] => {
    const superAdminModule = (PERMISSION_PRESETS.SUPER_ADMIN as any)[module];
    return superAdminModule ? Object.keys(superAdminModule) : [];
  };

  const isActionEnabled = (module: string, action: string): boolean => {
    if (permissions.isSuperAdmin) return true;
    return (permissions as any)[module]?.[action] === true;
  };

  const isModuleFullyEnabled = (module: string): boolean => {
    const actions = getModuleActions(module);
    return actions.every(action => isActionEnabled(module, action));
  };

  const isModulePartiallyEnabled = (module: string): boolean => {
    const actions = getModuleActions(module);
    const enabledCount = actions.filter(action => isActionEnabled(module, action)).length;
    return enabledCount > 0 && enabledCount < actions.length;
  };

  return (
    <div className="space-y-6">
      {/* Super Admin Toggle */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-purple-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Super Administrator</h3>
              <p className="text-sm text-gray-600">Full access to all features and data</p>
            </div>
          </div>
          <button
            onClick={handleSuperAdminToggle}
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              permissions.isSuperAdmin ? 'bg-purple-600' : 'bg-gray-200'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                permissions.isSuperAdmin ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Preset Buttons */}
      {!permissions.isSuperAdmin && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Quick Presets</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <button
              onClick={() => applyPreset('DM')}
              disabled={disabled}
              className={`p-3 rounded-lg border-2 transition-all ${
                activePreset === 'DM' 
                  ? 'border-indigo-500 bg-indigo-50' 
                  : 'border-gray-200 hover:border-indigo-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="font-medium text-gray-900">DM</div>
              <div className="text-xs text-gray-600 mt-1">All access, no delete</div>
            </button>

            <button
              onClick={() => applyPreset('CRM_MANAGER')}
              disabled={disabled}
              className={`p-3 rounded-lg border-2 transition-all ${
                activePreset === 'CRM_MANAGER' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-blue-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="font-medium text-gray-900">Manager</div>
              <div className="text-xs text-gray-600 mt-1">Customizable access</div>
            </button>
            
            <button
              onClick={() => applyPreset('ADMIN_USER')}
              disabled={disabled}
              className={`p-3 rounded-lg border-2 transition-all ${
                activePreset === 'ADMIN_USER' 
                  ? 'border-teal-500 bg-teal-50' 
                  : 'border-gray-200 hover:border-teal-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="font-medium text-gray-900">Admin User</div>
              <div className="text-xs text-gray-600 mt-1">CRM, sales, calls only</div>
            </button>

            <button
              onClick={() => applyPreset('SALES_REP')}
              disabled={disabled}
              className={`p-3 rounded-lg border-2 transition-all ${
                activePreset === 'SALES_REP' 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-200 hover:border-green-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="font-medium text-gray-900">Sales Rep</div>
              <div className="text-xs text-gray-600 mt-1">Basic lead management</div>
            </button>
            
            <button
              onClick={() => applyPreset('MARKETING_MANAGER')}
              disabled={disabled}
              className={`p-3 rounded-lg border-2 transition-all ${
                activePreset === 'MARKETING_MANAGER' 
                  ? 'border-purple-500 bg-purple-50' 
                  : 'border-gray-200 hover:border-purple-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="font-medium text-gray-900">Marketing</div>
              <div className="text-xs text-gray-600 mt-1">Broadcasts & campaigns</div>
            </button>
            
            <button
              onClick={() => applyPreset('ANALYST')}
              disabled={disabled}
              className={`p-3 rounded-lg border-2 transition-all ${
                activePreset === 'ANALYST' 
                  ? 'border-orange-500 bg-orange-50' 
                  : 'border-gray-200 hover:border-orange-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="font-medium text-gray-900">Analyst</div>
              <div className="text-xs text-gray-600 mt-1">Analytics & reporting</div>
            </button>
          </div>
        </div>
      )}

      {/* Granular Permissions */}
      {!permissions.isSuperAdmin && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Granular Permissions</h3>
          
          <div className="space-y-3">
            {Object.values(PERMISSION_MODULES).map((module) => {
              const Icon = MODULE_ICONS[module] || Shield;
              const actions = getModuleActions(module);
              if (actions.length === 0) return null;
              
              const fullyEnabled = isModuleFullyEnabled(module);
              const partiallyEnabled = isModulePartiallyEnabled(module);
              
              return (
                <div key={module} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Module Header */}
                  <div 
                    className={`flex items-center justify-between p-3 cursor-pointer ${
                      fullyEnabled ? 'bg-green-50' : partiallyEnabled ? 'bg-yellow-50' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-gray-600" />
                      <span className="font-medium text-gray-900">{MODULE_LABELS[module]}</span>
                      {partiallyEnabled && (
                        <span className="text-xs text-yellow-600 font-medium">PARTIAL</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleAllModuleActions(module, !fullyEnabled)}
                        disabled={disabled}
                        className={`text-xs px-2 py-1 rounded ${
                          fullyEnabled 
                            ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {fullyEnabled ? 'Disable All' : 'Enable All'}
                      </button>
                    </div>
                  </div>
                  
                  {/* Module Actions */}
                  <div className="grid grid-cols-2 gap-2 p-3 bg-white">
                    {actions.map((action) => {
                      const isEnabled = isActionEnabled(module, action);
                      
                      return (
                        <button
                          key={action}
                          onClick={() => toggleModuleAction(module, action)}
                          disabled={disabled}
                          className={`flex items-center gap-2 p-2 rounded-md transition-colors ${
                            isEnabled 
                              ? 'bg-green-100 text-green-800 border border-green-300' 
                              : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {isEnabled ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                          <span className="text-sm">{ACTION_LABELS[action] || action}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Super Admin View */}
      {permissions.isSuperAdmin && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-center">
          <Shield className="w-12 h-12 text-purple-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">Super Administrator Active</h3>
          <p className="text-sm text-gray-600">
            This user has full access to all features and data.
            <br />
            Turn off Super Administrator to configure granular permissions.
          </p>
        </div>
      )}
    </div>
  );
}
