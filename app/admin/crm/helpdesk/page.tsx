'use client';

import React, { useState, useEffect } from 'react';
import {
  Ticket,
  Plus,
  Search,
  Loader2,
  RefreshCw,
  Clock,
  User,
  Tag,
  MessageSquare,
  Send,
  X,
  AlertCircle,
  CheckCircle2,
  Circle,
  Filter,
  ChevronDown,
  UserPlus,
  AlertTriangle,
} from 'lucide-react';

interface TicketData {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: 'open' | 'pending' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  customerName: string;
  customerEmail: string;
  assignedTo?: string;
  assignedToName?: string;
  tags: string[];
  slaDeadline?: string;
  messages: {
    id: string;
    type: string;
    content: string;
    authorName: string;
    isInternal: boolean;
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

interface Category {
  id: string;
  name: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'Open', color: 'text-blue-700', bg: 'bg-blue-100' },
  pending: { label: 'Pending', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  in_progress: { label: 'In Progress', color: 'text-purple-700', bg: 'bg-purple-100' },
  resolved: { label: 'Resolved', color: 'text-green-700', bg: 'bg-green-100' },
  closed: { label: 'Closed', color: 'text-gray-700', bg: 'bg-gray-100' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: 'Low', color: 'text-gray-700', bg: 'bg-gray-100' },
  medium: { label: 'Medium', color: 'text-blue-700', bg: 'bg-blue-100' },
  high: { label: 'High', color: 'text-orange-700', bg: 'bg-orange-100' },
  urgent: { label: 'Urgent', color: 'text-red-700', bg: 'bg-red-100' },
};

export default function HelpDeskPage() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState({ open: 0, pending: 0, in_progress: 0, resolved: 0, closed: 0 });
  const [plan, setPlan] = useState('free');
  const [tenantSlug, setTenantSlug] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [showCreate, setShowCreate] = useState(false);
  const [showTicket, setShowTicket] = useState<TicketData | null>(null);
  const [saving, setSaving] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);

