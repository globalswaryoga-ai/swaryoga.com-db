'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, Globe, MessageCircle, CreditCard, Phone, Users,
  Megaphone, Check, Lock, ChevronRight, AlertCircle, RefreshCw,
  Upload, Palette, Mail, Settings, ExternalLink
} from 'lucide-react';

interface SetupProgress {
  percentage: number;
  completed: string[];
  pending: string[];
  locked: string[];
}

interface TenantSetupData {
  tenantSlug: string;
  plan: string;
  business: any;
  domain: any;
  whatsapp: any;
  leadAds: any;
  payments: any;
  aiCalling: any;
  team: any;
  setupProgress: any;
}

interface SetupSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  fields: string[];
  required?: boolean;
}

const SETUP_SECTIONS: SetupSection[] = [
  {
    id: 'business',
    title: 'Business Details',
    description: 'Business name, logo, colors, and admin contact',
    icon: <Building2 className="w-5 h-5" />,
    fields: ['businessName', 'logo', 'primaryColor', 'adminName', 'adminEmail', 'adminPhone'],
    required: true,
  },
  {
    id: 'domain',
    title: 'Domain Setup',
    description: 'Configure your CRM URL and custom domain',
    icon: <Globe className="w-5 h-5" />,
    fields: ['subdomain', 'customDomain'],
    required: true,
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp Integration',
    description: 'Connect WhatsApp Business API for messaging',
    icon: <MessageCircle className="w-5 h-5" />,
    fields: ['phoneNumberId', 'accessToken', 'metaAppId', 'metaAppSecret', 'templates'],
    required: true,
  },
  {
    id: 'leadAds',
    title: 'Lead Ads Integration',
    description: 'Connect Meta Lead Ads for automatic lead capture',
    icon: <Megaphone className="w-5 h-5" />,
    fields: ['metaPageId', 'metaPageAccessToken'],
  },
  {
    id: 'payments',
    title: 'Payment Gateway',
    description: 'Setup Cashfree or PayU for payments',
    icon: <CreditCard className="w-5 h-5" />,
    fields: ['cashfree', 'payu'],
  },
  {
    id: 'aiCalling',
    title: 'AI Calling',
    description: 'Configure voice AI agents for automated calls',
    icon: <Phone className="w-5 h-5" />,
    fields: ['preferredLanguages', 'callScript', 'retellAgents'],
  },
  {
    id: 'team',
    title: 'Team Setup',
    description: 'Invite team members and assign roles',
    icon: <Users className="w-5 h-5" />,
    fields: ['members'],
  },
];

interface TenantSetupDashboardProps {
  tenantSlug: string;
  token: string;
  onSectionSelect?: (sectionId: string) => void;
}

export default function TenantSetupDashboard({ 
  tenantSlug, 
  token,
  onSectionSelect 
}: TenantSetupDashboardProps) {
  const [setup, setSetup] = useState<TenantSetupData | null>(null);
  const [progress, setProgress] = useState<SetupProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const fetchSetup = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/crm-site/tenant-setup?tenant=${tenantSlug}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) throw new Error('Failed to fetch setup');
      
      const data = await res.json();
      setSetup(data.setup);
      setProgress(data.progress);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, token]);

  useEffect(() => {
    fetchSetup();
  }, [fetchSetup]);

  const getSectionStatus = (sectionId: string) => {
    if (!progress) return 'pending';
    if (progress.locked.includes(sectionId)) return 'locked';
    if (progress.completed.includes(sectionId)) return 'completed';
    return 'pending';
  };

  const handleSectionClick = (sectionId: string) => {
    const status = getSectionStatus(sectionId);
    if (status === 'locked') return;
    
    setActiveSection(sectionId);
    onSectionSelect?.(sectionId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-lg">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
        <button 
          onClick={fetchSetup}
          className="mt-3 text-sm text-red-600 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Setup Progress</h2>
            <p className="text-indigo-100 text-sm mt-1">
              Complete all required sections to activate your CRM
            </p>
          </div>
          <div className="text-right">
            <span className="text-4xl font-bold">{progress?.percentage || 0}%</span>
            <p className="text-indigo-100 text-sm">Complete</p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="h-3 bg-indigo-800/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: `${progress?.percentage || 0}%` }}
          />
        </div>
        
        <div className="flex justify-between mt-2 text-sm text-indigo-100">
          <span>{progress?.completed.length || 0} completed</span>
          <span>{progress?.pending.length || 0} remaining</span>
        </div>
      </div>

      {/* Checklist Sections */}
      <div className="grid gap-4">
        {SETUP_SECTIONS.map((section) => {
          const status = getSectionStatus(section.id);
          const isLocked = status === 'locked';
          const isCompleted = status === 'completed';
          
          return (
            <div
              key={section.id}
              onClick={() => handleSectionClick(section.id)}
              className={`
                relative p-4 rounded-lg border-2 transition-all
                ${isLocked 
                  ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60' 
                  : isCompleted 
                    ? 'bg-green-50 border-green-200 cursor-pointer hover:border-green-300'
                    : 'bg-white border-gray-200 cursor-pointer hover:border-indigo-300 hover:shadow-md'
                }
                ${activeSection === section.id ? 'ring-2 ring-indigo-500' : ''}
              `}
            >
              <div className="flex items-start gap-4">
                {/* Status Icon */}
                <div className={`
                  p-2 rounded-lg
                  ${isLocked 
                    ? 'bg-gray-200 text-gray-400'
                    : isCompleted 
                      ? 'bg-green-100 text-green-600'
                      : 'bg-indigo-100 text-indigo-600'
                  }
                `}>
                  {isLocked ? <Lock className="w-5 h-5" /> : section.icon}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-medium ${isLocked ? 'text-gray-400' : 'text-gray-900'}`}>
                      {section.title}
                    </h3>
                    {section.required && (
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                        Required
                      </span>
                    )}
                    {isCompleted && (
                      <Check className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                  <p className={`text-sm mt-1 ${isLocked ? 'text-gray-400' : 'text-gray-500'}`}>
                    {isLocked 
                      ? 'Upgrade your plan to unlock this feature'
                      : section.description
                    }
                  </p>
                  
                  {/* Section-specific preview data */}
                  {!isLocked && setup && renderSectionPreview(section.id, setup)}
                </div>
                
                {/* Arrow */}
                {!isLocked && (
                  <ChevronRight className={`w-5 h-5 ${isCompleted ? 'text-green-400' : 'text-gray-400'}`} />
                )}
              </div>
              
              {/* Locked Overlay Badge */}
              {isLocked && (
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-600 rounded-full">
                    Upgrade to unlock
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => handleSectionClick('team')}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50"
          >
            <Users className="w-4 h-4" />
            Invite Team Member
          </button>
          <button
            onClick={() => handleSectionClick('whatsapp')}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50"
          >
            <MessageCircle className="w-4 h-4" />
            Test WhatsApp
          </button>
          <a
            href={`https://${setup?.domain?.subdomain || tenantSlug}.swaryoga.com`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50"
          >
            <ExternalLink className="w-4 h-4" />
            View CRM
          </a>
        </div>
      </div>
    </div>
  );
}

// Helper to render section preview data
function renderSectionPreview(sectionId: string, setup: TenantSetupData) {
  const data = (setup as any)[sectionId];
  if (!data) return null;

  switch (sectionId) {
    case 'business':
      return data.businessName ? (
        <div className="flex items-center gap-3 mt-2 pt-2 border-t">
          {data.logo && (
            <img src={data.logo} alt="" className="w-8 h-8 rounded object-cover" />
          )}
          <div className="text-sm">
            <span className="font-medium text-gray-700">{data.businessName}</span>
            {data.adminEmail && (
              <span className="ml-2 text-gray-400">· {data.adminEmail}</span>
            )}
          </div>
          {data.primaryColor && (
            <div 
              className="w-5 h-5 rounded-full border"
              style={{ backgroundColor: data.primaryColor }}
            />
          )}
        </div>
      ) : null;

    case 'domain':
      return data.subdomain ? (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t text-sm">
          <Globe className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">
            {data.useCustomDomain && data.customDomain 
              ? data.customDomain 
              : `${data.subdomain}.swaryoga.com`
            }
          </span>
        </div>
      ) : null;

    case 'whatsapp':
      return data.isConnected ? (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t text-sm">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-green-600">Connected</span>
          {data.templates?.length > 0 && (
            <span className="text-gray-400">· {data.templates.length} templates</span>
          )}
        </div>
      ) : null;

    case 'team':
      return data.members?.length > 0 ? (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t text-sm">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">{data.members.length} team member(s)</span>
        </div>
      ) : null;

    case 'payments':
      return data.provider && data.provider !== 'none' ? (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t text-sm">
          <CreditCard className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600 capitalize">{data.provider} configured</span>
        </div>
      ) : null;

    default:
      return null;
  }
}
