import React from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "../context/NavigationContext";
import {
  ArrowLeft,
  User,
  Moon,
  Sun,
  Edit3,
  Github,
  Instagram,
  MessageCircle,
  LinkedinIcon,
} from "lucide-react";
import { setDarkStatusBar, setLightStatusBar } from "../statusBar";

const ProfilePage: React.FC = () => {
  const { userProfile, logout, darkMode, updateDarkMode } = useAuth();
  const { navigate, goBack } = useNavigation();

  const toggleDarkMode = () => {
    if (darkMode === "dark") {
      updateDarkMode("light");
      setLightStatusBar();
    } else {
      updateDarkMode("dark");
      setDarkStatusBar();
    }
  };


  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };


  return (
    <div className="pt-3 min-h-screen bg-white dark:bg-black pb-24">
      <div className="pt-safe flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-900">
        <div className="flex items-center gap-3">
          <button onClick={goBack}>
            <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Profile
          </h1>
        </div>
      </div>

      {/* Profile */}
      <div className="flex flex-col items-center px-6 py-8">
        <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center mb-4">
          {userProfile?.profileImage ? (
            <img
              src={userProfile.profileImage}
              className="w-full h-full rounded-full object-cover"
              alt="Profile"
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
          onClick={() => navigate("/edit-profile")}
          className="mt-6 px-5 py-2 rounded-full bg-gray-900 dark:bg-white text-white dark:text-black font-medium flex items-center gap-2"
        >
          <Edit3 className="w-4 h-4" />
          Edit Profile
        </button>
      </div>

      {/* Settings */}
      <div className="px-4 space-y-3">
        
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50"
        >
          <span className="font-medium text-gray-900 dark:text-white">
            Dark Mode
          </span>
          {darkMode === "dark" ? <Moon /> : <Sun />}
        </button>

       

        <button
          onClick={handleLogout}
          className="w-full p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 font-medium"
        >
          Sign Out
        </button>
      </div>
      {/* Made by */}
      <div className="mt-10 pb-4 flex flex-col items-center gap-2">
        <p className="text-[11px] text-gray-400 dark:text-gray-600">
          Made by Pankaj
        </p>

        <div className="flex items-center gap-4">
          <a
            href="https://github.com/pankaj8782"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-300 transition"
          >
            <Github size={16} />
          </a>

          <a
            href="https://instagram.com/pankajshah.1"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 dark:text-gray-600 hover:text-pink-500 transition"
          >
            <Instagram size={16} />
          </a>

          <a
            href="https://linkedin.com/in/pankaj8782"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 dark:text-gray-600 hover:text-blue-500 transition"
          >
            <LinkedinIcon size={16} />
          </a>

          <a
            href="https://wa.me/917289040307"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 dark:text-gray-600 hover:text-green-500 transition"
          >
            <MessageCircle size={16} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
