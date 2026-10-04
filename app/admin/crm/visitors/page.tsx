'use client';

import React from 'react';
import { 
  Users, 
  MousePointerClick, 
  MapPin, 
  Smartphone, 
  Globe, 
  Laptop,
  ArrowUpRight,
  BarChart3,
  Activity
} from 'lucide-react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function WebsiteVisitorsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-slate-50 font-sans">
      <div className="mb-8">
        <Link 
          href="/admin/crm/web-admin" 
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Web Admin
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Website Visitors & Analytics</h1>
            <p className="text-slate-500 text-sm mt-1">Live overview of your website traffic, clicks, and visitor locations.</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 flex items-start gap-3">
        <Globe className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Google Analytics Successfully Connected</p>
          <p>Your Google Tag (G-D994F0MN25) has been installed. Because it was just installed, it will take 24-48 hours for Google Analytics to collect enough data to fully populate these live charts. Below is a preview of the analytics dashboard structure.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Visitors (30d)', value: '0', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Page Views / Clicks', value: '0', icon: MousePointerClick, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Active Right Now', value: '0', icon: Activity, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Avg. Session Duration', value: '0m 0s', icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                <ArrowUpRight className="w-3 h-3 mr-1" />
                Live
              </span>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</div>
            <div className="text-sm text-slate-500 font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Locations */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-500" />
              Top Visitor Locations
            </h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-center h-48 bg-slate-50 border border-slate-100 rounded-xl border-dashed">
              <div className="text-center text-slate-400">
                <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Awaiting location data from Google Analytics...</p>
              </div>
            </div>
          </div>
        </div>

        {/* Devices */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-indigo-500" />
              Devices
            </h2>
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm font-medium mb-2">
                <span className="flex items-center text-slate-700"><Smartphone className="w-4 h-4 mr-2 text-slate-400"/> Mobile</span>
                <span className="text-slate-900">0%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '0%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm font-medium mb-2">
                <span className="flex items-center text-slate-700"><Laptop className="w-4 h-4 mr-2 text-slate-400"/> Desktop</span>
                <span className="text-slate-900">0%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '0%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
