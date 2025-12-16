import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { NavLink } from 'react-router-dom';
import {
  Package,
  Home,
  Bell,
} from 'lucide-react';

const AppNavigation: React.FC = () => {
  const { userProfile } = useAuth();
  const [notifications] = useState(0);

  const NavItem = ({ 
    to, 
    children, 
    icon: Icon, 
    showBadge = false 
  }: { 
    to: string; 
    children: React.ReactNode; 
    icon: React.ElementType;
    showBadge?: boolean;
  }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center py-3 transition-all relative ${
          isActive
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <div className="relative">
            <Icon className={`w-6 h-6 transition-transform ${isActive ? 'scale-110' : ''}`} />
            {showBadge && notifications > 0 && (
              <span className="absolute -top-0.5 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-gray-900"></span>
            )}
          </div>
          <span className="text-xs font-medium mt-1">{children}</span>
        </>
      )}
    </NavLink>
  );

  const ProfileNavItem = ({ 
    to, 
    children 
  }: { 
    to: string; 
    children: React.ReactNode; 
  }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center py-3 transition-all relative ${
          isActive
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <div className="relative">
            <img
              src={userProfile?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.displayName || 'User')}&background=4f46e5&color=fff`}
              className={`w-6 h-6 rounded-full object-cover border transition-all ${
                isActive 
                  ? 'border-blue-600 dark:border-blue-400 scale-110' 
                  : 'border-gray-200 dark:border-gray-700'
              }`}
              alt="Profile"
            />
          </div>
          <span className="text-xs font-medium mt-1">{children}</span>
        </>
      )}
    </NavLink>
  );

  return (
    <>
      {/* Fixed bottom navigation only */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-safe">
        <div className="grid grid-cols-4 h-16">
          <NavItem to="/" icon={Home}>
            Home
          </NavItem>
          
          <NavItem to="/auto-inventory" icon={Package}>
            Inventory
          </NavItem>
          
          <NavItem to="/notifications" icon={Bell} showBadge>
            Alerts
          </NavItem>
          
          <ProfileNavItem to="/profile">
            Profile
          </ProfileNavItem>
        </div>
      </div>
    </>
  );
};

export default AppNavigation;