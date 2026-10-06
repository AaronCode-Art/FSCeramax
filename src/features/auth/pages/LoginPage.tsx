import { Boxes, ChartNoAxesCombined, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { LoginForm } from '../components/LoginForm'

export function LoginPage() {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[minmax(420px,1fr)_minmax(440px,0.9fr)]">
      <section className="relative hidden overflow-hidden bg-[#0c3734] px-12 py-10 text-white lg:flex lg:flex-col xl:px-20">
        <div className="absolute -right-36 -top-40 size-[520px] rounded-full border border-white/10" />
        <div className="absolute -right-16 -top-20 size-[360px] rounded-full border border-white/10" />
        <div className="absolute -bottom-52 -left-28 size-[480px] rounded-full border border-white/10" />

        <div className="relative z-10 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-teal-400 text-lg font-black text-[#0c3734]">C</span>
          <span>
            <span className="block text-lg font-bold tracking-wide">CeraMax</span>
            <span className="block text-[9px] font-semibold uppercase tracking-[0.24em] text-teal-100/70">Sistema de gestión</span>
          </span>
        </div>

        <div className="relative z-10 my-auto max-w-xl py-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-100/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-teal-50">
            <span className="size-1.5 rounded-full bg-teal-300" />
            Portal interno
          </span>
          <h1 className="mt-7 max-w-lg text-4xl font-semibold leading-[1.12] tracking-tight xl:text-5xl">
            Gestiona cada espacio, desde un solo lugar.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-teal-50/70">
            Herramientas para coordinar la operación de Cerámax con información clara y accesos según tu equipo.
          </p>

          <div className="mt-12 grid gap-3 sm:grid-cols-3">
            <FeatureTile icon={<ChartNoAxesCombined size={17} />} label="Gerencia" />
            <FeatureTile icon={<Boxes size={17} />} label="Logística" />
            <FeatureTile icon={<ShieldCheck size={17} />} label="Delivery" />
          </div>
        </div>

        <p className="relative z-10 text-xs text-teal-100/50">Cerámax · Portal para colaboradores</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-[410px]">
          <div className="mb-12 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-xl bg-teal-800 text-lg font-black text-white">C</span>
            <span>
              <span className="block text-base font-bold text-slate-900">CeraMax</span>
              <span className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">Sistema de gestión</span>
            </span>
          </div>

          <div className="mb-8 inline-flex size-12 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
            <ShieldCheck size={23} strokeWidth={1.8} />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-800">Bienvenido a Cerámax</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Inicia sesión</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Ingresa con tu cuenta de personal para continuar al sistema.
          </p>
          <LoginForm />
        </div>
      </section>
    </main>
  )
}

function FeatureTile({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-3 text-xs font-medium text-teal-50/90">
      <span className="text-teal-300">{icon}</span>
      {label}
    </div>
  )
}
