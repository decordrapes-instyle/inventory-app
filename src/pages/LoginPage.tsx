import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const submit = async () => {
    if (!isFormValid || loading) return;

    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        await login(email.trim(), password);
      } else {
        await signup(email.trim(), password, displayName.trim());
      }
      navigate('/');
    } catch (e: any) {
      setError(e?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit();
  };

  const isFormValid = isLogin
    ? email.includes('@') && password.length >= 6
    : email.includes('@') && password.length >= 6 && displayName.trim().length >= 2;

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto
      bg-white text-black
      dark:bg-neutral-950 dark:text-white">

      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <img
          src="https://res.cloudinary.com/dmiwq3l2s/image/upload/v1764768203/vfw82jmca7zl5p86czhy.png"
          alt="Logo"
          className="w-16 h-16 mb-6 object-contain"
        />

        <h1 className="text-4xl font-bold">
          {isLogin ? 'Welcome back' : 'Create account'}
        </h1>

        <p className="mt-2 text-neutral-500 dark:text-neutral-400">
          {isLogin ? 'Sign in to continue' : 'Start using the app'}
        </p>
      </div>

      {/* Action button FIRST */}
      <div className="px-6 pb-4">
        <button
          disabled={!isFormValid || loading}
          onClick={submit}
          className="
            w-full h-14 rounded-xl font-semibold transition
            bg-black text-white
            dark:bg-white dark:text-black
            disabled:opacity-50 active:scale-[0.98]
          "
        >
          {loading ? 'Processing…' : isLogin ? 'Sign In' : 'Create Account'}
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 space-y-4">
        {!isLogin && (
          <AppInput
            label="Full Name"
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onKeyDown={handleEnter}
            autoComplete="name"
          />
        )}

        <AppInput
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleEnter}
          autoComplete="email"
        />

        <AppInput
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Minimum 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleEnter}
          autoComplete={isLogin ? 'current-password' : 'new-password'}
        />

        {/* Show password */}
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
          <div className="rounded-xl border px-4 py-3
            bg-red-50 border-red-200 text-red-600
            dark:bg-red-950 dark:border-red-800 dark:text-red-400">
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Switch mode */}
      <div className="px-6 pb-8">
        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }}
          className="w-full text-sm text-neutral-600 dark:text-neutral-400"
        >
          {isLogin ? (
            <>Don’t have an account? <span className="font-semibold">Sign up</span></>
          ) : (
            <>Already have an account? <span className="font-semibold">Sign in</span></>
          )}
        </button>
      </div>
    </div>
  );
};

interface AppInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const AppInput: React.FC<AppInputProps> = ({ label, ...props }) => (
  <div>
    <label className="block text-sm font-medium mb-2
      text-neutral-700 dark:text-neutral-300">
      {label}
    </label>
    <input
      {...props}
      className="
        w-full h-14 rounded-xl px-4 text-base outline-none transition
        bg-neutral-50 text-black placeholder-neutral-400
        border border-neutral-200
        focus:ring-2 focus:ring-black focus:border-black

        dark:bg-neutral-900 dark:text-white dark:placeholder-neutral-500
        dark:border-neutral-800 dark:focus:ring-white dark:focus:border-white
      "
    />
  </div>
);

export default LoginPage;
