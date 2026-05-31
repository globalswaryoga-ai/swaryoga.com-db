'use client';

/**
 * Shared grouped module-bundle picker.
 *
 * Renders the 17 bundles from MODULE_CATALOG with a parent checkbox per group
 * (toggles all children) and per-child checkboxes. Used by the Tenant
 * Management page and the CRM Users plan-access modal.
 */

import React from 'react';
import { MODULE_CATALOG, expandGroups } from '@/lib/tenant/moduleCatalog';

export default function ModuleBundlePicker({
  selected,
  onChange,
}: {
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const toggleGroup = (groupKey: string, children: string[], on: boolean) => {
    const next = new Set(selected);
    if (on) {
      next.add(groupKey);
      children.forEach((c) => next.add(c));
    } else {
      next.delete(groupKey);
      children.forEach((c) => next.delete(c));
    }
    onChange(next);
  };

  const toggleChild = (groupKey: string, childKey: string, on: boolean) => {
    const next = new Set(selected);
    if (on) {
      next.add(childKey);
      next.add(groupKey);
    } else {
      next.delete(childKey);
    }
    onChange(next);
  };

  const enabledCount = MODULE_CATALOG.filter((g) => selected.has(g.key)).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          Modules &amp; Pages ({enabledCount}/{MODULE_CATALOG.length})
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange(new Set(expandGroups(MODULE_CATALOG.map((g) => g.key))))}
            className="text-[11px] text-indigo-600 hover:underline"
          >
            Select all
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={() => onChange(new Set())}
            className="text-[11px] text-gray-500 hover:underline"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
        {MODULE_CATALOG.map((g) => {
          const groupOn = selected.has(g.key);
          const childKeys = g.children.map((c) => c.key);
          return (
            <div
              key={g.key}
              className={`rounded-lg border p-3 transition ${
                groupOn ? 'border-indigo-300 bg-indigo-50/50' : 'border-gray-200 bg-white'
              }`}
            >
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={groupOn}
                  onChange={(e) => toggleGroup(g.key, childKeys, e.target.checked)}
                  className="h-4 w-4 rounded accent-indigo-600"
                />
                <span className="text-sm font-medium text-gray-800">
                  {g.icon} {g.label}
                </span>
              </label>
              {g.description && (
                <p className="text-[11px] text-gray-400 ml-6 mt-0.5">{g.description}</p>
              )}

              {g.children.length > 0 && (
                <div className="ml-6 mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {g.children.map((c) => (
                    <label key={c.key} className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selected.has(c.key)}
                        onChange={(e) => toggleChild(g.key, c.key, e.target.checked)}
                        className="h-3.5 w-3.5 rounded accent-indigo-500"
                      />
                      <span className="text-[12px] text-gray-600">{c.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
