import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { FontSizePreference, ThemePreference } from "../app/types";

type AppearanceContextValue = {
  theme: ThemePreference;
  fontSize: FontSizePreference;
  setTheme: (theme: ThemePreference) => void;
  setFontSize: (fontSize: FontSizePreference) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function readTheme(): ThemePreference {
  return localStorage.getItem("ceramax-theme") === "dark" ? "dark" : "light";
}

function readFontSize(): FontSizePreference {
  const saved = localStorage.getItem("ceramax-font-size");
  return saved === "small" || saved === "large" ? saved : "medium";
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemePreference>(readTheme);
  const [fontSize, setFontSize] = useState<FontSizePreference>(readFontSize);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("ceramax-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.fontSize = fontSize;
    localStorage.setItem("ceramax-font-size", fontSize);
  }, [fontSize]);

  const value = useMemo(() => ({ theme, fontSize, setTheme, setFontSize }), [theme, fontSize]);
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export { AppearanceContext };
