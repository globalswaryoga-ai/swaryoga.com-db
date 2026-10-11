jest.mock('@/lib/registrationClient', () => ({ registrationFetch: jest.fn(), saveRegistrationState: jest.fn() }));
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  it('keeps Auto-Sync on after failures and retries on the next minute', async () => {
    jest.useFakeTimers();
    jest.mocked(registrationFetch).mockImplementation(async input => ({
      ok: !String(input).endsWith('/sync'),
      json: async () => String(input).endsWith('/sync')
        ? { success: false, error: 'Temporary Meta outage' }
        : { success: true, data: [], summary: {} },
    } as Response));
    const view = render(<MetaLeadsTab selectedWorkshop={{ id: 'batch', metadata: { facebookFormId: 'form' } }} saveWorkshopSettings={jest.fn()} />);
    try {
      await act(async () => {});
      expect(screen.getByRole('button', { name: 'AI-9A Auto-Sync (1m)' })).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('Temporary Meta outage');
      const calls = () => jest.mocked(registrationFetch).mock.calls.filter(([url]) => String(url).endsWith('/sync')).length;
      expect(calls()).toBe(1);
      await act(async () => { jest.advanceTimersByTime(60000); });
      expect(calls()).toBe(2);
      expect(screen.getByRole('button', { name: 'AI-9A Auto-Sync (1m)' })).toBeInTheDocument();
    } finally {
      view.unmount();
      jest.useRealTimers();
    }
  });
  it('persists an explicit Off choice and restores it after remount without syncing', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const workshop = { id: 'batch', metadata: { facebookFormId: 'form', ai9AConfig: { isActive: true } } };
    const first = render(<MetaLeadsTab selectedWorkshop={workshop} saveWorkshopSettings={save} />);
    fireEvent.click(screen.getByRole('button', { name: 'AI-9A Auto-Sync (1m)' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith({
      ...workshop, metadata: { ...workshop.metadata, metaAutoSyncEnabled: false },
    }));
    first.unmount();
    jest.mocked(registrationFetch).mockClear();
    render(<MetaLeadsTab selectedWorkshop={save.mock.calls[0][0]} saveWorkshopSettings={save} />);
    await act(async () => {});
    expect(screen.getByRole('button', { name: 'AI-9A Auto-Sync (Off)' })).toBeInTheDocument();
    expect(jest.mocked(registrationFetch).mock.calls.some(([url]) => String(url).endsWith('/sync'))).toBe(false);
  });
  it('does not turn Off when saving the choice fails', async () => {
    render(<MetaLeadsTab selectedWorkshop={{ id: 'batch', metadata: {} }}
      saveWorkshopSettings={jest.fn().mockRejectedValue(new Error('Choice save failed'))} />);
    fireEvent.click(screen.getByRole('button', { name: 'AI-9A Auto-Sync (1m)' }));
    await screen.findByText(/Choice save failed/);
    expect(screen.getByRole('button', { name: 'AI-9A Auto-Sync (1m)' })).toBeInTheDocument();
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
  it('does not discard an edited answer when another stage is saved', async () => {
    const metadata = { ai9AConfig: { filters: [{ question: 'Ready?', options: [{ answer: 'Yes', category: 'approved' }] }] } };
    const { rerender } = render(<MetaLeadsTab selectedWorkshop={{ id: 'batch', metadata }} saveWorkshopSettings={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Config AI-9A (New Leads)' }));
    fireEvent.change(screen.getByDisplayValue('Yes'), { target: { value: 'My new answer' } });
    rerender(<MetaLeadsTab selectedWorkshop={{ id: 'batch', metadata: { ...metadata, ai9BConfig: { filters: [] } } }} saveWorkshopSettings={jest.fn()} />);
    expect(screen.getByDisplayValue('My new answer')).toBeInTheDocument();
    await act(async () => {});
  });
  it('autosaves edited rules without activating or running an inactive stage', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    render(<MetaLeadsTab selectedWorkshop={{ id: 'batch', metadata: {
      ai9AConfig: { isActive: false, filters: [{ question: 'Ready?', options: [{ answer: 'Yes', category: 'approved' }] }] },
    } }} saveWorkshopSettings={save} />);
    fireEvent.click(screen.getByRole('button', { name: 'Config AI-9A (New Leads)' }));
    fireEvent.change(screen.getByDisplayValue('Yes'), { target: { value: 'Yes please' } });
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({ ai9AConfig: expect.objectContaining({ isActive: false,
        filters: [expect.objectContaining({ options: [{ answer: 'Yes please', category: 'approved' }] })] }) }),
    })), { timeout: 1500 });
    expect(registrationFetch).not.toHaveBeenCalledWith('/api/admin/crm/meta-leads/bulk-update', expect.anything());
  });
  it.each(['B'])('saves AI-9%s before running the authoritative batch and reports moved leads', async stage => {
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
    fireEvent.click(screen.getByRole('button', { name: /Config AI-9B/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Start AI-9B Processing' }));
    await screen.findByText('Bunny processing failed');
    expect(screen.getByRole('button', { name: 'Active (Click to Stop)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run Saved Rules' })).toBeEnabled();
  });
});
