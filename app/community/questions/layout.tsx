import { Metadata } from 'next';
import { generateMetadata } from '@/lib/seo';

export const metadata: Metadata = generateMetadata({
  title: 'Yoga Questions & Answers',
  description: 'Get your yoga, pranayama, and wellness questions answered by experts. Browse our community Q&A for helpful insights.',
  url: '/community/questions',
  keywords: ['yoga questions', 'pranayama FAQ', 'yoga help', 'breathing questions'],
});

export default function QuestionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
