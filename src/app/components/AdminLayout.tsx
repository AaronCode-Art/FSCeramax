import { useState } from 'react'
import type { ReactNode } from 'react'
import { Bell, ChevronDown, LogOut, Menu, X } from 'lucide-react'
import { ADMIN_NAV_GROUPS, type AdminSection } from '../adminNavigation'
import type { StaffRole } from '../../constants/roles'

interface AdminLayoutProps {
  activeSection: string
  email: string
  fullName: string
  role: StaffRole
  onNavigate: (section: AdminSection) => void
  onSignOut: () => void
  children: ReactNode
}

export function AdminLayout({ activeSection, email, fullName, role, onNavigate, onSignOut, children }: AdminLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const groups = ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    sections: group.sections.filter((section) => {
      if (role === 'ADMIN') return true
      if (section.id === 'dashboard') return true
      if (role === 'JEFE_LOGISTICA') return ['pedidos', 'historial-delivery', 'productos', 'categorias', 'galeria', 'inventario', 'almacenes', 'movimientos', 'solicitudes-entradas', 'sucursales', 'logistica'].includes(section.id)
      if (role === 'LOGISTICA') return ['pedidos', 'inventario', 'movimientos', 'solicitudes-entradas', 'logistica'].includes(section.id)
      if (role === 'VENDEDOR') return ['pedidos', 'historial-delivery'].includes(section.id)
      return ['pedidos', 'historial-delivery'].includes(section.id)
    }),
  })).filter((group) => group.sections.length > 0)
  const selected = groups.flatMap((group) => group.sections).find((section) => section.id === activeSection)

  function navigate(section: AdminSection) {
    onNavigate(section)
    setMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-[#f5f7f6] text-slate-900">
      {menuOpen && <button aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[268px] flex-col bg-[#103b35] text-white shadow-xl transition-transform lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-[76px] items-center justify-between border-b border-white/10 px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-white text-lg font-black text-[#103b35]">C</span>
            <div><p className="font-bold tracking-wide">CeraMax</p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100/70">Sistema de gestión</p></div>
          </div>
          <button type="button" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú" className="rounded-lg p-2 text-white/70 hover:bg-white/10 lg:hidden"><X size={19} /></button>
        </div>
        <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-6">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100/55">{group.label}</p>
              <div className="space-y-1">
                {group.sections.map((section) => (
                  <button key={section.id} type="button" onClick={() => navigate(section)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition ${activeSection === section.id ? 'bg-white text-[#103b35] shadow-sm' : 'text-emerald-50/80 hover:bg-white/10 hover:text-white'}`}>
                    <section.icon size={17} strokeWidth={1.9} /><span>{section.label}</span>
                    {activeSection === section.id && <span className="ml-auto size-1.5 rounded-full bg-emerald-700" />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-900">{initials(fullName)}</span>
            <div className="min-w-0"><p className="truncate text-xs font-semibold">{fullName || email}</p><p className="mt-1 text-[10px] text-emerald-100/70">{roleLabel(role)}</p></div>
          </div>
          <button type="button" onClick={onSignOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-emerald-50/80 transition hover:bg-white/10 hover:text-white"><LogOut size={16} /> Cerrar sesión</button>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[268px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur sm:px-7 lg:px-9">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menú" className="rounded-xl border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 lg:hidden"><Menu size={19} /></button>
            <div>
              <p className="text-sm font-bold text-slate-900">{selected?.label ?? 'Panel general'}</p>
              <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">{selected?.description ?? 'Resumen de la operación'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <button type="button" aria-label="Notificaciones" className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100"><Bell size={19} /><span className="absolute right-1.5 top-1.5 size-2 rounded-full border-2 border-white bg-emerald-600" /></button>
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <div className="hidden text-right sm:block"><p className="text-xs font-bold text-slate-800">{fullName || email}</p><p className="mt-0.5 text-[11px] text-slate-500">{roleLabel(role)}</p></div>
            <span className="grid size-9 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-900 sm:hidden">{initials(fullName)}</span>
            <ChevronDown size={15} className="hidden text-slate-400 sm:block" />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] p-4 sm:p-7 lg:p-9">{children}</main>
      </div>
    </div>
  )
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'C'
}

function roleLabel(role: StaffRole) {
  if (role === 'ADMIN') return 'Gerencia'
  if (role === 'JEFE_LOGISTICA') return 'Jefe de logística'
  if (role === 'LOGISTICA') return 'Logística'
  if (role === 'VENDEDOR') return 'Vendedor'
  return 'Delivery'
}
