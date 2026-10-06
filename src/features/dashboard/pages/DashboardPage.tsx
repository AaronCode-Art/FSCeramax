import { useEffect, useState } from 'react'
import { ADMIN_NAV_GROUPS, type AdminSection } from '../../../app/adminNavigation'
import { pathForSection, sectionFromPath } from '../../../app/adminRoutes'
import { AdminLayout } from '../../../app/components/AdminLayout'
import { useAuth } from '../../../hooks/useAuth'
import { DashboardOverview } from '../components/DashboardOverview'
import { GalleryPage } from './GalleryPage'
import { ReportsPage } from './ReportsPage'
import { ResourcePage } from './ResourcePage'

export function DashboardPage() {
  const { session, signOut } = useAuth()
  const [activeSection, setActiveSection] = useState(() => sectionFromPath(window.location.pathname))
  useEffect(() => {
    const onPopState = () => setActiveSection(sectionFromPath(window.location.pathname))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  if (!session) return null
  const fullName = `${session.nombres} ${session.apellidos}`.trim()
  const section = ADMIN_NAV_GROUPS.flatMap((group) => group.sections).find(({ id }) => id === activeSection)
  const navigate = (next: AdminSection) => {
    window.history.pushState(null, '', pathForSection(next.id))
    setActiveSection(next.id)
  }

  return (
    <AdminLayout
      activeSection={activeSection}
      email={session.email}
      fullName={fullName}
      role={session.rol}
      onNavigate={navigate}
      onSignOut={signOut}
    >
      {activeSection === 'dashboard'
        ? <DashboardOverview token={session.token} displayName={fullName} role={session.rol} />
        : activeSection === 'reportes'
          ? <ReportsPage token={session.token} />
        : activeSection === 'galeria'
          ? <GalleryPage token={session.token} />
        : section && <ResourcePage key={section.id} section={section} token={session.token} role={session.rol} />}
    </AdminLayout>
  )
}
