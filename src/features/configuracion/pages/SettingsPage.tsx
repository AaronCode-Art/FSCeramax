import "../css/settings.css";
import type { FontSizePreference, ThemePreference } from "../../../app/types";
import { PageHeading } from "../../../components/ui/PageHeading";

export function SettingsPage({
  theme,
  fontSize,
  onThemeChange,
  onFontSizeChange,
}: {
  theme: ThemePreference;
  fontSize: FontSizePreference;
  onThemeChange: (theme: ThemePreference) => void;
  onFontSizeChange: (fontSize: FontSizePreference) => void;
}) {
  const fontSizes: { value: FontSizePreference; label: string; sample: string }[] = [
    { value: "small", label: "Pequeño", sample: "Aa" },
    { value: "medium", label: "Mediano", sample: "Aa" },
    { value: "large", label: "Grande", sample: "Aa" },
  ];

  return <>
    <PageHeading title="Configuración" description="Personaliza cómo se muestra la interfaz en este dispositivo."/>
    <div className="settings-page">
      <section className="panel settings-card">
        <div className="settings-card-heading"><span className="settings-icon">Aa</span><div><h2>Apariencia</h2><p>Preferencias visuales guardadas en este navegador.</p></div></div>
        <div className="settings-option-group">
          <div className="settings-option-title"><h3>Tema</h3><p>Elige el modo de color de la interfaz.</p></div>
          <div className="theme-options">
            {(["light", "dark"] as const).map((option) => <button key={option} className={`theme-option ${theme === option ? "selected" : ""}`} aria-pressed={theme === option} onClick={() => onThemeChange(option)}>
              <span className={`theme-preview theme-preview-${option}`}><i/><i/><i/></span>
              <strong>{option === "light" ? "Claro" : "Oscuro"}</strong>
            </button>)}
          </div>
        </div>
        <div className="settings-option-group">
          <div className="settings-option-title"><h3>Tamaño de texto</h3><p>Ajusta la escala visual.</p></div>
          <div className="font-size-options">
            {fontSizes.map((option) => <button key={option.value} className={fontSize === option.value ? "selected" : ""} aria-pressed={fontSize === option.value} onClick={() => onFontSizeChange(option.value)}>
              <span className={`font-sample font-sample-${option.value}`}>{option.sample}</span>{option.label}
            </button>)}
          </div>
        </div>
      </section>
      <aside className="settings-preview"><span className="settings-preview-label">VISTA PREVIA</span><h2>Así se verá tu interfaz</h2><p>Los cambios se aplican de inmediato y se guardan solo en este navegador.</p><div className="settings-preview-sample"><div><i className="settings-preview-dot"/> Preferencias activas</div><p>La configuración visual es independiente de la conexión con el backend.</p></div></aside>
    </div>
  </>;
}
