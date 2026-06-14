'use client';

import { useEffect, useState } from 'react';

interface LeadSourceCounts {
  qrLeads: number;
  metaLeads: number;
}

/**
 * Small pill showing QR vs Meta lead counts, computed identically via
 * /api/admin/crm/leads/source-counts and shown on Leads, Funnel, Broadcast
 * and Reports pages so the numbers line up everywhere.
 */
export default function LeadSourceBadge({ token, variant = 'light' }: { token: string | null; variant?: 'light' | 'dark' }) {
  const [counts, setCounts] = useState<LeadSourceCounts | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch('/api/admin/crm/leads/source-counts', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(json => {
        if (!cancelled && json?.success !== false) setCounts(json.data || null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token]);

  if (!counts) return null;

  const wrapperClass = variant === 'dark'
    ? 'flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm'
    : 'flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm';

  const labelClass = variant === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const valueClass = variant === 'dark' ? 'text-white font-bold' : 'text-gray-800 font-bold';

  return (
    <div className={wrapperClass}>
      <span className={labelClass}>📱 QR</span>
      <span className={valueClass}>{counts.qrLeads.toLocaleString()}</span>
      <span className={labelClass}>·</span>
      <span className={labelClass}>🟢 Meta</span>
      <span className={valueClass}>{counts.metaLeads.toLocaleString()}</span>
    </div>
  );
}
