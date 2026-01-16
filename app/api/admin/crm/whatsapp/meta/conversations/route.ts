import { NextRequest, NextResponse } from 'next/server';

// Mark as dynamic since this route uses request.headers or request.url
export const dynamic = 'force-dynamic';


/**
 * Compatibility route for old /meta/conversations
 */
export async function GET(request: NextRequest) {
  try {
    const { GET: parentGET } = await import('../../../conversations/route');
    
    // Pass through search params correctly
    const url = new URL(request.url);
    const newReq = new NextRequest(url.toString().replace('/meta/conversations', '/conversations'), {
      headers: request.headers,
    });

    return parentGET(newReq);
  } catch (e) {
    return NextResponse.json({ error: 'Route moved' }, { status: 410 });
  }
}
