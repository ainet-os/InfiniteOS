import { ref, computed, provide, inject, onMounted } from 'vue'
import type { Ref } from 'vue'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  isActive: boolean
  tenantId: string
}

interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  tenantId?: string
}

interface AuthContextType {
  user: Ref<User | null>
  isAuthenticated: Ref<boolean>
  isLoading: Ref<boolean>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (userData: RegisterData) => Promise<void>
  refreshToken: () => Promise<void>
}

const AuthSymbol = Symbol.for('auth')

export function useAuthProvider() {
  const user = ref<User | null>(null)
  const isLoading = ref(true)

  const isAuthenticated = computed(() => !!user.value)

  // AuthContext testing log
  console.log(
    `🔐 AuthComposable: isAuthenticated=${isAuthenticated.value}, isLoading=${isLoading.value}`,
  )

  onMounted(() => {
    // Check for existing token on app load
    const token = localStorage.getItem('authToken')
    if (token) {
      validateToken(token)
    } else {
      isLoading.value = false
    }
  })

  const validateToken = async (token: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/validate/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const userData = await response.json()
        user.value = userData
      } else {
        localStorage.removeItem('authToken')
      }
    } catch (error) {
      console.error('Token validation error:', error)
      localStorage.removeItem('authToken')
    } finally {
      isLoading.value = false
    }
  }

  const login = async (email: string, password: string) => {
    try {
      isLoading.value = true
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        throw new Error('Login failed')
      }

      const data = await response.json()
      localStorage.setItem('authToken', data.access)
      user.value = data.user
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (token) {
        await fetch(`${import.meta.env.VITE_API_URL}/api/auth/logout/`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('authToken')
      user.value = null
    }
  }

  const register = async (userData: RegisterData) => {
    try {
      isLoading.value = true
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      if (!response.ok) {
        throw new Error('Registration failed')
      }

      const data = await response.json()
      localStorage.setItem('authToken', data.access)
      user.value = data.user
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const refreshToken = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: token }),
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem('authToken', data.access)
      } else {
        localStorage.removeItem('authToken')
        user.value = null
      }
    } catch (error) {
      console.error('Token refresh error:', error)
      localStorage.removeItem('authToken')
      user.value = null
    }
  }

  const context: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    register,
    refreshToken,
  }

  provide(AuthSymbol, context)

  return context
}

export function useAuth(): AuthContextType {
  const context = inject<AuthContextType>(AuthSymbol)
  if (!context) {
    throw new Error('useAuth must be used within a component that has AuthProvider as an ancestor')
  }
  return context
}
