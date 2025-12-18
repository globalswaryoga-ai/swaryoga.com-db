'use client';

import { MessageCircle } from 'lucide-react';

export default function WhatsAppWidget() {
  const whatsappNumber = '919309986820';
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=Hello%20Swar%20Yoga!%20I%20would%20like%20to%20inquire%20about%20your%20services.`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed right-6 bottom-6 z-40 flex items-center justify-center w-14 h-14 bg-swar-primary-light0 hover:bg-swar-primary rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 group"
      aria-label="Contact us on WhatsApp"
      title="Chat with us on WhatsApp"
    >
      {/* WhatsApp Icon */}
      <MessageCircle size={28} className="text-white" />
      
      {/* Tooltip */}
      <span className="absolute bottom-full mb-2 right-0 bg-gray-800 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        Chat on WhatsApp
      </span>
      
      {/* Pulse animation for attention */}
      <span className="absolute inset-0 bg-swar-primary-light0 rounded-full animate-pulse opacity-75"></span>
    </a>
  );
}
