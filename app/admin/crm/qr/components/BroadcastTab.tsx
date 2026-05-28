'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface BroadcastTabProps { token: string | null; isConnected: boolean }

export function BroadcastTab({ token, isConnected }: BroadcastTabProps) {
  const router = useRouter();

  useEffect(() => {
    router.push('/admin/crm/qr-broadcast');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
      <Loader2 className="w-6 h-6 animate-spin text-green-600" />
      <p className="text-sm">Opening QR Broadcast...</p>
    </div>
  );
}
