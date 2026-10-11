jest.mock('@/lib/registrationClient', () => ({ registrationFetch: jest.fn(), saveRegistrationState: jest.fn() }));
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MetaLeadsTab } from '@/app/admin/crm/new-registration/_MetaLeadsTab';
import { registrationFetch } from '@/lib/registrationClient';

describe('Meta saved question configuration', () => {
  beforeEach(() => {
    jest.mocked(registrationFetch).mockImplementation(async input => ({
      ok: true,
      json: async () => String(input).includes('/health')
        ? { data: { healthy: true } }
        : { success: true, data: [], summary: { triggeredLeads: 0, queuedLeads: 0, failedLeads: 0, legacyReportedSent: 0 } },
    } as Response));
  });
  it('retains a saved question absent from live fields and does not mutate the saved answer during edits', async () => {
    const workshop = { id: 'batch', metadata: { ai9AConfig: { filters: [{ question: 'Saved commitment question', options: [{ answer: 'Yes', category: 'approved' }] }] } } };
    const save = jest.fn().mockResolvedValue(undefined);
    render(<MetaLeadsTab selectedWorkshop={workshop} saveWorkshopSettings={save} />);
    fireEvent.click(screen.getByRole('button', { name: 'Config AI-9A (New Leads)' }));
    expect(screen.getByRole('option', { name: 'Saved commitment question (saved question)' })).toHaveProperty('selected', true);
    fireEvent.change(screen.getByDisplayValue('Yes'), { target: { value: 'Yes 100%' } });
    expect(workshop.metadata.ai9AConfig.filters[0].options[0].answer).toBe('Yes');
    fireEvent.click(screen.getByRole('button', { name: 'Save Configuration' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({ ai9AConfig: expect.objectContaining({
        filters: [expect.objectContaining({ question: 'Saved commitment question', options: [{ answer: 'Yes 100%', category: 'approved' }] })],
      }) }),
    })));
    await waitFor(() => expect(screen.queryByText('AI-9A Configuration')).not.toBeInTheDocument());
  });
  it('keeps inactive state and displays the persistence error when Start fails', async () => {
    const save = jest.fn().mockRejectedValue(new Error('Bunny save failed'));
    render(<MetaLeadsTab selectedWorkshop={{ id: 'batch', metadata: {} }} saveWorkshopSettings={save} />);
    fireEvent.click(screen.getByRole('button', { name: 'Config AI-9A (New Leads)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start AI-9A Processing' }));
    await screen.findByText('Bunny save failed');
    expect(screen.getByRole('button', { name: 'Start AI-9A Processing' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Active (Click to Stop)' })).not.toBeInTheDocument();
  });
  it.each(['C', 'D'])('saves AI-9%s before running the authoritative batch and reports moved leads', async stage => {
    const save = jest.fn().mockResolvedValue(undefined);
    jest.mocked(registrationFetch).mockImplementation(async input => ({
      ok: true,
      json: async () => String(input).includes('/bulk-update')
        ? { success: true, scannedCount: 58, modifiedCount: 28 }
        : { success: true, data: [] },
    } as Response));
    render(<MetaLeadsTab selectedWorkshop={{ id: 'batch', metadata: {} }} saveWorkshopSettings={save} />);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`Config AI-9${stage}`) }));
    fireEvent.click(screen.getByRole('button', { name: `Start AI-9${stage} Processing` }));
    await screen.findByText(/checked 58 leads; moved 28/);
    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({ [`ai9${stage}Config`]: expect.objectContaining({ isActive: true }) }),
    }));
    expect(registrationFetch).toHaveBeenCalledWith('/api/admin/crm/meta-leads/bulk-update', expect.objectContaining({
      body: JSON.stringify({ action: 'run-ai', workshopId: 'batch' }),
    }));
    expect(screen.getByRole('button', { name: 'Run Saved Rules' })).toBeInTheDocument();
  });
  it('shows a processing failure without pretending the saved activation was undone', async () => {
    jest.mocked(registrationFetch).mockImplementation(async input => ({
      ok: !String(input).includes('/bulk-update'),
      json: async () => String(input).includes('/bulk-update')
        ? { error: 'Bunny processing failed' } : { success: true, data: [] },
    } as Response));
    render(<MetaLeadsTab selectedWorkshop={{ id: 'batch', metadata: {} }} saveWorkshopSettings={jest.fn().mockResolvedValue(undefined)} />);
    fireEvent.click(screen.getByRole('button', { name: /Config AI-9C/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Start AI-9C Processing' }));
    await screen.findByText('Bunny processing failed');
    expect(screen.getByRole('button', { name: 'Active (Click to Stop)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run Saved Rules' })).toBeEnabled();
  });
});
