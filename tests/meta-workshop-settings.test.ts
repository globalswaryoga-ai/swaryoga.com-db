/** @jest-environment node */
jest.mock('@/lib/registrationAuth', () => ({ registrationViewer: jest.fn() }));
jest.mock('@/lib/registrationState', () => ({
  readRegistrationState: jest.fn(),
  replaceRegistrationStateIfUnchanged: jest.fn(),
  parseRegistrationValue: jest.requireActual('@/lib/registrationValues').parseRegistrationValue,
}));
jest.mock('@/lib/registrationAutomation', () => ({ resolveRegistrationTemplate: jest.fn(async () => ({ _id: 'template' })) }));
import { POST } from '@/app/api/admin/crm/new-registration/workshop-settings/route';
import { registrationViewer } from '@/lib/registrationAuth';
import { readRegistrationState, replaceRegistrationStateIfUnchanged } from '@/lib/registrationState';
import { resolveRegistrationTemplate } from '@/lib/registrationAutomation';
import { restoreRegistrationWorkshop } from '@/lib/registrationValues';

const rule = { isActive: true, filters: [{ question: 'Ready', options: [{ answer: 'Yes', category: 'approved' }] }] };
const workshop = () => ({ id: 'batch', name: 'Hindi workshop', metadata: {
  facebookFormId: 'form', ai9AConfig: rule, ai9BConfig: rule, ai9CConfig: rule, ai9DConfig: rule,
  wtSettings: { approved: { template: 'welcome', delay: 0 } },
  metaAutomation: { enabled: true, startsAt: '1900-01-01T00:00:00Z' },
} });
function request(body: unknown) {
  return new Request('http://localhost/api/admin/crm/new-registration/workshop-settings', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}

describe('Durable Meta batch settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(registrationViewer).mockReturnValue({ userId: 'admincrm', superAdmin: true } as ReturnType<typeof registrationViewer>);
    jest.mocked(readRegistrationState).mockResolvedValue({});
    jest.mocked(replaceRegistrationStateIfUnchanged).mockResolvedValue(true);
  });
  it('rejects nameless selected snapshots rather than reporting success', async () => {
    const response = await POST(request({ listKey: 'crm_hindi_workshops', workshop: { metadata: {} } }));
    expect(response.status).toBe(400);
    expect(replaceRegistrationStateIfUnchanged).not.toHaveBeenCalled();
  });
  it('stamps first activation on the server and preserves unrelated batches', async () => {
    const sibling = { id: 'other', name: 'Other' };
    jest.mocked(readRegistrationState).mockResolvedValue({ crm_hindi_workshops: JSON.stringify([sibling]) });
    const response = await POST(request({ listKey: 'crm_hindi_workshops', workshop: workshop() }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.workshops[0]).toEqual(sibling);
    expect(body.workshop.metadata.metaAutomation).toEqual({
      enabled: true, approvalOnly: true, startsAt: expect.any(String),
    });
    expect(body.workshop.metadata.metaAutomation.startsAt).not.toBe('1900-01-01T00:00:00Z');
  });
  it('keeps the first activation cutoff when later rules are saved', async () => {
    const previous = workshop();
    previous.metadata.metaAutomation.startsAt = '2026-10-11T00:00:00Z';
    jest.mocked(readRegistrationState).mockResolvedValue({ crm_hindi_workshops: [previous] });
    const response = await POST(request({ listKey: 'crm_hindi_workshops', previous, workshop: workshop() }));
    expect((await response.json()).workshop.metadata.metaAutomation.startsAt).toBe('2026-10-11T00:00:00Z');
  });
  it('rejects inactive stages and unapproved templates without committing activation', async () => {
    const invalid = workshop();
    invalid.metadata.ai9CConfig = { ...rule, isActive: false };
    expect((await POST(request({ listKey: 'crm_hindi_workshops', workshop: invalid }))).status).toBe(400);
    jest.mocked(resolveRegistrationTemplate).mockRejectedValueOnce(new Error('Template not approved'));
    expect((await POST(request({ listKey: 'crm_hindi_workshops', workshop: workshop() }))).status).toBe(400);
    expect(replaceRegistrationStateIfUnchanged).not.toHaveBeenCalled();
  });
  it('rejects stale edits and concurrent list replacement without losing newer configuration', async () => {
    const current = { ...workshop(), name: 'Updated by another tab' };
    jest.mocked(readRegistrationState).mockResolvedValue({ crm_hindi_workshops: [current] });
    expect((await POST(request({ listKey: 'crm_hindi_workshops', previous: workshop(), workshop: { ...workshop(), name: 'My competing edit' } }))).status).toBe(409);
    expect(replaceRegistrationStateIfUnchanged).not.toHaveBeenCalled();
    jest.mocked(readRegistrationState).mockResolvedValue({});
    jest.mocked(replaceRegistrationStateIfUnchanged).mockResolvedValueOnce(false);
    expect((await POST(request({ listKey: 'crm_hindi_workshops', workshop: workshop() }))).status).toBe(409);
  });
  it('allows Stage 3 activation when unrelated batch fields changed and preserves those changes', async () => {
    const previous = { ...workshop(), leads: 10 };
    const current = { ...previous, leads: 58, name: 'Updated batch', metadata: {
      ...previous.metadata, ai9CConfig: { ...rule, maxMismatches: 3 },
    } };
    const edited = { ...previous, metadata: { ...previous.metadata, ai9DConfig: { ...rule, maxMismatches: 1 } } };
    jest.mocked(readRegistrationState).mockResolvedValue({ crm_hindi_workshops: [current] });
    const response = await POST(request({ listKey: 'crm_hindi_workshops', previous, workshop: edited }));
    expect(response.status).toBe(200);
    expect((await response.json()).workshop).toMatchObject({
      leads: 58, name: 'Updated batch',
      metadata: { ai9CConfig: { maxMismatches: 3 }, ai9DConfig: { maxMismatches: 1 } },
    });
  });
  it('rejects competing changes to the same Stage 3 configuration', async () => {
    const previous = workshop();
    jest.mocked(readRegistrationState).mockResolvedValue({ crm_hindi_workshops: [{
      ...previous, metadata: { ...previous.metadata, ai9DConfig: { ...rule, maxMismatches: 2 } },
    }] });
    const edited = { ...previous, metadata: { ...previous.metadata, ai9DConfig: { ...rule, maxMismatches: 1 } } };
    expect((await POST(request({ listKey: 'crm_hindi_workshops', previous, workshop: edited }))).status).toBe(409);
    expect(replaceRegistrationStateIfUnchanged).not.toHaveBeenCalled();
  });
  it('does not reject reordered JSON keys as a competing edit', async () => {
    const previous = workshop();
    const reordered = { name: previous.name, metadata: previous.metadata, id: previous.id };
    jest.mocked(readRegistrationState).mockResolvedValue({ crm_hindi_workshops: [reordered] });
    expect((await POST(request({ listKey: 'crm_hindi_workshops', previous, workshop: previous }))).status).toBe(200);
  });
  it('restores canonical saved rules, not an outdated or malformed selected snapshot', () => {
    const canonical = workshop();
    expect(restoreRegistrationWorkshop(JSON.stringify([canonical]), JSON.stringify({ id: 'batch', metadata: {} }))).toEqual(canonical);
    expect(restoreRegistrationWorkshop([canonical], { metadata: {} })).toBeUndefined();
    expect(restoreRegistrationWorkshop([canonical], { id: 'deleted-batch' })).toBeUndefined();
  });
});
