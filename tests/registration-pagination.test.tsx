import { fireEvent, render, screen } from '@testing-library/react';
import { RegistrationPagination, useRegistrationPage } from '@/app/admin/crm/new-registration/_RegistrationPagination';
import { registrationPage } from '@/lib/registrationPagination';

function TablePreview({ filter, total }: { filter: string; total: number }) {
  const pagination = useRegistrationPage(filter);
  return <RegistrationPagination range={registrationPage(total, pagination.page)} onPage={pagination.onPage} />;
}

describe('Registration pagination controls', () => {
  it('navigates all lead pages and resets when the batch/filter changes', () => {
    const { rerender } = render(<TablePreview filter="hindi" total={727} />);
    expect(screen.getByText(/Showing 1-50 of 727/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(/Showing 51-100 of 727/)).toBeInTheDocument();
    rerender(<TablePreview filter="marathi" total={727} />);
    expect(screen.getByText(/Showing 1-50 of 727/)).toBeInTheDocument();
  });

  it('clamps a shortened result set and exposes an empty result without hiding navigation state', () => {
    const { rerender } = render(<TablePreview filter="hindi" total={100} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    rerender(<TablePreview filter="hindi" total={0} />);
    expect(screen.getByText(/Showing 0-0 of 0/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});
