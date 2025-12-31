import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { setDarkStatusBar, setLightStatusBar } from "../statusBar";
import { loadFirebase } from "../config/firebaseLoader";

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
  role: "customer" | "production" | "admin";
  createdAt: number;
}

interface AuthContextType {
  user: any; // will type as Firebase User dynamically
  userProfile: UserProfile | null;
  initializing: boolean;
  darkMode: "dark" | "light";
  signup: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  updateDarkMode: (mode: "dark" | "light") => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [darkMode, setDarkMode] = useState<"dark" | "light">(
    (getLocalStorage("darkmode") as "dark" | "light") || "light"
  );

  // Load Firebase + user auth state
  useEffect(() => {
    loadFirebase().then(({ auth, database, ref, child, get }) => {
      const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
        if (authUser) {
          setUser(authUser);
          try {
            const dbRef = ref(database);
            const snapshot = await get(child(dbRef, `users/${authUser.uid}`));
            if (snapshot.exists()) setUserProfile(snapshot.val());
          } catch (err) {
            console.error(err);
          }
        } else {
          setUser(null);
          setUserProfile(null);
        }
        setInitializing(false);
      });
      return unsubscribe;
    });
  }, []);

  // Signup
  const signup = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    const { auth, createUserWithEmailAndPassword, database, ref, set } =
      await loadFirebase();

    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;

    const profile: UserProfile = {
      uid: user.uid,
      email: user.email || "",
      displayName,
      profileImage: user.photoURL || "",
      role: "customer",
      createdAt: Date.now(),
    };

    await set(ref(database, `users/${user.uid}`), profile);
    setUserProfile(profile);
  };

  // Login
  const login = async (email: string, password: string) => {
    const { auth, signInWithEmailAndPassword, database, ref, get, child } =
      await loadFirebase();

    // ✅ Use modular function
    const result = await signInWithEmailAndPassword(auth, email, password);
    const uid = result.user.uid;
    const snapshot = await get(child(ref(database), `users/${uid}`));
    if (snapshot.exists()) setUserProfile(snapshot.val());
  };

  // Google login
  const loginWithGoogle = async () => {
    const {
      auth,
      database,
      ref,
      get,
      set,
      child,
      GoogleAuthProvider,
      signInWithPopup,
    } = await loadFirebase();
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const snapshot = await get(child(ref(database), `users/${user.uid}`));
    if (!snapshot.exists()) {
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || "User",
        profileImage: user.photoURL || "https://via.placeholder.com/150",
        role: "customer",
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
    const { auth } = await loadFirebase();
    await auth.signOut();
    setUser(null);
    setUserProfile(null);
  };

  // Update profile
  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error("No user logged in");
    const { database, ref, set } = await loadFirebase();
    const updatedProfile = { ...userProfile, ...data } as UserProfile;
    await set(ref(database, `users/${user.uid}`), updatedProfile);
    setUserProfile(updatedProfile);
  };

  // Dark mode
  const updateDarkMode = (mode: "dark" | "light") => {
    setDarkMode(mode);
    setLocalStorage("darkmode", mode);

    if (typeof document !== "undefined") {
      const html = document.documentElement;
      if (mode === "dark") {
        html.classList.add("dark");
        html.classList.remove("light");
      } else {
        html.classList.remove("dark");
        html.classList.add("light");
      }
    }

    if (mode === "dark") setDarkStatusBar();
    else setLightStatusBar();
  };

  useEffect(() => {
    updateDarkMode(darkMode);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        initializing,
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
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
