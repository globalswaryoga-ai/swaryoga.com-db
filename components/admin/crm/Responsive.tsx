'use client';

import React from 'react';

/**
 * Mobile-optimized responsive components for CRM dashboard
 * Provides mobile-first layouts and touch-friendly interactions
 */

interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Responsive grid that adapts to screen size
 * Default: 1 column on mobile, 2 on tablet, 3+ on desktop
 */
export function ResponsiveGrid({
  children,
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'md',
  className = '',
}: ResponsiveGridProps) {
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4 md:gap-6',
    lg: 'gap-6 md:gap-8',
  };

  const colClasses = `grid ${gapClasses[gap]} 
    ${cols.mobile ? `grid-cols-${cols.mobile}` : 'grid-cols-1'} 
    ${cols.tablet ? `md:grid-cols-${cols.tablet}` : 'md:grid-cols-2'} 
    ${cols.desktop ? `lg:grid-cols-${cols.desktop}` : 'lg:grid-cols-3'} 
    ${className}`;

  return <div className={colClasses}>{children}</div>;
}

interface MobileCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  expandable?: boolean;
  onToggle?: () => void;
  expanded?: boolean;
  className?: string;
}

/**
 * Touch-friendly mobile card component
 * Better for mobile viewing with expandable content
 */
