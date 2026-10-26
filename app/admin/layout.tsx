import type { ReactNode } from 'react';
import Script from 'next/script';
import ClientOnly from '@/components/ClientOnly';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ClientOnly>
      {/* Phosphor Icons for CRM only */}
      <link rel="stylesheet" type="text/css" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/duotone/style.css" />
      <link rel="stylesheet" type="text/css" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css" />
      <link rel="stylesheet" type="text/css" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/bold/style.css" />
      <link rel="stylesheet" type="text/css" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/fill/style.css" />
      <Script src="https://unpkg.com/@phosphor-icons/web@2.1.1" strategy="afterInteractive" />
      {children}
    </ClientOnly>
  );
}
