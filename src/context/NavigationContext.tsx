// src/context/NavigationContext.tsx
import {
  createContext,
  useState,
  useContext,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";

type NavigationContextType = {
  currentPath: string;
  navigate: (path: string) => void;
  goBack: () => void;
  registerModal: (close: () => void) => () => void;
};

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

const HOME = "/";

export const NavigationProvider = ({ children }: { children: ReactNode }) => {
  const [currentPath, setCurrentPath] = useState<string>(HOME);

  const pathRef = useRef<string>(currentPath);
  useEffect(() => {
    pathRef.current = currentPath;
  }, [currentPath]);

  const modalsRef = useRef<Array<() => void>>([]);

  const registerModal = useCallback((close: () => void) => {
    modalsRef.current.push(close);
    return () => {
      const i = modalsRef.current.indexOf(close);
      if (i !== -1) modalsRef.current.splice(i, 1);
    };
  }, []);

  const navigate = useCallback((path: string) => {
    setCurrentPath(path || HOME);
  }, []);

  const exitApp = useCallback(async () => {
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;
      const { App } = await import("@capacitor/app");
      await App.exitApp();
    } catch {
      /* web or plugin missing — no-op */
    }
  }, []);

  const goBack = useCallback(() => {
    // 1. close the top-most modal, if any
    const top = modalsRef.current[modalsRef.current.length - 1];
    if (top) {
      top();
      modalsRef.current.pop();
      return;
    }
    // 2. any tab → home
    if (pathRef.current !== HOME) {
      setCurrentPath(HOME);
      return;
    }
    // 3. already at home → exit on native
    exitApp();
  }, [exitApp]);

  /* Android hardware back button */
  useEffect(() => {
    let sub: any = null;
    let cancelled = false;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { App } = await import("@capacitor/app");
        sub = await App.addListener("backButton", () => {
          if (!cancelled) goBack();
        });
      } catch {
        /* not running under Capacitor */
      }
    })();
    return () => {
      cancelled = true;
      try {
        sub?.remove?.();
      } catch {}
    };
  }, [goBack]);

  /* Browser / WebView back — defer a tick so modals close first */
  useEffect(() => {
    const onPop = () => {
      setTimeout(() => {
        if (modalsRef.current.length > 0) return;
        if (pathRef.current !== HOME) setCurrentPath(HOME);
      }, 0);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <NavigationContext.Provider
      value={{ currentPath, navigate, goBack, registerModal }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return ctx;
};

/** Register a modal so hardware / browser back dismisses it first. */
export const useBackHandler = (enabled: boolean, onClose: () => void) => {
  const { registerModal } = useNavigation();
  useEffect(() => {
    if (!enabled) return;
    return registerModal(onClose);
  }, [enabled, onClose, registerModal]);
};