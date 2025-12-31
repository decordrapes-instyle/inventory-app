import { createContext, useState, useContext, ReactNode, useCallback } from 'react';

type NavigationContextType = {
  currentPath: string;
  navigate: (path: string) => void;
  goBack: () => void;
};

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider = ({ children }: { children: ReactNode }) => {
  const [history, setHistory] = useState(['/']);
  const currentPath = history[history.length - 1];

  const navigate = useCallback((path: string) => {
    setHistory(prevHistory => [...prevHistory, path]);
  }, []);

  const goBack = useCallback(() => {
    setHistory(prevHistory => (prevHistory.length > 1 ? prevHistory.slice(0, -1) : prevHistory));
  }, []);

  return (
    <NavigationContext.Provider value={{ currentPath, navigate, goBack }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
