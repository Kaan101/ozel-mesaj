"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./token-storage";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

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
//
// Kullanici istegi (bug duzeltmesi): access_token kisa omurlu (15dk).
// Sayfa acildiginda access_token suresi dolmus/yoksa ama gecerli bir
// refresh_token varsa (ozellikle "Otomatik Giris" ile alinan uzun
// omurlu olan), ONCEDEN kullanici "giris yapilmamis" gibi gorunup
// /giris ekranina dusuyordu - artik bu durumda SESSIZCE bir yenileme
// deneniyor, boylece "bir kez giris yaptiysam bir daha sormasin"
// beklentisi gercekten calisiyor.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      const existingToken = getAccessToken();
      if (existingToken) {
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      // access_token yok ama refresh_token varsa (orn. suresi dolmus
      // bir access_token daha once temizlenmis olabilir) - sessizce
      // yenilemeyi dene.
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (response.ok) {
          const data = await response.json();
          setTokens(data.access_token);
          setIsAuthenticated(true);
        } else {
          clearTokens();
        }
      } catch {
        // Ag hatasi vb. - guvenli tarafta kal, giris ekranini goster.
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
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
