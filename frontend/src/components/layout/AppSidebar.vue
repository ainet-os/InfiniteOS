<template>
  <aside
    :class="[
      'fixed flex flex-col xl:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-full transition-all duration-300 ease-in-out z-50 border-r border-gray-200',
      {
        'w-[290px]': isExpanded || isMobileOpen || isHovered,
        'w-[90px]': !isExpanded && !isHovered,
        'translate-x-0': isMobileOpen,
        '-translate-x-full': !isMobileOpen,
        'xl:translate-x-0': true,
      },
    ]"
    @mouseenter="!isExpanded && (isHovered = true)"
    @mouseleave="isHovered = false"
  >
    <div :class="['py-8 flex', !isExpanded && !isHovered ? 'xl:justify-center' : 'justify-start']">
      <router-link to="/">
        <img
          v-if="isExpanded || isHovered || isMobileOpen"
          class="dark:hidden"
          src="/images/logo/logo.svg"
          alt="Logo"
          width="150"
          height="40"
        />
        <img
          v-if="isExpanded || isHovered || isMobileOpen"
          class="hidden dark:block"
          src="/images/logo/logo-dark.svg"
          alt="Logo"
          width="180"
          height="50"
        />
        <img v-else src="/images/logo/logo-icon.svg" alt="Logo" width="32" height="32" />
      </router-link>
    </div>
    <div class="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
      <nav class="mb-6">
        <div class="flex flex-col gap-4">
          <!-- 概览 Section -->
          <div v-if="overviewItems.length > 0">
            <h2
              :class="[
                'mb-4 text-xs uppercase flex leading-5 text-gray-400',
                !isExpanded && !isHovered ? 'xl:justify-center' : 'justify-start',
              ]"
            >
              <template v-if="isExpanded || isHovered || isMobileOpen">
                {{ $t('common.overview') }}
              </template>
              <HorizontalDots v-else />
            </h2>
            <ul class="flex flex-col gap-1">
              <li v-for="(nav, index) in overviewItems" :key="nav.name || index">
                <router-link
                  v-if="nav.path"
                  :to="nav.path"
                  :class="[
                    'menu-item group',
                    {
                      'menu-item-active': isActive(nav.path),
                      'menu-item-inactive': !isActive(nav.path),
                    },
                  ]"
                >
                  <span
                    :class="[
                      isActive(nav.path) ? 'menu-item-icon-active' : 'menu-item-icon-inactive',
                    ]"
                  >
                    <component :is="nav.icon" />
                  </span>
                  <span v-if="isExpanded || isHovered || isMobileOpen" class="menu-item-text">{{
                    nav.name
                  }}</span>
                </router-link>
              </li>
            </ul>
          </div>

          <!-- 资源 Section -->
          <div v-if="resourceItems.length > 0">
            <h2
              :class="[
                'mb-4 text-xs uppercase flex leading-5 text-gray-400',
                !isExpanded && !isHovered ? 'xl:justify-center' : 'justify-start',
              ]"
            >
              <template v-if="isExpanded || isHovered || isMobileOpen">
                {{ $t('common.resources') }}
              </template>
              <HorizontalDots v-else />
            </h2>
            <ul class="flex flex-col gap-1">
              <li v-for="(nav, index) in resourceItems" :key="nav.name || index">
                <router-link
                  v-if="nav.path"
                  :to="nav.path"
                  :class="[
                    'menu-item group',
                    {
                      'menu-item-active': isActive(nav.path),
                      'menu-item-inactive': !isActive(nav.path),
                    },
                  ]"
                >
                  <span
                    :class="[
                      isActive(nav.path) ? 'menu-item-icon-active' : 'menu-item-icon-inactive',
                    ]"
                  >
                    <component :is="nav.icon" />
                  </span>
                  <span v-if="isExpanded || isHovered || isMobileOpen" class="menu-item-text">{{
                    nav.name
                  }}</span>
                </router-link>
              </li>
            </ul>
          </div>

          <!-- 系统 Section -->
          <div v-if="systemItems.length > 0">
            <h2
              :class="[
                'mb-4 text-xs uppercase flex leading-5 text-gray-400',
                !isExpanded && !isHovered ? 'xl:justify-center' : 'justify-start',
              ]"
            >
              <template v-if="isExpanded || isHovered || isMobileOpen">
                {{ $t('common.system') }}
              </template>
              <HorizontalDots v-else />
            </h2>
            <ul class="flex flex-col gap-1">
              <li v-for="(nav, index) in systemItems" :key="nav.name || index">
                <router-link
                  v-if="nav.path"
                  :to="nav.path"
                  :class="[
                    'menu-item group',
                    {
                      'menu-item-active': isActive(nav.path),
                      'menu-item-inactive': !isActive(nav.path),
                    },
                  ]"
                >
                  <span
                    :class="[
                      isActive(nav.path) ? 'menu-item-icon-active' : 'menu-item-icon-inactive',
                    ]"
                  >
                    <component :is="nav.icon" />
                  </span>
                  <span v-if="isExpanded || isHovered || isMobileOpen" class="menu-item-text">{{
                    nav.name
                  }}</span>
                </router-link>
              </li>
            </ul>
          </div>

          <!-- Main Menu Section (保留原有结构以兼容) -->
          <div v-if="menuItems.length > 0">
            <h2
              :class="[
                'mb-4 text-xs uppercase flex leading-5 text-gray-400',
                !isExpanded && !isHovered ? 'xl:justify-center' : 'justify-start',
              ]"
            >
              <template v-if="isExpanded || isHovered || isMobileOpen">
                Menu
              </template>
              <HorizontalDots v-else />
            </h2>
            <ul class="flex flex-col gap-1">
              <li v-for="(nav, index) in menuItems" :key="nav.name">
                <button
                  v-if="nav.subItems"
                  @click="toggleSubmenu(index, 'main')"
                  :class="[
                    'menu-item group cursor-pointer',
                    {
                      'menu-item-active': isSubmenuOpen(index, 'main'),
                      'menu-item-inactive': !isSubmenuOpen(index, 'main'),
                    },
                    !isExpanded && !isHovered ? 'lg:justify-center' : 'lg:justify-start',
                  ]"
                >
                  <span
                    :class="[
                      isSubmenuOpen(index, 'main')
                        ? 'menu-item-icon-active'
                        : 'menu-item-icon-inactive',
                    ]"
                  >
                    <component :is="nav.icon" />
                  </span>
                  <span v-if="isExpanded || isHovered || isMobileOpen" class="menu-item-text">{{
                    nav.name
                  }}</span>
                  <span
                    v-if="nav.new && (isExpanded || isHovered || isMobileOpen)"
                    :class="[
                      'ml-auto absolute right-10',
                      isSubmenuOpen(index, 'main')
                        ? 'menu-dropdown-badge-active'
                        : 'menu-dropdown-badge-inactive',
                      'menu-dropdown-badge',
                    ]"
                  >
                    new
                  </span>
                  <ChevronDownIcon
                    v-if="isExpanded || isHovered || isMobileOpen"
                    :class="[
                      'ml-auto w-5 h-5 transition-transform duration-200',
                      { 'rotate-180 text-brand-500': isSubmenuOpen(index, 'main') },
                    ]"
                  />
                </button>
                <router-link
                  v-else-if="nav.path"
                  :to="nav.path"
                  :class="[
                    'menu-item group',
                    {
                      'menu-item-active': isActive(nav.path),
                      'menu-item-inactive': !isActive(nav.path),
                    },
                  ]"
                >
                  <span
                    :class="[
                      isActive(nav.path) ? 'menu-item-icon-active' : 'menu-item-icon-inactive',
                    ]"
                  >
                    <component :is="nav.icon" />
                  </span>
                  <span v-if="isExpanded || isHovered || isMobileOpen" class="menu-item-text">{{
                    nav.name
                  }}</span>
                </router-link>
                <div
                  v-if="nav.subItems && (isExpanded || isHovered || isMobileOpen)"
                  :class="[
                    'transition-all duration-300',
                    isSubmenuOpen(index, 'main') ? 'block' : 'hidden',
                  ]"
                >
                  <ul class="mt-2 space-y-1 ml-9">
                    <li v-for="subItem in nav.subItems" :key="subItem.name">
                      <router-link
                        :to="subItem.path"
                        :class="[
                          'menu-dropdown-item',
                          {
                            'menu-dropdown-item-active': isActive(subItem.path),
                            'menu-dropdown-item-inactive': !isActive(subItem.path),
                          },
                        ]"
                      >
                        {{ subItem.name }}
                        <span class="flex items-center gap-1 ml-auto">
                          <span
                            v-if="subItem.new"
                            :class="[
                              'ml-auto',
                              isActive(subItem.path)
                                ? 'menu-dropdown-badge-active'
                                : 'menu-dropdown-badge-inactive',
                              'menu-dropdown-badge',
                            ]"
                          >
                            new
                          </span>
                          <span
                            v-if="subItem.pro"
                            :class="[
                              'ml-auto',
                              isActive(subItem.path)
                                ? 'menu-dropdown-badge-pro-active'
                                : 'menu-dropdown-badge-pro-inactive',
                              'menu-dropdown-badge-pro',
                            ]"
                          >
                            pro
                          </span>
                        </span>
                      </router-link>
                    </li>
                  </ul>
                </div>
              </li>
            </ul>
          </div>

          <!-- Support Section -->
          <div>
            <h2
              :class="[
                'mb-4 text-xs uppercase flex leading-5 text-gray-400',
                !isExpanded && !isHovered ? 'xl:justify-center' : 'justify-start',
              ]"
            >
              <template v-if="isExpanded || isHovered || isMobileOpen">
                Support
              </template>
              <HorizontalDots v-else />
            </h2>
            <ul class="flex flex-col gap-1">
              <li v-for="(nav, index) in supportItems" :key="nav.name">
                <button
                  v-if="nav.subItems"
                  @click="toggleSubmenu(index, 'support')"
                  :class="[
                    'menu-item group cursor-pointer',
                    {
                      'menu-item-active': isSubmenuOpen(index, 'support'),
                      'menu-item-inactive': !isSubmenuOpen(index, 'support'),
                    },
                    !isExpanded && !isHovered ? 'lg:justify-center' : 'lg:justify-start',
                  ]"
                >
                  <span
                    :class="[
                      isSubmenuOpen(index, 'support')
                        ? 'menu-item-icon-active'
                        : 'menu-item-icon-inactive',
                    ]"
                  >
                    <component :is="nav.icon" />
                  </span>
                  <span v-if="isExpanded || isHovered || isMobileOpen" class="menu-item-text">{{
                    nav.name
                  }}</span>
                  <span
                    v-if="nav.new && (isExpanded || isHovered || isMobileOpen)"
                    :class="[
                      'ml-auto absolute right-10',
                      isSubmenuOpen(index, 'support')
                        ? 'menu-dropdown-badge-active'
                        : 'menu-dropdown-badge-inactive',
                      'menu-dropdown-badge',
                    ]"
                  >
                    new
                  </span>
                  <ChevronDownIcon
                    v-if="isExpanded || isHovered || isMobileOpen"
                    :class="[
                      'ml-auto w-5 h-5 transition-transform duration-200',
                      { 'rotate-180 text-brand-500': isSubmenuOpen(index, 'support') },
                    ]"
                  />
                </button>
                <router-link
                  v-else-if="nav.path"
                  :to="nav.path"
                  :class="[
                    'menu-item group',
                    {
                      'menu-item-active': isActive(nav.path),
                      'menu-item-inactive': !isActive(nav.path),
                    },
                  ]"
                >
                  <span
                    :class="[
                      isActive(nav.path) ? 'menu-item-icon-active' : 'menu-item-icon-inactive',
                    ]"
                  >
                    <component :is="nav.icon" />
                  </span>
                  <span v-if="isExpanded || isHovered || isMobileOpen" class="menu-item-text">{{
                    nav.name
                  }}</span>
                </router-link>
                <div
                  v-if="nav.subItems && (isExpanded || isHovered || isMobileOpen)"
                  :class="[
                    'transition-all duration-300',
                    isSubmenuOpen(index, 'support') ? 'block' : 'hidden',
                  ]"
                >
                  <ul class="mt-2 space-y-1 ml-9">
                    <li v-for="subItem in nav.subItems" :key="subItem.name">
                      <router-link
                        :to="subItem.path"
                        :class="[
                          'menu-dropdown-item',
                          {
                            'menu-dropdown-item-active': isActive(subItem.path),
                            'menu-dropdown-item-inactive': !isActive(subItem.path),
                          },
                        ]"
                      >
                        {{ subItem.name }}
                        <span class="flex items-center gap-1 ml-auto">
                          <span
                            v-if="subItem.new"
                            :class="[
                              'ml-auto',
                              isActive(subItem.path)
                                ? 'menu-dropdown-badge-active'
                                : 'menu-dropdown-badge-inactive',
                              'menu-dropdown-badge',
                            ]"
                          >
                            new
                          </span>
                          <span
                            v-if="subItem.pro"
                            :class="[
                              'ml-auto',
                              isActive(subItem.path)
                                ? 'menu-dropdown-badge-pro-active'
                                : 'menu-dropdown-badge-pro-inactive',
                              'menu-dropdown-badge-pro',
                            ]"
                          >
                            pro
                          </span>
                        </span>
                      </router-link>
                    </li>
                  </ul>
                </div>
              </li>
            </ul>
          </div>

          <!-- Others Section -->
          <div>
            <h2
              :class="[
                'mb-4 text-xs uppercase flex leading-5 text-gray-400',
                !isExpanded && !isHovered ? 'xl:justify-center' : 'justify-start',
              ]"
            >
              <template v-if="isExpanded || isHovered || isMobileOpen">
                Others
              </template>
              <HorizontalDots v-else />
            </h2>
            <ul class="flex flex-col gap-1">
              <li v-for="(nav, index) in othersItems" :key="nav.name">
                <button
                  v-if="nav.subItems"
                  @click="toggleSubmenu(index, 'others')"
                  :class="[
                    'menu-item group cursor-pointer',
                    {
                      'menu-item-active': isSubmenuOpen(index, 'others'),
                      'menu-item-inactive': !isSubmenuOpen(index, 'others'),
                    },
                    !isExpanded && !isHovered ? 'lg:justify-center' : 'lg:justify-start',
                  ]"
                >
                  <span
                    :class="[
                      isSubmenuOpen(index, 'others')
                        ? 'menu-item-icon-active'
                        : 'menu-item-icon-inactive',
                    ]"
                  >
                    <component :is="nav.icon" />
                  </span>
                  <span v-if="isExpanded || isHovered || isMobileOpen" class="menu-item-text">{{
                    nav.name
                  }}</span>
                  <ChevronDownIcon
                    v-if="isExpanded || isHovered || isMobileOpen"
                    :class="[
                      'ml-auto w-5 h-5 transition-transform duration-200',
                      { 'rotate-180 text-brand-500': isSubmenuOpen(index, 'others') },
                    ]"
                  />
                </button>
                <router-link
                  v-else-if="nav.path"
                  :to="nav.path"
                  :class="[
                    'menu-item group',
                    {
                      'menu-item-active': isActive(nav.path),
                      'menu-item-inactive': !isActive(nav.path),
                    },
                  ]"
                >
                  <span
                    :class="[
                      isActive(nav.path) ? 'menu-item-icon-active' : 'menu-item-icon-inactive',
                    ]"
                  >
                    <component :is="nav.icon" />
                  </span>
                  <span v-if="isExpanded || isHovered || isMobileOpen" class="menu-item-text">{{
                    nav.name
                  }}</span>
                </router-link>
                <div
                  v-if="nav.subItems && (isExpanded || isHovered || isMobileOpen)"
                  :class="[
                    'transition-all duration-300',
                    isSubmenuOpen(index, 'others') ? 'block' : 'hidden',
                  ]"
                >
                  <ul class="mt-2 space-y-1 ml-9">
                    <li v-for="subItem in nav.subItems" :key="subItem.name">
                      <router-link
                        :to="subItem.path"
                        :class="[
                          'menu-dropdown-item',
                          {
                            'menu-dropdown-item-active': isActive(subItem.path),
                            'menu-dropdown-item-inactive': !isActive(subItem.path),
                          },
                        ]"
                      >
                        {{ subItem.name }}
                        <span class="flex items-center gap-1 ml-auto">
                          <span
                            v-if="subItem.new"
                            :class="[
                              'ml-auto',
                              isActive(subItem.path)
                                ? 'menu-dropdown-badge-active'
                                : 'menu-dropdown-badge-inactive',
                              'menu-dropdown-badge',
                            ]"
                          >
                            new
                          </span>
                          <span
                            v-if="subItem.pro"
                            :class="[
                              'ml-auto',
                              isActive(subItem.path)
                                ? 'menu-dropdown-badge-pro-active'
                                : 'menu-dropdown-badge-pro-inactive',
                              'menu-dropdown-badge-pro',
                            ]"
                          >
                            pro
                          </span>
                        </span>
                      </router-link>
                    </li>
                  </ul>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </nav>
      <SidebarWidget v-if="isExpanded || isHovered || isMobileOpen" />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { Component } from 'vue'

