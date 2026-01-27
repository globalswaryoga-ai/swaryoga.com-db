'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { X, Menu, ChevronLeft } from 'lucide-react';

interface MobileSidebarContextType {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

const MobileSidebarContext = createContext<MobileSidebarContextType | null>(null);

export function useMobileSidebar() {
  const context = useContext(MobileSidebarContext);
  if (!context) {
    throw new Error('useMobileSidebar must be used within MobileSidebarProvider');
  }
  return context;
}

export function MobileSidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <MobileSidebarContext.Provider
      value={{
        isOpen,
        toggle: () => setIsOpen(!isOpen),
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
      }}
    >
      {children}
    </MobileSidebarContext.Provider>
  );
}

interface MobileSidebarProps {
  children: ReactNode;
  title?: string;
  position?: 'left' | 'right';
}

export function MobileSidebar({ children, title = 'Menu', position = 'left' }: MobileSidebarProps) {
  const { isOpen, close } = useMobileSidebar();

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={close}
      />

      {/* Sidebar Panel */}
      <div
        className={`fixed inset-y-0 ${position === 'left' ? 'left-0' : 'right-0'} z-50 w-80 max-w-[85vw] bg-white shadow-2xl lg:hidden transform transition-transform duration-300 ease-out ${
          isOpen
            ? 'translate-x-0'
            : position === 'left'
            ? '-translate-x-full'
            : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-emerald-600 to-emerald-700">
          <h2 className="font-bold text-lg text-white">{title}</h2>
          <button
            onClick={close}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors active:scale-95"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-64px)] overscroll-contain">
          {children}
        </div>
      </div>
    </>
  );
}

interface MobileSidebarTriggerProps {
  className?: string;
  label?: string;
}

export function MobileSidebarTrigger({ className = '', label }: MobileSidebarTriggerProps) {
  const { toggle } = useMobileSidebar();

  return (
    <button
      onClick={toggle}
      className={`lg:hidden p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-lg ${className}`}
      aria-label="Open menu"
    >
      <Menu size={24} />
      {label && <span className="ml-2 text-sm font-medium">{label}</span>}
    </button>
  );
}

// Floating Action Button for mobile
export function MobileFAB({ 
  onClick, 
  icon, 
  label,
  className = ''
}: { 
  onClick: () => void; 
  icon: ReactNode; 
  label?: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 right-6 z-30 lg:hidden flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-full shadow-xl hover:bg-emerald-700 active:scale-95 transition-all ${className}`}
    >
      {icon}
      {label && <span className="text-sm font-semibold">{label}</span>}
    </button>
  );
}

// Bottom Navigation for mobile
export function MobileBottomNav({ 
  items 
}: { 
  items: { icon: ReactNode; label: string; onClick: () => void; active?: boolean }[] 
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white border-t border-gray-200 shadow-lg safe-area-bottom">
      <div className="flex items-center justify-around py-2">
        {items.map((item, index) => (
          <button
            key={index}
            onClick={item.onClick}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all active:scale-95 min-w-[64px] ${
              item.active
                ? 'text-emerald-600 bg-emerald-50'
                : 'text-gray-500 hover:text-emerald-600 hover:bg-gray-50'
            }`}
          >
            {item.icon}
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

// Swipe gesture hook for mobile
export function useSwipeGesture(onSwipeLeft?: () => void, onSwipeRight?: () => void) {
  useEffect(() => {
    let touchStartX = 0;
    let touchEndX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].screenX;
      const diff = touchStartX - touchEndX;

      if (Math.abs(diff) > 50) {
        if (diff > 0 && onSwipeLeft) {
          onSwipeLeft();
        } else if (diff < 0 && onSwipeRight) {
          onSwipeRight();
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight]);
}
