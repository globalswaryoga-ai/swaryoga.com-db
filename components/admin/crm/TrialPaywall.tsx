'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

/**
 * Full-screen paywall shown when a tenant's free trial has ended and the
 * subscription hasn't been paid (computeTrialState → isLocked). Their data is
 * kept; they just can't use features until they pay. The subscription /
 * checkout / billing pages are allowed through so payment can be completed.
 */
export default function TrialPaywall() {
  const pathname = usePathname() || '';
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined'
      ? (localStorage.getItem('crm_token') || localStorage.getItem('adminToken') || localStorage.getItem('admin_token'))
      : null;
    if (!token) return;
    fetch('/api/crm-site/my-modules', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setLocked(!!j?.data?.trial?.isLocked))
      .catch(() => {});
  }, [pathname]);

  // Let payment-related pages through so the tenant can actually pay.
  const allow = /\/(subscription|checkout|billing)/.test(pathname);
  if (!locked || allow) return null;

  return (
    <div className="fixed inset-0 z-[10001] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className="text-5xl mb-3">⏳</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your free trial has ended</h2>
        <p className="text-gray-500 mb-6">
          Your data is safe. Activate your subscription to continue using all features.
        </p>
        <Link
          href="/admin/crm/subscription"
          className="inline-block w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition"
        >
          Pay &amp; Continue
        </Link>
      </div>
    </div>
  );
}
