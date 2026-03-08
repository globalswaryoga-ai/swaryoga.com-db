'use client';

import { useState, useEffect, useCallback } from 'react';

interface OnboardingStatus {
  setupPaid: boolean;
  isFirstLogin: boolean;
  loginCount: number;
  storageUsedMB: number;
  storageLimitMB: number;
  planName: string;
  planId: string;
  isSuperAdmin: boolean;
  needsOnboarding: boolean;
}

interface UseOnboardingReturn {
  status: OnboardingStatus | null;
  loading: boolean;
  error: string | null;
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  showStorageModal: boolean;
  setShowStorageModal: (show: boolean) => void;
  completeOnboarding: () => void;
  refreshStatus: () => Promise<void>;
}

const DEFAULT_STATUS: OnboardingStatus = {
  setupPaid: false,
  isFirstLogin: true,
  loginCount: 0,
  storageUsedMB: 0,
  storageLimitMB: 500,
  planName: 'Free Trial',
  planId: '',
  isSuperAdmin: false,
  needsOnboarding: true,
};

/**
 * useOnboarding - Hook to manage tenant onboarding state
 */
export function useOnboarding(): UseOnboardingReturn {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showStorageModal, setShowStorageModal] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('crm_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/crm-site/setup-status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }

      const data = await response.json();
      
      const onboardingSeen = localStorage.getItem('crm_onboarding_seen') === 'true';
      const needsOnboarding = !data.isSuperAdmin && !data.setupPaid && !onboardingSeen;
      
      const statusData: OnboardingStatus = {
        setupPaid: data.setupPaid || false,
        isFirstLogin: data.isFirstLogin || false,
        loginCount: data.loginCount || 0,
        storageUsedMB: data.storageUsedMB || 0,
        storageLimitMB: data.storageLimitMB || 500,
        planName: data.planName || 'Free Trial',
        planId: data.planId || '',
        isSuperAdmin: data.isSuperAdmin || false,
        needsOnboarding,
      };

      setStatus(statusData);

      // Show onboarding if needed
      if (needsOnboarding && data.isFirstLogin) {
        setShowOnboarding(true);
      }
    } catch (err: any) {
      console.error('Error fetching onboarding status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const completeOnboarding = useCallback(() => {
    localStorage.setItem('crm_onboarding_seen', 'true');
    setShowOnboarding(false);
    // Refresh status after completing
    fetchStatus();
  }, [fetchStatus]);

  return {
    status,
    loading,
    error,
    showOnboarding,
    setShowOnboarding,
    showStorageModal,
    setShowStorageModal,
    completeOnboarding,
    refreshStatus: fetchStatus,
  };
}

/**
 * Check if user has exceeded their storage limit
 */
export function useStorageCheck() {
  const { status, setShowStorageModal } = useOnboarding();

  const checkStorageLimit = useCallback(() => {
    if (!status) return false;
    
    const usagePercent = (status.storageUsedMB / status.storageLimitMB) * 100;
    
    // If usage is above 90%, show upgrade modal
    if (usagePercent >= 90 && !status.isSuperAdmin) {
      setShowStorageModal(true);
      return true;
    }
    
    return false;
  }, [status, setShowStorageModal]);

  return {
    isNearLimit: status ? (status.storageUsedMB / status.storageLimitMB) >= 0.9 : false,
    isOverLimit: status ? status.storageUsedMB >= status.storageLimitMB : false,
    usagePercent: status ? (status.storageUsedMB / status.storageLimitMB) * 100 : 0,
    checkStorageLimit,
  };
}
