'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import ChatList from '@/components/ChatList';
import ChatWindow from '@/components/ChatWindow';
import LabelManager from '@/components/LabelManager';
import FunnelTracker from '@/components/FunnelTracker';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import TrialModal from '@/components/TrialModal';
import { useTrialCheck } from '@/hooks/useTrialCheck';
import { useAuth } from '@/hooks/useAuth';

interface TabType {
  id: string;
  label: string;
  icon: string;
}

export default function CRMDashboard() {
  const token = useAuth();
  const { trialStatus, loading: trialLoading } = useTrialCheck(token);
  const [selectedConversation, setSelectedConversation] = useState<string>('1');
  const [activeTab, setActiveTab] = useState<string>('conversations');
  const [filterLabel, setFilterLabel] = useState<string>('');
  const [showTrial, setShowTrial] = useState(true);

  const tabs: TabType[] = [
    { id: 'conversations', label: 'Conversations', icon: '💬' },
    { id: 'funnel', label: 'Sales Funnel', icon: '📈' },
    { id: 'labels', label: 'Labels', icon: '🏷️' },
  ];

  const crmStats = {
    totalConversations: 28,
    unreadMessages: 5,
    leads: 8,
    prospects: 6,
    customers: 14,
    monthlyRevenue: 5430.25,
  };

  function handleConversationSelect(conversationId: string) {
    setSelectedConversation(conversationId);
  }

  function handleAddLabel(conversationId: string, label: string) {
    console.log(`Added label "${label}" to conversation ${conversationId}`);
  }

  function handleMoveStage(opportunityId: string, newStage: string) {
    console.log(`Moved ${opportunityId} to ${newStage}`);
  }

  function handleAddNote(opportunityId: string, note: string) {
    console.log(`Added note to ${opportunityId}: ${note}`);
  }

  const handleTrialAction = async (action: string) => {
    const popup = trialStatus?.popup;
    if (!popup) return;

    if (popup.type === 'storage-payment' && action === 'pay') {
      // Redirect to payment gateway (Razorpay integration would go here)
      console.log('Initiating ₹50 storage payment...');
      // For now, show a message
      alert('Payment integration coming soon. For testing, mark as paid in your dashboard.');
      setShowTrial(false);
    } else if (popup.type === 'upgrade-offer') {
      if (action === 'upgrade') {
        // Redirect to pricing/upgrade page
        window.location.href = '/crm-site/pricing';
      } else if (action === 'demo') {
        // Open demo booking modal or redirect
        alert('Demo booking form coming soon.');
        setShowTrial(false);
      }
    } else if (popup.type === 'trial-expired' && action === 'upgrade') {
      // Redirect to pricing
      window.location.href = '/crm-site/pricing';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Trial Modal */}
      {showTrial && trialStatus?.popup && (
        <TrialModal
          popup={trialStatus.popup}
          onClose={() => setShowTrial(false)}
          onAction={handleTrialAction}
          isLoading={trialLoading}
        />
      )}

      {/* Trial Banner */}
      {trialStatus?.hasActiveTrial && !trialStatus?.popup && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <span className="text-2xl">🎉</span>
              <div className="flex-1">
                <p className="font-semibold text-indigo-900 text-sm">
                  Free Trial Active • {trialStatus.trial?.daysRemaining} days remaining
                </p>
                <p className="text-xs text-indigo-700">
                  Day {trialStatus.trial?.daysSinceStart} of 15 • Connected: {trialStatus.trial?.qrWhatsAppNumber || 'N/A'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/crm/profile"
                className="px-3 py-2 text-sm font-medium bg-white text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors border border-indigo-200"
              >
                View Plan
              </Link>
              <button
                onClick={() => setShowTrial(false)}
                className="text-indigo-400 hover:text-indigo-600 text-lg"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      <Navigation />

      <div className="flex-1 container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">WhatsApp CRM Dashboard</h1>
          <p className="text-gray-600">Manage conversations, track leads, and organize your sales pipeline</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-yoga-600">
            <p className="text-sm text-gray-600">Total Conversations</p>
            <p className="text-2xl font-bold text-gray-900">{crmStats.totalConversations}</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-500">
            <p className="text-sm text-gray-600">Unread Messages</p>
            <p className="text-2xl font-bold text-red-600">{crmStats.unreadMessages}</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
            <p className="text-sm text-gray-600">🎯 Leads</p>
            <p className="text-2xl font-bold text-blue-600">{crmStats.leads}</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-yellow-500">
            <p className="text-sm text-gray-600">💼 Prospects</p>
            <p className="text-2xl font-bold text-yellow-600">{crmStats.prospects}</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
            <p className="text-sm text-gray-600">✅ Customers</p>
            <p className="text-2xl font-bold text-green-600">{crmStats.customers}</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-yoga-400">
            <p className="text-sm text-gray-600">Monthly Revenue</p>
            <p className="text-2xl font-bold text-yoga-600">${crmStats.monthlyRevenue.toFixed(0)}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-semibold transition-all ${
                activeTab === tab.id
                  ? 'text-yoga-600 border-b-2 border-yoga-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Conversations Tab */}
          {activeTab === 'conversations' && (
            <>
              {/* Chat List Sidebar */}
              <div className="lg:col-span-1 bg-white rounded-lg shadow-sm p-4 max-h-[600px] overflow-y-auto">
                <ChatList
                  selectedId={selectedConversation}
                  onSelect={handleConversationSelect}
                  onAddLabel={handleAddLabel}
                  filterLabel={filterLabel}
                />
              </div>

              {/* Chat Window */}
              <div className="lg:col-span-3 bg-white rounded-lg shadow-sm overflow-hidden h-[600px] flex flex-col">
                <ChatWindow
                  contactName="Priya Singh"
                  contactPhone="+91 98765 43210"
                  status="lead"
                  onSendMessage={(msg) => console.log('Message sent:', msg)}
                  onStatusChange={(status) => console.log('Status changed:', status)}
                />
              </div>
            </>
          )}

          {/* Sales Funnel Tab */}
          {activeTab === 'funnel' && (
            <div className="lg:col-span-4 bg-white rounded-lg shadow-sm p-4 h-[600px] overflow-y-auto">
              <FunnelTracker
                onMoveStage={handleMoveStage}
                onAddNote={handleAddNote}
              />
            </div>
          )}

          {/* Labels Tab */}
          {activeTab === 'labels' && (
            <div className="lg:col-span-1 bg-white rounded-lg shadow-sm p-4">
              <LabelManager
                conversationId={selectedConversation}
                onLabelAdd={handleAddLabel}
              />
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-6 bg-gradient-to-r from-yoga-50 to-yoga-100 p-4 rounded-lg border border-yoga-200">
          <h3 className="font-bold text-gray-900 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button className="px-4 py-2 bg-yoga-600 hover:bg-yoga-700 text-white rounded-lg font-semibold text-sm">
              📧 Send Template
            </button>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm">
              🎯 Create Follow-up
            </button>
            <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm">
              ✅ Mark as Customer
            </button>
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm">
              📊 Export Report
            </button>
          </div>
        </div>

        {/* CRM Tips */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-bold text-blue-900 mb-2">💡 Tip: Use Templates</h4>
            <p className="text-sm text-blue-800">
              Save time by using message templates for common inquiries. Customize with customer details.
            </p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-bold text-green-900 mb-2">🏷️ Organize with Labels</h4>
            <p className="text-sm text-green-800">
              Create custom labels to segment conversations and filter by customer type or interest.
            </p>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <h4 className="font-bold text-purple-900 mb-2">📈 Track Your Pipeline</h4>
            <p className="text-sm text-purple-800">
              Drag opportunities between stages to track deals and forecast monthly revenue accurately.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
