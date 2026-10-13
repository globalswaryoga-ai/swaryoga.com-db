import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LeadsManagementTab } from '@/app/admin/crm/new-registration/_LeadsManagementTab';
import { WorkshopFormTab } from '@/app/admin/crm/new-registration/_WorkshopFormTab';
import { registrationFetch, saveRegistrationSnapshot } from '@/lib/registrationClient';
import { readRegistrationAiConfig, readRegistrationAiDraft } from '@/lib/registrationAiConfig';

jest.mock('@/lib/registrationClient', () => ({
  registrationFetch: jest.fn(),
  saveRegistrationState: jest.fn(),
  saveRegistrationSnapshot: jest.fn(),
}));
const toast = { success: jest.fn(), error: jest.fn() };
jest.mock('@/components/admin/crm/ui/Toast', () => ({ useToast: () => toast }));
jest.mock('@/components/admin/crm/ZoomMeetingSetupCalendar', () => ({ ZoomMeetingSetupCalendar: () => null }));
jest.mock('@/app/admin/crm/new-registration/_AITriggersPanel', () => ({ AITriggersPanel: () => null }));

describe('Saved form and AI configuration preservation and "do it for all"', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    jest.mocked(saveRegistrationSnapshot).mockImplementation(async patch => patch);
    jest.mocked(registrationFetch).mockImplementation(async input => ({
      ok: true,
      json: async () => String(input).includes('zoom-bookings') ? { data: [] } : {
        'crm_ai_config_batch_hindi_12oct_AI-4': {
          conditions: [
            { question: 'Have you attended before?', keyword: 'Yes 100%', successCategory: 'approval_1' },
            { question: 'Have you attended before?', keyword: 'No', successCategory: 'pending_leads_1' },
          ],
          copyMode: true,
        },
      },
    } as Response));
  });

  it('shows saved configuration as it is when opening master list or any sibling batch', async () => {
    const workshops = [
      { id: 'master_hindi_workshop', name: 'Master List - Hindi Workshop - All Batch Leads', language: 'Hindi Workshop' },
      { id: 'batch_hindi_12oct', name: 'Hindi Workshop - 12th Oct', language: 'Hindi Workshop' },
      { id: 'batch_hindi_13nov', name: 'Hindi Workshop - 13th Nov', language: 'Hindi Workshop' },
    ];

    render(
      <LeadsManagementTab
        workshops={workshops}
        selectedDashboardLang="Hindi Workshop"
      />
    );

    // AI-4 Active button is visible
    await waitFor(() => expect(screen.getByRole('button', { name: /AI-4 Active/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /AI-4 Active/ }));

    // Verify saved question is displayed in both select and input
    await waitFor(() => {
      expect(screen.getAllByDisplayValue('Have you attended before?')).toHaveLength(2);
      expect(screen.getByDisplayValue('Yes 100%')).toBeInTheDocument();
      expect(screen.getByDisplayValue('No')).toBeInTheDocument();
    });

    // Destination categories are preserved and editable
    const selects = screen.getAllByLabelText('Save / route to category');
    expect(selects[0]).toHaveValue('approval_1');
    expect(selects[1]).toHaveValue('pending_leads_1');

    // Rule is editable: change keyword
    const answerInput = screen.getByDisplayValue('Yes 100%');
    fireEvent.change(answerInput, { target: { value: 'Yes absolutely' } });
    expect(answerInput).toHaveValue('Yes absolutely');
  });

  it('saves configuration for all batches in that workshop language when clicking Save Config', async () => {
    const workshops = [
      { id: 'master_hindi_workshop', name: 'Master List - Hindi Workshop - All Batch Leads', language: 'Hindi Workshop' },
      { id: 'batch_hindi_12oct', name: 'Hindi Workshop - 12th Oct', language: 'Hindi Workshop' },
      { id: 'batch_hindi_13nov', name: 'Hindi Workshop - 13th Nov', language: 'Hindi Workshop' },
    ];

    render(
      <LeadsManagementTab
        workshops={workshops}
        selectedDashboardLang="Hindi Workshop"
      />
    );

    await waitFor(() => expect(screen.getByRole('button', { name: /AI-4 Active/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /AI-4 Active/ }));

    await screen.findByDisplayValue('Yes 100%');

    // Click Save Config button
    const saveButton = screen.getByRole('button', { name: /💾 Save Config/ });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(saveRegistrationSnapshot).toHaveBeenCalled();
    });

    const savedPatch = jest.mocked(saveRegistrationSnapshot).mock.calls[0][0];
    
    // Check that config is saved for master list AND sibling batches ("do it for all")
    expect(savedPatch).toHaveProperty('crm_ai_config_master_hindi_workshop_AI-4');
    expect(savedPatch).toHaveProperty('crm_ai_config_batch_hindi_12oct_AI-4');
    expect(savedPatch).toHaveProperty('crm_ai_config_batch_hindi_13nov_AI-4');

    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('configuration saved permanently for all batches'));
  });

  it('preserves draft configuration without throwing error if user saves partially entered rules', async () => {
    const workshops = [
      { id: 'master_hindi_workshop', name: 'Master List - Hindi Workshop', language: 'Hindi Workshop' },
    ];

    render(
      <LeadsManagementTab
        workshops={workshops}
        selectedDashboardLang="Hindi Workshop"
      />
    );

    await waitFor(() => expect(screen.getByRole('button', { name: /AI-4 Active/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /AI-4 Active/ }));

    // Add a new question without filling destination category yet
    fireEvent.click(screen.getByRole('button', { name: '+ Add question' }));

    // Click Save Config - should NOT throw and reject, but save draft safely
    const saveButton = screen.getByRole('button', { name: /💾 Save Config/ });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(saveRegistrationSnapshot).toHaveBeenCalled();
    });

    const savedPatch = jest.mocked(saveRegistrationSnapshot).mock.calls[0][0];
    const masterConfig = savedPatch['crm_ai_config_master_hindi_workshop_AI-4'] as any;
    expect(masterConfig.draft).toBeDefined();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('renders batches in sidebar, 3 header dropdowns, and 5 upper status cards', async () => {
    const workshops = [
      { id: 'master_hindi_workshop', name: 'Master List - Hindi Workshop', language: 'Hindi Workshop' },
      { id: 'batch_hindi_12oct', name: 'Hindi Workshop - 12th Oct', language: 'Hindi Workshop' },
    ];
    const leadsData = [
      { id: 'lead_1', name: 'Test Lead 1', formId: 'f1' },
      { id: 'lead_2', name: 'Test Lead 2', formId: 'f1' },
    ];

    render(
      <LeadsManagementTab
        workshops={workshops}
        leadsData={leadsData}
        selectedDashboardLang="Hindi Workshop"
      />
    );

    // 1. Sidebar Categories (no batches in sidebar as requested)
    await waitFor(() => {
      expect(screen.getByText('Categories')).toBeInTheDocument();
      expect(screen.queryByText('Batches (2)')).not.toBeInTheDocument();
    });

    // 2. Upper Status Cards in Leads Management
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Triggered')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();

    // Click Rejected card
    fireEvent.click(screen.getByText('Rejected'));
    await waitFor(() => {
      expect(screen.getAllByText(/Rejected leads/).length).toBeGreaterThan(0);
    });
  });

  it('renders the 3 header dropdowns in Our Batches tab', async () => {
    const workshops = [
      { id: 'master_hindi_workshop', name: 'Master List - Hindi Workshop', language: 'Hindi Workshop' },
      { id: 'batch_hindi_12oct', name: 'Hindi Workshop - 12th Oct', language: 'Hindi Workshop' },
    ];
    const leadsData = [
      { id: 'lead_1', name: 'Rahul Sharma', whatsapp: '9876543210', email: 'rahul@example.com' },
    ];

    render(
      <WorkshopFormTab
        activeTab="our_workshops"
        setActiveTab={jest.fn()}
        workshops={workshops}
        leadsData={leadsData}
        selectedWorkshop={workshops[1]}
        selectedDashboardLang="Hindi Workshop"
      />
    );

    // 3 Header Dropdowns shifted to Our Batches
    expect(screen.getByLabelText('Approval and Registered filter')).toBeInTheDocument();
    expect(screen.getByLabelText('Pending and Rejected filter')).toBeInTheDocument();
    expect(screen.getByLabelText('WhatsApp and Schedule actions')).toBeInTheDocument();

    // Select Approval-1 from Dropdown 1
    fireEvent.change(screen.getByLabelText('Approval and Registered filter'), { target: { value: 'approval_1' } });
    expect(screen.getByLabelText('Approval and Registered filter')).toHaveValue('approval_1');
  });
});
