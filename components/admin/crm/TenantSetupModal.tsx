'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { BusinessSetupForm, DomainSetupForm, WhatsAppSetupForm } from './TenantSetupForms';
import { PaymentSetupForm, LeadAdsSetupForm, AICallingSetupForm, TeamSetupForm } from './TenantSetupFormsExtended';
import TenantSetupDashboard from './TenantSetupDashboard';

interface TenantSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantSlug: string;
  token: string;
  initialSection?: string;
}

export default function TenantSetupModal({
  isOpen,
  onClose,
  tenantSlug,
  token,
  initialSection,
}: TenantSetupModalProps) {
  const [activeSection, setActiveSection] = useState<string | null>(initialSection || null);
  const [setup, setSetup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchSetup = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/crm-site/tenant-setup?tenant=${tenantSlug}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch setup');
      const data = await res.json();
      setSetup(data.setup);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, token]);

  useEffect(() => {
    if (isOpen) {
      fetchSetup();
    }
  }, [isOpen, fetchSetup]);

  const handleSave = async (section: string, data: any, markComplete: boolean) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/crm-site/tenant-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantSlug,
          section,
          data,
          markComplete,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw { message: result.error, details: result.details };
      }

      // Update local state
      setSetup(result.setup);
      
      // Go back to dashboard if completed
      if (markComplete) {
        setActiveSection(null);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const renderSectionForm = () => {
    if (!setup) return null;

    switch (activeSection) {
      case 'business':
        return (
          <BusinessSetupForm
            data={setup.business}
            onSave={(data, complete) => handleSave('business', data, complete)}
            loading={saving}
          />
        );
      case 'domain':
        return (
          <DomainSetupForm
            data={setup.domain}
            tenantSlug={tenantSlug}
            onSave={(data, complete) => handleSave('domain', data, complete)}
            loading={saving}
          />
        );
      case 'whatsapp':
        return (
          <WhatsAppSetupForm
            data={setup.whatsapp}
            tenantSlug={tenantSlug}
            token={token}
            onSave={(data, complete) => handleSave('whatsapp', data, complete)}
            loading={saving}
          />
        );
      case 'leadAds':
        return (
          <LeadAdsSetupForm
            data={setup.leadAds}
            onSave={(data, complete) => handleSave('leadAds', data, complete)}
            loading={saving}
          />
        );
      case 'payments':
        return (
          <PaymentSetupForm
            data={setup.payments}
            tenantSlug={tenantSlug}
            token={token}
            onSave={(data, complete) => handleSave('payments', data, complete)}
            loading={saving}
          />
        );
      case 'aiCalling':
        return (
          <AICallingSetupForm
            data={setup.aiCalling}
            onSave={(data, complete) => handleSave('aiCalling', data, complete)}
            loading={saving}
          />
        );
      case 'team':
        return (
          <TeamSetupForm
            data={setup.team}
            onSave={(data, complete) => handleSave('team', data, complete)}
            loading={saving}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="absolute inset-4 md:inset-8 lg:inset-16 bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            {activeSection && (
              <button
                onClick={() => setActiveSection(null)}
                className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {activeSection ? 'Setup Configuration' : 'Tenant Setup Dashboard'}
              </h2>
              <p className="text-sm text-gray-500">
                {activeSection 
                  ? 'Complete the form below to configure this section' 
                  : 'Track your setup progress and configure integrations'
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64">
              <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchSetup}
                className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
              >
                Try Again
              </button>
            </div>
          ) : activeSection ? (
            renderSectionForm()
          ) : (
            <TenantSetupDashboard
              tenantSlug={tenantSlug}
              token={token}
              onSectionSelect={setActiveSection}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CHECKLIST SUMMARY COMPONENT (for inline use)
// ============================================================================

interface SetupChecklistInlineProps {
  tenantSlug: string;
  token: string;
  onOpenSetup?: () => void;
}

export function SetupChecklistInline({ tenantSlug, token, onOpenSetup }: SetupChecklistInlineProps) {
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await fetch(`/api/crm-site/tenant-setup?tenant=${tenantSlug}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setProgress(data.progress);
        }
      } catch (err) {
        console.error('Failed to fetch setup progress:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, [tenantSlug, token]);

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
        <div className="h-2 bg-gray-200 rounded w-full" />
      </div>
    );
  }

  if (!progress || progress.percentage === 100) {
    return null; // Hide when complete
  }

  return (
    <div 
      className="p-4 bg-gradient-to-r from-indigo-50 to-indigo-50 border border-indigo-100 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
      onClick={onOpenSetup}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-bold text-indigo-600">{progress.percentage}%</span>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Setup Progress</h4>
            <p className="text-xs text-gray-500">
              {progress.completed.length} of {progress.completed.length + progress.pending.length} steps complete
            </p>
          </div>
        </div>
        <span className="text-sm text-indigo-600 font-medium">Continue →</span>
      </div>
      <div className="h-2 bg-indigo-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-indigo-500 rounded-full transition-all"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
    </div>
  );
}
