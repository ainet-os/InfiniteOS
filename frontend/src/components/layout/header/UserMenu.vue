<template>
  <div class="relative" ref="dropdownRef">
    <button
      class="flex items-center text-gray-700 dark:text-gray-400"
      @click.prevent="toggleDropdown"
    >
      <span class="mr-3 overflow-hidden rounded-full h-11 w-11 bg-brand-500 flex items-center justify-center">
        <span class="text-white font-semibold text-lg">
          {{ userInitial }}
        </span>
      </span>

      <span class="block mr-1 font-medium text-theme-sm dark:text-white/90">{{ displayName }}</span>

      <ChevronDownIcon :class="{ 'rotate-180': dropdownOpen }" />
    </button>

    <!-- Dropdown Start -->
    <div
      v-if="dropdownOpen"
      class="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
    >
      <div>
        <span class="block font-medium text-gray-700 text-theme-sm dark:text-gray-400">
          {{ userInfo?.username || $t('menu.users') }}
        </span>
        <span v-if="userInfo?.home" class="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
          {{ userInfo.home }}
        </span>
        <span v-if="userInfo?.shell" class="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
          Shell: {{ userInfo.shell }}
        </span>
      </div>

      <ul class="flex flex-col gap-1 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800">
        <li v-for="item in menuItems" :key="item.href">
          <router-link
            :to="item.href"
            @click="closeDropdown"
            class="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
          >
            <component
              :is="item.icon"
              class="text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300"
            />
            {{ item.text }}
          </router-link>
        </li>
      </ul>
      <button
        @click="signOut"
        class="flex items-center gap-3 px-3 py-2 mt-3 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300 w-full text-left"
      >
        <LogoutIcon
          class="text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300"
        />
        {{ $t('auth.signOut') }}
      </button>
    </div>
    <!-- Dropdown End -->
  </div>
</template>

<script setup lang="ts">
import { UserCircleIcon, ChevronDownIcon, LogoutIcon, SettingsIcon, InfoCircleIcon } from '@/icons'
import { RouterLink, useRouter } from 'vue-router'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

interface UserInfo {
  id: string | number
  username: string
  role: string
  home?: string
  shell?: string
}

const router = useRouter()
const { t } = useI18n()
const dropdownOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const userInfo = ref<UserInfo | null>(null)

// 从localStorage读取用户信息
const loadUserInfo = () => {
  try {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      userInfo.value = JSON.parse(userStr)
    }
  } catch (error) {
    console.error('读取用户信息失败:', error)
    userInfo.value = null
  }
}

// 计算显示名称
const displayName = computed(() => {
  if (userInfo.value?.username) {
    return userInfo.value.username
  }
  return t('menu.users')
})

// 计算用户首字母（用于头像）
const userInitial = computed(() => {
  if (userInfo.value?.username) {
    return userInfo.value.username.charAt(0).toUpperCase()
  }
  return 'U'
})

const menuItems = computed(() => [
  { href: '/users', icon: UserCircleIcon, text: t('pages.users.title') },
  { href: '/help', icon: InfoCircleIcon, text: t('menu.help') },
])

const toggleDropdown = () => {
  dropdownOpen.value = !dropdownOpen.value
}

const closeDropdown = () => {
  dropdownOpen.value = false
}

const signOut = () => {
  // 清除token和用户信息
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  
  // 触发用户活动事件，停止会话超时
  window.dispatchEvent(new CustomEvent('user-activity'))
  
  closeDropdown()
  
  // 跳转到登录页
  router.push('/signin')
}

const handleClickOutside = (event: Event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    closeDropdown()
  }
}

onMounted(() => {
  loadUserInfo()
  document.addEventListener('click', handleClickOutside)
  
  // 监听存储变化，以便在其他标签页登录/登出时更新
  window.addEventListener('storage', (e) => {
    if (e.key === 'user') {
      loadUserInfo()
    }
  })
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
