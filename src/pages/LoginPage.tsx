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
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password, displayName);
      }
      navigate('/');
    } catch (e: any) {
      setError(e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      submit();
    }
  };

  const isFormValid = isLogin 
    ? email && password 
    : email && password && displayName.trim();

  return (
    <div className="min-h-screen flex flex-col bg-white max-w-md mx-auto">
      <div className="px-6 pt-12 pb-8">
        <img 
          src="https://res.cloudinary.com/dmiwq3l2s/image/upload/v1764768203/vfw82jmca7zl5p86czhy.png" 
          alt="Logo" 
          className="w-16 h-16 mb-8 object-contain"
        />
        <h1 className="text-4xl font-bold text-black">
          {isLogin ? 'Welcome back' : 'Get started'}
        </h1>
        <p className="mt-2 text-base text-neutral-500">
          {isLogin ? 'Sign in to continue' : 'Create your account'}
        </p>
      </div>

      <div className="flex-1 px-6">
        <div className="space-y-4">
          {!isLogin && (
            <AppInput
              label="Full Name"
              placeholder="Enter your name"
              value={displayName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)}
              onKeyPress={handleKeyPress}
              autoComplete="name"
            />
          )}

          <AppInput
            label="Email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            onKeyPress={handleKeyPress}
            autoComplete="email"
          />

          <AppInput
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            autoComplete={isLogin ? "current-password" : "new-password"}
          />

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div className="relative">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-5 h-5 border-2 border-neutral-300 rounded bg-white peer-checked:bg-black peer-checked:border-black transition-all flex items-center justify-center">
                {showPassword && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm text-neutral-700">Show password</span>
          </label>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-6 pb-8 space-y-4">
        <button
          disabled={loading || !isFormValid}
          onClick={submit}
          className="w-full h-14 rounded-xl bg-black text-white text-base font-semibold active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing...
            </span>
          ) : isLogin ? 'Sign In' : 'Create Account'}
        </button>

        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }}
          className="w-full text-sm text-neutral-600 active:text-black transition"
        >
          {isLogin ? (
            <span>Don't have an account? <span className="font-semibold text-black">Sign up</span></span>
          ) : (
            <span>Already have an account? <span className="font-semibold text-black">Sign in</span></span>
          )}
        </button>
      </div>
    </div>
  );
};

const AppInput = ({ label, ...props }: any) => (
  <div>
    <label className="block text-sm font-medium mb-2 text-neutral-700">
      {label}
    </label>
    <input
      {...props}
      className="w-full h-14 rounded-xl px-4 outline-none transition text-base bg-neutral-50 text-black placeholder-neutral-400 focus:ring-2 focus:ring-black border border-neutral-200 focus:border-black"
    />
  </div>
);

export default LoginPage;