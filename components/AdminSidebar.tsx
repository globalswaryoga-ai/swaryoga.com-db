'use client';

import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, Users, LogIn, MessageSquare, X } from 'lucide-react';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const menuItems = [
    {
      icon: LayoutDashboard,
      label: 'Dashboard',
      href: '/admin/dashboard',
      color: 'text-blue-600'
    },
    {
      icon: Users,
      label: 'Signup Data',
      href: '/admin/signup-data',
      color: 'text-green-600'
    },
    {
      icon: LogIn,
      label: 'Signin Data',
      href: '/admin/signin-data',
      color: 'text-purple-600'
    },
    {
      icon: MessageSquare,
      label: 'Contact Messages',
      href: '/admin/contact-messages',
      color: 'text-orange-600'
    }
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-lg">
              SP
            </div>
            <div>
              <h2 className="font-bold text-lg">Swar Yoga</h2>
              <p className="text-xs text-gray-400">Admin Panel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-2 hover:bg-gray-800 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="p-6 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors group"
              >
                <Icon className={`h-5 w-5 ${item.color}`} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-800">
          <div className="text-xs text-gray-400">
            <p className="font-semibold text-gray-300 mb-2">Admin Panel v1.0</p>
            <p>Manage all user data and site content</p>
          </div>
        </div>
      </aside>
    </>
  );
}
