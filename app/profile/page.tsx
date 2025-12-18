'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import UserOffersDisplay from '@/components/UserOffersDisplay';
import { LogOut, Mail, MessageSquare, ArrowLeft, User, Phone, MapPin, Briefcase, Shield, Calendar, Upload, ShoppingCart, CreditCard } from 'lucide-react';
import { getCurrencySymbol, roundMoney, type CurrencyCode } from '@/lib/paymentMath';

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

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  _id: string;
  items: OrderItem[];
  total: number;
  currency?: string;
  status: string;
  shippingAddress?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface UserData {
  id: string;
  profileId?: string;
  name: string;
  email: string;
  phone?: string;
  country?: string;
  state?: string;
  gender?: string;
  age?: number;
  profession?: string;
  countryCode?: string;
  profileImage?: string;
}

export default function UserProfile() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordMessage, setPasswordMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [chatSubject, setChatSubject] = useState('Support Chat');
  const [chatMessage, setChatMessage] = useState('');
  const [chatStatus, setChatStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sendingChat, setSendingChat] = useState(false);

  // Fetch fresh user data and related info
  const fetchUserData = async (token: string) => {
    if (!token) {
      console.warn('No token available for fetchUserData');
      return;
    }
    try {
      const response = await fetch('/api/user/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data);
        if (data.profileImage) {
          setProfileImagePreview(data.profileImage);
        }
      } else if (response.status === 404) {
        // API doesn't exist yet, use stored user
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          if (userData.profileImage) {
            setProfileImagePreview(userData.profileImage);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Fallback to stored user
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        if (userData.profileImage) {
          setProfileImagePreview(userData.profileImage);
        }
      }
    }
  };

  const fetchMessages = async (token: string) => {
    if (!token) {
      console.warn('No token available for fetchMessages');
      return;
    }
    try {
      const response = await fetch('/api/messages?limit=200&page=1', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const payload = await response.json();
        // API already filters to this user; keep a legacy fallback just in case.
        const data = Array.isArray(payload) ? payload : payload?.data;

        const userEmail = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).email : '';
        const filteredMessages = Array.isArray(data)
          ? data.filter((msg) => msg.recipientEmail === userEmail || msg.senderEmail === userEmail)
          : [];

        setMessages(filteredMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchOrders = async (token: string) => {
    if (!token) {
      console.warn('No token available for fetchOrders');
      return;
    }
    try {
      const response = await fetch('/api/orders', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

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
      
      // Fetch all fresh data
      fetchUserData(token);
      fetchMessages(token);
      fetchOrders(token);
    } catch (error) {
      console.error('Error loading profile:', error);
      router.push('/signin');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    
    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Image = event.target?.result as string;
        setProfileImagePreview(base64Image);

        // Send to API to update profile
        const token = localStorage.getItem('token');
        const response = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            profileImage: base64Image,
          }),
        });

        if (response.ok) {
          const updatedUser = await response.json();
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
          alert('Profile image updated successfully!');
        } else {
          alert('Failed to update profile image');
          setProfileImagePreview(user?.profileImage || null);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image');
    } finally {
      setUploadingImage(false);
    }
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

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!chatMessage.trim()) {
      setChatStatus({ type: 'error', text: 'Please type a message before sending.' });
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setChatStatus({ type: 'error', text: 'You must be signed in to chat with us.' });
      return;
    }

    setSubmitting(true);
    setSendingChat(true);
    setChatStatus(null);

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: chatSubject || 'Support Chat',
          message: chatMessage.trim(),
          recipientEmail: 'admin@swaryoga.com',
          contactId: null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setChatMessage('');
      setChatStatus({ type: 'success', text: 'Message sent to our support team.' });
      if (token) {
        await fetchMessages(token);
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
      setChatStatus({ type: 'error', text: 'Unable to send your message right now. Please try again.' });
    } finally {
      setSubmitting(false);
      setSendingChat(false);
    }
  };

  const sortedMessages = useMemo(() => {
    return [...messages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [messages]);

  useEffect(() => {
    if (sortedMessages.length) {
      const subject = sortedMessages[sortedMessages.length - 1].subject || 'Support Chat';
      setChatSubject(subject);
    }
  }, [sortedMessages]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [sortedMessages]);

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-swar-primary border-t-transparent rounded-full"></div>
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
          <Link href="/signin" className="inline-block bg-swar-primary text-white px-6 py-2 rounded-lg hover:bg-swar-primary-hover">
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
              <Link href="/" className="flex items-center gap-2 text-swar-primary hover:text-swar-primary-hover font-medium">
                <ArrowLeft size={20} />
                Back to Home
              </Link>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-swar-accent text-white px-4 py-2 rounded-lg hover:bg-swar-accent-hover transition font-medium"
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
                  {/* Profile Image */}
                  <div className="relative mb-4">
                    {profileImagePreview ? (
                      <img 
                        src={profileImagePreview} 
                        alt={user.name}
                        className="w-24 h-24 mx-auto rounded-full object-cover border-4 border-swar-primary"
                      />
                    ) : (
                      <div className="w-24 h-24 mx-auto bg-gradient-to-br from-swar-primary to-swar-accent rounded-full flex items-center justify-center text-white text-4xl font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="absolute bottom-0 right-0 bg-swar-primary text-white p-2 rounded-full hover:bg-swar-primary-hover disabled:opacity-50"
                      title="Upload profile image"
                    >
                      <Upload size={16} />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>

                  <h2 className="text-2xl font-bold text-swar-text">{user.name}</h2>
                  <p className="text-swar-primary font-medium mt-1">ID: {user.profileId || user.id?.slice(-6) || 'N/A'}</p>
                  <p className="text-sm text-swar-text-secondary mt-1">{user.profession || 'Member'}</p>
                  <p className="text-xs text-swar-text-secondary mt-2 break-all">{user.email}</p>
                  
                  {/* Tabs */}
                  <div className="mt-8 flex flex-col gap-3">
                    <button
                      onClick={() => setActiveTab('profile')}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        activeTab === 'profile'
                          ? 'bg-swar-primary text-white'
                          : 'bg-swar-primary-light text-swar-text hover:bg-swar-primary-light'
                      }`}
                    >
                      <User size={18} className="inline mr-2" />
                      Profile Info
                    </button>
                    <button
                      onClick={() => setActiveTab('orders')}
                      className={`px-4 py-2 rounded-lg font-medium transition relative ${
                        activeTab === 'orders'
                          ? 'bg-swar-primary text-white'
                          : 'bg-swar-primary-light text-swar-text hover:bg-swar-primary-light'
                      }`}
                    >
                      <ShoppingCart size={18} className="inline mr-2" />
                      Orders
                      {orders.length > 0 && (
                        <span className="ml-2 px-2 py-1 bg-swar-primary text-white text-xs rounded-full">
                          {orders.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('messages')}
                      className={`px-4 py-2 rounded-lg font-medium transition relative ${
                        activeTab === 'messages'
                          ? 'bg-swar-primary text-white'
                          : 'bg-swar-primary-light text-swar-text hover:bg-swar-primary-light'
                      }`}
                    >
                      <MessageSquare size={18} className="inline mr-2" />
                      Messages
                      {messages.length > 0 && (
                        <span className="ml-2 px-2 py-1 bg-swar-accent text-white text-xs rounded-full">
                          {messages.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('security')}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        activeTab === 'security'
                          ? 'bg-swar-primary text-white'
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
                    <User size={24} className="text-swar-primary" />
                    Profile Information
                  </h3>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Profile ID */}
                    <div className="bg-swar-bg p-4 rounded-lg">
                      <label className="text-sm font-medium text-swar-text-secondary">Profile ID</label>
                      <p className="text-lg font-mono font-bold text-swar-primary mt-2">{user.profileId || user.id?.slice(-6) || 'N/A'}</p>
                      <p className="text-xs text-swar-text-secondary mt-1">6-digit unique identifier</p>
                    </div>

                    {/* User ID */}
                    <div className="bg-swar-bg p-4 rounded-lg">
                      <label className="text-sm font-medium text-swar-text-secondary">User ID</label>
                      <p className="text-sm font-mono text-swar-text mt-2 break-all">{user.id}</p>
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
                    <UserOffersDisplay />
                  </div>
                </div>
              )}

              {/* Orders & Payments Tab */}
              {activeTab === 'orders' && (
                <div className="bg-white rounded-lg shadow-lg p-8">
                  <h3 className="text-2xl font-bold text-swar-text mb-6 flex items-center gap-2">
                    <ShoppingCart size={24} className="text-swar-primary" />
                    Your Orders & Purchases ({orders.length})
                  </h3>

                  {orders.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingCart size={48} className="mx-auto text-gray-300 mb-4" />
                      <p className="text-swar-text-secondary text-lg">No orders yet</p>
                      <p className="text-swar-text-secondary text-sm mt-2">Start shopping to see your orders here</p>
                      <Link href="/checkout" className="inline-block mt-4 bg-swar-primary text-white px-6 py-2 rounded-lg hover:bg-swar-primary-hover">
                        Continue Shopping
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {orders.map((order) => (
                        <div key={order._id} className="border border-swar-border rounded-lg p-6 hover:shadow-md transition">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-bold text-swar-text">Order #{order._id.slice(-8)}</h4>
                              <p className="text-sm text-swar-text-secondary">
                                Placed on {new Date(order.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              order.status === 'completed' ? 'bg-swar-primary-light text-swar-primary' :
                              order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                          </div>

                          {/* Items */}
                          <div className="mb-4 pb-4 border-b">
                            <h5 className="font-semibold text-swar-text mb-3">Items Purchased:</h5>
                            <div className="space-y-2">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                  <span className="text-swar-text">
                                    {item.name} <span className="text-swar-text-secondary">x{item.quantity}</span>
                                  </span>
                                  <span className="font-medium text-swar-text">
                                    {getCurrencySymbol((order.currency as CurrencyCode) || 'INR')}
                                    {roundMoney(item.price * item.quantity).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Payment Details */}
                          <div className="bg-swar-bg p-4 rounded-lg mb-4">
                            <div className="flex items-center gap-2 mb-3">
                              <CreditCard size={18} className="text-primary-600" />
                              <h5 className="font-semibold text-swar-text">Payment Details</h5>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-swar-text-secondary">Amount Paid:</span>
                                <span className="text-swar-text">
                                  {getCurrencySymbol((order.currency as CurrencyCode) || 'INR')}
                                  {roundMoney(order.total).toFixed(2)}
                                </span>
                              </div>
                              <div className="border-t pt-2 flex justify-between font-bold">
                                <span className="text-swar-text">Total:</span>
                                <span className="text-primary-600">
                                  {getCurrencySymbol((order.currency as CurrencyCode) || 'INR')}
                                  {roundMoney(order.total).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Shipping Address */}
                          {order.shippingAddress && (
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <h5 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                <MapPin size={18} />
                                Shipping Address
                              </h5>
                              <p className="text-sm text-blue-800">
                                {order.shippingAddress.firstName} {order.shippingAddress.lastName}<br />
                                {order.shippingAddress.address}<br />
                                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}<br />
                                {order.shippingAddress.email}<br />
                                {order.shippingAddress.phone}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Messages Tab */}
              {activeTab === 'messages' && (
                <div className="bg-white rounded-lg shadow-lg p-8">
                  <h3 className="text-2xl font-bold text-swar-text mb-4 flex items-center gap-2">
                    <MessageSquare size={24} className="text-swar-primary" />
                    Support Chat ({messages.length})
                  </h3>

                  <div
                    ref={chatContainerRef}
                    className="mt-6 space-y-4 max-h-[420px] overflow-y-auto pr-2 flex flex-col"
                  >
                    {sortedMessages.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-swar-text-secondary text-lg">No conversations yet</p>
                        <p className="text-swar-text-secondary text-sm mt-2">Start a chat with our support team right here.</p>
                      </div>
                    ) : (
                      sortedMessages.map((msg) => (
                        <div
                          key={msg._id}
                          className={`flex w-full ${msg.senderRole === 'admin' ? 'justify-start' : 'justify-end'}`}
                        >
                          <div
                            className={`rounded-3xl p-4 max-w-[85%] shadow transition ${
                              msg.senderRole === 'admin'
                                ? 'bg-swar-primary-light text-swar-text border border-swar-border'
                                : 'bg-swar-primary text-white'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-swar-text-secondary mb-2">
                              <span>{msg.senderRole === 'admin' ? 'Admin Support' : 'You'}</span>
                              <span>{new Date(msg.createdAt).toLocaleString()}</span>
                            </div>
                            {msg.subject && (
                              <p className="text-[11px] font-semibold text-primary-600 mb-1">
                                {msg.subject}
                              </p>
                            )}
                            <p className="text-sm leading-relaxed whitespace-pre-line">{msg.message}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleSendMessage} className="mt-6 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-swar-text mb-1">Subject</label>
                      <input
                        type="text"
                        value={chatSubject}
                        onChange={(e) => setChatSubject(e.target.value)}
                        className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                        placeholder="Summarize your request (optional)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-swar-text mb-1">Message</label>
                      <textarea
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        rows={5}
                        className="w-full px-4 py-3 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary focus:border-transparent"
                        placeholder="Type your message to the admin here"
                        required
                      />
                    </div>
                    {chatStatus && (
                      <p
                        className={`text-sm font-semibold ${
                          chatStatus.type === 'success' ? 'text-swar-primary' : 'text-red-600'
                        }`}
                      >
                        {chatStatus.text}
                      </p>
                    )}
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={sendingChat || submitting}
                        className="bg-swar-primary text-white px-6 py-2 rounded-lg hover:bg-swar-primary-hover disabled:opacity-60 font-semibold transition"
                      >
                        {sendingChat || submitting ? 'Sending...' : 'Send Message'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="bg-white rounded-lg shadow-lg p-8">
                  <h3 className="text-2xl font-bold text-swar-text mb-6 flex items-center gap-2">
                    <Shield size={24} className="text-swar-primary" />
                    Security Settings
                  </h3>

                  {!showChangePassword ? (
                    <button
                      onClick={() => setShowChangePassword(true)}
                      className="bg-swar-primary text-white px-6 py-3 rounded-lg hover:bg-swar-primary-hover font-medium transition"
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
                            : 'bg-swar-primary-light text-red-800'
                        }`}>
                          {passwordMessage}
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="bg-swar-primary text-white px-6 py-2 rounded-lg hover:bg-swar-primary-hover disabled:opacity-50 font-medium"
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
