import { useEffect } from 'react'
import { AuthProvider } from './app/providers/AuthProvider'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './features/auth/pages/LoginPage'
import { DashboardPage } from './features/dashboard/pages/DashboardPage'

function AppContent() {
  const { session } = useAuth()

  useEffect(() => {
    if (session && (window.location.pathname === '/' || window.location.pathname === '')) {
      window.history.replaceState(null, '', '/admin/dashboard')
    }
  }, [session])

  return session ? <DashboardPage /> : <LoginPage />
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
