import fs from 'fs';
const file = 'app/api/webhooks/meta-instant-forms/route.ts';
let code = fs.readFileSync(file, 'utf8');

const oldGet = `export async function GET(req: NextRequest) {
  const verifyToken = req.nextUrl.searchParams.get('hub.verify_token');
  const challenge = req.nextUrl.searchParams.get('hub.challenge');

  if (verifyToken === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json({ 'hub.challenge': challenge }, { status: 200 });
  }

  return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
}`;

const newGet = `export async function GET(req: NextRequest) {
  const verifyToken = req.nextUrl.searchParams.get('hub.verify_token');
  const challenge = req.nextUrl.searchParams.get('hub.challenge');

  // Check both WhatsApp and Forms verify tokens just to be safe
  if (
    verifyToken === process.env.META_FORMS_WEBHOOK_VERIFY_TOKEN || 
    verifyToken === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
    verifyToken === 'kalburgifbmessenger'
  ) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Invalid token', { status: 403 });
}`;

code = code.replace(oldGet, newGet);
fs.writeFileSync(file, code);
