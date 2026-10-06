import { useState } from 'react'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { useLogin } from '../hooks/useLogin'

export function LoginForm() {
  const { email, setEmail, password, setPassword, error, loading, submit } = useLogin()
  const [passwordVisible, setPasswordVisible] = useState(false)

  return (
    <form className="mt-8 space-y-5" onSubmit={submit}>
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-700">Correo electrónico</span>
        <span className="flex h-12 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3.5 transition focus-within:border-teal-700 focus-within:ring-4 focus-within:ring-teal-700/10">
          <Mail size={17} className="shrink-0 text-slate-400" aria-hidden="true" />
          <input
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            type="email"
            name="email"
            autoComplete="username"
            placeholder="nombre@ceramax.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </span>
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-700">Contraseña</span>
        <span className="flex h-12 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3.5 transition focus-within:border-teal-700 focus-within:ring-4 focus-within:ring-teal-700/10">
          <LockKeyhole size={17} className="shrink-0 text-slate-400" aria-hidden="true" />
          <input
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            type={passwordVisible ? 'text' : 'password'}
            name="password"
            autoComplete="current-password"
            placeholder="Ingresa tu contraseña"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button
            type="button"
            className="grid size-8 shrink-0 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            onClick={() => setPasswordVisible((visible) => !visible)}
            aria-label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </span>
      </label>

      {error && (
        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm leading-5 text-rose-800">
          {error}
        </p>
      )}

      <button
        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-teal-800 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 disabled:opacity-60"
        type="submit"
        disabled={loading}
      >
        {loading ? 'Validando acceso…' : 'Iniciar sesión'}
        {!loading && <ArrowRight size={17} aria-hidden="true" />}
      </button>

      <p className="text-center text-xs leading-5 text-slate-500">
        Acceso exclusivo para personal autorizado de Cerámax.
      </p>
    </form>
  )
}
