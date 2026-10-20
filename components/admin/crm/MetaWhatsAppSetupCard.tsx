'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Copy,
  Check,
  ShieldCheck,
  Key,
  Phone,
  Layers,
  HelpCircle,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

interface MetaWhatsAppSetupCardProps {
  onConnected?: () => void;
  token?: string | null;
  compact?: boolean;
}

export default function MetaWhatsAppSetupCard({
  onConnected,
  token,
  compact = false,
}: MetaWhatsAppSetupCardProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [existingAccount, setExistingAccount] = useState<any>(null);

  const [form, setForm] = useState({
    accountName: '',
    metaPhoneNumber: '',
    metaPhoneNumberId: '',
    metaBusinessAccountId: '',
    metaAppId: '',
    metaAppSecret: '',
    metaAccessToken: '',
    metaVerifyToken: 'swaryoga_verify_token',
  });

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const webhookCallbackUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/whatsapp/webhook`
    : 'https://crm.swaryoga.com/api/whatsapp/webhook';
  const verifyToken = 'swaryoga_verify_token';

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const loadAccount = async () => {
    setFetching(true);
    try {
      const headers: Record<string, string> = {};
      const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') || localStorage.getItem('adminToken') : null);
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/admin/crm/whatsapp-accounts', { headers });
      const json = await res.json();
      if (json.success && json.data?.accounts?.length > 0) {
        const acc = json.data.accounts[0];
        setExistingAccount(acc);
        setForm({
          accountName: acc.accountName || '',
          metaPhoneNumber: acc.metaPhoneNumber || '',
          metaPhoneNumberId: acc.metaPhoneNumberId || '',
          metaBusinessAccountId: acc.metaBusinessAccountId || '',
          metaAppId: acc.metaAppId || '',
          metaAppSecret: '',
          metaAccessToken: '',
          metaVerifyToken: 'swaryoga_verify_token',
        });
      } else {
        setExistingAccount(null);
        setIsEditing(true);
      }
    } catch (err) {
      console.error('Failed to load whatsapp account', err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadAccount();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!form.metaPhoneNumberId || (!form.metaAccessToken && !existingAccount?.hasAccessToken)) {
      setStatusMessage({
        type: 'error',
        text: 'Meta Phone Number ID and Permanent Access Token are required.',
      });
      return;
    }

    setLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') || localStorage.getItem('adminToken') : null);
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/admin/crm/whatsapp-accounts', {
        method: 'POST',
        headers,
        body: JSON.stringify(form),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save Meta WhatsApp credentials');
      }

      setStatusMessage({
        type: 'success',
        text: 'Meta WhatsApp account connected successfully! Your CRM is now ready for messaging.',
      });
      setIsEditing(false);
      await loadAccount();
      if (onConnected) onConnected();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Something went wrong' });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Meta WhatsApp account?')) return;
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') || localStorage.getItem('adminToken') : null);
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/admin/crm/whatsapp-accounts', {
        method: 'DELETE',
        headers,
      });
      const json = await res.json();
      if (json.success) {
        setExistingAccount(null);
        setIsEditing(true);
        setStatusMessage({ type: 'success', text: 'WhatsApp account disconnected.' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-500">Checking Meta WhatsApp setup status...</p>
      </div>
    );
  }

  // When already connected and not editing
  if (existingAccount && !isEditing) {
    return (
      <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">
                  {existingAccount.accountName || 'Meta WhatsApp Connected'}
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </span>
              </div>
              <p className="text-sm text-slate-500">
                Number: <span className="font-semibold text-slate-700">{existingAccount.metaPhoneNumber || existingAccount.metaPhoneNumberId}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Reconfigure
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={loading}
              className="px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition inline-flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" /> Disconnect
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block font-medium mb-1">Phone Number ID</span>
            <span className="font-mono font-medium text-slate-800 break-all">{existingAccount.metaPhoneNumberId}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block font-medium mb-1">App ID</span>
            <span className="font-mono font-medium text-slate-800">{existingAccount.metaAppId || '—'}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block font-medium mb-1">Webhook URL</span>
            <span className="font-mono font-medium text-slate-800 truncate block">{webhookCallbackUrl}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-emerald-100" />
            </div>
            <div>
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/30 text-emerald-100 border border-emerald-400/30 mb-1">
                New Setup Requirement
              </span>
              <h2 className="text-xl font-bold">Meta WhatsApp Cloud API Setup</h2>
              <p className="text-sm text-emerald-100/90 mt-0.5">
                Connect your official Meta WhatsApp Business API number to start messaging leads.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {statusMessage && (
          <div
            className={`p-4 rounded-xl flex items-start gap-3 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <p className="text-sm font-medium">{statusMessage.text}</p>
          </div>
        )}

        {/* Webhook Configuration Step (Required for Meta Developer App) */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h3 className="text-sm font-bold text-slate-800">
              Configure Webhook in Meta Developers Portal
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Go to{' '}
            <a
              href="https://developers.facebook.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 font-semibold underline inline-flex items-center gap-0.5"
            >
              Meta Developers <ExternalLink className="w-3 h-3" />
            </a>{' '}
            &rarr; Select your App &rarr; <strong>WhatsApp</strong> &rarr; <strong>Configuration</strong> &rarr; Click <strong>Edit</strong> under Webhook.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Callback URL */}
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Meta App Callback URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookCallbackUrl}
                  className="w-full text-xs font-mono bg-slate-50 text-slate-800 px-2 py-1.5 rounded border border-slate-200 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(webhookCallbackUrl, 'url')}
                  className="px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 flex items-center gap-1 shrink-0 transition"
                >
                  {copiedField === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedField === 'url' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Verify Token */}
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Meta Verify Token
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={verifyToken}
                  className="w-full text-xs font-mono bg-slate-50 text-slate-800 px-2 py-1.5 rounded border border-slate-200 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(verifyToken, 'token')}
                  className="px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 flex items-center gap-1 shrink-0 transition"
                >
                  {copiedField === 'token' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedField === 'token' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200/80 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Crucial:</strong> After clicking <em>Verify and save</em> in Meta, click <strong>Manage</strong> next to Webhook fields and subscribe to the <strong>messages</strong> field.
            </span>
          </div>
        </div>

        {/* Credentials Form Step */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
              2
            </span>
            <h3 className="text-sm font-bold text-slate-800">
              Enter Your Meta WhatsApp Credentials
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Meta Approved Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={form.metaPhoneNumber}
                  onChange={(e) => setForm({ ...form, metaPhoneNumber: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Your registered WhatsApp Business display number</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Meta Phone Number ID <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Layers className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="e.g. 104859201948572"
                  value={form.metaPhoneNumberId}
                  onChange={(e) => setForm({ ...form, metaPhoneNumberId: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Found in Meta App &rarr; WhatsApp &rarr; API Setup</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Meta App ID
              </label>
              <input
                type="text"
                placeholder="e.g. 984719283746"
                value={form.metaAppId}
                onChange={(e) => setForm({ ...form, metaAppId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">Found on your Meta App Dashboard header</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Meta WhatsApp Business Account ID (WABA ID)
              </label>
              <input
                type="text"
                placeholder="e.g. 192837465019283"
                value={form.metaBusinessAccountId}
                onChange={(e) => setForm({ ...form, metaBusinessAccountId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">Optional, used for auto-subscribing WABA webhooks</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Permanent Access Token <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                placeholder="EAABw..."
                value={form.metaAccessToken}
                onChange={(e) => setForm({ ...form, metaAccessToken: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                required={!existingAccount?.hasAccessToken}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Generate a System User token with <code>whatsapp_business_messaging</code> and <code>whatsapp_business_management</code> permissions in Meta Business Manager.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            {existingAccount && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 disabled:opacity-50 inline-flex items-center gap-2 transition"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Save & Connect WhatsApp
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
