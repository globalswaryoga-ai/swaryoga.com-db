'use client';

import Link from 'next/link';
import { RitucharyaExperience } from '@/app/life-planner/ritucharya/page';
import { getToken } from '@/lib/client-auth';

/**
 * CRM (tenant) Ritucharya hub — renders the same experience as the public
 * /life-planner/ritucharya page, but without public chrome and persisted
 * per-tenant in MongoDB (via the auth token) instead of browser localStorage.
 */
export default function RitucharyaCRMHubPage() {
  const base = 'px-4 py-2 rounded-lg text-sm font-medium transition';
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 pt-4 flex gap-2 flex-wrap">
        <Link href="/admin/crm/planner-dashboard/ritucharya" className={`${base} bg-emerald-600 text-white`}>🌿 Ritucharya</Link>
        <Link href="/admin/crm/planner-dashboard/ritucharya/today" className={`${base} bg-white text-gray-700 border hover:bg-gray-50`}>📅 Today</Link>
        <Link href="/admin/crm/planner-dashboard/ritucharya/calendar" className={`${base} bg-white text-gray-700 border hover:bg-gray-50`}>🗓️ Year Calendar</Link>
      </div>
      <RitucharyaExperience persist="tenant" showChrome={false} getAuthToken={getToken} />
    </div>
  );
}
