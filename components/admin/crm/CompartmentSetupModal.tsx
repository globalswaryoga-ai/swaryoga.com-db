'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  FolderOpen,
  Cloud,
  CheckCircle,
  Circle,
  Loader2,
  AlertCircle,
  X,
  ArrowRight,
  RefreshCw,
  HardDrive,
  Shield,
  Zap,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CompartmentStatus {
  exists: boolean;
  setupRequired: boolean;
  compartment?: {
    compartmentId: string;
    folderName: string;
    bunny: {
      folderPath: string;
      folderCreated: boolean;
      folderCreatedAt?: string;
      cdnUrl?: string;
    };
    storage: {
      quotaMB: number;
      usedMB: number;
      plan: string;
      purchasedAt?: string;
    };
    setup: {
      isComplete: boolean;
      completedAt?: string;
      steps: {
        folderNameChosen: boolean;
        storagePurchased: boolean;
        bunnyFolderCreated: boolean;
        mongodbConfigured: boolean;
        connectionVerified: boolean;
      };
    };
  };
  steps?: {
    folderNameChosen: boolean;
    storagePurchased: boolean;
    bunnyFolderCreated: boolean;
    mongodbConfigured: boolean;
    connectionVerified: boolean;
  };
}

interface CompartmentSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onStoragePurchase: () => void;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CompartmentSetupModal({
  isOpen,
  onClose,
  onComplete,
  onStoragePurchase,
}: CompartmentSetupModalProps) {
  const [status, setStatus] = useState<CompartmentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [folderName, setFolderName] = useState('');
  const [folderError, setFolderError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  // Fetch compartment status
  const fetchStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('crm_token') || localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      if (!token) return;

      const res = await fetch('/api/crm-site/compartment', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        determineCurrentStep(data);
      }
    } catch (err) {
      console.error('Failed to fetch compartment status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchStatus();
    }
  }, [isOpen, fetchStatus]);

  // Determine which step user is on
  const determineCurrentStep = (data: CompartmentStatus) => {
    const steps = data.compartment?.setup?.steps || data.steps || {
      folderNameChosen: false,
      storagePurchased: false,
      bunnyFolderCreated: false,
      mongodbConfigured: false,
      connectionVerified: false,
    };

    if (!steps.folderNameChosen) { setCurrentStep(0); return; }
    if (!steps.storagePurchased) { setCurrentStep(1); return; }
    if (!steps.bunnyFolderCreated) { setCurrentStep(2); return; }
    if (!steps.mongodbConfigured) { setCurrentStep(3); return; }
    if (!steps.connectionVerified) { setCurrentStep(4); return; }
    setCurrentStep(5); // All complete
  };

  // Step 1: Choose folder name
  const handleInitialize = async () => {
    setFolderError('');
    setActionError('');

    const trimmed = folderName.trim().toLowerCase();
    if (!trimmed || trimmed.length < 3) {
      setFolderError('Folder name must be at least 3 characters');
      return;
    }
    if (!/^[a-z0-9][a-z0-9_-]*[a-z0-9]$/.test(trimmed) && trimmed.length > 2) {
      setFolderError('Only letters, numbers, hyphens, underscores. Must start/end with letter or number.');
      return;
    }

    setActionLoading(true);
    try {
      const token = localStorage.getItem('crm_token') || localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const res = await fetch('/api/crm-site/compartment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'initialize', folderName: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFolderError(data.error || 'Failed to initialize');
        return;
      }

      setActionMessage('Folder name set! Next: Purchase storage.');
      await fetchStatus();
    } catch (err: any) {
      setFolderError(err.message || 'Failed to initialize');
    } finally {
      setActionLoading(false);
    }
  };

  // Step 3: Create Bunny folder
  const handleCreateBunnyFolder = async () => {
    setActionLoading(true);
    setActionError('');
    try {
      const token = localStorage.getItem('crm_token') || localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const res = await fetch('/api/crm-site/compartment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'createBunnyFolder' }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || 'Failed to create Bunny folder');
        return;
      }

      setActionMessage('Bunny CDN folder created!');
      await fetchStatus();
    } catch (err: any) {
      setActionError(err.message || 'Failed to create Bunny folder');
    } finally {
      setActionLoading(false);
    }
  };

  // Step 4: Mark MongoDB setup
  const handleMongoDBSetup = async () => {
    setActionLoading(true);
    setActionError('');
    try {
      const token = localStorage.getItem('crm_token') || localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const res = await fetch('/api/crm-site/compartment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'markMongoDBSetup' }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || 'Failed to configure MongoDB');
        return;
      }

      setActionMessage('MongoDB configured!');
      await fetchStatus();
    } catch (err: any) {
      setActionError(err.message || 'Failed to configure MongoDB');
    } finally {
      setActionLoading(false);
    }
  };

  // Step 5: Verify all connections
  const handleVerifyConnection = async () => {
    setActionLoading(true);
    setActionError('');
    setActionMessage('');
    try {
      const token = localStorage.getItem('crm_token') || localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const res = await fetch('/api/crm-site/compartment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'verifyConnection' }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || 'Verification failed');
        return;
      }

      if (data.setupComplete) {
        setActionMessage('All systems connected! Your CRM is ready.');
        await fetchStatus();
        // Brief delay, then trigger complete
        setTimeout(() => onComplete(), 2000);
      } else {
        setActionError(`Verification incomplete. Bunny: ${data.results?.bunny ? '✅' : '❌'}, MongoDB: ${data.results?.mongodb ? '✅' : '❌'}, Storage: ${data.results?.storage ? '✅' : '❌'}`);
      }
    } catch (err: any) {
      setActionError(err.message || 'Verification failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  const steps = [
    {
      label: 'Choose Folder Name',
      icon: FolderOpen,
      description: 'Pick a unique folder name for your data compartment',
    },
    {
      label: 'Purchase Storage',
      icon: HardDrive,
      description: 'Buy storage to activate your compartment',
    },
    {
      label: 'Create CDN Folder',
      icon: Cloud,
      description: 'Auto-create your Bunny CDN storage folder',
    },
    {
      label: 'Configure Database',
      icon: Database,
      description: 'Setup MongoDB data isolation',
    },
    {
      label: 'Verify Connection',
      icon: Shield,
      description: 'Confirm everything is connected',
    },
  ];

  const currentStepData = status?.compartment?.setup?.steps || status?.steps || {
    folderNameChosen: false,
    storagePurchased: false,
    bunnyFolderCreated: false,
    mongodbConfigured: false,
    connectionVerified: false,
  };

  const stepComplete = [
    currentStepData.folderNameChosen,
    currentStepData.storagePurchased,
    currentStepData.bunnyFolderCreated,
    currentStepData.mongodbConfigured,
    currentStepData.connectionVerified,
  ];

  const allComplete = stepComplete.every(Boolean);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-white hover:bg-gray-50 rounded-full flex items-center justify-center text-gray-700 transition-all shadow-md hover:shadow-lg"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-600 px-6 py-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Setup Your Data Compartment</h2>
              <p className="text-indigo-100 text-sm">
                MongoDB + Bunny CDN isolation for your account
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-indigo-200 mb-1">
              <span>{stepComplete.filter(Boolean).length} of {steps.length} steps</span>
              <span>{Math.round((stepComplete.filter(Boolean).length / steps.length) * 100)}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${(stepComplete.filter(Boolean).length / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <span className="ml-3 text-gray-600">Loading compartment status...</span>
          </div>
        ) : allComplete ? (
          /* All Complete */
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Compartment Ready!</h3>
            <p className="text-gray-500 mb-2">
              Your data is isolated at: <code className="bg-gray-100 px-2 py-0.5 rounded text-indigo-600 font-mono text-sm">{status?.compartment?.folderName || '—'}</code>
            </p>
            <p className="text-gray-400 text-sm mb-6">
              MongoDB + Bunny CDN are 100% connected. You can now use all CRM pages.
            </p>
            <button
              onClick={onComplete}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition"
            >
              <Zap className="h-5 w-5 inline -mt-0.5 mr-2" />
              Start Using CRM
            </button>
          </div>
        ) : (
          /* Steps */
          <div className="p-6">
            {/* Step list */}
            <div className="space-y-3 mb-6">
              {steps.map((step, idx) => {
                const isComplete = stepComplete[idx];
                const isCurrent = idx === currentStep;
                const isLocked = idx > currentStep && !isComplete;

                return (
                  <div
                    key={idx}
                    className={`
                      flex items-center gap-3 p-3 rounded-xl border transition
                      ${isCurrent ? 'border-indigo-300 bg-indigo-50 shadow-sm' : ''}
                      ${isComplete ? 'border-green-200 bg-green-50' : ''}
                      ${isLocked ? 'border-gray-200 bg-gray-50 opacity-60' : ''}
                    `}
                  >
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                      ${isComplete ? 'bg-green-500 text-white' : ''}
                      ${isCurrent && !isComplete ? 'bg-indigo-500 text-white' : ''}
                      ${isLocked ? 'bg-gray-300 text-white' : ''}
                    `}>
                      {isComplete ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-bold">{idx + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm ${isComplete ? 'text-green-700' : isCurrent ? 'text-indigo-700' : 'text-gray-500'}`}>
                        {step.label}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{step.description}</p>
                    </div>
                    <step.icon className={`h-5 w-5 flex-shrink-0 ${isComplete ? 'text-green-500' : isCurrent ? 'text-indigo-500' : 'text-gray-400'}`} />
                  </div>
                );
              })}
            </div>

            {/* Current step action area */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              {/* Step 0: Choose folder name */}
              {currentStep === 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Choose Your Folder Name</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    This will be your unique data folder name. All your files, leads, and messages will be stored under this name in MongoDB and Bunny CDN.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={folderName}
                      onChange={(e) => {
                        setFolderName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''));
                        setFolderError('');
                      }}
                      placeholder="e.g., mycompany, john-yoga"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      maxLength={32}
                    />
                    <button
                      onClick={handleInitialize}
                      disabled={actionLoading || !folderName.trim()}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                      Set Name
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    3-32 chars, only lowercase letters, numbers, hyphens, underscores
                  </p>
                  {folderError && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {folderError}
                    </p>
                  )}
                </div>
              )}

              {/* Step 1: Purchase storage */}
              {currentStep === 1 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Purchase Storage</h4>
                  <p className="text-sm text-gray-500 mb-3">
                    Buy storage to activate your data compartment. Your files will be stored in Bunny CDN under
                    <code className="bg-gray-200 px-1.5 py-0.5 rounded ml-1 text-indigo-600 font-mono text-xs">
                      users/{status?.compartment?.folderName || folderName}/
                    </code>
                  </p>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { plan: 'starter', label: '500MB', price: '₹30' },
                      { plan: 'growth', label: '2GB', price: '₹99' },
                      { plan: 'pro', label: '10GB', price: '₹349' },
                    ].map(({ plan, label, price }) => (
                      <div key={plan} className="border border-gray-200 rounded-lg p-2 text-center hover:border-indigo-400 transition cursor-pointer">
                        <p className="font-bold text-gray-900 text-sm">{label}</p>
                        <p className="text-xs text-gray-500">{price}</p>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={onStoragePurchase}
                    className="w-full bg-gradient-to-r from-indigo-600 to-indigo-600 text-white py-2.5 rounded-lg font-medium hover:shadow-lg transition flex items-center justify-center gap-2"
                  >
                    <HardDrive className="h-4 w-4" />
                    Buy Storage Now
                  </button>
                </div>
              )}

              {/* Step 2: Create Bunny folder */}
              {currentStep === 2 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Create CDN Storage Folder</h4>
                  <p className="text-sm text-gray-500 mb-3">
                    Your isolated Bunny CDN folder will be created at:
                    <code className="block bg-gray-200 px-2 py-1 rounded mt-1 text-indigo-600 font-mono text-xs">
                      users/{status?.compartment?.folderName || folderName}/
                    </code>
                  </p>
                  <button
                    onClick={handleCreateBunnyFolder}
                    disabled={actionLoading}
                    className="w-full bg-orange-500 text-white py-2.5 rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating folder...
                      </>
                    ) : (
                      <>
                        <Cloud className="h-4 w-4" />
                        Create Bunny Folder
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Step 3: Configure MongoDB */}
              {currentStep === 3 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Configure Database Isolation</h4>
                  <p className="text-sm text-gray-500 mb-3">
                    MongoDB data isolation ensures your leads, messages, and contacts are only visible to you. This will be auto-configured.
                  </p>
                  <button
                    onClick={handleMongoDBSetup}
                    disabled={actionLoading}
                    className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Configuring...
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4" />
                        Configure MongoDB
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Step 4: Verify connection */}
              {currentStep === 4 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Verify All Connections</h4>
                  <p className="text-sm text-gray-500 mb-3">
                    Final step! We will verify that your MongoDB, Bunny CDN, and storage are all properly connected and isolated.
                  </p>
                  <button
                    onClick={handleVerifyConnection}
                    disabled={actionLoading}
                    className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4" />
                        Verify & Complete Setup
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Success/Error messages */}
              {actionMessage && (
                <p className="text-sm text-green-600 mt-3 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" /> {actionMessage}
                </p>
              )}
              {(actionError || folderError) && (
                <p className="text-sm text-red-500 mt-3 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" /> {actionError}
                </p>
              )}
            </div>

            {/* Info box */}
            <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <p className="text-xs text-indigo-700">
                <strong>Why compartment setup?</strong> Each user gets their own isolated data space.
                Your leads, messages, templates, and files are completely separate from other users.
                This ensures data privacy and security.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
