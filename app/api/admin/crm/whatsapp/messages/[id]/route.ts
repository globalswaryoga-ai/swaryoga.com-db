import { NextRequest, NextResponse } from 'next/server';

/**
 * Compatibility route for /api/admin/crm/whatsapp/messages/[id]
 * Proxies to /api/admin/crm/messages?leadId=[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { GET: parentGET } = await import('../../../messages/route');
    
    // Create a normalized request with leadId in query string
    const url = new URL(request.url);
    url.searchParams.set('leadId', id);
    
    const newReq = new NextRequest(url.toString(), {
      headers: request.headers,
    });

    return parentGET(newReq);
  } catch (err: any) {
    console.error('[Compatibility Messages Route Error]:', err);
    return NextResponse.json({ 
      success: false, 
      error: 'Proxy Error', 
      message: err.message 
    }, { status: 500 });
  }
}
