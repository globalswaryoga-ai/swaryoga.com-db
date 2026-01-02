'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { AlertBox } from '@/components/admin/crm';

type EnvStatus = {
  hasAccessToken: boolean;
  hasPhoneNumberId: boolean;
  message?: string;
};

export default function MetaWhatsAppSetupPage() {
  const router = useRouter();
  const token = useAuth();
  const crm = useCRM({ token });

  const [envStatus, setEnvStatus] = useState<EnvStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [to, setTo] = useState('');
  const [message, setMessage] = useState('');

  const fetchEnv = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await crm.fetch('/api/admin/crm/whatsapp/meta/status', { method: 'GET' });
      setEnvStatus(res?.data || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch status');
      setEnvStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const sendTest = async () => {
    setError(null);
    setSuccess(null);
    if (!to.trim() || !message.trim()) {
      setError('Enter both phone number and message');
      return;
    }

    try {
      await crm.fetch('/api/admin/whatsapp/send', {
        method: 'POST',
        body: { to, message },
      });
      setSuccess('Sent! (If Meta is in TEST mode, the number must be a test recipient.)');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed');
    }
  };

  useEffect(() => {
    if (token === undefined) {
      router.push('/admin/login');
      return;
    }
    if (!token) return;
    void fetchEnv();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (token === undefined) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">CRM / WhatsApp</div>
            <h1 className="text-2xl font-bold text-gray-900">Meta WhatsApp (Cloud API) Setup</h1>
            <p className="text-gray-600 mt-1">
              Verified business number. Best for official/bulk messaging.
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
              href="/admin/crm/whatsapp/web"
              className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black"
            >
              WhatsApp Web Setup
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {error ? <AlertBox type="error" message={error} /> : null}
        {success ? <AlertBox type="success" message={success} /> : null}

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Environment status</h2>
            <button
              type="button"
              onClick={() => void fetchEnv()}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="mt-4 text-gray-600">Loading…</div>
          ) : envStatus ? (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div className="text-xs uppercase text-gray-500">WHATSAPP_ACCESS_TOKEN</div>
                <div className="mt-1 text-lg font-semibold">
                  {envStatus.hasAccessToken ? 'Present' : 'Missing'}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div className="text-xs uppercase text-gray-500">WHATSAPP_PHONE_NUMBER_ID</div>
                <div className="mt-1 text-lg font-semibold">
                  {envStatus.hasPhoneNumberId ? 'Present' : 'Missing'}
                </div>
              </div>
              <div className="md:col-span-2 text-sm text-gray-600">
                {envStatus.message || 'Tip: These must be set on the server (not in browser).'}
              </div>
            </div>
          ) : (
            <div className="mt-4 text-gray-600">No status available.</div>
          )}
        </div>

        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Send a test message</h2>
          <p className="text-gray-600 mt-2">
            This uses the existing admin send endpoint that calls the Meta Cloud API.
            If your Meta app is in TEST mode, you must add the recipient as a test number in Meta.
          </p>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">To (phone)</label>
              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="919XXXXXXXXX"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Message</label>
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hello from Swar Yoga"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => void sendTest()}
              className="px-5 py-3 rounded-lg bg-[#1E7F43] text-white font-semibold hover:bg-[#166235]"
            >
              Send test via Meta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
