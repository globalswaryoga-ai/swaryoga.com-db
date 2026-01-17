// app/api/debug/cashfree-sdk-status/route.ts
// API endpoint to verify Cashfree SDK accessibility from the server

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    sdkUrl: 'https://sdk.cashfree.com/js/v3/cashfree.js',
    tests: {
      sdkReachable: false,
      sdkStatusCode: null as number | null,
      sdkContentType: null as string | null,
      sdkFileSize: null as number | null,
      corsHeaders: null as any,
      error: null as string | null,
    }
  };

  try {
    // Test 1: Check if SDK is reachable
    console.log('🧪 Testing Cashfree SDK accessibility from server...');
    
    const response = await fetch(diagnostics.sdkUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Swar Yoga SDK Test)',
      }
    });

    diagnostics.tests.sdkStatusCode = response.status;
    diagnostics.tests.sdkContentType = response.headers.get('content-type');
    diagnostics.tests.sdkFileSize = parseInt(response.headers.get('content-length') || '0');
    diagnostics.tests.corsHeaders = {
      'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
    };

    diagnostics.tests.sdkReachable = response.status === 200;

    if (response.status !== 200) {
      diagnostics.tests.error = `SDK returned HTTP ${response.status}`;
      console.error(`❌ SDK Status: ${response.status}`);
    } else {
      console.log(`✅ SDK Status: 200 OK`);
      console.log(`   Content-Type: ${diagnostics.tests.sdkContentType}`);
      console.log(`   File Size: ${diagnostics.tests.sdkFileSize} bytes`);
    }
  } catch (error: any) {
    diagnostics.tests.error = error.message || 'Unknown error';
    console.error('❌ Failed to test SDK:', error.message);
  }

  // Test 2: Check environment variables
  const envCheck = {
    hasClientId: !!process.env.CASHFREE_CLIENT_ID,
    hasSecret: !!process.env.CASHFREE_CLIENT_SECRET,
    hasEnv: !!process.env.CASHFREE_ENV,
    env: process.env.CASHFREE_ENV || 'not set',
  };

  // Test 3: Check if we can reach Cashfree API
  let apiReachable = false;
  try {
    const apiResponse = await fetch('https://api.cashfree.com/payments/v1/orders', {
      method: 'GET',
      headers: {
        'X-API-Version': '2023-08-01',
        'Authorization': `Bearer ${process.env.CASHFREE_CLIENT_SECRET}`,
      },
    });
    apiReachable = apiResponse.status !== 500 && apiResponse.status !== 0;
  } catch (e) {
    apiReachable = false;
  }

  return NextResponse.json({
    status: diagnostics.tests.sdkReachable ? 'healthy' : 'degraded',
    diagnostics,
    environment: envCheck,
    apiStatus: apiReachable ? 'reachable' : 'check credentials',
    recommendations: [
      !diagnostics.tests.sdkReachable && 'SDK not reachable - check network/VPN',
      envCheck.hasClientId === false && 'CASHFREE_CLIENT_ID not set',
      envCheck.hasSecret === false && 'CASHFREE_CLIENT_SECRET not set',
      diagnostics.tests.sdkFileSize && diagnostics.tests.sdkFileSize < 50000 && 'SDK file size seems small',
    ].filter(Boolean),
  }, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    }
  });
}
