import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const proxyToEnv = async (request: NextRequest, init: RequestInit & { method: string }) => {
  const origin = new URL(request.url).origin;
  const url = new URL('/api/admin/workshops/payment-links/env', origin);
  const authHeader = request.headers.get('authorization') || '';

  const response = await fetch(url.toString(), {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    cache: 'no-store',
  });

  const json = await response.json().catch(() => null);
  return { response, json };
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { response, json } = await proxyToEnv(request, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json({ error: json?.error || 'Failed to create payment link' }, { status: response.status });
    }

    return NextResponse.json({ data: json?.data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body || {};
    if (!id) {
      return NextResponse.json({ error: 'ID is required for update' }, { status: 400 });
    }

    const { response, json } = await proxyToEnv(request, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json({ error: json?.error || 'Failed to update payment link' }, { status: response.status });
    }

    return NextResponse.json({ data: json?.data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required for deletion' }, { status: 400 });
    }
    const origin = new URL(request.url).origin;
    const url = new URL('/api/admin/workshops/payment-links/env', origin);
    url.searchParams.set('id', id);
    const authHeader = request.headers.get('authorization') || '';

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: authHeader ? { Authorization: authHeader } : undefined,
      cache: 'no-store',
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json({ error: json?.error || 'Failed to delete payment link' }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
