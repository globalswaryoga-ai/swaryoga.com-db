'use client';

import React from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface QuickLink {
  title: string;
  url: string;
  description: string;
  icon: string;
  category: 'setup' | 'documentation' | 'support';
}

export default function QuickLinksPanel() {
  const [copied, setCopied] = useState<string | null>(null);

  const links: QuickLink[] = [
    // Setup Links
    {
      title: 'Google Cloud Console',
      url: 'https://console.cloud.google.com/welcome',
      description: 'Create OAuth credentials and enable APIs',
      icon: '☁️',
      category: 'setup',
    },
    {
      title: 'Google Contacts',
      url: 'https://contacts.google.com',
      description: 'Manage your Google Contacts for sync',
      icon: '👥',
      category: 'setup',
    },
    {
      title: 'Google Drive',
      url: 'https://drive.google.com',
      description: 'View your backup folder and storage',
      icon: '📁',
      category: 'setup',
    },
    {
      title: 'Google Account Settings',
      url: 'https://myaccount.google.com/security',
      description: 'Manage your Google account security',
      icon: '🔐',
      category: 'setup',
    },

    // Documentation
    {
      title: 'Backup Setup Guide',
      url: '/docs/QR_WHATSAPP_BACKUP_SETUP.md',
      description: 'Admin setup instructions',
      icon: '📖',
      category: 'documentation',
    },
    {
      title: 'Email Guide',
      url: '/docs/QR_WHATSAPP_EMAIL_GUIDE.md',
      description: 'Which emails to use for backup',
      icon: '📧',
      category: 'documentation',
    },
    {
      title: 'Deployment Guide',
      url: '/docs/QR_BACKUP_DEPLOYMENT_GUIDE.md',
      description: 'Complete testing & deployment',
      icon: '🚀',
      category: 'documentation',
    },

    // Support
    {
      title: 'Google OAuth Documentation',
      url: 'https://developers.google.com/identity/protocols/oauth2',
      description: 'Official Google OAuth guide',
      icon: '🔑',
      category: 'support',
    },
    {
      title: 'Troubleshooting',
      url: 'https://support.google.com/accounts',
      description: 'Google account troubleshooting',
      icon: '❓',
      category: 'support',
    },
  ];

  const handleCopy = (url: string, title: string) => {
    navigator.clipboard.writeText(url);
    setCopied(title);
    setTimeout(() => setCopied(null), 2000);
  };

  const setupLinks = links.filter(l => l.category === 'setup');
  const docLinks = links.filter(l => l.category === 'documentation');
  const supportLinks = links.filter(l => l.category === 'support');

  const renderLinkGroup = (title: string, groupLinks: QuickLink[]) => (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-900 mb-3 px-4">{title}</h4>
      <div className="space-y-2">
        {groupLinks.map((link) => (
          <div
            key={link.title}
            className="mx-4 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{link.icon}</span>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline truncate"
                  >
                    {link.title}
                  </a>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                </div>
                <p className="text-xs text-gray-500 mt-1">{link.description}</p>
              </div>
              <button
                onClick={() => handleCopy(link.url, link.title)}
                className="p-1.5 rounded hover:bg-gray-100 transition flex-shrink-0"
                title="Copy link"
              >
                {copied === link.title ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
      <div className="px-6 py-4 border-b bg-gray-50 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
          <span className="text-lg">🔗</span>
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">Quick Links</h3>
          <p className="text-xs text-gray-500">Direct access to all setup and documentation</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Setup Links */}
        {renderLinkGroup('🛠️ Setup & Configuration', setupLinks)}

        {/* Documentation */}
        {renderLinkGroup('📚 Documentation', docLinks)}

        {/* Support */}
        {renderLinkGroup('💬 Support & Help', supportLinks)}

        {/* Info Box */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>💡 Tip:</strong> Click any link to open it, or click the copy icon to copy the URL to clipboard.
          </p>
        </div>
      </div>
    </div>
  );
}
