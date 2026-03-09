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
  User,
  CreditCard,
  Crown,
  ArrowUpRight,
  Landmark,
  Receipt,
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
      className="w-60 bg-white border border-gray-200 rounded-lg shadow-lg py-1.5 max-h-[70vh] overflow-y-auto"
    >
      {children}
    </div>,
    document.body
  );
}

// ============================================================================
// PROFILE DROPDOWN - User avatar with account menu
// ============================================================================

function ProfileDropdown({ onLogout }: { onLogout: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const userStr = localStorage.getItem('admin_user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setUserName(u?.name || u?.userId || 'Admin');
        setUserEmail(u?.email || '');
      } catch { /* ignore */ }
    }
    const crmName = localStorage.getItem('crm_user_name');
    const crmEmail = localStorage.getItem('crm_user_email');
    if (crmName) setUserName(crmName);
    if (crmEmail) setUserEmail(crmEmail);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const initials = userName
    ? userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const menuItems = [
    { label: 'Plan Details', icon: Crown, href: '/admin/crm/subscription', color: 'text-purple-600' },
    { label: 'Upgrade', icon: ArrowUpRight, href: '/admin/crm/subscription', color: 'text-indigo-600' },
    { label: 'Billing', icon: Receipt, href: '/admin/crm/settings?tab=billing', color: 'text-green-600' },
    { label: 'Payment / Bank Details', icon: Landmark, href: '/admin/crm/settings?tab=payments', color: 'text-indigo-600' },
    { label: 'Settings', icon: Settings, href: '/admin/crm/settings', color: 'text-gray-600' },
  ];

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition"
        title="Account"
      >
        <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[11px] font-bold">
          {initials}
        </div>
        <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform hidden sm:block ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-[9999]"
        >
          {/* User info header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{userName || 'Admin'}</p>
                {userEmail && (
                  <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                )}
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 ${item.color}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Sign out */}
          <div className="border-t border-gray-100 pt-1.5">
            <button
              onClick={() => { setIsOpen(false); onLogout(); }}
              className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
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
    // Redirect to correct login page based on domain
    const isCrm = typeof window !== 'undefined' && 
      (window.location.hostname === 'crm.swaryoga.com' || window.location.hostname.startsWith('crm.'));
    router.push(isCrm ? '/crm-site/login' : '/admin/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 py-1.5">
        {/* Left: Menu + Title */}
        <div className="flex items-center gap-3 shrink-0">
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
            <h1 className="font-bold text-gray-900 text-base whitespace-nowrap">{title}</h1>
          </div>
        </div>

        {/* Center: Nav items + More dropdown — all inline */}
        {(items.length > 0 || moreItems.length > 0) && (
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide mx-3">
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
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                        isDropOpen
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      {ItemIcon && <ItemIcon className="h-3 w-3" />}
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

            {/* More dropdown */}
            {moreItems.length > 0 && (
              <>
                <button
                  ref={moreBtnRef}
                  onClick={() => setMoreOpen(!moreOpen)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    moreHasActive || moreOpen
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  More
                  <ChevronDown className={`h-3 w-3 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
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

        {/* Right: Profile Menu */}
        <div className="flex items-center gap-1 shrink-0 relative">
          <Link
            href="/"
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition"
            title="Home"
          >
            <Home className="h-4 w-4" />
          </Link>

          {/* Profile Dropdown */}
          <ProfileDropdown onLogout={handleLogout} />
        </div>
      </div>
    </header>
  );
}
