import { computed } from 'vue'
import { usePermissions } from './usePermissions'

export interface NavigationItem {
  name: string
  path: string
  icon?: string
  permission?: string
  subItems?: NavigationItem[]
  new?: boolean
  pro?: boolean
}

// Predefined navigation items with permissions
export const getNavigationItems = (): NavigationItem[] => [
  {
    name: 'Dashboard',
    path: '/',
    permission: 'dashboard.view',
    subItems: [
      { name: 'Overview', path: '/', permission: 'dashboard.view' },
      { name: 'Analytics', path: '/analytics', permission: 'analytics.view' },
      { name: 'CRM', path: '/crm', permission: 'crm.view' },
      { name: 'Marketing', path: '/marketing', permission: 'marketing.view' },
      { name: 'SaaS', path: '/saas', permission: 'saas.view' },
      { name: 'Stocks', path: '/stocks', permission: 'stocks.view' },
      { name: 'Logistics', path: '/logistics', permission: 'logistics.view', new: true },
    ],
  },
  {
    name: 'AI Tools',
    path: '/ai',
    permission: 'ai.view',
    new: true,
    subItems: [
      { name: 'Code Generator', path: '/ai/code-generator', permission: 'ai.code' },
      { name: 'Image Generator', path: '/ai/image-generator', permission: 'ai.image' },
      { name: 'Text Generator', path: '/ai/text-generator', permission: 'ai.text' },
      { name: 'Video Generator', path: '/ai/video-generator', permission: 'ai.video' },
    ],
  },
  {
    name: 'E-commerce',
    path: '/ecommerce',
    permission: 'ecommerce.view',
    subItems: [
      { name: 'Products', path: '/ecommerce/products', permission: 'product.view' },
      { name: 'Add Product', path: '/ecommerce/add-product', permission: 'product.create' },
      { name: 'Billing', path: '/ecommerce/billing', permission: 'billing.view', new: true },
      { name: 'Invoices', path: '/ecommerce/invoices', permission: 'invoice.view' },
      { name: 'Transactions', path: '/ecommerce/transactions', permission: 'transaction.view' },
    ],
  },
  {
    name: 'Users',
    path: '/users',
    permission: 'user.view',
    subItems: [
      { name: 'User List', path: '/users', permission: 'user.view' },
      { name: 'Add User', path: '/users/add', permission: 'user.create' },
      { name: 'User Roles', path: '/users/roles', permission: 'role.view' },
    ],
  },
  {
    name: 'API Keys',
    path: '/api-keys',
    permission: 'api.view',
    new: true,
  },
  {
    name: 'Integrations',
    path: '/integrations',
    permission: 'integration.view',
    new: true,
  },
  {
    name: 'Support',
    path: '/support',
    permission: 'support.view',
    new: true,
    subItems: [
      { name: 'Tickets', path: '/support/tickets', permission: 'support.view' },
      { name: 'Knowledge Base', path: '/support/kb', permission: 'support.kb' },
    ],
  },
  {
    name: 'Forms',
    path: '/forms',
    permission: 'form.view',
    subItems: [
      { name: 'Form Elements', path: '/forms/form-elements', permission: 'form.view' },
      { name: 'Form Layout', path: '/forms/form-layout', permission: 'form.view' },
    ],
  },
  {
    name: 'Tables',
    path: '/tables',
    permission: 'table.view',
    subItems: [
      { name: 'Basic Tables', path: '/tables/basic-tables', permission: 'table.view' },
      { name: 'Data Tables', path: '/tables/data-tables', permission: 'table.view' },
    ],
  },
  {
    name: 'Charts',
    path: '/charts',
    permission: 'chart.view',
    subItems: [
      { name: 'Line Chart', path: '/charts/line-chart', permission: 'chart.view' },
      { name: 'Bar Chart', path: '/charts/bar-chart', permission: 'chart.view' },
      { name: 'Pie Chart', path: '/charts/pie-chart', permission: 'chart.view' },
    ],
  },
  {
    name: 'UI Elements',
    path: '/ui',
    permission: 'ui.view',
    subItems: [
      { name: 'Alerts', path: '/ui/alerts', permission: 'ui.view' },
      { name: 'Buttons', path: '/ui/buttons', permission: 'ui.view' },
      { name: 'Cards', path: '/ui/cards', permission: 'ui.view' },
      { name: 'Modals', path: '/ui/modals', permission: 'ui.view' },
    ],
  },
  {
    name: 'Settings',
    path: '/settings',
    permission: 'settings.view',
    subItems: [
      { name: 'General', path: '/settings/general', permission: 'settings.view' },
      { name: 'Security', path: '/settings/security', permission: 'settings.security' },
      { name: 'Tenant', path: '/settings/tenant', permission: 'settings.tenant' },
    ],
  },
]

// Hook for getting filtered navigation items
export function useFilteredNavigation() {
  const { hasPermission } = usePermissions()

  const filterItems = (items: NavigationItem[]): NavigationItem[] => {
    return items.filter((item) => {
      if (!item.permission) return true
      return hasPermission(item.permission)
    })
  }

  const filteredNavigationItems = computed(() => {
    return filterItems(getNavigationItems())
  })

  return {
    filterItems,
    filteredNavigationItems,
    getNavigationItems,
  }
}
