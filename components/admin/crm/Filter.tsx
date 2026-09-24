'use client';

import React from 'react';
import Link from 'next/link';

interface FilterOption {
  label: string;
  value: string | number;
}

interface FilterProps {
  label: string;
  value: string | number;
  onChange: (value: string | number) => void;
  options: FilterOption[];
  clearable?: boolean;
  className?: string;
}

/**
 * Filter - Reusable filter dropdown
 *
 * @example
 * <Filter
 *   label="Status"
 *   value={filterStatus}
 *   onChange={setFilterStatus}
 *   options={[
 *     { label: 'All', value: 'all' },
 *     { label: 'Active', value: 'active' },
 *     { label: 'Inactive', value: 'inactive' },
 *   ]}
 * />
 */
export function Filter({
  label,
  value,
  onChange,
  options,
  clearable = false,
  className = '',
}: FilterProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className="text-sm font-medium text-slate-300">{label}:</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm hover:border-slate-600 focus:border-purple-500 focus:outline-none transition-colors"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {clearable && value && (
        <button
          onClick={() => onChange('')}
          className="px-2 py-2 text-slate-400 hover:text-slate-200 transition-colors"
        >
          ✕
        </button>
      )}
    </div>
  );
}

/**
 * FilterGroup - Multiple filters
 */
export function FilterGroup({
  filters,
  onFilterChange,
  onClear,
  className = '',
}: {
  filters: Array<{
    key: string;
    label: string;
    value: string | number;
    options: FilterOption[];
  }>;
  onFilterChange: (key: string, value: string | number) => void;
  onClear?: () => void;
  className?: string;
}) {
  const activeFiltersCount = filters.filter((f) => f.value).length;

  return (
    <div className={`flex flex-wrap items-center gap-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700 ${className}`}>
      {filters.map((filter) => (
        <Filter
          key={filter.key}
          label={filter.label}
          value={filter.value}
          onChange={(val) => onFilterChange(filter.key, val)}
          options={filter.options}
          clearable
        />
      ))}

      {onClear && activeFiltersCount > 0 && (
        <button
          onClick={onClear}
          className="ml-auto px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
        >
          Clear All
        </button>
      )}
    </div>
  );
}

/**
 * PageHeader - Consistent page header with title, actions, and filters
 */
export function PageHeader({
  title,
  subtitle,
  action,
  filters,
  onFilterChange,
  onClearFilters,
  className = '',
  theme = 'dark',
}: {
  title: string | React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
  filters?: Array<{
    key: string;
    label: string;
    value: string | number;
    options: FilterOption[];
  }>;
  onFilterChange?: (key: string, value: string | number) => void;
  onClearFilters?: () => void;
  className?: string;
  theme?: 'dark' | 'light';
}) {
  const isLight = theme === 'light';
  return (
    <div className={`mb-8 space-y-6 ${className}`}>
      {/* Title Section */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/admin/crm"
            className={
              isLight
                ? 'mt-1 p-2 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-900 border border-gray-200 rounded-xl transition-all shadow-sm group active:scale-95'
                : 'mt-1 p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 rounded-xl transition-all shadow-lg group active:scale-95'
            }
            title="Back to CRM Dashboard"
          >
            <i className="ph ph-house text-xl group-hover:scale-110 transition-transform"></i>
          </Link>
          <div>
            <h1 className={`text-3xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{title}</h1>
            {subtitle && <p className={`mt-2 ${isLight ? 'text-gray-500' : 'text-slate-400'}`}>{subtitle}</p>}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>

      {/* Filters */}
      {filters && onFilterChange && (
        <FilterGroup
          filters={filters}
          onFilterChange={onFilterChange}
          onClear={onClearFilters}
        />
      )}
    </div>
  );
}

/**
 * SearchBar - Search input with icon
 */
export function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  onClear,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2 pl-10 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none transition-colors"
      />
      <span className="absolute left-3 top-2.5 text-slate-500">🔍</span>
      {value && onClear && (
        <button
          onClick={onClear}
          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition-colors"
        >
          ✕
        </button>
      )}
    </div>
  );
}

/**
 * Toolbar - Top bar with search and filters
 */
export function Toolbar({
  search,
  onSearchChange,
  onSearchClear,
  filters,
  onFilterChange,
  onClearFilters,
  action,
  className = '',
}: {
  search?: string;
  onSearchChange?: (value: string) => void;
  onSearchClear?: () => void;
  filters?: Array<{
    key: string;
    label: string;
    value: string | number;
    options: FilterOption[];
  }>;
  onFilterChange?: (key: string, value: string | number) => void;
  onClearFilters?: () => void;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-4">
        {onSearchChange && (
          <SearchBar
            value={search || ''}
            onChange={onSearchChange}
            onClear={onSearchClear}
            className="flex-1"
          />
        )}
        {action && <div>{action}</div>}
      </div>

      {filters && onFilterChange && (
        <FilterGroup
          filters={filters}
          onFilterChange={onFilterChange}
          onClear={onClearFilters}
        />
      )}
    </div>
  );
}
