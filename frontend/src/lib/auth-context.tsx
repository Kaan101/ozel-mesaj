"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { clearTokens, getAccessToken, setTokens } from "./token-storage";

interface AuthContextValue {
  isAuthenticated: boolean;
  // Sayfa ilk yuklendiginde localStorage kontrolu bitene kadar true.
  // Bu olmadan, "cikis yapilmis" varsayimi bir an icin yanlislikla
  // gosterilebilir (flicker).
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Gorev 9.5: Oturum durumunu (giris yapilmis mi) tum uygulamada
// paylasan global state. Sayfa yenilendiginde localStorage'daki
// token'i okuyup durumu geri yukler - boylece kullanici tekrar
// giris yapmak zorunda kalmaz (Bolum 8).
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const existingToken = getAccessToken();
    setIsAuthenticated(!!existingToken);
    setIsLoading(false);
  }, []);

  function login(accessToken: string, refreshToken: string) {
    setTokens(accessToken, refreshToken);
    setIsAuthenticated(true);
  }

  function logout() {
    clearTokens();
    setIsAuthenticated(false);
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth, AuthProvider icinde kullanilmalidir.");
  }
  return context;
}
