'use client';

import React from 'react';

interface Column {
  key: string;
  label: string;
  width?: string;
  render?: (value: any, row: any) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: any) => void;
  rowClassName?: (row: any) => string;
  className?: string;
  striped?: boolean;
  hover?: boolean;
}

/**
 * Reusable DataTable component for displaying tabular data
 * Supports custom renders, sorting, styling, and row interactions
 *
 * @example
 * const columns = [
 *   { key: 'name', label: 'Name' },
 *   { key: 'email', label: 'Email' },
 *   { key: 'status', label: 'Status', render: (val) => <Badge>{val}</Badge> },
 * ];
 *
 * <DataTable
 *   columns={columns}
 *   data={items}
 *   loading={isLoading}
 *   onRowClick={(row) => console.log(row)}
 * />
 */
export function DataTable({
  columns,
  data,
  loading = false,
  empty = false,
  emptyMessage = 'No data available',
  onRowClick,
  rowClassName,
  className = '',
  striped = true,
  hover = true,
}: DataTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (empty || !data?.length) {
    return (
      <div className="flex items-center justify-center py-12 border border-slate-700 rounded-lg">
        <div className="text-slate-400">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto rounded-lg border border-slate-700 ${className}`}>
      <table className="w-full text-sm">
        <thead className="bg-slate-800 border-b border-slate-700">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-6 py-3 font-semibold text-slate-200 text-${column.align || 'left'}`}
                style={{ width: column.width }}
              >
                <div className="flex items-center gap-2">
                  {column.label}
                  {column.sortable && (
                    <span className="text-slate-500 cursor-pointer hover:text-slate-300">
                      ⬍
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              className={`
                border-b border-slate-700 transition-colors
                ${striped && idx % 2 === 0 ? 'bg-slate-900/30' : ''}
                ${hover ? 'hover:bg-slate-800 cursor-pointer' : ''}
                ${rowClassName?.(row) || ''}
              `}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <td
                  key={`${idx}-${column.key}`}
                  className={`px-6 py-3 text-slate-300 text-${column.align || 'left'}`}
                >
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * DataTableHeader - Optional header for DataTable
 */
export function DataTableHeader({
  title,
  subtitle,
  action,
  search,
  onSearchChange,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  search?: string;
  onSearchChange?: (value: string) => void;
}) {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          {subtitle && <p className="text-slate-400 mt-1">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>

      {onSearchChange && (
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            value={search || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
          />
          <span className="absolute right-3 top-2.5 text-slate-500">🔍</span>
        </div>
      )}
    </div>
  );
}

/**
 * DataTableFooter - Optional footer for pagination
 */
export function DataTableFooter({
  total,
  pageSize,
  page,
  onPageChange,
  hasNextPage,
  hasPreviousPage,
}: {
  total: number;
  pageSize: number;
  page: number;
  onPageChange: (page: number) => void;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="mt-4 flex items-center justify-between px-6 py-4 border-t border-slate-700">
      <div className="text-sm text-slate-400">
        Showing {start} to {end} of {total}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPreviousPage}
          className="px-3 py-1 rounded bg-slate-800 text-slate-300 disabled:opacity-50 hover:bg-slate-700 transition-colors"
        >
          Previous
        </button>

        <span className="px-3 py-1 text-slate-300">Page {page}</span>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
          className="px-3 py-1 rounded bg-slate-800 text-slate-300 disabled:opacity-50 hover:bg-slate-700 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
