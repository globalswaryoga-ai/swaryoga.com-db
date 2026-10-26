'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function AppUniversalBackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const [isApp, setIsApp] = useState(false);
  const [hasHeaderBackButton, setHasHeaderBackButton] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkApp = () => {
      const isAndroidApp = 
        Boolean((window as any).SwarYoga) || 
        navigator.userAgent.includes('SwarYogaApp') ||
        window.location.search.includes('is_app=true') ||
        window.location.search.includes('app=true') ||
        sessionStorage.getItem('is_swar_app') === 'true';

      setIsApp(isAndroidApp);
    };

    checkApp();

    // Check if the current page already renders an on-page header with back button
    const checkHeader = () => {
      const headerWithBack = document.querySelector('[data-app-header="true"]');
      setHasHeaderBackButton(Boolean(headerWithBack));
    };

    checkHeader();
    const timer = setTimeout(checkHeader, 250);
    return () => clearTimeout(timer);
  }, [pathname]);

  // If on home page, on media page, on blog page, on sadhana live, on community, not in app view, or already has header back button, don't show floating button
  if (!isApp || pathname === '/' || pathname === '/media' || pathname?.startsWith('/blog') || pathname?.startsWith('/sadhana') || pathname?.startsWith('/community') || hasHeaderBackButton) {
    return null;
  }

  const handleBack = () => {
    if (typeof window !== 'undefined') {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        router.push('/');
      }
    }
  };

  return (
    <div className="fixed top-2.5 left-1/2 -translate-x-1/2 z-[9999] print:hidden">
      <button
        type="button"
        onClick={handleBack}
        className="flex items-center space-x-1.5 px-3 py-2 rounded-full bg-[#166235] text-white shadow-xl border border-white/30 active:scale-95 transition-all backdrop-blur-md font-bold text-xs hover:bg-[#14532D]"
        style={{
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.45)',
          paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)',
        }}
        aria-label="Back to Previous Page"
      >
        <ArrowLeft className="w-4 h-4 text-white stroke-[2.5]" />
        <span>Back</span>
      </button>
    </div>
  );
}
