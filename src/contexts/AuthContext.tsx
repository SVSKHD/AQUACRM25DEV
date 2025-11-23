import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/apiService';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isLocked: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  lock: () => void;
  unlock: (code: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [storedPassword, setStoredPassword] = useState<string>('');

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    const handleActivity = () => {
      setLastActivity(Date.now());
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    const checkInactivity = setInterval(() => {
      const inactiveTime = Date.now() - lastActivity;
      const fiftyMinutes = 50 * 60 * 1000;

      if (inactiveTime >= fiftyMinutes && !isLocked) {
        setIsLocked(true);
      }
    }, 60000);

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(checkInactivity);
    };
  }, [user, lastActivity, isLocked]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await authService.login(email, password);
    if (error) throw new Error(error);
    if (data?.user) {
      setUser(data.user);
      setStoredPassword(password);
      setLastActivity(Date.now());
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await authService.register(email, password, fullName);
    if (error) throw new Error(error);
    if (data?.user) {
      setUser(data.user);
      setStoredPassword(password);
      setLastActivity(Date.now());
    }
  };

  const signOut = async () => {
    await authService.logout();
    setUser(null);
    setIsLocked(false);
    setStoredPassword('');
  };

  const lock = () => {
    setIsLocked(true);
  };

  const unlock = async (code: string): Promise<boolean> => {
    if (!user?.email) return false;

    try {
      if (code === '2607') {
        setIsLocked(false);
        setLastActivity(Date.now());
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isLocked, signIn, signUp, signOut, lock, unlock }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
