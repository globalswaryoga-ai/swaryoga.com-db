'use client';

import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeButton?: boolean;
  backdrop?: boolean;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

// Reusable Modal component
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeButton = true,
  backdrop = true,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {backdrop && (
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <div className={`relative bg-gray-950 border border-white/30 rounded-lg shadow-xl w-full mx-4 ${sizeClasses[size]}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/20">
          <h2 className="text-xl font-bold text-emerald-400">{title}</h2>
          {closeButton && (
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        <div className="px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/20 bg-gray-950">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// Modal with form layout
export function FormModal({
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  loading = false,
  size = 'md',
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-black border border-white/30 text-white hover:bg-white/10 transition-colors font-medium"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            form="form-modal"
            disabled={loading}
            className="px-4 py-2 rounded bg-black border border-emerald-500 text-emerald-400 hover:bg-emerald-600 hover:text-white disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? 'Saving...' : submitLabel}
          </button>
        </>
      }
    >
      <form id="form-modal" onSubmit={handleFormSubmit}>{children}</form>
    </Modal>
  );
}

// Confirmation Modal
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  loading = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      {message && <p className="text-white mb-6 font-medium">{message}</p>}

      <div className="flex gap-3 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded bg-black border border-white/30 text-white hover:bg-white/10 transition-colors font-medium"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`px-4 py-2 rounded text-white transition-colors disabled:opacity-50 font-medium ${
            danger
              ? 'bg-black border border-red-500 text-red-400 hover:bg-red-600 hover:text-white'
              : 'bg-black border border-emerald-500 text-emerald-400 hover:bg-emerald-600 hover:text-white'
          }`}
        >
          {loading ? 'Processing...' : confirmText}
        </button>
      </div>
    </Modal>
  );
}
