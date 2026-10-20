'use client';

import React from 'react';
import { AlertTriangle, Loader, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmDeleteModal({
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDeleteModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 flex-shrink-0">
            <AlertTriangle size={24} />
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <h3 className="text-xl font-black text-slate-900 tracking-tight">Delete Sadhana Schedule</h3>
        <p className="text-slate-500 text-sm mt-2 leading-relaxed">
          Are you sure you want to permanently delete this Sadhana schedule? Automated bot sessions, scheduled messages, and routine triggers associated with this schedule will stop.
        </p>

        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:opacity-95 text-white rounded-xl font-bold text-sm transition flex items-center gap-2 shadow-md shadow-rose-500/20 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader size={16} className="animate-spin" /> : null}
            <span>{loading ? 'Deleting...' : 'Yes, Delete'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

