import React, { createContext, useContext, useEffect, useState } from "react";
import { onInvalidToken } from "../utils/authEvents";

interface ReloginContextType {
  isReloginOpen: boolean;
  openRelogin: () => void;
  closeRelogin: () => void;
}

const ReloginContext = createContext<ReloginContextType | undefined>(undefined);

export function ReloginProvider({ children }: { children: React.ReactNode }) {
  const [isReloginOpen, setIsReloginOpen] = useState(false);

  useEffect(() => {
    const unsub = onInvalidToken(() => {
      setIsReloginOpen(true);
    });
    return unsub;
  }, []);

  const openRelogin = () => setIsReloginOpen(true);
  const closeRelogin = () => setIsReloginOpen(false);

  return (
    <ReloginContext.Provider
      value={{ isReloginOpen, openRelogin, closeRelogin }}
    >
      {children}
    </ReloginContext.Provider>
  );
}

export function useRelogin() {
  const context = useContext(ReloginContext);
  if (context === undefined) {
    throw new Error("useRelogin must be used within a ReloginProvider");
  }
  return context;
}
