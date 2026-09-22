// src/App.tsx
import React, { useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NavigationProvider, useNavigation } from "./context/NavigationContext";

import LoginPage from "./pages/LoginPage";
import InventoryPage from "./pages/InventoryPage";
import ProfilePage from "./pages/ProfilePage";
import NotificationsPage from "./pages/NotificationsPage";
import ProductsPage from "./pages/ProductsPage";
import AutoInventoryPage from "./pages/AutoInventory";
import StockPage from "./pages/StockPage";
import EditProfilePage from "./pages/EditProfilePage";

import ProtectedRoute from "./components/ProtectedRoute";
import AppNavigation from "./components/AppNavigation";

import { setDarkStatusBar, setLightStatusBar } from "./statusBar";
import { useThemeColor } from "./hooks/useThemeColor";

const CurrentPage: React.FC = () => {
  const { currentPath, navigate } = useNavigation();

  useEffect(() => {
    if (currentPath === "/logout") navigate("/login");
  }, [currentPath, navigate]);

  switch (currentPath) {
    case "/login":        return <LoginPage />;
    case "/":             return <InventoryPage />;
    case "/products":     return <ProtectedRoute><ProductsPage /></ProtectedRoute>;
    case "/auto-inventory": return <ProtectedRoute><AutoInventoryPage /></ProtectedRoute>;
    case "/stock":        return <ProtectedRoute roles={["admin"]}><StockPage /></ProtectedRoute>;
    case "/profile":      return <ProtectedRoute><ProfilePage /></ProtectedRoute>;
    case "/edit-profile": return <ProtectedRoute><EditProfilePage /></ProtectedRoute>;
    case "/notifications": return <ProtectedRoute><NotificationsPage /></ProtectedRoute>;
    default:              return <InventoryPage />;
  }
};

const AppContent: React.FC = () => {
  const { user, initializing, darkMode } = useAuth();
  const { navigate, currentPath } = useNavigation();

  useEffect(() => {
    if (!initializing) {
      if (user && currentPath === "/login") navigate("/");
      else if (!user && currentPath !== "/login") navigate("/login");
    }
  }, [user, initializing, currentPath, navigate]);

  useEffect(() => {
    if (darkMode === "dark") setDarkStatusBar();
    else setLightStatusBar();
  }, [darkMode]);

  useThemeColor(darkMode === "dark");

  return (
    <div className="lg:pl-64 pb-20 lg:pb-0 flex flex-col min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">
      <main className="flex-1 overflow-y-auto">
        <CurrentPage />
      </main>
      {user && <AppNavigation />}
    </div>
  );
};

function App() {
  return (
    <NavigationProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </NavigationProvider>
  );
}

export default App;