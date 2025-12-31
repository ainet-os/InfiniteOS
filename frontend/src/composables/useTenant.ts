import { ref, provide, inject, watch } from 'vue'
import type { Ref } from 'vue'
// Note: Auth context will be resolved via dependency injection to avoid circular dependencies

// Type imports for dependency injection
interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  isActive: boolean
  tenantId: string
}

interface AuthContextType {
  user: Ref<User | null>
  isAuthenticated: Ref<boolean>
  isLoading: Ref<boolean>
}

interface TenantSettings {
  allowRegistration: boolean
  requireEmailVerification: boolean
  maxUsers: number
  features: string[]
}

interface Tenant {
  id: string
  name: string
  domain: string
  schemaName: string
  isActive: boolean
  theme?: string
  primaryColor?: string
  secondaryColor?: string
  logo?: string
  favicon?: string
  settings?: TenantSettings
}

interface TenantContextType {
  tenant: Ref<Tenant | null>
  isLoading: Ref<boolean>
  error: Ref<string | null>
  switchTenant: (tenantId: string) => Promise<void>
  updateTenantSettings: (settings: Partial<TenantSettings>) => Promise<void>
}

const TenantSymbol = Symbol.for('tenant')

export function useTenantProvider() {
  const tenant = ref<Tenant | null>(null)
  const isLoading = ref(true)
  const error = ref<string | null>(null)

  // Get auth context via dependency injection to avoid circular imports
  const authContext = inject(Symbol.for('auth'))

  if (!authContext) {
    throw new Error('useTenant requires auth provider to be initialized first')
  }

  const { user, isAuthenticated } = authContext as AuthContextType

  // TenantContext testing log
  console.log(
    `🏢 TenantComposable: isAuthenticated=${isAuthenticated.value}, tenant=${tenant.value?.name || 'null'}, isLoading=${isLoading.value}`,
  )

  // Watch for authentication changes
  watch(
    [isAuthenticated, user],
    async ([authStatus, currentUser]) => {
      if (authStatus && currentUser) {
        await loadTenantData()
      } else {
        isLoading.value = false
      }
    },
    { immediate: true },
  )

  const loadTenantData = async () => {
    try {
      isLoading.value = true
      error.value = null

      const token = localStorage.getItem('authToken')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tenants/current/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load tenant data')
      }

      const tenantData = await response.json()
      tenant.value = tenantData
    } catch (err) {
      console.error('Error loading tenant data:', err)
      error.value = err instanceof Error ? err.message : 'Failed to load tenant data'
    } finally {
      isLoading.value = false
    }
  }

  const switchTenant = async (tenantId: string) => {
    try {
      isLoading.value = true
      error.value = null

      const token = localStorage.getItem('authToken')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tenants/switch/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenant_id: tenantId }),
      })

      if (!response.ok) {
        throw new Error('Failed to switch tenant')
      }

      const newTenantData = await response.json()
      tenant.value = newTenantData
    } catch (err) {
      console.error('Error switching tenant:', err)
      error.value = err instanceof Error ? err.message : 'Failed to switch tenant'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const updateTenantSettings = async (settings: Partial<TenantSettings>) => {
    try {
      error.value = null

      const token = localStorage.getItem('authToken')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tenants/settings/`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        throw new Error('Failed to update tenant settings')
      }

      const updatedTenantData = await response.json()
      tenant.value = updatedTenantData
    } catch (err) {
      console.error('Error updating tenant settings:', err)
      error.value = err instanceof Error ? err.message : 'Failed to update tenant settings'
      throw err
    }
  }

  const context: TenantContextType = {
    tenant,
    isLoading,
    error,
    switchTenant,
    updateTenantSettings,
  }

  provide(TenantSymbol, context)

  return context
}

export function useTenant(): TenantContextType {
  const context = inject<TenantContextType>(TenantSymbol)
  if (!context) {
    throw new Error(
      'useTenant must be used within a component that has TenantProvider as an ancestor',
    )
  }
  return context
}
