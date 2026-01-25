'use client';

/**
 * CRM Dashboard Component for Meta Instant Form Leads
 * Shows all leads from Facebook/Instagram ads linked to workshops
 */

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface MetaLead {
  _id: string;
  name: string;
  phone: string;
  email: string;
  workshopName: string;
  workshopId: string;
  campaignName?: string;
  status: string;
  createdAt: string;
  importedFrom?: string;
}

interface WorkshopFilter {
  [key: string]: boolean;
}

export default function MetaFormLeadsDashboard() {
  const [leads, setLeads] = useState<MetaLead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<MetaLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [workshops, setWorkshops] = useState<string[]>([]);
  const [selectedWorkshops, setSelectedWorkshops] = useState<WorkshopFilter>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState<any>(null);

  // Fetch leads on mount
  useEffect(() => {
    fetchLeads();
    fetchStats();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/meta-forms/leads');
      const data = await response.json();
      
      if (data.success) {
        setLeads(data.leads);
        
        // Extract unique workshops
        const uniqueWorkshops = [...new Set(data.leads.map((l: MetaLead) => l.workshopName))];
        setWorkshops(uniqueWorkshops);
        
        // Initialize all workshops as selected
        const initialFilters: WorkshopFilter = {};
        uniqueWorkshops.forEach(w => {
          initialFilters[w] = true;
        });
        setSelectedWorkshops(initialFilters);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/meta-forms/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Filter leads based on workshop selection and search
  useEffect(() => {
    let filtered = leads.filter(lead => {
      const workshopMatch = selectedWorkshops[lead.workshopName] !== false;
      const searchMatch = 
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.includes(searchTerm) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      return workshopMatch && searchMatch;
    });

    setFilteredLeads(filtered);
  }, [leads, selectedWorkshops, searchTerm]);

  const handleWorkshopToggle = (workshop: string) => {
    setSelectedWorkshops(prev => ({
      ...prev,
      [workshop]: !prev[workshop],
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'contacted':
        return 'bg-yellow-100 text-yellow-800';
      case 'qualified':
        return 'bg-green-100 text-green-800';
      case 'converted':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading Meta form leads...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-gray-600">Total Meta Leads</p>
            <p className="text-3xl font-bold text-blue-600">{stats.totalLeads}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-sm text-gray-600">This Week</p>
            <p className="text-3xl font-bold text-green-600">{stats.lastWeek}</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <p className="text-sm text-gray-600">Workshops</p>
            <p className="text-3xl font-bold text-orange-600">{Object.keys(stats.byWorkshop || {}).length}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <p className="text-sm text-gray-600">Campaigns</p>
            <p className="text-3xl font-bold text-purple-600">{Object.keys(stats.byCampaign || {}).length}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-4 bg-white p-4 rounded-lg border">
        <div>
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Filter by Workshop:</p>
          <div className="flex flex-wrap gap-2">
            {workshops.map(workshop => (
              <button
                key={workshop}
                onClick={() => handleWorkshopToggle(workshop)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedWorkshops[workshop]
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {workshop} ({stats?.byWorkshop?.[workshop] || 0})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="overflow-x-auto bg-white rounded-lg border">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Phone</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Workshop</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Campaign</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredLeads.length > 0 ? (
              filteredLeads.map(lead => (
                <tr key={lead._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">{lead.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <a 
                      href={`https://wa.me/${lead.phone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:underline"
                    >
                      {lead.phone}
                    </a>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{lead.email || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{lead.workshopName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{lead.campaignName || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(lead.status)}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {format(new Date(lead.createdAt), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => window.open(`https://wa.me/${lead.phone}`, '_blank')}
                      className="text-green-600 hover:text-green-800 font-medium"
                      title="Send WhatsApp message"
                    >
                      💬 WhatsApp
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  No leads found matching your filters
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Footer with count */}
        <div className="bg-gray-50 px-6 py-3 border-t text-sm text-gray-600">
          Showing {filteredLeads.length} of {leads.length} leads
        </div>
      </div>

      {/* Workshop Performance */}
      {stats?.byWorkshop && Object.keys(stats.byWorkshop).length > 0 && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Leads by Workshop</h3>
          <div className="space-y-2">
            {Object.entries(stats.byWorkshop).map(([workshop, count]) => (
              <div key={workshop} className="flex items-center">
                <span className="text-sm font-medium text-gray-700 w-48">{workshop}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-6">
                  <div
                    className="bg-blue-500 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                    style={{ width: `${(count as number / stats.totalLeads) * 100}%` }}
                  >
                    {count as number}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
