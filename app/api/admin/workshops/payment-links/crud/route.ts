// POST, PUT, DELETE operations for payment links
import { NextRequest, NextResponse } from 'next/server';
import { createPaymentLink, updatePaymentLink, deletePaymentLink } from '@/lib/workshopDatabase';
import type { PaymentLink } from '@/lib/workshopDatabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const link: PaymentLink = body;
    const origin = new URL(request.url).origin;

    const { data, error } = await createPaymentLink(link, origin);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required for update' }, { status: 400 });
    }
    const origin = new URL(request.url).origin;

    const { data, error } = await updatePaymentLink(id, updates, origin);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ data });
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

    const { error } = await deletePaymentLink(id, origin);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
