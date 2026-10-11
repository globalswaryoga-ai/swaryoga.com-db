import { NextRequest, NextResponse } from 'next/server';
import { registrationViewer } from '@/lib/registrationAuth';
import { readGoogleFormSyncStatusMap } from '@/lib/googleFormSyncStatus';
import type { GoogleFormSyncStatus } from '@/lib/googleFormSyncStatusTypes';

export const dynamic = 'force-dynamic';

/**
 * Import history for connected Google Forms.
 *
 * Answers "when did this form last import, how many Google responses exist, how
 * many are saved, and what was the last error" — the questions that previously
 * could only be answered by reading a cron log that already rotated away.
 */
export async function GET(request: NextRequest) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });

  try {
    const requested = request.nextUrl.searchParams
      .getAll('formId')
      .flatMap(value => value.split(','))
      .map(value => value.trim())
      .filter(Boolean);
    const all = await readGoogleFormSyncStatusMap(requested);
    const byFormId: Record<string, GoogleFormSyncStatus> = {};
    for (const status of Object.values(all)) {
      if (viewer.superAdmin || !status.scope || status.scope === viewer.userId) {
        byFormId[status.formId] = status;
      }
    }
    return NextResponse.json(
      { byFormId },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('[Google Forms Sync Status] Failed:', error);
    return NextResponse.json({ error: 'Google Forms sync status is unavailable.' }, { status: 503 });
  }
}
