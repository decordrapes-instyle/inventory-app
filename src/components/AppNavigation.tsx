import { NavLink } from 'react-router-dom';
import { Home, Package, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/* -------------------- Types -------------------- */
type NavItemProps = {
  to: string;
  icon: React.ElementType;
  label: string;
};

/* -------------------- Mobile / Tablet Nav Item -------------------- */
const MobileNavItem = ({ to, icon: Icon, label }: NavItemProps) => (
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
        {isActive && (
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-16 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full" />
        )}

        <div className="relative z-10 flex flex-col items-center">
          <Icon
            className={`w-6 h-6 transition-transform ${
              isActive ? 'scale-110' : ''
            }`}
          />
          <span className="text-xs mt-2">{label}</span>
        </div>
      </div>
    )}
  </NavLink>
);

/* -------------------- Desktop Nav Item -------------------- */
const DesktopNavItem = ({ to, icon: Icon, label }: NavItemProps) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
        isActive
          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`
    }
  >
    <Icon className="w-5 h-5" />
    <span className="text-sm">{label}</span>
  </NavLink>
);

/* -------------------- Main Component -------------------- */
const AppNavigation: React.FC = () => {
  const { userProfile } = useAuth();

  const avatar =
    userProfile?.profileImage ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      userProfile?.displayName || 'User'
    )}&background=4f46e5&color=fff`;

  return (
    <>
      {/* -------------------- Desktop Sidebar -------------------- */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:flex lg:flex-col bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800">
        <div className="flex flex-col flex-1 p-4 gap-2">
          <h1 className="text-lg font-bold mb-4">Inventory</h1>

          <DesktopNavItem to="/" icon={Home} label="Home" />
          <DesktopNavItem to="/auto-inventory" icon={Package} label="Fabrics" />
          <DesktopNavItem to="/notifications" icon={Bell} label="Alerts" />

          <div className="mt-auto">
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`
              }
            >
              <img
                src={avatar}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover"
              />
              <span className="text-sm">Profile</span>
            </NavLink>
          </div>
        </div>
      </aside>

      {/* -------------------- Mobile / Tablet Bottom Nav -------------------- */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 pb-safe">
        <div className="grid grid-cols-4 h-20">
          <MobileNavItem to="/" icon={Home} label="Home" />
          <MobileNavItem
            to="/auto-inventory"
            icon={Package}
            label="Fabrics"
          />
          <MobileNavItem to="/notifications" icon={Bell} label="Alerts" />

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center h-full w-full ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-gray-500 dark:text-gray-400'
              }`
            }
          >
            <img
              src={avatar}
              className="w-6 h-6 rounded-full object-cover"
              alt="Profile"
            />
            <span className="text-xs mt-2">Profile</span>
          </NavLink>
        </div>
      </nav>
    </>
  );
};

export default AppNavigation;
