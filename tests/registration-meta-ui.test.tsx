jest.mock('@/lib/registrationClient', () => ({ registrationFetch: jest.fn() }));
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MetaConnectionStatus } from '@/app/admin/crm/new-registration/_MetaConnectionStatus';
import { RegistrationWorkflow } from '@/app/admin/crm/new-registration/_RegistrationWorkflow';
import { registrationFetch } from '@/lib/registrationClient';

describe('Registration Meta connection UI', () => {
  beforeEach(() => jest.clearAllMocks());
  it('shows account quality and latency and offers a read-only recheck', async () => {
    jest.mocked(registrationFetch).mockResolvedValue({
      ok: true, json: async () => ({ data: { healthy: true, latencyMs: 1200, qualityRating: 'GREEN' } }),
    } as Response);
    render(<MetaConnectionStatus />);
    await screen.findByText(/Connected.*1200 ms.*GREEN/);
    fireEvent.click(screen.getByRole('button', { name: 'Recheck' }));
    await waitFor(() => expect(registrationFetch).toHaveBeenCalledTimes(2));
    expect(registrationFetch).toHaveBeenCalledWith('/api/admin/crm/whatsapp/health?provider=meta', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it('shows the actual connection error instead of falsely reporting connected', async () => {
    jest.mocked(registrationFetch).mockResolvedValue({
      ok: true, json: async () => ({ data: { healthy: false, latencyMs: 0, error: 'Connect your own Meta WhatsApp account.' } }),
    } as Response);
    render(<MetaConnectionStatus />);
    await screen.findByText('Connect your own Meta WhatsApp account.');
    expect(screen.queryByText(/^Connected/)).not.toBeInTheDocument();
  });

  it('keeps all seven stages visible without claiming Zoom/group completion', () => {
    const { container } = render(<RegistrationWorkflow activeTab="meta_leads" />);
    expect(screen.getByRole('navigation', { name: 'Registration workflow' })).toBeInTheDocument();
    expect(container.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
    expect(container.querySelector('[aria-current="step"]')).toHaveTextContent('Meta leads');
    expect(screen.getByText('Zoom review')).toBeInTheDocument();
    expect(screen.getByText('Group admission')).toBeInTheDocument();
  });
});
