import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      if (isLogin) await login(email, password);
      else await signup(email, password, displayName);
      navigate('/');
    } catch (e: any) {
      setError(e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-black dark:bg-black dark:text-white transition-colors">

      {/* Content */}
      <div className="flex-1 px-6 pt-16">
        <h1 className="text-3xl font-semibold">
          {isLogin ? 'Sign in' : 'Create account'}
        </h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          {isLogin ? 'Welcome back' : 'Start fresh, no noise'}
        </p>

        <div className="mt-10 space-y-5">
          {!isLogin && (
            <AppInput
              label="Name"
              value={displayName}
              onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setDisplayName(e.target.value)}
            />
          )}

          <AppInput
            label="Email"
            type="email"
            value={email}
            onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setEmail(e.target.value)}
          />

          <AppInput
            label="Password"
            type="password"
            value={password}
            onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setPassword(e.target.value)}
          />

          {error && (
            <p className="text-sm text-red-600 dark:text-red-500">{error}</p>
          )}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="px-6 pb-6 space-y-4">
        <button
          disabled={loading}
          onClick={submit}
          className="w-full h-14 rounded-2xl bg-black text-white dark:bg-white dark:text-black text-base font-medium active:scale-[0.98] transition disabled:opacity-50"
        >
          {loading ? 'Please wait…' : isLogin ? 'Continue' : 'Create account'}
        </button>

        {/* Google login */}
        <button
          disabled={loading}
          onClick={async () => {
            try {
              setLoading(true);
              await loginWithGoogle();
              navigate('/');
            } catch (e: any) {
              setError(e.message || 'Google sign-in failed');
            } finally {
              setLoading(false);
            }
          }}
          className="w-full h-14 rounded-2xl border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-black dark:text-white text-base font-medium active:scale-[0.98] transition flex items-center justify-center gap-3"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <button
          onClick={() => setIsLogin(!isLogin)}
          className="w-full text-sm text-neutral-500 dark:text-neutral-400"
        >
          {isLogin ? 'New here? Create account' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
};

const AppInput = ({ label, ...props }: any) => (
  <div>
    <label className="block text-xs mb-2 text-neutral-500 dark:text-neutral-400">{label}</label>
    <input
      {...props}
      className="w-full h-14 rounded-2xl px-4 outline-none transition
        bg-neutral-100 text-black placeholder-neutral-500
        dark:bg-neutral-900 dark:text-white
        focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
    />
  </div>
);

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.3-1.5 3.8-5.1 3.8-3.1 0-5.6-2.6-5.6-5.6S8.9 6.4 12 6.4c1.8 0 3 .7 3.7 1.3l2.5-2.4C16.7 3.8 14.6 2.8 12 2.8 6.9 2.8 2.8 6.9 2.8 12S6.9 21.2 12 21.2c5.9 0 7.8-4.1 7.8-6.2 0-.4 0-.8-.1-1H12z" />
  </svg>
);

export default LoginPage;