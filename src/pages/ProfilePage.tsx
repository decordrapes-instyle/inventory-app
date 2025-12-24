import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Moon,
  Sun,
  Edit3,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Database,
  Github,
  Instagram,
  MessageCircle,
  LinkedinIcon,
} from "lucide-react";
import { setDarkStatusBar, setLightStatusBar } from "../statusBar";
import { ref, get } from "firebase/database";
import { database } from "../config/firebase";
import toast from "react-hot-toast";

const ProfilePage: React.FC = () => {
  const { userProfile, logout, darkMode, updateDarkMode } = useAuth();
  const navigate = useNavigate();

  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<
    "synced" | "mismatch" | "checking" | "error"
  >("checking");
  const [localCount, setLocalCount] = useState<number | null>(null);
  const [serverCount, setServerCount] = useState<number | null>(null);

  const toggleDarkMode = () => {
    if (darkMode === "dark") {
      updateDarkMode("light");
      setLightStatusBar();
    } else {
      updateDarkMode("dark");
      setDarkStatusBar();
    }
  };

  // Check sync status by comparing local vs server item counts
  const checkSyncStatus = async () => {
    setSyncing(true);
    setSyncStatus("checking");

    try {
      // Get local count from localStorage (set by InventoryPage)
      const localData = localStorage.getItem("inventory_items");
      let localItemCount = 0;

      if (localData) {
        try {
          const items = JSON.parse(localData);
          localItemCount = items.length;
        } catch (e) {
          console.error("Error parsing local inventory:", e);
        }
      }
      setLocalCount(localItemCount);

      // Get server count from Firebase
      const inventoryRef = ref(database, "quotations/manualInventory");
      const snapshot = await get(inventoryRef);
      let serverItemCount = 0;

      if (snapshot.exists()) {
        const data = snapshot.val();
        serverItemCount = Object.keys(data).length;
      }
      setServerCount(serverItemCount);

      // Compare counts
      if (localItemCount === serverItemCount) {
        setSyncStatus("synced");
        toast.success("Inventory is synced ✓");
      } else {
        setSyncStatus("mismatch");
        toast.error("Sync mismatch detected");
      }
    } catch (error) {
      console.error("Sync check error:", error);
      setSyncStatus("error");
      toast.error("Failed to check sync");
    } finally {
      setSyncing(false);
    }
  };

  // Hard refresh - clear cache and reload
  const hardRefresh = () => {
    setSyncing(true);

    try {
      // Clear inventory cache
      localStorage.removeItem("inventory_items");

      // Clear image cache if exists
      const imageCacheKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.includes("inventory_image") || key?.includes("image_cache")) {
          imageCacheKeys.push(key);
        }
      }

      imageCacheKeys.forEach((key) => {
        localStorage.removeItem(key);
      });

      toast.success("Cache cleared");

      // Reload after 1 second
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Hard refresh error:", error);
      toast.error("Failed to refresh");
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  React.useEffect(() => {
    checkSyncStatus();
  }, []);

  return (
    <div className="pt-3 min-h-screen bg-white dark:bg-black pb-24">
      {/* Header */}
      <div className="pt-safe flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-900">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Profile
          </h1>
        </div>

        {/* Refresh Button */}
        <button
          onClick={checkSyncStatus}
          disabled={syncing}
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-900 disabled:opacity-50"
        >
          <RefreshCw
            className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${
              syncing ? "animate-spin" : ""
            }`}
          />
        </button>
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
        {/* Sync Status - Simple Message */}
        {syncStatus === "synced" && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-green-700 dark:text-green-300 font-medium">
              Synced • {localCount} items
            </span>
          </div>
        )}

        {syncStatus === "mismatch" && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <div>
                <p className="font-medium text-red-700 dark:text-red-300">
                  Sync Mismatch
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">
                  Local: {localCount} items • Server: {serverCount} items
                </p>
              </div>
            </div>
            <button
              onClick={hardRefresh}
              disabled={syncing}
              className="w-full py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <Database className="w-4 h-4" />
              {syncing ? "Refreshing..." : "Hard Refresh"}
            </button>
          </div>
        )}

        {syncStatus === "error" && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl flex items-center justify-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <span className="text-yellow-700 dark:text-yellow-300 font-medium">
              Error checking sync
            </span>
          </div>
        )}

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

        {/* Simple Hard Refresh Button at Bottom */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={hardRefresh}
            disabled={syncing}
            className="w-full py-3 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Refreshing..." : "Hard Refresh App"}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
            Clears cache and reloads data
          </p>
        </div>

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
