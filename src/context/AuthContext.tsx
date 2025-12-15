import React, { createContext, useContext, useEffect, useState } from 'react';
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

// Helper function to get from local storage
const getLocalStorage = (key: string) => {
  const storedValue = localStorage.getItem(key);
  return storedValue ? JSON.parse(storedValue) : null;
};

// Helper function to set in local storage
const setLocalStorage = (key: string, value: any) => {
  localStorage.setItem(key, JSON.stringify(value));
};
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
  darkMode: string;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  updateDarkMode: (mode: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(getLocalStorage('darkmode') || 'light');

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

  const fetchUserProfile = async (uid: string) => {
    try {
      const dbRef = ref(database);
      const snapshot = await get(child(dbRef, `users/${uid}`));
      if (snapshot.exists()) {
        setUserProfile(snapshot.val());
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const signup = async (email: string, password: string, displayName: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;

      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName,
        profileImage: user.photoURL || '',
        role: 'customer',
        createdAt: Date.now(),
      };

      await set(ref(database, `users/${user.uid}`), userProfile);
      setUserProfile(userProfile);
    } catch (error) {
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await fetchUserProfile(result.user.uid);
    } catch (error) {
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const dbRef = ref(database);
      const snapshot = await get(child(dbRef, `users/${user.uid}`));

      if (!snapshot.exists()) {
        const userProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'User',
          profileImage: user.photoURL || 'https://via.placeholder.com/150',
          role: 'customer',
          createdAt: Date.now(),
        };
        await set(ref(database, `users/${user.uid}`), userProfile);
        setUserProfile(userProfile);
      } else {
        setUserProfile(snapshot.val());
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      throw error;
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in');

    try {
      const updatedProfile = { ...userProfile, ...data } as UserProfile;
      await set(ref(database, `users/${user.uid}`), updatedProfile);
      setUserProfile(updatedProfile);
    } catch (error) {
      throw error;
    }
  };

  const updateDarkMode = (mode: string) => {
    setDarkMode(mode);
    setLocalStorage('darkmode', mode);
  };

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
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
