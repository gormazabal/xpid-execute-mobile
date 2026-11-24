import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import NoAccessScreen from './screens/NoAccessScreen'
import './index.css'
import keycloak from './auth/keycloak'
import { AuthContext, type AuthContextValue, type AppRole, APP_ROLES } from './auth/AuthContext'
import { LanguageProvider } from './i18n'

const CLIENT_ID = (import.meta.env.VITE_KEYCLOAK_CLIENT_ID as string | undefined) ?? 'xpid-execute'
const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
const MOBILE_MENU_KEY = 'mobile.app'

function renderError(msg: string) {
  document.body.innerHTML = `
    <div style="display:flex;height:100vh;align-items:center;justify-content:center;font-family:sans-serif;color:#ef4444;font-size:14px;text-align:center;padding:16px">
      ${msg}
    </div>`
}

keycloak
  .init({ onLoad: 'login-required', pkceMethod: 'S256' })
  .then(async (authenticated) => {
    if (!authenticated) {
      keycloak.login()
      return
    }

    const clientRoles = keycloak.resourceAccess?.[CLIENT_ID]?.roles ?? []
    const appRole = APP_ROLES.find((r) => clientRoles.includes(r)) ?? null

    if (!appRole) {
      mount(null, false)
      return
    }

    // Refresh token before it expires
    setInterval(() => {
      keycloak.updateToken(70).catch(() => keycloak.logout())
    }, 60_000)

    const p = keycloak.tokenParsed ?? {}
    const authValue: AuthContextValue = {
      keycloak,
      username: (p['preferred_username'] as string) ?? '',
      fullName: (p['name'] as string) ?? '',
      email: (p['email'] as string) ?? '',
      role: appRole,
      logout: () => keycloak.logout({ redirectUri: window.location.origin }),
    }

    // Admin always has access; for other roles check RBAC
    if (appRole === 'admin') {
      mount(authValue, true)
      return
    }

    try {
      const perms = await fetch(
        `${API_URL}/api/v1/admin/rbac/my-permissions?role=${appRole}`,
        { headers: { Authorization: `Bearer ${keycloak.token}` } },
      ).then((r) => r.json()) as Record<string, { can_view: boolean; can_execute: boolean }>

      const hasAccess = perms[MOBILE_MENU_KEY]?.can_view ?? false
      mount(authValue, hasAccess)
    } catch {
      // If RBAC check fails, deny access
      mount(authValue, false)
    }
  })
  .catch(() => renderError('Error al conectar con el servidor de autenticación.'))

function mount(authValue: AuthContextValue | null, hasAccess: boolean) {
  const logout = () =>
    authValue ? keycloak.logout({ redirectUri: window.location.origin }) : keycloak.logout()

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <LanguageProvider>
        {hasAccess && authValue ? (
          <AuthContext.Provider value={authValue}>
            <App />
          </AuthContext.Provider>
        ) : (
          <NoAccessScreen onLogout={logout} />
        )}
      </LanguageProvider>
    </React.StrictMode>,
  )
}
