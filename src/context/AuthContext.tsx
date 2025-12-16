import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, database } from '../config/firebase';
import { ref, set, get, child } from 'firebase/database';
import { setDarkStatusBar, setLightStatusBar } from '../statusBar';

const getLocalStorage = (key: string) => {
  const storedValue = localStorage.getItem(key);
  return storedValue ? JSON.parse(storedValue) : null;
};
const setLocalStorage = (key: string, value: any) => {
  localStorage.setItem(key, JSON.stringify(value));
};

// Types
interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  profileImage: string;
  role: 'customer' | 'production' | 'admin';
  createdAt: number;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  darkMode: 'dark' | 'light';
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  updateDarkMode: (mode: 'dark' | 'light') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState<'dark' | 'light'>(
    (getLocalStorage('darkmode') as 'dark' | 'light') || 'light'
  );

  // Load user auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setLoading(true);
      if (authUser) {
        setUser(authUser);
        await fetchUserProfile(authUser.uid);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Fetch user profile
  const fetchUserProfile = async (uid: string) => {
    try {
      const dbRef = ref(database);
      const snapshot = await get(child(dbRef, `users/${uid}`));
      if (snapshot.exists()) setUserProfile(snapshot.val());
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Signup
  const signup = async (email: string, password: string, displayName: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;

    const profile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName,
      profileImage: user.photoURL || '',
      role: 'customer',
      createdAt: Date.now(),
    };

    await set(ref(database, `users/${user.uid}`), profile);
    setUserProfile(profile);
  };

  // Login
  const login = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await fetchUserProfile(result.user.uid);
  };

  // Google login
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const dbRef = ref(database);
    const snapshot = await get(child(dbRef, `users/${user.uid}`));

    if (!snapshot.exists()) {
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'User',
        profileImage: user.photoURL || 'https://via.placeholder.com/150',
        role: 'customer',
        createdAt: Date.now(),
      };
      await set(ref(database, `users/${user.uid}`), profile);
      setUserProfile(profile);
    } else {
      setUserProfile(snapshot.val());
    }
  };

  // Logout
  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
  };

  // Update profile
  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in');
    const updatedProfile = { ...userProfile, ...data } as UserProfile;
    await set(ref(database, `users/${user.uid}`), updatedProfile);
    setUserProfile(updatedProfile);
  };

  // ✅ DARK MODE: state + html class + localStorage + status bar
  const updateDarkMode = (mode: 'dark' | 'light') => {
    setDarkMode(mode);
    setLocalStorage('darkmode', mode);

    // Update Tailwind dark mode class
    if (typeof document !== 'undefined') {
      const html = document.documentElement;
      if (mode === 'dark') {
        html.classList.add('dark');
        html.classList.remove('light');
      } else {
        html.classList.remove('dark');
        html.classList.add('light');
      }
    }

    // Update Capacitor status bar
    if (mode === 'dark') {
      setDarkStatusBar();
    } else {
      setLightStatusBar();
    }
  };

  // Initialize html class + status bar on load
  useEffect(() => {
    updateDarkMode(darkMode);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        darkMode,
        signup,
        login,
        loginWithGoogle,
        logout,
        updateProfile,
        updateDarkMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
