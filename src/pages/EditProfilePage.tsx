// src/pages/EditProfilePage.tsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "../context/NavigationContext";
import {
  ArrowLeft,
  Camera,
  Loader2,
  AlertCircle,
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

/* ---------- reusable field ---------- */
const Field: React.FC<{
  label: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, hint, children }) => (
  <div className="py-3.5">
    <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-neutral-500 dark:text-neutral-500 mb-2">
      {label}
    </label>
    {children}
    {hint && (
      <p className="text-[11px] text-neutral-400 dark:text-neutral-600 mt-1.5">
        {hint}
      </p>
    )}
  </div>
);

const inputClass =
  "w-full h-12 px-4 rounded-2xl bg-white dark:bg-neutral-950 " +
  "border border-gray-200 dark:border-neutral-800 " +
  "text-[15px] text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 " +
  "focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 " +
  "focus:ring-2 focus:ring-neutral-900/5 dark:focus:ring-white/5 transition";

/* ============================================================
   Page
   ============================================================ */
const EditProfilePage: React.FC = () => {
  const { userProfile, updateProfile } = useAuth();
  const { navigate, goBack } = useNavigation();

  const profile = userProfile as ExtendedProfile | null;

  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [location, setLocation] = useState(profile?.location || "");
  const [profileImage, setProfileImage] = useState(profile?.profileImage || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // keep local state synced if profile arrives late
  useEffect(() => {
    if (!profile) return;
    setDisplayName((v) => v || profile.displayName || "");
    setPhone((v) => v || profile.phone || "");
    setBio((v) => v || profile.bio || "");
    setLocation((v) => v || profile.location || "");
    setProfileImage((v) => v || profile.profileImage || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.uid]);

  const isDirty =
    displayName.trim() !== (profile?.displayName || "").trim() ||
    phone.trim() !== (profile?.phone || "").trim() ||
    bio.trim() !== (profile?.bio || "").trim() ||
    location.trim() !== (profile?.location || "").trim() ||
    profileImage !== (profile?.profileImage || "");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 3 * 1024 * 1024) {
        toast.error("Image must be under 3 MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfileImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loading) return;
    if (!displayName.trim() || displayName.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        profileImage,
        phone: phone.trim(),
        bio: bio.trim(),
        location: location.trim(),
      } as any);
      toast.success("Profile updated");
      navigate("/profile");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to update profile");
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const initials =
    displayName?.trim().charAt(0)?.toUpperCase() ||
    profile?.displayName?.trim().charAt(0)?.toUpperCase() ||
    "U";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white pb-24">
      {/* ============== SOFT HEADER ============== */}
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
          <h1 className="text-base font-bold truncate flex-1 ml-1">
            Edit profile
          </h1>
          <button
            onClick={() => handleSubmit()}
            disabled={!isDirty || loading}
            className="px-3 py-2 rounded-full text-[14px] font-semibold
              text-neutral-900 dark:text-white
              hover:bg-neutral-100 dark:hover:bg-neutral-900
              active:scale-95 transition
              disabled:opacity-30 disabled:pointer-events-none"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving
              </span>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </header>

      <div style={{ height: `calc(56px + ${SAFE_TOP})` }} />

      <form onSubmit={handleSubmit}>
        {/* ============== AVATAR — plain, no card ============== */}
        <div className="px-6 pt-8 pb-6 flex flex-col items-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-900 shadow-sm">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-neutral-500 dark:text-neutral-400">
                    {initials}
                  </span>
                </div>
              )}
            </div>

            <label
              htmlFor="profile-image-upload"
              className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full
                bg-neutral-900 dark:bg-white
                flex items-center justify-center cursor-pointer shadow-lg
                ring-4 ring-gray-50 dark:ring-black
                active:scale-90 transition"
              aria-label="Change photo"
            >
              <Camera className="w-4 h-4 text-white dark:text-black" />
              <input
                id="profile-image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </label>
          </div>

          <p className="mt-3 text-[11px] text-neutral-500 dark:text-neutral-500">
            Tap camera to change photo · JPG or PNG, up to 3 MB
          </p>
        </div>

        {/* ============== FIELDS — hairline list ============== */}
        <div className="px-6">
          <div className="divide-y divide-neutral-200/70 dark:divide-neutral-900">
            <Field label="Display name">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className={inputClass}
                maxLength={60}
              />
            </Field>

            <Field
              label="Email"
              hint="Email can't be changed from here."
            >
              <input
                type="email"
                value={profile?.email || ""}
                disabled
                className={inputClass + " opacity-60 cursor-not-allowed"}
              />
            </Field>

            <Field label="Phone">
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className={inputClass}
                maxLength={20}
              />
            </Field>

            <Field label="Location">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, country"
                className={inputClass}
                maxLength={80}
              />
            </Field>

            <Field
              label="Bio"
              hint={`${bio.length}/200 characters`}
            >
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 200))}
                placeholder="A short note about you or your role"
                rows={3}
                className={
                  inputClass +
                  " h-auto py-3 resize-none leading-relaxed"
                }
              />
            </Field>
          </div>
        </div>

        {/* ============== ERROR ============== */}
        {error && (
          <div className="px-6 pt-4">
            <div className="flex items-start gap-2 p-3 rounded-2xl
              bg-red-50 dark:bg-red-950/30
              border border-red-100 dark:border-red-900/50">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-[13px] text-red-700 dark:text-red-300">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* ============== SUBMIT ============== */}
        <div className="px-6 pt-8">
          <button
            type="submit"
            disabled={!isDirty || loading}
            className="w-full h-14 rounded-2xl font-semibold text-[15px]
              bg-neutral-900 dark:bg-white text-white dark:text-black
              active:scale-[0.98] transition
              disabled:opacity-30 disabled:pointer-events-none
              flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </button>

          <button
            type="button"
            onClick={goBack}
            className="w-full h-12 mt-2 rounded-2xl text-[14px] font-medium
              text-neutral-600 dark:text-neutral-400
              hover:bg-neutral-100 dark:hover:bg-neutral-900
              active:scale-[0.98] transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProfilePage;