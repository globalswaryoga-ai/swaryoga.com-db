'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  CheckCircle, 
  Circle, 
  ChevronDown, 
  ChevronUp,
  Play,
  ExternalLink,
  Lock,
  AlertTriangle,
  X,
} from 'lucide-react';

// Page-specific setup requirements
export const PAGE_SETUP_CONFIG: Record<string, PageSetupConfig> = {
  '/admin/crm': {
    title: 'Dashboard',
    requirements: [
      { key: 'compartmentReady', label: 'Complete data compartment setup', required: true },
      { key: 'setupPaid', label: 'Buy 500MB Storage (₹30)', required: true },
    ],
    tutorialVideo: 'https://www.youtube.com/embed/your-dashboard-video',
    tutorialPdf: '/tutorials/crm-dashboard-guide.pdf',
    description: 'Overview of your CRM performance and quick actions',
  },
  '/admin/crm/leads': {
    title: 'Lead Management',
    requirements: [
      { key: 'compartmentReady', label: 'Complete data compartment setup', required: true },
      { key: 'setupPaid', label: 'Buy 500MB Storage (₹30)', required: true },
    ],
    tutorialVideo: 'https://www.youtube.com/embed/your-leads-video',
    tutorialPdf: '/tutorials/lead-management-guide.pdf',
    description: 'Create, manage, and track your leads through the sales funnel',
  },
  '/admin/crm/meta': {
    title: 'WhatsApp Inbox',
    requirements: [
      { key: 'compartmentReady', label: 'Complete data compartment setup', required: true },
      { key: 'setupPaid', label: 'Buy 500MB Storage (₹30)', required: true },
      { key: 'whatsappConnected', label: 'Connect WhatsApp Business API', required: true },
      { key: 'whatsappTemplates', label: 'Create message templates', required: false },
    ],
    tutorialVideo: 'https://www.youtube.com/embed/your-whatsapp-video',
    tutorialPdf: '/tutorials/whatsapp-setup-guide.pdf',
    description: 'Send and receive WhatsApp messages via Meta Business API',
  },
  '/admin/crm/calls': {
    title: 'AI Voice Calls',
    requirements: [
      { key: 'compartmentReady', label: 'Complete data compartment setup', required: true },
      { key: 'setupPaid', label: 'Buy 500MB Storage (₹30)', required: true },
      { key: 'retellConnected', label: 'Connect Retell AI account', required: true },
    ],
    tutorialVideo: 'https://www.youtube.com/embed/your-calls-video',
    tutorialPdf: '/tutorials/voice-calls-guide.pdf',
    description: 'Make AI-powered voice calls in 19 languages',
  },
  '/admin/crm/settings': {
    title: 'Settings',
    requirements: [
      { key: 'compartmentReady', label: 'Complete data compartment setup', required: true },
      { key: 'setupPaid', label: 'Buy 500MB Storage (₹30)', required: true },
    ],
    tutorialVideo: 'https://www.youtube.com/embed/your-settings-video',
    tutorialPdf: '/tutorials/settings-guide.pdf',
    description: 'Configure your CRM, integrations, and team',
  },
  '/admin/crm/broadcasts': {
    title: 'Broadcasts',
    requirements: [
      { key: 'compartmentReady', label: 'Complete data compartment setup', required: true },
      { key: 'setupPaid', label: 'Buy 500MB Storage (₹30)', required: true },
      { key: 'whatsappConnected', label: 'Connect WhatsApp Business API', required: true },
      { key: 'whatsappTemplates', label: 'Create approved templates', required: true },
    ],
    tutorialVideo: 'https://www.youtube.com/embed/your-broadcast-video',
    tutorialPdf: '/tutorials/broadcast-guide.pdf',
    description: 'Send bulk WhatsApp messages to your leads',
  },
};

interface SetupRequirement {
  key: string;
  label: string;
  required: boolean;
}

interface PageSetupConfig {
  title: string;
  requirements: SetupRequirement[];
  tutorialVideo?: string;
  tutorialPdf?: string;
  description: string;
}

interface UserSetupStatus {
  setupPaid: boolean;
  compartmentReady: boolean;
  whatsappConnected: boolean;
  whatsappTemplates: boolean;
  retellConnected: boolean;
  teamInvited: boolean;
  leadsImported: boolean;
}

interface PageSetupChecklistProps {
  currentPath: string;
  onPaymentClick?: () => void;
  className?: string;
}

export default function PageSetupChecklist({
  currentPath,
  onPaymentClick,
  className = '',
}: PageSetupChecklistProps) {
  const [expanded, setExpanded] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [setupStatus, setSetupStatus] = useState<UserSetupStatus>({
    setupPaid: false,
    compartmentReady: false,
    whatsappConnected: false,
    whatsappTemplates: false,
    retellConnected: false,
    teamInvited: false,
    leadsImported: false,
  });
  const [loading, setLoading] = useState(true);

  // Find config for current page
  const pageConfig = PAGE_SETUP_CONFIG[currentPath] || PAGE_SETUP_CONFIG['/admin/crm'];

  useEffect(() => {
    fetchSetupStatus();
  }, []);

  const fetchSetupStatus = async () => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token') || localStorage.getItem('crm_token');
      if (!token) return;

      const res = await fetch('/api/crm-site/setup-status', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setSetupStatus({
          ...data,
          compartmentReady: data.compartment?.isComplete || data.isSuperAdmin || false,
        });
      }
    } catch (err) {
      console.error('Failed to fetch setup status:', err);
    } finally {
      setLoading(false);
    }
  };

  const isRequirementMet = (key: string) => {
    return setupStatus[key as keyof UserSetupStatus] || false;
  };

  const requiredMet = pageConfig.requirements
    .filter(r => r.required)
    .every(r => isRequirementMet(r.key));

  const allMet = pageConfig.requirements.every(r => isRequirementMet(r.key));

  // Don't show if all requirements are met
  if (!loading && allMet) {
    return null;
  }

  const completedCount = pageConfig.requirements.filter(r => isRequirementMet(r.key)).length;
  const totalCount = pageConfig.requirements.length;

  return (
    <>
      {/* Setup Banner */}
      <div className={`bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl overflow-hidden ${className}`}>
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-amber-100/50 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
              {requiredMet ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">
                {requiredMet ? 'Setup Complete' : 'Complete Setup to Use This Page'}
              </p>
              <p className="text-xs text-gray-500">
                {completedCount} of {totalCount} steps completed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pageConfig.tutorialVideo && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowVideo(true);
                }}
                className="p-2 rounded-lg bg-white border border-amber-200 hover:bg-amber-50 transition"
                title="Watch Tutorial"
              >
                <Play className="h-4 w-4 text-amber-600" />
              </button>
            )}
            {expanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </button>

        {/* Expanded Content */}
        {expanded && (
          <div className="px-4 pb-4 border-t border-amber-200 bg-white/50">
            <p className="text-sm text-gray-600 mt-3 mb-4">
              {pageConfig.description}
            </p>

            {/* Requirements List */}
            <div className="space-y-2">
              {pageConfig.requirements.map((req, idx) => {
                const met = isRequirementMet(req.key);
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-3 rounded-lg transition ${
                      met ? 'bg-green-50' : 'bg-white border border-gray-200'
                    }`}
                  >
                    {met ? (
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                    )}
                    <span className={`flex-1 ${met ? 'text-green-700' : 'text-gray-700'}`}>
                      {req.label}
                      {req.required && !met && (
                        <span className="text-red-500 text-xs ml-1">*Required</span>
                      )}
                    </span>
                    {!met && req.key === 'setupPaid' && onPaymentClick && (
                      <button
                        onClick={onPaymentClick}
                        className="px-3 py-1.5 bg-swar-primary text-white text-sm rounded-lg hover:bg-swar-primary-dark transition"
                      >
                        Pay ₹30
                      </button>
                    )}
                    {!met && req.key === 'whatsappConnected' && (
                      <Link
                        href="/admin/crm/settings?tab=whatsapp"
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
                      >
                        Connect
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Tutorial Links */}
            {(pageConfig.tutorialVideo || pageConfig.tutorialPdf) && (
              <div className="mt-4 flex items-center gap-3">
                {pageConfig.tutorialVideo && (
                  <button
                    onClick={() => setShowVideo(true)}
                    className="flex items-center gap-2 text-sm text-amber-700 hover:text-amber-800"
                  >
                    <Play className="h-4 w-4" />
                    Watch Tutorial
                  </button>
                )}
                {pageConfig.tutorialPdf && (
                  <a
                    href={pageConfig.tutorialPdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Guide
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Locked Overlay - show when required setup not complete */}
      {!loading && !setupStatus.setupPaid && !dismissed && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center pointer-events-auto relative">
            <button
              onClick={() => setDismissed(true)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition"
              title="Close"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Buy Storage to Continue
            </h3>
            <p className="text-gray-500 mb-6">
              To access {pageConfig.title}, please purchase minimum 500MB storage for ₹30 to use all pages and features.
            </p>
            <button
              onClick={onPaymentClick}
              className="w-full bg-gradient-to-r from-swar-primary to-emerald-500 text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Buy Storage (₹30)
            </button>
          </div>
        </div>
      )}

      {/* Video Modal */}
      {showVideo && pageConfig.tutorialVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="relative w-full max-w-4xl mx-4">
            <button
              onClick={() => setShowVideo(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition"
            >
              <X className="h-8 w-8" />
            </button>
            <div className="aspect-video bg-black rounded-xl overflow-hidden">
              <iframe
                src={pageConfig.tutorialVideo}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Mini version for sidebar or header
export function SetupProgressMini({ className = '' }: { className?: string }) {
  const [setupStatus, setSetupStatus] = useState({ setupPaid: false });
  
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
        if (!token) return;
        
        const res = await fetch('/api/crm-site/setup-status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSetupStatus(data);
        }
      } catch {}
    };
    fetchStatus();
  }, []);

  if (setupStatus.setupPaid) return null;

  return (
    <Link
      href="/admin/crm?showSetup=true"
      className={`flex items-center gap-2 px-3 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition text-sm ${className}`}
    >
      <AlertTriangle className="h-4 w-4" />
      <span>Complete Setup</span>
    </Link>
  );
}
