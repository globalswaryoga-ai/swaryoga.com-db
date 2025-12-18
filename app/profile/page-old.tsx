'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { LogOut, Mail, MessageSquare, ArrowLeft, User, Phone, MapPin, Briefcase, Shield, Calendar } from 'lucide-react';

interface Message {
  _id: string;
  senderName: string;
  senderEmail: string;
  senderRole: string;
  recipientEmail: string;
  subject: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  country?: string;
  state?: string;
  gender?: string;
  age?: number;
  profession?: string;
  countryCode?: string;
}

export default function UserProfile() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordMessage, setPasswordMessage] = useState('');
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (!token || !storedUser) {
      router.push('/signin?redirect=/profile');
      return;
    }

    try {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      fetchMessages(token);
    } catch (error) {
      console.error('Error loading profile:', error);
      router.push('/signin');
    }
  }, [router]);

  const fetchMessages = async (token: string) => {
    try {
      const response = await fetch('/api/messages', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage('Passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordMessage('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordMessage('Password changed successfully!');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowChangePassword(false);
        setTimeout(() => setPasswordMessage(''), 3000);
      } else {
        setPasswordMessage(data.error || 'Failed to change password');
      }
    } catch (error) {
      setPasswordMessage('Error changing password');
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedMessage) return;

    setSubmitting(true);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: `Re: ${selectedMessage.subject}`,
          message: replyText,
          recipientEmail: selectedMessage.senderEmail,
          contactId: null,
        }),
      });

      if (response.ok) {
        setReplyText('');
        setShowReplyForm(false);
        setSelectedMessage(null);
        if (token) {
          fetchMessages(token);
        }
      } else {
        alert('Failed to send reply');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Error sending reply');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full"></div>
          <p className="mt-4 text-swar-text-secondary">Loading your profile...</p>
        </div>
        <Footer />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Navigation />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-swar-text-secondary mb-4">Please log in to view your profile</p>
          <Link href="/signin" className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700">
            Sign In
          </Link>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 py-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium">
                <ArrowLeft size={20} />
                Back to Home
              </Link>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition font-medium"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {/* Profile Card */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary-600 to-secondary-600 rounded-full flex items-center justify-center text-white text-4xl font-bold mb-4">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <h2 className="text-2xl font-bold text-swar-text">{user.name}</h2>
                  <p className="text-primary-600 font-medium mt-1">{user.profession || 'Member'}</p>
                  <p className="text-sm text-swar-text-secondary mt-2 break-all">{user.email}</p>
                  
                  {/* Tabs */}
                  <div className="mt-8 flex flex-col gap-3">
                    <button
                      onClick={() => setActiveTab('profile')}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        activeTab === 'profile'
                          ? 'bg-primary-600 text-white'
                          : 'bg-swar-primary-light text-swar-text hover:bg-swar-primary-light'
                      }`}
                    >
                      <User size={18} className="inline mr-2" />
                      Profile Info
                    </button>
                    <button
                      onClick={() => setActiveTab('messages')}
                      className={`px-4 py-2 rounded-lg font-medium transition relative ${
                        activeTab === 'messages'
                          ? 'bg-primary-600 text-white'
                          : 'bg-swar-primary-light text-swar-text hover:bg-swar-primary-light'
                      }`}
                    >
                      <MessageSquare size={18} className="inline mr-2" />
                      Messages
                      {messages.length > 0 && (
                        <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                          {messages.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('security')}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        activeTab === 'security'
                          ? 'bg-primary-600 text-white'
                          : 'bg-swar-primary-light text-swar-text hover:bg-swar-primary-light'
                      }`}
                    >
                      <Shield size={18} className="inline mr-2" />
                      Security
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="md:col-span-3">
              {/* Profile Information Tab */}
              {activeTab === 'profile' && (
                <div className="bg-white rounded-lg shadow-lg p-8">
                  <h3 className="text-2xl font-bold text-swar-text mb-6 flex items-center gap-2">
                    <User size={24} className="text-primary-600" />
                    Profile Information
                  </h3>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* User ID */}
                    <div className="bg-swar-bg p-4 rounded-lg">
                      <label className="text-sm font-medium text-swar-text-secondary">User ID</label>
                      <p className="text-lg font-mono text-swar-text mt-2 break-all">{user.id}</p>
                    </div>

                    {/* Name */}
                    <div className="bg-swar-bg p-4 rounded-lg">
                      <label className="text-sm font-medium text-swar-text-secondary flex items-center gap-2">
                        <User size={16} /> Full Name
                      </label>
                      <p className="text-lg text-swar-text mt-2">{user.name}</p>
                    </div>

                    {/* Email */}
                    <div className="bg-swar-bg p-4 rounded-lg">
                      <label className="text-sm font-medium text-swar-text-secondary flex items-center gap-2">
                        <Mail size={16} /> Email Address
                      </label>
                      <p className="text-lg text-swar-text mt-2">{user.email}</p>
                    </div>

                    {/* Phone */}
                    <div className="bg-swar-bg p-4 rounded-lg">
                      <label className="text-sm font-medium text-swar-text-secondary flex items-center gap-2">
                        <Phone size={16} /> Phone Number
                      </label>
                      <p className="text-lg text-swar-text mt-2">
                        {user.countryCode} {user.phone || 'Not provided'}
                      </p>
                    </div>

                    {/* Country */}
                    <div className="bg-swar-bg p-4 rounded-lg">
                      <label className="text-sm font-medium text-swar-text-secondary flex items-center gap-2">
                        <MapPin size={16} /> Country
                      </label>
                      <p className="text-lg text-swar-text mt-2">{user.country || 'Not provided'}</p>
                    </div>

                    {/* State */}
                    <div className="bg-swar-bg p-4 rounded-lg">
                      <label className="text-sm font-medium text-swar-text-secondary flex items-center gap-2">
                        <MapPin size={16} /> State
                      </label>
                      <p className="text-lg text-swar-text mt-2">{user.state || 'Not provided'}</p>
                    </div>

                    {/* Gender */}
                    <div className="bg-swar-bg p-4 rounded-lg">
                      <label className="text-sm font-medium text-swar-text-secondary">Gender</label>
                      <p className="text-lg text-swar-text mt-2">{user.gender || 'Not provided'}</p>
                    </div>

                    {/* Age */}
                    <div className="bg-swar-bg p-4 rounded-lg">
                      <label className="text-sm font-medium text-swar-text-secondary flex items-center gap-2">
                        <Calendar size={16} /> Age
                      </label>
                      <p className="text-lg text-swar-text mt-2">{user.age ? `${user.age} years` : 'Not provided'}</p>
                    </div>

                    {/* Profession */}
                    <div className="bg-swar-bg p-4 rounded-lg md:col-span-2">
                      <label className="text-sm font-medium text-swar-text-secondary flex items-center gap-2">
                        <Briefcase size={16} /> Profession
                      </label>
                      <p className="text-lg text-swar-text mt-2">{user.profession || 'Not provided'}</p>
                    </div>
                  </div>

                  {/* Offers Section */}
                  <div className="mt-8 pt-8 border-t">
                    <h4 className="text-xl font-bold text-swar-text mb-4">Special Offers & Benefits</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-lg border border-yellow-200">
                        <h5 className="font-bold text-yellow-900 mb-2">🎉 Welcome Bonus</h5>
                        <p className="text-yellow-800">Get 20% off on your first class purchase</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
                        <h5 className="font-bold text-swar-text mb-2">🏆 Member Rewards</h5>
                        <p className="text-swar-primary">Earn points with every purchase</p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-lg border border-blue-200">
                        <h5 className="font-bold text-blue-900 mb-2">📚 Free Resources</h5>
                        <p className="text-blue-800">Access exclusive yoga guides and tips</p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-200">
                        <h5 className="font-bold text-purple-900 mb-2">👥 Community Access</h5>
                        <p className="text-purple-800">Join our exclusive member community</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages Tab */}
              {activeTab === 'messages' && (
                <div className="bg-white rounded-lg shadow-lg p-8">
                  <h3 className="text-2xl font-bold text-swar-text mb-6 flex items-center gap-2">
                    <MessageSquare size={24} className="text-primary-600" />
                    Messages from Admin ({messages.length})
                  </h3>

                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
                      <p className="text-swar-text-secondary text-lg">No messages yet</p>
                      <p className="text-swar-text-secondary text-sm mt-2">You'll see messages from the admin here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => (
                        <div key={msg._id} className="border border-swar-border rounded-lg p-6 hover:shadow-md transition">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h5 className="font-bold text-swar-text">{msg.subject}</h5>
                              <p className="text-sm text-swar-text-secondary">From: {msg.senderName} ({msg.senderRole})</p>
                            </div>
                            <span className="text-xs bg-primary-100 text-primary-700 px-3 py-1 rounded-full">
                              {new Date(msg.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-swar-text mb-4">{msg.message}</p>
                          <button
                            onClick={() => {
                              setSelectedMessage(msg);
                              setShowReplyForm(true);
                            }}
                            className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                          >
                            Reply →
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Form */}
                  {showReplyForm && selectedMessage && (
                    <div className="mt-8 pt-8 border-t">
                      <h4 className="text-lg font-bold text-swar-text mb-4">Reply to: {selectedMessage.subject}</h4>
                      <form onSubmit={handleReply} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-swar-text mb-2">Your Reply</label>
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Type your reply here..."
                            className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                            rows={5}
                            required
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            type="submit"
                            disabled={submitting}
                            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
                          >
                            {submitting ? 'Sending...' : 'Send Reply'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowReplyForm(false);
                              setSelectedMessage(null);
                              setReplyText('');
                            }}
                            className="bg-gray-300 text-swar-text px-6 py-2 rounded-lg hover:bg-gray-400 font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="bg-white rounded-lg shadow-lg p-8">
                  <h3 className="text-2xl font-bold text-swar-text mb-6 flex items-center gap-2">
                    <Shield size={24} className="text-primary-600" />
                    Security Settings
                  </h3>

                  {!showChangePassword ? (
                    <button
                      onClick={() => setShowChangePassword(true)}
                      className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium transition"
                    >
                      Change Password
                    </button>
                  ) : (
                    <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-swar-text mb-2">Current Password</label>
                        <input
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                          placeholder="Enter current password"
                          className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-swar-text mb-2">New Password</label>
                        <input
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          placeholder="Enter new password (min 6 characters)"
                          className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-swar-text mb-2">Confirm Password</label>
                        <input
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                          placeholder="Confirm new password"
                          className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                          required
                        />
                      </div>

                      {passwordMessage && (
                        <div className={`p-4 rounded-lg text-sm font-medium ${
                          passwordMessage.includes('successfully')
                            ? 'bg-swar-primary-light text-swar-primary'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {passwordMessage}
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
                        >
                          {submitting ? 'Updating...' : 'Update Password'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowChangePassword(false);
                            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                            setPasswordMessage('');
                          }}
                          className="bg-gray-300 text-swar-text px-6 py-2 rounded-lg hover:bg-gray-400 font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
