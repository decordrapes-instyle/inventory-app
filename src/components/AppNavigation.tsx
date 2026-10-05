import React, { memo } from "react";
import { Home, Package, Bell, TrendingUp, User } from "lucide-react";
import { useNavigation } from "../context/NavigationContext";
import { useAuth } from "../context/AuthContext";

/* -------------------- Types -------------------- */
type NavItemProps = {
  to: string;
  icon: React.ElementType;
  label: string;
};

/* -------------------- Mobile Nav Item -------------------- */
/* -------------------- Floating Glass Pill Item -------------------- */
const FloatingPillNavItem = memo(({ to, icon: Icon, label }: NavItemProps) => {
  const { navigate, currentPath } = useNavigation();
  const isActive = currentPath === to;

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        navigate(to);
      }}
      className={`group relative flex items-center justify-center gap-1.5 sm:gap-2
        px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs font-semibold
        transition-transform duration-150 active:scale-95
        ${
          isActive
            ? "bg-neutral-950/90 text-white dark:bg-white/95 dark:text-neutral-950 shadow-[0_2px_8px_rgba(0,0,0,0.18)]"
            : "text-neutral-800 dark:text-neutral-200 hover:text-black dark:hover:text-white hover:bg-white/25 dark:hover:bg-white/10"
        }`}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon
        className={`w-[18px] h-[18px] sm:w-5 sm:h-5 transition-transform duration-150 ${
          isActive ? "scale-105" : "group-hover:scale-105"
        }`}
      />
      <span
        className={`text-[12px] sm:text-[13px] tracking-tight whitespace-nowrap ${
          isActive ? "inline" : "hidden sm:inline"
        }`}
      >
        {label}
      </span>
    </button>
  );
});
FloatingPillNavItem.displayName = "FloatingPillNavItem";

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
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 ${
        isActive
          ? "bg-slate-900 text-white dark:bg-neutral-200 dark:text-neutral-900 font-semibold shadow-sm"
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
  const isAdmin = userProfile?.role === "admin";

  if (!initializing && !user) return null;

  return (
    <>
      {/* Desktop Sidebar (Only on large desktop screens >= xl) */}
      <aside className="hidden xl:flex xl:fixed xl:inset-y-0 xl:left-0 xl:w-64 xl:flex-col bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800 z-40 select-none">
        <div className="flex flex-col flex-1 p-4 gap-2">
          <div className="flex items-center gap-2.5 mb-4 px-2">
            <img
              src="https://res.cloudinary.com/dmiwq3l2s/image/upload/v1764768203/vfw82jmca7zl5p86czhy.png"
              alt="Logo"
              className="w-8 h-8 rounded object-contain"
            />
            <span className="text-lg font-bold tracking-tight">Inventory</span>
          </div>

          <DesktopNavItem to="/" icon={Home} label="Home" />
          <DesktopNavItem to="/auto-inventory" icon={Package} label="Fabrics" />
          <DesktopNavItem to="/notifications" icon={Bell} label="Alerts" />
          {isAdmin && (
            <DesktopNavItem to="/stock" icon={TrendingUp} label="Stock" />
          )}

          <div className="mt-auto">
            <DesktopNavItem to="/profile" icon={User} label="Profile" />
          </div>
        </div>
      </aside>

      {/* Floating Real Apple Glass Pill Navbar (iPad & Mobile screens) */}
      <nav
        aria-label="Main Navigation"
        className="xl:hidden fixed left-1/2 z-40 select-none pointer-events-auto"
        style={{
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
          transform: "translate3d(-50%, 0, 0)",
          WebkitTransform: "translate3d(-50%, 0, 0)",
          willChange: "transform",
        }}
      >
        <div
          className="relative flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2
            rounded-full
            bg-white/[0.18] dark:bg-black/[0.4]
            backdrop-blur-xl
            border border-white/40 dark:border-white/15
            shadow-[0_12px_36px_rgba(0,0,0,0.12),inset_0_1px_0_0_rgba(255,255,255,0.6)]
            dark:shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.15)]"
          style={{
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            backdropFilter: "blur(20px) saturate(180%)",
          }}
        >
          <FloatingPillNavItem to="/" icon={Home} label="Home" />
          <FloatingPillNavItem to="/auto-inventory" icon={Package} label="Fabrics" />
          <FloatingPillNavItem to="/notifications" icon={Bell} label="Alerts" />
          {isAdmin && (
            <FloatingPillNavItem to="/stock" icon={TrendingUp} label="Stock" />
          )}
          <FloatingPillNavItem to="/profile" icon={User} label="Profile" />
        </div>
      </nav>
    </>
  );
};

export default memo(AppNavigation);
