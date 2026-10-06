import type { StaffRole } from '../constants/roles'

export interface StaffLoginRequest {
  email: string
  password: string
}

export interface StaffLoginResponse {
  token: string
  tipo: string
  email: string
  nombres: string
  apellidos: string
  rol: string
}

export interface StaffSession {
  token: string
  email: string
  nombres: string
  apellidos: string
  rol: StaffRole
}
