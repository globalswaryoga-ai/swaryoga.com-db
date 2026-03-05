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

  const isActive = (href: string) =>
    href === '/crm-site' ? pathname === '/crm-site' : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/crm-site" className="flex items-center gap-2.5 group">
            <img src="/logo.png" alt="Swar Yoga CRM" className="h-9 w-9 rounded-lg" />
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-bold text-gray-900 group-hover:text-swar-primary transition-colors">
                Swar Yoga
              </span>
              <span className="text-[10px] font-semibold text-swar-primary tracking-widest uppercase">
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
