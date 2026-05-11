'use client';

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Send, BarChart3, Eye } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  content: string;
  qrCode: string;
  createdAt: string;
  sent: number;
  views: number;
  clicks: number;
}

export default function QRBroadcastPage() {
  const [tab, setTab] = useState<'templates' | 'send' | 'reports'>('templates');
  const [templates, setTemplates] = useState<Template[]>([
    {
      id: '1',
      name: 'Product Launch',
      content: 'Check out our new product!',
      qrCode: 'QR123',
      createdAt: '2024-04-20',
      sent: 1240,
      views: 856,
      clicks: 234,
    },
    {
      id: '2',
      name: 'Flash Sale',
      content: '50% off today only!',
      qrCode: 'QR124',
      createdAt: '2024-04-19',
      sent: 2100,
      views: 1654,
      clicks: 512,
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', content: '' });

  const handleCreateTemplate = () => {
    if (formData.name && formData.content) {
      setTemplates([
        ...templates,
        {
          id: Date.now().toString(),
          name: formData.name,
          content: formData.content,
          qrCode: 'QR' + Math.random().toString(36).substr(2, 9),
          createdAt: new Date().toISOString().split('T')[0],
          sent: 0,
          views: 0,
          clicks: 0,
        },
      ]);
      setFormData({ name: '', content: '' });
      setShowModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">QR Broadcast & Templates</h1>
          <p className="text-gray-600">Create, send, and track QR code broadcasts</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setTab('templates')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              tab === 'templates'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setTab('send')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              tab === 'send'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
            }`}
          >
            Send Broadcast
          </button>
          <button
            onClick={() => setTab('reports')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              tab === 'reports'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
            }`}
          >
            Reports
          </button>
        </div>

        {/* Templates Tab */}
        {tab === 'templates' && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus className="w-5 h-5" />
                New Template
              </button>
            </div>

            <div className="grid gap-4">
              {templates.map((template) => (
                <div key={template.id} className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{template.name}</h3>
                      <p className="text-gray-600 text-sm mt-1">{template.content}</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button className="p-2 hover:bg-red-100 rounded-lg text-red-600">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Created</p>
                      <p className="font-medium text-gray-900">{template.createdAt}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Sent</p>
                      <p className="font-medium text-gray-900">{template.sent}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Views</p>
                      <p className="font-medium text-gray-900">{template.views}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Clicks</p>
                      <p className="font-medium text-gray-900">{template.clicks}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Create Template Modal */}
            {showModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Template</h2>
                  <input
                    type="text"
                    placeholder="Template name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <textarea
                    placeholder="Message content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 h-24 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateTemplate}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                    >
                      Create
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Send Broadcast Tab */}
        {tab === 'send' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Send QR Broadcast</h2>
            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Template</label>
                <select className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600">
                  <option>Choose a template</option>
                  {templates.map((t) => (
                    <option key={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Recipients</label>
                <select className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600">
                  <option>All contacts</option>
                  <option>Leads only</option>
                  <option>Customers only</option>
                  <option>Custom group</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Schedule</label>
                <select className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600">
                  <option>Send now</option>
                  <option>Schedule for later</option>
                </select>
              </div>
              <button className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                <Send className="w-5 h-5" />
                Send Broadcast
              </button>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {tab === 'reports' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-gray-600 text-sm mb-2">Total Sent</p>
                <p className="text-3xl font-bold text-gray-900">3,340</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-gray-600 text-sm mb-2">Total Views</p>
                <p className="text-3xl font-bold text-blue-600">2,510</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-gray-600 text-sm mb-2">Total Clicks</p>
                <p className="text-3xl font-bold text-green-600">746</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-gray-600 text-sm mb-2">Click Rate</p>
                <p className="text-3xl font-bold text-purple-600">22.3%</p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Broadcast Reports</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Template</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sent</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Views</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Clicks</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {templates.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{t.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{t.sent}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{t.views}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{t.clicks}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {((t.clicks / t.views) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
