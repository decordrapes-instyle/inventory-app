import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import { AlertCircle, LogOut } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: ('admin' | 'production')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
  const { user, userProfile } = useAuth();
  const { navigate } = useNavigation();

  if (!user || !userProfile) {
    return null; 
  }

  const allowedRoles = roles || ['admin', 'production'];
  if (!allowedRoles.includes(userProfile.role as 'admin' | 'production')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You do not have the required permissions to access this page.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Current Role:</span> {userProfile.role}
            </p>
            <p className="text-sm text-gray-700 mt-2">
              <span className="font-semibold">Account:</span> {userProfile.email}
            </p>
          </div>
          <button
            onClick={() => navigate('/logout')}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
