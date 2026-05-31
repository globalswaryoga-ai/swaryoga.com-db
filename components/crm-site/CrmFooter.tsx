import React from 'react';
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
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/crm-site" className="flex items-center gap-2 mb-4">
              <img src="/logo.png" alt="Swar Yoga CRM" className="h-8 w-8 rounded-lg" />
              <span className="text-lg font-bold text-white">Swar Yoga CRM</span>
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
