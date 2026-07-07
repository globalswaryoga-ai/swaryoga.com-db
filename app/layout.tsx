import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import WhatsAppWidget from '@/components/WhatsAppWidget';
import AppInitializer from '@/components/AppInitializer';
import ErrorCatcher from '@/components/ErrorCatcher';
import { RootErrorBoundary } from '@/components/RootErrorBoundary';
import { PerformanceMonitor } from '@/components/PerformanceMonitor';
import { CartProvider } from '@/lib/context/CartContext';
import { Space_Grotesk } from 'next/font/google';
import { siteConfig } from '@/lib/seo';
import { OrganizationJsonLd, WebsiteJsonLd } from '@/components/seo/JsonLd';
import { startSadhanaScheduler } from '@/lib/sadhanaSchedulerServiceV2';

// Initialize Sadhana Scheduler on server start
if (typeof window === 'undefined') {
  startSadhanaScheduler().catch(err => {
    console.error('[App] Failed to start Sadhana scheduler:', err);
  });
}

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: siteConfig.author }],
  creator: siteConfig.author,
  publisher: siteConfig.author,
  metadataBase: new URL(siteConfig.url),
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
    locale: siteConfig.locale,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: siteConfig.twitterHandle,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 5.0,
  userScalable: true,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover" />
        <meta name="theme-color" content="#2D6A4F" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* Phosphor Icons */}
        <link rel="stylesheet" type="text/css" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/duotone/style.css" />
        <link rel="stylesheet" type="text/css" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css" />
        <link rel="stylesheet" type="text/css" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/bold/style.css" />
        <link rel="stylesheet" type="text/css" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/fill/style.css" />
        <Script src="https://unpkg.com/@phosphor-icons/web@2.1.1" strategy="afterInteractive" />
        
        {/* Google Tag Manager (GTM) - Install through this for recommended setup */}
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-5MB3M7KZ');
              window.dataLayer = window.dataLayer || [];
            `,
          }}
        />

        {/* Block broken CAPI gateway requests to AWS AppRunner (must run before pixel loads) */}
        <Script
          id="block-capi-gateway"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var _origFetch = window.fetch;
                window.fetch = function(url) {
                  if (typeof url === 'string' && url.indexOf('awsapprunner.com') !== -1) {
                    return Promise.resolve(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
                  }
                  return _origFetch.apply(this, arguments);
                };
                var _origOpen = XMLHttpRequest.prototype.open;
                XMLHttpRequest.prototype.open = function(m, url) {
                  this._blockedAppRunner = typeof url === 'string' && url.indexOf('awsapprunner.com') !== -1;
                  return _origOpen.apply(this, arguments);
                };
                var _origSend = XMLHttpRequest.prototype.send;
                XMLHttpRequest.prototype.send = function() {
                  if (this._blockedAppRunner) return;
                  return _origSend.apply(this, arguments);
                };
              })();
            `,
          }}
        />

        {/* Meta Pixel Code - autoConfig disabled to prevent broken CAPI gateway */}
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '906922940547021', {}, {autoConfig: false});
              fbq('track', 'PageView');

              // Enhanced tracking for cost optimization
              document.addEventListener('DOMContentLoaded', function() {
                var contentElements = document.querySelectorAll('[data-track-view]');
                contentElements.forEach(function(el) {
                  el.addEventListener('click', function() {
                    var contentName = this.getAttribute('data-content-name');
                    var contentType = this.getAttribute('data-content-type');
                    var price = this.getAttribute('data-price');
                    if (contentName) {
                      fbq('track', 'ViewContent', {
                        content_name: contentName,
                        content_type: contentType || 'product',
                        value: price || undefined,
                        currency: 'INR'
                      });
                    }
                  });
                });
              });
            `,
          }}
        />
        
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof performance !== 'undefined' && performance.mark) {
                performance.mark('page-load-start');
              }
            `,
          }}
        />
      </head>
      <body className="antialiased bg-white text-swar-text overflow-x-hidden">
        {/* Schema.org JSON-LD */}
        <OrganizationJsonLd />
        <WebsiteJsonLd />

        <RootErrorBoundary>
          <CartProvider>
            <ErrorCatcher />
            <PerformanceMonitor />
            <AppInitializer />
            {children}
            <WhatsAppWidget />
          </CartProvider>
        </RootErrorBoundary>
      </body>
    </html>
  );
}
