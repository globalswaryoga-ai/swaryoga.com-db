'use client';

import React, { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';

interface SuccessModalProps {
  message: string;
}

export default function SuccessModal({ message }: SuccessModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
      <div className="bg-green-900/10 backdrop-blur-sm rounded-lg p-6 border border-green-500/50 flex items-center gap-3 animate-pulse pointer-events-auto">
        <CheckCircle className="text-green-400" size={24} />
        <p className="text-green-200 font-medium">{message}</p>
      </div>
    </div>
  );
}
