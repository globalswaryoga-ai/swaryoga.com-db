'use client';

import React, { useState, useRef, useEffect } from 'react';

interface LeadLabelsDropdownProps {
  labels: string[];
  allLabels?: string[];
  onUpdate?: (newLabels: string[]) => Promise<void> | void;
  isNearBottom?: boolean;
  disabled?: boolean;
}

export function LeadLabelsDropdown({
  labels = [],
  allLabels = [],
  onUpdate,
  isNearBottom = false,
  disabled = false,
}: LeadLabelsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const cleanLabels = Array.isArray(labels)
    ? labels.map((l) => String(l).trim()).filter(Boolean)
    : [];

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleRemove = async (labelToRemove: string) => {
    if (!onUpdate || isUpdating) return;
    try {
      setIsUpdating(true);
      const nextLabels = cleanLabels.filter((l) => l !== labelToRemove);
      await onUpdate(nextLabels);
    } catch (err) {
      console.error('Failed to remove label:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAdd = async (labelToAdd: string) => {
    const trimmed = labelToAdd.trim();
    if (!trimmed || cleanLabels.includes(trimmed) || !onUpdate || isUpdating) return;
    try {
      setIsUpdating(true);
      const nextLabels = [...cleanLabels, trimmed];
      await onUpdate(nextLabels);
      setCustomLabel('');
    } catch (err) {
      console.error('Failed to add label:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter available options for the add select
  const availableOptions = (allLabels || [])
    .map((l) => String(l).trim())
    .filter((l) => l && !cleanLabels.includes(l));

  // 1. If 0 labels
  if (cleanLabels.length === 0) {
    return (
      <div className="relative inline-block" ref={dropdownRef}>
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-slate-400 bg-white/5 hover:bg-white/10 hover:text-white border border-white/10 transition cursor-pointer disabled:opacity-50"
          title="No labels - Click to add"
        >
          <span className="text-slate-500">—</span>
          <span className="text-[11px] text-amber-400/90 font-medium">+ Add</span>
        </button>

        {isOpen && renderDropdownMenu()}
      </div>
    );
  }

  // 2. If 1 label
  if (cleanLabels.length === 1) {
    const single = cleanLabels[0];
    return (
      <div className="relative inline-block" ref={dropdownRef}>
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/35 transition cursor-pointer shadow-xs group max-w-[180px]"
          title={`${single} (Click to manage)`}
        >
          <span className="truncate">{single}</span>
          <svg
            className={`w-3 h-3 text-orange-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : 'group-hover:translate-y-0.5'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && renderDropdownMenu()}
      </div>
    );
  }

  // 3. If multiple labels (>1)
  const first = cleanLabels[0];
  const countRemaining = cleanLabels.length - 1;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/35 transition cursor-pointer shadow-xs group max-w-[210px]"
        title={`${cleanLabels.join(', ')} (Click to view all ${cleanLabels.length} labels)`}
      >
        <span className="truncate max-w-[110px]">{first}</span>
        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-orange-500/35 text-orange-200 border border-orange-500/40">
          +{countRemaining}
        </span>
        <svg
          className={`w-3 h-3 text-orange-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : 'group-hover:translate-y-0.5'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && renderDropdownMenu()}
    </div>
  );

  function renderDropdownMenu() {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute left-0 w-72 bg-slate-900/98 backdrop-blur-xl border border-orange-500/40 rounded-2xl shadow-2xl p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150 ${
          isNearBottom ? 'bottom-full mb-2' : 'top-full mt-2'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-white/10 mb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-orange-300 uppercase tracking-wide">
            <span>🏷️</span>
            <span>Labels ({cleanLabels.length})</span>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded-md hover:bg-white/10 transition"
          >
            ✕
          </button>
        </div>

        {/* Scrollable list of attached labels */}
        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
          {cleanLabels.length === 0 ? (
            <div className="text-xs text-slate-400 py-2 text-center italic">No labels attached</div>
          ) : (
            cleanLabels.map((lbl) => (
              <div
                key={lbl}
                className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-xs text-orange-200"
              >
                <span className="truncate font-medium" title={lbl}>
                  {lbl}
                </span>
                {onUpdate && (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleRemove(lbl)}
                    className="text-orange-400/80 hover:text-rose-400 p-0.5 rounded hover:bg-white/10 transition disabled:opacity-50"
                    title={`Remove "${lbl}"`}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add Label Controls */}
        {onUpdate && (
          <div className="pt-2.5 border-t border-white/10 mt-2.5 space-y-2">
            {availableOptions.length > 0 && (
              <select
                defaultValue=""
                disabled={isUpdating}
                onChange={(e) => {
                  if (e.target.value) {
                    handleAdd(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="w-full px-2.5 py-1.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-orange-500 cursor-pointer disabled:opacity-50"
              >
                <option value="" disabled>
                  + Add from preset labels...
                </option>
                {availableOptions.map((opt) => (
                  <option key={opt} value={opt} className="bg-slate-900 text-slate-200">
                    {opt}
                  </option>
                ))}
              </select>
            )}

            {/* Custom label input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAdd(customLabel);
              }}
              className="flex items-center gap-1.5"
            >
              <input
                type="text"
                value={customLabel}
                disabled={isUpdating}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="Or type custom label..."
                className="flex-1 px-2.5 py-1.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
              <button
                type="submit"
                disabled={!customLabel.trim() || isUpdating}
                className="px-2.5 py-1.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:hover:bg-orange-500 text-white font-bold rounded-xl text-xs transition"
              >
                Add
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }
}
