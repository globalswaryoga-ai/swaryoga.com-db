import type { Metadata } from 'next';
import './globals.css';
import WhatsAppWidget from '@/components/WhatsAppWidget';
import AppInitializer from '@/components/AppInitializer';

export const metadata: Metadata = {
  title: 'Swar Yoga - Transform Your Life Through Yoga',
  description: 'Discover authentic yoga classes, wellness products, and holistic health solutions at Swar Yoga.',
  viewport: 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover" />
        <meta name="theme-color" content="#2D6A4F" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased bg-white text-gray-900 overflow-x-hidden">
        <AppInitializer />
        {children}
        <WhatsAppWidget />
      </body>
    </html>
  );
}
