import { Metadata } from 'next';
import { generateMetadata } from '@/lib/seo';

export const metadata: Metadata = generateMetadata({
  title: 'Frequently Asked Questions',
  description: 'Find answers to common questions about Swar Yoga, pranayama techniques, yoga classes, workshops, and wellness practices.',
  url: '/faq',
  keywords: ['yoga FAQ', 'pranayama questions', 'swar yoga questions', 'yoga help'],
});

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return children;
}
