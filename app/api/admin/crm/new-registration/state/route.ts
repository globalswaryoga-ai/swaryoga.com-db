import { NextResponse } from 'next/server';
import { registrationViewer } from '@/lib/registrationAuth';
import { mergeRegistrationState, readRegistrationState, writeRegistrationState } from '@/lib/registrationState';
import { REGISTRATION_GATE_FIELDS } from '@/lib/registrationGates';
import { validateRegistrationConditions } from '@/lib/registrationAiConfig';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    const data = await readRegistrationState(viewer.superAdmin ? 'shared' : viewer.userId);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Failed to read registration state:', error);
    return NextResponse.json({ error: 'Registration settings are unavailable; saved data has not been changed.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    const body = await request.json();
    if (!body || Array.isArray(body) || typeof body !== 'object' ||
        Object.keys(body).some(key => !key.startsWith('crm_') || /token|secret|password/i.test(key))) {
      return NextResponse.json({ error: 'Invalid registration settings' }, { status: 400 });
    }
    const decisions = Object.entries(body).filter(([key]) => key.startsWith('crm_ai_decision_'));
    for (const [key, value] of Object.entries(body)) {
      if (!key.startsWith('crm_ai_config_')) continue;
      if (!value || typeof value !== 'object' || !('conditions' in value) || !Array.isArray(value.conditions)) {
        return NextResponse.json({ error: 'Invalid AI question configuration' }, { status: 400 });
      }
      try { validateRegistrationConditions(value.conditions); }
      catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid AI answer rules' }, { status: 400 }); }
    }
    if (decisions.some(([, value]) => !value || typeof value !== 'object' || Array.isArray(value) ||
        REGISTRATION_GATE_FIELDS.some(field => field in value))) {
      return NextResponse.json({ error: 'Use the separate Zoom/final/group gate controls to change a gate.' }, { status: 400 });
    }
    const scope = viewer.superAdmin ? 'shared' : viewer.userId;
    const settings = Object.fromEntries(Object.entries(body).filter(([key]) => !key.startsWith('crm_ai_decision_')));
    if (Object.keys(settings).length) await writeRegistrationState(settings, scope);
    if (decisions.length) await mergeRegistrationState(Object.fromEntries(decisions), scope);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save registration state:', error);
    return NextResponse.json({ error: 'Failed to save registration settings' }, { status: 500 });
  }
}
