'use client';

import React, { useState } from 'react';
import {
  CreditCard, Megaphone, Phone, Users, Plus, Trash2, Check,
  AlertCircle, Loader2, Eye, EyeOff, ExternalLink
} from 'lucide-react';
import { DEFAULT_ROLES, SUPPORTED_LANGUAGES } from '@/lib/crm-site/tenantSetupConfig';

// ============================================================================
// PAYMENT SETUP FORM
// ============================================================================

interface PaymentSetupFormProps {
  data: any;
  tenantSlug: string;
  token: string;
  onSave: (data: any, markComplete: boolean) => Promise<void>;
  loading?: boolean;
}

export function PaymentSetupForm({ data, tenantSlug, token, onSave, loading }: PaymentSetupFormProps) {
  const [form, setForm] = useState({
    provider: data?.provider || 'none',
    cashfree: {
      clientId: data?.cashfree?.clientId || '',
      clientSecret: data?.cashfree?.clientSecret || '',
      environment: data?.cashfree?.environment || 'sandbox',
      isVerified: data?.cashfree?.isVerified || false,
    },
    payu: {
      merchantKey: data?.payu?.merchantKey || '',
      merchantSalt: data?.payu?.merchantSalt || '',
      environment: data?.payu?.environment || 'sandbox',
      isVerified: data?.payu?.isVerified || false,
    },
    currency: data?.currency || 'INR',
    enabledMethods: data?.enabledMethods || ['upi', 'card', 'netbanking'],
  });
  const [showSecrets, setShowSecrets] = useState(false);
  const [testing, setTesting] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const testCashfree = async () => {
    setTesting('cashfree');
    setTestResult(null);
    try {
      const res = await fetch('/api/crm-site/tenant-setup', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantSlug,
          action: 'test-cashfree',
          data: {
            clientId: form.cashfree.clientId,
            clientSecret: form.cashfree.clientSecret,
            environment: form.cashfree.environment,
          },
        }),
      });
      const result = await res.json();
      setTestResult({ provider: 'cashfree', ...result });
      if (result.success) {
        setForm({
          ...form,
          cashfree: { ...form.cashfree, isVerified: true },
        });
      }
    } catch (err: any) {
      setTestResult({ provider: 'cashfree', success: false, error: err.message });
    } finally {
      setTesting('');
    }
  };

  const handleSubmit = async (markComplete: boolean) => {
    setErrors([]);
    try {
      await onSave(form, markComplete);
    } catch (err: any) {
      setErrors(err.details || [err.message]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="p-2 bg-purple-100 rounded-lg">
          <CreditCard className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Payment Gateway</h3>
          <p className="text-sm text-gray-500">Setup payment collection for your CRM</p>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="p-4 bg-red-50 rounded-lg">
          {errors.map((err, i) => (
            <p key={i} className="text-sm text-red-600">{err}</p>
          ))}
        </div>
      )}

      {/* Provider Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payment Provider
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['none', 'cashfree', 'payu', 'both'].map((provider) => (
            <button
              key={provider}
              onClick={() => setForm({ ...form, provider })}
              className={`p-4 border-2 rounded-lg text-center transition-all ${
                form.provider === provider
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-sm font-medium capitalize">
                {provider === 'none' ? 'Skip' : provider === 'both' ? 'Both' : provider}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Cashfree Config */}
      {(form.provider === 'cashfree' || form.provider === 'both') && (
        <div className="p-4 bg-gray-50 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Cashfree Configuration</h4>
            {form.cashfree.isVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                <Check className="w-3 h-3" /> Verified
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.cashfree.clientId}
                onChange={(e) => setForm({
                  ...form,
                  cashfree: { ...form.cashfree, clientId: e.target.value, isVerified: false },
                })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="CF_xxx"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Secret <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showSecrets ? 'text' : 'password'}
                  value={form.cashfree.clientSecret}
                  onChange={(e) => setForm({
                    ...form,
                    cashfree: { ...form.cashfree, clientSecret: e.target.value, isVerified: false },
                  })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 pr-10"
                  placeholder="Secret"
                />
                <button
                  type="button"
                  onClick={() => setShowSecrets(!showSecrets)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
              <select
                value={form.cashfree.environment}
                onChange={(e) => setForm({
                  ...form,
                  cashfree: { ...form.cashfree, environment: e.target.value as any },
                })}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="sandbox">Sandbox (Testing)</option>
                <option value="production">Production</option>
              </select>
            </div>
            <button
              onClick={testCashfree}
              disabled={testing === 'cashfree' || !form.cashfree.clientId || !form.cashfree.clientSecret}
              className="px-4 py-2 text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {testing === 'cashfree' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Test Credentials
            </button>
          </div>
          
          {testResult?.provider === 'cashfree' && (
            <div className={`p-3 rounded-lg ${testResult.success ? 'bg-green-100' : 'bg-red-100'}`}>
              <p className={`text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                {testResult.success ? 'Credentials verified successfully!' : testResult.error}
              </p>
            </div>
          )}
        </div>
      )}

      {/* PayU Config */}
      {(form.provider === 'payu' || form.provider === 'both') && (
        <div className="p-4 bg-gray-50 rounded-lg space-y-4">
          <h4 className="font-medium text-gray-900">PayU Configuration</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Merchant Key <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.payu.merchantKey}
                onChange={(e) => setForm({
                  ...form,
                  payu: { ...form.payu, merchantKey: e.target.value },
                })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Merchant Key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Merchant Salt <span className="text-red-500">*</span>
              </label>
              <input
                type={showSecrets ? 'text' : 'password'}
                value={form.payu.merchantSalt}
                onChange={(e) => setForm({
                  ...form,
                  payu: { ...form.payu, merchantSalt: e.target.value },
                })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Salt"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
            <select
              value={form.payu.environment}
              onChange={(e) => setForm({
                ...form,
                payu: { ...form.payu, environment: e.target.value as any },
              })}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="sandbox">Sandbox (Testing)</option>
              <option value="production">Production</option>
            </select>
          </div>
        </div>
      )}

      {/* Payment Methods */}
      {form.provider !== 'none' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enabled Payment Methods
          </label>
          <div className="flex flex-wrap gap-2">
            {['upi', 'card', 'netbanking', 'wallet'].map((method) => (
              <label key={method} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={form.enabledMethods.includes(method)}
                  onChange={(e) => {
                    const methods = e.target.checked
                      ? [...form.enabledMethods, method]
                      : form.enabledMethods.filter((m: string) => m !== method);
                    setForm({ ...form, enabledMethods: methods });
                  }}
                  className="w-4 h-4 text-purple-600 rounded"
                />
                <span className="text-sm capitalize">{method}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          onClick={() => handleSubmit(false)}
          disabled={loading}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
        >
          Save Draft
        </button>
        <button
          onClick={() => handleSubmit(true)}
          disabled={loading}
          className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {form.provider === 'none' ? 'Skip This Step' : 'Complete Setup'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// LEAD ADS SETUP FORM
// ============================================================================

interface LeadAdsSetupFormProps {
  data: any;
  onSave: (data: any, markComplete: boolean) => Promise<void>;
  loading?: boolean;
}

export function LeadAdsSetupForm({ data, onSave, loading }: LeadAdsSetupFormProps) {
  const [form, setForm] = useState({
    enabled: data?.enabled || false,
    metaPageId: data?.metaPageId || '',
    metaPageAccessToken: data?.metaPageAccessToken || '',
    pageName: data?.pageName || '',
    adAccountId: data?.adAccountId || '',
  });
  const [showToken, setShowToken] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = async (markComplete: boolean) => {
    setErrors([]);
    try {
      await onSave(form, markComplete);
    } catch (err: any) {
      setErrors(err.details || [err.message]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Megaphone className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Lead Ads Integration</h3>
          <p className="text-sm text-gray-500">Capture leads from Meta Lead Ads automatically</p>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="p-4 bg-red-50 rounded-lg">
          {errors.map((err, i) => (
            <p key={i} className="text-sm text-red-600">{err}</p>
          ))}
        </div>
      )}

      {/* Enable Toggle */}
      <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer">
        <input
          type="checkbox"
          checked={form.enabled}
          onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          className="w-5 h-5 text-indigo-600 rounded"
        />
        <div>
          <span className="font-medium text-gray-900">Enable Lead Ads Integration</span>
          <p className="text-sm text-gray-500">Automatically sync leads from your Meta Lead Ads forms</p>
        </div>
      </label>

      {form.enabled && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meta Page ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.metaPageId}
              onChange={(e) => setForm({ ...form, metaPageId: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="123456789012345"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Page Access Token <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={form.metaPageAccessToken}
                onChange={(e) => setForm({ ...form, metaPageAccessToken: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 pr-10"
                placeholder="Page Access Token"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <h4 className="text-sm font-medium text-indigo-800 mb-2">How to get Page Access Token</h4>
            <ol className="text-sm text-indigo-700 list-decimal list-inside space-y-1">
              <li>Go to Meta Business Suite → Settings → Business Assets</li>
              <li>Select your Page → Generate Token</li>
              <li>Grant "leads_retrieval" and "pages_manage_metadata" permissions</li>
            </ol>
            <a
              href="https://developers.facebook.com/docs/pages/access-tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-sm text-indigo-600 hover:underline"
            >
              Learn more <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          onClick={() => handleSubmit(false)}
          disabled={loading}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
        >
          Save Draft
        </button>
        <button
          onClick={() => handleSubmit(true)}
          disabled={loading}
          className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {form.enabled ? 'Complete Setup' : 'Skip This Step'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// AI CALLING SETUP FORM
// ============================================================================

interface AICallingSetupFormProps {
  data: any;
  onSave: (data: any, markComplete: boolean) => Promise<void>;
  loading?: boolean;
}

export function AICallingSetupForm({ data, onSave, loading }: AICallingSetupFormProps) {
  const [form, setForm] = useState({
    enabled: data?.enabled || false,
    preferredLanguages: data?.preferredLanguages || ['en-IN', 'hi-IN'],
    callScript: data?.callScript || '',
    welcomeMessage: data?.welcomeMessage || 'Hello! Thank you for your interest in our services.',
    fallbackMessage: data?.fallbackMessage || 'Let me transfer you to a human agent.',
    maxCallDuration: data?.maxCallDuration || 300,
    callRecording: data?.callRecording ?? true,
  });
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = async (markComplete: boolean) => {
    setErrors([]);
    try {
      await onSave(form, markComplete);
    } catch (err: any) {
      setErrors(err.details || [err.message]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="p-2 bg-orange-100 rounded-lg">
          <Phone className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">AI Calling Setup</h3>
          <p className="text-sm text-gray-500">Configure voice AI agents for automated calls</p>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="p-4 bg-red-50 rounded-lg">
          {errors.map((err, i) => (
            <p key={i} className="text-sm text-red-600">{err}</p>
          ))}
        </div>
      )}

      {/* Enable Toggle */}
      <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer">
        <input
          type="checkbox"
          checked={form.enabled}
          onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          className="w-5 h-5 text-orange-600 rounded"
        />
        <div>
          <span className="font-medium text-gray-900">Enable AI Calling</span>
          <p className="text-sm text-gray-500">Use voice AI to make automated outbound calls</p>
        </div>
      </label>

      {form.enabled && (
        <div className="space-y-4">
          {/* Languages */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Languages
            </label>
            <div className="flex flex-wrap gap-2">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <label key={lang.code} className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={form.preferredLanguages.includes(lang.code)}
                    onChange={(e) => {
                      const langs = e.target.checked
                        ? [...form.preferredLanguages, lang.code]
                        : form.preferredLanguages.filter((l: string) => l !== lang.code);
                      setForm({ ...form, preferredLanguages: langs });
                    }}
                    className="w-4 h-4 text-orange-600 rounded"
                  />
                  <span className="text-sm">{lang.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Call Script */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Call Script / AI Prompt
            </label>
            <textarea
              value={form.callScript}
              onChange={(e) => setForm({ ...form, callScript: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
              placeholder="You are a friendly sales assistant for [Business Name]. Your goal is to qualify leads and schedule demo calls..."
            />
            <p className="mt-1 text-xs text-gray-500">
              This prompt will guide the AI agent's conversation style and objectives
            </p>
          </div>

          {/* Welcome Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Welcome Message
            </label>
            <input
              type="text"
              value={form.welcomeMessage}
              onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
              placeholder="Hello! Thank you for your interest..."
            />
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Call Duration (seconds)
              </label>
              <input
                type="number"
                value={form.maxCallDuration}
                onChange={(e) => setForm({ ...form, maxCallDuration: parseInt(e.target.value) || 300 })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                min={60}
                max={900}
              />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={form.callRecording}
                  onChange={(e) => setForm({ ...form, callRecording: e.target.checked })}
                  className="w-4 h-4 text-orange-600 rounded"
                />
                <span className="text-sm">Enable Call Recording</span>
              </label>
            </div>
          </div>

          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-700">
              <strong>Note:</strong> AI agents will be created by our team based on your configuration.
              You'll receive notification once they're ready.
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          onClick={() => handleSubmit(false)}
          disabled={loading}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
        >
          Save Draft
        </button>
        <button
          onClick={() => handleSubmit(true)}
          disabled={loading}
          className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {form.enabled ? 'Complete Setup' : 'Skip This Step'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// TEAM SETUP FORM
// ============================================================================

interface TeamMember {
  id?: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
}

interface TeamSetupFormProps {
  data: any;
  onSave: (data: any, markComplete: boolean) => Promise<void>;
  loading?: boolean;
}

export function TeamSetupForm({ data, onSave, loading }: TeamSetupFormProps) {
  const [members, setMembers] = useState<TeamMember[]>(data?.members || []);
  const [newMember, setNewMember] = useState<TeamMember>({
    name: '',
    email: '',
    phone: '',
    role: 'agent',
    isActive: true,
  });
  const [errors, setErrors] = useState<string[]>([]);

  const addMember = () => {
    if (!newMember.name || !newMember.email || !newMember.phone) {
      setErrors(['Please fill all required fields']);
      return;
    }
    setMembers([...members, { ...newMember, id: `temp_${Date.now()}` }]);
    setNewMember({ name: '', email: '', phone: '', role: 'agent', isActive: true });
    setErrors([]);
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const handleSubmit = async (markComplete: boolean) => {
    setErrors([]);
    try {
      await onSave({ members, roles: DEFAULT_ROLES, invitePending: [] }, markComplete);
    } catch (err: any) {
      setErrors(err.details || [err.message]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Users className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Team Setup</h3>
          <p className="text-sm text-gray-500">Add team members and assign roles</p>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="p-4 bg-red-50 rounded-lg">
          {errors.map((err, i) => (
            <p key={i} className="text-sm text-red-600">{err}</p>
          ))}
        </div>
      )}

      {/* Add New Member */}
      <div className="p-4 bg-gray-50 rounded-lg space-y-4">
        <h4 className="font-medium text-gray-900">Add Team Member</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={newMember.name}
              onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={newMember.email}
              onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
            <input
              type="tel"
              value={newMember.phone}
              onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="9876543210"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={newMember.role}
              onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              {DEFAULT_ROLES.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={addMember}
          className="inline-flex items-center gap-2 px-4 py-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
        >
          <Plus className="w-4 h-4" /> Add Member
        </button>
      </div>

      {/* Members List */}
      {members.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Team Members ({members.length})</h4>
          <div className="space-y-2">
            {members.map((member, index) => (
              <div key={member.id || index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-indigo-600">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{member.name}</p>
                    <p className="text-sm text-gray-500">{member.email} · {member.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded capitalize">
                    {DEFAULT_ROLES.find(r => r.id === member.role)?.name || member.role}
                  </span>
                  <button
                    onClick={() => removeMember(index)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {members.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>No team members added yet</p>
          <p className="text-sm">Add team members above or skip this step</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          onClick={() => handleSubmit(false)}
          disabled={loading}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
        >
          Save Draft
        </button>
        <button
          onClick={() => handleSubmit(true)}
          disabled={loading}
          className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {members.length > 0 ? 'Complete Setup' : 'Skip This Step'}
        </button>
      </div>
    </div>
  );
}
