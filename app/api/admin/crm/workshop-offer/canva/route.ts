import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { registrationViewer } from '@/lib/registrationAuth';
import { canvaToken, canvaRedirect } from '@/lib/canvaConnection';
import { listOfferDesigns, saveOfferDesign } from '@/lib/workshopOfferRepository';
import { uploadUserFile } from '@/lib/bunny-storage';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';
export async function DELETE(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    await bunnyExecute('CREATE TABLE IF NOT EXISTS canva_connections_sql(user_id TEXT PRIMARY KEY,credentials TEXT NOT NULL,expires_at INTEGER NOT NULL)');
    await bunnyExecute({ sql: 'DELETE FROM canva_connections_sql WHERE user_id=?', args: [viewer.userId] });
    const response = NextResponse.json({ success: true });
    response.cookies.delete('canva_access_token');
    response.cookies.delete('canva_refresh_token');
    return response;
  } catch (error) { console.error('[Canva disconnect]', error); return NextResponse.json({ error: 'Canva disconnect failed' }, { status: 503 }); }
}
export async function POST(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    const body = await request.json();
    if (body.action === 'connect') {
      if (!process.env.CANVA_CLIENT_ID || !process.env.CANVA_CLIENT_SECRET || !process.env.ENCRYPTION_KEY) return NextResponse.json({ error: 'Canva OAuth credentials and ENCRYPTION_KEY must be configured' }, { status: 503 });
      if (new URL(canvaRedirect(request)).origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Open the CRM on the configured Canva redirect domain before connecting, or configure a matching local redirect URI.' }, { status: 400 });
      const verifier = crypto.randomBytes(32).toString('base64url');
      const state = crypto.randomBytes(24).toString('hex');
      const url = new URL('https://www.canva.com/api/oauth/authorize');
      url.search = new URLSearchParams({ response_type: 'code', client_id: process.env.CANVA_CLIENT_ID.trim(), redirect_uri: canvaRedirect(request), state, code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 's256', scope: 'design:content:read design:content:write design:meta:read asset:read asset:write brandtemplate:meta:read brandtemplate:content:read' }).toString();
      const response = NextResponse.json({ url: url.toString() });
      const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: 600 };
      response.cookies.set('canva_code_verifier', verifier, options);
      response.cookies.set('canva_oauth_state', state, options);
      response.cookies.set('canva_crm_token', request.headers.get('authorization')!.slice(7), options);
      return response;
    }
    const token = await canvaToken(viewer.userId);
    if (!token) return NextResponse.json({ error: 'Connect Canva from this CRM account first' }, { status: 409 });
    const scope = viewer.superAdmin ? 'shared' : viewer.userId;
    const exportJob = body.action === 'export';
    if (!['export', 'autofill'].includes(body.action)) return NextResponse.json({ error: 'Invalid Canva action' }, { status: 400 });
    const id = exportJob ? body.designId : String(body.templateId || '').match(/brand-templates\/([\w-]+)/)?.[1] || body.templateId;
    if (typeof id !== 'string' || !/^[\w-]+$/.test(id)) return NextResponse.json({ error: 'Provide a Canva design ID or published Brand Template ID' }, { status: 400 });
    const provider = await fetch(`https://api.canva.com/rest/v1/${exportJob ? 'exports' : 'autofills'}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(exportJob ? { design_id: id, format: { type: 'pdf' } } : { brand_template_id: id, title: 'Swar Yoga CRM design', data: body.data }),
      signal: AbortSignal.timeout(30000),
    });
    const result = await provider.json();
    if (!provider.ok) return NextResponse.json({ error: result.message || `Canva request failed (${provider.status}); check account plan, scopes and template dataset fields.` }, { status: provider.status });
    const job = { id: crypto.randomUUID(), kind: 'canva-job', providerJobId: result.job.id, action: body.action, status: result.job.status, ownerUserId: viewer.userId };
    await saveOfferDesign(scope, job.id, 'canva-job', job);
    return NextResponse.json({ data: job });
  } catch (error) { console.error('[offer Canva]', error); return NextResponse.json({ error: error instanceof Error ? error.message : 'Canva request failed' }, { status: 502 }); }
}

export async function GET(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    const token = await canvaToken(viewer.userId);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ connected: Boolean(token) });
    if (!token) return NextResponse.json({ error: 'Canva is not connected' }, { status: 409 });
    const scope = viewer.superAdmin ? 'shared' : viewer.userId;
    const job = (await listOfferDesigns(scope)).find(row => row.id === id && row.kind === 'canva-job' && row.ownerUserId === viewer.userId);
    if (!job) return NextResponse.json({ error: 'Canva job not found' }, { status: 404 });
    if (job.fileUrl || job.designId) return NextResponse.json({ data: job });
    const response = await fetch(`https://api.canva.com/rest/v1/${job.action === 'export' ? 'exports' : 'autofills'}/${encodeURIComponent(job.providerJobId)}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Canva job check failed');
    job.status = data.job.status;
    if (job.status === 'failed') throw new Error(data.job.error?.message || 'Canva generation failed');
    if (job.status === 'success') {
      if (job.action === 'autofill') job.designId = data.job.result.design.id;
      else {
        const url = data.job.urls?.[0];
        if (!url) throw new Error('Canva export returned no file');
        const file = await fetch(url, { signal: AbortSignal.timeout(30000) });
        if (!file.ok) throw new Error('Canva file download failed');
        const artifact = await uploadUserFile(Buffer.from(await file.arrayBuffer()), `${job.id}.pdf`, viewer.userId, 'offer-designs', 'application/pdf');
        job.fileUrl = artifact.url;
      }
    }
    await saveOfferDesign(scope, job.id, 'canva-job', job);
    return NextResponse.json({ data: job });
  } catch (error) { console.error('[offer Canva status]', error); return NextResponse.json({ error: error instanceof Error ? error.message : 'Canva is unavailable' }, { status: 502 }); }
}
