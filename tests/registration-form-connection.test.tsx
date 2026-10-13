import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WorkshopFormTab } from '@/app/admin/crm/new-registration/_WorkshopFormTab';
import { Users } from 'lucide-react';

describe('Saved registration form connection', () => {
  const workshop = { id: 'hindi-batch', formId: 'old-form', language: 'Hindi', metadata: { mainFilter: 'Pune' } };
  const props = () => ({
    selectedDashboardLang: 'Hindi', activeTab: 'all_leads', Users,
    selectedWorkshop: workshop, workshops: [workshop], formSource: 'internal',
    selectedFormId: 'new-form', linkedFormId: 'old-form', googleFormUrl: '',
    isFormSetupCollapsed: false, isLoadingForms: false, leadsData: [],
    fetchedForms: [{ formId: 'old-form', workshopName: 'Previous form' }, { formId: 'new-form', workshopName: 'New registration form' }],
    setSelectedFormId: jest.fn(), setFormSource: jest.fn(), saveWorkshopSettings: jest.fn().mockResolvedValue(undefined),
    setRefreshLeadsCounter: jest.fn(), setActiveTab: jest.fn(), setIsFormSetupCollapsed: jest.fn(),
    setWorkshops: jest.fn(), setLeadsFilter: jest.fn(), setLeadsSubFilter: jest.fn(), setLeadsSubSubFilter: jest.fn(),
    leadsFilter: 'Pune', leadsSubFilter: '', leadsSubSubFilter: '', filterOptions: [], crmFields: [],
    fieldMapping: {}, googleFormQuestionMap: {}, googleFormsList: [],
    toast: { success: jest.fn(), error: jest.fn() },
  });

  it('restores the CRM dropdown and waits for SQL confirmation before success/navigation', async () => {
    const input = props();
    let resolveSave: () => void = () => {};
    input.saveWorkshopSettings.mockImplementation(() => new Promise<void>(resolve => { resolveSave = resolve; }));
    render(<WorkshopFormTab {...input} />);
    expect(screen.getByLabelText('Select connected CRM form')).toHaveValue('new-form');
    fireEvent.change(screen.getByLabelText('Select connected CRM form'), { target: { value: 'old-form' } });
    expect(input.setSelectedFormId).toHaveBeenCalledWith('old-form');
    fireEvent.click(screen.getByRole('button', { name: 'Save & Connect CRM Form' }));
    expect(input.saveWorkshopSettings).toHaveBeenCalledWith(expect.objectContaining({
      formId: 'new-form', metadata: expect.objectContaining({ formSource: 'internal', mainFilter: 'Pune' }),
    }));
    expect(input.toast.success).not.toHaveBeenCalled();
    expect(input.setActiveTab).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Saving connection...' })).toBeDisabled();
    resolveSave();
    await waitFor(() => expect(input.toast.success).toHaveBeenCalled());
    expect(input.setActiveTab).toHaveBeenCalledWith('my_data');
  });

  it('keeps the old connection and data screen unchanged when saving fails', async () => {
    const input = props();
    input.saveWorkshopSettings.mockRejectedValue(new Error('Bunny unavailable'));
    render(<WorkshopFormTab {...input} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save & Connect CRM Form' }));
    await waitFor(() => expect(input.toast.error).toHaveBeenCalledWith('Bunny unavailable'));
    expect(input.toast.success).not.toHaveBeenCalled();
    expect(input.setActiveTab).not.toHaveBeenCalled();
    expect(input.setRefreshLeadsCounter).not.toHaveBeenCalled();
  });

  it('saves to the language master list when All Leads has no selected batch', async () => {
    const input = props();
    input.selectedWorkshop = null;
    input.workshops = [];
    render(<WorkshopFormTab {...input} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save & Connect CRM Form' }));

    await waitFor(() => expect(input.saveWorkshopSettings).toHaveBeenCalledWith(undefined));
    expect(input.toast.success).toHaveBeenCalledWith('Form connection saved for all leads.');
    expect(input.setActiveTab).toHaveBeenCalledWith('my_data');
  });

  it('shows a permanently saved form ID even when the form-list request has not returned it', () => {
    const input = props();
    input.fetchedForms = [];
    render(<WorkshopFormTab {...input} />);
    expect(screen.getByLabelText('Select connected CRM form')).toHaveValue('new-form');
    expect(screen.getByRole('option', { name: 'Saved connection: new-form' })).toBeInTheDocument();
  });
});
