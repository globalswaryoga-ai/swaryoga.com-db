// components/CashfreeSDKDebugger.tsx
// This component helps diagnose Cashfree SDK loading issues

'use client';

import { useEffect, useState } from 'react';

export function CashfreeSDKDebugger() {
  const [diagnostics, setDiagnostics] = useState<{
    sdkUrl: string;
    scriptLoaded: boolean;
    windowCashfree: boolean;
    checkoutFunction: boolean;
    cspAllows: boolean;
    lastCheck: string;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    const runDiagnostics = async () => {
      const results = {
        sdkUrl: 'https://sdk.cashfree.com/js/v3/cashfree.js',
        scriptLoaded: !!document.querySelector('script[src*="cashfree"]'),
        windowCashfree: typeof (window as any).Cashfree !== 'undefined',
        checkoutFunction: typeof (window as any).Cashfree?.checkout === 'function',
        cspAllows: true, // Assume true unless we see CSP errors
        lastCheck: new Date().toLocaleTimeString(),
        error: null as string | null,
      };

      // Test if SDK is actually available
      try {
        const response = await fetch(results.sdkUrl, { method: 'HEAD' });
        console.log(`📊 SDK Availability: ${response.status} ${response.statusText}`);
        
        if (response.status !== 200) {
          results.error = `SDK returned status ${response.status}`;
        }
      } catch (err: any) {
        results.error = err.message || 'Failed to fetch SDK';
        console.error('🚨 SDK Fetch Error:', err);
      }

      // Check CSP violations
      document.addEventListener('securitypolicyviolation', (event: any) => {
        if (event.blockedURI.includes('cashfree')) {
          results.cspAllows = false;
          results.error = `CSP blocked: ${event.blockedURI}`;
        }
      });

      setDiagnostics(results);

      // Log results
      console.group('🔍 Cashfree SDK Diagnostics');
      console.log('SDK URL:', results.sdkUrl);
      console.log('Script Tag Found:', results.scriptLoaded ? '✅ Yes' : '❌ No');
      console.log('window.Cashfree:', results.windowCashfree ? '✅ Yes' : '❌ No');
      console.log('Cashfree.checkout():', results.checkoutFunction ? '✅ Yes' : '❌ No');
      console.log('CSP Allows SDK:', results.cspAllows ? '✅ Yes' : '❌ No');
      console.log('Error:', results.error || 'None');
      console.groupEnd();
    };

    // Run immediately
    runDiagnostics();

    // Run again after 2 seconds (SDK might load async)
    const timeout = setTimeout(runDiagnostics, 2000);

    return () => clearTimeout(timeout);
  }, []);

  if (!diagnostics) {
    return null;
  }

  const allGood = 
    diagnostics.scriptLoaded && 
    diagnostics.windowCashfree && 
    diagnostics.checkoutFunction && 
    diagnostics.cspAllows && 
    !diagnostics.error;

  if (allGood) {
    return (
      <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
        ✅ Cashfree SDK is properly loaded and ready
      </div>
    );
  }

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm">
      <p className="font-bold text-yellow-900 mb-2">⚠️ Cashfree SDK Diagnostic Info</p>
      
      <div className="space-y-1 text-yellow-800 font-mono text-xs">
        <div>
          Script loaded: {diagnostics.scriptLoaded ? '✅' : '❌'}
        </div>
        <div>
          window.Cashfree: {diagnostics.windowCashfree ? '✅' : '❌'}
        </div>
        <div>
          Cashfree.checkout(): {diagnostics.checkoutFunction ? '✅' : '❌'}
        </div>
        <div>
          CSP allows: {diagnostics.cspAllows ? '✅' : '❌'}
        </div>
        {diagnostics.error && (
          <div className="mt-2 p-2 bg-red-100 text-red-900 rounded">
            Error: {diagnostics.error}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-600 mt-3">
        Last checked: {diagnostics.lastCheck}
      </p>
    </div>
  );
}
