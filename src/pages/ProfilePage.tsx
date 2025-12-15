import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, User, Mail, Settings, LogOut, 
  Shield, Clock, Camera, Bell, Moon, Sun
} from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains('dark'));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

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

  const MenuItem = ({ icon: Icon, title, subtitle, onClick, danger = false }: any) => (
    <button
      onClick={onClick}
      className="flex items-center justify-between p-4 w-full hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${danger ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
          <Icon className={`w-5 h-5 ${danger ? 'text-red-500 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} />
        </div>
        <div className="text-left">
          <p className={`font-medium ${danger ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
            {title}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-900 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-gray-500 dark:text-gray-400"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Profile</h1>
      </div>

      {/* Profile Header */}
      <div className="p-6">
        <div className="flex flex-col items-center">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-1">
              {userProfile?.profileImage ? (
                <img 
                  src={userProfile.profileImage} 
                  alt={userProfile.displayName}
                  className="w-full h-full rounded-full object-cover border-4 border-white dark:border-gray-900"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center border-4 border-white dark:border-gray-900">
                  <User className="w-12 h-12 text-gray-400 dark:text-gray-600" />
                </div>
              )}
            </div>
            <button className="absolute bottom-0 right-0 p-2 bg-blue-500 dark:bg-blue-600 rounded-full text-white">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{userProfile?.displayName || 'User'}</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{userProfile?.email || 'user@example.com'}</p>
          
          <div className="mt-4 flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">24</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Actions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">156</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Updates</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">7d</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-4">
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl overflow-hidden mb-4">
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            <MenuItem 
              icon={User}
              title="Edit Profile"
              subtitle="Update your personal information"
              onClick={() => console.log('Edit profile')}
            />
            <MenuItem 
              icon={Mail}
              title="Email Preferences"
              subtitle="Manage notification emails"
              onClick={() => console.log('Email prefs')}
            />
            <MenuItem 
              icon={Bell}
              title="Notifications"
              subtitle="Configure alert settings"
              onClick={() => console.log('Notifications')}
            />
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl overflow-hidden mb-4">
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            <MenuItem 
              icon={Settings}
              title="Settings"
              subtitle="App preferences and configurations"
              onClick={() => console.log('Settings')}
            />
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-800">
                  {darkMode ? (
                    <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Dark Mode</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Switch between themes</p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={darkMode}
                  onChange={toggleDarkMode}
                  className="sr-only"
                  id="dark-mode-toggle"
                />
                <label
                  htmlFor="dark-mode-toggle"
                  className={`block w-14 h-8 rounded-full cursor-pointer ${darkMode ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${darkMode ? 'transform translate-x-7' : 'transform translate-x-1'}`}></div>
                </label>
              </div>
            </div>
            <MenuItem 
              icon={Clock}
              title="Activity History"
              subtitle="View your recent actions"
              onClick={() => console.log('Activity')}
            />
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl overflow-hidden mb-4">
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            <MenuItem 
              icon={Shield}
              title="Privacy & Security"
              subtitle="Manage your account security"
              onClick={() => console.log('Privacy')}
            />
            <MenuItem 
              icon={LogOut}
              title="Sign Out"
              danger={true}
              onClick={handleLogout}
            />
          </div>
        </div>

        <div className="text-center py-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            StockFlow v2.0 • {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;