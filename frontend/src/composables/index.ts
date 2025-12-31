// Core composables for state management
export { useAuthProvider, useAuth } from './useAuth'
export { useTenantProvider, useTenant } from './useTenant'
export { usePermissionsProvider, usePermissions } from './usePermissions'
export { useThemeProvider, useTheme } from './useTheme'

// Utility composables
export { useGoBack } from './useGoBack'
export { useModal } from './useModal'
export { useTenantTheme } from './useTenantTheme'
export { useFilteredNavigation, getNavigationItems } from './useNavigation'
export type { NavigationItem } from './useNavigation'

// Existing sidebar composable
export { useSidebarProvider, useSidebar } from './useSidebar'