export function MobileCard({
  children,
  title,
  subtitle,
  action,
  expandable = false,
  onToggle,
  expanded = false,
  className = '',
}: MobileCardProps) {
  return (
    <div
      className={`
        bg-slate-800/50 border border-purple-500/20 rounded-lg p-4
        md:rounded-xl md:p-6 hover:border-purple-500/50 
        transition-all duration-200 touch-pan-y
        ${className}
      `}
    >
      {(title || action) && (
        <div className="flex items-start justify-between mb-4 gap-2">
          <div className="flex-1 min-w-0">
            {title && <h3 className="text-base md:text-lg font-semibold text-white truncate">{title}</h3>}
            {subtitle && <p className="text-xs md:text-sm text-purple-300 mt-1 truncate">{subtitle}</p>}
          </div>
          {expandable ? (
            <button
              onClick={onToggle}
              className="flex-shrink-0 p-2 text-purple-400 hover:text-purple-300 transition-colors"
              aria-expanded={expanded}
            >
              {expanded ? '▼' : '▶'}
            </button>
          ) : null}
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}

      {(!expandable || expanded) && (
        <div className="text-sm text-purple-200">
          {children}
        </div>
      )}
    </div>
  );
}

interface ResponsiveTableProps {
  columns: Array<{
    key: string;
    label: string;
    mobile?: boolean;
    render?: (value: any, row: any) => React.ReactNode;
  }>;
  data: any[];
  onRowClick?: (row: any) => void;
  className?: string;
}

/**
 * Responsive table that collapses to cards on mobile
 * Shows only essential columns on small screens
 */
export function ResponsiveTable({
  columns,
  data,
  onRowClick,
  className = '',
}: ResponsiveTableProps) {
  const mobileColumns = columns.filter(c => c.mobile !== false);

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 border-b border-slate-700">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 md:px-6 py-3 font-semibold text-slate-200 text-left"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => {
              const rowKey = (row as any)._id || (row as any).id || idx;
              return (
              <tr
                key={rowKey}
                onClick={() => onRowClick?.(row)}
                className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors cursor-pointer"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 md:px-6 py-4 text-slate-300">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {data.map((row, idx) => {
          const rowKey = (row as any)._id || (row as any).id || idx;
          return (
          <MobileCard
            key={rowKey}
            title={row[mobileColumns[0]?.key]}
            subtitle={row[mobileColumns[1]?.key]}
            action={
              <button
                onClick={() => onRowClick?.(row)}
                className="px-3 py-1 bg-purple-500/20 text-purple-200 text-xs rounded hover:bg-purple-500/30 transition-colors"
              >
                View
              </button>
            }
          >
            <div className="space-y-2">
              {mobileColumns.slice(2).map((col) => (
                <div key={col.key} className="flex justify-between items-start gap-2">
                  <span className="text-purple-400 text-xs font-medium">{col.label}:</span>
                  <span className="text-right">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </span>
                </div>
              ))}
            </div>
          </MobileCard>
          );
        })}
      </div>
    </>
  );
}

interface ResponsiveToolbarProps {
  children: React.ReactNode;
  className?: string;
  stackOnMobile?: boolean;
}

/**
 * Responsive toolbar that stacks on mobile
 * Provides better touch targets and readable layout on small screens
 */
export function ResponsiveToolbar({
  children,
  className = '',
  stackOnMobile = true,
}: ResponsiveToolbarProps) {
  return (
    <div
      className={`
        flex ${stackOnMobile ? 'flex-col md:flex-row' : 'flex-row'}
        items-stretch md:items-center justify-between gap-3 md:gap-4
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface MobileMenuProps {
  items: Array<{
    label: string;
    icon?: string;
    onClick: () => void;
    active?: boolean;
  }>;
  className?: string;
}

/**
 * Mobile-optimized menu/tab component
 * Touch-friendly with larger tap targets
 */
export function MobileMenu({ items, className = '' }: MobileMenuProps) {
  return (
    <div className={`flex gap-1 md:gap-2 overflow-x-auto pb-2 ${className}`}>
      {items.map((item) => (
        <button
          key={item.label}
          onClick={item.onClick}
          className={`
            px-3 md:px-4 py-2 md:py-2 text-xs md:text-sm font-medium 
            rounded-lg whitespace-nowrap flex-shrink-0
            transition-all duration-200
            ${
              item.active
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                : 'bg-slate-800/50 text-purple-200 border border-purple-500/20 hover:border-purple-500/50'
            }
          `}
        >
          {item.icon && <span className="mr-1">{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </div>
  );
}

interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  fullscreenOnMobile?: boolean;
  actions?: React.ReactNode;
}

/**
 * Responsive modal that goes fullscreen on mobile
 * Better for small screens
 */
export function ResponsiveModal({
  isOpen,
  onClose,
  title,
  children,
  fullscreenOnMobile = true,
  actions,
}: ResponsiveModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur flex items-end md:items-center justify-center">
      <div
        className={`
          bg-slate-800 rounded-t-2xl md:rounded-xl border border-purple-500/50 
          w-full md:max-w-2xl md:w-full mx-0
          ${fullscreenOnMobile ? 'max-h-[90vh] md:max-h-[80vh]' : 'max-h-[80vh]'}
          overflow-y-auto
          p-4 md:p-8
        `}
      >
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-lg md:text-2xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-2xl text-purple-400 hover:text-purple-300 transition-colors"
          >
            ×
          </button>
        </div>

        <div className="mb-6 text-sm md:text-base text-purple-200">{children}</div>

        {actions && (
          <div className="flex gap-2 md:gap-3 pt-4 md:pt-6 border-t border-purple-500/20">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Stat card optimized for mobile and desktop
 */
interface ResponsiveStatProps {
  label: string;
  value: string | number;
  change?: string;
  changePositive?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export function ResponsiveStat({
  label,
  value,
  change,
  changePositive = true,
  icon,
  className = '',
}: ResponsiveStatProps) {
  return (
    <div
      className={`
        bg-slate-800/50 border border-purple-500/20 rounded-lg p-4
        md:rounded-xl md:p-6 hover:border-purple-500/50
        transition-all duration-200
        ${className}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm text-purple-300 truncate">{label}</p>
          <p className="text-lg md:text-2xl font-bold text-white mt-1">{value}</p>
          {change && (
            <p className={`text-xs md:text-sm mt-2 ${changePositive ? 'text-green-400' : 'text-red-400'}`}>
              {changePositive ? '↑' : '↓'} {change}
            </p>
          )}
        </div>
        {icon && <div className="text-3xl md:text-4xl flex-shrink-0">{icon}</div>}
      </div>
    </div>
  );
}
