'use client';

import { useEffect, useState, ReactNode } from 'react';

export default function ClientOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    // Show a minimal loading skeleton instead of blank white screen
    return (
      <>
        {fallback || (
          <div className="flex h-screen overflow-hidden bg-gray-50">
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-400 font-medium">Loading…</p>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}
