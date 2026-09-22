// src/pages/ProfilePage.tsx
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigation, useBackHandler } from "../context/NavigationContext";
import {
  ArrowLeft,
  User,
  Moon,
  Sun,
  Github,
  Instagram,
  MessageCircle,
  Linkedin as LinkedinIcon,
  LogOut,
  ShieldCheck,
  Phone,
  MapPin,
  FileText,
  Calendar,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

const SAFE_TOP = "env(safe-area-inset-top, 0px)";

type ExtendedProfile = {
  uid: string;
  email: string;
  displayName: string;
  profileImage: string;
  role?: string;
  createdAt?: number;
  phone?: string;
  bio?: string;
  location?: string;
};

const LogoutConfirm: React.FC<{
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ open, onClose, onConfirm }) => {
  const [dragY, setDragY] = useState(0);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startT = useRef(0);

  useEffect(() => {
    if (!open) {
      setDragY(0);
      dragging.current = false;
    }
  }, [open]);

  const begin = (y: number) => {
    dragging.current = true;
    startY.current = y;
    startT.current = performance.now();
  };
  const move = (y: number) => {
    if (!dragging.current) return;
    const d = y - startY.current;
    if (d > 0) setDragY(d);
  };
  const end = (y: number) => {
    if (!dragging.current) return;
    const d = y - startY.current;
    const v = d / Math.max(1, performance.now() - startT.current);
    dragging.current = false;
    if (d > 100 || v > 0.5) onClose();
    else setDragY(0);
  };

  if (!open) return null;
  const backdropOpacity = Math.max(0.25, 1 - dragY / 500);

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: backdropOpacity * 0.6, transition: "opacity 150ms" }}
        onClick={onClose}
      />
      <div
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-neutral-950 rounded-t-[28px] shadow-2xl"
        style={{
          transform: `translateY(${dragY}px)`,
          transition: dragging.current
            ? "none"
            : "transform 300ms cubic-bezier(0.32, 0.72, 0, 1)",
          touchAction: "none",
        }}
      >
        <div
          className="flex justify-center pt-3 pb-2 cursor-grab touch-none"
          onTouchStart={(e) => begin(e.touches[0].clientY)}
          onTouchMove={(e) => move(e.touches[0].clientY)}
          onTouchEnd={(e) => end(e.changedTouches[0].clientY)}
          onMouseDown={(e) => {
            begin(e.clientY);
            const mv = (ev: MouseEvent) => move(ev.clientY);
            const up = (ev: MouseEvent) => {
              end(ev.clientY);
              document.removeEventListener("mousemove", mv);
              document.removeEventListener("mouseup", up);
            };
            document.addEventListener("mousemove", mv);
            document.addEventListener("mouseup", up);
          }}
        >
          <div className="w-10 h-1.5 bg-black/25 dark:bg-white/25 rounded-full" />
        </div>

        <div className="px-6 pt-3 pb-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
            <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-center text-lg font-bold mb-1">Sign out?</h3>
          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mb-6 max-w-xs mx-auto">
            You'll need to sign in again to access your inventory.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 bg-neutral-100 dark:bg-neutral-900 rounded-2xl font-semibold text-neutral-700 dark:text-neutral-300 active:scale-[0.98] transition"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-semibold active:scale-[0.98] transition shadow-sm"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Row: React.FC<{
  icon: React.ReactNode;
  iconBg?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}> = ({ icon, iconBg, title, subtitle, right, onClick, danger }) => {
  const Tag: any = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`w-full flex items-center gap-3.5 py-3.5 text-left ${
        onClick ? "active:opacity-60 transition-opacity" : ""
      }`}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          iconBg || "bg-neutral-100 dark:bg-neutral-900"
        }`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-[15px] font-medium truncate ${
            danger ? "text-red-600 dark:text-red-400" : ""
          }`}
        >
          {title}
        </p>
        {subtitle && (
          <p className="text-[12px] text-neutral-500 dark:text-neutral-500 mt-0.5 truncate">
            {subtitle}
          </p>
        )}
      </div>
      {right}
    </Tag>
  );
};

