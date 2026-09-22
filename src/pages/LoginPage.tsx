// src/pages/LoginPage.tsx
import React, { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useNavigation } from "../context/NavigationContext";
import { useAuth } from "../context/AuthContext";
import { ArrowRight, Boxes, Zap, WifiOff } from "lucide-react";

const IS_NATIVE = Capacitor.isNativePlatform();

interface AppInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}
const AppInput: React.FC<AppInputProps> = ({ label, ...props }) => (
  <div>
    <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
      {label}
    </label>
    <input
      {...props}
      className="w-full h-14 rounded-2xl px-4 text-base outline-none transition
        bg-neutral-50 text-black placeholder-neutral-400 border border-neutral-200
        focus:ring-2 focus:ring-black focus:border-black
        dark:bg-neutral-900 dark:text-white dark:placeholder-neutral-500
        dark:border-neutral-800 dark:focus:ring-white dark:focus:border-white"
    />
  </div>
);

/* ------------ Shared auth form ------------ */
const AuthForm: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const { login, signup } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const valid = isLogin
    ? email.includes("@") && password.length >= 6
    : email.includes("@") && password.length >= 6 && displayName.trim().length >= 2;

  const submit = async () => {
    if (!valid || loading) return;
    setLoading(true);
    setError("");
    try {
      if (isLogin) await login(email.trim(), password);
      else await signup(email.trim(), password, displayName.trim());
      onDone();
    } catch (e: any) {
      setError(e?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const onEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") submit();
  };

  return (
    <div className="flex-1 px-6 space-y-4">
      {!isLogin && (
        <AppInput
          label="Full Name"
          placeholder="Your name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          onKeyDown={onEnter}
          autoComplete="name"
        />
      )}
      <AppInput
        label="Email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={onEnter}
        autoComplete="email"
      />
      <AppInput
        label="Password"
        type={showPassword ? "text" : "password"}
        placeholder="Minimum 6 characters"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={onEnter}
        autoComplete={isLogin ? "current-password" : "new-password"}
      />

      <label className="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300">
        <input
          type="checkbox"
          checked={showPassword}
          onChange={(e) => setShowPassword(e.target.checked)}
          className="accent-black dark:accent-white"
        />
        Show password
      </label>

      {error && (
        <div className="rounded-2xl border px-4 py-3
          bg-red-50 border-red-200 text-red-600
          dark:bg-red-950 dark:border-red-800 dark:text-red-400">
          <p className="text-sm">{error}</p>
        </div>
      )}

      <button
        disabled={!valid || loading}
        onClick={submit}
        className="w-full h-14 rounded-2xl font-semibold transition
          bg-black text-white dark:bg-white dark:text-black
          disabled:opacity-40 active:scale-[0.98]
          shadow-sm hover:shadow-md"
      >
        {loading ? "Processing…" : isLogin ? "Sign In" : "Create Account"}
      </button>

      <button
        onClick={() => { setIsLogin(!isLogin); setError(""); }}
        className="w-full text-sm text-neutral-600 dark:text-neutral-400 pt-2"
      >
        {isLogin ? (
          <>Don&apos;t have an account? <span className="font-semibold text-black dark:text-white">Sign up</span></>
        ) : (
          <>Already have an account? <span className="font-semibold text-black dark:text-white">Sign in</span></>
        )}
      </button>
    </div>
  );
};

/* ------------ Native onboarding ------------ */
const slides = [
  {
    Icon: Boxes,
    tint: "from-indigo-500 to-purple-600",
    title: "All your fabric, in one place",
    body: "Track every roll, every meter, every movement — without notebooks.",
  },
  {
    Icon: Zap,
    tint: "from-amber-500 to-orange-600",
    title: "Realtime. Millisecond fast.",
    body: "Stock changes propagate to every device on your team instantly.",
  },
  {
    Icon: WifiOff,
    tint: "from-emerald-500 to-teal-600",
    title: "Works without signal",
    body: "Add stock in the basement. It syncs the moment you're back online.",
  },
];

const NativeOnboarding: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [step, setStep] = useState(0);
  const [showAuth, setShowAuth] = useState(false);

  if (showAuth) {
    return (
      <div className="min-h-screen flex flex-col max-w-md mx-auto bg-white text-black dark:bg-neutral-950 dark:text-white">
        <div className="px-6 pt-14 pb-6">
          <img
            src="https://res.cloudinary.com/dmiwq3l2s/image/upload/v1764768203/vfw82jmca7zl5p86czhy.png"
            alt="Logo"
            className="w-14 h-14 mb-6 object-contain"
          />
          <h1 className="text-3xl font-bold">Welcome</h1>
          <p className="mt-2 text-neutral-500 dark:text-neutral-400">
            Sign in to your workspace
          </p>
        </div>
        <AuthForm onDone={onDone} />
        <div className="h-10" />
      </div>
    );
  }

  const { Icon, tint, title, body } = slides[step];
  const last = step === slides.length - 1;

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-white text-black dark:bg-neutral-950 dark:text-white">
      <div className="flex justify-end p-4">
        <button
          onClick={() => setShowAuth(true)}
          className="text-sm text-neutral-500 dark:text-neutral-400 px-3 py-1.5"
        >
          Skip
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className={`w-32 h-32 rounded-[2rem] bg-gradient-to-br ${tint}
          flex items-center justify-center mb-10 shadow-lg shadow-black/10`}>
          <Icon className="w-14 h-14 text-white" strokeWidth={1.6} />
        </div>
        <h2 className="text-3xl font-bold mb-4 leading-tight">{title}</h2>
        <p className="text-neutral-500 dark:text-neutral-400 text-base leading-relaxed max-w-xs">
          {body}
        </p>
      </div>

      <div className="flex justify-center gap-2 pb-10">
        {slides.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step
                ? "w-8 bg-black dark:bg-white"
                : "w-1.5 bg-neutral-300 dark:bg-neutral-700"
            }`}
          />
        ))}
      </div>

      <div className="px-6 pb-10">
        <button
          onClick={() => (last ? setShowAuth(true) : setStep(step + 1))}
          className="w-full h-14 rounded-2xl font-semibold
            bg-black text-white dark:bg-white dark:text-black
            flex items-center justify-center gap-2
            active:scale-[0.98] transition shadow-sm"
        >
          {last ? "Get Started" : "Next"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

/* ------------ Web login ------------ */
const WebLogin: React.FC<{ onDone: () => void }> = ({ onDone }) => (
  <div className="min-h-screen flex flex-col max-w-md mx-auto bg-white text-black dark:bg-neutral-950 dark:text-white">
    <div className="px-6 pt-16 pb-6">
      <img
        src="https://res.cloudinary.com/dmiwq3l2s/image/upload/v1764768203/vfw82jmca7zl5p86czhy.png"
        alt="Logo"
        className="w-16 h-16 mb-8 object-contain"
      />
      <h1 className="text-4xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-2 text-neutral-500 dark:text-neutral-400">
        Sign in to continue
      </p>
    </div>
    <AuthForm onDone={onDone} />
    <div className="h-10" />
  </div>
);

/* ------------ Entry point ------------ */
const LoginPage: React.FC = () => {
  const { navigate } = useNavigation();
  const done = () => navigate("/");
  return IS_NATIVE ? <NativeOnboarding onDone={done} /> : <WebLogin onDone={done} />;
};

export default LoginPage;