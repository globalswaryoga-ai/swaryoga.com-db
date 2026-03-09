'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Database, Lock, AlertTriangle, Loader2, Settings } from 'lucide-react';
import CompartmentSetupModal from './CompartmentSetupModal';

interface CompartmentGuardProps {
  children: React.ReactNode;
  pageName?: string;
  onStoragePurchase?: () => void;
}

/**
 * CompartmentGuard - Wraps CRM page content and blocks access until
 * the user's data compartment (MongoDB + Bunny) is fully configured.
 * 
 * Superadmins bypass this guard.
 * 
 * Usage:
 * <CompartmentGuard pageName="Leads">
 *   <LeadsPageContent />
 * </CompartmentGuard>
 */
export default function CompartmentGuard({
  children,
  pageName = 'this page',
  onStoragePurchase,
}: CompartmentGuardProps) {
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [compartmentReady, setCompartmentReady] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  const checkCompartment = useCallback(async () => {
    try {
      const token = localStorage.getItem('crm_token') || localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const res = await fetch('/api/crm-site/setup-status', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setIsSuperAdmin(data.isSuperAdmin || false);
        
        // Superadmins always pass
        if (data.isSuperAdmin) {
          setCompartmentReady(true);
        } else {
          // Check compartment completion
          setCompartmentReady(data.compartment?.isComplete || false);
        }
      }
    } catch (err) {
      console.error('Compartment check failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkCompartment();
  }, [checkCompartment]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // Compartment not ready - show blocker
  if (!compartmentReady && !isSuperAdmin) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[500px] p-8">
          <div className="max-w-md text-center">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="h-10 w-10 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Setup Required
            </h2>
            <p className="text-gray-500 mb-6">
              Before using <strong>{pageName}</strong>, you need to complete your data compartment setup.
              This creates your own isolated space in MongoDB and Bunny CDN.
            </p>
            
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6 text-left">
              <div className="flex items-start gap-3">
                <Database className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-indigo-900 text-sm">Your Data is Isolated</p>
                  <p className="text-xs text-indigo-700 mt-1">
                    Each user gets their own folder and database space. No other user can see your leads, messages, or files.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowSetup(true)}
              className="bg-gradient-to-r from-indigo-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition flex items-center justify-center gap-2 mx-auto"
            >
              <Settings className="h-5 w-5" />
              Complete Setup
            </button>
          </div>
        </div>

        {/* Setup Modal */}
        {showSetup && (
          <CompartmentSetupModal
            isOpen={showSetup}
            onClose={() => setShowSetup(false)}
            onComplete={() => {
              setShowSetup(false);
              setCompartmentReady(true);
            }}
            onStoragePurchase={() => {
              setShowSetup(false);
              if (onStoragePurchase) {
                onStoragePurchase();
              }
            }}
          />
        )}
      </>
    );
  }

  // Compartment ready - render children
  return <>{children}</>;
}
