import React, { createContext, useContext, useState, useCallback } from "react";

interface AuthUser {
  name: string;
  is_admin: boolean;
}

interface AuthCtx {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, is_admin: boolean, name: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback((tok: string, is_admin: boolean, name: string) => {
    const u = { name, is_admin };
    localStorage.setItem("token", tok);
    localStorage.setItem("user", JSON.stringify(u));
    setToken(tok);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
