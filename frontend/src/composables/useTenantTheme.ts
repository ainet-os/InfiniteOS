import { computed, onMounted } from 'vue'
import { useTenant } from './useTenant'

export function useTenantTheme() {
  const { tenant } = useTenant()

  const getThemeConfig = () => {
    const defaultTheme = {
      primary: 'bg-primary',
      secondary: 'bg-secondary',
      accent: 'bg-accent',
      text: 'text-foreground',
      border: 'border-stroke',
      background: 'bg-white',
      darkBackground: 'dark:bg-boxdark',
      darkBorder: 'dark:border-strokedark',
      darkText: 'dark:text-white',
    }

    if (!tenant.value?.theme) {
      return defaultTheme
    }

    // Custom theme based on tenant
    switch (tenant.value.theme) {
      case 'dark':
        return {
          ...defaultTheme,
          primary: 'bg-gray-800',
          secondary: 'bg-gray-700',
          background: 'bg-gray-900',
          darkBackground: 'dark:bg-gray-900',
        }
      case 'blue':
        return {
          ...defaultTheme,
          primary: 'bg-blue-600',
          secondary: 'bg-blue-500',
          accent: 'bg-blue-400',
        }
      case 'green':
        return {
          ...defaultTheme,
          primary: 'bg-green-600',
          secondary: 'bg-green-500',
          accent: 'bg-green-400',
        }
      case 'purple':
        return {
          ...defaultTheme,
          primary: 'bg-purple-600',
          secondary: 'bg-purple-500',
          accent: 'bg-purple-400',
        }
      default:
        return defaultTheme
    }
  }

  const getCustomColors = computed(() => {
    if (!tenant.value) return null

    return {
      primaryColor: tenant.value.primaryColor || '#3b82f6',
      secondaryColor: tenant.value.secondaryColor || '#64748b',
      accentColor: tenant.value.secondaryColor || '#8b5cf6',
    }
  })

  const applyCustomColors = () => {
    const colors = getCustomColors.value
    if (!colors) return

    // Apply CSS custom properties
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--primary-color', colors.primaryColor)
      document.documentElement.style.setProperty('--secondary-color', colors.secondaryColor)
      document.documentElement.style.setProperty('--accent-color', colors.accentColor)
    }
  }

  const getTenantLogo = computed(() => {
    return tenant.value?.logo || '/images/logo/default-logo.svg'
  })

  const getTenantFavicon = computed(() => {
    return tenant.value?.favicon || '/favicon.ico'
  })

  const getTenantName = computed(() => {
    return tenant.value?.name || 'Default Tenant'
  })

  const getTenantDomain = computed(() => {
    return tenant.value?.domain || 'localhost'
  })

  // Apply custom colors when tenant changes
  onMounted(() => {
    applyCustomColors()
  })

  return {
    getThemeConfig,
    getCustomColors,
    applyCustomColors,
    getTenantLogo,
    getTenantFavicon,
    getTenantName,
    getTenantDomain,
    tenant,
  }
}
