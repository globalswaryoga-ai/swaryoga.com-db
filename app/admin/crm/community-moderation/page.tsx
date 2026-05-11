'use client';
import { getLoginPath } from '@/hooks/useAuth';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type TabType = 'experiences' | 'questions' | 'tips' | 'transformations';

interface PendingItem {
  _id: string;
  userName: string;
  createdAt: string;
  status: string;
  // Experience fields
  content?: string;
  rating?: number;
  // Question fields
  question?: string;
  answer?: string;
  category?: string;
  // Tip fields
  issue?: string;
  tip?: string;
  // Transformation fields
  title?: string;
  story?: string;
  beforePhoto?: string;
  afterPhoto?: string;
  duration?: string;
  healthCondition?: string;
  yogaPractice?: string;
}

const tabs: { id: TabType; label: string; icon: string }[] = [
  { id: 'experiences', label: 'Experiences', icon: '⭐' },
  { id: 'questions', label: 'Questions', icon: '❓' },
  { id: 'tips', label: 'Tips', icon: '💡' },
  { id: 'transformations', label: 'Transformations', icon: '🦋' },
];

export default function CommunityModerationPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('experiences');
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCounts, setPendingCounts] = useState<Record<TabType, number>>({
    experiences: 0,
    questions: 0,
    tips: 0,
    transformations: 0,
  });
  const [selectedItem, setSelectedItem] = useState<PendingItem | null>(null);
  const [responseText, setResponseText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    checkAuth();
    fetchAllCounts();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push(getLoginPath());
      return;
    }
    try {
      const res = await fetch('/api/auth/profile', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        router.push(getLoginPath());
      }
    } catch {
      router.push(getLoginPath());
    }
  }

  async function fetchAllCounts() {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      const [exp, q, t, trans] = await Promise.all([
        fetch('/api/community/experiences?status=pending', { headers }).then(r => r.json()),
        fetch('/api/community/questions?status=pending', { headers }).then(r => r.json()),
        fetch('/api/community/tips?status=pending', { headers }).then(r => r.json()),
        fetch('/api/community/transformations?status=pending', { headers }).then(r => r.json()),
      ]);

      setPendingCounts({
        experiences: exp.pendingCount || 0,
        questions: q.pendingCount || 0,
        tips: t.pendingCount || 0,
        transformations: trans.pendingCount || 0,
      });
    } catch (error) {
      console.error('Failed to fetch counts:', error);
    }
  }

  async function fetchItems() {
    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`/api/community/${activeTab}?status=pending`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      
      if (data.success) {
        const itemsKey = activeTab === 'experiences' ? 'experiences' : 
                        activeTab === 'questions' ? 'questions' :
                        activeTab === 'tips' ? 'tips' : 'transformations';
        setItems(data[itemsKey] || []);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(action: 'approve' | 'reject' | 'answer') {
    if (!selectedItem) return;
    
    setProcessing(true);
    setMessage(null);
    const token = localStorage.getItem('token');

    try {
      let body: any = {};
      let endpoint = `/api/community/${activeTab}`;

      switch (activeTab) {
        case 'experiences':
          body = { experienceId: selectedItem._id, action };
          break;
        case 'questions':
          body = { questionId: selectedItem._id, action: action === 'approve' ? undefined : action };
          if (action === 'approve' && responseText) {
            body.answer = responseText;
          }
          break;
        case 'tips':
          body = { tipId: selectedItem._id, action: action === 'approve' ? undefined : action };
          if (action === 'approve' && responseText) {
            body.tip = responseText;
          }
          break;
        case 'transformations':
          body = { transformationId: selectedItem._id, action };
          break;
      }

      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: data.message || 'Action completed!' });
        setSelectedItem(null);
        setResponseText('');
        fetchItems();
        fetchAllCounts();
      } else {
        setMessage({ type: 'error', text: data.error || 'Action failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to process action' });
    } finally {
      setProcessing(false);
    }
  }

  const totalPending = Object.values(pendingCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📬 Community Moderation</h1>
              <p className="text-gray-500 text-sm mt-1">
                {totalPending} pending submissions awaiting review
              </p>
            </div>
            <button
              onClick={() => router.push('/admin/crm')}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              ← Back to CRM
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              {tab.icon} {tab.label}
              {pendingCounts[tab.id] > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-white/20' : 'bg-amber-100 text-amber-700'
                }`}>
                  {pendingCounts[tab.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message.text}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Items List */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-900">
                Pending {tabs.find(t => t.id === activeTab)?.label}
              </h2>
            </div>
            
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin text-3xl">🌀</div>
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-2">✅</div>
                <p>All caught up! No pending items.</p>
              </div>
            ) : (
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {items.map((item) => (
                  <div
                    key={item._id}
                    onClick={() => {
                      setSelectedItem(item);
                      setResponseText('');
                    }}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedItem?._id === item._id ? 'bg-emerald-50 border-l-4 border-emerald-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{item.userName}</div>
                        <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                          {activeTab === 'experiences' && item.content}
                          {activeTab === 'questions' && item.question}
                          {activeTab === 'tips' && item.issue}
                          {activeTab === 'transformations' && item.title}
                        </p>
                      </div>
                      <div className="text-xs text-gray-400 ml-2">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          <div className="bg-white rounded-xl border overflow-hidden">
            {selectedItem ? (
              <>
                <div className="p-4 border-b bg-gray-50">
                  <h2 className="font-semibold text-gray-900">Review Submission</h2>
                </div>
                <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                  <div>
                    <div className="text-sm text-gray-500">Submitted by</div>
                    <div className="font-medium text-gray-900">{selectedItem.userName}</div>
                  </div>

                  {/* Experience Details */}
                  {activeTab === 'experiences' && (
                    <>
                      <div>
                        <div className="text-sm text-gray-500">Rating</div>
                        <div className="text-xl">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star}>{star <= (selectedItem.rating || 0) ? '⭐' : '☆'}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Experience</div>
                        <p className="text-gray-700 whitespace-pre-wrap">{selectedItem.content}</p>
                      </div>
                    </>
                  )}

                  {/* Question Details */}
                  {activeTab === 'questions' && (
                    <>
                      <div>
                        <div className="text-sm text-gray-500">Category</div>
                        <span className="bg-indigo-100 text-indigo-700 text-sm px-2 py-1 rounded">
                          {selectedItem.category}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Question</div>
                        <p className="text-gray-700 whitespace-pre-wrap">{selectedItem.question}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Your Answer</label>
                        <textarea
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                          rows={4}
                          placeholder="Provide your expert answer..."
                        />
                      </div>
                    </>
                  )}

                  {/* Tip Details */}
                  {activeTab === 'tips' && (
                    <>
                      <div>
                        <div className="text-sm text-gray-500">Category</div>
                        <span className="bg-purple-100 text-purple-700 text-sm px-2 py-1 rounded">
                          {selectedItem.category}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Issue Described</div>
                        <p className="text-gray-700 whitespace-pre-wrap">{selectedItem.issue}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Your Tip</label>
                        <textarea
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                          rows={4}
                          placeholder="Provide helpful tips for this issue..."
                        />
                      </div>
                    </>
                  )}

                  {/* Transformation Details */}
                  {activeTab === 'transformations' && (
                    <>
                      <div>
                        <div className="text-sm text-gray-500">Title</div>
                        <p className="font-medium text-gray-900">{selectedItem.title}</p>
                      </div>
                      {selectedItem.duration && (
                        <div className="flex gap-4">
                          {selectedItem.duration && (
                            <span className="bg-indigo-50 text-indigo-700 text-sm px-2 py-1 rounded">
                              ⏱️ {selectedItem.duration}
                            </span>
                          )}
                          {selectedItem.healthCondition && (
                            <span className="bg-red-50 text-red-700 text-sm px-2 py-1 rounded">
                              ❤️ {selectedItem.healthCondition}
                            </span>
                          )}
                          {selectedItem.yogaPractice && (
                            <span className="bg-green-50 text-green-700 text-sm px-2 py-1 rounded">
                              🧘 {selectedItem.yogaPractice}
                            </span>
                          )}
                        </div>
                      )}
                      <div>
                        <div className="text-sm text-gray-500">Story</div>
                        <p className="text-gray-700 whitespace-pre-wrap">{selectedItem.story}</p>
                      </div>
                      {(selectedItem.beforePhoto || selectedItem.afterPhoto) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {selectedItem.beforePhoto && (
                            <div>
                              <div className="text-sm text-gray-500 mb-1">Before</div>
                              <img src={selectedItem.beforePhoto} alt="Before" className="rounded-lg w-full h-32 object-cover" />
                            </div>
                          )}
                          {selectedItem.afterPhoto && (
                            <div>
                              <div className="text-sm text-gray-500 mb-1">After</div>
                              <img src={selectedItem.afterPhoto} alt="After" className="rounded-lg w-full h-32 object-cover" />
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={() => handleAction('reject')}
                      disabled={processing}
                      className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 disabled:opacity-50"
                    >
                      ❌ Reject
                    </button>
                    <button
                      onClick={() => handleAction('approve')}
                      disabled={processing || (
                        (activeTab === 'questions' || activeTab === 'tips') && !responseText.trim()
                      )}
                      className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {processing ? '...' : activeTab === 'questions' || activeTab === 'tips' ? '✅ Approve & Respond' : '✅ Approve'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-2">👈</div>
                <p>Select an item to review</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
