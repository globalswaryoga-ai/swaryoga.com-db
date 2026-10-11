jest.mock('@/lib/registrationClient', () => ({ registrationFetch: jest.fn() }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => null }));
jest.mock('@/components/admin/crm/ui/Toast', () => ({ useToast: () => ({ error: jest.fn(), success: jest.fn() }) }));
jest.mock('@/app/admin/crm/new-registration/_MetaConnectionStatus', () => ({ MetaConnectionStatus: () => null }));

import { render, screen } from '@testing-library/react';
import { AITriggersPanel } from '@/app/admin/crm/new-registration/_AITriggersPanel';

describe('Registration Trigger panel initialization', () => {
  beforeEach(() => localStorage.clear());

  it('initializes category state before deriving recipients', () => {
    render(<AITriggersPanel workshops={[]} leadsData={[]} />);
    expect(screen.getByText('Please select a language and batch, then click Submit.')).toBeInTheDocument();
  });

  it('renders the selected batch without a temporal-dead-zone error', () => {
    render(<AITriggersPanel workshops={[{ id: 'batch', name: 'Hindi batch' }]} leadsData={[]} selectedBatchId="batch" />);
    expect(screen.getByText('Schedule Meta Broadcast')).toBeInTheDocument();
    expect(screen.getByText(/No saved responses found for this batch/)).toBeInTheDocument();
  });
});
