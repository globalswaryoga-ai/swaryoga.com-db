import { fireEvent, render, screen } from '@testing-library/react';
import { MetaTriggerReportTable, type MetaTriggerRun } from '@/app/admin/crm/new-registration/_MetaTriggerReportTable';

const run: MetaTriggerRun = {
  id: 'run', name: 'Workshop details form', scheduledAt: '2026-10-12T10:00:00Z',
  senderNumber: '919000000000', status: 'scheduled', retryableCount: 1, evidence: 'message_rows',
  stats: { total: 5, sent: 2, delivered: 1, failed: 2, wrongNumber: 1, pending: 1, cancelled: 0, unverified: 0 },
};
describe('Trigger report rows and controls', () => {
  it('shows required columns and opens the exact run details', () => {
    const view = jest.fn();
    render(<MetaTriggerReportTable runs={[run]} busy={false} onView={view} onAction={jest.fn()} />);
    for (const name of ['Run name', 'Trigger date & time', 'Sender number', 'Recipients', 'Sent', 'Failed', 'Delivered', 'Wrong number', 'Actions']) {
      expect(screen.getByRole('columnheader', { name })).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole('button', { name: 'View Details' }));
    expect(view).toHaveBeenCalledWith('run');
  });
  it('archives only after confirmation and prevents repeat actions while saving', () => {
    const action = jest.fn().mockResolvedValue(true);
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    const { rerender } = render(<MetaTriggerReportTable runs={[run]} busy={false} onView={jest.fn()} onAction={action} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(action).toHaveBeenCalledWith('run', 'delete');
    rerender(<MetaTriggerReportTable runs={[run]} busy onView={jest.fn()} onAction={action} />);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    jest.restoreAllMocks();
  });
  it('disables retry when no retryable failed recipients exist', () => {
    render(<MetaTriggerReportTable runs={[{ ...run, retryableCount: 0 }]} busy={false} onView={jest.fn()} onAction={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeDisabled();
  });
});
