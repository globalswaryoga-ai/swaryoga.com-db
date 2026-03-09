'use client';

import React from 'react';
import { X, Users, Plus, Loader2 } from 'lucide-react';

interface LightboxProps {
  lightboxImage: string | null;
  setLightboxImage: (v: string | null) => void;
}

export function Lightbox({ lightboxImage, setLightboxImage }: LightboxProps) {
  if (!lightboxImage) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
      <div className="relative max-w-4xl max-h-screen flex items-center justify-center" onClick={e => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={lightboxImage}
          alt="Full-screen"
          className="max-w-full max-h-screen object-contain rounded-lg"
        />
        <button
          onClick={() => setLightboxImage(null)}
          className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition"
          title="Close"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}

interface GroupCreateModalProps {
  showGroupCreate: boolean;
  setShowGroupCreate: (v: boolean) => void;
  newGroupName: string;
  setNewGroupName: (v: string) => void;
  newGroupMembers: string;
  setNewGroupMembers: (v: string) => void;
  creatingGroup: boolean;
  handleCreateGroup: () => void;
}

export function GroupCreateModal({
  showGroupCreate,
  setShowGroupCreate,
  newGroupName,
  setNewGroupName,
  newGroupMembers,
  setNewGroupMembers,
  creatingGroup,
  handleCreateGroup,
}: GroupCreateModalProps) {
  if (!showGroupCreate) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowGroupCreate(false)}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" /> New Group
          </h3>
          <button onClick={() => setShowGroupCreate(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Group Name</label>
          <input
            type="text"
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            placeholder="Enter group name"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Members (phone numbers, one per line)</label>
          <textarea
            value={newGroupMembers}
            onChange={e => setNewGroupMembers(e.target.value)}
            placeholder={"919876543210\n919876543211\n919876543212"}
            rows={4}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
          />
          <p className="text-[10px] text-gray-400 mt-1">Use full phone numbers with country code (e.g. 919876543210)</p>
        </div>
        <button
          onClick={handleCreateGroup}
          disabled={creatingGroup || !newGroupName.trim()}
          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {creatingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {creatingGroup ? 'Creating...' : 'Create Group'}
        </button>
      </div>
    </div>
  );
}