import {
  GridIcon,
  ChevronDownIcon,
  ListIcon,
  PlugInIcon,
  HorizontalDots,
  ComputeIcon,
  ServerIcon,
  ContainerIcon,
  ModelIcon,
  NetworkIcon,
  StorageIcon,
  SettingsIcon,
  UserGroupIcon,
  DocsIcon,
  SupportIcon,
  HeartIcon,
  PodIcon,
} from '../../icons'
import SidebarWidget from './SidebarWidget.vue'
import { useSidebar } from '@/composables/useSidebar'

// Types
interface SubMenuItem {
  name: string
  path: string
  new?: boolean
  pro?: boolean
}

interface MenuItem {
  icon: Component
  name: string
  path?: string
  new?: boolean
  subItems?: SubMenuItem[]
}

const route = useRoute()
const { t } = useI18n()

const { isExpanded, isMobileOpen, isHovered } = useSidebar()

// State for submenu handling
const openSubmenu = ref<string | null>(null)

// 概览 section
const overviewItems = computed<MenuItem[]>(() => [
  {
    icon: GridIcon,
    name: t('menu.overview'),
    path: '/',
  },
])

// 资源 section
const resourceItems = computed<MenuItem[]>(() => [
  {
    icon: ComputeIcon,
    name: t('menu.compute'),
    path: '/compute',
  },
  {
    icon: ServerIcon,
    name: t('menu.virtualMachines'),
    path: '/virtual-machines',
  },
  {
    icon: ContainerIcon,
    name: t('menu.containers'),
    path: '/containers',
  },
  {
    icon: ModelIcon,
    name: t('menu.models'),
    path: '/models',
  },
  {
    icon: PodIcon,
    name: t('menu.pods'),
    path: '/pods',
  },
])

