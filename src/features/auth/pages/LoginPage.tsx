import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../../../components/ui/Icon";
import { useAuth } from "../../../hooks/useAuth";
import { ApiError } from "../../../services/api";
import "../css/login.css";

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const remember = formData.get("remember") === "on";
    try {
      await signIn(email, password, remember);
      navigate("/", { replace: true });
    } catch (error) {
      setNotice(error instanceof ApiError || error instanceof Error
        ? error.message
        : "No se pudo iniciar sesión. Inténtalo nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return <main className="login-page">
    <section className="login-brand-panel">
      <div className="login-brand">
        <img className="brand-logo" src="/ceramax-logo.svg" alt="" />
        <div><strong>Cerámax</strong><small>Gestión integral</small></div>
      </div>
      <div className="login-brand-copy">
        <span className="login-eyebrow">PLATAFORMA DE GESTIÓN</span>
        <h1>Todo tu negocio,<br />en un solo lugar.</h1>
        <p>Ingresa a tu espacio de trabajo para continuar con tus operaciones.</p>
      </div>
      <div className="login-decoration" aria-hidden="true">
        <span /><span /><span /><span /><span />
      </div>
      <small className="login-brand-footer">Cerámax · Gestión de operaciones</small>
    </section>

    <section className="login-form-panel">
      <div className="login-form-wrap">
        <div className="login-mobile-brand">
          <img className="brand-logo" src="/ceramax-logo.svg" alt="" />
          <div><strong>Cerámax</strong><small>Gestión integral</small></div>
        </div>
        <span className="login-form-eyebrow">BIENVENIDO</span>
        <h2>Iniciar sesión</h2>
        <p className="login-intro">Ingresa tus credenciales para acceder a tu cuenta.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="login-email">Correo electrónico</label>
          <div className="login-input-wrap">
            <Icon name="users" size={18} />
            <input id="login-email" name="email" type="email" autoComplete="username" placeholder="nombre@empresa.com" required disabled={isSubmitting} />
          </div>

          <div className="login-password-heading">
            <label htmlFor="login-password">Contraseña</label>
            <button type="button" className="login-text-button" onClick={() => setNotice("La recuperación de contraseña no está habilitada. Contacta con administración.")}>¿Olvidaste tu contraseña?</button>
          </div>
          <div className="login-input-wrap">
            <Icon name="lock" size={18} />
            <input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Ingresa tu contraseña" required disabled={isSubmitting} />
            <button type="button" className="login-password-toggle" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setShowPassword((visible) => !visible)} disabled={isSubmitting}>{showPassword ? "Ocultar" : "Mostrar"}</button>
          </div>
          <label className="login-remember"><input type="checkbox" name="remember" disabled={isSubmitting} />Mantener sesión iniciada</label>
          <button className="primary-button login-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Verificando..." : "Iniciar sesión"}
            {!isSubmitting && <Icon name="arrow" size={17} />}
          </button>
          {notice && <p className="login-notice" role="status">{notice}</p>}
        </form>
        <div className="login-security-note"><Icon name="alert" size={15} /><span>Acceso seguro para usuarios autorizados.</span></div>
        <p className="login-connection-note">Acceso exclusivo para personal Cerámax</p>
      </div>
    </section>
  </main>;
}
