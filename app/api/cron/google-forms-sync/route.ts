import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { listForms } from '@/lib/bunny-forms-db';
import { collectGoogleFormTargets } from '@/lib/googleFormsSync';
import { readRegistrationState, registrationWorkshops } from '@/lib/registrationState';
import { readGoogleFormConnections, connectedGoogleFormTargets } from '@/lib/googleFormConnections';
import { savedOfferGoogleTargets } from '@/lib/workshopOfferRepository';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get('authorization') || '';
  if (!expected || !provided.startsWith('Bearer ')) return false;
  const actualBuffer = Buffer.from(provided.slice(7));
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function internalBaseUrl(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  const deploymentHost = process.env.VERCEL_URL?.trim();
  if (deploymentHost) return `https://${deploymentHost}`;
  return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured; Google Forms cron sync is disabled.' }, { status: 500 });
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Reading shared first performs the repository's one-time legacy import.
    await readRegistrationState('shared');
    const optionalScopeBlockers: Array<{ scope: string; error: string }> = [];
    const [registeredForms, scopeResult, connections] = await Promise.all([
      listForms(),
      bunnyExecute('SELECT DISTINCT scope FROM registration_state_sql'),
      readGoogleFormConnections().catch(error => {
        optionalScopeBlockers.push({ scope: 'shared', error: error instanceof Error ? error.message : 'Saved Google Form connections are unavailable.' });
        return {};
      }),
    ]);
    const scopes = [...new Set(scopeResult.rows.map((row) => String(row.scope || '').trim()).filter(Boolean))];
    if (!scopes.includes('shared')) scopes.unshift('shared');

    const targets: Array<{ formId: string; name?: string; scope: string }> = [];
    for (const scope of scopes) {
      try {
        const state = await readRegistrationState(scope);
        const workshops = registrationWorkshops(state);
        const targetState = { ...state, crm_workshops: workshops };
        const visibleForms = registeredForms.filter((form) => {
          if (form.isActive === false) return false;
          const owner = String(form.createdBy || '').trim();
          if (scope === 'shared') return !owner || ['admin', 'admincrm', 'system'].includes(owner);
          return owner === scope;
        });
        const scopeTargets = collectGoogleFormTargets(visibleForms, targetState);
        if (scope === 'shared') {
          const knownIds = new Set(scopeTargets.map(target => target.formId));
          for (const [language, links] of Object.entries(connections)) {
            try {
              for (const target of connectedGoogleFormTargets({ [language]: links })) {
                if (!knownIds.has(target.formId)) { scopeTargets.push(target); knownIds.add(target.formId); }
              }
            } catch (error) {
              optionalScopeBlockers.push({ scope, error: error instanceof Error ? error.message : `Invalid ${language} Google Form connection.` });
            }
          }
        }
        for (const target of scopeTargets) {
          targets.push({ ...target, scope });
        }
      } catch (error) {
        optionalScopeBlockers.push({
          scope,
          error: error instanceof Error ? error.message : 'Registration scope is unavailable.',
        });
      }
    }

    try {
      for (const { scope, batches } of await savedOfferGoogleTargets()) {
        for (const target of collectGoogleFormTargets([], { crm_workshops: batches })) {
          if (!targets.some(existing => existing.scope === scope && existing.formId === target.formId)) targets.push({ ...target, scope });
        }
      }
    } catch (error) {
      optionalScopeBlockers.push({ scope: 'offers', error: error instanceof Error ? error.message : 'Saved offer forms could not be discovered.' });
    }
    const baseUrl = internalBaseUrl(request);
    const results: Array<Record<string, unknown>> = [];
    const deadline = Date.now() + 270_000;

    for (const target of targets) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 1_000) {
        results.push({
          formId: target.formId,
          name: target.name,
          scope: target.scope,
          error: 'Skipped because the cron execution budget was reached; retry on the next run.',
        });
        continue;
      }
      try {
        const syncUrl = new URL('/api/admin/google-forms/sync', baseUrl);
        syncUrl.searchParams.set('url', target.formId);
        syncUrl.searchParams.set('scope', target.scope);
        if (target.name) syncUrl.searchParams.set('name', target.name);
        const response = await fetch(syncUrl, {
          headers: { Authorization: `Bearer ${cronSecret}` },
          signal: AbortSignal.timeout(Math.min(240_000, remainingMs)),
        });
        const data = await response.json() as Record<string, any>;
        results.push({
          formId: target.formId,
          name: target.name,
          scope: target.scope,
          status: response.status,
          summary: data.summary || null,
          error: response.ok ? undefined : data.error || `Sync returned HTTP ${response.status}.`,
        });
      } catch (error) {
        results.push({
          formId: target.formId,
          name: target.name,
          scope: target.scope,
          error: error instanceof Error ? error.message : 'Internal Google Forms sync request failed.',
        });
      }
    }

    const failedForms = results.filter((result) => result.error).length;
    const hasBlockers = optionalScopeBlockers.length > 0 || failedForms > 0;
    const status = hasBlockers ? 207 : 200;
    return NextResponse.json({
      success: !hasBlockers,
      registeredForms: registeredForms.length,
      targetForms: targets.length,
      syncedForms: results.length - failedForms,
      failedForms,
      optionalScopeBlockers,
      results,
    }, { status });
  } catch (error) {
    console.error('[Google Forms Cron] Failed:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Google Forms cron sync failed.',
    }, { status: 500 });
  }
}
