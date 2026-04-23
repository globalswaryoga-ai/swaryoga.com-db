import { useState, useEffect, useCallback } from 'react';

export interface TrialStatus {
  hasActiveTrial: boolean;
  trial?: {
    trialStartDate: string;
    trialEndDate: string;
    daysRemaining: number;
    daysSinceStart: number;
    storagePaymentPaid: boolean;
    status: string;
    qrWhatsAppNumber?: string;
  };
  popup?: {
    type: 'storage-payment' | 'upgrade-offer' | 'trial-expired';
    title: string;
    message: string;
    amount?: number;
    days?: string;
    action?: string;
    actions?: string[];
  } | null;
}

export function useTrialCheck(token: string | null) {
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrialStatus = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/admin/crm/tenant/trial-check', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError('Session expired');
        } else {
          const data = await res.json();
          setError(data.error || 'Failed to fetch trial status');
        }
        setTrialStatus(null);
        return;
      }

      const data = await res.json();
      setTrialStatus(data);
    } catch (err) {
      console.error('[useTrialCheck] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch trial status');
      setTrialStatus(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTrialStatus();
    // Refresh every 5 minutes
    const interval = setInterval(fetchTrialStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchTrialStatus]);

  return { trialStatus, loading, error, refetch: fetchTrialStatus };
}
