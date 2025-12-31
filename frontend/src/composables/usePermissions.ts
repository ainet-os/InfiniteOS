import { ref, provide, inject, watch } from 'vue'
import type { Ref } from 'vue'
// Note: These imports will be resolved at runtime to avoid circular dependencies

// Type imports for dependency injection
interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  isActive: boolean
  tenantId: string
}

interface Tenant {
  id: string
  name: string
  domain: string
  schemaName: string
  isActive: boolean
  theme?: string
}

interface AuthContextType {
  user: Ref<User | null>
  isAuthenticated: Ref<boolean>
  isLoading: Ref<boolean>
}

interface TenantContextType {
  tenant: Ref<Tenant | null>
  isLoading: Ref<boolean>
  error: Ref<string | null>
}

interface Permission {
  id: string
  name: string
  codename: string
  contentType: string
}

interface Role {
  id: string
  name: string
  permissions: Permission[]
}

interface UserRole {
  id: string
  user: string
  role: Role
  tenant: string
}

interface PermissionContextType {
  permissions: Ref<Permission[]>
  roles: Ref<Role[]>
  userRoles: Ref<UserRole[]>
  isLoading: Ref<boolean>
  error: Ref<string | null>
  hasPermission: (permission: string) => boolean
  hasRole: (roleName: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  hasAllPermissions: (permissions: string[]) => boolean
  refreshPermissions: () => Promise<void>
}

const PermissionSymbol = Symbol('permissions')

export function usePermissionsProvider() {
  const permissions = ref<Permission[]>([])
  const roles = ref<Role[]>([])
  const userRoles = ref<UserRole[]>([])
  const isLoading = ref(true)
  const error = ref<string | null>(null)

  // Get auth and tenant from their respective providers
  // These will be resolved via dependency injection to avoid circular imports
  const authContext = inject(Symbol.for('auth'))
  const tenantContext = inject(Symbol.for('tenant'))

  if (!authContext || !tenantContext) {
    throw new Error('usePermissions requires auth and tenant providers to be initialized first')
  }

  const { user, isAuthenticated } = authContext as AuthContextType
  const { tenant } = tenantContext as TenantContextType

  // PermissionContext testing log
  console.log(
    `🔑 PermissionComposable: isAuthenticated=${isAuthenticated.value}, permissions=${permissions.value.length}, roles=${roles.value.length}`,
  )

  // Watch for authentication and tenant changes
  watch(
    [isAuthenticated, user, tenant],
    async ([authStatus, currentUser, currentTenant]) => {
      if (authStatus && currentUser && currentTenant) {
        await loadUserPermissions()
      } else {
        isLoading.value = false
      }
    },
    { immediate: true },
  )

  const loadUserPermissions = async () => {
    try {
      isLoading.value = true
      error.value = null

      const token = localStorage.getItem('authToken')
      if (!token) {
        throw new Error('No authentication token found')
      }

      // Load user roles and permissions
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/permissions/user/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load user permissions')
      }

      const data = await response.json()
      userRoles.value = data.user_roles || []
      permissions.value = data.permissions || []
      roles.value = data.roles || []
    } catch (err) {
      console.error('Error loading user permissions:', err)
      error.value = err instanceof Error ? err.message : 'Failed to load user permissions'
    } finally {
      isLoading.value = false
    }
  }

  const hasPermission = (permission: string): boolean => {
    if (!userRoles.value.length) return false

    return userRoles.value.some((userRole) =>
      userRole.role.permissions.some(
        (perm) => perm.codename === permission || perm.codename === '*',
      ),
    )
  }

  const hasRole = (roleName: string): boolean => {
    if (!userRoles.value.length) return false

    return userRoles.value.some(
      (userRole) => userRole.role.name === roleName || userRole.role.name === 'superuser',
    )
  }

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some((permission) => hasPermission(permission))
  }

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every((permission) => hasPermission(permission))
  }

  const refreshPermissions = async () => {
    await loadUserPermissions()
  }

  const context: PermissionContextType = {
    permissions,
    roles,
    userRoles,
    isLoading,
    error,
    hasPermission,
    hasRole,
    hasAnyPermission,
    hasAllPermissions,
    refreshPermissions,
  }

  provide(PermissionSymbol, context)

  return context
}

export function usePermissions(): PermissionContextType {
  const context = inject<PermissionContextType>(PermissionSymbol)
  if (!context) {
    throw new Error(
      'usePermissions must be used within a component that has PermissionProvider as an ancestor',
    )
  }
  return context
}
