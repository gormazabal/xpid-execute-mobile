import Keycloak from 'keycloak-js'

const keycloak = new Keycloak({
  url: (import.meta.env.VITE_KEYCLOAK_URL as string | undefined) ?? 'http://localhost:8080',
  realm: (import.meta.env.VITE_KEYCLOAK_REALM as string | undefined) ?? 'xpid',
  clientId: (import.meta.env.VITE_KEYCLOAK_CLIENT_ID as string | undefined) ?? 'xpid-execute',
})

export default keycloak
