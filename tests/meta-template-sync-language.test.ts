/** @jest-environment node */
jest.mock('@/lib/auth', () => ({ verifyToken: () => ({ isAdmin: true, userId: 'admincrm' }) }));
jest.mock('@/lib/crm-handlers', () => ({ getViewerUserId: () => 'admincrm', tenantFilter: () => ({}) }));
jest.mock('@/lib/bunnyTemplatesRepository', () => ({
  findMetaTemplate: jest.fn(), createTemplate: jest.fn(), updateTemplate: jest.fn(), getTemplateById: jest.fn(),
}));
jest.mock('@/lib/meta-templates', () => ({
  fetchTemplatesFromMeta: jest.fn(), getTemplateStatusFromMeta: jest.fn(), mapMetaStatusToLocal: () => 'approved',
}));
jest.mock('@/lib/migrateMetaImageToBunny', () => ({ ensurePermanentUrl: jest.fn() }));

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/admin/crm/templates/meta/sync/route';
import { findMetaTemplate, getTemplateById, updateTemplate } from '@/lib/bunnyTemplatesRepository';
import { fetchTemplatesFromMeta, getTemplateStatusFromMeta } from '@/lib/meta-templates';

describe('Meta sync preserves the registered translation language', () => {
  const template = { id: 'meta-id', name: 'marathi_content', language: 'en', status: 'APPROVED', category: 'MARKETING', components: [] };
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(updateTemplate).mockResolvedValue({ _id: 'local', language: 'en' });
  });
  it('updates language when a bulk sync matches the existing Meta identity', async () => {
    jest.mocked(fetchTemplatesFromMeta).mockResolvedValue({ success: true, templates: [template] });
    jest.mocked(findMetaTemplate).mockResolvedValue({ _id: 'local', language: 'mr' });
    const response = await GET(new NextRequest('https://example.com/api/admin/crm/templates/meta/sync'));
    expect(response.status).toBe(200);
    expect(updateTemplate).toHaveBeenCalledWith('local', expect.objectContaining({ language: 'en', metaTemplateId: 'meta-id' }));
  });
  it('updates language after individual translation reconciliation', async () => {
    jest.mocked(getTemplateById).mockResolvedValue({ _id: 'local', templateName: 'marathi_content', language: 'mr' });
    jest.mocked(getTemplateStatusFromMeta).mockResolvedValue({ success: true, template });
    const response = await POST(new NextRequest('https://example.com/api/admin/crm/templates/meta/sync', {
      method: 'POST', body: JSON.stringify({ templateId: 'local' }),
    }));
    expect(response.status).toBe(200);
    expect(updateTemplate).toHaveBeenCalledWith('local', expect.objectContaining({ language: 'en', metaTemplateName: 'marathi_content' }));
  });
});
