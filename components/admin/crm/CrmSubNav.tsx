'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronDown,
  Menu,
  Settings,
  Home,
  LogOut,
} from 'lucide-react';

export interface SubNavItem {
  label: string;
  href: string;
  icon?: React.ElementType;
  /** Optional dropdown children — when present, the item becomes a dropdown trigger */
  children?: SubNavItem[];
}

interface CrmSubNavProps {
  /** Page title shown in the header */
  title: string;
  /** Icon component for the title */
  icon?: React.ElementType;
  /** Primary nav buttons (shown directly, max 4 recommended) */
  items: SubNavItem[];
  /** Overflow items shown in a "More" dropdown */
  moreItems?: SubNavItem[];
  /** Callback to toggle sidebar on mobile */
  onMenuClick?: () => void;
}

/** A portal-based dropdown panel that renders at the body level to avoid overflow clipping */
function DropdownPortal({
  triggerRef,
  children,
  align = 'left',
}: {
  triggerRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({
      top: r.bottom + 4,
      left: align === 'right' ? r.right - 240 : r.left,
    });
  }, [triggerRef, align]);

  if (!pos) return null;

  return createPortal(
    <div
      style={{ position: 'fixed', top: pos.top, left: Math.max(8, pos.left), zIndex: 9999 }}
      className="w-60 bg-white border border-gray-200 rounded-xl shadow-2xl py-1.5 max-h-[70vh] overflow-y-auto"
    >
      {children}
    </div>,
    document.body
  );
}

export default function CrmSubNav({
  title,
  icon: TitleIcon,
  items,
  moreItems = [],
  onMenuClick,
}: CrmSubNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const dropdownBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Close all dropdowns on outside click
  useEffect(() => {
    if (!moreOpen && !openDropdown) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      // Check if click is inside any dropdown portal panel
      const panels = document.querySelectorAll('[data-subnav-dropdown]');
      for (const panel of panels) {
        if (panel.contains(target)) return;
      }
      // Check if click is on a trigger button
      if (moreBtnRef.current?.contains(target)) return;
      for (const ref of Object.values(dropdownBtnRefs.current)) {
        if (ref?.contains(target)) return;
      }
      setMoreOpen(false);
      setOpenDropdown(null);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [moreOpen, openDropdown]);

  // Close dropdowns on route change
  useEffect(() => {
    setOpenDropdown(null);
    setMoreOpen(false);
  }, [pathname]);

  const isActive = (href: string) => pathname === href;
  const moreHasActive = moreItems.some(i => isActive(i.href));

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    router.push('/admin/login');
  };

  // Single-row mode: merge title + nav items when there are very few items
  const singleRow = items.length <= 1 && moreItems.length === 0;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className={`flex items-center justify-between px-4 ${singleRow ? 'py-1.5' : 'py-3'}`}>
        {/* Left: Menu + Title + (inline nav items when singleRow) */}
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
            >
              <Menu className="h-5 w-5 text-gray-700" />
            </button>
          )}
          <div className="flex items-center gap-2">
            {TitleIcon && <TitleIcon className="h-5 w-5 text-indigo-600" />}
            <h1 className={`font-bold text-gray-900 ${singleRow ? 'text-base' : 'text-lg'}`}>{title}</h1>
          </div>
          {/* Inline nav items in single-row mode */}
          {singleRow && items.length > 0 && items.map(item => {
            const active = isActive(item.href);
            const ItemIcon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {ItemIcon && <ItemIcon className="h-3 w-3" />}
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Right: Settings + Home + Logout */}
        <div className="flex items-center gap-1">
          <Link
            href="/admin/crm/settings"
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
          <Link
            href="/"
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition"
            title="Home"
          >
            <Home className="h-4 w-4" />
          </Link>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Sub Navigation Bar — hidden in single-row mode (items already shown inline) */}
      {!singleRow && (items.length > 0 || moreItems.length > 0) && (
        <div className="flex items-center gap-1 px-4 pb-2.5 overflow-x-auto scrollbar-hide">
          {items.map(item => {
            const active = isActive(item.href);
            const ItemIcon = item.icon;
            const hasChildren = item.children && item.children.length > 0;
            const isDropOpen = openDropdown === item.label;

            // If item has children, render as dropdown
            if (hasChildren) {
              return (
                <React.Fragment key={item.label}>
                  <button
                    ref={el => { dropdownBtnRefs.current[item.label] = el; }}
                    onClick={() => setOpenDropdown(isDropOpen ? null : item.label)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                      isDropOpen
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    {ItemIcon && <ItemIcon className="h-3.5 w-3.5" />}
                    {item.label}
                    <ChevronDown className={`h-3 w-3 transition-transform ${isDropOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isDropOpen && (
                    <DropdownPortal triggerRef={{ current: dropdownBtnRefs.current[item.label] || null }}>
                      <div data-subnav-dropdown>
                        {item.children!.map(child => {
                          const childActive = isActive(child.href);
                          const ChildIcon = child.icon;
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => setOpenDropdown(null)}
                              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                                childActive
                                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {ChildIcon && <ChildIcon className="h-4 w-4 flex-shrink-0" />}
                              <span className="truncate">{child.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </DropdownPortal>
                  )}
                </React.Fragment>
              );
            }

            // Regular item (no children)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {ItemIcon && <ItemIcon className="h-3.5 w-3.5" />}
                {item.label}
              </Link>
            );
          })}

          {/* More dropdown */}
          {moreItems.length > 0 && (
            <>
              <button
                ref={moreBtnRef}
                onClick={() => setMoreOpen(!moreOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  moreHasActive || moreOpen
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                More
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
              </button>
              {moreOpen && (
                <DropdownPortal triggerRef={moreBtnRef} align="right">
                  <div data-subnav-dropdown>
                    {moreItems.map(item => {
                      const active = isActive(item.href);
                      const ItemIcon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMoreOpen(false)}
                          className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                            active
                              ? 'bg-indigo-50 text-indigo-700 font-medium'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {ItemIcon && <ItemIcon className="h-4 w-4" />}
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </DropdownPortal>
              )}
            </>
          )}
        </div>
      )}
    </header>
  );
}
