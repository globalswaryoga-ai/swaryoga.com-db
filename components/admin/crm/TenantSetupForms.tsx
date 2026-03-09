'use client';

import React, { useState } from 'react';
import {
  Building2, Upload, Palette, Mail, Phone, User, Globe, Link,
  Check, AlertCircle, Loader2, Eye, EyeOff
} from 'lucide-react';

interface BusinessSetupFormProps {
  data: any;
  onSave: (data: any, markComplete: boolean) => Promise<void>;
  loading?: boolean;
}

export function BusinessSetupForm({ data, onSave, loading }: BusinessSetupFormProps) {
  const [form, setForm] = useState({
    businessName: data?.businessName || '',
    logo: data?.logo || '',
    primaryColor: data?.primaryColor || '#3B82F6',
    secondaryColor: data?.secondaryColor || '#6366F1',
    adminName: data?.adminName || '',
    adminEmail: data?.adminEmail || '',
    adminPhone: data?.adminPhone || '',
    industry: data?.industry || '',
    website: data?.website || '',
    address: data?.address || '',
    timezone: data?.timezone || 'Asia/Kolkata',
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
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Building2 className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Business Details</h3>
          <p className="text-sm text-gray-500">Basic information about your business</p>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="p-4 bg-red-50 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              {errors.map((err, i) => (
                <p key={i} className="text-sm text-red-600">{err}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6">
        {/* Business Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Your Business Name"
          />
        </div>

        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
          <div className="flex items-center gap-4">
            {form.logo ? (
              <img src={form.logo} alt="Logo" className="w-16 h-16 rounded-lg object-cover border" />
            ) : (
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <label className="cursor-pointer">
              <div className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 inline-flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Logo
              </div>
              <input
                type="file"
                accept="image/png,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => setForm({ ...form, logo: ev.target?.result as string });
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
            <span className="text-xs text-gray-500">PNG or SVG, max 2MB</span>
          </div>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Color <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.primaryColor}
                onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer"
              />
              <input
                type="text"
                value={form.primaryColor}
                onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                className="flex-1 px-4 py-2 border rounded-lg uppercase"
                placeholder="#3B82F6"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Secondary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.secondaryColor}
                onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer"
              />
              <input
                type="text"
                value={form.secondaryColor}
                onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                className="flex-1 px-4 py-2 border rounded-lg uppercase"
                placeholder="#6366F1"
              />
            </div>
          </div>
        </div>

        <hr />

        {/* Admin Contact */}
        <h4 className="font-medium text-gray-900">Admin Contact</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={form.adminName}
                onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="John Doe"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={form.adminEmail}
                onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="admin@example.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin Phone <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={form.adminPhone}
                onChange={(e) => setForm({ ...form, adminPhone: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="9876543210"
              />
            </div>
          </div>
        </div>
      </div>

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
          Complete Setup
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// DOMAIN SETUP FORM
// ============================================================================

interface DomainSetupFormProps {
  data: any;
  tenantSlug: string;
  onSave: (data: any, markComplete: boolean) => Promise<void>;
  loading?: boolean;
}

export function DomainSetupForm({ data, tenantSlug, onSave, loading }: DomainSetupFormProps) {
  const [form, setForm] = useState({
    subdomain: data?.subdomain || tenantSlug,
    useCustomDomain: data?.useCustomDomain || false,
    customDomain: data?.customDomain || '',
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
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Globe className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Domain Setup</h3>
          <p className="text-sm text-gray-500">Configure your CRM access URL</p>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="p-4 bg-red-50 rounded-lg">
          {errors.map((err, i) => (
            <p key={i} className="text-sm text-red-600">{err}</p>
          ))}
        </div>
      )}

      <div className="space-y-6">
        {/* Subdomain */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subdomain <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center">
            <input
              type="text"
              value={form.subdomain}
              onChange={(e) => setForm({ ...form, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
              className="flex-1 px-4 py-2 border rounded-l-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="yourbusiness"
            />
            <span className="px-4 py-2 bg-gray-100 border border-l-0 rounded-r-lg text-gray-500">
              .swaryoga.com
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Your CRM will be accessible at: <strong>{form.subdomain || 'yourbusiness'}.swaryoga.com</strong>
          </p>
        </div>

        {/* Custom Domain Toggle */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.useCustomDomain}
              onChange={(e) => setForm({ ...form, useCustomDomain: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
            />
            <div>
              <span className="font-medium text-gray-900">Use Custom Domain</span>
              <p className="text-sm text-gray-500">Connect your own domain (e.g., crm.yourbusiness.com)</p>
            </div>
          </label>

          {form.useCustomDomain && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Domain
              </label>
              <div className="relative">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={form.customDomain}
                  onChange={(e) => setForm({ ...form, customDomain: e.target.value.toLowerCase() })}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="crm.yourbusiness.com"
                />
              </div>
              
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">DNS Configuration Required</h4>
                <p className="text-sm text-yellow-700 mb-2">
                  Add this CNAME record to your DNS settings:
                </p>
                <div className="bg-white p-3 rounded font-mono text-sm">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-gray-500">Type:</span>
                    <span className="col-span-2">CNAME</span>
                    <span className="text-gray-500">Name:</span>
                    <span className="col-span-2">{form.customDomain.split('.')[0] || 'crm'}</span>
                    <span className="text-gray-500">Value:</span>
                    <span className="col-span-2">crm.swaryoga.com</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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
          Complete Setup
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// WHATSAPP SETUP FORM
// ============================================================================

interface WhatsAppSetupFormProps {
  data: any;
  tenantSlug: string;
  token: string;
  onSave: (data: any, markComplete: boolean) => Promise<void>;
  loading?: boolean;
}

export function WhatsAppSetupForm({ data, tenantSlug, token, onSave, loading }: WhatsAppSetupFormProps) {
  const [form, setForm] = useState({
    phoneNumberId: data?.phoneNumberId || '',
    accessToken: data?.accessToken || '',
    metaAppId: data?.metaAppId || '',
    metaAppSecret: data?.metaAppSecret || '',
    businessAccountId: data?.businessAccountId || '',
    templates: data?.templates || [],
  });
  const [showSecrets, setShowSecrets] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const testConnection = async () => {
    setTesting(true);
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
          action: 'test-whatsapp',
          data: {
            phoneNumberId: form.phoneNumberId,
            accessToken: form.accessToken,
          },
        }),
      });
      const result = await res.json();
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const fetchTemplates = async () => {
    if (!form.businessAccountId || !form.accessToken) {
      setErrors(['Business Account ID and Access Token required to fetch templates']);
      return;
    }
    
    try {
      const res = await fetch('/api/crm-site/tenant-setup', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantSlug,
          action: 'fetch-templates',
          data: {
            businessAccountId: form.businessAccountId,
            accessToken: form.accessToken,
          },
        }),
      });
      const result = await res.json();
      if (result.success) {
        setForm({ ...form, templates: result.templates });
      } else {
        setErrors([result.error]);
      }
    } catch (err: any) {
      setErrors([err.message]);
    }
  };

  const handleSubmit = async (markComplete: boolean) => {
    setErrors([]);
    try {
      await onSave({ ...form, isConnected: testResult?.success || data?.isConnected }, markComplete);
    } catch (err: any) {
      setErrors(err.details || [err.message]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="p-2 bg-green-100 rounded-lg">
          <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">WhatsApp Integration</h3>
          <p className="text-sm text-gray-500">Connect WhatsApp Business API</p>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="p-4 bg-red-50 rounded-lg">
          {errors.map((err, i) => (
            <p key={i} className="text-sm text-red-600">{err}</p>
          ))}
        </div>
      )}

      {testResult && (
        <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
          {testResult.success ? (
            <div className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-600">Connection Successful!</p>
                {testResult.data && (
                  <div className="text-sm text-green-700 mt-1">
                    <p>Phone: {testResult.data.displayPhoneNumber}</p>
                    <p>Name: {testResult.data.verifiedName}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              <p className="text-sm text-red-600">{testResult.error}</p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            WhatsApp Phone Number ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.phoneNumberId}
            onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="123456789012345"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Access Token (Permanent) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showSecrets ? 'text' : 'password'}
              value={form.accessToken}
              onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 pr-10"
              placeholder="EAAxxxxxx..."
            />
            <button
              type="button"
              onClick={() => setShowSecrets(!showSecrets)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meta App ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.metaAppId}
              onChange={(e) => setForm({ ...form, metaAppId: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Meta App ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meta App Secret <span className="text-red-500">*</span>
            </label>
            <input
              type={showSecrets ? 'text' : 'password'}
              value={form.metaAppSecret}
              onChange={(e) => setForm({ ...form, metaAppSecret: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="App Secret"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Account ID (for templates)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.businessAccountId}
              onChange={(e) => setForm({ ...form, businessAccountId: e.target.value })}
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Business Account ID"
            />
            <button
              onClick={fetchTemplates}
              disabled={!form.businessAccountId}
              className="px-4 py-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
            >
              Fetch Templates
            </button>
          </div>
        </div>

        {/* Templates List */}
        {form.templates.length > 0 && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">
              Approved Templates ({form.templates.filter((t: any) => t.status === 'APPROVED').length})
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {form.templates.map((template: any) => (
                <div key={template.id || template.name} className="flex items-center justify-between text-sm">
                  <span>{template.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    template.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    template.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {template.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <button
          onClick={testConnection}
          disabled={testing || !form.phoneNumberId || !form.accessToken}
          className="px-4 py-2 text-green-700 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Test Connection
        </button>
        <div className="flex gap-3">
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
            Complete Setup
          </button>
        </div>
      </div>
    </div>
  );
}
