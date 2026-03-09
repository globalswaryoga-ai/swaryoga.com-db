'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  Link as LinkIcon, Copy, Check, ExternalLink, QrCode, Share2,
  Users, BookOpen, ShoppingCart, HelpCircle, UserPlus, Globe
} from 'lucide-react';

interface FormLink {
  type: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  baseUrl: string;
  params?: { key: string; label: string; options?: string[] }[];
}

const FORM_LINKS: FormLink[] = [
  {
    type: 'signup',
    title: 'Signup Form',
    description: 'Full registration with account creation',
    icon: <UserPlus size={24} />,
    color: 'emerald',
    baseUrl: '/forms/signup',
  },
  {
    type: 'lead',
    title: 'Lead Form',
    description: 'Quick contact capture for leads',
    icon: <Users size={24} />,
    color: 'blue',
    baseUrl: '/forms/lead',
  },
  {
    type: 'workshop',
    title: 'Workshop Registration',
    description: 'Register for workshops with batch preference',
    icon: <BookOpen size={24} />,
    color: 'purple',
    baseUrl: '/forms/workshop',
    params: [
      {
        key: 'workshop',
        label: 'Pre-select Workshop',
        options: [
          'Swar Yoga Foundation',
          'Aham Bramhasmi',
          'Astavakra Gita',
          'Shivoham',
          'I Am Fit',
          'Youth Wellness',
          'Children Yoga',
          'Married Life Harmony',
          'Business Success',
          'Shankara Philosophy',
          'Amrut Bhoj',
          'Yogasana Mastery',
          'English Swar Yoga',
        ],
      },
    ],
  },
  {
    type: 'sales',
    title: 'Course Enrollment',
    description: 'Paid course enrollment form',
    icon: <ShoppingCart size={24} />,
    color: 'orange',
    baseUrl: '/forms/sales',
  },
  {
    type: 'inquiry',
    title: 'General Inquiry',
    description: 'Contact form for questions',
    icon: <HelpCircle size={24} />,
    color: 'cyan',
    baseUrl: '/forms/inquiry',
  },
];

