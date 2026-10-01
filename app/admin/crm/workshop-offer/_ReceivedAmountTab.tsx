import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Handshake, Search, Calendar, ChevronRight, ChevronUp, ChevronDown, FileCheck } from 'lucide-react';
import { toast } from '@/components/admin/crm/ui/Toast';

export default function ReceivedAmountTab({ leads, selectedDashboardLang }: { leads: any[], selectedDashboardLang: string }) {
  const [leadData, setLeadData] = useState<Record<string, any>>({});
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  
  // Track offset in months from September 2026
  const [monthOffset, setMonthOffset] = useState<number>(0);

  // Load pushed data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('crm_offer_data');
    if (saved) {
      try {
        setLeadData(JSON.parse(saved));
      } catch(e) {}
    }
  }, []);

  // Generate 6 months based on the offset
  const months = useMemo(() => {
    const result = [];
    // Start at September 2026 (year 2026, month 8 in JS Date where month is 0-indexed)
    const baseDate = new Date(2026, 8, 1);
    
    // Apply offset
    baseDate.setMonth(baseDate.getMonth() + monthOffset);
    
    for (let i = 0; i < 6; i++) {
      const current = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
      const year = current.getFullYear();
      const monthNum = String(current.getMonth() + 1).padStart(2, '0');
      const monthName = current.toLocaleString('default', { month: 'long' });
      
      result.push({
        id: `${year}-${monthNum}`,
        label: `${monthName} ${year}`
      });
    }
    return result;
  }, [monthOffset]);

  // Filter leads that have been pushed to receipts and match the selected month
  const receivedLeads = useMemo(() => {
    return leads.filter(l => {
      const data = leadData[l.id];
      if (!data || !data.pushedToReceipts || data.status !== 'received') return false;
      
      // Filter by selected month based on the date they were pushed/received
      if (!data.date || !data.date.startsWith(selectedMonth)) return false;

      return true;
    });
  }, [leads, leadData, selectedMonth]);

  // Calculate total amount
  const totalAmount = useMemo(() => {
    return receivedLeads.reduce((sum, l) => {
      const amtStr = leadData[l.id]?.amount || '';
      // Extract numeric value from "₹1,500" or similar
      const num = parseInt(amtStr.replace(/\D/g, ''), 10);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  }, [receivedLeads, leadData]);

  const shiftMonths = (direction: 'up' | 'down') => {
    // Up arrow means going backwards in time (earlier months)
    // Down arrow means going forwards in time (later months)
    setMonthOffset(prev => direction === 'up' ? prev - 1 : prev + 1);
  };

  return (
    <div className="flex flex-col h-full bg-white shadow-sm overflow-hidden animate-fade-in">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        
        {/* Sidebar - Month Selection */}
        <div className="w-64 border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 min-h-0">
        <div className="p-4 border-b border-slate-200 bg-white">
          <h2 className="font-black text-slate-800 text-lg flex items-center gap-2">
            <Calendar className="text-emerald-600" size={20} />
            Months
          </h2>
          <p className="text-xs text-slate-500 mt-1">Select a month to view receipts</p>
        </div>
        
        <button 
          onClick={() => shiftMonths('up')}
          className="w-full flex items-center justify-center p-2 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 transition-colors"
          title="Previous Month"
        >
          <ChevronUp size={20} />
        </button>

        <div className="overflow-y-auto p-3 pt-0 space-y-2 no-scrollbar">
          {months.map((month) => (
            <button
              key={month.id}
              onClick={() => setSelectedMonth(month.id)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center justify-between transition-all ${
                selectedMonth === month.id 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>{month.label}</span>
              {selectedMonth === month.id && <ChevronRight size={16} />}
            </button>
          ))}
        </div>

        <button 
          onClick={() => shiftMonths('down')}
          className="w-full flex items-center justify-center p-2 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 transition-colors border-t border-slate-200"
          title="Next Month"
        >
          <ChevronDown size={20} />
        </button>
      </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-white">
          
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                <Handshake size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">
                  Received Payments - {months.find(m => m.id === selectedMonth)?.label}
                </h3>
                <p className="text-xs text-slate-500">{receivedLeads.length} payments received this month</p>
              </div>
            </div>
            
            <button 
              onClick={() => {
                if (selectedLeads.length === 0) {
                  toast.error('Please select at least one payment.');
                  return;
                }
                setLeadData(prev => {
                  const updated = { ...prev };
                  selectedLeads.forEach(id => {
                    updated[id] = {
                      ...(updated[id] || {}),
                      pushedToCreateReceipts: true
                    };
                  });
                  localStorage.setItem('crm_offer_data', JSON.stringify(updated));
                  return updated;
                });
                setSelectedLeads([]);
                toast.success(`Successfully pushed ${selectedLeads.length} payments to Create Receipts!`);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-transform hover:scale-105 flex items-center gap-2"
            >
              Push to Receipts {selectedLeads.length > 0 ? `(${selectedLeads.length})` : ''}
            </button>
          </div>

          <div className="flex-1 overflow-auto bg-white">
            {receivedLeads.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Handshake size={48} className="mb-4 opacity-20" />
                <p className="font-medium text-slate-500">No received payments found for this month.</p>
              </div>
            ) : (
              <div className="min-w-max pb-16">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 font-bold text-slate-500 sticky left-0 bg-slate-50 shadow-[1px_0_0_0_#e2e8f0] z-20 w-10">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" 
                          checked={selectedLeads.length === receivedLeads.length && receivedLeads.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedLeads(receivedLeads.map(l => l.id));
                            else setSelectedLeads([]);
                          }}
                        />
                      </th>
                      <th className="px-4 py-3 font-bold text-slate-500 sticky left-10 bg-slate-50 shadow-[1px_0_0_0_#e2e8f0] z-20 w-12">Sr.No</th>
                      <th className="px-4 py-3 font-bold text-slate-500 sticky left-[5.5rem] bg-slate-50 shadow-[1px_0_0_0_#e2e8f0] z-20">Name</th>
                      <th className="px-4 py-3 font-bold text-slate-500">WhatsApp Number</th>
                      <th className="px-4 py-3 font-bold text-slate-500">Email</th>
                      <th className="px-4 py-3 font-bold text-slate-500">Amount</th>
                      <th className="px-4 py-3 font-bold text-slate-500">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receivedLeads.map((lead: any, i: number) => {
                      const answers = lead.dynamicAnswers || lead._rawRecord || {};
                      const name = lead.name || answers['Name'] || answers['NAME'] || 'Unknown';
                      const email = lead.email || answers['Email'] || answers['EMAIL'] || '-';
                      const phone = lead.mobile || lead.phoneNumber || lead.phone || answers['WhatsApp Number'] || answers['Mobile'] || '-';
                      
                      const rowData = leadData[lead.id] || {};
                      const isPushed = rowData.pushedToCreateReceipts === true;
                      
                      return (
                        <tr key={lead.id} className={`transition-colors group ${isPushed ? 'bg-emerald-50 hover:bg-emerald-100' : 'hover:bg-slate-50'}`}>
                          <td className={`px-4 py-3 sticky left-0 shadow-[1px_0_0_0_#e2e8f0] z-10 ${isPushed ? 'bg-emerald-50 group-hover:bg-emerald-100' : 'bg-white group-hover:bg-slate-50'}`}>
                            <input 
                              type="checkbox" 
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" 
                              checked={selectedLeads.includes(lead.id)}
                              onChange={() => {
                                setSelectedLeads(prev => 
                                  prev.includes(lead.id) 
                                    ? prev.filter(id => id !== lead.id)
                                    : [...prev, lead.id]
                                );
                              }}
                            />
                          </td>
                          <td className={`px-4 py-3 font-bold sticky left-10 shadow-[1px_0_0_0_#e2e8f0] z-10 ${isPushed ? 'bg-emerald-50 group-hover:bg-emerald-100 text-emerald-600' : 'bg-white group-hover:bg-slate-50 text-slate-500'}`}>
                            {i + 1}
                          </td>
                          <td className={`px-4 py-3 font-bold sticky left-[5.5rem] shadow-[1px_0_0_0_#e2e8f0] z-10 ${isPushed ? 'bg-emerald-50 group-hover:bg-emerald-100 text-emerald-700' : 'bg-white group-hover:bg-slate-50 text-slate-800'}`}>
                            {name}
                            {isPushed && <span className="ml-2 text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Pushed</span>}
                          </td>
                          <td className={`px-4 py-3 ${isPushed ? 'text-emerald-700' : 'text-slate-600'}`}>{phone}</td>
                          <td className={`px-4 py-3 ${isPushed ? 'text-emerald-700' : 'text-slate-600'}`}>{email}</td>
                          <td className="px-4 py-3 font-bold text-emerald-600">{rowData.amount || '-'}</td>
                          <td className={`px-4 py-3 ${isPushed ? 'text-emerald-700' : 'text-slate-600'}`}>{rowData.date || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Total Amount Footer - Spans Full Width */}
      <div className="bg-slate-800 text-white p-4 shrink-0 flex items-center justify-end pr-16 border-t border-slate-700 w-full z-30">
        <div className="text-right">
          <p className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-1">Total Amount Received</p>
          <p className="text-2xl font-black text-emerald-400">
            ₹{totalAmount.toLocaleString('en-IN')}
          </p>
        </div>
      </div>
    </div>
  );
}
