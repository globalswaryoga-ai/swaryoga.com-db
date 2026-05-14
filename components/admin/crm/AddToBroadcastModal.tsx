'use client';

import React, { useEffect, useState } from 'react';

interface BroadcastListOption {
  _id: string;
  name: string;
}

interface Lead {
  _id: string;
  phoneNumber: string;
  [key: string]: any;
}

interface AddToBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  token?: string;
  onSuccess?: (result: { added: number; skipped: number; listName: string; errors?: string[] }) => void;
}

/**
 * AddToBroadcastModal - Modal to select or create a broadcast list and add leads to it
 */
export function AddToBroadcastModal({
  isOpen,
  onClose,
  leads,
  token,
  onSuccess,
}: AddToBroadcastModalProps) {
  const [broadcastLists, setBroadcastLists] = useState<BroadcastListOption[]>([]);
  const [selectedListId, setSelectedListId] = useState('');
  const [newListName, setNewListName] = useState('');
  const [createMode, setCreateMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch broadcast lists on mount
  useEffect(() => {
    if (!isOpen || !token) return;
    const fetchLists = async () => {
      try {
        const res = await fetch('/api/admin/crm/broadcast-lists', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const lists = Array.isArray(data?.data?.lists) ? data.data.lists : [];
          setBroadcastLists(lists);
          setSelectedListId('');
        }
      } catch {
        // Silently fail; user can still create new list
      }
    };
    fetchLists();
  }, [isOpen, token]);

  const handleAddToList = async () => {
    if (!token) {
      setError('Not authenticated');
      return;
    }

    if (leads.length === 0) {
      setError('No leads to add');
      return;
    }

    let listId = selectedListId;

    // If creating new list, create it first
    if (createMode) {
      const listNameTrimmed = newListName.trim();
      if (!listNameTrimmed) {
        setError('Please enter a broadcast list name');
        return;
      }

      try {
        const createRes = await fetch('/api/admin/crm/broadcast-lists', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: listNameTrimmed }),
        });

        if (!createRes.ok) {
          const errData = await createRes.json().catch(() => ({}));
          throw new Error(errData?.error || 'Failed to create broadcast list');
        }

        const createdData = await createRes.json();
        const newListId = createdData?.data?._id;
        if (!newListId) {
          throw new Error('Failed to get new list ID');
        }

        listId = newListId;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create list');
        return;
      }
    }

    if (!listId) {
      setError('Please select or create a broadcast list');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Prepare leads for bulk add
      const leadsForBulk = leads.map((lead) => ({
        leadId: lead._id,
        phoneNumber: lead.phoneNumber,
      }));

      const res = await fetch(`/api/admin/crm/broadcast-lists/${listId}/bulk-members`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leads: leadsForBulk }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || 'Failed to add leads to broadcast list');
      }

      const data = await res.json();
      const result = data?.data || {};
      const listName = createMode ? newListName : (broadcastLists.find((l) => l._id === listId)?.name || 'Unknown');

      setSuccess(`✓ Added ${result.added} lead(s) to broadcast list (${result.skipped} already in list)`);

      // Call success callback
      if (onSuccess) {
        onSuccess({
          added: result.added,
          skipped: result.skipped,
          listName,
          errors: result.errors,
        });
      }

      // Reset and close after delay
      setTimeout(() => {
        setNewListName('');
        setCreateMode(false);
        setSelectedListId('');
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add leads');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Add {leads.length} Lead{leads.length !== 1 ? 's' : ''} to Broadcast
          </h2>
          <p className="text-slate-600 text-sm mt-1">
            Select an existing broadcast list or create a new one
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setCreateMode(false);
              setError(null);
            }}
            className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
              !createMode
                ? 'bg-teal-500 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Select Existing
          </button>
          <button
            onClick={() => {
              setCreateMode(true);
              setError(null);
            }}
            className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
              createMode
                ? 'bg-teal-500 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Create New
          </button>
        </div>

        {/* Input Field */}
        {!createMode ? (
          // Select existing list
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Broadcast List *
            </label>
            <select
              value={selectedListId}
              onChange={(e) => {
                setSelectedListId(e.target.value);
                setError(null);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
            >
              <option value="">-- Select a broadcast list --</option>
              {broadcastLists.map((list) => (
                <option key={list._id} value={list._id}>
                  {list.name}
                </option>
              ))}
            </select>
            {broadcastLists.length === 0 && (
              <p className="text-slate-500 text-xs mt-2">
                No broadcast lists found. Create a new one instead.
              </p>
            )}
          </div>
        ) : (
          // Create new list
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Broadcast List Name *
            </label>
            <input
              type="text"
              placeholder="e.g., Yoga Workshop Attendees"
              value={newListName}
              onChange={(e) => {
                setNewListName(e.target.value);
                setError(null);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
            />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm font-medium">
            {success}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAddToList}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Adding...
              </>
            ) : (
              '+ Add to Broadcast'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