// 系统 section
const systemItems = computed<MenuItem[]>(() => [
  {
    icon: NetworkIcon,
    name: t('menu.network'),
    path: '/network',
  },
  {
    icon: StorageIcon,
    name: t('menu.storage'),
    path: '/storage',
  },
  {
    icon: PlugInIcon,
    name: t('menu.services'),
    path: '/services',
  },
  {
    icon: ListIcon,
    name: t('menu.logs'),
    path: '/logs',
  },
  {
    icon: UserGroupIcon,
    name: t('menu.users'),
    path: '/users',
  },
])

// 支持 section
const supportItems = computed<MenuItem[]>(() => [
  {
    icon: DocsIcon,
    name: t('menu.docs'),
    path: '/docs',
  },
  {
    icon: SupportIcon,
    name: t('menu.help'),
    path: '/help',
  },
])

// 其它 section
const othersItems = computed<MenuItem[]>(() => [
  {
    icon: HeartIcon,
    name: t('menu.sponsor'),
    path: '/sponsor',
  },
])

// 主菜单项（用于兼容原有结构）
const menuItems: MenuItem[] = []

const isActive = (path: string) => route.path === path

const toggleSubmenu = (index: number, menuType: string) => {
  const key = `${menuType}-${index}`
  openSubmenu.value = openSubmenu.value === key ? null : key
}

