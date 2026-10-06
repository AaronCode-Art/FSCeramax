import { createContext } from 'react'
import type { StaffLoginRequest, StaffSession } from '../../types/auth.types'

export interface AuthContextValue {
  session: StaffSession | null
  signIn: (credentials: StaffLoginRequest) => Promise<void>
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
