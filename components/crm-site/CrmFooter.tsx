'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const FOOTER_LINKS = {
  Product: [
    { href: '/crm-site/product', label: 'Features' },
    { href: '/crm-site/pricing', label: 'Pricing' },
    { href: '/crm-site/community', label: 'Community' },
  ],
  Company: [
    { href: '/crm-site/about', label: 'About Us' },
    { href: '/crm-site/contact', label: 'Contact' },
    { href: 'https://swaryoga.com/privacy', label: 'Privacy Policy' },
    { href: 'https://swaryoga.com/terms', label: 'Terms of Service' },
  ],
  Support: [
    { href: '/crm-site/contact', label: 'Help Center' },
    { href: '/crm-site/contact', label: 'Report a Bug' },
    { href: 'https://swaryoga.com/refunds-and-cancellations', label: 'Refunds' },
  ],
};

export default function CrmFooter() {
  const [logoError, setLogoError] = React.useState(false);

  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/crm-site" className="flex items-center gap-2 mb-4 group">
              {!logoError ? (
                <img
                  src="https://swaryogacrm.b-cdn.net/Symbol%20of%20infinity%20with%20a%20flame.png"
                  alt="Swar Yoga CRM"
                  className="h-8 w-8 rounded-lg object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" opacity="0.3" />
                    <path d="M12 4c-4.41 0-8 3.59-8 8 0 2.25.93 4.28 2.43 5.73l1.42-1.42A5.964 5.964 0 016 12c0-3.31 2.69-6 6-6s6 2.69 6 6c0 1.62-.64 3.09-1.69 4.17l1.42 1.42A7.94 7.94 0 0020 12c0-4.41-3.59-8-8-8zm0 4a4 4 0 00-4 4c0 1.08.43 2.06 1.13 2.78l1.43-1.43A1.99 1.99 0 0110 12c0-1.1.9-2 2-2s2 .9 2 2c0 .54-.22 1.03-.57 1.38l1.43 1.43c.71-.72 1.14-1.7 1.14-2.81a4 4 0 00-4-4z" />
                  </svg>
                </div>
              )}
              <span className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">Swar Yoga CRM</span>
            </Link>
            <p className="text-sm leading-relaxed mb-4">
              The all-in-one CRM for wellness businesses. Manage leads, WhatsApp,
              AI voice calls, payments, and more — from one platform.
            </p>
            <div className="space-y-1.5 mb-4 text-sm">
              <a href="mailto:mohan@swaryoga.com" className="block hover:text-white transition">✉️ mohan@swaryoga.com</a>
              <a href="tel:+919779006820" className="block hover:text-white transition">📞 +91 97790 06820</a>
              <a href="https://wa.me/919779006820" target="_blank" rel="noopener noreferrer" className="block hover:text-white transition">💬 WhatsApp: +91 97790 06820</a>
              <span className="block text-gray-500">📍 Maharashtra, India — 422605</span>
            </div>
            <p className="text-xs text-gray-500">
              &copy; {new Date().getFullYear()} Swar Yoga. All rights reserved.
            </p>
          </div>

          {/* Link Groups */}
          {Object.entries(FOOTER_LINKS).map(([group, links]) => (
            <div key={group}>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                {group}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-xs">Made with care in India</span>
          <div className="flex items-center gap-4 text-xs">
            <a href="https://swaryoga.com/privacy" className="hover:text-white transition">Privacy</a>
            <a href="https://swaryoga.com/terms" className="hover:text-white transition">Terms</a>
            <a href="https://swaryoga.com/refunds-and-cancellations" className="hover:text-white transition">Refunds</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
