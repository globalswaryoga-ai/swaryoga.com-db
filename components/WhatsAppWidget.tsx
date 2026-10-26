'use client';

import { MessageCircle, Sparkles } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function WhatsAppWidget() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isCrmDomain, setIsCrmDomain] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setIsCrmDomain(window.location.hostname.startsWith('crm.'));
    }
  }, []);

  const currentPath = pathname || (typeof window !== 'undefined' ? window.location.pathname : '');

  // Hide on admin/CRM routes, CRM domain, workshops, e-learning courses/video players, sadhana, mobile-chat, and community
  if (
    !mounted ||
    isCrmDomain ||
    currentPath?.startsWith('/admin') ||
    currentPath?.startsWith('/super-admin') ||
    currentPath?.includes('community') ||
    currentPath?.startsWith('/e-learning') ||
    currentPath?.startsWith('/workshop') ||
    currentPath?.startsWith('/workshops') ||
    currentPath?.startsWith('/sadhana') ||
    currentPath?.startsWith('/mobile-chat') ||
    currentPath?.includes('/learn') ||
    currentPath?.includes('/videos')
  ) {
    return null;
  }

  const whatsappNumber = '919779006820';
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=Hello%20Swar%20Yoga!%20I%20would%20like%20to%20inquire%20about%20your%20services.`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed right-4 sm:right-6 bottom-[calc(max(env(safe-area-inset-bottom,0px),0px)+72px)] sm:bottom-6 z-40 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-green-500 hover:bg-green-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 group select-none"
      aria-label="Contact us on WhatsApp"
      title="Chat with us on WhatsApp"
    >
      {/* Sparkle indicator */}
      <span className="absolute -right-2 top-0 flex items-center justify-center">
        <Sparkles size={16} className="text-green-400 animate-pulse" />
        <span className="absolute w-2 h-2 bg-green-400 rounded-full animate-ping"></span>
      </span>
      
      {/* WhatsApp Icon */}
      <MessageCircle size={28} className="text-white relative z-10" />
      
      {/* Tooltip */}
      <span className="absolute bottom-full mb-2 right-0 bg-gray-800 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        Chat on WhatsApp
      </span>
      
      {/* Blinking pulse animation */}
      <span className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75"></span>
    </a>
  );
}