const isSubmenuOpen = (index: number, menuType: string) => {
  const key = `${menuType}-${index}`
  return openSubmenu.value === key
}

// 自动展开包含当前路由的子菜单组
const autoExpandActiveSubmenu = () => {
  let submenuMatched = false

  // 检查主菜单
  menuItems.forEach((nav, index) => {
    if (nav.subItems) {
      nav.subItems.forEach((subItem) => {
        if (isActive(subItem.path)) {
          openSubmenu.value = `main-${index}`
          submenuMatched = true
        }
      })
    }
  })

  // 检查支持菜单
  if (!submenuMatched) {
    supportItems.value.forEach((nav, index) => {
      if (nav.path && isActive(nav.path)) {
        openSubmenu.value = `support-${index}`
        submenuMatched = true
      }
    })
  }

  // 检查概览菜单
  if (!submenuMatched) {
    overviewItems.value.forEach((nav, index) => {
      if (nav.path && isActive(nav.path)) {
        openSubmenu.value = `overview-${index}`
        submenuMatched = true
      }
    })
  }

  // 检查资源菜单
  if (!submenuMatched) {
    resourceItems.value.forEach((nav, index) => {
      if (nav.path && isActive(nav.path)) {
        openSubmenu.value = `resource-${index}`
        submenuMatched = true
      }
    })
  }

  // 检查系统菜单
  if (!submenuMatched) {
    systemItems.value.forEach((nav, index) => {
      if (nav.path && isActive(nav.path)) {
        openSubmenu.value = `system-${index}`
        submenuMatched = true
      }
    })
  }

  // 检查其他菜单
  if (!submenuMatched) {
    othersItems.value.forEach((nav, index) => {
      if (nav.subItems) {
        nav.subItems.forEach((subItem) => {
          if (isActive(subItem.path)) {
            openSubmenu.value = `others-${index}`
            submenuMatched = true
          }
        })
      }
    })
  }
}

// 监听路由变化，自动展开对应的子菜单
watch(() => route.path, () => {
  autoExpandActiveSubmenu()
}, { immediate: true })

// 组件挂载时也执行一次
onMounted(() => {
  autoExpandActiveSubmenu()
})
</script>

