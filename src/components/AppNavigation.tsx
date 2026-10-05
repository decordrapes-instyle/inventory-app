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
/* -------------------- Floating Glossy Glass Pill Item -------------------- */
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
        px-3.5 sm:px-4.5 py-2.5 sm:py-3 rounded-full text-xs font-semibold
        transition-all duration-200 active:scale-95
        ${
          isActive
            ? "bg-neutral-950/90 text-white dark:bg-white/95 dark:text-neutral-950 shadow-[0_4px_14px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.4)]"
            : "text-neutral-800 dark:text-neutral-200 hover:text-black dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/10"
        }`}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon
        className={`w-[18px] h-[18px] sm:w-5 sm:h-5 transition-transform duration-200 ${
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

      {/* Floating Glossy Glass Pill Navbar (iPad & Mobile screens) */}
      <nav
        aria-label="Main Navigation"
        className="xl:hidden fixed left-1/2 -translate-x-1/2 z-40 select-none pointer-events-auto"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
      >
        <div
          className="relative flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5
            rounded-full
            bg-white/35 dark:bg-neutral-950/45
            bg-gradient-to-b from-white/55 via-white/20 to-white/35
            dark:from-white/15 dark:via-neutral-900/30 dark:to-neutral-950/60
            backdrop-blur-3xl backdrop-saturate-[220%]
            border border-white/80 dark:border-white/25
            shadow-[0_24px_50px_-10px_rgba(0,0,0,0.22),0_8px_20px_rgba(0,0,0,0.08),inset_0_1.5px_2px_rgba(255,255,255,0.95),inset_0_-1.5px_2px_rgba(0,0,0,0.08),inset_0_0_20px_rgba(255,255,255,0.35)]
            dark:shadow-[0_28px_60px_-10px_rgba(0,0,0,0.95),0_10px_25px_rgba(0,0,0,0.6),inset_0_1.5px_2px_rgba(255,255,255,0.4),inset_0_-1.5px_2px_rgba(0,0,0,0.4),inset_0_0_20px_rgba(255,255,255,0.05)]
            overflow-hidden"
        >
          {/* Glossy top specular reflection highlight sheen */}
          <div className="absolute inset-x-2 top-0 h-[48%] rounded-t-full bg-gradient-to-b from-white/75 via-white/25 to-transparent pointer-events-none dark:from-white/30 dark:via-white/5" />

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
