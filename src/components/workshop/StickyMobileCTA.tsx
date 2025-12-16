import React, { useState, useEffect } from 'react';

interface StickyMobileCTAProps {
  onCtaClick: () => void;
  workshopTitle?: string;
}

export default function StickyMobileCTA({ onCtaClick, workshopTitle }: StickyMobileCTAProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show CTA after user scrolls 30% of the page
      const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      setIsVisible(scrollPercentage > 30);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-200 shadow-2xl animate-slideUp">
      <div className="p-4 max-w-full">
        <button
          onClick={onCtaClick}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          Enroll in {workshopTitle ? workshopTitle.split(' ')[0] : 'This'} Workshop
        </button>
        <p className="text-xs text-gray-500 text-center mt-2">
          Limited seats available
        </p>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
