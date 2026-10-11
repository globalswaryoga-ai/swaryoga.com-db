import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LeadsManagementTab } from '@/app/admin/crm/new-registration/_LeadsManagementTab';
import { registrationFetch, saveRegistrationState } from '@/lib/registrationClient';

jest.mock('@/lib/registrationClient', () => ({ registrationFetch: jest.fn(), saveRegistrationState: jest.fn() }));
const toast = { success: jest.fn(), error: jest.fn() };
jest.mock('@/components/admin/crm/ui/Toast', () => ({ useToast: () => toast }));
jest.mock('@/components/admin/crm/ZoomMeetingSetupCalendar', () => ({ ZoomMeetingSetupCalendar: () => null }));
jest.mock('@/app/admin/crm/new-registration/_AITriggersPanel', () => ({ AITriggersPanel: () => null }));

describe('Leads Management configuration submit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
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
    jest.mocked(saveRegistrationState).mockImplementation(() => new Promise(resolve => { finishSave = () => resolve({ success: true }); }));
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
    expect(screen.getByRole('status')).toHaveTextContent('Processing this batch');
    await act(async () => { finishRun({ ok: true, json: async () => ({ processed: 3, passed: 2, pending: 1, decisions: {} }) } as Response); });
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('3 decisions updated'));
  });
});
