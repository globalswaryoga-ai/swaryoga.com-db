'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, LogOut, Menu, X, Download, Eye } from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';

interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status?: string;
  isRead: boolean;
  createdAt: string;
}

export default function ContactMessages() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [replySubject, setReplySubject] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');

    if (!adminToken) {
      router.push('/admin/login');
    } else {
      setIsAuthenticated(true);
      fetchMessages();
    }
  }, [router]);

  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/contacts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      }).catch(() => null);

      if (response && response.ok) {
        const data = await response.json();
        setMessages(data);
      } else {
        setMessages([]);
      }
    } catch (err) {
      setError('Failed to fetch contact messages');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    router.push('/admin/login');
  };

  const handleExport = () => {
    const csv = [
      ['Name', 'Email', 'Subject', 'Message', 'Status', 'Date'].join(','),
      ...messages.map(msg =>
        [msg.name, msg.email, msg.subject, msg.message.replace(/,/g, ';'), msg.isRead ? 'Read' : 'Unread', new Date(msg.createdAt).toLocaleDateString()].join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contact_messages.csv';
    a.click();
  };

  const handleViewMessage = (msg: ContactMessage) => {
    setSelectedMessage(msg);
    setReplySubject(`Re: ${msg.subject}`);
    setReplyMessage('');
    setShowModal(true);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMessage || !replyMessage.trim()) return;

    setSubmitting(true);
    const adminToken = localStorage.getItem('adminToken');

    try {
      const response = await fetch('/api/admin/reply-contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          contactId: selectedMessage._id,
          userEmail: selectedMessage.email,
          subject: replySubject || `Re: ${selectedMessage.subject}`,
          reply: replyMessage,
        }),
      });

      if (response.ok) {
        alert('Reply sent successfully!');
        setReplyMessage('');
        setReplySubject('');
        setShowModal(false);
        setSelectedMessage(null);
        // Refresh messages
        fetchMessages();
      } else {
        const error = await response.json();
        alert('Failed to send reply: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Error sending reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    // Update in state
    setMessages(messages.map(msg => 
      msg._id === id ? { ...msg, isRead: true } : msg
    ));
    if (selectedMessage?._id === id) {
      setSelectedMessage({ ...selectedMessage, isRead: true });
    }
  };

  if (!isAuthenticated) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-swar-primary-light">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-lg bg-swar-primary-light hover:bg-swar-primary-light"
              >
                {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <h1 className="text-2xl font-bold text-swar-text flex items-center space-x-2">
                <MessageSquare className="h-8 w-8 text-orange-600" />
                <span>Contact Messages</span>
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={handleExport}
                className="p-2 rounded-lg bg-orange-100 text-orange-600 hover:bg-orange-200 transition-colors flex items-center space-x-2"
              >
                <Download className="h-5 w-5" />
                <span className="hidden sm:inline text-sm font-medium">Export CSV</span>
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
              >
                <LogOut className="h-6 w-6" />
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              {error}
            </div>
          ) : messages.length === 0 ? (
            <div className="bg-swar-bg border border-swar-border rounded-lg p-8 text-center">
              <MessageSquare className="h-12 w-12 text-swar-text-secondary mx-auto mb-4" />
              <p className="text-swar-text-secondary text-lg">No contact messages yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-swar-bg border-b border-swar-border">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-swar-text">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-swar-text">Name</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-swar-text">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-swar-text">Subject</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-swar-text">Date</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-swar-text">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.map((msg, index) => (
                      <tr key={msg._id} className={index % 2 === 0 ? 'bg-white' : 'bg-swar-bg'}>
                        <td className="px-6 py-4 text-sm">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            msg.isRead 
                              ? 'bg-swar-primary-light text-swar-text' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {msg.isRead ? 'Read' : 'Unread'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-swar-text font-medium">{msg.name}</td>
                        <td className="px-6 py-4 text-sm text-swar-text-secondary">{msg.email}</td>
                        <td className="px-6 py-4 text-sm text-swar-text-secondary">{msg.subject}</td>
                        <td className="px-6 py-4 text-sm text-swar-text-secondary">{new Date(msg.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => handleViewMessage(msg)}
                            className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Stats Footer */}
              <div className="bg-swar-bg border-t border-swar-border px-6 py-4 flex items-center justify-between">
                <p className="text-sm text-swar-text-secondary">
                  Total messages: <span className="font-semibold text-swar-text">{messages.length}</span>
                </p>
                <p className="text-sm text-swar-text-secondary">
                  Unread: <span className="font-semibold text-blue-800">{messages.filter(m => !m.isRead).length}</span>
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Message Modal */}
      {showModal && selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-swar-text">Message Details</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-swar-text-secondary hover:text-swar-text"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-swar-text-secondary">Status</label>
                  <p className={`mt-1 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    selectedMessage.isRead 
                      ? 'bg-swar-primary-light text-swar-text' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedMessage.isRead ? 'Read' : 'Unread'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-swar-text-secondary">Name</label>
                  <p className="mt-1 text-swar-text">{selectedMessage.name}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-swar-text-secondary">Email</label>
                  <p className="mt-1 text-swar-text">{selectedMessage.email}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-swar-text-secondary">Subject</label>
                  <p className="mt-1 text-swar-text">{selectedMessage.subject}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-swar-text-secondary">Message</label>
                  <p className="mt-1 text-swar-text whitespace-pre-wrap">{selectedMessage.message}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-swar-text-secondary">Date</label>
                  <p className="mt-1 text-swar-text">{new Date(selectedMessage.createdAt).toLocaleString()}</p>
                </div>
                {selectedMessage.phone && (
                  <div>
                    <label className="text-sm font-medium text-swar-text-secondary">Phone</label>
                    <p className="mt-1 text-swar-text">{selectedMessage.phone}</p>
                  </div>
                )}
              </div>

              {/* Reply Form */}
              <div className="mt-6 border-t pt-6">
                <h3 className="text-lg font-semibold text-swar-text mb-4">Send Reply</h3>
                <form onSubmit={handleSendReply} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={replySubject}
                      onChange={(e) => setReplySubject(e.target.value)}
                      className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Reply subject..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-2">
                      Your Reply Message
                    </label>
                    <textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={5}
                      placeholder="Type your reply message here..."
                      required
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 bg-swar-primary text-white px-4 py-2 rounded-lg hover:bg-swar-primary disabled:bg-gray-400 transition-colors font-medium"
                    >
                      {submitting ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="mt-6 flex space-x-3">
                {!selectedMessage.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(selectedMessage._id)}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Mark as Read
                  </button>
                )}
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-300 text-swar-text px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
