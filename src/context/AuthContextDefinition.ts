import { createContext } from "react";
import type { AuthSession } from "../features/auth/authService";

export interface AuthContextValue {
  session: AuthSession | null;
  signIn: (email: string, password: string, remember: boolean) => Promise<void>;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
