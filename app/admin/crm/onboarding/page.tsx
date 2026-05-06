'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  Building2,
  Palette,
  MessageCircle,
  Users,
  Upload,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  SkipForward,
  Sparkles,
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  required: boolean;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Building2,
  Palette,
  MessageCircle,
  Users,
  Upload,
};

const INDUSTRIES = [
  { value: 'wellness', label: 'Wellness & Yoga' },
  { value: 'education', label: 'Education & Coaching' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'realestate', label: 'Real Estate' },
  { value: 'finance', label: 'Finance & Insurance' },
  { value: 'saas', label: 'SaaS & Technology' },
  { value: 'agency', label: 'Marketing Agency' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'retail', label: 'Retail' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'other', label: 'Other' },
];

const TEAM_SIZES = [
  { value: '1', label: 'Just me' },
  { value: '2-5', label: '2-5 people' },
  { value: '6-10', label: '6-10 people' },
  { value: '11-25', label: '11-25 people' },
  { value: '26-50', label: '26-50 people' },
  { value: '50+', label: '50+ people' },
];

const COLOR_PRESETS = [
  { name: 'Purple', primary: '#667eea', accent: '#764ba2' },
  { name: 'Blue', primary: '#3b82f6', accent: '#1d4ed8' },
  { name: 'Green', primary: '#10b981', accent: '#059669' },
  { name: 'Orange', primary: '#f97316', accent: '#ea580c' },
  { name: 'Pink', primary: '#ec4899', accent: '#db2777' },
  { name: 'Teal', primary: '#14b8a6', accent: '#0d9488' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const token = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [skippedSteps, setSkippedSteps] = useState<string[]>([]);
  const [percentComplete, setPercentComplete] = useState(0);
  const [tenantSlug, setTenantSlug] = useState('');

  // Form data for each step
  const [formData, setFormData] = useState<Record<string, any>>({
    business: { businessName: '', industry: '', teamSize: '', website: '' },
    branding: { primaryColor: '#667eea', accentColor: '#764ba2', logo: '' },
    whatsapp: { whatsappPhoneId: '', whatsappToken: '', whatsappBusinessId: '' },
    team: { invites: [{ email: '', role: 'user' }] },
    import: { file: null, mapping: {} },
  });

  useEffect(() => {
    if (!token) return;
    fetchOnboarding();
  }, [token]);

  const fetchOnboarding = async () => {
    try {
      const slug = localStorage.getItem('tenantSlug') || '';
      setTenantSlug(slug);

      const res = await fetch(`/api/crm-site/onboarding?tenant=${slug}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setSteps(data.steps);
        setCompletedSteps(data.progress.completedSteps || []);
        setSkippedSteps(data.progress.skippedSteps || []);
        setPercentComplete(data.percentComplete);

        // Restore saved form data
        if (data.progress.stepData) {
          setFormData(prev => ({ ...prev, ...data.progress.stepData }));
        }

        // Set current step
        const currentStepId = data.progress.currentStep;
        const idx = data.steps.findIndex((s: OnboardingStep) => s.id === currentStepId);
        if (idx >= 0) setCurrentStepIndex(idx);

        // If complete, redirect to dashboard
        if (data.isComplete) {
          router.push('/admin/crm');
        }
      }
    } catch (err) {
      console.error('Failed to fetch onboarding:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveStep = async (action: 'complete' | 'skip' | 'save') => {
    if (!token) return;
    setSaving(true);
    try {
      const step = steps[currentStepIndex];

      const res = await fetch('/api/crm-site/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantSlug,
          stepId: step.id,
          stepData: formData[step.id],
          action,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCompletedSteps(data.progress.completedSteps || []);
        setSkippedSteps(data.progress.skippedSteps || []);
        setPercentComplete(data.percentComplete);

        if (data.isComplete) {
          // Show success then redirect
          setTimeout(() => router.push('/admin/crm'), 1500);
        } else if (action !== 'save' && currentStepIndex < steps.length - 1) {
          setCurrentStepIndex(prev => prev + 1);
        }
      }
    } catch (err) {
      console.error('Failed to save step:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (stepId: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [stepId]: { ...prev[stepId], [field]: value },
    }));
  };

  const currentStep = steps[currentStepIndex];
  const StepIcon = currentStep ? ICON_MAP[currentStep.icon] || Building2 : Building2;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Setup Wizard
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Swar Yoga CRM</h1>
          <p className="text-gray-600">Let's get your CRM set up in a few simple steps</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Setup Progress</span>
            <span className="font-semibold">{percentComplete}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>

        {/* Step Navigation */}
        <div className="flex items-center justify-center gap-2 mb-8 overflow-x-auto pb-2">
          {steps.map((step, idx) => {
            const Icon = ICON_MAP[step.icon] || Building2;
            const isCompleted = completedSteps.includes(step.id);
            const isSkipped = skippedSteps.includes(step.id);
            const isCurrent = idx === currentStepIndex;

            return (
              <button
                key={step.id}
                onClick={() => setCurrentStepIndex(idx)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : isCompleted
                    ? 'bg-green-100 text-green-700'
                    : isSkipped
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{step.title}</span>
              </button>
            );
          })}
        </div>

        {/* Step Content */}
        {currentStep && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-indigo-100 rounded-xl">
                <StepIcon className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{currentStep.title}</h2>
                <p className="text-gray-500">{currentStep.description}</p>
              </div>
              {!currentStep.required && (
                <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                  Optional
                </span>
              )}
            </div>

            {/* Step Forms */}
            {currentStep.id === 'business' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
                  <input
                    type="text"
                    value={formData.business.businessName}
                    onChange={e => updateFormData('business', 'businessName', e.target.value)}
                    placeholder="Your Business Name"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry *</label>
                  <select
                    value={formData.business.industry}
                    onChange={e => updateFormData('business', 'industry', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Select your industry</option>
                    {INDUSTRIES.map(ind => (
                      <option key={ind.value} value={ind.value}>{ind.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Team Size</label>
                  <div className="grid grid-cols-3 gap-2">
                    {TEAM_SIZES.map(size => (
                      <button
                        key={size.value}
                        type="button"
                        onClick={() => updateFormData('business', 'teamSize', size.value)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                          formData.business.teamSize === size.value
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    value={formData.business.website}
                    onChange={e => updateFormData('business', 'website', e.target.value)}
                    placeholder="https://yourbusiness.com"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {currentStep.id === 'branding' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color Scheme</label>
                  <div className="grid grid-cols-3 gap-3">
                    {COLOR_PRESETS.map(preset => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          updateFormData('branding', 'primaryColor', preset.primary);
                          updateFormData('branding', 'accentColor', preset.accent);
                        }}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          formData.branding.primaryColor === preset.primary
                            ? 'border-indigo-500 shadow-lg'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full" style={{ backgroundColor: preset.primary }} />
                          <div className="w-6 h-6 rounded-full" style={{ backgroundColor: preset.accent }} />
                        </div>
                        <span className="text-sm font-medium">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.branding.primaryColor}
                        onChange={e => updateFormData('branding', 'primaryColor', e.target.value)}
                        className="w-12 h-12 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.branding.primaryColor}
                        onChange={e => updateFormData('branding', 'primaryColor', e.target.value)}
                        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Accent Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.branding.accentColor}
                        onChange={e => updateFormData('branding', 'accentColor', e.target.value)}
                        className="w-12 h-12 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.branding.accentColor}
                        onChange={e => updateFormData('branding', 'accentColor', e.target.value)}
                        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                  <input
                    type="url"
                    value={formData.branding.logo}
                    onChange={e => updateFormData('branding', 'logo', e.target.value)}
                    placeholder="https://yourbusiness.com/logo.png"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                {/* Preview */}
                <div className="p-4 rounded-xl" style={{ backgroundColor: formData.branding.primaryColor + '15' }}>
                  <p className="text-sm text-gray-600 mb-2">Preview:</p>
                  <div className="flex items-center gap-3">
                    {formData.branding.logo && (
                      <img src={formData.branding.logo} alt="Logo" className="w-10 h-10 object-contain" />
                    )}
                    <span className="font-bold" style={{ color: formData.branding.primaryColor }}>
                      {formData.business.businessName || 'Your Business'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {currentStep.id === 'whatsapp' && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-100 rounded-xl mb-4">
                  <p className="text-sm text-green-700">
                    Connect your WhatsApp Business API to send automated messages and broadcasts.
                    You can get these credentials from your Meta Business account.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Phone Number ID</label>
                  <input
                    type="text"
                    value={formData.whatsapp.whatsappPhoneId}
                    onChange={e => updateFormData('whatsapp', 'whatsappPhoneId', e.target.value)}
                    placeholder="Enter Phone Number ID from Meta"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Access Token</label>
                  <input
                    type="password"
                    value={formData.whatsapp.whatsappToken}
                    onChange={e => updateFormData('whatsapp', 'whatsappToken', e.target.value)}
                    placeholder="Enter Access Token from Meta"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Business Account ID</label>
                  <input
                    type="text"
                    value={formData.whatsapp.whatsappBusinessId}
                    onChange={e => updateFormData('whatsapp', 'whatsappBusinessId', e.target.value)}
                    placeholder="Enter Business Account ID (optional)"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {currentStep.id === 'team' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Invite team members to collaborate on your CRM. They'll receive an email invitation.
                </p>
                {formData.team.invites.map((invite: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input
                      type="email"
                      value={invite.email}
                      onChange={e => {
                        const newInvites = [...formData.team.invites];
                        newInvites[idx].email = e.target.value;
                        updateFormData('team', 'invites', newInvites);
                      }}
                      placeholder="teammate@company.com"
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <select
                      value={invite.role}
                      onChange={e => {
                        const newInvites = [...formData.team.invites];
                        newInvites[idx].role = e.target.value;
                        updateFormData('team', 'invites', newInvites);
                      }}
                      className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="user">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const newInvites = [...formData.team.invites, { email: '', role: 'user' }];
                    updateFormData('team', 'invites', newInvites);
                  }}
                  className="text-indigo-600 text-sm font-medium hover:text-indigo-700"
                >
                  + Add another team member
                </button>
              </div>
            )}

            {currentStep.id === 'import' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Import your existing leads from a CSV file. We support exports from most CRM systems.
                </p>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Drop your CSV file here or click to browse</p>
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) updateFormData('import', 'file', file);
                    }}
                    className="hidden"
                    id="import-file"
                  />
                  <label
                    htmlFor="import-file"
                    className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg cursor-pointer hover:bg-indigo-200 transition"
                  >
                    Select File
                  </label>
                </div>
                {formData.import.file && (
                  <p className="text-sm text-green-600">
                    ✓ Selected: {formData.import.file.name}
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
                disabled={currentStepIndex === 0}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>

              <div className="flex items-center gap-3">
                {!currentStep.required && (
                  <button
                    onClick={() => saveStep('skip')}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-gray-700"
                  >
                    <SkipForward className="w-4 h-4" />
                    Skip
                  </button>
                )}
                <button
                  onClick={() => saveStep('complete')}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {currentStepIndex === steps.length - 1 ? 'Complete Setup' : 'Continue'}
                  {!saving && <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
