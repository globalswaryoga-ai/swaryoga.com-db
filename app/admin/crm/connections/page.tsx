'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, getLoginPath } from '@/hooks/useAuth';
import {
  Settings, Mail, MessageCircle, Globe, Link2, SmartphoneNfc,
  Phone, QrCode, Calculator, CreditCard, User, CheckCircle2,
  XCircle, Loader2, ChevronDown, ChevronUp, AlertTriangle, Info
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================
interface ConnectionData {
  userDetails: {
    businessName: string; contactName: string; contactPhone: string;
    contactEmail: string; address: string; connected: boolean;
  };
  email: {
    provider: string; smtpHost: string; smtpPort: number;
    smtpUser: string; smtpPass: string; fromEmail: string;
    fromName: string; apiKey: string; connected: boolean; error: string;
  };
  metaWhatsApp: {
    phoneNumberId: string; accessToken: string; businessAccountId: string;
    webhookVerifyToken: string; appId: string; connected: boolean; error: string;
  };
  community: {
    groupName: string; platform: string; groupLink: string;
    connected: boolean; error: string;
  };
  domain: {
    existingDomain: string; wantToBuy: boolean; desiredDomain: string;
    status: string; connected: boolean; error: string;
  };
  sms: {
    provider: string; apiKey: string; senderId: string;
    panNumber: string; panName: string; entityId: string;
    connected: boolean; error: string;
  };
  call: {
    provider: string; apiKey: string; apiSecret: string;
    callerId: string; sipDomain: string; virtualNumber: string;
    connected: boolean; error: string;
  };
  qrWhatsApp: {
    bridgeUrl: string; bridgeSecret: string;
    connected: boolean; error: string;
  };
  tally: {
    companyName: string; gstRegistered: boolean; gstNumber: string;
    tallySerialNumber: string; tallyLicenseKey: string;
    billingPlan: string; connected: boolean; error: string;
  };
  payment: {
    provider: string; apiKey: string; apiSecret: string;
    merchantId: string; connected: boolean; error: string;
  };
}

const DEFAULTS: ConnectionData = {
  userDetails: { businessName: '', contactName: '', contactPhone: '', contactEmail: '', address: '', connected: false },
  email: { provider: 'smtp', smtpHost: '', smtpPort: 587, smtpUser: '', smtpPass: '', fromEmail: '', fromName: '', apiKey: '', connected: false, error: '' },
  metaWhatsApp: { phoneNumberId: '', accessToken: '', businessAccountId: '', webhookVerifyToken: '', appId: '', connected: false, error: '' },
  community: { groupName: '', platform: 'whatsapp', groupLink: '', connected: false, error: '' },
  domain: { existingDomain: '', wantToBuy: false, desiredDomain: '', status: 'not-configured', connected: false, error: '' },
  sms: { provider: 'msg91', apiKey: '', senderId: '', panNumber: '', panName: '', entityId: '', connected: false, error: '' },
  call: { provider: 'exotel', apiKey: '', apiSecret: '', callerId: '', sipDomain: '', virtualNumber: '', connected: false, error: '' },
  qrWhatsApp: { bridgeUrl: '', bridgeSecret: '', connected: false, error: '' },
  tally: { companyName: '', gstRegistered: false, gstNumber: '', tallySerialNumber: '', tallyLicenseKey: '', billingPlan: 'non-gst-free', connected: false, error: '' },
  payment: { provider: 'cashfree', apiKey: '', apiSecret: '', merchantId: '', connected: false, error: '' },
};

type ServiceKey = keyof ConnectionData;

// ============================================================================
// Main Page
// ============================================================================
export default function ConnectionsHubPage() {
  const token = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ConnectionData>(DEFAULTS);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [testingService, setTestingService] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['userDetails']));

  // Success popup
  const [showSuccessPopup, setShowSuccessPopup] = useState<{ service: string; name: string } | null>(null);

  const getToken = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
  }, []);

  // Load connections on mount
  useEffect(() => {
    const t = getToken();
    if (!t) return;

    (async () => {
      try {
        const res = await fetch('/api/admin/crm/connections', {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.connection) {
            setData(prev => ({
              ...prev,
              ...json.connection,
              userDetails: { ...prev.userDetails, ...json.connection.userDetails },
              email: { ...prev.email, ...json.connection.email },
              metaWhatsApp: { ...prev.metaWhatsApp, ...json.connection.metaWhatsApp },
              community: { ...prev.community, ...json.connection.community },
              domain: { ...prev.domain, ...json.connection.domain },
              sms: { ...prev.sms, ...json.connection.sms },
              call: { ...prev.call, ...json.connection.call },
              qrWhatsApp: { ...prev.qrWhatsApp, ...json.connection.qrWhatsApp },
              tally: { ...prev.tally, ...json.connection.tally },
              payment: { ...prev.payment, ...json.connection.payment },
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load connections:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken]);

  // Auto-dismiss toasts
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const copy = new Set(prev);
      if (copy.has(key)) copy.delete(key); else copy.add(key);
      return copy;
    });
  };

  const updateField = (section: ServiceKey, field: string, value: any) => {
    setData(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  // Save all connections
  const saveAll = async () => {
    const t = getToken();
    if (!t) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/crm/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        setToast({ type: 'success', text: '✅ All settings saved successfully!' });
      } else {
        setToast({ type: 'error', text: json.error || 'Save failed' });
      }
    } catch {
      setToast({ type: 'error', text: 'Network error — please try again.' });
    } finally {
      setSaving(false);
    }
  };

  // Test a specific connection
  const testConnection = async (service: ServiceKey, displayName: string) => {
    const t = getToken();
    if (!t) return;

    // First save, then test
    setTestingService(service);
    try {
      // Save first
      await fetch('/api/admin/crm/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify(data),
      });

      // Then test
      const res = await fetch('/api/admin/crm/connections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ service }),
      });
      const json = await res.json();

      if (json.connected) {
        setShowSuccessPopup({ service, name: displayName });
        setData(prev => ({
          ...prev,
          [service]: { ...prev[service], connected: true, error: '' },
        }));
      } else {
        setData(prev => ({
          ...prev,
          [service]: { ...prev[service], connected: false, error: json.error || 'Connection failed' },
        }));
        setToast({ type: 'error', text: `❌ ${displayName} connection failed` });
      }
    } catch {
      setToast({ type: 'error', text: 'Network error during test' });
    } finally {
      setTestingService(null);
    }
  };

  // ============================================================================
  // Service sections config
  // ============================================================================
  const sections: {
    key: ServiceKey;
    title: string;
    icon: React.ElementType;
    description: string;
    connected: boolean;
    helpNote: string;
  }[] = [
    { key: 'userDetails', title: 'User / Business Details', icon: User, description: 'Your business information', connected: data.userDetails.connected, helpNote: 'Add your business name, contact details to identify your account.' },
    { key: 'email', title: 'Email Service', icon: Mail, description: 'SMTP or email API for sending emails', connected: data.email.connected, helpNote: 'Get SMTP credentials from your email provider (Gmail, SendGrid, Mailgun, AWS SES).' },
    { key: 'metaWhatsApp', title: 'Meta WhatsApp', icon: MessageCircle, description: 'Meta Cloud API credentials', connected: data.metaWhatsApp.connected, helpNote: 'Go to Meta Business Manager → WhatsApp → API Setup to get Phone Number ID and Access Token.' },
    { key: 'community', title: 'Community', icon: Globe, description: 'Create and manage community groups', connected: data.community.connected, helpNote: 'Enter your community group name. You can create WhatsApp, Telegram, or Discord groups.' },
    { key: 'domain', title: 'Domain', icon: Link2, description: 'Connect your existing domain or buy new', connected: data.domain.connected, helpNote: 'Add your existing domain or request our team to help you purchase one.' },
    { key: 'sms', title: 'SMS Service', icon: SmartphoneNfc, description: 'SMS provider credentials & PAN details', connected: data.sms.connected, helpNote: 'PAN details are required for DLT registration. Get API key from your SMS provider (MSG91, TextLocal).' },
    { key: 'call', title: 'Call Service', icon: Phone, description: 'Voice call provider credentials', connected: data.call.connected, helpNote: 'Get API credentials from your call provider (Exotel, Knowlarity, Twilio).' },
    { key: 'qrWhatsApp', title: 'QR WhatsApp (Bridge)', icon: QrCode, description: 'Self-hosted WhatsApp bridge connection', connected: data.qrWhatsApp.connected, helpNote: 'Deploy your WhatsApp bridge on a server and enter the URL and secret here.' },
    { key: 'tally', title: 'Tally (Accounting)', icon: Calculator, description: 'GST / Non-GST accounting setup', connected: data.tally.connected, helpNote: 'Non-GST: No extra fees. GST registered: ₹250/month extra plan required for GST compliance features.' },
    { key: 'payment', title: 'Payment Gateway', icon: CreditCard, description: 'Cashfree, PayU, Razorpay credentials', connected: data.payment.connected, helpNote: 'Get API credentials from your payment gateway dashboard.' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-600" />
          Connections Hub
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure all your service connections in one place. Fill in credentials and test each connection.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {sections.map(s => (
          <button
            key={s.key}
            onClick={() => {
              setExpandedSections(prev => new Set([...prev, s.key]));
              document.getElementById(`section-${s.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className={`p-3 rounded-xl border text-left transition-all hover:shadow-md ${
              s.connected
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-4 h-4 ${s.connected ? 'text-green-600' : 'text-gray-400'}`} />
              {s.connected ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-gray-300" />
              )}
            </div>
            <p className="text-xs font-medium text-gray-700 truncate">{s.title}</p>
          </button>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          toast.type === 'info' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
          'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {toast.text}
        </div>
      )}

      {/* Service Sections */}
      <div className="space-y-4">
        {sections.map(section => {
          const isExpanded = expandedSections.has(section.key);
          const sectionData = data[section.key] as Record<string, any>;
          const sectionError = sectionData?.error || '';
          const isConnected = sectionData?.connected || false;

          return (
            <div
              key={section.key}
              id={`section-${section.key}`}
              className={`bg-white rounded-2xl border transition-all ${
                isConnected ? 'border-green-200' : 'border-gray-200'
              }`}
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.key)}
                className="w-full flex items-center justify-between p-4 sm:p-5"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isConnected ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <section.icon className={`w-5 h-5 ${isConnected ? 'text-green-600' : 'text-gray-500'}`} />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{section.title}</h3>
                      {isConnected ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Connected</span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Not Connected</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{section.description}</p>
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>

              {/* Section Content */}
              {isExpanded && (
                <div className="px-4 sm:px-5 pb-5 border-t border-gray-100 pt-4">
                  {/* Error Display */}
                  {sectionError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-red-700 font-medium">Connection Error</p>
                        <p className="text-sm text-red-600">{sectionError}</p>
                      </div>
                    </div>
                  )}

                  {/* Dynamic Fields */}
                  <ServiceFields
                    serviceKey={section.key}
                    data={data}
                    updateField={updateField}
                  />

                  {/* Help Note */}
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-blue-700">{section.helpNote}</p>
                  </div>

                  {/* Test Connection Button */}
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => testConnection(section.key, section.title)}
                      disabled={testingService === section.key}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-2"
                    >
                      {testingService === section.key ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Testing...</>
                      ) : (
                        <>Test & Connect</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save All Button (sticky bottom) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {sections.filter(s => (data[s.key] as any)?.connected).length}/{sections.length} services connected
          </p>
          <button
            onClick={saveAll}
            disabled={saving}
            className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 shadow-lg transition"
          >
            {saving ? 'Saving…' : '💾 Save All Settings'}
          </button>
        </div>
      </div>

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSuccessPopup(null)}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Connected Successfully!</h3>
            <p className="text-gray-600 mb-4">
              <strong>{showSuccessPopup.name}</strong> has been connected and verified.
            </p>
            <button
              onClick={() => setShowSuccessPopup(null)}
              className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Service-Specific Form Fields
// ============================================================================
function ServiceFields({
  serviceKey,
  data,
  updateField,
}: {
  serviceKey: ServiceKey;
  data: ConnectionData;
  updateField: (section: ServiceKey, field: string, value: any) => void;
}) {
  switch (serviceKey) {
    case 'userDetails':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Business Name *" value={data.userDetails.businessName} onChange={v => updateField('userDetails', 'businessName', v)} placeholder="Swar Yoga" />
          <Field label="Contact Name" value={data.userDetails.contactName} onChange={v => updateField('userDetails', 'contactName', v)} placeholder="Your name" />
          <Field label="Phone *" value={data.userDetails.contactPhone} onChange={v => updateField('userDetails', 'contactPhone', v)} placeholder="+91 9876543210" />
          <Field label="Email" value={data.userDetails.contactEmail} onChange={v => updateField('userDetails', 'contactEmail', v)} type="email" placeholder="you@example.com" />
          <div className="sm:col-span-2">
            <Field label="Address" value={data.userDetails.address} onChange={v => updateField('userDetails', 'address', v)} placeholder="Business address" />
          </div>
        </div>
      );

    case 'email':
      return (
        <div className="space-y-4">
          <SelectField label="Provider" value={data.email.provider} onChange={v => updateField('email', 'provider', v)}
            options={[
              { value: 'smtp', label: 'SMTP (Gmail, Outlook, etc.)' },
              { value: 'sendgrid', label: 'SendGrid' },
              { value: 'mailgun', label: 'Mailgun' },
              { value: 'ses', label: 'AWS SES' },
            ]}
          />
          {data.email.provider === 'smtp' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="SMTP Host *" value={data.email.smtpHost} onChange={v => updateField('email', 'smtpHost', v)} placeholder="smtp.gmail.com" />
              <Field label="SMTP Port" value={String(data.email.smtpPort)} onChange={v => updateField('email', 'smtpPort', Number(v))} placeholder="587" />
              <Field label="Username *" value={data.email.smtpUser} onChange={v => updateField('email', 'smtpUser', v)} placeholder="you@gmail.com" />
              <Field label="Password *" value={data.email.smtpPass} onChange={v => updateField('email', 'smtpPass', v)} type="password" placeholder="••••••••" />
              <Field label="From Email" value={data.email.fromEmail} onChange={v => updateField('email', 'fromEmail', v)} placeholder="noreply@yourdomain.com" />
              <Field label="From Name" value={data.email.fromName} onChange={v => updateField('email', 'fromName', v)} placeholder="Your Business" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="API Key *" value={data.email.apiKey} onChange={v => updateField('email', 'apiKey', v)} type="password" placeholder="API key" />
              <Field label="From Email" value={data.email.fromEmail} onChange={v => updateField('email', 'fromEmail', v)} placeholder="noreply@yourdomain.com" />
              <Field label="From Name" value={data.email.fromName} onChange={v => updateField('email', 'fromName', v)} placeholder="Your Business" />
            </div>
          )}
        </div>
      );

    case 'metaWhatsApp':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Phone Number ID *" value={data.metaWhatsApp.phoneNumberId} onChange={v => updateField('metaWhatsApp', 'phoneNumberId', v)} placeholder="1234567890" />
          <Field label="Access Token *" value={data.metaWhatsApp.accessToken} onChange={v => updateField('metaWhatsApp', 'accessToken', v)} type="password" placeholder="EAAxxxxx..." />
          <Field label="Business Account ID" value={data.metaWhatsApp.businessAccountId} onChange={v => updateField('metaWhatsApp', 'businessAccountId', v)} placeholder="1234567890" />
          <Field label="Webhook Verify Token" value={data.metaWhatsApp.webhookVerifyToken} onChange={v => updateField('metaWhatsApp', 'webhookVerifyToken', v)} placeholder="your-verify-token" />
          <Field label="App ID" value={data.metaWhatsApp.appId} onChange={v => updateField('metaWhatsApp', 'appId', v)} placeholder="Meta App ID" />
        </div>
      );

    case 'community':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Group Name *" value={data.community.groupName} onChange={v => updateField('community', 'groupName', v)} placeholder="My Community Group" />
            <SelectField label="Platform" value={data.community.platform} onChange={v => updateField('community', 'platform', v)}
              options={[
                { value: 'whatsapp', label: 'WhatsApp' },
                { value: 'telegram', label: 'Telegram' },
                { value: 'discord', label: 'Discord' },
                { value: 'other', label: 'Other' },
              ]}
            />
          </div>
          <Field label="Group Invite Link" value={data.community.groupLink} onChange={v => updateField('community', 'groupLink', v)} placeholder="https://chat.whatsapp.com/..." />
        </div>
      );

    case 'domain':
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
            <input
              type="checkbox"
              checked={data.domain.wantToBuy}
              onChange={e => {
                updateField('domain', 'wantToBuy', e.target.checked);
                if (e.target.checked) updateField('domain', 'status', 'pending-purchase');
              }}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <div>
              <p className="font-medium text-gray-900">I want to buy a domain</p>
              <p className="text-sm text-gray-500">Our team will guide you through the purchase process</p>
            </div>
          </div>
          {data.domain.wantToBuy ? (
            <div>
              <Field label="Desired Domain Name" value={data.domain.desiredDomain} onChange={v => updateField('domain', 'desiredDomain', v)} placeholder="mybusiness.com" />
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-700">
                  <strong>📋 Next Steps:</strong> Our admin team will contact you to help purchase and configure the domain. Status: <strong>{data.domain.status === 'pending-purchase' ? 'Pending – Our team will reach out' : data.domain.status}</strong>
                </p>
              </div>
            </div>
          ) : (
            <Field label="Existing Domain" value={data.domain.existingDomain} onChange={v => updateField('domain', 'existingDomain', v)} placeholder="yourdomain.com" />
          )}
        </div>
      );

    case 'sms':
      return (
        <div className="space-y-4">
          <SelectField label="Provider" value={data.sms.provider} onChange={v => updateField('sms', 'provider', v)}
            options={[
              { value: 'msg91', label: 'MSG91' },
              { value: 'textlocal', label: 'TextLocal' },
              { value: 'twilio', label: 'Twilio' },
              { value: 'other', label: 'Other' },
            ]}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="API Key *" value={data.sms.apiKey} onChange={v => updateField('sms', 'apiKey', v)} type="password" placeholder="API Key" />
            <Field label="Sender ID" value={data.sms.senderId} onChange={v => updateField('sms', 'senderId', v)} placeholder="SWARYG" />
            <Field label="PAN Number *" value={data.sms.panNumber} onChange={v => updateField('sms', 'panNumber', v)} placeholder="ABCDE1234F" />
            <Field label="PAN Name" value={data.sms.panName} onChange={v => updateField('sms', 'panName', v)} placeholder="Name on PAN card" />
            <Field label="DLT Entity ID" value={data.sms.entityId} onChange={v => updateField('sms', 'entityId', v)} placeholder="1234567890" />
          </div>
        </div>
      );

    case 'call':
      return (
        <div className="space-y-4">
          <SelectField label="Provider" value={data.call.provider} onChange={v => updateField('call', 'provider', v)}
            options={[
              { value: 'exotel', label: 'Exotel' },
              { value: 'knowlarity', label: 'Knowlarity' },
              { value: 'twilio', label: 'Twilio' },
              { value: 'other', label: 'Other' },
            ]}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="API Key *" value={data.call.apiKey} onChange={v => updateField('call', 'apiKey', v)} type="password" placeholder="API Key" />
            <Field label="API Secret *" value={data.call.apiSecret} onChange={v => updateField('call', 'apiSecret', v)} type="password" placeholder="API Secret" />
            <Field label="Caller ID" value={data.call.callerId} onChange={v => updateField('call', 'callerId', v)} placeholder="+91 80xxxxxxxx" />
            <Field label="Virtual Number" value={data.call.virtualNumber} onChange={v => updateField('call', 'virtualNumber', v)} placeholder="+91 80xxxxxxxx" />
            <Field label="SIP Domain" value={data.call.sipDomain} onChange={v => updateField('call', 'sipDomain', v)} placeholder="sip.exotel.com" />
          </div>
        </div>
      );

    case 'qrWhatsApp':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Bridge URL *" value={data.qrWhatsApp.bridgeUrl} onChange={v => updateField('qrWhatsApp', 'bridgeUrl', v)} placeholder="http://your-server:3333" />
          <Field label="Bridge Secret *" value={data.qrWhatsApp.bridgeSecret} onChange={v => updateField('qrWhatsApp', 'bridgeSecret', v)} type="password" placeholder="your-bridge-secret" />
          <div className="sm:col-span-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
            <strong>📱 QR Scanner:</strong> After connecting, go to <a href="/admin/crm/qr" className="text-indigo-600 hover:underline">QR WhatsApp → QR Inbox</a> to scan the QR code and link your phone.
          </div>
        </div>
      );

    case 'tally':
      return (
        <div className="space-y-4">
          <Field label="Company Name *" value={data.tally.companyName} onChange={v => updateField('tally', 'companyName', v)} placeholder="Your Company Pvt Ltd" />
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
            <input
              type="checkbox"
              checked={data.tally.gstRegistered}
              onChange={e => {
                updateField('tally', 'gstRegistered', e.target.checked);
                updateField('tally', 'billingPlan', e.target.checked ? 'gst-monthly-250' : 'non-gst-free');
              }}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <div>
              <p className="font-medium text-gray-900">GST Registered</p>
              <p className="text-sm text-gray-500">GST: ₹250/month extra for GST compliance features. Non-GST: No extra fees.</p>
            </div>
          </div>
          {data.tally.gstRegistered && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="GST Number *" value={data.tally.gstNumber} onChange={v => updateField('tally', 'gstNumber', v)} placeholder="29ABCDE1234F1Z5" />
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg sm:col-span-2">
                <p className="text-sm text-amber-700">
                  <strong>💰 Billing:</strong> GST plan costs ₹250/month extra. This will be added to your subscription.
                </p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tally Serial Number" value={data.tally.tallySerialNumber} onChange={v => updateField('tally', 'tallySerialNumber', v)} placeholder="Optional" />
            <Field label="Tally License Key" value={data.tally.tallyLicenseKey} onChange={v => updateField('tally', 'tallyLicenseKey', v)} type="password" placeholder="Optional" />
          </div>
        </div>
      );

    case 'payment':
      return (
        <div className="space-y-4">
          <SelectField label="Provider" value={data.payment.provider} onChange={v => updateField('payment', 'provider', v)}
            options={[
              { value: 'cashfree', label: 'Cashfree' },
              { value: 'payu', label: 'PayU' },
              { value: 'razorpay', label: 'Razorpay' },
              { value: 'stripe', label: 'Stripe' },
            ]}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="API Key *" value={data.payment.apiKey} onChange={v => updateField('payment', 'apiKey', v)} type="password" placeholder="API Key / Client ID" />
            <Field label="API Secret *" value={data.payment.apiSecret} onChange={v => updateField('payment', 'apiSecret', v)} type="password" placeholder="API Secret" />
            <Field label="Merchant ID" value={data.payment.merchantId} onChange={v => updateField('payment', 'merchantId', v)} placeholder="Optional" />
          </div>
        </div>
      );

    default:
      return null;
  }
}

// ============================================================================
// Reusable Field Components
// ============================================================================
function Field({
  label, value, onChange, type = 'text', placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
    </div>
  );
}

function SelectField({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
