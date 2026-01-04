'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AlertBox, LoadingSpinner } from '@/components/admin/crm';
import { QRConnectionModal } from '@/components/admin/crm/QRConnectionModal';

type BridgeStatus = {
  status?: string;
  connected?: boolean;
  initialized?: boolean;
  account?: {
    phone?: string;
    wid?: string;
    pushname?: string;
    platform?: string;
  };
  error?: string;
};

function normalizeBridgeStatus(raw: any): BridgeStatus {
  if (!raw || typeof raw !== 'object') return {};

  // qrServer.js returns:
  // { authenticated, connecting, hasQR, connectedClients, phoneNumber?, account? }
  const connected = Boolean(raw.connected ?? raw.authenticated ?? raw.isAuthenticated);
  const initialized = Boolean(raw.initialized ?? raw.connecting ?? raw.clientConnecting ?? raw.hasQR);

  const account = raw.account && typeof raw.account === 'object'
    ? raw.account
    : {
        phone: raw.phoneNumber,
      };

  const statusText = raw.status || (connected ? 'connected' : initialized ? 'connecting' : 'idle');

  return {
    status: statusText,
    connected,
    initialized,
    account,
    error: raw.error,
  };
}

function getBridgeHttpBase(): string {
  // Same philosophy as QR modal:
  // - localhost defaults to the local bridge
  // - production must be explicit via env
  if (typeof window === 'undefined') return '';

  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1';

  const envUrl = (process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL || '').trim();

  if (isLocal) return envUrl || 'http://localhost:3333';
  return envUrl;
}

export default function WhatsAppWebSetupPage() {
  const router = useRouter();
  const token = useAuth();

  const bridgeBase = useMemo(() => getBridgeHttpBase(), []);

  const [status, setStatus] = useState<BridgeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);

  const fetchStatus = async () => {
    if (!bridgeBase) {
      setStatus(null);
      setLoading(false);
      setError(
        'WhatsApp bridge URL is not configured for this environment. Set NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL.'
      );
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${bridgeBase.replace(/\/$/, '')}/api/status`, {
        cache: 'no-store',
      });
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(data?.error || `Bridge status failed (${res.status})`);
      setStatus(normalizeBridgeStatus(data));
    } catch (e) {
      setStatus(null);
      setError(e instanceof Error ? e.message : 'Failed to fetch bridge status');
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    if (!bridgeBase) return;
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${bridgeBase.replace(/\/$/, '')}/api/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(data?.error || `Disconnect failed (${res.status})`);
      setSuccess('Disconnected. You can scan QR again to connect a new number.');
      setTimeout(() => setSuccess(null), 3000);
      await fetchStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to disconnect');
    }
  };

  useEffect(() => {
    if (token === undefined) {
      router.push('/admin/login');
      return;
    }
    if (!token) return;

    void fetchStatus();
    const t = window.setInterval(() => void fetchStatus(), 5000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (token === undefined) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">CRM / WhatsApp</div>
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp Web (QR) Setup</h1>
            <p className="text-gray-600 mt-1">
              Connect a common/personal WhatsApp number using QR. Best for 1-1 chat, small bulk, groups.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/crm/whatsapp"
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            >
              Open Inbox
            </Link>
            <Link
              href="/admin/crm/whatsapp/meta"
              className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black"
            >
              Meta WhatsApp Setup
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {error ? <AlertBox type="error" message={error} /> : null}
        {success ? <AlertBox type="success" message={success} /> : null}

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm text-gray-500">Bridge</div>
              <div className="font-mono text-sm text-gray-800">
                {bridgeBase ? bridgeBase : 'Not configured'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void fetchStatus()}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>

          <div className="mt-6">
            {loading ? (
              <LoadingSpinner />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-xs uppercase text-gray-500">Connection</div>
                  <div className="mt-1 text-lg font-semibold">
                    {status?.connected ? 'Connected' : 'Not connected'}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {status?.connected
                      ? 'Inbound messages will be captured (from today) if bridge secret is set.'
                      : 'Open QR and scan from WhatsApp → Linked devices.'}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-xs uppercase text-gray-500">Connected number</div>
                  <div className="mt-1 text-lg font-semibold">
                    {status?.account?.phone || '—'}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {status?.account?.pushname ? `Name: ${status.account.pushname}` : '—'}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-xs uppercase text-gray-500">Platform</div>
                  <div className="mt-1 text-lg font-semibold">
                    {status?.account?.platform || '—'}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {status?.account?.wid ? `WID: ${status.account.wid}` : '—'}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              className="px-5 py-3 rounded-lg bg-[#1E7F43] text-white font-semibold hover:bg-[#166235]"
              disabled={!bridgeBase}
            >
              Open QR Login
            </button>

            <button
              type="button"
              onClick={() => void disconnect()}
              className="px-5 py-3 rounded-lg border border-red-300 bg-white text-red-700 font-semibold hover:bg-red-50"
              disabled={!bridgeBase || !status?.connected}
            >
              Disconnect
            </button>

            <div className="text-sm text-gray-600 self-center">
              Tip: to change number, disconnect → open QR → scan new number.
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Privacy rule (assignment)</h2>
          <p className="text-gray-600 mt-2">
            Even though this WhatsApp Web number is “common”, chats are only visible to the assigned admin user and
            <span className="font-semibold"> admincrm</span>.
          </p>
        </div>
      </div>

      <QRConnectionModal isOpen={qrOpen} onClose={() => setQrOpen(false)} />
    </div>
  );
}
