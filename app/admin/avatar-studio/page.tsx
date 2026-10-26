'use client';

import React from 'react';
import AvatarStudioContent from './AvatarStudioContent';

export default function AvatarStudioPage() {
  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <AvatarStudioContent hideHeader={false} />
      </div>
    </div>
  );
}
