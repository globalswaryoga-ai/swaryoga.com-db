'use client';

import { useState, useEffect, useCallback } from 'react';

interface CompartmentSteps {
  folderNameChosen: boolean;
  storagePurchased: boolean;
  bunnyFolderCreated: boolean;
  mongodbConfigured: boolean;
  connectionVerified: boolean;
}

interface CompartmentInfo {
  exists: boolean;
  isComplete: boolean;
  folderName: string | null;
  compartmentId: string | null;
  bunnyFolderCreated: boolean;
  mongodbConfigured: boolean;
  storageQuotaMB: number;
  storageUsedMB: number;
  storagePlan: string;
  steps: CompartmentSteps;
}

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
  // Compartment info
  compartment: CompartmentInfo;
  compartmentReady: boolean;
}

interface UseOnboardingReturn {
  status: OnboardingStatus | null;
  loading: boolean;
  error: string | null;
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  showStorageModal: boolean;
  setShowStorageModal: (show: boolean) => void;
  showCompartmentSetup: boolean;
  setShowCompartmentSetup: (show: boolean) => void;
  completeOnboarding: () => void;
  refreshStatus: () => Promise<void>;
}

const DEFAULT_COMPARTMENT: CompartmentInfo = {
  exists: false,
  isComplete: false,
  folderName: null,
  compartmentId: null,
  bunnyFolderCreated: false,
  mongodbConfigured: false,
  storageQuotaMB: 0,
  storageUsedMB: 0,
  storagePlan: 'none',
  steps: {
    folderNameChosen: false,
    storagePurchased: false,
    bunnyFolderCreated: false,
    mongodbConfigured: false,
    connectionVerified: false,
  },
};

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
  compartment: DEFAULT_COMPARTMENT,
  compartmentReady: false,
};

/**
 * useOnboarding - Hook to manage tenant onboarding state + compartment setup
 */
export function useOnboarding(): UseOnboardingReturn {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [showCompartmentSetup, setShowCompartmentSetup] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('crm_token') || localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
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
      
      // Compartment status from API
      const compartment: CompartmentInfo = data.compartment || DEFAULT_COMPARTMENT;
      const compartmentReady = compartment.isComplete;
      
      // Needs onboarding if not superadmin and compartment is not setup
      const needsOnboarding = !data.isSuperAdmin && !compartmentReady && !onboardingSeen;
      
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
        compartment,
        compartmentReady,
      };

      setStatus(statusData);

      // Compartment setup popup disabled — no longer shown to any user
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
    setShowCompartmentSetup(false);
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
    showCompartmentSetup,
    setShowCompartmentSetup,
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
