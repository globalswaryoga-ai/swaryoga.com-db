import type { Metadata } from 'next';

// Unlisted investor portal: not linked from the site and kept out of search engines.
export const metadata: Metadata = {
  title: 'Swar Yoga Investor Portal',
  robots: { index: false, follow: false, nocache: true },
};

export default function InvestmentPortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gradient-to-b from-fuchsia-50 via-white to-emerald-50">{children}</div>;
}
