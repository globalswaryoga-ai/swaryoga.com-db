'use client';

import Link from 'next/link';
import { Sparkles, User, Eye } from 'lucide-react';
import { PageHeader } from '@/components/admin/crm';

export default function KpDataEntryHubPage() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader theme="light"
        title={
          <span className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-500" />
            KP Data Entry
          </span>
        }
        subtitle="Start a new birth chart or a horary (Prashna) question"
      />

      <div className="grid sm:grid-cols-2 gap-5">
        <Link
          href="/admin/crm/kp-astro/charts"
          className="rounded-2xl border border-gray-200 bg-white p-6 hover:border-indigo-300 hover:shadow-sm transition group"
        >
          <User className="h-8 w-8 text-indigo-500 mb-3" />
          <h2 className="font-semibold text-gray-900 mb-1 group-hover:text-indigo-600">Birth Chart (Janma Kundali)</h2>
          <p className="text-sm text-gray-500">Enter a person's date, time, and place of birth — calculate or manually enter houses, planets, and dashas.</p>
        </Link>

        <Link
          href="/admin/crm/kp-astro/horary"
          className="rounded-2xl border border-gray-200 bg-white p-6 hover:border-indigo-300 hover:shadow-sm transition group"
        >
          <Eye className="h-8 w-8 text-indigo-500 mb-3" />
          <h2 className="font-semibold text-gray-900 mb-1 group-hover:text-indigo-600">Horary / Prashna Kundali</h2>
          <p className="text-sm text-gray-500">Querent picks a number 1-249 at the moment of asking — cast a chart from that number for horary judgment.</p>
        </Link>
      </div>
    </div>
  );
}
