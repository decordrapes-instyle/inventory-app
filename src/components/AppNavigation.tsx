import React, { memo, useMemo } from "react";
import { Home, Package, Bell, TrendingUp } from "lucide-react";
import { useNavigation } from "../context/NavigationContext";
import { useAuth } from "../context/AuthContext";

/* -------------------- Types -------------------- */
type NavItemProps = {
  to: string;
  icon: React.ElementType;
  label: string;
};

/* -------------------- Mobile Nav Item -------------------- */
const MobileNavItem = memo(({ to, icon: Icon, label }: NavItemProps) => {
  const { navigate, currentPath } = useNavigation();
  const isActive = currentPath === to;

  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        navigate(to);
      }}
      className="flex flex-col items-center justify-center h-full w-full"
    >
      <div className="relative flex flex-col items-center">
        {/* Active indicator */}
        {isActive && (
          <div
            className="absolute -top-1 left-1/2 -translate-x-1/2
                       w-16 h-8 rounded-full
                       bg-slate-600 dark:bg-neutral-300"
          />
        )}

        <div className="relative z-10 flex flex-col items-center">
          {/* Icon */}
          <Icon
            className={`w-6 h-6 transition-colors ${
              isActive
                ? "text-white dark:text-neutral-900"
                : "text-gray-500 dark:text-gray-500"
            }`}
          />

          {/* Label */}
          <span
            className={`text-xs mt-2 transition-all ${
              isActive
                ? "font-semibold text-gray-800 dark:text-gray-300"
                : "font-normal text-gray-500 dark:text-gray-500"
            }`}
          >
            {label}
          </span>
        </div>
      </div>
    </a>
  );
});
MobileNavItem.displayName = "MobileNavItem";

/* -------------------- Desktop Nav Item -------------------- */
const DesktopNavItem = memo(({ to, icon: Icon, label }: NavItemProps) => {
  const { navigate, currentPath } = useNavigation();
  const isActive = currentPath === to;

  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        navigate(to);
      }}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
        isActive
          ? "bg-slate-900 text-white dark:bg-neutral-200 dark:text-neutral-900 font-semibold"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-900"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-sm">{label}</span>
    </a>
  );
});
DesktopNavItem.displayName = "DesktopNavItem";

/* -------------------- Main Navigation -------------------- */
const AppNavigation: React.FC = () => {
  const { user, userProfile, initializing } = useAuth();
  const { navigate, currentPath } = useNavigation();

  const isAdmin = userProfile?.role === "admin";

  const avatar = useMemo(() => {
    if (!userProfile) return "";
    return (
      userProfile.profileImage ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        userProfile.displayName || "User"
      )}&background=111827&color=fff`
    );
  }, [userProfile]);

  if (!initializing && !user) return null;

  const isProfileActive = currentPath === "/profile";

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:flex lg:flex-col bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800">
        <div className="flex flex-col flex-1 p-4 gap-2">
          <h1 className="text-lg font-bold mb-4">Inventory</h1>

          <DesktopNavItem to="/" icon={Home} label="Home" />
          <DesktopNavItem to="/auto-inventory" icon={Package} label="Fabrics" />
          <DesktopNavItem to="/notifications" icon={Bell} label="Alerts" />
          {isAdmin && (
            <DesktopNavItem to="/stock" icon={TrendingUp} label="Stock" />
          )}

          <div className="mt-auto">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                navigate("/profile");
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isProfileActive
                  ? "bg-slate-900 text-white dark:bg-neutral-200 dark:text-neutral-900 font-semibold"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-900"
              }`}
            >
              <img
                src={avatar}
                className="w-8 h-8 rounded-full object-cover"
                alt="Profile"
                loading="lazy"
              />
              <span className="text-sm">Profile</span>
            </a>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 pb-safe">
        <div className={`grid ${isAdmin ? "grid-cols-5" : "grid-cols-4"} h-20`}>
          <MobileNavItem to="/" icon={Home} label="Home" />
          <MobileNavItem to="/auto-inventory" icon={Package} label="Fabrics" />
          <MobileNavItem to="/notifications" icon={Bell} label="Alerts" />
          {isAdmin && (
            <MobileNavItem to="/stock" icon={TrendingUp} label="Stock" />
          )}

          {/* Profile */}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate("/profile");
            }}
            className="flex flex-col items-center justify-center h-full w-full"
          >
            <img
              src={avatar}
              className={`w-6 h-6 rounded-full object-cover transition-all ${
                isProfileActive
                  ? "ring-2 ring-slate-800 dark:ring-neutral-200"
                  : ""
              }`}
              alt="Profile"
              loading="lazy"
            />
            <span
              className={`text-xs mt-2 ${
                isProfileActive
                  ? "font-semibold text-gray-800 dark:text-gray-300"
                  : "text-gray-500 dark:text-gray-500"
              }`}
            >
              Profile
            </span>
          </a>
        </div>
      </nav>
    </>
  );
};

export default memo(AppNavigation);
