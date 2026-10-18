'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function VisitorTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Do not track internal admin/api routes to keep website analytics clean
    if (pathname.startsWith('/admin') || pathname.startsWith('/api')) {
      return;
    }

    if (lastTrackedPath.current === pathname) {
      return;
    }
    lastTrackedPath.current = pathname;

    let sessionId = localStorage.getItem('swar_visitor_session');
    if (!sessionId) {
      sessionId = 'vs_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
      localStorage.setItem('swar_visitor_session', sessionId);
    }

    // Check if visitor details exist
    let visitorInfo: any = {};
    try {
      const cached = localStorage.getItem('swar_lead_user');
      if (cached) {
        visitorInfo = JSON.parse(cached);
      }
    } catch {
      // ignore
    }

    const payload = {
      sessionId,
      pageUrl: window.location.href,
      referrer: document.referrer || '',
      visitorName: visitorInfo.name,
      visitorEmail: visitorInfo.email,
      visitorPhone: visitorInfo.phone,
      visitorGender: visitorInfo.gender,
      country: visitorInfo.country,
      state: visitorInfo.state,
      city: visitorInfo.city,
      source: visitorInfo.name ? 'registered-lead' : 'organic',
    };

    fetch('/api/visitors/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {
      // ignore tracking errors silently
    });
  }, [pathname]);

  return null;
}
