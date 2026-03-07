'use client';

import { MessageCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function WhatsAppWidget() {
  const pathname = usePathname();

  // Hide on admin/CRM routes (admins have dedicated WhatsApp tools inside CRM).
  if (pathname?.startsWith('/admin')) return null;

  const whatsappNumber = '919779006820';
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=Hello%20Swar%20Yoga!%20I%20would%20like%20to%20inquire%20about%20your%20services.`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed left-6 bottom-6 z-40 flex items-center justify-center w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 group"
      aria-label="Contact us on WhatsApp"
      title="Chat with us on WhatsApp"
    >
      {/* WhatsApp Icon */}
      <MessageCircle size={28} className="text-white relative z-10" />
      
      {/* Tooltip */}
      <span className="absolute bottom-full mb-2 left-0 bg-gray-800 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        Chat on WhatsApp
      </span>
      
      {/* Blinking pulse animation */}
      <span className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75"></span>
    </a>
  );
}
