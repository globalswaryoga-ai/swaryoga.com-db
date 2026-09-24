'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/admin/crm';

declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

interface TeacherAccount {
  _id: string;
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber?: string;
  businessName?: string;
  status: 'pending' | 'connected' | 'disconnected' | 'error';
  errorMessage?: string;
  webhookSubscribed?: boolean;
  connectedAt?: string;
  createdAt: string;
}

function crmFetch(url: string, opts: any = {}) {
  const token = localStorage.getItem('crm_token') || localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
  return fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...opts.headers,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  }).then((r) => r.json());
}

export default function WhatsAppTeachersPage() {
  const token = useAuth();
  const [accounts, setAccounts] = useState<TeacherAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectStatus, setConnectStatus] = useState<string>('');

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await crmFetch('/api/admin/crm/whatsapp-teachers');
      if (data?.success) setAccounts(data.accounts || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) loadAccounts();
  }, [token, loadAccounts]);

  // Ensure the Facebook JS SDK is loaded + initialised for WhatsApp Embedded Signup.
  const ensureFacebookSdk = async (): Promise<any> => {
    if (typeof window === 'undefined') throw new Error('Facebook SDK unavailable');
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '';
    if (!appId) throw new Error('Facebook App ID is not configured (NEXT_PUBLIC_FACEBOOK_APP_ID).');

    if (!document.getElementById('facebook-sdk')) {
      const script = document.createElement('script');
      script.id = 'facebook-sdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }

    let retries = 20;
    while (!window.FB && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      retries -= 1;
    }
    if (!window.FB) throw new Error('Facebook SDK failed to load. Disable blockers and retry.');

    window.FB.init({ appId, xfbml: false, version: 'v25.0' });
    return window.FB;
  };

  // Listen for WA_EMBEDDED_SIGNUP postMessage events — Meta sends the actual
  // waba_id/phone_number_id here during the flow, separately from the FB.login callback.
  const waitForSignupData = (): Promise<{ wabaId: string; phoneNumberId: string; businessName?: string } | null> => {
    return new Promise((resolve) => {
      let settled = false;
      const handler = (event: MessageEvent) => {
        if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') return;
        try {
          const data = JSON.parse(event.data);
          if (data.type !== 'WA_EMBEDDED_SIGNUP') return;
          if (data.event === 'FINISH' || data.event === 'FINISH_ONLY_WABA' || data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
            settled = true;
            window.removeEventListener('message', handler);
            resolve({
              wabaId: data.data?.waba_id,
              phoneNumberId: data.data?.phone_number_id,
              businessName: data.data?.business_name,
            });
          } else if (data.event === 'CANCEL') {
            settled = true;
            window.removeEventListener('message', handler);
            resolve(null);
          }
        } catch {
          // Non-JSON messages from other sources — ignore.
        }
      };
      window.addEventListener('message', handler);
      // Give up after 5 minutes if the teacher never completes/cancels the dialog.
      setTimeout(() => {
        if (!settled) {
          window.removeEventListener('message', handler);
          resolve(null);
        }
      }, 5 * 60 * 1000);
    });
  };

  const connectWhatsApp = async () => {
    setConnectError(null);
    setConnecting(true);
    setConnectStatus('Loading Facebook SDK...');
    try {
      const FB = await ensureFacebookSdk();
      const configId = process.env.NEXT_PUBLIC_FB_WHATSAPP_CONFIG_ID || '';
      if (!configId) throw new Error('WhatsApp signup config is not set up yet (NEXT_PUBLIC_FB_WHATSAPP_CONFIG_ID).');

      setConnectStatus('Waiting for signup to complete in the popup...');
      const signupDataPromise = waitForSignupData();

      const authResponse: any = await new Promise((resolve) => {
        FB.login(
          (response: any) => resolve(response),
          {
            config_id: configId,
            response_type: 'code',
            override_default_response_type: true,
            extras: {
              setup: {},
              featureType: 'whatsapp_business_app_onboarding', // enables Coexistence
              sessionInfoVersion: '3',
            },
          }
        );
      });

      const code = authResponse?.authResponse?.code;
      const signupData = await signupDataPromise;

      if (!signupData?.wabaId || !signupData?.phoneNumberId) {
        if (authResponse?.status !== 'connected') {
          setConnectError('Signup was cancelled.');
        } else {
          setConnectError('Signup completed but no WhatsApp account data was received. Please try again.');
        }
        setConnecting(false);
        setConnectStatus('');
        return;
      }

      setConnectStatus('Finishing setup...');
      const result = await crmFetch('/api/admin/crm/whatsapp-teachers/connect', {
        method: 'POST',
        body: {
          code,
          wabaId: signupData.wabaId,
          phoneNumberId: signupData.phoneNumberId,
          businessName: signupData.businessName,
        },
      });

      if (!result?.success) {
        setConnectError(result?.error || 'Failed to finish connecting this account.');
      }
      await loadAccounts();
    } catch (error) {
      setConnectError(error instanceof Error ? error.message : 'Failed to connect WhatsApp account');
    } finally {
      setConnecting(false);
      setConnectStatus('');
    }
  };

  if (!token) return <LoadingSpinner />;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Connect Teacher WhatsApp Accounts</h1>
          <p className="text-sm text-gray-500 mt-1">
            Teachers connect their own official WhatsApp Business number here &mdash; no QR scan, no ban risk.
            Their WhatsApp Business App keeps working on their phone alongside your CRM.
          </p>
        </div>
        <button
          onClick={connectWhatsApp}
          disabled={connecting}
          className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
        >
          {connecting ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {connectStatus || 'Connecting...'}
            </>
          ) : (
            'Connect WhatsApp'
          )}
        </button>
      </div>

      {connectError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {connectError}
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : accounts.length === 0 ? (
        <div className="text-center py-16 text-gray-400 border border-dashed border-gray-200 rounded-xl">
          No teachers connected yet.
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <div key={acc._id} className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg bg-white">
              <div>
                <p className="font-medium text-gray-800">{acc.businessName || acc.displayPhoneNumber || acc.phoneNumberId}</p>
                <p className="text-xs text-gray-500">{acc.displayPhoneNumber || acc.phoneNumberId}</p>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  acc.status === 'connected'
                    ? 'bg-green-100 text-green-700'
                    : acc.status === 'error'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
                title={acc.errorMessage || ''}
              >
                {acc.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
