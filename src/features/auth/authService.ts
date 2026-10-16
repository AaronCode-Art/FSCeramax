import type { Role } from "../../app/types";
import { apiRequest } from "../../services/api";

export interface AuthSession {
  token: string;
  tipo: "staff";
  email: string;
  nombres: string;
  apellidos: string;
  rol: Role;
}

const staffRoles: Role[] = ["ADMIN", "JEFE_LOGISTICA", "LOGISTICA", "VENDEDOR", "DELIVERY"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStaffRole(value: unknown): value is Role {
  return typeof value === "string" && staffRoles.some((role) => role === value);
}

export async function loginStaff(email: string, password: string): Promise<AuthSession> {
  const response = await apiRequest("/api/auth/staff/login", {
    method: "POST",
    body: JSON.stringify({ email: email.trim(), password }),
  });

  if (
    !isRecord(response)
    || typeof response.token !== "string"
    || response.tipo !== "staff"
    || typeof response.email !== "string"
    || typeof response.nombres !== "string"
    || typeof response.apellidos !== "string"
    || !isStaffRole(response.rol)
  ) {
    throw new Error("La API devolvió datos de sesión incompletos o un rol no compatible.");
  }

  return {
    token: response.token,
    tipo: "staff",
    email: response.email,
    nombres: response.nombres,
    apellidos: response.apellidos,
    rol: response.rol,
  };
}
