import { useEffect, useState, type ReactNode } from "react";
import type { Role } from "../app/types";
import { loginStaff, type AuthSession } from "../features/auth/authService";
import { API_UNAUTHORIZED_EVENT } from "../services/api";
import { AuthContext } from "./AuthContextDefinition";

const SESSION_KEY = "ceramax:auth";
const LEGACY_SESSION_KEY = "ceramax-authenticated";

const validRoles: Role[] = ["ADMIN", "JEFE_LOGISTICA", "LOGISTICA", "VENDEDOR", "DELIVERY"];

function isSession(value: unknown): value is AuthSession {
  if (typeof value !== "object" || value === null) return false;
  const session = value as Record<string, unknown>;
  return typeof session.token === "string"
    && session.tipo === "staff"
    && typeof session.email === "string"
    && typeof session.nombres === "string"
    && typeof session.apellidos === "string"
    && typeof session.rol === "string"
    && validRoles.some((role) => role === session.rol);
}

function isTokenUnexpired(token: string): boolean {
  const payload = token.split(".")[1];
  if (!payload) return false;

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const claims: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return typeof claims === "object"
      && claims !== null
      && "exp" in claims
      && typeof claims.exp === "number"
      && claims.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function clearStoredSession(): void {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(LEGACY_SESSION_KEY);
}

function readStoredSession(): AuthSession | null {
  sessionStorage.removeItem(LEGACY_SESSION_KEY);
  for (const storage of [localStorage, sessionStorage]) {
    const saved = storage.getItem(SESSION_KEY);
    if (!saved) continue;
    try {
      const parsed: unknown = JSON.parse(saved);
      if (isSession(parsed) && isTokenUnexpired(parsed.token)) return parsed;
    } catch {
      // Invalid browser storage is discarded and the user is asked to sign in again.
    }
    storage.removeItem(SESSION_KEY);
  }
  return null;
}

function persistSession(session: AuthSession, remember: boolean): void {
  clearStoredSession();
  try {
    (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    throw new Error("No se pudo guardar la sesión en este navegador. Revisa su configuración de almacenamiento.");
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(readStoredSession);

  const signOut = () => {
    clearStoredSession();
    setSession(null);
  };

  useEffect(() => {
    window.addEventListener(API_UNAUTHORIZED_EVENT, signOut);
    return () => window.removeEventListener(API_UNAUTHORIZED_EVENT, signOut);
  }, []);

  const signIn = async (email: string, password: string, remember: boolean) => {
    const authenticatedSession = await loginStaff(email, password);
    persistSession(authenticatedSession, remember);
    setSession(authenticatedSession);
  };

  return (
    <AuthContext.Provider value={{ session, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
