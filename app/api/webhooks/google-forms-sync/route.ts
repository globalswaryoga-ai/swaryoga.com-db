import { NextRequest } from 'next/server';
import { POST as handleGoogleFormWebhook, GET as handleGoogleFormGet } from '../google-forms/route';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return handleGoogleFormGet(req);
}

export async function POST(req: NextRequest) {
  return handleGoogleFormWebhook(req);
}
