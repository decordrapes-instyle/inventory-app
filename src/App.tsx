import React, { useEffect } from 'react';
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
import StockPage from './pages/StockPage';
import { setDarkStatusBar, setLightStatusBar } from './statusBar';
import { useNavigation } from './context/NavigationContext';

const CurrentPage = () => {
  const { currentPath, navigate } = useNavigation();

  useEffect(() => {
    if (currentPath === '/logout') {
      navigate('/login');
    }
  }, [currentPath, navigate]);

  switch (currentPath) {
    case '/login':
      return <LoginPage />;
    case '/':
      return <InventoryPage />;
    case '/products':
      return <ProtectedRoute><ProductsPage /></ProtectedRoute>;
    case '/auto-inventory':
      return <ProtectedRoute><AutoInventoryPage /></ProtectedRoute>;
    case '/stock':
      return <ProtectedRoute roles={['admin']}><StockPage /></ProtectedRoute>;
    case '/profile':
      return <ProtectedRoute><ProfilePage /></ProtectedRoute>;
    case '/edit-profile':
      return <ProtectedRoute><EditProfilePage /></ProtectedRoute>;
    case '/notifications':
      return <ProtectedRoute><NotificationsPage /></ProtectedRoute>;
    default:
      // Redirect to home for any unknown path
      return <InventoryPage />
  }
};

const AppContent: React.FC = () => {
  const { user, initializing, darkMode } = useAuth();
  const { navigate, currentPath } = useNavigation();

  useEffect(() => {
    if (!initializing) {
      if (user && currentPath === '/login') {
        navigate('/');
      } else if (!user && currentPath !== '/login') {
        navigate('/login');
      }
    }
  }, [user, initializing, currentPath, navigate,]);

  useEffect(() => {
    if (darkMode === 'dark') setDarkStatusBar();
    else setLightStatusBar();
  }, [darkMode]);

  return (
    <div className="lg:pl-64 pb-20 lg:pb-0 flex flex-col min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <CurrentPage />
      </main>

      {/* Bottom navigation */}
      {user && <AppNavigation />}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
