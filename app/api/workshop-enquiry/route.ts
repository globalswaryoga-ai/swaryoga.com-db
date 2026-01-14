import { NextRequest, NextResponse } from 'next/server';

// Backwards-compatible alias for the existing enquiries API.
// The UI currently posts to /api/workshop-enquiry, while the server route is /api/enquiries.
// We keep both so older links/components keep working.
export async function POST(request: NextRequest) {
  const url = new URL('/api/enquiries', request.url);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': request.headers.get('content-type') || 'application/json',
    },
    body: await request.text(),
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('content-type') || 'application/json',
    },
  });
}

export async function GET(request: NextRequest) {
  const url = new URL('/api/enquiries', request.url);
  url.search = new URL(request.url).search;

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('content-type') || 'application/json',
    },
  });
}