const ProfilePage: React.FC = () => {
  const { userProfile, logout, darkMode, updateDarkMode } = useAuth();
  const { navigate, goBack } = useNavigation();
  const [showLogout, setShowLogout] = useState(false);

  /* ---------- hardware / browser back ---------- */
  useBackHandler(showLogout, () => setShowLogout(false));

  const profile = userProfile as ExtendedProfile | null;

  const toggleDarkMode = () =>
    updateDarkMode(darkMode === "dark" ? "light" : "dark");

  const confirmLogout = async () => {
    setShowLogout(false);
    try {
      await logout();
      navigate("/login");
    } catch {
      toast.error("Failed to sign out");
    }
  };

  const initials =
    profile?.displayName?.trim().charAt(0)?.toUpperCase() || "U";
  const roleLabel = profile?.role
    ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
    : null;
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      })
    : null;

  const hasAbout = !!(profile?.phone || profile?.location || profile?.bio);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white pb-24">
      <header
        style={{ paddingTop: SAFE_TOP }}
        className="fixed top-0 left-0 right-0 z-30
          bg-white/85 dark:bg-black/85 backdrop-blur-xl
          shadow-[0_1px_0_0_rgba(0,0,0,0.04),0_10px_28px_-14px_rgba(0,0,0,0.10)]
          dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04),0_10px_28px_-14px_rgba(0,0,0,0.8)]"
      >
        <div className="h-14 flex items-center px-3 gap-1.5">
          <button
            onClick={goBack}
            className="p-2 -ml-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold truncate flex-1 ml-1">Profile</h1>
        </div>
      </header>

      <div style={{ height: `calc(56px + ${SAFE_TOP})` }} />

      <div className="px-6 pt-8 pb-2 flex flex-col items-center text-center">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800">
          {profile?.profileImage ? (
            <img
              src={profile.profileImage}
              alt={profile.displayName || "Profile"}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-3xl font-semibold text-neutral-500 dark:text-neutral-400">
                {initials}
              </span>
            </div>
          )}
        </div>

        <h2 className="mt-4 text-xl font-bold tracking-tight truncate max-w-[260px]">
          {profile?.displayName || "Unnamed"}
        </h2>
        <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400 truncate max-w-[280px]">
          {profile?.email || "—"}
        </p>

        {(roleLabel || memberSince) && (
          <div className="mt-3 flex items-center gap-2 flex-wrap justify-center">
            {roleLabel && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                bg-neutral-200/70 dark:bg-neutral-800/70
                text-neutral-700 dark:text-neutral-300
                text-[10px] font-semibold uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3" />
                {roleLabel}
              </span>
            )}
            {memberSince && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                bg-neutral-200/70 dark:bg-neutral-800/70
                text-neutral-700 dark:text-neutral-300
                text-[10px] font-medium">
                <Calendar className="w-3 h-3" />
                Since {memberSince}
              </span>
            )}
          </div>
        )}
      </div>

      {hasAbout && (
        <div className="px-6 pt-8">
          <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-neutral-400 dark:text-neutral-600 mb-1">
            About
          </p>
          <div className="space-y-3">
            {profile?.phone && (
              <div className="flex items-start gap-3 py-2">
                <Phone className="w-4 h-4 text-neutral-400 dark:text-neutral-600 mt-0.5 shrink-0" />
                <p className="text-[14px] text-neutral-800 dark:text-neutral-200">
                  {profile.phone}
                </p>
              </div>
            )}
            {profile?.location && (
              <div className="flex items-start gap-3 py-2">
                <MapPin className="w-4 h-4 text-neutral-400 dark:text-neutral-600 mt-0.5 shrink-0" />
                <p className="text-[14px] text-neutral-800 dark:text-neutral-200">
                  {profile.location}
                </p>
              </div>
            )}
            {profile?.bio && (
              <div className="flex items-start gap-3 py-2">
                <FileText className="w-4 h-4 text-neutral-400 dark:text-neutral-600 mt-0.5 shrink-0" />
                <p className="text-[14px] text-neutral-800 dark:text-neutral-200 leading-relaxed">
                  {profile.bio}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="px-6 pt-8">
        <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-neutral-400 dark:text-neutral-600 mb-1">
          Settings
        </p>

        <Row
          icon={
            darkMode === "dark" ? (
              <Moon className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
            ) : (
              <Sun className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
            )
          }
          title="Dark mode"
          subtitle={darkMode === "dark" ? "On" : "Off"}
          onClick={toggleDarkMode}
          right={
            <span
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                darkMode === "dark"
                  ? "bg-neutral-900 dark:bg-white"
                  : "bg-neutral-300 dark:bg-neutral-700"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full transition-transform ${
                  darkMode === "dark"
                    ? "translate-x-5 bg-white dark:bg-neutral-900"
                    : "translate-x-0 bg-white"
                }`}
              />
            </span>
          }
        />

        <Row
          icon={<User className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />}
          title="Edit profile"
          subtitle="Name, phone, photo and bio"
          onClick={() => navigate("/edit-profile")}
          right={
            <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
          }
        />

        <Row
          icon={<LogOut className="w-4 h-4 text-red-600 dark:text-red-400" />}
          iconBg="bg-red-50 dark:bg-red-950/40"
          title="Sign out"
          onClick={() => setShowLogout(true)}
          danger
        />
      </div>

      <div className="mt-12 pb-8 flex flex-col items-center gap-3">
        <p className="text-[10px] text-neutral-400 dark:text-neutral-600 tracking-wider">
          Made by Pankaj
        </p>

        <div className="flex items-center gap-1.5">
          <a
            href="https://github.com/pankaj8782"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="w-9 h-9 rounded-full flex items-center justify-center
              text-neutral-400 dark:text-neutral-600
              hover:text-neutral-900 dark:hover:text-white
              active:scale-90 transition"
          >
            <Github size={16} />
          </a>
          <a
            href="https://instagram.com/pankajshah.1"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="w-9 h-9 rounded-full flex items-center justify-center
              text-neutral-400 dark:text-neutral-600
              hover:text-pink-500
              active:scale-90 transition"
          >
            <Instagram size={16} />
          </a>
          <a
            href="https://linkedin.com/in/pankaj8782"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="w-9 h-9 rounded-full flex items-center justify-center
              text-neutral-400 dark:text-neutral-600
              hover:text-blue-500
              active:scale-90 transition"
          >
            <LinkedinIcon size={16} />
          </a>
          <a
            href="https://wa.me/917289040307"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            className="w-9 h-9 rounded-full flex items-center justify-center
              text-neutral-400 dark:text-neutral-600
              hover:text-green-500
              active:scale-90 transition"
          >
            <MessageCircle size={16} />
          </a>
        </div>
      </div>

      <LogoutConfirm
        open={showLogout}
        onClose={() => setShowLogout(false)}
        onConfirm={confirmLogout}
      />
    </div>
  );
};

export default ProfilePage;