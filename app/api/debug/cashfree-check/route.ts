import { NextResponse } from 'next/server';

/**
 * Debug endpoint to verify Cashfree credentials
 * GET /api/debug/cashfree-check
 */
export async function GET() {
  try {
    const clientId = process.env.CASHFREE_CLIENT_ID;
    const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
    const env = process.env.CASHFREE_ENV;
    const apiVersion = process.env.CASHFREE_API_VERSION;

    // Check if credentials are set
    const hasClientId = !!clientId;
    const hasClientSecret = !!clientSecret;

    // Test API call to Cashfree
    let testResult: any = null;
    let testError: any = null;

    if (hasClientId && hasClientSecret) {
      try {
        const baseUrl = env === 'production'
          ? 'https://api.cashfree.com/pg'
          : 'https://sandbox.cashfree.com/pg';

        const response = await fetch(`${baseUrl}/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-id': clientId,
            'x-client-secret': clientSecret,
            'x-api-version': apiVersion || '2023-08-01',
          },
          body: JSON.stringify({
            order_id: 'test-' + Date.now(),
            order_amount: 1,
            order_currency: 'INR',
            customer_details: {
              customer_id: 'test-customer',
              customer_name: 'Test User',
              customer_email: 'test@example.com',
              customer_phone: '9999999999',
            },
          }),
        });

        const data = await response.json();
        testResult = {
          statusCode: response.status,
          success: response.ok,
          message: data.message || data.error || (response.ok ? 'Success' : 'Failed'),
          details: data,
        };
      } catch (error: any) {
        testError = {
          message: error.message,
          type: error.name,
        };
      }
    }

    return NextResponse.json({
      status: 'ok',
      credentials: {
        hasClientId,
        hasClientSecret,
        clientIdPrefix: clientId ? clientId.substring(0, 10) + '...' : 'NOT SET',
        clientSecretPrefix: clientSecret ? clientSecret.substring(0, 10) + '...' : 'NOT SET',
      },
      environment: {
        CASHFREE_ENV: env || 'NOT SET',
        CASHFREE_API_VERSION: apiVersion || 'NOT SET',
        baseUrl: env === 'production'
          ? 'https://api.cashfree.com/pg'
          : 'https://sandbox.cashfree.com/pg',
      },
      testResult,
      testError,
      advice:
        !hasClientId || !hasClientSecret
          ? 'Missing Cashfree credentials. Set CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET in .env'
          : testResult?.success
          ? 'Credentials appear valid. Payment should work.'
          : testResult?.statusCode === 401 || testResult?.statusCode === 403
          ? 'Authentication failed. Check if credentials are correct and not expired.'
          : 'Check the test result details for more information.',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
