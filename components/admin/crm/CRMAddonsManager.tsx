/**
 * CRM Addons Manager Component
 * Easy UI for managing all CRM features/addons
 */

'use client';

import React, { useState } from 'react';
import { useCRMAddons } from './useAddons';
import { Check, X, AlertCircle, Zap } from 'lucide-react';
import Link from 'next/link';

const CATEGORY_COLORS = {
  sales: 'bg-blue-50 border-blue-200',
  messaging: 'bg-green-50 border-green-200',
  analytics: 'bg-purple-50 border-purple-200',
  workflow: 'bg-orange-50 border-orange-200',
  tools: 'bg-gray-50 border-gray-200',
};

const CATEGORY_LABELS = {
  sales: '💼 Sales & CRM',
  messaging: '📱 Messaging',
  analytics: '📊 Analytics',
  workflow: '⚡ Automation',
  tools: '🛠️ Tools',
};

export function CRMAddonsManager() {
  const { addons, loading, error, isAddonEnabled, toggleAddon } = useCRMAddons();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin">⏳</div>
        <span className="ml-2">Loading addons...</span>
      </div>
    );
  }

  // Group addons by category
  const categories = Array.from(new Set(addons.map((a) => a.category)));
  const filtered = selectedCategory
    ? addons.filter((a) => a.category === selectedCategory)
    : addons;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">CRM Addons Manager</h2>
        <p className="text-gray-600">
          {filtered.length} feature{filtered.length !== 1 ? 's' : ''} available
          {selectedCategory && ` in ${CATEGORY_LABELS[selectedCategory as keyof typeof CATEGORY_LABELS]}`}
        </p>
      </div>

      {/* Category Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-lg transition ${
            !selectedCategory
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({addons.length})
        </button>
        {categories.map((cat) => {
          const count = addons.filter((a) => a.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg transition ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS]} ({count})
            </button>
          );
        })}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Error loading addons</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Addons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((addon) => (
          <div
            key={addon.id}
            className={`border-2 rounded-lg p-4 transition ${
              CATEGORY_COLORS[addon.category as keyof typeof CATEGORY_COLORS]
            }`}
          >
            {/* Header with Toggle */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{addon.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{addon.description}</p>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={() => toggleAddon(addon.id, !addon.enabled)}
                className={`ml-3 relative inline-flex h-6 w-10 items-center rounded-full transition flex-shrink-0 ${
                  addon.enabled ? 'bg-green-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    addon.enabled ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Status & Info */}
            <div className="space-y-2 text-sm">
              {/* Enabled Status */}
              <div className="flex items-center gap-2">
                {addon.enabled ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-green-700 font-medium">Active</span>
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Disabled</span>
                  </>
                )}
              </div>

              {/* Version */}
              <div className="text-gray-600">v{addon.version}</div>

              {/* Required Env Vars */}
              {addon.requiredEnvVars && addon.requiredEnvVars.length > 0 && (
                <div className="text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded">
                  ⚠️ Requires: {addon.requiredEnvVars.join(', ')}
                </div>
              )}

              {/* Dependencies */}
              {addon.dependencies && addon.dependencies.length > 0 && (
                <div className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded">
                  🔗 Depends on: {addon.dependencies.join(', ')}
                </div>
              )}

              {/* Action Link */}
              {addon.enabled && (
                <Link
                  href={addon.route}
                  className="inline-flex items-center gap-1 mt-3 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition"
                >
                  <Zap className="w-3 h-3" />
                  Manage
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No addons found in this category</p>
        </div>
      )}
    </div>
  );
}
