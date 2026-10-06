export const STAFF_ROLES = ['ADMIN', 'JEFE_LOGISTICA', 'LOGISTICA', 'VENDEDOR', 'DELIVERY'] as const

export type StaffRole = (typeof STAFF_ROLES)[number]

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  ADMIN: 'Gerencia',
  JEFE_LOGISTICA: 'Jefe de logística',
  LOGISTICA: 'Logística',
  VENDEDOR: 'Vendedor',
  DELIVERY: 'Delivery',
}

export function isStaffRole(role: string): role is StaffRole {
  return STAFF_ROLES.some((staffRole) => staffRole === role)
}
