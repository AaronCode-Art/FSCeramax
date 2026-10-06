import { isStaffRole } from '../../../constants/roles'
import { postJson } from '../../../lib/api/httpClient'
import type { StaffLoginRequest, StaffLoginResponse, StaffSession } from '../../../types/auth.types'

export async function loginStaff(credentials: StaffLoginRequest): Promise<StaffSession> {
  const response = await postJson<StaffLoginResponse, StaffLoginRequest>('/auth/staff/login', credentials)
  if (!response.token || !response.email || !isStaffRole(response.rol)) {
    throw new Error('Esta cuenta no tiene un rol habilitado para el sistema de gestión.')
  }
  return {
    token: response.token,
    email: response.email,
    nombres: response.nombres,
    apellidos: response.apellidos,
    rol: response.rol,
  }
}
