"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface AuthContextValue {
  user: any;
  setUser: (user: any) => void;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<any>(null);
  const setUser = useCallback((u: any) => setUserState(u), []);
  const refetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUserState(data.user);
      }
    } catch {
      setUserState(null);
    }
  }, []);
  return (
    <AuthContext.Provider value={{ user, setUser, refetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  return ctx ?? { user: null, setUser: () => {}, refetchUser: async () => {} };
}