  // Create form
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    priority: 'medium',
    category: 'general',
    customerName: '',
    customerEmail: '',
  });

  // SLA helper
  const getSLAStatus = (ticket: TicketData) => {
    if (!ticket.slaDeadline || ticket.status === 'resolved' || ticket.status === 'closed') {
      return null;
    }
    const deadline = new Date(ticket.slaDeadline);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffMs <= 0) {
      return { breached: true, text: 'SLA Breached', color: 'text-red-600 bg-red-100' };
    } else if (diffHours < 2) {
      return { breached: false, text: `${diffHours}h ${diffMins}m left`, color: 'text-orange-600 bg-orange-100' };
    } else if (diffHours < 24) {
      return { breached: false, text: `${diffHours}h left`, color: 'text-yellow-600 bg-yellow-100' };
    } else {
      const days = Math.floor(diffHours / 24);
      return { breached: false, text: `${days}d ${diffHours % 24}h left`, color: 'text-green-600 bg-green-100' };
    }
  };

  useEffect(() => {
    const slug = localStorage.getItem('tenantSlug') || '';
    setTenantSlug(slug);
    fetchTickets();
    fetchTeamMembers();
  }, [filterStatus, filterPriority]);

  const fetchTeamMembers = async () => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const slug = localStorage.getItem('tenantSlug') || '';
      const res = await fetch(`/api/crm-site/team?tenant=${slug}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.members || []);
      }
    } catch (err) {
      console.error('Failed to fetch team members:', err);
    }
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const slug = localStorage.getItem('tenantSlug') || '';

      let url = `/api/crm-site/tickets?tenant=${slug}`;
      if (filterStatus) url += `&status=${filterStatus}`;
      if (filterPriority) url += `&priority=${filterPriority}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
        setCategories(data.categories || []);
        setStats(data.stats || { open: 0, pending: 0, in_progress: 0, resolved: 0, closed: 0 });
        setPlan(data.plan || 'free');
      }
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.customerEmail.trim()) {
      alert('Subject and customer email are required');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const res = await fetch('/api/crm-site/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tenantSlug, ...newTicket }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowCreate(false);
        setNewTicket({
          subject: '',
          description: '',
          priority: 'medium',
          category: 'general',
          customerName: '',
          customerEmail: '',
        });
        fetchTickets();
        if (data.ticket) {
          setShowTicket(data.ticket);
        }
      } else {
        alert(data.error || 'Failed to create ticket');
      }
    } catch (err) {
      console.error('Failed to create ticket:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const res = await fetch('/api/crm-site/tickets', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tenantSlug, ticketId, status }),
      });

      if (res.ok) {
        const data = await res.json();
        if (showTicket?.id === ticketId) {
          setShowTicket(data.ticket);
        }
        fetchTickets();
      }
    } catch (err) {
      console.error('Failed to update ticket:', err);
    }
  };

  const assignTicket = async (ticketId: string, memberId: string | null, memberName?: string) => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const res = await fetch('/api/crm-site/tickets', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantSlug,
          ticketId,
          assignedTo: memberId,
          assignedToName: memberName,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (showTicket?.id === ticketId) {
          setShowTicket(data.ticket);
        }
        setShowAssignDropdown(false);
        fetchTickets();
      }
    } catch (err) {
      console.error('Failed to assign ticket:', err);
    }
  };

  const sendReply = async () => {
    if (!showTicket || !replyText.trim()) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const res = await fetch('/api/crm-site/tickets', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantSlug,
          ticketId: showTicket.id,
          action: 'reply',
          content: replyText,
          isAgent: true,
          authorName: 'Agent',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setShowTicket(data.ticket);
        setReplyText('');
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSaving(false);
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.subject.toLowerCase().includes(q) ||
        t.ticketNumber.toLowerCase().includes(q) ||
        t.customerEmail.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading && tickets.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Ticket className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Help Desk</h1>
              <p className="text-gray-600">Manage support tickets</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchTickets}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              New Ticket
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
              className={`bg-white rounded-xl p-4 border text-left transition ${
                filterStatus === key ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <p className={`text-sm ${config.color}`}>{config.label}</p>
              <p className="text-2xl font-bold mt-1">{stats[key as keyof typeof stats]}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tickets..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                />
              </div>
            </div>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">All Priorities</option>
              {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
            {(filterStatus || filterPriority || searchQuery) && (
              <button
                onClick={() => {
                  setFilterStatus('');
                  setFilterPriority('');
                  setSearchQuery('');
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Tickets List */}
        {filteredTickets.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border">
            <Ticket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No tickets found</h3>
            <p className="text-gray-600 mb-4">
              {tickets.length === 0 ? 'Create your first support ticket' : 'Try adjusting your filters'}
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Create Ticket
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Ticket</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Customer</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Assigned To</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Priority</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">SLA</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTickets.map((ticket) => {
                  const sla = getSLAStatus(ticket);
                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => setShowTicket(ticket)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{ticket.subject}</p>
                          <p className="text-sm text-gray-500">{ticket.ticketNumber}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{ticket.customerName}</p>
                        <p className="text-sm text-gray-500">{ticket.customerEmail}</p>
                      </td>
                      <td className="px-6 py-4">
                        {ticket.assignedToName ? (
                          <span className="text-sm text-gray-900">{ticket.assignedToName}</span>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[ticket.status].bg} ${STATUS_CONFIG[ticket.status].color}`}>
                          {STATUS_CONFIG[ticket.status].label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${PRIORITY_CONFIG[ticket.priority].bg} ${PRIORITY_CONFIG[ticket.priority].color}`}>
                          {PRIORITY_CONFIG[ticket.priority].label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {sla ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${sla.color}`}>
                            {sla.breached ? '⚠️' : '⏱'} {sla.text}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">Create Ticket</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={newTicket.customerName}
                    onChange={(e) => setNewTicket({ ...newTicket, customerName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Email *</label>
                  <input
                    type="email"
                    value={newTicket.customerEmail}
                    onChange={(e) => setNewTicket({ ...newTicket, customerEmail: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <input
                  type="text"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Brief description of the issue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Detailed description..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={newTicket.category}
                    onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={createTicket}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Ticket Modal */}
      {showTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-gray-500">{showTicket.ticketNumber}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[showTicket.status].bg} ${STATUS_CONFIG[showTicket.status].color}`}>
                    {STATUS_CONFIG[showTicket.status].label}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_CONFIG[showTicket.priority].bg} ${PRIORITY_CONFIG[showTicket.priority].color}`}>
                    {PRIORITY_CONFIG[showTicket.priority].label}
                  </span>
                </div>
                <h2 className="text-xl font-bold">{showTicket.subject}</h2>
              </div>
              <button onClick={() => setShowTicket(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {/* SLA Status */}
              {(() => {
                const sla = getSLAStatus(showTicket);
                if (sla) {
                  return (
                    <div className={`rounded-lg p-3 mb-4 flex items-center gap-3 ${sla.color}`}>
                      {sla.breached ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                      <span className="font-medium">{sla.text}</span>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Customer Info & Assignment */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{showTicket.customerName}</p>
                      <p className="text-sm text-gray-500">{showTicket.customerEmail}</p>
                    </div>
                  </div>
                  {/* Assignment Section */}
                  <div className="relative">
                    <button
                      onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50"
                    >
                      <UserPlus className="w-4 h-4" />
                      {showTicket.assignedToName || 'Unassigned'}
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    {showAssignDropdown && (
                      <div className="absolute right-0 top-full mt-1 w-56 bg-white border rounded-lg shadow-lg z-20">
                        <div className="p-2">
                          <button
                            onClick={() => assignTicket(showTicket.id, null)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-lg text-gray-600"
                          >
                            Unassign
                          </button>
                          {teamMembers.map((member) => (
                            <button
                              key={member.id}
                              onClick={() => assignTicket(showTicket.id, member.id, member.name)}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-lg ${
                                showTicket.assignedTo === member.id ? 'bg-blue-50 text-blue-700' : ''
                              }`}
                            >
                              <p className="font-medium">{member.name}</p>
                              <p className="text-xs text-gray-500">{member.email}</p>
                            </button>
                          ))}
                          {teamMembers.length === 0 && (
                            <p className="px-3 py-2 text-sm text-gray-500">No team members</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Actions */}
              <div className="flex gap-2 mb-6">
                {showTicket.status !== 'resolved' && showTicket.status !== 'closed' && (
                  <>
                    <button
                      onClick={() => updateTicketStatus(showTicket.id, 'in_progress')}
                      className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
                    >
                      Mark In Progress
                    </button>
                    <button
                      onClick={() => updateTicketStatus(showTicket.id, 'resolved')}
                      className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                    >
                      Mark Resolved
                    </button>
                  </>
                )}
                {showTicket.status === 'resolved' && (
                  <button
                    onClick={() => updateTicketStatus(showTicket.id, 'closed')}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Close Ticket
                  </button>
                )}
              </div>

              {/* Messages */}
              <div className="space-y-4 mb-6">
                {showTicket.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-lg ${
                      msg.type === 'agent'
                        ? 'bg-blue-50 ml-8'
                        : msg.type === 'system'
                        ? 'bg-gray-100 text-center text-sm'
                        : 'bg-gray-50 mr-8'
                    }`}
                  >
                    {msg.type !== 'system' && (
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{msg.authorName}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(msg.createdAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    <p className="text-gray-700 whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              {showTicket.status !== 'closed' && (
                <div className="border rounded-lg">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={3}
                    placeholder="Type your reply..."
                    className="w-full p-3 rounded-t-lg border-b focus:outline-none"
                  />
                  <div className="p-2 flex justify-end">
                    <button
                      onClick={sendReply}
                      disabled={saving || !replyText.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Send Reply
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
