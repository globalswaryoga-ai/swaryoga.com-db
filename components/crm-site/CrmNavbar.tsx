'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { href: '/crm-site', label: 'Home' },
  { href: '/crm-site/product', label: 'Product' },
  { href: '/crm-site/pricing', label: 'Pricing' },
  { href: '/crm-site/community', label: 'Community' },
  { href: '/crm-site/about', label: 'About' },
  { href: '/crm-site/contact', label: 'Contact' },
];

export default function CrmNavbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const isActive = (href: string) =>
    href === '/crm-site' ? pathname === '/crm-site' : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/crm-site" className="flex items-center gap-2.5 group select-none">
            {!logoError ? (
              <img
                src="/logo.png"
                alt="Swar Yoga CRM"
                className="h-9 w-9 rounded-xl object-contain transition-transform group-hover:scale-105"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 flex items-center justify-center text-white shadow-sm ring-1 ring-emerald-500/30 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" opacity="0.3" />
                  <path d="M12 4c-4.41 0-8 3.59-8 8 0 2.25.93 4.28 2.43 5.73l1.42-1.42A5.964 5.964 0 016 12c0-3.31 2.69-6 6-6s6 2.69 6 6c0 1.62-.64 3.09-1.69 4.17l1.42 1.42A7.94 7.94 0 0020 12c0-4.41-3.59-8-8-8zm0 4a4 4 0 00-4 4c0 1.08.43 2.06 1.13 2.78l1.43-1.43A1.99 1.99 0 0110 12c0-1.1.9-2 2-2s2 .9 2 2c0 .54-.22 1.03-.57 1.38l1.43 1.43c.71-.72 1.14-1.7 1.14-2.81a4 4 0 00-4-4z" />
                </svg>
              </div>
            )}
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition-colors tracking-tight">
                Swar Yoga
              </span>
              <span className="text-[10px] font-bold text-emerald-700 tracking-widest uppercase">
                CRM
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive(link.href)
                    ? 'bg-swar-primary/10 text-swar-primary'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/crm-site/login"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition"
            >
              Log in
            </Link>
            <Link
              href="/crm-site/signup"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-swar-primary hover:bg-swar-primary-hover rounded-xl shadow-sm transition-all hover:shadow-md"
            >
              Start Free
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <div className="px-4 py-4 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive(link.href)
                    ? 'bg-swar-primary/10 text-swar-primary'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-gray-100 mt-3 flex flex-col gap-2">
              <Link
                href="/crm-site/login"
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 text-center"
              >
                Log in
              </Link>
              <Link
                href="/crm-site/signup"
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-swar-primary hover:bg-swar-primary-hover text-center"
              >
                Start Free
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
