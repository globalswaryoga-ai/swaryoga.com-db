import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LeadsManagementTab } from '@/app/admin/crm/new-registration/_LeadsManagementTab';
import { registrationFetch, saveRegistrationSnapshot } from '@/lib/registrationClient';

jest.mock('@/lib/registrationClient', () => ({ registrationFetch: jest.fn(), saveRegistrationState: jest.fn(), saveRegistrationSnapshot: jest.fn() }));
const toast = { success: jest.fn(), error: jest.fn() };
jest.mock('@/components/admin/crm/ui/Toast', () => ({ useToast: () => toast }));
jest.mock('@/components/admin/crm/ZoomMeetingSetupCalendar', () => ({ ZoomMeetingSetupCalendar: () => null }));
jest.mock('@/app/admin/crm/new-registration/_AITriggersPanel', () => ({ AITriggersPanel: () => null }));

describe('Leads Management configuration submit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    jest.mocked(saveRegistrationSnapshot).mockImplementation(async patch => patch);
    jest.mocked(registrationFetch).mockImplementation(async input => ({
      ok: true,
      json: async () => String(input).includes('zoom-bookings') ? { data: [] } : {
        'crm_ai_config_batch_AI-4': { conditions: [{ question: 'Ready', keyword: 'Yes', successCategory: 'approval_1' }] },
      },
    } as Response));
  });
  it('waits for durable save but closes before slow batch processing finishes', async () => {
    let finishSave!: () => void;
    let finishRun!: (value: Response) => void;
    jest.mocked(saveRegistrationSnapshot).mockImplementation(patch => new Promise(resolve => { finishSave = () => resolve(patch); }));
    const run = new Promise<Response>(resolve => { finishRun = resolve; });
    render(<LeadsManagementTab workshops={[{ id: 'batch', name: 'Hindi Workshop', language: 'Hindi', formId: 'form' }]} selectedDashboardLang="Hindi Workshop" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /AI-4 Active/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /AI-4 Active/ }));
    jest.mocked(registrationFetch).mockImplementation(() => run);
    fireEvent.click(screen.getByRole('button', { name: /Submit Config & Run/ }));
    expect(screen.getByRole('button', { name: 'Saving configuration...' })).toBeDisabled();
    expect(registrationFetch).not.toHaveBeenCalledWith('/api/admin/crm/new-registration/funnel', expect.anything());
    await act(async () => { finishSave(); });
    await waitFor(() => expect(screen.queryByRole('button', { name: /Submit Config & Run/ })).not.toBeInTheDocument());
    expect(screen.getAllByRole('status').some(element => element.textContent?.includes('Processing this batch'))).toBe(true);
    await act(async () => { finishRun({ ok: true, json: async () => ({ processed: 3, passed: 2, pending: 1, decisions: {} }) } as Response); });
    await waitFor(() => expect(screen.getAllByRole('status').some(element => element.textContent?.includes('Processing this batch'))).toBe(false));
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('3 decisions updated'));
  });
  it('autosaves a new category and keeps one identity while its label is edited', async () => {
    const { container } = render(<LeadsManagementTab workshops={[]} />);
    await act(async () => {});
    expect(saveRegistrationSnapshot).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Add category' }));
    const input = container.querySelector('input[name="label"]')!;
    fireEvent.change(input, { target: { value: 'My category' } });
    await waitFor(() => expect(saveRegistrationSnapshot).toHaveBeenCalled());
    const first = jest.mocked(saveRegistrationSnapshot).mock.calls[0][0].crm_custom_categories as Array<{ id: string; label: string }>;
    const id = first.find(category => category.label === 'My category')!.id;
    fireEvent.change(input, { target: { value: 'My updated category' } });
    await waitFor(() => expect(saveRegistrationSnapshot).toHaveBeenCalledTimes(2));
    const updated = jest.mocked(saveRegistrationSnapshot).mock.calls[1][0].crm_custom_categories as Array<{ id: string; label: string }>;
    expect(updated.filter(category => category.id === id)).toEqual([expect.objectContaining({ id, label: 'My updated category' })]);
  });
  it('shows a failed category save and retries the same pending edit', async () => {
    jest.mocked(saveRegistrationSnapshot).mockRejectedValueOnce(new Error('SQL unavailable')).mockImplementation(async patch => patch);
    const { container } = render(<LeadsManagementTab workshops={[]} />);
    await act(async () => {});
    fireEvent.click(screen.getByRole('button', { name: 'Add category' }));
    fireEvent.change(container.querySelector('input[name="label"]')!, { target: { value: 'Keep me' } });
    await screen.findByText(/Changes not saved: SQL unavailable/);
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    await screen.findByText('All changes saved to Bunny Database.');
    expect(saveRegistrationSnapshot).toHaveBeenCalledTimes(2);
    expect(jest.mocked(saveRegistrationSnapshot).mock.calls[1][0]).toEqual(jest.mocked(saveRegistrationSnapshot).mock.calls[0][0]);
  });
});
