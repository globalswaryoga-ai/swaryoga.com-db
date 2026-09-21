'use client';

import React from 'react';
import { Activity, Users, Video, Clock, TrendingUp } from 'lucide-react';

export default function ZoomAnalysisTab() {
  return (
    <div className="flex flex-col h-full bg-gray-50/50 p-6 overflow-y-auto">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-6 w-6 text-indigo-600" />
            Zoom Analysis
          </h2>
          <p className="text-sm text-gray-500 mt-1">Metrics and attendance tracking for recent Zoom meetings</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-start gap-4">
          <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
            <Video className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">Total Meetings</p>
            <p className="text-2xl font-bold text-gray-900">14</p>
            <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" /> +2 this week
            </p>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-start gap-4">
          <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">Avg. Attendance</p>
            <p className="text-2xl font-bold text-gray-900">45</p>
            <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" /> +5% this week
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-start gap-4">
          <div className="bg-green-50 p-3 rounded-xl text-green-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">Avg. Duration</p>
            <p className="text-2xl font-bold text-gray-900">62m</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-start gap-4">
          <div className="bg-purple-50 p-3 rounded-xl text-purple-600">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">Engagement Score</p>
            <p className="text-2xl font-bold text-gray-900">8.4<span className="text-sm text-gray-400 font-normal">/10</span></p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-bold text-gray-800 text-sm">Recent Meetings</h3>
        </div>
        
        <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
            <Activity className="h-8 w-8 text-gray-300" />
          </div>
          <h4 className="text-lg font-bold text-gray-900 mb-2">Detailed Analysis Coming Soon</h4>
          <p className="text-sm text-gray-500 max-w-sm">We are connecting the Zoom API to pull detailed attendance reports and engagement metrics for this view.</p>
        </div>
      </div>
    </div>
  );
}
