import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { isStaffRole } from '../../constants/roles'
import { loginStaff } from '../../features/auth/services/authService'
import type { StaffLoginRequest, StaffSession } from '../../types/auth.types'
import { AuthContext } from './AuthContext'

function restoreSession(): StaffSession | null {
  if (typeof window === 'undefined') return null
  try {
    const storedSession = window.sessionStorage.getItem(SESSION_KEY)
    if (!storedSession) return null
    const session = JSON.parse(storedSession) as StaffSession
    if (!session.token || !session.email || !isStaffRole(session.rol)) {
      window.sessionStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  } catch {
    window.sessionStorage.removeItem(SESSION_KEY)
    return null
  }
}

const SESSION_KEY = 'ceramax.staff.session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StaffSession | null>(restoreSession)

  const signIn = useCallback(async (credentials: StaffLoginRequest) => {
    const staffSession = await loginStaff(credentials)
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(staffSession))
    setSession(staffSession)
  }, [])

  const signOut = useCallback(() => {
    window.sessionStorage.removeItem(SESSION_KEY)
    setSession(null)
  }, [])

  const value = useMemo(() => ({ session, signIn, signOut }), [session, signIn, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
