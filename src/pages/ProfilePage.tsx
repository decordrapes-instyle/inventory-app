// ProfilePage.tsx
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Moon, Sun, Edit3 } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { userProfile, logout, darkMode, updateDarkMode } = useAuth();
  const navigate = useNavigate();

  const toggleDarkMode = () => {
    updateDarkMode(darkMode === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-900">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          Profile
        </h1>
      </div>

      {/* Profile */}
      <div className="flex flex-col items-center px-6 py-12">
        <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center mb-4">
          {userProfile?.profileImage ? (
            <img
              src={userProfile.profileImage}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <User className="w-10 h-10 text-gray-400" />
          )}
        </div>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {userProfile?.displayName}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {userProfile?.email}
        </p>
        <button
            onClick={() => navigate('/edit-profile')}
            className="mt-6 px-5 py-2 rounded-full bg-gray-900 dark:bg-white text-white dark:text-black font-medium flex items-center gap-2"
        >
            <Edit3 className="w-4 h-4" />
            Edit Profile
        </button>
      </div>

      {/* Settings */}
      <div className="px-4 space-y-3">
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50"
        >
          <span className="font-medium text-gray-900 dark:text-white">
            Dark Mode
          </span>
          {darkMode ==='dark' ? <Moon /> : <Sun />}
        </button>

        <button
          onClick={handleLogout}
          className="w-full p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 font-medium"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
