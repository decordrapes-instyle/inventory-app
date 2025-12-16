import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Package,
  User,
  Bell,
  Home,
} from 'lucide-react';

const AppNavigation: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [notifications] = useState(0);

  const NavItem = ({ to, children, icon: Icon }: { to: string; children: React.ReactNode; icon: React.ElementType }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center py-2 transition-all relative ${
          isActive
            ? 'text-blue-500'
            : 'text-gray-600 hover:text-blue-500'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-blue-500 rounded-b-full" />
          )}
          <Icon className={`w-6 h-6 mb-1 ${isActive ? 'scale-110' : ''}`} />
          <span className="text-xs font-medium">{children}</span>
        </>
      )}
    </NavLink>
  );

  return (
    <>
      {/* ===== TOP BAR - Desktop Only ===== */}
      <div className="hidden md:block bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <div className="p-2 bg-blue-500 rounded-lg">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">StockFlow</span>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/notifications')}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 relative transition-colors"
              >
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-3">
                <img
                  src={userProfile?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.displayName || 'User')}&background=4f46e5&color=fff`}
                  className="w-8 h-8 rounded-lg object-cover"
                  alt="Profile"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{userProfile?.displayName || 'User'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{userProfile?.email || 'user@example.com'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 pb-safe">
        <div className="grid grid-cols-4 h-16">
          <NavItem to="/" icon={Home}>
            Home
          </NavItem>
          
          <NavItem to="/auto-inventory" icon={Package}>
            Inventory
          </NavItem>

          <div className="relative">
            <NavItem to="/notifications" icon={Bell}>
              Alerts
            </NavItem>
            {notifications > 0 && (
              <span className="absolute top-2 right-1/4 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </div>
          
          <NavItem to="/profile" icon={User}>
            Profile
          </NavItem>
        </div>
      </div>

      {/* Spacer for mobile bottom nav */}
      <div className="bg-white dark:bg-black md:hidden h-16" />
    </>
  );
};

export default AppNavigation;