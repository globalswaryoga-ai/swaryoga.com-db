'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';

export default function LegacyRagVideoPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/crm/e-learning/creation-hub');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center p-6 text-slate-100">
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
        <span className="text-sm font-semibold text-slate-200">
          Redirecting to Multilingual Creation Hub...
        </span>
      </div>
    </div>
  );
}
