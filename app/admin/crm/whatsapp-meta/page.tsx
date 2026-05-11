'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner, AlertBox } from '@/components/admin/crm';

export default function WhatsAppSetupPage() {
  const token = useAuth();
  const [waDiagnostics, setWaDiagnostics] = useState<any>(null);
  const [waDiagnosticsLoading, setWaDiagnosticsLoading] = useState(false);
  const [waDiagnosticsError, setWaDiagnosticsError] = useState<string | null>(null);

  const fetchWhatsAppDiagnostics = useCallback(async () => {
    if (!token) return;

    setWaDiagnosticsLoading(true);
    setWaDiagnosticsError(null);
    try {
      const res = await fetch('/api/admin/crm/whatsapp/diagnostics', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setWaDiagnostics(null);
        setWaDiagnosticsError(data?.error || 'Failed to load diagnostics');
        return;
      }
      setWaDiagnostics(data?.data || data);
    } catch (e) {
      setWaDiagnostics(null);
      setWaDiagnosticsError(String(e));
    } finally {
      setWaDiagnosticsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchWhatsAppDiagnostics();
    const interval = setInterval(fetchWhatsAppDiagnostics, 60000);
    return () => clearInterval(interval);
  }, [fetchWhatsAppDiagnostics]);

  const meta = waDiagnostics?.meta;
  const webhooks = waDiagnostics?.webhooks;

  return (
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 border-none">WhatsApp Setup & Health</h1>
              <p className="text-slate-500 mt-1">Configure and monitor your Meta WhatsApp Cloud API integration.</p>
            </div>
            <button
              onClick={fetchWhatsAppDiagnostics}
              disabled={waDiagnosticsLoading}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              {waDiagnosticsLoading ? 'Refreshing...' : '🔄 Refresh Status'}
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* QUICK TEST CARD */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 col-span-2">
               <h2 className="text-lg font-semibold text-slate-800 border-none mb-4">Quick Test: Send Outbound</h2>
               <div className="flex gap-2">
                 <input 
                   type="text" 
                   id="testPhone"
                   placeholder="Phone (e.g. 919309986820)" 
                   className="flex-1 px-3 py-2 border rounded-lg text-sm"
                 />
                 <button 
                   onClick={async () => {
                     const phone = (document.getElementById('testPhone') as HTMLInputElement).value;
                     if (!phone) return alert('Enter phone');
                     try {
                       const res = await fetch('/api/admin/crm/whatsapp/send', {
                         method: 'POST',
                         headers: { 
                           'Content-Type': 'application/json',
                           'Authorization': `Bearer ${localStorage.getItem('admin_token') || localStorage.getItem('adminToken')}`
                         },
                         body: JSON.stringify({ phoneNumber: phone, messageContent: 'Test message from Setup Dashboard' })
                       });
                       const data = await res.json();
                       if (res.ok) alert('✅ SENT! Meta Message ID: ' + (data?.data?.waMessageId || 'Success'));
                       else alert('❌ FAILED: ' + (data?.error || 'Unknown error'));
                       fetchWhatsAppDiagnostics();
                     } catch (e) {
                       alert('Error: ' + String(e));
                     }
                   }}
                   className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700"
                 >
                   Send Test
                 </button>
               </div>
               <p className="text-[10px] text-slate-400 mt-2 italic">Requires you to be logged into CRM.</p>
            </div>

            {/* META API CARD */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800 border-none">Meta API Configuration</h2>
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${meta?.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {meta?.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between text-sm py-2 border-bottom border-slate-100">
                  <span className="text-slate-500">Phone Number ID</span>
                  <code className="font-mono bg-slate-50 px-1 rounded">{meta?.phoneNumberId || 'Not Configured'}</code>
                </div>
                <div className="flex justify-between text-sm py-2 border-bottom border-slate-100">
                  <span className="text-slate-500">Access Token</span>
                  <code className="font-mono bg-slate-50 px-1 rounded">{meta?.accessToken ? 'Configured (Masked)' : 'Missing'}</code>
                </div>
                {meta?.message && (
                  <div className={`mt-4 p-3 rounded-lg text-sm ${meta.connected ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                    <strong>Status:</strong> {meta.message}
                  </div>
                )}
              </div>
            </div>

            {/* WEBHOOK CARD */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800 border-none">Webhook Health (Live)</h2>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${webhooks?.lastHit ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                  <span className="text-xs text-slate-500">Live</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-3 tracking-wider">Meta Subdomain Suggestion</p>
                  <p className="text-sm text-slate-700 mb-2">If you have high message volume, use the CRM subdomain for webhooks:</p>
                  <code className="block bg-white p-2 border border-slate-200 rounded text-xs overflow-x-auto">
                    https://crm.swaryoga.com/api/whatsapp/webhook
                  </code>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div className="p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                    <p className="text-xs text-slate-500 mb-1">Last Server Hit</p>
                    <p className="text-sm font-semibold">{webhooks?.lastHit ? new Date(webhooks.lastHit).toLocaleTimeString() : 'Never'}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{webhooks?.lastHit ? new Date(webhooks.lastHit).toLocaleDateString() : '-'}</p>
                  </div>
                  <div className="p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                    <p className="text-xs text-slate-500 mb-1">Last Inbound Msg</p>
                    <p className="text-sm font-semibold">{webhooks?.lastInbound ? new Date(webhooks.lastInbound).toLocaleTimeString() : 'None'}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{webhooks?.lastInbound ? new Date(webhooks.lastInbound).toLocaleDateString() : '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-blue-50 border border-blue-200 p-6 rounded-xl">
            <h3 className="text-blue-900 font-bold mb-2 border-none">Meta Instructions</h3>
            <ol className="list-decimal list-inside text-sm text-blue-800 space-y-2">
              <li>Log in to the <strong>Meta Developer Portal</strong>.</li>
              <li>Go to <strong>WhatsApp {' > '} Configuration</strong>.</li>
              <li>Set Callback URL to: <code className="bg-blue-100 px-1 rounded">https://crm.swaryoga.com/api/whatsapp/webhook</code></li>
              <li>Verify Token should match your <code className="bg-blue-100 px-1 rounded">WHATSAPP_WEBHOOK_VERIFY_TOKEN</code> env var.</li>
              <li>Subscribe to <code className="bg-blue-100 px-1 rounded">messages</code> under Webhook Fields.</li>
            </ol>
          </div>
        </div>
      </main>
  );
}
