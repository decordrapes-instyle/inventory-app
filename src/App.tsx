import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import InventoryPage from './pages/InventoryPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import ProtectedRoute from './components/ProtectedRoute';
import AppNavigation from './components/AppNavigation';
import EditProfilePage from './pages/EditProfilePage';
import ProductsPage from './pages/ProductsPage';
import AutoInventoryPage from './pages/AutoInventory';
import { setDarkStatusBar, setLightStatusBar } from './statusBar';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:pl-64 pb-20 lg:pb-0 flex flex-col min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/logout" element={<Navigate to="/login" replace />} />
          <Route path="/" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
          <Route path="/products" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
          <Route path="/auto-inventory" element={<ProtectedRoute><AutoInventoryPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/edit-profile" element={<ProtectedRoute><EditProfilePage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Bottom navigation */}
      {user && <AppNavigation />}
    </div>
  );
};

function AppWithStatusBar() {
  const { darkMode } = useAuth();

  useEffect(() => {
    if (darkMode === 'dark') setDarkStatusBar();
    else setLightStatusBar();
  }, [darkMode]);

  return <AppContent />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppWithStatusBar />
      </Router>
    </AuthProvider>
  );
}

export default App;
