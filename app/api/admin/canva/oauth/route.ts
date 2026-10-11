import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // OAuth must start from an authenticated CRM request, not an anonymous GET.
  return NextResponse.redirect(new URL('/admin/crm/workshop-offer?tab=studio', request.url));
}
