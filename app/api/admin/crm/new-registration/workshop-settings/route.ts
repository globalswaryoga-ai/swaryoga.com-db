import { NextResponse } from 'next/server';
import { registrationViewer } from '@/lib/registrationAuth';
import { parseRegistrationValue, readRegistrationState, replaceRegistrationStateIfUnchanged } from '@/lib/registrationState';
import { metaApprovalConfigurationError } from '@/lib/registrationMetaAutomation';
import type { RegistrationRecord } from '@/lib/registrationRules';
import { resolveRegistrationTemplate } from '@/lib/registrationAutomation';
import { mergeRegistrationWorkshop } from '@/lib/registrationWorkshopMerge';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    const { listKey, workshop, previous } = await request.json();
    if (!/^crm_(english|hindi|marathi|kannada)_workshops$/.test(listKey) ||
        !workshop || typeof workshop !== 'object' || Array.isArray(workshop) ||
        typeof workshop.id !== 'string' || !workshop.id.trim() ||
        typeof workshop.name !== 'string' || !workshop.name.trim()) {
      return NextResponse.json({ error: 'Select a named batch before saving its settings.' }, { status: 400 });
    }
    const scope = viewer.superAdmin ? 'shared' : viewer.userId;
    const state = await readRegistrationState(scope);
    const list = parseRegistrationValue<RegistrationRecord[]>(state[listKey], []);
    if (!Array.isArray(list)) throw new Error('Invalid saved workshop list');
    const existing = list.find(item => item.id === workshop.id);
    if ((existing && (!previous || previous.id !== workshop.id)) || (!existing && previous)) {
      return NextResponse.json({ error: 'This batch changed or was removed. Reload before saving; newer settings have been preserved.' }, { status: 409 });
    }
    let merged = workshop;
    if (existing) {
      try {
        merged = mergeRegistrationWorkshop(existing, previous, workshop);
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Batch settings conflict. Reload and retry.' }, { status: 409 });
      }
    }
    const metadata = { ...merged.metadata };
    if (metadata.metaAutomation?.enabled) {
      const error = metaApprovalConfigurationError(metadata);
      if (error) return NextResponse.json({ error }, { status: 400 });
      try {
        await resolveRegistrationTemplate(metadata.wtSettings.approved.template, viewer.userId, viewer.superAdmin);
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'An approved Meta template is required.' }, { status: 400 });
      }
      const existingPolicy = existing?.metadata?.metaAutomation;
      metadata.metaAutomation = {
        enabled: true, approvalOnly: true,
        startsAt: existingPolicy?.startsAt || new Date().toISOString(),
      };
    }
    const saved = { ...merged, metadata };
    const workshops = existing ? list.map(item => item.id === saved.id ? saved : item) : [...list, saved];
    if (!await replaceRegistrationStateIfUnchanged(listKey, workshops, state[listKey], scope)) {
      return NextResponse.json({ error: 'Workshop settings changed during saving. Reload and retry.' }, { status: 409 });
    }
    return NextResponse.json({ success: true, workshop: saved, workshops });
  } catch (error) {
    console.error('Failed to save workshop settings:', error);
    return NextResponse.json({ error: 'Workshop settings could not be saved.' }, { status: 500 });
  }
}
