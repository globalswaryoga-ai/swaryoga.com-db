import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { MessageTicks } from '@/app/admin/crm/qr/components/MessageTicks';

afterEach(cleanup);

describe('MessageTicks', () => {
  it.each([
    [-1, 'Failed'],
    [0, 'Sending'],
    [1, 'Sent'],
    [2, 'Delivered'],
    [3, 'Read'],
  ])('renders canonical status %p as %s', (status, title) => {
    render(<MessageTicks status={status} />);
    expect(screen.getByTitle(title)).toBeInTheDocument();
  });
});
