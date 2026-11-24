import { createContext, useContext } from 'react'
import type Keycloak from 'keycloak-js'

export type AppRole = 'admin' | 'engineer' | 'operator' | 'viewer' | 'auditor'
export const APP_ROLES: AppRole[] = ['admin', 'engineer', 'operator', 'viewer', 'auditor']

export type AuthContextValue = {
  keycloak: Keycloak
  username: string
  fullName: string
  email: string
  role: AppRole | null
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthContext.Provider')
  return ctx
}
