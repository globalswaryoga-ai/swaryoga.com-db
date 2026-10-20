'use client';

import React from 'react';
import { Modal } from '@/components/admin/crm/Modal';

export type BulkActionsModalAction = {
  key: string;
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  title?: string;
  onClick: () => void | Promise<void>;
};

export function BulkActionsModal({
  isOpen,
  onClose,
  title,
  selectedCount,
  actions,
  footerLeft,
  maxWidth = 720,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  selectedCount: number;
  actions: BulkActionsModalAction[];
  footerLeft?: React.ReactNode;
  maxWidth?: number;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${title} (${selectedCount} selected)`}
      size="xl"
      footer={
        <>
          {footerLeft ? <div className="mr-auto">{footerLeft}</div> : null}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </>
      }
    >
      <div style={{ maxWidth, margin: '0 auto' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map((a) => {
            const base =
              a.variant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : a.variant === 'secondary'
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                  : 'bg-purple-600 hover:bg-purple-700 text-white';
            return (
              <button
                key={a.key}
                type="button"
                title={a.title}
                disabled={a.disabled}
                onClick={a.onClick}
                className={`px-4 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${base}`}
              >
                {a.icon ? `${a.icon} ` : ''}
                {a.label}
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
