'use client';

import React from 'react';
import { AlertTriangle, Loader } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="text-red-400" size={24} />
          <h3 className="text-lg font-semibold text-white">Delete Schedule</h3>
        </div>

        <p className="text-gray-300 mb-6">
          Are you sure you want to delete this schedule? This action cannot be undone.
        </p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader size={18} className="animate-spin" /> : null}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
