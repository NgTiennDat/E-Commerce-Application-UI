import {
  AUTH_COOKIE_MAX_AGE,
  AUTH_COOKIE_NAME,
  ROLES_COOKIE_NAME,
  getNormalizedRoles,
} from "@/lib/auth-session"

type AuthUser = {
  roles?: string[]
} & Record<string, unknown>

type AuthPayload = {
  token: string
  refreshToken?: string | null
  tokenType?: string | null
  user?: AuthUser
}

type StoredUser = {
  roles?: string[]
} & Record<string, unknown>

function setCookie(name: string, value: string, maxAge = AUTH_COOKIE_MAX_AGE) {
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`
}

export function persistAuthSession(payload: AuthPayload) {
  const normalizedRoles = getNormalizedRoles(payload.user?.roles)
  const storedUser = {
    ...payload.user,
    roles: normalizedRoles,
  }

  localStorage.setItem("token", payload.token)

  if (payload.refreshToken) {
    localStorage.setItem("refreshToken", payload.refreshToken)
  } else {
    localStorage.removeItem("refreshToken")
  }

  if (payload.tokenType) {
    localStorage.setItem("tokenType", payload.tokenType)
  } else {
    localStorage.removeItem("tokenType")
  }

  localStorage.setItem("user", JSON.stringify(storedUser))

  setCookie(AUTH_COOKIE_NAME, "1")
  setCookie(ROLES_COOKIE_NAME, encodeURIComponent(normalizedRoles.join(",")))

  return normalizedRoles
}

export function clearAuthSession() {
  localStorage.removeItem("token")
  localStorage.removeItem("refreshToken")
  localStorage.removeItem("tokenType")
  localStorage.removeItem("user")

  clearCookie(AUTH_COOKIE_NAME)
  clearCookie(ROLES_COOKIE_NAME)
}

export function readStoredUser() {
  const rawUser = localStorage.getItem("user")
  if (!rawUser) return null

  try {
    const parsedUser = JSON.parse(rawUser) as StoredUser
    return {
      ...parsedUser,
      roles: getNormalizedRoles(parsedUser.roles),
    }
  } catch {
    return null
  }
}
