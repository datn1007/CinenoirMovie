import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Staff } from "../types";
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from "../lib/apiConfig";
import { AUTH_EXPIRED_EVENT } from "../lib/authInterceptor";
import { ROUTES } from "../constants/routes";

interface AuthContextValue {
  currentUser: Staff | null;
  isAdmin: boolean;
  isStaff: boolean;
  login: (user: Staff) => void;
  logout: () => void;
  updateUser: (user: Staff) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<Staff | null>(() => {
    const saved = localStorage.getItem(AUTH_USER_KEY);
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      localStorage.removeItem(AUTH_USER_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      return null;
    }
  });

  const isAdmin = (currentUser?.roleId ?? 0) === 1;
  const isStaff = (currentUser?.roleId ?? 0) === 2;

  const login = (user: Staff) => {
    setCurrentUser(user);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  };

  const updateUser = (user: Staff) => {
    setCurrentUser(user);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  };

  // Token expired mid-session (caught by the global fetch interceptor):
  // log out and send the user back to login instead of leaving the
  // current screen stuck on a silently failing API call.
  useEffect(() => {
    const handleAuthExpired = () => {
      logout();
      navigate(ROUTES.LOGIN, { replace: true });
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ currentUser, isAdmin, isStaff, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
