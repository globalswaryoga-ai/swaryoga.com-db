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
});
