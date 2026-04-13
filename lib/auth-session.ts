export const ADMIN_ROLES = [
  "ADMIN",
  "SELLER",
  "STAFF_SUPPORT",
  "INVENTORY_MANAGER",
  "DELIVERY_MANAGER",
  "PAYMENT_MANAGER",
] as const

export const AUTH_COOKIE_NAME = "app_auth"
export const ROLES_COOKIE_NAME = "app_roles"
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

export function normalizeRole(role: string) {
  return String(role).toUpperCase().replace(/^ROLE_/, "")
}

export function getNormalizedRoles(roles?: string[]) {
  return Array.isArray(roles) ? roles.map(normalizeRole) : []
}

export function hasAdminAccess(roles?: string[]) {
  const normalizedRoles = getNormalizedRoles(roles)
  return normalizedRoles.some((role) => ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]))
}
