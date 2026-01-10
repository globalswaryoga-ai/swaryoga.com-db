import { NextRequest, NextResponse } from 'next/server';

/**
 * Compatibility route for /api/admin/crm/whatsapp/messages
 * Proxies to the unified /api/admin/crm/messages route.
 */
export async function GET(request: NextRequest) {
  try {
    const { GET: parentGET } = await import('../../messages/route');
    
    // Pass through as is
    const url = new URL(request.url);
    const newReq = new NextRequest(url.toString(), {
      headers: request.headers,
    });

    return parentGET(newReq);
  } catch (err: any) {
    console.error('[Compatibility Messages Collection Route Error]:', err);
    return NextResponse.json({ 
      success: false, 
      error: 'Proxy Error', 
      message: err.message 
    }, { status: 500 });
  }
}