export default function AdminFormLinksPage() {
  const router = useRouter();
  const token = useAuth();
  
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [selectedWorkshops, setSelectedWorkshops] = useState<Record<string, string>>({});
  const [customSource, setCustomSource] = useState('');
  
  const getColor = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string; gradient: string }> = {
      emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', gradient: 'from-emerald-500 to-teal-600' },
      blue: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-600', gradient: 'from-indigo-500 to-indigo-600' },
      purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600', gradient: 'from-purple-500 to-violet-600' },
      orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', gradient: 'from-orange-500 to-amber-600' },
      cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-600', gradient: 'from-cyan-500 to-indigo-600' },
    };
    return colors[color] || colors.blue;
  };
  
  const buildUrl = (form: FormLink): string => {
    const baseUrl = `https://swaryoga.com${form.baseUrl}`;
    const params = new URLSearchParams();
    
    if (customSource) {
      params.set('source', customSource);
    }
    
    if (form.type === 'workshop' && selectedWorkshops[form.type]) {
      params.set('workshop', selectedWorkshops[form.type]);
    }
    
    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  };
  
  const copyToClipboard = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };
  
  const shareUrl = async (url: string, title: string) => {
    if (navigator.share) {
      await navigator.share({ title, url });
    } else {
      copyToClipboard(url);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <LinkIcon className="text-indigo-600" size={28} />
                Form Links Manager
              </h1>
              <p className="text-slate-500 text-sm mt-1">Generate and share form links with people</p>
            </div>
            <button
              onClick={() => router.push('/admin/crm')}
              className="px-6 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
            >
              ← Back to CRM
            </button>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Source Tracking */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Globe size={20} />
            Source Tracking (Optional)
          </h2>
          <p className="text-sm text-slate-500 mb-4">Add a source parameter to track where leads come from</p>
          <div className="flex gap-4">
            <input
              type="text"
              value={customSource}
              onChange={(e) => setCustomSource(e.target.value.replace(/\s+/g, '-').toLowerCase())}
              placeholder="e.g., whatsapp-campaign, facebook-ad, instagram"
              className="flex-1 h-12 px-4 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-300"
            />
            {customSource && (
              <button
                onClick={() => setCustomSource('')}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        
        {/* Form Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FORM_LINKS.map((form) => {
            const colors = getColor(form.color);
            const fullUrl = buildUrl(form);
            const isCopied = copiedUrl === fullUrl;
            
            return (
              <div key={form.type} className={`bg-white rounded-2xl border ${colors.border} overflow-hidden hover:shadow-lg transition-all`}>
                {/* Header */}
                <div className={`${colors.bg} p-6 border-b ${colors.border}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white shadow-lg`}>
                      {form.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{form.title}</h3>
                      <p className="text-sm text-slate-500">{form.description}</p>
                    </div>
                  </div>
                </div>
                
                {/* Options */}
                <div className="p-6 space-y-4">
                  {form.params?.map((param) => (
                    <div key={param.key}>
                      <label className="block text-sm font-bold text-slate-700 mb-2">{param.label}</label>
                      {param.options ? (
                        <select
                          value={selectedWorkshops[form.type] || ''}
                          onChange={(e) => setSelectedWorkshops({ ...selectedWorkshops, [form.type]: e.target.value })}
                          className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                        >
                          <option value="">-- Select (Optional) --</option>
                          {param.options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input type="text" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" />
                      )}
                    </div>
                  ))}
                  
                  {/* URL Display */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">Form URL:</p>
                    <p className="text-sm font-mono text-slate-700 break-all">{fullUrl}</p>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(fullUrl)}
                      className={`flex-1 h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                        isCopied
                          ? 'bg-green-500 text-white'
                          : `${colors.bg} ${colors.text} hover:opacity-80`
                      }`}
                    >
                      {isCopied ? <Check size={16} /> : <Copy size={16} />}
                      {isCopied ? 'Copied!' : 'Copy Link'}
                    </button>
                    <a
                      href={fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-11 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
                    >
                      <ExternalLink size={16} />
                    </a>
                    <button
                      onClick={() => shareUrl(fullUrl, form.title)}
                      className="h-11 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 transition-all"
                    >
                      <Share2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Quick Copy Section */}
        <div className="mt-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-2">📋 Quick Copy All Links</h2>
          <p className="text-white/80 mb-6">Copy all form links as formatted text for sharing</p>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm mb-6">
            <pre className="text-sm font-mono whitespace-pre-wrap">
{FORM_LINKS.map(form => `${form.title}:\nhttps://swaryoga.com${form.baseUrl}${customSource ? `?source=${customSource}` : ''}\n`).join('\n')}
            </pre>
          </div>
          <button
            onClick={() => {
              const allLinks = FORM_LINKS.map(form => 
                `${form.title}:\nhttps://swaryoga.com${form.baseUrl}${customSource ? `?source=${customSource}` : ''}`
              ).join('\n\n');
              navigator.clipboard.writeText(allLinks);
              setCopiedUrl('all');
              setTimeout(() => setCopiedUrl(null), 2000);
            }}
            className={`px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
              copiedUrl === 'all'
                ? 'bg-green-500 text-white'
                : 'bg-white text-indigo-600 hover:bg-white/90'
            }`}
          >
            {copiedUrl === 'all' ? <Check size={18} /> : <Copy size={18} />}
            {copiedUrl === 'all' ? 'All Links Copied!' : 'Copy All Links'}
          </button>
        </div>
        
        {/* Password Format Info */}
        <div className="mt-10 bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-amber-800 mb-3">🔐 Auto-Generated Password Format</h3>
          <p className="text-amber-700 mb-4">
            When users submit signup or workshop forms, they receive auto-generated credentials:
          </p>
          <div className="bg-white rounded-xl p-4 border border-amber-200">
            <p className="font-mono text-lg text-amber-800 mb-2">
              <span className="text-indigo-600">[4 letters of name]</span>
              <span className="text-green-600">[last 4 digits of phone]</span>
              <span className="text-purple-600">[2 symbols]</span>
            </p>
            <p className="text-sm text-amber-600">
              Example: Name "Mohan" + Phone "9309986820" = Password <strong className="text-amber-900">moha6820@#</strong>
            </p>
          </div>
          <p className="text-sm text-amber-600 mt-4">
            ✅ Credentials are automatically sent via WhatsApp and Email
          </p>
        </div>
      </div>
    </div>
  );
}
