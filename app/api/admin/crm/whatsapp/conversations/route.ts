import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Compatibility route for /api/admin/crm/whatsapp/conversations
 * Proxies to the unified /api/admin/crm/conversations route.
 */

// Mark this route as dynamic (uses request.url)

export async function GET(request: NextRequest) {
  try {
    // Import the parent handler dynamically to share logic
    const { GET: parentGET } = await import('../../conversations/route');
    
    // Create a normalized request that the parent handler expects
    const url = new URL(request.url);
    const newReq = new NextRequest(url.toString(), {
      headers: request.headers,
    });

    return parentGET(newReq);
  } catch (err: any) {
    console.error('[Compatibility Route Error]:', err);
    return NextResponse.json({ 
      success: false, 
      error: 'Proxy Error', 
      message: err.message 
    }, { status: 500 });
  }
}
