'use client';

import React from 'react';
import { X, Trash2 } from 'lucide-react';
import { FUNNEL_COLORS, LABEL_COLORS } from '../constants';
import type { FunnelStage, LabelPreset } from '../types';

export interface EditModalState {
  type: 'funnel' | 'label';
  mode: 'add' | 'edit';
  item?: FunnelStage | LabelPreset;
}

interface EditFunnelLabelModalProps {
  editModal: EditModalState | null;
  setEditModal: (v: EditModalState | null) => void;
  editName: string;
  setEditName: (v: string) => void;
  editColor: string;
  setEditColor: (v: string) => void;
  saveEditModal: () => void;
  deleteFromModal: () => void;
}

export function EditFunnelLabelModal({
  editModal,
  setEditModal,
  editName,
  setEditName,
  editColor,
  setEditColor,
  saveEditModal,
  deleteFromModal,
}: EditFunnelLabelModalProps) {
  if (!editModal) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setEditModal(null)}>
      <div className="bg-white rounded-xl shadow-xl w-80 p-5 mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900">{editModal.mode === 'add' ? 'Add' : 'Edit'} {editModal.type === 'funnel' ? 'Funnel Stage' : 'Label'}</h3>
          <button onClick={() => setEditModal(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <input
          type="text"
          value={editName}
          onChange={e => setEditName(e.target.value)}
          placeholder={editModal.type === 'funnel' ? 'Stage name...' : 'Label name...'}
          className="w-full px-3 py-1.5 border rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          autoFocus
          onKeyDown={e => e.key === 'Enter' && saveEditModal()}
        />
        <p className="text-[10px] text-gray-500 mb-1.5">Color</p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {(editModal.type === 'funnel' ? FUNNEL_COLORS : LABEL_COLORS).map((c, index) => (
            <button
              key={`${c}-${index}`}
              onClick={() => setEditColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition ${c.split(' ')[0]} ${editColor === c ? 'border-gray-800 scale-110' : 'border-transparent hover:border-gray-400'}`}
              title={c}
            />
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          {editModal.mode === 'edit' && editModal.item?.key !== 'all' ? (
            <button onClick={deleteFromModal} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={() => setEditModal(null)} className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
            <button
              onClick={saveEditModal}
              disabled={!editName.trim()}
              className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-40"
            >
              {editModal.mode === 'add' ? 'Add' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
