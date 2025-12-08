import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, 
  LogIn, 
  UserPlus, 
  ShoppingCart, 
  MessageSquare, 
  DollarSign,
  Award,
  Home,
  BookOpen,
  Layers
} from 'lucide-react';

interface AdminSidebarProps {
  isMobile?: boolean;
  onItemClick?: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isMobile = false, onItemClick }) => {
  const location = useLocation();

  const navigationItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, path: '/admin', color: 'blue' },
    { id: 'workshops', name: 'Workshops', icon: Layers, path: '/admin/workshops', color: 'green' },
    { id: 'signup-data', name: 'Signup Data', icon: UserPlus, path: '/admin/signup-data', color: 'purple' },
    { id: 'signin-data', name: 'Signin Data', icon: LogIn, path: '/admin/signin-data', color: 'indigo' },
    { id: 'cart-data', name: 'Cart Data', icon: ShoppingCart, path: '/admin/cart-data', color: 'orange' },
    { id: 'contact-data', name: 'Contact Data', icon: MessageSquare, path: '/admin/contact-data', color: 'pink' },
    { id: 'accounting', name: 'Accounting', icon: DollarSign, path: '/admin/accounting', color: 'yellow' },
    { id: 'certificates', name: 'Certificates', icon: Award, path: '/admin/certificates', color: 'red' }
  ];

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  const getColorClasses = (color: string, active: boolean) => {
    const colors = {
      blue: active ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50',
      green: active ? 'bg-green-600 text-white' : 'text-green-600 hover:bg-green-50',
      purple: active ? 'bg-purple-600 text-white' : 'text-purple-600 hover:bg-purple-50',
      indigo: active ? 'bg-indigo-600 text-white' : 'text-indigo-600 hover:bg-indigo-50',
      orange: active ? 'bg-orange-600 text-white' : 'text-orange-600 hover:bg-orange-50',
      pink: active ? 'bg-pink-600 text-white' : 'text-pink-600 hover:bg-pink-50',
      yellow: active ? 'bg-yellow-600 text-white' : 'text-yellow-600 hover:bg-yellow-50',
      red: active ? 'bg-red-600 text-white' : 'text-red-600 hover:bg-red-50',
      teal: active ? 'bg-teal-600 text-white' : 'text-teal-600 hover:bg-teal-50'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className={`${isMobile ? 'p-6 pt-20' : 'p-6'}`}>
      {isMobile && (
        <Link 
          to="/"
          className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 mb-6"
          onClick={onItemClick}
        >
          <Home className="h-5 w-5" />
          <span>Back to Website</span>
        </Link>
      )}
      
      <nav className="space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.id}
              to={item.path}
              onClick={onItemClick}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${getColorClasses(item.color, active)}`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default AdminSidebar;