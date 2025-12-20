'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearSession, ensureSessionExpiry, extendSession, getFormattedRemainingTime } from '@/lib/sessionManager';

export default function LifePlannerSettingsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [remaining, setRemaining] = useState<string>('');

  const hasAuth = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('token') || localStorage.getItem('lifePlannerToken');
    const user = localStorage.getItem('user') || localStorage.getItem('lifePlannerUser');
    return Boolean(token && user);
  }, []);

  useEffect(() => {
    setMounted(true);

    if (!hasAuth) {
      router.replace('/life-planner/login');
      return;
    }

    // Keep session alive (7 days sliding window) as long as user doesn't logout.
    ensureSessionExpiry();
    extendSession();

    const update = () => setRemaining(getFormattedRemainingTime());
    update();

    const t = window.setInterval(update, 30_000);
    return () => window.clearInterval(t);
  }, [hasAuth, router]);

  if (!mounted) return null;

  return (
    <div className="bg-gradient-to-br from-swar-bg to-swar-primary/5 rounded-2xl border border-swar-border">
      <div className="container mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-swar-text mb-2">⚙️ Settings</h1>
          <p className="text-swar-text-secondary">
            Life Planner stays logged in for <span className="font-semibold">7 days</span> from your latest activity (unless you logout).
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-5 sm:p-6 border border-gray-100">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-sm font-semibold text-swar-text">Session</div>
              <div className="mt-1 text-sm text-swar-text-secondary">
                Remaining time: <span className="font-bold text-swar-text">{remaining || '—'}</span>
              </div>
              <div className="mt-2 text-xs text-swar-text-secondary">
                If you don’t logout, the expiry refreshes automatically while you use the app.
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                clearSession();
                router.push('/life-planner/login');
              }}
              className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
