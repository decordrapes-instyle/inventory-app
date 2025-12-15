import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Package,
  User,
  Bell,
  Home,
  Moon,
  Sun,
} from 'lucide-react';

const AppNavigation: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(false);
  const [notifications] = useState(0);

  useEffect(() => {
    // Check for saved theme or system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };


  const NavItem = ({ to, children, icon: Icon }: { to: string; children: React.ReactNode; icon: React.ElementType }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center py-3 transition-all ${
          isActive
            ? 'text-blue-500 dark:text-blue-400'
            : 'text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400'
        }`
      }
    >
      <Icon className="w-6 h-6 mb-1" />
      <span className="text-xs font-medium">{children}</span>
    </NavLink>
  );

  return (
    <>
      {/* ===== TOP BAR - Desktop Only ===== */}
      <div className="hidden md:block bg-white dark:bg-black border-b border-gray-200 dark:border-gray-900">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <div className="p-2 bg-blue-500 dark:bg-blue-600 rounded-lg">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">StockFlow</span>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900"
                aria-label="Toggle theme"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
              </button>

              <button
                onClick={() => navigate('/notifications')}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 relative"
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
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-900">
        <div className="grid grid-cols-4 h-16">
          <NavItem to="/" icon={Home}>
            Home
          </NavItem>
          
          <NavItem to="/notifications" icon={Bell}>
            Alerts
            {notifications > 0 && (
              <span className="absolute top-2 right-8 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </NavItem>
          
          <NavItem to="/profile" icon={User}>
            Profile
          </NavItem>
          
          <button
            onClick={toggleDarkMode}
            className="flex flex-col items-center justify-center py-3 text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
          >
            {darkMode ? (
              <Sun className="w-6 h-6 mb-1" />
            ) : (
              <Moon className="w-6 h-6 mb-1" />
            )}
            <span className="text-xs font-medium">Theme</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default AppNavigation;