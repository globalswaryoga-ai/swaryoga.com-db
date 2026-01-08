import type { ReactNode } from 'react';
import ClientOnly from '@/components/ClientOnly';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ClientOnly>
      {children}
    </ClientOnly>
  );
}
