import type { Metadata } from 'next';
import './globals.css';
import WhatsAppWidget from '@/components/WhatsAppWidget';
import AppInitializer from '@/components/AppInitializer';

export const metadata: Metadata = {
  title: 'Swar Yoga - Transform Your Life Through Yoga',
  description: 'Discover authentic yoga classes, wellness products, and holistic health solutions at Swar Yoga.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-white text-gray-900">
        <AppInitializer />
        {children}
        <WhatsAppWidget />
      </body>
    </html>
  );
}
