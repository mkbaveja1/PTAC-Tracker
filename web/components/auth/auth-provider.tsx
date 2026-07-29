"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

import { isValidRole, roleForCode, ROLE_STORAGE_KEY, type Role } from "@/lib/auth/roles";

interface AuthValue {
  role: Role | null;
  signIn: (code: string) => Role | null;
  signOut: () => void;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

// localStorage-backed store read via useSyncExternalStore — no effect needed,
// SSR-safe, and the "storage" event keeps other tabs in sync for free.
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) listener();
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): Role | null {
  const stored = localStorage.getItem(ROLE_STORAGE_KEY);
  return isValidRole(stored) ? stored : null;
}

// The server can't read a device's localStorage, so it renders the signed-out
// (gate) state; the client reconciles to the real role on hydration.
function getServerSnapshot(): Role | null {
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const role = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const signIn = (code: string): Role | null => {
    const resolved = roleForCode(code);
    if (resolved) {
      localStorage.setItem(ROLE_STORAGE_KEY, resolved);
      emitChange();
    }
    return resolved;
  };

  const signOut = () => {
    localStorage.removeItem(ROLE_STORAGE_KEY);
    emitChange();
  };

  return <AuthContext.Provider value={{ role, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
