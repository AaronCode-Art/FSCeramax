import { useContext } from "react";
import { AppearanceContext } from "../context/AppearanceContext";

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error("useAppearance debe usarse dentro de AppearanceProvider.");
  return context;
}
