import { useAuth } from '../context/AuthContext';
import { NavLink } from 'react-router-dom';
import { Package, Home, Bell } from 'lucide-react';

const AppNavigation: React.FC = () => {
  const { userProfile } = useAuth();

  const NavItem = ({
    to,
    icon: Icon,
    label,
  }: {
    to: string;
    icon: React.ElementType;
    label: string;
    showBadge?: boolean;
  }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center h-full w-full transition-all ${
          isActive
            ? 'text-blue-600 dark:text-blue-400 font-bold'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }`
      }
    >
      {({ isActive }) => (
        <div className="relative flex flex-col items-center">
          {/* Pill background */}
          {isActive && (
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-16 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full transition-all duration-200"></div>
          )}

          <div className="relative z-10 flex flex-col items-center">
            <Icon
              className={`w-6 h-6 transition-transform ${
                isActive ? 'scale-110' : ''
              }`}
            />

            {/* Label */}
            <span
              className={`text-xs mt-2 transition-all ${
                isActive ? 'font-bold' : 'font-medium'
              }`}
            >
              {label}
            </span>
          </div>
        </div>
      )}
    </NavLink>
  );


  const ProfileNavItem = ({
    to,
    label,
  }: {
    to: string;
    label: string;
  }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center h-full w-full transition-all ${
          isActive
            ? 'text-blue-600 dark:text-blue-400 font-bold'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }`
      }
    >
      {({ isActive }) => (
        <div className="relative flex flex-col items-center">
          {/* Pill background */}
          {isActive && (
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-16 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full transition-all duration-200"></div>
          )}

          <div className="relative z-10 flex flex-col items-center">
            <img
              src={
                userProfile?.profileImage ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  userProfile?.displayName || 'User'
                )}&background=4f46e5&color=fff`
              }
              className={`w-6 h-6 rounded-full object-cover transition-transform ${
                isActive ? 'scale-105' : ''
              }`}
              alt="Profile"
            />

            {/* Label */}
            <span
              className={`text-xs mt-2 transition-all ${
                isActive ? 'font-bold' : 'font-medium'
              }`}
            >
              {label}
            </span>
          </div>
        </div>
      )}
    </NavLink>
  );


  return (
    <>
      {/* Fixed bottom navigation with safe-area */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 pb-safe">
        <div className="grid grid-cols-4 h-20">
          <div className="flex flex-col items-center justify-center">
            <NavItem to="/" icon={Home} label={'Home'} />
          </div>

          <div className="flex flex-col items-center justify-center">
            <NavItem to="/auto-inventory" icon={Package} label={'Fabrics'} />
          </div>

          <div className="flex flex-col items-center justify-center">
            <NavItem to="/notifications" icon={Bell} showBadge label={'Alerts'} />
          </div>

          <div className="flex flex-col items-center justify-center">
            <ProfileNavItem to="/profile" label={'Profile'} />
          </div>
        </div>
      </div>
    </>
  );
};

export default AppNavigation;