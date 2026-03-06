import type { Metadata } from 'next';
import CrmNavbar from '@/components/crm-site/CrmNavbar';
import CrmFooter from '@/components/crm-site/CrmFooter';
import AiGuideChat from '@/components/crm-site/AiGuideChat';

export const metadata: Metadata = {
  title: {
    default: 'Swar Yoga CRM — All-in-One CRM for Wellness Businesses',
    template: '%s | Swar Yoga CRM',
  },
  description:
    'Manage leads, WhatsApp messaging, AI voice calls, payments, and billing — all from one powerful CRM platform built for wellness businesses.',
};

export default function CrmSiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <CrmNavbar />
      <main className="flex-1">{children}</main>
      <CrmFooter />
      <AiGuideChat />
    </div>
  );
}
